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