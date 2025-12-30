const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Production optimizations
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 10000, // 10 second query timeout
    query_timeout: 10000,
});

// Connection error handling
pool.on('error', (err) => {
    console.error('Database pool error:', err);
});

module.exports = {
    query: async (text, params) => {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            if (duration > 1000) {
                console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
            }
            return res;
        } catch (err) {
            console.error('Query error:', err.message, 'Query:', text.substring(0, 100));
            throw err;
        }
    },
    pool // Export pool for transactions
};
