// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const Admin = require('../models/Admin');

// // Helper: generate 6-digit OTP
// const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// // Helper: send email
// const sendOtpEmail = async (toEmail, otp) => {
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS,
//         },
//     });
//     await transporter.sendMail({
//         from: `"Offer Editor" <${process.env.EMAIL_USER}>`,
//         to: toEmail,
//         subject: 'Password Reset OTP',
//         html: `<p>Your OTP for password reset is: <b>${otp}</b>. Valid for 10 minutes.</p>`,
//     });
// };

// // POST /api/auth/login
// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         if (!email || !password)
//             return res.status(400).json({ message: 'Email and password are required' });

//         const admin = await Admin.findOne({ email: email.toLowerCase() });
//         if (!admin)
//             return res.status(401).json({ message: 'Invalid credentials' });

//         const isMatch = await bcrypt.compare(password, admin.password);
//         if (!isMatch)
//             return res.status(401).json({ message: 'Invalid credentials' });

//         const token = jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
//         res.json({ token, email: admin.email });
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

// // POST /api/auth/forgot-password — send OTP
// router.post('/forgot-password', async (req, res) => {
//     try {
//         const { email } = req.body;
//         const admin = await Admin.findOne({ email: email.toLowerCase() });
//         if (!admin)
//             return res.status(404).json({ message: 'No admin found with this email' });

//         const otp = generateOtp();
//         admin.resetOtp = otp;
//         admin.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
//         await admin.save();

//         await sendOtpEmail(admin.email, otp);
//         res.json({ message: 'OTP sent to your email' });
//     } catch (err) {
//         res.status(500).json({ message: 'Failed to send OTP', error: err.message });
//     }
// });

// // POST /api/auth/verify-otp
// router.post('/verify-otp', async (req, res) => {
//     try {
//         const { email, otp } = req.body;
//         const admin = await Admin.findOne({ email: email.toLowerCase() });
//         if (!admin)
//             return res.status(404).json({ message: 'Admin not found' });
//         if (admin.resetOtp !== otp)
//             return res.status(400).json({ message: 'Invalid OTP' });
//         if (new Date() > admin.resetOtpExpiry)
//             return res.status(400).json({ message: 'OTP expired' });

//         res.json({ message: 'OTP verified' });
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

// // POST /api/auth/reset-password
// router.post('/reset-password', async (req, res) => {
//     try {
//         const { email, otp, newPassword } = req.body;
//         const admin = await Admin.findOne({ email: email.toLowerCase() });
//         if (!admin)
//             return res.status(404).json({ message: 'Admin not found' });
//         if (admin.resetOtp !== otp)
//             return res.status(400).json({ message: 'Invalid OTP' });
//         if (new Date() > admin.resetOtpExpiry)
//             return res.status(400).json({ message: 'OTP expired' });

//         admin.password = await bcrypt.hash(newPassword, 10);
//         admin.resetOtp = null;
//         admin.resetOtpExpiry = null;
//         await admin.save();

//         res.json({ message: 'Password reset successful' });
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

// // POST /api/auth/seed — create initial admin (run once)
// router.post('/seed', async (req, res) => {
//     try {
//         const existing = await Admin.findOne({ email: 'admin@vtabsquare.com' });
//         if (existing) return res.json({ message: 'Admin already exists' });
//         const hashed = await bcrypt.hash('Admin@123', 10);
//         await Admin.create({ email: 'admin@vtabsquare.com', password: hashed });
//         res.json({ message: 'Admin seeded: admin@vtabsquare.com / Admin@123' });
//     } catch (err) {
//         res.status(500).json({ message: 'Seed failed', error: err.message });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// 🔥 Generate JWT
const generateToken = (id, email) => {
  return jwt.sign(
    { id, email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

// ===============================
// 🔐 LOGIN
// ===============================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin)
      return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await admin.matchPassword(password);

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(admin._id, admin.email);

    res.json({
      success: true,
      token,
      email: admin.email,
    });

  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
});

// ===============================
// 🔥 SEED ADMIN (RUN ONCE)
// ===============================
router.post('/seed', async (req, res) => {
  try {
    const existing = await Admin.findOne({
      email: 'admin@vtabsquare.com',
    });

    if (existing)
      return res.json({ message: 'Admin already exists' });

    await Admin.create({
      email: 'admin@vtabsquare.com',
      password: '12345', // will auto-hash
    });

    res.json({
      message: 'Admin created successfully',
      email: 'admin@vtabsquare.com',
      password: '12345',
    });

  } catch (err) {
    res.status(500).json({
      message: 'Seed failed',
      error: err.message,
    });
  }
});

module.exports = router;