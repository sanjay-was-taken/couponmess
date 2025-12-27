// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');



// 1. GET ALL EVENTS (Admin) - With Auto-Close Logic
router.get('/', async (req, res) => {
    try {
        // --- A. AUTO-CLOSE EXPIRED EVENTS ---
        // Sets status to 'closed' if the event is 'active' but the time has passed.
        // We use (CURRENT_TIMESTAMP + 5.5 hours) to match IST if your server is UTC.
        await db.query(`
            UPDATE events
            SET status = 'closed'
            WHERE status = 'active'
            AND event_id IN (
                SELECT event_id FROM event_slots
                GROUP BY event_id
                HAVING MAX(time_end) < (CURRENT_TIMESTAMP + interval '5 hours 30 minutes')
            )
        `);

        // --- B. FETCH THE LIST ---
        const result = await db.query(`
            SELECT e.*, 
                   (SELECT time_start FROM event_slots WHERE event_id = e.event_id LIMIT 1) as time_start,
                   (SELECT time_end FROM event_slots WHERE event_id = e.event_id LIMIT 1) as time_end
            FROM events e 
            ORDER BY date ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. CREATE EVENT (Admin)
router.post('/', async (req, res) => {
    const { name, description, date, status } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO events (name, description, date, status) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, description, date, status || 'active']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 3. CLOSE / UPDATE EVENT (Admin)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    let { name, description, date, status, time_start, time_end } = req.body;

    try {
        // 1. Update the Main Event Details
        // The query will now use the 'status' passed from the frontend (which is correct)
        const result = await db.query(
            `UPDATE events 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 date = COALESCE($3, date),
                 status = COALESCE($4, status)
             WHERE event_id = $5 RETURNING *`,
            [name, description, date, status, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Event not found" });

        // 2. Update the Slots
        if (time_start && time_end) {
            await db.query(
                `UPDATE event_slots 
                 SET time_start = $1, 
                     time_end = $2 
                 WHERE event_id = $3`,
                [time_start, time_end, id]
            );
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 4. CREATE SLOT (Crucial for the "Random Logic" to work)
router.post('/:id/slots', async (req, res) => {
    const { id } = req.params;
    const { floor, counter, capacity, time_start, time_end } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO event_slots (event_id, floor, counter, capacity, time_start, time_end) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [id, floor, counter, capacity, time_start, time_end]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});
// DELETE EVENT (Hard Delete everything related to it)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // 1. Delete Volunteer Actions (Serving Logs) associated with this event's registrations
        // We find all registrations for this event and delete their logs first.
        await db.query(`
            DELETE FROM volunteer_actions 
            WHERE registration_id IN (
                SELECT registration_id FROM registrations WHERE event_id = $1
            )
        `, [id]);

        // 2. Delete Student Registrations
        await db.query('DELETE FROM registrations WHERE event_id = $1', [id]);

        // 3. Delete Event Slots (Time slots & Counters)
        await db.query('DELETE FROM event_slots WHERE event_id = $1', [id]);

        // 4. Finally, Delete the Main Event
        const result = await db.query('DELETE FROM events WHERE event_id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        res.json({ message: "Event and all related data permanently deleted." });

    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: "Server error. Could not delete event data." });
    }
});
// ==========================================
// 6. VOLUNTEER MANAGEMENT
// ==========================================

// GET Volunteers for an Event
router.get('/:id/volunteers', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT id, name, username FROM volunteers WHERE event_id = $1 ORDER BY name ASC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ADD a New Volunteer
router.post('/:id/volunteers', async (req, res) => {
    try {
        const { id } = req.params; // event_id
        const { name, username, password } = req.body;

        // 1. Check if username exists globally
        const userCheck = await db.query('SELECT * FROM volunteers WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken. Please try a different one.' });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Insert into DB
        const newVol = await db.query(
            'INSERT INTO volunteers (event_id, name, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, username',
            [id, name, username, passwordHash]
        );

        res.json(newVol.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE VOLUNTEER
router.delete('/volunteers/:id', async (req, res) => {
    const { id } = req.params; // This is the volunteer's ID
    try {
        // 1. Delete the volunteer actions first (foreign key constraint)
        await db.query('DELETE FROM volunteer_actions WHERE volunteer_id = $1', [id]);

        // 2. Delete the volunteer
        const result = await db.query('DELETE FROM volunteers WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Volunteer not found" });
        }

        res.json({ message: "Volunteer deleted successfully" });
    } catch (err) {
        console.error("Error deleting volunteer:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET EVENT STATISTICS
router.get('/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Total Served
        const totalReq = await db.query(`
            SELECT COUNT(*) 
            FROM volunteer_actions va
            JOIN registrations r ON va.registration_id = r.registration_id
            WHERE r.event_id = $1
        `, [id]);

        // 2. Breakdown by Batch (Year)
        const batchReq = await db.query(`
            SELECT u.batch, COUNT(*) as count
            FROM volunteer_actions va
            JOIN registrations r ON va.registration_id = r.registration_id
            JOIN users u ON r.student_id = u.user_id
            WHERE r.event_id = $1
            GROUP BY u.batch
            ORDER BY u.batch ASC
        `, [id]);

        // 3. Breakdown by Counter (Volunteer Name)
        const counterReq = await db.query(`
            SELECT u.name as counter_name, COUNT(*) as count
            FROM volunteer_actions va
            JOIN users u ON va.volunteer_id = u.user_id
            JOIN registrations r ON va.registration_id = r.registration_id
            WHERE r.event_id = $1
            GROUP BY u.name
            ORDER BY u.name ASC
        `, [id]);

        res.json({
            total: parseInt(totalReq.rows[0].count),
            byBatch: batchReq.rows,
            byCounter: counterReq.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error fetching stats" });
    }
});

/// GET STATS FOR A SPECIFIC VOLUNTEER (Counter)
router.get('/:id/stats/volunteer/:vid', async (req, res) => {
    const { id, vid } = req.params;
    
    console.log('=== VOLUNTEER STATS REQUEST ===');
    console.log('Event ID:', id);
    console.log('Volunteer ID:', vid);
    
    try {
        // First, let's check if this volunteer exists
        const volunteerCheck = await db.query(`
            SELECT * FROM volunteers WHERE id = $1
        `, [vid]);
        
        console.log('Volunteer exists:', volunteerCheck.rows.length > 0);
        if (volunteerCheck.rows.length > 0) {
            console.log('Volunteer details:', volunteerCheck.rows[0]);
        }
        
        // Check if there are any volunteer_actions for this volunteer
        const actionsCheck = await db.query(`
            SELECT * FROM volunteer_actions WHERE volunteer_id = $1
        `, [vid]);
        
        console.log('Total volunteer_actions for this volunteer:', actionsCheck.rows.length);
        console.log('Sample actions:', actionsCheck.rows.slice(0, 2));
        
        // Check registrations for this event
        const eventRegsCheck = await db.query(`
            SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'served'
        `, [id]);
        
        console.log('Total served registrations for event:', eventRegsCheck.rows[0].count);
        
        // Now try the main query with debugging
        let totalReq, batchReq;
        
        try {
            console.log('Executing main volunteer stats query...');
            totalReq = await db.query(`
                SELECT COUNT(*) 
                FROM volunteer_actions va
                JOIN registrations r ON va.registration_id = r.registration_id
                WHERE r.event_id = $1 AND va.volunteer_id = $2
            `, [id, vid]);

            console.log('Main query result - total scans:', totalReq.rows[0].count);

            batchReq = await db.query(`
                SELECT u.batch, COUNT(*) as count
                FROM volunteer_actions va
                JOIN registrations r ON va.registration_id = r.registration_id
                JOIN users u ON r.student_id = u.user_id
                WHERE r.event_id = $1 AND va.volunteer_id = $2
                GROUP BY u.batch
                ORDER BY u.batch ASC
            `, [id, vid]);
            
            console.log('Batch breakdown:', batchReq.rows);
            
        } catch (volunteerError) {
            console.log('❌ Volunteer-specific stats failed:', volunteerError.message);
            
            // Fallback: show overall event stats
            totalReq = await db.query(`
                SELECT COUNT(*) 
                FROM registrations r
                WHERE r.event_id = $1 AND r.status = 'served'
            `, [id]);

            batchReq = await db.query(`
                SELECT u.batch, COUNT(*) as count
                FROM registrations r
                JOIN users u ON r.student_id = u.user_id
                WHERE r.event_id = $1 AND r.status = 'served'
                GROUP BY u.batch
                ORDER BY u.batch ASC
            `, [id]);
            
            console.log('Using fallback - total served:', totalReq.rows[0].count);
        }

        // Get volunteer name for display
        const volunteerReq = await db.query(`
            SELECT name FROM volunteers WHERE id = $1
        `, [vid]);

        const volunteerName = volunteerReq.rows[0]?.name || 'Unknown Volunteer';
        
        console.log('✅ Returning stats for volunteer:', volunteerName);

        res.json({
            total: parseInt(totalReq.rows[0].count),
            byBatch: batchReq.rows,
            volunteerName: volunteerName
        });

    } catch (err) {
        console.error('❌ Volunteer stats error:', err);
        res.status(500).json({ error: "Server error fetching volunteer stats" });
    }
});





// routes/events.js

router.get('/active', async (req, res) => {
    const studentId = req.query.student_id;

    try {
        // 🆕 AUTO-CLOSE EXPIRED EVENTS FIRST
        await db.query(`
            UPDATE events
            SET status = 'closed'
            WHERE status = 'active'
            AND event_id IN (
                SELECT event_id FROM event_slots
                GROUP BY event_id
                HAVING MAX(time_end) < (CURRENT_TIMESTAMP + interval '5 hours 30 minutes')
            )
        `);

        let query;
        let params = [];

        // Only return events that are still active (not expired)
        const expiryCheck = `
            AND EXISTS (
                SELECT 1 FROM event_slots s 
                WHERE s.event_id = e.event_id 
                AND s.time_end > (CURRENT_TIMESTAMP + interval '5 hours 30 minutes')
            )
        `;

        if (studentId) {
            query = `
                SELECT 
                    e.*, 
                    r.registration_id,
                    r.status as registration_status,
                    r.served_at,
                    s.floor,
                    s.counter,
                    s.time_start,
                    s.time_end
                FROM events e
                LEFT JOIN registrations r ON e.event_id = r.event_id AND r.student_id = $1
                LEFT JOIN event_slots s ON r.slot_id = s.slot_id
                WHERE e.status = 'active' 
                ${expiryCheck}
                ORDER BY e.date ASC
            `;
            params = [studentId];
        } else {
            query = `
                SELECT * FROM events e
                WHERE status = 'active' 
                ${expiryCheck}
                ORDER BY date ASC
            `;
        }

        const result = await db.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET ALL EVENTS FOR STUDENT (Active + Past)
router.get('/all-for-student', async (req, res) => {
    const studentId = req.query.student_id;

    try {
        // Auto-close expired events first
        await db.query(`
            UPDATE events
            SET status = 'closed'
            WHERE status = 'active'
            AND event_id IN (
                SELECT event_id FROM event_slots
                GROUP BY event_id
                HAVING MAX(time_end) < (CURRENT_TIMESTAMP + interval '5 hours 30 minutes')
            )
        `);

        if (studentId) {
            const query = `
                SELECT 
                    e.*, 
                    r.registration_id,
                    r.status as registration_status,
                    r.served_at,
                    s.floor,
                    s.counter,
                    s.time_start,
                    s.time_end
                FROM events e
                LEFT JOIN registrations r ON e.event_id = r.event_id AND r.student_id = $1
                LEFT JOIN event_slots s ON r.slot_id = s.slot_id
                ORDER BY e.date DESC, s.time_start DESC
            `;
            
            const result = await db.query(query, [studentId]);
            res.json(result.rows);
        } else {
            res.status(400).json({ error: "Student ID required" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


// GET SCAN HISTORY FOR AN EVENT (Last 50 scans)
router.get('/:id/scan-history', async (req, res) => {
    const { id } = req.params;
    
    console.log('=== SCAN HISTORY REQUEST ===');
    console.log('Requested event ID:', id);
    
    try {
        const result = await db.query(`
            SELECT 
                u.name as student_name,
                u.email as roll_number,
                u.batch,
                'Staff' as counter_name,
                r.served_at as scanned_at
            FROM registrations r
            JOIN users u ON r.student_id = u.user_id
            WHERE r.event_id = $1 AND r.status = 'served'
            ORDER BY r.served_at DESC
            LIMIT 50
        `, [id]);

        console.log('Query executed successfully');
        console.log('Found', result.rows.length, 'served registrations');

        res.json({ scanHistory: result.rows });
    } catch (err) {
        console.error('❌ Scan history error:', err);
        res.status(500).json({ error: "Server error fetching scan history" });
    }
});






// ==========================================
// GET ALL EVENTS FOR STUDENT (History + Active)
// ==========================================
router.get('/student/:id/all', async (req, res) => {
    const { id } = req.params;
    try {
        // This query fetches ALL events, regardless of date.
        // It joins with 'registrations' to get the specific student's status.
        const query = `
            SELECT 
                e.event_id, 
                e.name, 
                e.description, 
                e.date, 
                e.status,
                r.registration_id, 
                r.status as registration_status, 
                r.served_at,    -- We need this for the "Served at 8:00 PM" text
                s.floor, 
                s.time_start, 
                s.time_end
            FROM events e
            LEFT JOIN registrations r ON e.event_id = r.event_id AND r.student_id = $1
            LEFT JOIN event_slots s ON r.slot_id = s.slot_id
            ORDER BY e.date DESC; -- Newest first
        `;
        
        const result = await db.query(query, [id]);
        res.json(result.rows);

    } catch (err) {
        console.error("Error fetching student events:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;