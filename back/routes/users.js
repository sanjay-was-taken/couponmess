// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE USER
router.post('/', async (req, res) => {
    const { name, email, role } = req.body;
    try {
        // Check duplicate email
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }
        // Insert
        const result = await db.query(
            `INSERT INTO users (name, email, role) 
             VALUES ($1, $2, $3) RETURNING *`,
            [name, email, role || 'student']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// LIST USERS (Helper)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;