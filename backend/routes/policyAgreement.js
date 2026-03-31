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
const { getOAuth2Client } = require('../config/googleAuth');

// ======================================================
// 🔹 Upload to Google Drive (OAuth2)
// ======================================================
async function uploadToDrive(pdfBase64, fileName) {
    const folderID = process.env.GOOGLE_DRIVE_POLICY_FOLDER_ID;

    if (!folderID) {
        throw new Error('GOOGLE_DRIVE_POLICY_FOLDER_ID missing in .env');
    }

    const oAuth2Client = getOAuth2Client();

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
    const oAuth2Client = getOAuth2Client();

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
        const oAuth2Client = getOAuth2Client();
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
                // Validate Base64 PDF data
                const base64Str = candidate.pdfBase64 || '';
                const base64Data = base64Str.includes('base64,') ? base64Str.split('base64,')[1] : base64Str;
                const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

                if (!base64Data || !base64Regex.test(base64Data)) {
                    results.push({
                        candidateName: candidate.candidateName || candidate.employeeName || 'Unknown',
                        success: false,
                        error: 'Invalid base64 data'
                    });
                    continue;
                }
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
            cc: [
                { email: 'balamuraleee@gmail.com' },
                { email: 'meenakumarik.vtab@gmail.com' },
                { email: 'vigneshrajasvtab@gmail.com' }
            ],
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
