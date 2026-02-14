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

// ── Colored logging helpers ──
const colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    white: '\x1b[37m',
};

function timestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ── Request logging middleware ──
app.use((req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl;

    // Log request arrival
    console.log(
        `${colors.dim}${timestamp()}${colors.reset} ${colors.cyan}→${colors.reset} ${colors.white}${method}${colors.reset} ${url}`
    );

    // Capture response
    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusColor = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;

        console.log(
            `${colors.dim}${timestamp()}${colors.reset} ${statusColor}← ${status}${colors.reset} ${method} ${url} ${colors.dim}${duration}ms${colors.reset}`
        );

        return originalSend.call(this, body);
    };

    next();
});

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
            console.log(`\n${colors.green}🧠 Cognify API Server running on http://localhost:${PORT}${colors.reset}`);
            console.log(`${colors.dim}   Health: http://localhost:${PORT}/health${colors.reset}`);
            console.log(`${colors.dim}   API:    http://localhost:${PORT}/api/*${colors.reset}\n`);
        });
    })
    .catch(err => {
        console.error(`${colors.red}[Server] Failed to initialize database:${colors.reset}`, err);
        process.exit(1);
    });
