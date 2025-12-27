// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth'); // <--- Import


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes); // <--- Use


// Import Routes
const eventRoutes = require('./routes/events');
const userRoutes = require('./routes/users');
const registrationRoutes = require('./routes/registrations');

// Use Routes
app.use('/events', eventRoutes);
app.use('/users', userRoutes);
app.use('/registrations', registrationRoutes);

// Health Check
app.get('/', (req, res) => {
    res.json({ message: "Mess Coupon System API is running" });
});

// Start Server
app.listen(PORT, () => {
    console.log(` SUCCESS! Server running on port ${PORT}`);
});