/**
 * Cognify Backend API Server
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initTables } from './db.js';
import apiRoutes from './routes/api.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
initTables()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\n🧠 Cognify API Server running on http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   API:    http://localhost:${PORT}/api/*\n`);
        });
    })
    .catch(err => {
        console.error('[Server] Failed to initialize database:', err);
        process.exit(1);
    });
