const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { sendUserCredentialsEmail } = require('../services/emailService');

// Utility to generate JWT for users
const generateUserToken = (user, type = 'auth') => {
    const payload = { id: user._id, email: user.email, type };
    if (type === 'auth') {
        payload.faceVerified = true;
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { algorithm: 'HS512', expiresIn: type === 'face_verification' ? '30d' : '7d' }
    );
};

// ======================================================
// 🔹 ADMIN: CREATE NEW USER
// ======================================================
router.post('/admin/create-user', protect, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email ID is required.' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        // Generate temporary password and unique User ID
        const tempPassword = Math.random().toString(36).slice(-10);
        const userId = 'USR' + Date.now().toString().slice(-6);
        const unionNumber = Math.floor(100000 + Math.random() * 900000).toString();

        const user = new User({
            email: email.toLowerCase(),
            tempPassword: tempPassword,
            userId,
            unionNumber,
            isVerified: false,
        });

        // Generate verification token
        const verificationToken = generateUserToken(user, 'face_verification');
        user.faceVerificationToken = verificationToken;

        await user.save();

        // URLs for the email
        // Dynamically grab the frontend URL from the request origin so it perfectly matches where the admin is creating the user (local or Render).
        const originUrl = req.headers.origin;
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
        const fallbackUrl = isProduction 
            ? 'https://onboardingapp-renderdeployment.onrender.com' 
            : 'http://localhost:5173';
        
        const frontendUrl = originUrl || process.env.FRONTEND_URL || fallbackUrl;
        const loginUrl = `${frontendUrl}/user/login`;
        const verificationUrl = `${frontendUrl}/user/verify-face?token=${verificationToken}`;

        // Send email
        const emailSent = await sendUserCredentialsEmail(email, tempPassword, loginUrl, verificationUrl);

        res.status(201).json({
            success: true,
            message: emailSent ? 'User created and email sent.' : 'User created but email failed to send.',
            user: {
                email: user.email,
                userId: user.userId,
                unionNumber: user.unionNumber
            }
        });

    } catch (err) {
        console.error('CREATE USER ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ======================================================
// 🔹 USER: CAPTURE/STORE FACE DATA
// ======================================================
router.post('/user/verify-face', async (req, res) => {
    try {
        const { token, faceData } = req.body;

        if (!token || !faceData) {
            return res.status(400).json({ message: 'Token and face data required.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'face_verification') {
            return res.status(401).json({ message: 'Invalid token type.' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        console.log(`[VERIFY-FACE] Attempting verification for User ID: ${decoded.id}`);
        user.faceData = faceData;
        user.isVerified = true;
        user.markModified('faceData');
        user.markModified('isVerified');
        user.faceVerificationToken = null; 
        
        await user.save();
        console.log(`[VERIFY-FACE] ✅ Success! User ${user.email} is now verified.`);

        res.json({ success: true, message: 'Face data verified and stored. You can now login.' });

    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.', error: err.message });
    }
});

// ======================================================
// 🔹 USER: LOGIN
// ======================================================
router.post('/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: 'Face verification incomplete.' });
        }

        // Check if using temp password
        const isTempMatch = await user.matchTempPassword(password);
        if (isTempMatch) {
            if (user.isTempPasswordExpired) {
                return res.status(401).json({ message: 'Temporary password expired. Please contact admin.' });
            }
            const token = generateUserToken(user, 'reset_required');
            return res.json({
                success: true,
                resetRequired: true,
                token,
                message: 'Temporary login successful. Reset password now.'
            });
        }

        // Check regular password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Regular login successful -> Proceed to face match step
        const token = generateUserToken(user, 'face_match_required');
        res.json({
            success: true,
            faceMatchRequired: true,
            token,
            message: 'Credentials valid. Proceed to face matching.'
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ======================================================
// 🔹 USER: RESET PASSWORD
// ======================================================
router.post('/user/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'reset_required') {
            return res.status(401).json({ message: 'Invalid token.' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.password = newPassword;
        user.isTempPasswordExpired = true;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully. Please login again.' });

    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
});

// ======================================================
// 🔹 USER: FACE MATCH (FINAL AUTH STEP)
// ======================================================
router.post('/user/match-face', async (req, res) => {
    try {
        const { token, liveFaceData } = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'face_match_required') {
            return res.status(401).json({ message: 'Invalid token.' });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.faceData) {
            return res.status(404).json({ message: 'User or face data not found.' });
        }

        // Note: Actual face comparison should ideally happen here or in the frontend.
        // face-api.js comparison: Euclidean distance < 0.6 usually means a match.
        // If we want to do it here, we'd need to compute the distance.
        // For simplicity and standard face-api usage, the frontend often does the match 
        // using the stored descriptors fetched from backend.
        // However, the prompt says "Compare live face with stored faceData" and "If MATCH: Redirect to Offer Page".
        
        // I'll return the stored faceData so the frontend can compare, 
        // OR I can implement a simple Euclidean distance check if provided.
        // Let's assume the frontend sends the live descriptor and we compare here.

        const euclideanDistance = (v1, v2) => {
            return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
        };

        const distance = euclideanDistance(user.faceData, liveFaceData);
        const threshold = 0.6;

        if (distance < threshold) {
            // Success! Issue final auth token
            const authToken = generateUserToken(user, 'auth');
            res.json({
                success: true,
                token: authToken,
                message: 'Face match successful. Access granted.'
            });
        } else {
            res.status(401).json({ success: false, message: 'Face not recognized.' });
        }

    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
});

// ======================================================
// 🔹 ADMIN: GET ALL USERS (BONUS)
// ======================================================
router.get('/admin/users', protect, async (req, res) => {
    try {
        console.log(`[ADMIN] DB Name: ${mongoose.connection.name}`);
        console.log(`[ADMIN] Collection Name: ${User.collection.name}`);
        const users = await User.find().select('-password -tempPassword -faceData');
        console.log(`[ADMIN] Found ${users.length} users.`);
        res.json(users);
    } catch (err) {
        console.error('[ADMIN] Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ======================================================
// 🔹 VTAB SSO LOGIN
// ======================================================
router.post('/vtab-sso', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Missing SSO token' });
        
        const ssoSecret = process.env.VTAB_SSO_SECRET;
        if (!ssoSecret) return res.status(500).json({ message: 'SSO not configured on server' });

        const decoded = jwt.verify(token, ssoSecret, {
            algorithms: ['HS256'],
            audience: 'onboard360',
            issuer: 'vtab360'
        });

        if (decoded.purpose !== 'vtab_sso') {
            return res.status(400).json({ message: 'Invalid token purpose' });
        }

        const email = decoded.email.toLowerCase();
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(403).json({ message: 'SSO user is not registered in Onboard360.' });
        }

        // Return standard auth token, bypassing face match
        const authToken = generateUserToken(user, 'auth');
        res.json({
            success: true,
            token: authToken,
            message: 'SSO login successful.'
        });

    } catch (err) {
        console.error('VTAB SSO Error:', err);
        res.status(401).json({ message: 'SSO token invalid or expired. Please click the app again in VTAB 365.' });
    }
});

module.exports = router;
