// routes/registrations.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

const generateToken = () => crypto.randomBytes(16).toString('hex');

// ==========================================
// 1. REGISTER STUDENT (Auto-assigns Random Slot)
// ==========================================
router.post('/', async (req, res) => {
    const { student_id, event_id } = req.body;

    try {
        // A. Check if Registration Exists
        const check = await db.query(
            'SELECT * FROM registrations WHERE student_id = $1 AND event_id = $2',
            [student_id, event_id]
        );

        // If exists, handle logic
        if (check.rows.length > 0) {
            const existingReg = check.rows[0];

            // If they already ate, DO NOT show the QR again (Redeemed)
            if (existingReg.status === 'served') {
                return res.status(400).json({ 
                    error: "Coupon already redeemed. You have been served.",
                    isRedeemed: true 
                });
            }

            // If registered but not served, just return existing data
            return res.status(200).json({
                message: "Existing registration retrieved",
                data: existingReg 
            });
        }

        // B. Find ANY valid slot for this event
        // We look for slots where the END TIME is in the future.
        // Using NOW() at UTC + 5.5h logic matches the event auto-close logic
        const slots = await db.query(
            `SELECT slot_id FROM event_slots 
             WHERE event_id = $1 
             AND time_end > (NOW() AT TIME ZONE 'UTC' + interval '5 hours 30 minutes')`, 
            [event_id]
        );

        if (slots.rows.length === 0) {
            return res.status(404).json({ 
                error: "Registration closed. No available slots or event has ended." 
            });
        }

        // C. Randomly pick one slot
        const randomSlot = slots.rows[Math.floor(Math.random() * slots.rows.length)];
        
        // D. Create Registration
        const token = generateToken();
        const newReg = await db.query(
            `INSERT INTO registrations (student_id, event_id, slot_id, qr_token, status)
             VALUES ($1, $2, $3, $4, 'registered')
             RETURNING registration_id, qr_token, status`,
            [student_id, event_id, randomSlot.slot_id, token]
        );

        res.status(201).json({
            message: "Registration successful",
            data: newReg.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================================
// 2. SCAN QR CODE (Volunteer Action)
// ==========================================
router.post('/scan', async (req, res) => {
    const { qr_token, volunteer_id } = req.body;

    console.log('=== SCAN REQUEST ===');
    console.log('QR Token:', qr_token);
    console.log('Volunteer ID:', volunteer_id);

    try {
        // A. Find Registration from Token
        const reg = await db.query('SELECT * FROM registrations WHERE qr_token = $1', [qr_token]);
        
        if (reg.rows.length === 0) {
            console.log('❌ Invalid QR Token');
            return res.status(404).json({ error: "Invalid QR Token" });
        }

        const registration = reg.rows[0];
        console.log('✅ Found registration for event:', registration.event_id);

        // B. Get volunteer's details
        const volunteerResult = await db.query(
            'SELECT event_id, current_floor, current_counter FROM volunteers WHERE id = $1',
            [volunteer_id]
        );

        if (volunteerResult.rows.length === 0) {
            console.log('❌ Volunteer not found');
            return res.status(404).json({ error: "Volunteer not found" });
        }

        const volunteer = volunteerResult.rows[0];
        console.log('✅ Volunteer assigned to event:', volunteer.event_id);

        // C. Validate Event Match
        // Prevents a volunteer from Event A scanning a student for Event B
        if (registration.event_id !== volunteer.event_id) {
            console.log(`❌ Event mismatch: Volunteer Event ${volunteer.event_id} vs Student Event ${registration.event_id}`);
            return res.status(403).json({ 
                error: "You can only scan QR codes for your assigned event" 
            });
        }

        console.log('✅ Event validation passed');

        // D. Check Registration Status
        if (registration.status === 'served') {
            console.log('❌ Already served');
            return res.status(400).json({ error: "Student already served" });
        }
        if (registration.status === 'cancelled') {
            console.log('❌ Registration cancelled');
            return res.status(400).json({ error: "Registration cancelled" });
        }

        // E. Update Status (The Fix)
        // We use NOW() to save the exact UTC timestamp.
        // The frontend will handle converting this to "2:51 PM" or "14:51".
        console.log('✅ Updating registration status to served...');
        
        await db.query(
            "UPDATE registrations SET status = 'served', served_at = NOW() WHERE registration_id = $1",
            [registration.registration_id]
        );

        // F. Record Volunteer Action (Audit Log)
        // We record exactly which floor/counter the volunteer was at during this scan.
        console.log('✅ Recording volunteer action...');
        await db.query(
            `INSERT INTO volunteer_actions (volunteer_id, registration_id, action, floor, counter) 
             VALUES ($1, $2, 'scan', $3, $4)`,
            [volunteer_id, registration.registration_id, volunteer.current_floor, volunteer.current_counter]
        );

        console.log('✅ Scan completed successfully');
        res.json({ message: "Scan successful", student_id: registration.student_id });

    } catch (err) {
        console.error('❌ Scan error:', err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
