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
const helmet = require('helmet');
const compression = require('compression');

// Add after other middleware
app.use(helmet());
app.use(compression());

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Smart auto-close: only runs when there are active events
setInterval(async () => {
    try {
        // Quick check: any active events?
        const activeCheck = await db.query('SELECT COUNT(*) as count FROM events WHERE status = \'active\'');
        const activeCount = parseInt(activeCheck.rows[0].count);
        
        if (activeCount > 0) {
            // Run auto-close logic
            const result = await db.query(`
                UPDATE events 
                SET status = 'closed' 
                WHERE status = 'active' 
                AND event_id IN (
                    SELECT event_id FROM event_slots 
                    GROUP BY event_id 
                    HAVING MAX(time_end) < timezone('Asia/Kolkata', NOW())
                )
            `);
            
            if (result.rowCount > 0) {
                console.log(`✅ Auto-closed ${result.rowCount} expired events`);
            }
        }
    } catch (err) {
        console.error('❌ Auto-close error:', err);
    }
}, 120000); // Every 2 minutes

