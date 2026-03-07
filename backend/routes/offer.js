const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

// POST /api/offer/save — save offer letter draft (protected)
router.post('/save', protect, async (req, res) => {
    try {
        const offerData = req.body;
        res.json({ message: 'Offer letter data received', data: offerData });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/offer/send-email — send offer letter via Brevo API (protected)
router.post('/send-email', protect, async (req, res) => {
    try {
        const { toEmail, candidateName, joiningDate, pdfBase64, customSubject, customMailContent, customFileName } = req.body;
        const fromEmail = req.admin?.email;

        const missing = [];
        if (!toEmail) missing.push('toEmail');
        if (!candidateName) missing.push('candidateName');
        if (!joiningDate && !customMailContent) missing.push('joiningDate/customMailContent');
        if (!pdfBase64) missing.push('pdfBase64');

        if (missing.length > 0) {
            console.log('Missing fields:', missing);
            return res.status(400).json({
                message: `Missing required fields: ${missing.join(', ')}`,
                details: {
                    toEmail: !!toEmail,
                    candidateName: !!candidateName,
                    joiningDate: !!joiningDate,
                    customMailContent: !!customMailContent,
                    hasPdf: !!pdfBase64
                }
            });
        }

        console.log('Attempting to send email via Brevo to:', toEmail);

        if (!process.env.BREVO_API_KEY) {
            throw new Error('BREVO_API_KEY is not configured in .env');
        }

        const mailContent = customMailContent || `
Dear ${candidateName},

Congratulations! Your documents have been verified.

Your Date of Joining is ${joiningDate}.

Please find attached:
1. Your personalized Offer Letter
2. Company Policy Agreement

We look forward to welcoming you to VTab Pvt. Ltd.

Regards,
HR Team
VTab Pvt. Ltd.
`;

        // Extract base64 content from Data URI
        const base64Content = pdfBase64.includes('base64,')
            ? pdfBase64.split('base64,')[1]
            : pdfBase64;

        console.log(`PDF Attachment Size: ${Math.round(base64Content.length * 0.75 / 1024)} KB`);

        const brevoPayload = {
            sender: { name: "VTAB SQUARE Admin", email: process.env.EMAIL_USER || "balamuraleee@gmail.com" },
            replyTo: { email: fromEmail, name: "HR Team" },
            to: [{ email: toEmail, name: candidateName }],
            // cc: [
            //     { email: "balamuraleee@gmail.com", name: "Bala Muralee" },
            //     { email: "vigneshrajas.vtab@gmail.com", name: "Vignesh Rajas" }
            // ],
            subject: customSubject || "Congratulations! Your Documents have been Verified - VTab Pvt. Ltd.",
            textContent: mailContent,
            attachment: [
                {
                    content: base64Content,
                    name: customFileName
                        ? (customFileName.toLowerCase().endsWith('.pdf') ? customFileName : `${customFileName}.pdf`)
                        : `${customSubject?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || 'Letter'}_${candidateName.replace(/\s+/g, '_')}.pdf`
                }
            ]
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', brevoPayload, {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 60000
        });

        console.log('Brevo API response:', response.data);
        res.json({ success: true, message: 'Email sent successfully via Brevo' });

    } catch (err) {
        console.error('BREVO SEND ERROR:', err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || err.message;
        res.status(500).json({
            message: 'Failed to send email via Brevo',
            error: errorMessage
        });
    }
});

module.exports = router;
