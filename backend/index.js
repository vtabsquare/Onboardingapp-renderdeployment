require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offer');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://offer-editor-frontend.onrender.com',
    'https://offer-editor-frontend.onrender.com/',
    'https://offergenerator.vtabsquare.com',
    'https://offergenerator.vtabsquare.com/',
    'https://officeportal.vtabsquare.com',
    'https://officeportal.vtabsquare.com/'
];

app.use(cors({
    origin: function (origin, callback) {
        console.log('Incoming Origin:', origin);
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error('Origin not allowed by CORS:', origin);
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

app.get('/', (req, res) => res.json({ message: 'Offer Editor API running' }));

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
