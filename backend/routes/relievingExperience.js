const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const { google } = require('googleapis');
const { Readable } = require('stream');
const RelievingExperience = require('../models/RelievingExperience');
const fs = require('fs');
const path = require('path');

// ✅ Load OAuth2 Credentials & Token
const { getOAuth2Client } = require('../config/googleAuth');

// ======================================================
// 🔹 Upload to Google Drive (OAuth2)
// ======================================================
async function uploadToDrive(pdfBase64, fileName) {
    const folderID = process.env.GOOGLE_DRIVE_RELIEVING_FOLDER_ID;

    if (!folderID) {
        throw new Error('GOOGLE_DRIVE_RELIEVING_FOLDER_ID missing in .env');
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
        if (!candidates || candidates.length === 0) {
            return res.status(400).json({ message: 'No data' });
        }

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
                const safeName = candidate.employeeName
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_]/g, '');

                const fileName = `${safeName}_RelievingExperience.pdf`;

                let existingRecord = await RelievingExperience.findOne({ employeeName: candidate.employeeName });

                // If record exists but file is deleted from Drive → remove DB record
                if (existingRecord) {
                    const fileExists = await checkFileExistsInDrive(existingRecord.driveFileId);
                    if (!fileExists) {
                        await RelievingExperience.findByIdAndDelete(existingRecord._id);
                        existingRecord = null;
                    }
                }

                if (existingRecord) {
                    // Compare key fields – if identical, skip
                    const isDuplicate =
                        existingRecord.employeeId === candidate.employeeId &&
                        existingRecord.jobTitle === candidate.jobTitle &&
                        existingRecord.businessTitle === candidate.businessTitle &&
                        existingRecord.joinedDate === candidate.joinedDate &&
                        existingRecord.relievingDate === candidate.relievingDate &&
                        existingRecord.issueDate === candidate.issueDate;

                    if (isDuplicate) {
                        results.push({
                            candidateName: candidate.employeeName,
                            success: false,
                            error: 'Relieving letter already exists (no changes detected)',
                        });
                        continue;
                    }

                    // Data changed – update Drive file and DB record
                    const { webViewLink } = await updateInDrive(existingRecord.driveFileId, candidate.pdfBase64);

                    existingRecord.employeeId = candidate.employeeId;
                    existingRecord.jobTitle = candidate.jobTitle;
                    existingRecord.businessTitle = candidate.businessTitle;
                    existingRecord.issueDate = candidate.issueDate;
                    existingRecord.joinedDate = candidate.joinedDate;
                    existingRecord.relievingDate = candidate.relievingDate;
                    existingRecord.driveLink = webViewLink;
                    await existingRecord.save();

                    results.push({
                        candidateName: candidate.employeeName,
                        success: true,
                        driveLink: webViewLink,
                        message: 'Relieving letter updated',
                    });
                } else {
                    // New record – upload to Drive and save to DB
                    const { webViewLink, fileId } = await uploadToDrive(candidate.pdfBase64, fileName);

                    const newRecord = new RelievingExperience({
                        employeeName: candidate.employeeName,
                        employeeId: candidate.employeeId,
                        jobTitle: candidate.jobTitle,
                        businessTitle: candidate.businessTitle,
                        issueDate: candidate.issueDate,
                        joinedDate: candidate.joinedDate,
                        relievingDate: candidate.relievingDate,
                        driveFileId: fileId,
                        driveLink: webViewLink,
                    });
                    await newRecord.save();

                    results.push({
                        candidateName: candidate.employeeName,
                        success: true,
                        driveLink: webViewLink,
                    });
                }
            } catch (err) {
                results.push({
                    candidateName: candidate.employeeName || 'Unknown',
                    success: false,
                    error: err.message,
                });
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
        if (!toEmail || !candidateName || !pdfBase64) {
            return res.status(400).json({ message: 'Missing fields' });
        }

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
                cc: [
                    { email: 'balamuraleee@gmail.com' },
                    { email: 'meenakumarik.vtab@gmail.com' },
                    { email: 'vigneshrajasvtab@gmail.com' }
                ],
                subject: customSubject || `Relieving & Experience Letter – ${candidateName}`,
                textContent: customMailContent || `Dear ${candidateName}, Please find your Relieving & Experience letter attached.`,
                attachment: [
                    {
                        content: base64Content,
                        name: customFileName || `${candidateName}_RelievingExperience.pdf`,
                    },
                ],
            },
            {
                headers: { 'api-key': process.env.BREVO_API_KEY },
            }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message, message: err.response?.data?.message || err.message });
    }
});

module.exports = router;
