const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const { google } = require('googleapis');
const { Readable } = require('stream');
const PolicyAgreement = require('../models/PolicyAgreement');
const fs = require('fs');
const path = require('path');

// ✅ Load OAuth2 Credentials & Token
const CREDENTIALS_PATH = path.join(__dirname, '../oauth2-credentials.json');
const TOKEN_PATH = path.join(__dirname, '../config/token.json');

// ======================================================
// 🔹 Upload to Google Drive (OAuth2)
// ======================================================
async function uploadToDrive(pdfBase64, fileName) {
    const folderID = process.env.GOOGLE_DRIVE_POLICY_FOLDER_ID;

    if (!folderID) {
        throw new Error('GOOGLE_DRIVE_POLICY_FOLDER_ID missing in .env');
    }

    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
        throw new Error('OAuth2 credentials or token not found.');
    }

    const credentialsConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentialsConfig.web || credentialsConfig.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderID],
        },
        media: {
            mimeType: 'application/pdf',
            body: stream,
        },
        fields: 'id, webViewLink',
    });

    const fileId = response.data.id;
    await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
    });

    return { webViewLink: response.data.webViewLink, fileId };
}

// ======================================================
// 🔹 Update Google Drive File (OAuth2)
// ======================================================
async function updateInDrive(fileId, pdfBase64) {
    const credentialsConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentialsConfig.web || credentialsConfig.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.update({
        fileId,
        media: { mimeType: 'application/pdf', body: stream },
        fields: 'id, webViewLink',
    });

    return { webViewLink: response.data.webViewLink, fileId };
}

// ======================================================
// 🔹 Check Google Drive File Existence
// ======================================================
async function checkFileExistsInDrive(fileId) {
    try {
        const credentialsConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentialsConfig.web || credentialsConfig.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        const response = await drive.files.get({ fileId, fields: 'id, trashed' });
        return !response.data.trashed;
    } catch (err) {
        return false;
    }
}

// ======================================================
// 🔹 BULK UPLOAD
// ======================================================
router.post('/bulk-upload', protect, async (req, res) => {
    try {
        const { candidates } = req.body;
        if (!candidates || candidates.length === 0) return res.status(400).json({ message: 'No data' });

        const results = [];
        for (const candidate of candidates) {
            try {
                const safeName = candidate.candidateName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                const fileName = `${safeName}_PolicyAgreement.pdf`;

                let existingAgreement = await PolicyAgreement.findOne({ candidateName: candidate.candidateName });

                if (existingAgreement) {
                    const fileExists = await checkFileExistsInDrive(existingAgreement.driveFileId);
                    if (!fileExists) {
                        await PolicyAgreement.findByIdAndDelete(existingAgreement._id);
                        existingAgreement = null;
                    }
                }

                if (existingAgreement) {
                    const isDuplicate =
                        String(existingAgreement.stipend || '') === String(candidate.stipend || '') &&
                        String(existingAgreement.probationSalary || '') === String(candidate.probationSalary || '') &&
                        String(existingAgreement.postProbationSalary || '') === String(candidate.postProbationSalary || '') &&
                        String(existingAgreement.workStartTime || '') === String(candidate.workStartTime || '') &&
                        String(existingAgreement.workEndTime || '') === String(candidate.workEndTime || '') &&
                        String(existingAgreement.internshipMonths || '') === String(candidate.internshipMonths || '') &&
                        String(existingAgreement.trainingMonths || '') === String(candidate.trainingMonths || '') &&
                        String(existingAgreement.probationMonths || '') === String(candidate.probationMonths || '') &&
                        String(existingAgreement.postProbationMonths || '') === String(candidate.postProbationMonths || '') &&
                        String(existingAgreement.employeeType || 'Internship') === String(candidate.employeeType || 'Internship');

                    if (isDuplicate) {
                        results.push({ candidateName: candidate.candidateName, success: false, error: 'Agreement already exists' });
                        continue;
                    }

                    const { webViewLink } = await updateInDrive(existingAgreement.driveFileId, candidate.pdfBase64);
                    Object.assign(existingAgreement, candidate);
                    await existingAgreement.save();

                    results.push({ candidateName: candidate.candidateName, success: true, driveLink: webViewLink, message: 'Agreement updated' });
                } else {
                    const { webViewLink, fileId } = await uploadToDrive(candidate.pdfBase64, fileName);
                    const newAgreement = new PolicyAgreement({ ...candidate, driveFileId: fileId, driveLink: webViewLink });
                    await newAgreement.save();
                    results.push({ candidateName: candidate.candidateName, success: true, driveLink: webViewLink });
                }
            } catch (err) {
                results.push({ candidateName: candidate.candidateName, success: false, error: err.message });
            }
        }
        res.json({ success: true, total: candidates.length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================================================
// 🔹 SEND EMAIL (BREVO)
// ======================================================
router.post('/send-email', protect, async (req, res) => {
    try {
        const { toEmail, candidateName, pdfBase64, customFileName, customSubject, customMailContent } = req.body;
        if (!toEmail || !candidateName || !pdfBase64) return res.status(400).json({ message: 'Missing fields' });

        // Validate email format and prevent multiple emails (header/CC injection)
        const emailRegex = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
        if (!emailRegex.test(toEmail)) {
            return res.status(400).json({ message: 'Invalid email format. Only a single email address is allowed.' });
        }

        const base64Content = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;

        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'VTAB Admin', email: process.env.EMAIL_USER },
            to: [{ email: toEmail }],
            subject: customSubject || 'Policy Agreement',
            textContent: customMailContent || `Dear ${candidateName}, Please find your policy agreement attached.`,
            attachment: [{ content: base64Content, name: customFileName || `${candidateName}_PolicyAgreement.pdf` }],
        }, {
            headers: { 'api-key': process.env.BREVO_API_KEY },
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
