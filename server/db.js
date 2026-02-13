/**
 * Database connection and table initialization
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

// Test connection
pool.query('SELECT NOW()')
    .then(() => console.log('[DB] Connected to PostgreSQL'))
    .catch(err => console.error('[DB] Connection failed:', err.message));

/**
 * Create all tables if they don't exist
 */
export async function initTables() {
    const client = await pool.connect();
    try {
        await client.query(`
      -- Users table (synced from Google OAuth)
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        picture TEXT,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        rewards TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Roadmaps (unique per user+topic to prevent duplicates)
      CREATE TABLE IF NOT EXISTS roadmaps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(255),
        topic VARCHAR(255) NOT NULL,
        levels JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, topic)
      );

      -- User progress per roadmap
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        roadmap_id INTEGER REFERENCES roadmaps(id) ON DELETE CASCADE,
        completed_levels TEXT[] DEFAULT '{}',
        quiz_results JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, roadmap_id)
      );

      -- Chat messages
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Code playground history
      CREATE TABLE IF NOT EXISTS code_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(50) NOT NULL,
        code TEXT NOT NULL,
        stdin TEXT DEFAULT '',
        output TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(user_id, created_at);
    `);
        console.log('[DB] Tables initialized');
    } finally {
        client.release();
    }
}

export default pool;
