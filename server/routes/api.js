/**
 * REST API Routes for Cognify
 */
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ══════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════

// Upsert user from Google OAuth
router.post('/users/upsert', async (req, res) => {
    try {
        const { google_id, name, email, picture } = req.body;
        if (!google_id || !name) return res.status(400).json({ error: 'google_id and name required' });

        const result = await pool.query(`
      INSERT INTO users (google_id, name, email, picture)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (google_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        picture = EXCLUDED.picture,
        updated_at = NOW()
      RETURNING *
    `, [google_id, name, email, picture]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] User upsert error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user by Google ID
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

// Update user XP and rewards
router.put('/users/:id/xp', async (req, res) => {
    try {
        const { xp, rewards } = req.body;
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
//  ROADMAPS (with duplicate prevention)
// ══════════════════════════════════════════

// Create roadmap (returns existing if same topic for user)
router.post('/roadmaps', async (req, res) => {
    try {
        const { user_id, client_id, topic, levels } = req.body;
        if (!topic || !levels) return res.status(400).json({ error: 'topic and levels required' });

        // Check for existing roadmap with same topic for this user
        if (user_id) {
            const existing = await pool.query(
                'SELECT * FROM roadmaps WHERE user_id = $1 AND LOWER(topic) = LOWER($2)',
                [user_id, topic]
            );
            if (existing.rows.length > 0) {
                return res.json({ ...existing.rows[0], existing: true });
            }
        }

        const result = await pool.query(`
      INSERT INTO roadmaps (user_id, client_id, topic, levels)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [user_id || null, client_id || null, topic, JSON.stringify(levels)]);

        res.json({ ...result.rows[0], existing: false });
    } catch (err) {
        // Handle unique constraint violation
        if (err.code === '23505') {
            const existing = await pool.query(
                'SELECT * FROM roadmaps WHERE user_id = $1 AND LOWER(topic) = LOWER($2)',
                [req.body.user_id, req.body.topic]
            );
            return res.json({ ...existing.rows[0], existing: true });
        }
        console.error('[API] Create roadmap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all roadmaps for a user
router.get('/roadmaps/user/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM roadmaps WHERE user_id = $1 ORDER BY created_at DESC',
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[API] Get roadmaps error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single roadmap
router.get('/roadmaps/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roadmaps WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Roadmap not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] Get roadmap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a specific level within a roadmap
router.put('/roadmaps/:id/levels', async (req, res) => {
    try {
        const { levelId, theoryContent, subtopics, quiz } = req.body;
        if (!levelId) return res.status(400).json({ error: 'levelId required' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current levels
            const roadmapRes = await client.query('SELECT levels FROM roadmaps WHERE id = $1 FOR UPDATE', [req.params.id]);
            if (roadmapRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Roadmap not found' });
            }

            let levels = roadmapRes.rows[0].levels;
            let found = false;

            // Update the specific level
            levels = levels.map(l => {
                if (l.id === levelId) {
                    found = true;
                    return {
                        ...l,
                        theoryContent: theoryContent !== undefined ? theoryContent : l.theoryContent,
                        subtopics: subtopics !== undefined ? subtopics : l.subtopics,
                        quiz: quiz !== undefined ? quiz : l.quiz
                    };
                }
                return l;
            });

            if (!found) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Level not found' });
            }

            // Save back
            await client.query('UPDATE roadmaps SET levels = $1 WHERE id = $2', [JSON.stringify(levels), req.params.id]);
            await client.query('COMMIT');

            res.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[API] Update level error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/roadmaps/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM roadmaps WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[API] Delete roadmap error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════
//  PROGRESS
// ══════════════════════════════════════════

// Upsert progress (complete level or save quiz)
router.put('/progress', async (req, res) => {
    try {
        const { user_id, roadmap_id, completed_levels, quiz_results } = req.body;
        if (!user_id || !roadmap_id) return res.status(400).json({ error: 'user_id and roadmap_id required' });

        const result = await pool.query(`
      INSERT INTO user_progress (user_id, roadmap_id, completed_levels, quiz_results, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, roadmap_id) DO UPDATE SET
        completed_levels = EXCLUDED.completed_levels,
        quiz_results = EXCLUDED.quiz_results,
        updated_at = NOW()
      RETURNING *
    `, [user_id, roadmap_id, completed_levels || [], JSON.stringify(quiz_results || [])]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] Upsert progress error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get progress for a specific roadmap
router.get('/progress/:userId/:roadmapId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_progress WHERE user_id = $1 AND roadmap_id = $2',
            [req.params.userId, req.params.roadmapId]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('[API] Get progress error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get ALL progress for a user (for total XP calculation)
router.get('/progress/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_progress WHERE user_id = $1',
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[API] Get all progress error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════
//  CHAT MESSAGES
// ══════════════════════════════════════════

// Save a chat message
router.post('/chat', async (req, res) => {
    try {
        const { user_id, role, content } = req.body;
        if (!user_id || !role || !content) return res.status(400).json({ error: 'user_id, role, content required' });

        const result = await pool.query(`
      INSERT INTO chat_messages (user_id, role, content)
      VALUES ($1, $2, $3) RETURNING *
    `, [user_id, role, content]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] Save chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save multiple chat messages at once (batch)
router.post('/chat/batch', async (req, res) => {
    try {
        const { user_id, messages } = req.body;
        if (!user_id || !messages?.length) return res.status(400).json({ error: 'user_id and messages required' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const msg of messages) {
                await client.query(
                    'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
                    [user_id, msg.role, msg.content]
                );
            }
            await client.query('COMMIT');
            res.json({ success: true, count: messages.length });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[API] Batch chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get chat history for a user (last 100 messages)
router.get('/chat/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query(
            'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2',
            [req.params.userId, limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[API] Get chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear chat history
router.delete('/chat/:userId', async (req, res) => {
    try {
        await pool.query('DELETE FROM chat_messages WHERE user_id = $1', [req.params.userId]);
        res.json({ success: true });
    } catch (err) {
        console.error('[API] Clear chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ══════════════════════════════════════════
//  CODE HISTORY
// ══════════════════════════════════════════

// Save code execution
router.post('/code-history', async (req, res) => {
    try {
        const { user_id, language, code, stdin, output } = req.body;
        if (!user_id || !language || !code) return res.status(400).json({ error: 'user_id, language, code required' });

        const result = await pool.query(`
      INSERT INTO code_history (user_id, language, code, stdin, output)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [user_id, language, code, stdin || '', output || '']);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[API] Save code error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recent code history
router.get('/code-history/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await pool.query(
            'SELECT * FROM code_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
            [req.params.userId, limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[API] Get code history error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
