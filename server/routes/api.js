/**
 * REST API Routes for Cognify
 */
import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = Router();

// ── Logging helper ──
function log(tag, msg) {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`\x1b[2m${ts}\x1b[0m \x1b[35m[${tag}]\x1b[0m ${msg}`);
}

// ══════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════

router.post('/users/upsert', async (req, res) => {
    try {
        const { google_id, name, email, picture } = req.body;
        if (!google_id || !name) return res.status(400).json({ error: 'google_id and name required' });
        log('Users', `Upsert: ${name} (${email})`);
        const result = await pool.query(`
      INSERT INTO users (google_id, name, email, picture)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (google_id) DO UPDATE SET
        name = EXCLUDED.name, email = EXCLUDED.email,
        picture = EXCLUDED.picture, updated_at = NOW()
      RETURNING *
    `, [google_id, name, email, picture]);
        log('Users', `Upserted user id=${result.rows[0].id}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] User upsert error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/users/:googleId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [req.params.googleId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] Get user error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/users/:id/xp', async (req, res) => {
    try {
        const { xp, rewards } = req.body;
        log('Users', `Update XP: user=${req.params.id} xp=${xp}`);
        const result = await pool.query(`
      UPDATE users SET xp = $1, rewards = $2, updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [xp, rewards || [], req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] Update XP error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════
//  ROADMAPS
// ══════════════════════════════════════════

router.post('/roadmaps', async (req, res) => {
    try {
        const { user_id, client_id, topic, levels } = req.body;
        if (!topic || !levels) return res.status(400).json({ error: 'topic and levels required' });
        log('Roadmaps', `Create: "${topic}" for user=${user_id}`);
        if (user_id) {
            const existing = await pool.query(
                'SELECT * FROM roadmaps WHERE user_id = $1 AND LOWER(topic) = LOWER($2)', [user_id, topic]
            );
            if (existing.rows.length > 0) return res.json({ ...existing.rows[0], existing: true });
        }
        const result = await pool.query(`
      INSERT INTO roadmaps (user_id, client_id, topic, levels) VALUES ($1, $2, $3, $4) RETURNING *
    `, [user_id || null, client_id || null, topic, JSON.stringify(levels)]);
        res.json({ ...result.rows[0], existing: false });
    } catch (err) {
        if (err.code === '23505') {
            const existing = await pool.query(
                'SELECT * FROM roadmaps WHERE user_id = $1 AND LOWER(topic) = LOWER($2)', [req.body.user_id, req.body.topic]
            );
            return res.json({ ...existing.rows[0], existing: true });
        }
        console.error('[API] Create roadmap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/roadmaps/user/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roadmaps WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
        log('Roadmaps', `Fetched ${result.rows.length} roadmaps for user=${req.params.userId}`);
        res.json(result.rows);
    } catch (err) { console.error('[API] Get roadmaps error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/roadmaps/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roadmaps WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Roadmap not found' });
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Get roadmap error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/roadmaps/:id', async (req, res) => {
    try {
        log('Roadmaps', `Delete roadmap id=${req.params.id}`);
        await pool.query('DELETE FROM roadmaps WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error('[API] Delete roadmap error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ══════════════════════════════════════════
//  PROGRESS
// ══════════════════════════════════════════

router.put('/progress', async (req, res) => {
    try {
        const { user_id, roadmap_id, completed_levels, quiz_results } = req.body;
        if (!user_id || !roadmap_id) return res.status(400).json({ error: 'user_id and roadmap_id required' });
        log('Progress', `Upsert: user=${user_id} roadmap=${roadmap_id}`);
        const result = await pool.query(`
      INSERT INTO user_progress (user_id, roadmap_id, completed_levels, quiz_results, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, roadmap_id) DO UPDATE SET
        completed_levels = EXCLUDED.completed_levels,
        quiz_results = EXCLUDED.quiz_results, updated_at = NOW()
      RETURNING *
    `, [user_id, roadmap_id, completed_levels || [], JSON.stringify(quiz_results || [])]);
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Upsert progress error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/progress/:userId/:roadmapId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_progress WHERE user_id = $1 AND roadmap_id = $2', [req.params.userId, req.params.roadmapId]
        );
        res.json(result.rows[0] || null);
    } catch (err) { console.error('[API] Get progress error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/progress/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_progress WHERE user_id = $1', [req.params.userId]);
        res.json(result.rows);
    } catch (err) { console.error('[API] Get all progress error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ══════════════════════════════════════════
//  CHAT SESSIONS
// ══════════════════════════════════════════

// Create a new chat session
router.post('/chat/sessions', async (req, res) => {
    try {
        const { user_id, title } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });
        log('Chat', `New session: user=${user_id} title="${title || 'New Chat'}"`);
        const result = await pool.query(
            'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
            [user_id, title || 'New Chat']
        );
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Create session error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// List all sessions for a user (most recent first)
router.get('/chat/sessions/:userId', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count,
        (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message
      FROM chat_sessions s
      WHERE s.user_id = $1
      ORDER BY s.updated_at DESC
    `, [req.params.userId]);
        log('Chat', `Listed ${result.rows.length} sessions for user=${req.params.userId}`);
        res.json(result.rows);
    } catch (err) { console.error('[API] List sessions error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Update session title
router.put('/chat/sessions/:id', async (req, res) => {
    try {
        const { title } = req.body;
        const result = await pool.query(
            'UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [title, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Update session error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Delete a session (cascade deletes messages)
router.delete('/chat/sessions/:id', async (req, res) => {
    try {
        log('Chat', `Delete session id=${req.params.id}`);
        await pool.query('DELETE FROM chat_sessions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error('[API] Delete session error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ══════════════════════════════════════════
//  CHAT MESSAGES (session-based)
// ══════════════════════════════════════════

// Save a message to a session
router.post('/chat/messages', async (req, res) => {
    try {
        const { user_id, session_id, role, content } = req.body;
        if (!user_id || !session_id || !role || !content) {
            return res.status(400).json({ error: 'user_id, session_id, role, content required' });
        }
        log('Chat', `Save: session=${session_id} role=${role} len=${content.length}`);

        const result = await pool.query(`
      INSERT INTO chat_messages (user_id, session_id, role, content)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [user_id, session_id, role, content]);

        // Update session timestamp and auto-title from first user message
        await pool.query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [session_id]);

        // Auto-set title from first user message if title is still "New Chat"
        if (role === 'user') {
            await pool.query(`
        UPDATE chat_sessions SET title = $1
        WHERE id = $2 AND title = 'New Chat'
      `, [content.substring(0, 80), session_id]);
        }

        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Save message error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Get all messages for a session
router.get('/chat/messages/:sessionId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
            [req.params.sessionId]
        );
        log('Chat', `Loaded ${result.rows.length} messages for session=${req.params.sessionId}`);
        res.json(result.rows);
    } catch (err) { console.error('[API] Get messages error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Clear all chat data for a user
router.delete('/chat/:userId', async (req, res) => {
    try {
        log('Chat', `Clear all: user=${req.params.userId}`);
        await pool.query('DELETE FROM chat_sessions WHERE user_id = $1', [req.params.userId]);
        res.json({ success: true });
    } catch (err) { console.error('[API] Clear chat error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ── Legacy endpoint for backward compat ──
router.get('/chat/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query(
            'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2',
            [req.params.userId, limit]
        );
        res.json(result.rows);
    } catch (err) { console.error('[API] Get chat error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ══════════════════════════════════════════
//  CODE HISTORY
// ══════════════════════════════════════════

router.post('/code-history', async (req, res) => {
    try {
        const { user_id, language, code, stdin, output } = req.body;
        if (!user_id || !language || !code) return res.status(400).json({ error: 'user_id, language, code required' });
        log('Code', `Save: user=${user_id} lang=${language}`);
        const result = await pool.query(`
      INSERT INTO code_history (user_id, language, code, stdin, output)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [user_id, language, code, stdin || '', output || '']);
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Save code error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/code-history/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await pool.query(
            'SELECT * FROM code_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [req.params.userId, limit]
        );
        res.json(result.rows);
    } catch (err) { console.error('[API] Get code history error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// ══════════════════════════════════════════
//  GROUP CHAT ROOMS
// ══════════════════════════════════════════

function generateInviteCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/rooms', async (req, res) => {
    try {
        const { user_id, name } = req.body;
        if (!user_id || !name) return res.status(400).json({ error: 'user_id and name required' });
        const inviteCode = generateInviteCode();
        log('Rooms', `Create: "${name}" by user=${user_id} code=${inviteCode}`);
        const result = await pool.query(
            `INSERT INTO chat_rooms (name, created_by, invite_code) VALUES ($1, $2, $3) RETURNING *`,
            [name, user_id, inviteCode]
        );
        await pool.query(
            `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [result.rows[0].id, user_id]
        );
        log('Rooms', `Created room id=${result.rows[0].id}`);
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Create room error:', err); res.status(500).json({ error: 'Failed to create room' }); }
});

router.post('/rooms/join', async (req, res) => {
    try {
        const { user_id, invite_code } = req.body;
        if (!user_id || !invite_code) return res.status(400).json({ error: 'user_id and invite_code required' });
        log('Rooms', `Join attempt: user=${user_id} code=${invite_code}`);
        const room = await pool.query('SELECT * FROM chat_rooms WHERE invite_code = $1', [invite_code.toUpperCase()]);
        if (room.rows.length === 0) return res.status(404).json({ error: 'Invalid invite code' });
        await pool.query(
            `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [room.rows[0].id, user_id]
        );
        const user = await pool.query('SELECT name FROM users WHERE id = $1', [user_id]);
        const userName = user.rows[0]?.name || 'Someone';
        await pool.query(
            `INSERT INTO room_messages (room_id, user_id, sender_name, role, content) VALUES ($1, $2, $3, 'system', $4)`,
            [room.rows[0].id, user_id, 'System', `${userName} joined the room`]
        );
        log('Rooms', `User ${user_id} joined room ${room.rows[0].id}`);
        res.json(room.rows[0]);
    } catch (err) { console.error('[API] Join room error:', err); res.status(500).json({ error: 'Failed to join room' }); }
});

router.post('/rooms/:id/regenerate-code', async (req, res) => {
    try {
        const newCode = generateInviteCode();
        log('Rooms', `Regenerate code for room=${req.params.id} → ${newCode}`);
        const result = await pool.query(
            `UPDATE chat_rooms SET invite_code = $1 WHERE id = $2 RETURNING *`, [newCode, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Regenerate code error:', err); res.status(500).json({ error: 'Failed to regenerate code' }); }
});

router.get('/rooms/user/:userId', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT r.*, rm.joined_at,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count,
        (SELECT content FROM room_messages WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chat_rooms r
      JOIN room_members rm ON rm.room_id = r.id
      WHERE rm.user_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.userId]);
        log('Rooms', `Fetched ${result.rows.length} rooms for user=${req.params.userId}`);
        res.json(result.rows);
    } catch (err) { console.error('[API] Get rooms error:', err); res.status(500).json({ error: 'Failed to load rooms' }); }
});

router.get('/rooms/:id', async (req, res) => {
    try {
        const room = await pool.query('SELECT * FROM chat_rooms WHERE id = $1', [req.params.id]);
        if (room.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
        const members = await pool.query(`
      SELECT u.id, u.name, u.picture, rm.joined_at
      FROM room_members rm JOIN users u ON u.id = rm.user_id
      WHERE rm.room_id = $1 ORDER BY rm.joined_at ASC
    `, [req.params.id]);
        res.json({ ...room.rows[0], members: members.rows });
    } catch (err) { console.error('[API] Get room error:', err); res.status(500).json({ error: 'Failed to load room' }); }
});

router.get('/rooms/:id/messages', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const after = req.query.after;
        let query, params;
        if (after) {
            query = 'SELECT * FROM room_messages WHERE room_id = $1 AND id > $2 ORDER BY created_at ASC LIMIT $3';
            params = [req.params.id, after, limit];
        } else {
            query = 'SELECT * FROM room_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT $2';
            params = [req.params.id, limit];
        }
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { console.error('[API] Get room messages error:', err); res.status(500).json({ error: 'Failed to load messages' }); }
});

router.post('/rooms/:id/messages', async (req, res) => {
    try {
        const { user_id, sender_name, content, role, persona } = req.body;
        if (!content) return res.status(400).json({ error: 'content required' });
        log('Rooms', `Message in room=${req.params.id} from=${sender_name || 'bot'} role=${role || 'user'}`);
        const result = await pool.query(
            `INSERT INTO room_messages (room_id, user_id, sender_name, role, content, persona)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.params.id, user_id || null, sender_name || 'Unknown', role || 'user', content, persona || null]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error('[API] Post room message error:', err); res.status(500).json({ error: 'Failed to send message' }); }
});

export default router;
