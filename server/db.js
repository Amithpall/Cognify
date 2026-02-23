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
  const start = Date.now();
  const client = await pool.connect();
  try {
    // Core tables
    await client.query(`
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

      CREATE TABLE IF NOT EXISTS roadmaps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        client_id VARCHAR(255),
        topic VARCHAR(255) NOT NULL,
        levels JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, topic)
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        roadmap_id INTEGER REFERENCES roadmaps(id) ON DELETE CASCADE,
        completed_levels TEXT[] DEFAULT '{}',
        quiz_results JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, roadmap_id)
      );

      -- Chat sessions (must exist before chat_messages references it)
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS code_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(50) NOT NULL,
        code TEXT NOT NULL,
        stdin TEXT DEFAULT '',
        output TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Group chat tables
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        invite_code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS room_members (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS room_messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        sender_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        persona VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Level content storage (theory, subtopics)
      CREATE TABLE IF NOT EXISTS level_content (
        id SERIAL PRIMARY KEY,
        roadmap_id INTEGER REFERENCES roadmaps(id) ON DELETE CASCADE,
        level_id VARCHAR(255) NOT NULL,
        theory_content TEXT DEFAULT '',
        subtopics JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(roadmap_id, level_id)
      );

      -- Quiz storage
      CREATE TABLE IF NOT EXISTS level_quizzes (
        id SERIAL PRIMARY KEY,
        roadmap_id INTEGER REFERENCES roadmaps(id) ON DELETE CASCADE,
        level_id VARCHAR(255) NOT NULL,
        questions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(roadmap_id, level_id)
      );
    `);

    // Handle chat_messages — might exist from older version without session_id
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'chat_messages'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      await client.query(`
        CREATE TABLE chat_messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      const colCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'chat_messages' AND column_name = 'session_id'
        )
      `);
      if (!colCheck.rows[0].exists) {
        console.log('[DB] Migrating chat_messages: adding session_id column...');
        await client.query(`ALTER TABLE chat_messages ADD COLUMN session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE`);
        console.log('[DB] Migration complete');
      }
    }

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_level_content_roadmap ON level_content(roadmap_id);
      CREATE INDEX IF NOT EXISTS idx_level_quizzes_roadmap ON level_quizzes(roadmap_id);
    `);

    console.log(`[DB] Tables initialized ${Date.now() - start} ms`);
  } finally {
    client.release();
  }
}

export default pool;
