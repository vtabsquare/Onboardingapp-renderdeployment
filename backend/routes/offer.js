const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const { google } = require('googleapis');
const { Readable } = require('stream');
const Offer = require('../models/Offer');

// ✅ Load OAuth2 Credentials & Token
const CREDENTIALS_PATH = require('path').join(__dirname, '../oauth2-credentials.json');
const TOKEN_PATH = require('path').join(__dirname, '../config/token.json');
const fs = require('fs');

// ======================================================
// 🔹 Upload to Google Drive (OAuth2)
// ======================================================
async function uploadToDrive(pdfBase64, fileName) {
    const folderID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderID) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID missing');
    }

    //google drive authentication
    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
        throw new Error('OAuth2 credentials or token not found. Please run setup-drive-auth.js first.');
    }

    const credentialsConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentialsConfig.web || credentialsConfig.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    //convert base64 to pdf
    const base64Data = pdfBase64.includes('base64,')
        ? pdfBase64.split('base64,')[1]
        : pdfBase64;

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

    // ✅ Make file public
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    return { webViewLink: response.data.webViewLink, fileId };
}

// ======================================================
// 🔹 Update Google Drive File (OAuth2)
// ======================================================
async function updateInDrive(fileId, pdfBase64) {
    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
        throw new Error('OAuth2 credentials or token not found. Please run setup-drive-auth.js first.');
    }

    const credentialsConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentialsConfig.web || credentialsConfig.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const base64Data = pdfBase64.includes('base64,')
        ? pdfBase64.split('base64,')[1]
        : pdfBase64;

    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.update({
        fileId,
        media: {
            mimeType: 'application/pdf',
            body: stream,
        },
        fields: 'id, webViewLink',
    });

    return { webViewLink: response.data.webViewLink, fileId };
}

// ======================================================
// 🔹 Check Google Drive File Existence
// ======================================================
async function checkFileExistsInDrive(fileId) {
    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
        return false;
    }

    const credentialsConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentialsConfig.web || credentialsConfig.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    try {
        const response = await drive.files.get({
            fileId,
            fields: 'id, trashed'
        });
        if (response.data.trashed) return false;
        return true;
    } catch (err) {
        return false; // File doesn't exist, is trashed, or we don't have access
    }
}

// ======================================================
// 🔹 SAVE OFFER
// ======================================================
router.post('/save', protect, async (req, res) => {
    res.json({ message: 'Offer saved', data: req.body });
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

        const base64Content = pdfBase64.includes('base64,')
            ? pdfBase64.split('base64,')[1]
            : pdfBase64;

        await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: {
                    name: 'VTAB Admin',
                    email: process.env.EMAIL_USER,
                },
                to: [{ email: toEmail }],
                subject: customSubject || 'Offer Letter',
                textContent: customMailContent || `Dear ${candidateName}, Please find your offer letter.`,
                attachment: [
                    {
                        content: base64Content,
                        name: customFileName || `${candidateName}.pdf`,
                    },
                ],
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                },
            }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
                const safeName = candidate.candidateName
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_]/g, '');

                const fileName = `${safeName}_OFFER_LETTER.pdf`;

                let existingOffer = await Offer.findOne({ candidateName: candidate.candidateName });

                if (existingOffer) {
                    const fileExists = await checkFileExistsInDrive(existingOffer.driveFileId);
                    if (!fileExists) {
                        await Offer.findByIdAndDelete(existingOffer._id);
                        existingOffer = null; // Triggers new upload
                    }
                }

                if (existingOffer) {
                    // Compare fields
                    const isDuplicate =
                        existingOffer.doorNo === candidate.doorNo &&
                        existingOffer.street === candidate.street &&
                        existingOffer.addressLine1 === candidate.addressLine1 &&
                        existingOffer.addressLine2 === candidate.addressLine2 &&
                        existingOffer.district === candidate.district &&
                        existingOffer.state === candidate.state &&
                        existingOffer.pincode === candidate.pincode &&
                        existingOffer.designation === candidate.designation &&
                        existingOffer.joiningDate === candidate.joiningDate &&
                        existingOffer.reportingManager === candidate.reportingManager &&
                        existingOffer.location === candidate.location &&
                        existingOffer.offerDate === candidate.date;

                    if (isDuplicate) {
                        results.push({
                            candidateName: candidate.candidateName,
                            success: false,
                            error: 'Offer letter already exists',
                        });
                        continue; // Skip next steps for this candidate
                    }

                    // Fields differ, update in Drive and DB
                    const { webViewLink } = await updateInDrive(existingOffer.driveFileId, candidate.pdfBase64);

                    existingOffer.doorNo = candidate.doorNo;
                    existingOffer.street = candidate.street;
                    existingOffer.addressLine1 = candidate.addressLine1;
                    existingOffer.addressLine2 = candidate.addressLine2;
                    existingOffer.district = candidate.district;
                    existingOffer.state = candidate.state;
                    existingOffer.pincode = candidate.pincode;
                    existingOffer.designation = candidate.designation;
                    existingOffer.joiningDate = candidate.joiningDate;
                    existingOffer.reportingManager = candidate.reportingManager;
                    existingOffer.location = candidate.location;
                    existingOffer.offerDate = candidate.date;
                    await existingOffer.save();

                    results.push({
                        candidateName: candidate.candidateName,
                        success: true,
                        driveLink: webViewLink,
                        message: 'Offer letter updated',
                    });
                } else {
                    const { webViewLink, fileId } = await uploadToDrive(
                        candidate.pdfBase64,
                        fileName
                    );

                    const newOffer = new Offer({
                        candidateName: candidate.candidateName,
                        doorNo: candidate.doorNo,
                        street: candidate.street,
                        addressLine1: candidate.addressLine1,
                        addressLine2: candidate.addressLine2,
                        district: candidate.district,
                        state: candidate.state,
                        pincode: candidate.pincode,
                        designation: candidate.designation,
                        joiningDate: candidate.joiningDate,
                        reportingManager: candidate.reportingManager,
                        location: candidate.location,
                        offerDate: candidate.date,
                        driveFileId: fileId,
                        driveLink: webViewLink,
                    });
                    await newOffer.save();

                    results.push({
                        candidateName: candidate.candidateName,
                        success: true,
                        driveLink: webViewLink,
                    });
                }
            } catch (err) {
                results.push({
                    candidateName: candidate.candidateName,
                    success: false,
                    error: err.message,
                });
            }
        }

        res.json({
            success: true,
            total: candidates.length,
            results,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;