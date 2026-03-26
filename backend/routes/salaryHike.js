const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const { google } = require('googleapis');
const { Readable } = require('stream');
const SalaryHike = require('../models/SalaryHike');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../oauth2-credentials.json');
const TOKEN_PATH = path.join(__dirname, '../config/token.json');

// ======================================================
// 🔹 Upload to Google Drive
// ======================================================
async function uploadToDrive(pdfBase64, fileName) {
    const folderID = process.env.GOOGLE_DRIVE_SALARY_HIKE_FOLDER_ID;
    if (!folderID) throw new Error('GOOGLE_DRIVE_SALARY_HIKE_FOLDER_ID missing in .env');
    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH))
        throw new Error('OAuth2 credentials or token not found.');

    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = creds.web || creds.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable(); stream.push(buffer); stream.push(null);

    const response = await drive.files.create({
        requestBody: { name: fileName, parents: [folderID] },
        media: { mimeType: 'application/pdf', body: stream },
        fields: 'id, webViewLink',
    });
    const fileId = response.data.id;
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
    return { webViewLink: response.data.webViewLink, fileId };
}

// ======================================================
// 🔹 Update Drive File
// ======================================================
async function updateInDrive(fileId, pdfBase64) {
    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = creds.web || creds.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable(); stream.push(buffer); stream.push(null);

    const response = await drive.files.update({
        fileId,
        media: { mimeType: 'application/pdf', body: stream },
        fields: 'id, webViewLink',
    });
    return { webViewLink: response.data.webViewLink, fileId };
}

// ======================================================
// 🔹 Check File Exists in Drive
// ======================================================
async function checkFileExistsInDrive(fileId) {
    try {
        const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = creds.web || creds.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        const response = await drive.files.get({ fileId, fields: 'id, trashed' });
        return !response.data.trashed;
    } catch {
        return false;
    }
}

// ======================================================
// 🔹 BULK UPLOAD
// ======================================================
router.post('/bulk-upload', protect, async (req, res) => {
    try {
        const { candidates } = req.body;
        if (!candidates || candidates.length === 0)
            return res.status(400).json({ message: 'No data' });

        const results = [];

        for (const candidate of candidates) {
            try {
                const safeName = candidate.employeeName
                    .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                const fileName = `${safeName}_SalaryHikeEditor.pdf`;

                let existingRecord = await SalaryHike.findOne({ employeeName: candidate.employeeName });

                // Drive file deleted → remove DB record
                if (existingRecord) {
                    const fileExists = await checkFileExistsInDrive(existingRecord.driveFileId);
                    if (!fileExists) {
                        await SalaryHike.findByIdAndDelete(existingRecord._id);
                        existingRecord = null;
                    }
                }

                if (existingRecord) {
                    const isDuplicate =
                        existingRecord.effectiveDate === candidate.effectiveDate &&
                        existingRecord.newSalary === candidate.newSalary &&
                        existingRecord.date === candidate.date;

                    if (isDuplicate) {
                        results.push({ candidateName: candidate.employeeName, success: false, error: 'Already exists (no changes)' });
                        continue;
                    }

                    // Data changed → update
                    const { webViewLink } = await updateInDrive(existingRecord.driveFileId, candidate.pdfBase64);
                    Object.assign(existingRecord, {
                        effectiveDate: candidate.effectiveDate,
                        doorNo: candidate.doorNo,
                        street: candidate.street,
                        addressLine1: candidate.addressLine1,
                        addressLine2: candidate.addressLine2,
                        district: candidate.district,
                        state: candidate.state,
                        pincode: candidate.pincode,
                        newSalary: candidate.newSalary,
                        date: candidate.date,
                        driveLink: webViewLink,
                    });
                    await existingRecord.save();
                    results.push({ candidateName: candidate.employeeName, success: true, driveLink: webViewLink, message: 'Updated' });
                } else {
                    // New record
                    const { webViewLink, fileId } = await uploadToDrive(candidate.pdfBase64, fileName);
                    const newRecord = new SalaryHike({
                        employeeName: candidate.employeeName,
                        effectiveDate: candidate.effectiveDate,
                        doorNo: candidate.doorNo,
                        street: candidate.street,
                        addressLine1: candidate.addressLine1,
                        addressLine2: candidate.addressLine2,
                        district: candidate.district,
                        state: candidate.state,
                        pincode: candidate.pincode,
                        newSalary: candidate.newSalary,
                        date: candidate.date,
                        driveFileId: fileId,
                        driveLink: webViewLink,
                    });
                    await newRecord.save();
                    results.push({ candidateName: candidate.employeeName, success: true, driveLink: webViewLink });
                }
            } catch (err) {
                results.push({ candidateName: candidate.employeeName || 'Unknown', success: false, error: err.message });
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
        if (!toEmail || !candidateName || !pdfBase64)
            return res.status(400).json({ message: 'Missing fields' });

        // Validate email format and prevent multiple emails (header/CC injection)
        const emailRegex = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
        if (!emailRegex.test(toEmail)) {
            return res.status(400).json({ message: 'Invalid email format. Only a single email address is allowed.' });
        }

        const base64Content = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;

        await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { name: 'VTAB Admin', email: process.env.EMAIL_USER },
                to: [{ email: toEmail }],
                subject: customSubject || `Salary Hike Notification – ${candidateName}`,
                textContent: customMailContent || `Dear ${candidateName}, Please find your Salary Hike Notification attached.`,
                attachment: [{ content: base64Content, name: customFileName || `${candidateName}_SalaryHikeEditor.pdf` }],
            },
            { headers: { 'api-key': process.env.BREVO_API_KEY } }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message, message: err.response?.data?.message || err.message });
    }
});

module.exports = router;
