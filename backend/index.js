require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- Render Deployment Setup for Google Drive Credentials ---
const CREDENTIALS_PATH = path.join(__dirname, 'oauth2-credentials.json');
const CONFIG_DIR = path.join(__dirname, 'config');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

if (process.env.GOOGLE_OAUTH_CREDENTIALS_BASE64) {
    fs.writeFileSync(CREDENTIALS_PATH, Buffer.from(process.env.GOOGLE_OAUTH_CREDENTIALS_BASE64, 'base64').toString('utf-8'));
    console.log('✅ Created oauth2-credentials.json from Environment Variable');
}

if (process.env.GOOGLE_OAUTH_TOKEN_BASE64) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, Buffer.from(process.env.GOOGLE_OAUTH_TOKEN_BASE64, 'base64').toString('utf-8'));
    console.log('✅ Created config/token.json from Environment Variable');
}
// -----------------------------------------------------------

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offer');
const policyAgreementRoutes = require('./routes/policyAgreement');
const relievingRoutes = require('./routes/relievingExperience');
const probationRoutes = require('./routes/probationConfirmation');
const salaryHikeRoutes = require('./routes/salaryHike');

const app = express();

// Serve static files from the frontend dist folder
// app.use(express.static(path.join(__dirname, '../frontend/dist')));

const allowedOrigins = [
    'http://localhost:5173',
    'https://offer-editor-frontend.onrender.com',
    'https://offer-editor-frontend.onrender.com/',
    'https://offergenerator.vtabsquare.com',
    'https://offergenerator.vtabsquare.com/',
    'https://officeportal.vtabsquare.com',
    'https://officeportal.vtabsquare.com/',
    'https://onboardingapp-renderdeployment-backend.onrender.com',
    'https://onboardingapp-renderdeployment-backend.onrender.com/',
    'https://onboardingapp-renderdeployment.onrender.com',
    'https://onboardingapp-renderdeployment.onrender.com/'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        // also, browsers might send "null" string for local HTML file access
        if (!origin || origin === 'null') return callback(null, true);
        
        const isLocalDev = origin.startsWith('http://localhost') || 
                           origin.startsWith('http://127.0.0.1') || 
                           origin.startsWith('http://192.168.') || 
                           origin.startsWith('http://10.') ||
                           origin.startsWith('http://172.') ||
                           // Matches simple local hostnames (no dots, e.g. http://desktop-xl)
                           /^http:\/\/[^\.]+(:\d+)?$/.test(origin);
        
        const dynamicFrontend = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null;
        
        if (allowedOrigins.indexOf(origin) !== -1 || isLocalDev || (dynamicFrontend && origin === dynamicFrontend)) {
            callback(null, true);
        } else {
            console.error('Origin not allowed by CORS (rejected):', origin);
            callback(null, false); // Return false instead of Error object
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const bcrypt = require('bcryptjs');
bcrypt.hash('12345', 10).then(hash => console.log(hash));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/offer', offerRoutes);
app.use('/api/policies', policyAgreementRoutes);
app.use('/api/relieving', relievingRoutes);
app.use('/api/probation', probationRoutes);
app.use('/api/salary-hike', salaryHikeRoutes);

// Health check route for Render
app.get('/', (req, res) => {
    res.status(200).send('Backend API is running');
});

// Catch-all route for frontend
// app.get(/^(?!\/api).+/, (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
// });

// Connect MongoDB and start server
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(process.env.PORT || 5000, () =>
            console.log(`Server running on port ${process.env.PORT || 5000}`)
        );
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });
