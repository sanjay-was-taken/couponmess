// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


// 1. Setup Google Client
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_change_this";

// ===============================
// HELPER: Extract Batch from Email
// Format: sanjays24bec18@... -> Batch: 24
// ===============================
const extractBatch = (email) => {
    try {
        const localPart = email.split('@')[0]; // Get "sanjays24bec18"
        
        // Regex Explanation:
        // [a-z]+   -> Matches name (sanjays)
        // (\d{2})  -> Matches and Captures 2 digits (24) -> This is the batch
        // [a-z]+   -> Matches course (bec)
        // \d+      -> Matches roll number (18)
        const match = localPart.match(/[a-z]+(\d{2})[a-z]+\d+/i);
        
        if (match && match[1]) {
            return "20" + match[1]; // Returns "2024" (or just match[1] if you want "24")
        }
        return null; // Could not parse
    } catch (err) {
        return null;
    }
};
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query database using email field (since username column doesn't exist)
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1', 
            [username]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            // Check if password matches
            if (user.password === password) {
                const appToken = jwt.sign(
                    { 
                        user_id: user.user_id, 
                        role: user.role, 
                        name: user.name, 
                        email: user.email 
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return res.json({
                    message: "Login successful",
                    token: appToken,
                    user: { 
                        user_id: user.user_id, 
                        name: user.name, 
                        role: user.role 
                    }
                });
            }
        }

        return res.status(401).json({ error: "Invalid credentials" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
// ===============================
// POST /auth/google
// ===============================
router.post('/google', async (req, res) => {
    const { token } = req.body;

    try {
        // A. VERIFY TOKEN WITH GOOGLE
        // Note: In production, uncomment the verifyIdToken lines.
        // For testing without a real frontend, we might mock this, 
        // but here is the real code:
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID, 
        });
        const payload = ticket.getPayload();
        
        const googleEmail = payload.email;
        const googleName = payload.name;

        // B. DOMAIN LOCK (Security Check)
        if (!googleEmail.endsWith('@iiitkottayam.ac.in')) {
            return res.status(403).json({ 
                error: "Access Restricted. Please login with your IIIT Kottayam email." 
            });
        }

        // C. CHECK IF USER EXISTS
        let userResult = await db.query('SELECT * FROM users WHERE email = $1', [googleEmail]);
        let user = userResult.rows[0];

        // D. AUTO-SIGNUP (If new user)
        if (!user) {
            console.log(`Creating new user for ${googleEmail}...`);
            
            // 1. Auto-extract Batch
            let batch = extractBatch(googleEmail);
            let role = 'student'; 

            // Optional: If extraction fails (e.g., professor email), maybe make them admin or null batch
            if (!batch) {
                // You can add logic here: if email format is different, maybe it's faculty?
                batch = null; 
            }

            // 2. Insert into DB
            const newUser = await db.query(
                `INSERT INTO users (name, email, role, batch) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [googleName, googleEmail, role, batch]
            );
            user = newUser.rows[0];
        }

        // E. GENERATE SESSION TOKEN
        const appToken = jwt.sign(
            { 
              user_id: user.user_id, 
              role: user.role, 
              email: user.email,
              batch: user.batch 
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: "Login successful",
            token: appToken,
            user: {
                user_id: user.user_id,
                name: user.name,
                role: user.role,
                batch: user.batch
            }
        });

    } catch (err) {
        console.error("Auth Error:", err);
        res.status(401).json({ error: "Invalid Google Token" });
    }
});
// Add this route for volunteer login
router.post('/volunteer-login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('=== VOLUNTEER LOGIN ATTEMPT ===');
    console.log('Username:', username);
    console.log('Password provided:', password ? 'YES' : 'NO');
    
    try {
        // Find volunteer by username
        const result = await db.query(
            'SELECT * FROM volunteers WHERE username = $1',
            [username]
        );
        
        console.log('Database query completed. Rows found:', result.rows.length);
        
        if (result.rows.length === 0) {
            console.log('❌ No volunteer found with username:', username);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const volunteer = result.rows[0];
        console.log('✅ Found volunteer:', {
            id: volunteer.id,
            name: volunteer.name,
            username: volunteer.username,
            event_id: volunteer.event_id,
            has_password_hash: volunteer.password_hash ? 'YES' : 'NO'
        });
        
        // Check password
        console.log('Comparing password...');
        const isMatch = await bcrypt.compare(password, volunteer.password_hash);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('❌ Password does not match for volunteer:', username);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ Password matches! Creating token...');
        
        // Create JWT token - use the same JWT_SECRET as other routes
        const token = jwt.sign(
            { 
                id: volunteer.id, 
                username: volunteer.username,
                role: 'volunteer',
                event_id: volunteer.event_id 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('✅ Token created successfully');
        console.log('=== LOGIN SUCCESSFUL ===');
        
        res.json({
            token,
            user: {
                id: volunteer.id,
                name: volunteer.name,
                username: volunteer.username,
                role: 'volunteer',
                event_id: volunteer.event_id
            }
        });
        
    } catch (err) {
        console.error('❌ Volunteer login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;