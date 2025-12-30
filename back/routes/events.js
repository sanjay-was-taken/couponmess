// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. GET ALL EVENTS (Admin) 
// ==========================================
// NOTE: Auto-close logic REMOVED. Admin controls status manually.
router.get('/', async (req, res) => {
    try {
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

// ==========================================
// 3. CLOSE / UPDATE EVENT (Admin)
// ==========================================
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    // We extract status explicitly. If the admin sends "active", we MUST respect it.
    let { name, description, date, status, time_start, time_end } = req.body;

    try {
        // 1. Update the Main Event Details
        // We do NOT check the time here. If the admin says it's active, it's active.
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

// ==========================================
// 4. CREATE SLOT
// ==========================================
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

// ==========================================
// 5. DELETE EVENT (Transactional Hard Delete)
// ==========================================
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Use db.query instead of pool connection
        await db.query('BEGIN');

        // 1. Delete Volunteer Actions
        await db.query(`
            DELETE FROM volunteer_actions 
            WHERE registration_id IN (
                SELECT registration_id FROM registrations WHERE event_id = $1
            )
        `, [id]);

        // 2. Delete Student Registrations
        await db.query('DELETE FROM registrations WHERE event_id = $1', [id]);

        // 3. Delete Event Slots
        await db.query('DELETE FROM event_slots WHERE event_id = $1', [id]);

        // 4. Delete Volunteers assigned to this event
        await db.query('DELETE FROM volunteers WHERE event_id = $1', [id]);

        // 5. Finally, Delete the Main Event
        const result = await db.query('DELETE FROM events WHERE event_id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: "Event not found" });
        }

        await db.query('COMMIT');
        res.json({ message: "Event and all related data permanently deleted." });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Delete Error:", err);
        res.status(500).json({ error: "Server error during deletion" });
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

        const userCheck = await db.query('SELECT * FROM volunteers WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

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
    const { id } = req.params;
    try {
        await db.query('DELETE FROM volunteer_actions WHERE volunteer_id = $1', [id]);
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

// ==========================================
// 7. EVENT STATISTICS & DASHBOARD DATA
// ==========================================

// GET EVENT STATISTICS (Admin)
router.get('/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
        const totalReq = await db.query(`
            SELECT COUNT(*) 
            FROM volunteer_actions va
            JOIN registrations r ON va.registration_id = r.registration_id
            WHERE r.event_id = $1
        `, [id]);

        const batchReq = await db.query(`
            SELECT u.batch, COUNT(*) as count
            FROM volunteer_actions va
            JOIN registrations r ON va.registration_id = r.registration_id
            JOIN users u ON r.student_id = u.user_id
            WHERE r.event_id = $1
            GROUP BY u.batch
            ORDER BY u.batch ASC
        `, [id]);

        const counterReq = await db.query(`
            SELECT 
                CONCAT('Floor ', va.floor, ' - Counter ', va.counter) as counter_name, 
                COUNT(*) as count
            FROM volunteer_actions va
            JOIN registrations r ON va.registration_id = r.registration_id
            WHERE r.event_id = $1 
            AND va.floor IS NOT NULL 
            AND va.counter IS NOT NULL
            GROUP BY va.floor, va.counter
            ORDER BY va.floor, va.counter ASC
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

// GET STATS FOR A SPECIFIC VOLUNTEER (Counter)
router.get('/:id/stats/volunteer/:vid', async (req, res) => {
    const { id, vid } = req.params;
    try {
        let totalReq, batchReq;
        
        try {
            totalReq = await db.query(`
                SELECT COUNT(*) 
                FROM volunteer_actions va
                JOIN registrations r ON va.registration_id = r.registration_id
                WHERE r.event_id = $1 AND va.volunteer_id = $2
            `, [id, vid]);

            batchReq = await db.query(`
                SELECT u.batch, COUNT(*) as count
                FROM volunteer_actions va
                JOIN registrations r ON va.registration_id = r.registration_id
                JOIN users u ON r.student_id = u.user_id
                WHERE r.event_id = $1 AND va.volunteer_id = $2
                GROUP BY u.batch
                ORDER BY u.batch ASC
            `, [id, vid]);
            
        } catch (volunteerError) {
            // Fallback
            totalReq = await db.query(`SELECT COUNT(*) FROM registrations r WHERE r.event_id = $1 AND r.status = 'served'`, [id]);
            batchReq = await db.query(`SELECT u.batch, COUNT(*) as count FROM registrations r JOIN users u ON r.student_id = u.user_id WHERE r.event_id = $1 AND r.status = 'served' GROUP BY u.batch`, [id]);
        }

        const volunteerReq = await db.query(`SELECT name FROM volunteers WHERE id = $1`, [vid]);
        const volunteerName = volunteerReq.rows[0]?.name || 'Unknown Volunteer';
        
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

// ==========================================
// 8. ACTIVE & STUDENT EVENTS
// ==========================================

// GET ACTIVE EVENTS (Student Dashboard)
router.get('/active', async (req, res) => {
    const studentId = req.query.student_id;

    try {
        // NOTE: Removed auto-close logic. Admin controls status.
        
        let query;
        let params = [];

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
                ORDER BY e.date ASC
            `;
            params = [studentId];
        } else {
            query = `
                SELECT * FROM events e
                WHERE status = 'active' 
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

// GET ALL EVENTS FOR STUDENT (History + Active)
router.get('/all-for-student', async (req, res) => {
    const studentId = req.query.student_id;

    try {
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

// GET SCAN HISTORY
router.get('/:id/scan-history', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                u.name as student_name,
                u.email as roll_number,
                u.batch,
                CONCAT('Floor ', va.floor, ' - Counter ', va.counter) as counter_name,
                r.served_at as scanned_at
            FROM registrations r
            JOIN users u ON r.student_id = u.user_id
            JOIN volunteer_actions va ON va.registration_id = r.registration_id
            WHERE r.event_id = $1 AND r.status = 'served'
            ORDER BY r.served_at DESC
            LIMIT 50
        `, [id]);

        res.json({ scanHistory: result.rows });
    } catch (err) {
        console.error('❌ Scan history error:', err);
        res.status(500).json({ error: "Server error fetching scan history" });
    }
});

// GET available slots
router.get('/:id/slots', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT DISTINCT floor, counter 
            FROM event_slots 
            WHERE event_id = $1 
            ORDER BY floor, counter
        `, [id]);

        res.json({ slots: result.rows });
    } catch (err) {
        console.error('Error fetching event slots:', err);
        res.status(500).json({ error: "Server error" });
    }
});

// UPDATE volunteer's assignment
router.patch('/volunteers/:vid/assignment', async (req, res) => {
    const { vid } = req.params;
    const { floor, counter } = req.body;
    try {
        const result = await db.query(`
            UPDATE volunteers 
            SET current_floor = $1, current_counter = $2 
            WHERE id = $3 
            RETURNING id, name, current_floor, current_counter
        `, [floor, counter, vid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Volunteer not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating volunteer assignment:', err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
