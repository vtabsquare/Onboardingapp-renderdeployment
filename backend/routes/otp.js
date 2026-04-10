const express = require('express');
const router = express.Router();
const axios = require('axios');
const Otp = require('../models/Otp');
const { protect } = require('../middleware/authMiddleware');

// Admin email is hardcoded to the static address requested
const ADMIN_EMAIL = 'balamuraleee@gmail.com';

// ======================================================
// 🔹 GENERATE OTP
// ======================================================
router.post('/generate', protect, async (req, res) => {
    try {
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing OTPs
        await Otp.deleteMany({});

        // Save the new OTP
        await Otp.create({ otp });

        // Send OTP to admin email via Brevo
        await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: {
                    name: 'VTAB Admin Portal',
                    email: process.env.EMAIL_USER,
                },
                to: [{ email: ADMIN_EMAIL }],
                subject: '🔐 OTP Verification - VTAB Admin Portal',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h2 style="color: #1e293b; margin: 0 0 8px;">VTAB Square Admin Portal</h2>
                            <p style="color: #64748b; margin: 0; font-size: 14px;">Action Verification Required</p>
                        </div>
                        <div style="background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; text-align: center;">
                            <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Your One-Time Password (OTP) is:</p>
                            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 240px;">
                                <span style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 12px;">${otp}</span>
                            </div>
                            <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0;">This OTP expires in <strong>5 minutes</strong>.</p>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
                            If you did not initiate this action, please ignore this email.
                        </p>
                    </div>
                `,
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                },
            }
        );

        // Return the email so the frontend can display it dynamically
        res.json({ success: true, message: `OTP sent to ${ADMIN_EMAIL}`, email: ADMIN_EMAIL });
    } catch (err) {
        console.error('OTP generation error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ======================================================
// 🔹 VERIFY OTP
// ======================================================
router.post('/verify', protect, async (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ success: false, message: 'OTP is required.' });
        }

        const found = await Otp.findOne({ otp });

        if (!found) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        // OTP is valid - delete it so it can't be reused
        await Otp.deleteOne({ _id: found._id });

        res.json({ success: true, message: 'OTP verified successfully.' });
    } catch (err) {
        console.error('OTP verification error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
