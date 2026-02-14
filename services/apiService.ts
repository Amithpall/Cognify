/**
 * API Service — Frontend client for Cognify backend
 */

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`/api${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers as any },
        ...options,
    });
    if (!res.ok) {
        const body = await res.text();
        console.error(`[API] ${res.status} on ${path}:`, body);
        throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json();
}

// ── Users ──
export async function upsertUser(user: { google_id: string; name: string; email?: string; picture?: string }) {
    return apiFetch('/users/upsert', { method: 'POST', body: JSON.stringify(user) });
}
export async function getUser(googleId: string) { return apiFetch(`/users/${googleId}`); }
export async function updateUserXp(userId: number, xp: number, rewards: string[]) {
    return apiFetch(`/users/${userId}/xp`, { method: 'PUT', body: JSON.stringify({ xp, rewards }) });
}

// ── Roadmaps ──
export async function createRoadmap(data: { user_id: number | null; client_id?: string; topic: string; levels: any[] }) {
    return apiFetch('/roadmaps', { method: 'POST', body: JSON.stringify(data) });
}
export async function getUserRoadmaps(userId: number) { return apiFetch(`/roadmaps/user/${userId}`); }
export async function getRoadmapById(id: number) { return apiFetch(`/roadmaps/${id}`); }
export async function deleteRoadmap(id: number) { return apiFetch(`/roadmaps/${id}`, { method: 'DELETE' }); }

export async function updateRoadmapLevel(roadmapId: number, levelId: string, data: {
    theoryContent?: string;
    subtopics?: any[];
    quiz?: any[];
}) {
    return apiFetch(`/roadmaps/${roadmapId}/levels`, {
        method: 'PUT',
        body: JSON.stringify({ levelId, ...data })
    });
}

// ── Progress ──
export async function upsertProgress(data: { user_id: number; roadmap_id: number; completed_levels: string[]; quiz_results: any[] }) {
    return apiFetch('/progress', { method: 'PUT', body: JSON.stringify(data) });
}
export async function getProgress(userId: number, roadmapId: number) { return apiFetch(`/progress/${userId}/${roadmapId}`); }
export async function getAllProgress(userId: number) { return apiFetch(`/progress/${userId}`); }

// ── Chat Sessions ──
export async function createChatSession(userId: number, title?: string) {
    return apiFetch('/chat/sessions', { method: 'POST', body: JSON.stringify({ user_id: userId, title }) });
}
export async function listChatSessions(userId: number) {
    return apiFetch(`/chat/sessions/${userId}`);
}
export async function updateChatSession(sessionId: number, title: string) {
    return apiFetch(`/chat/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify({ title }) });
}
export async function deleteChatSession(sessionId: number) {
    return apiFetch(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
}

// ── Chat Messages (session-based) ──
export async function saveMessage(data: { user_id: number; session_id: number; role: string; content: string }) {
    return apiFetch('/chat/messages', { method: 'POST', body: JSON.stringify(data) });
}
export async function getSessionMessages(sessionId: number) {
    return apiFetch(`/chat/messages/${sessionId}`);
}
export async function clearAllChat(userId: number) {
    return apiFetch(`/chat/${userId}`, { method: 'DELETE' });
}

// ── Code History ──
export async function saveCodeRun(data: { user_id: number; language: string; code: string; stdin?: string; output?: string }) {
    return apiFetch('/code-history', { method: 'POST', body: JSON.stringify(data) });
}
export async function getCodeHistory(userId: number, limit = 20) { return apiFetch(`/code-history/${userId}?limit=${limit}`); }

// ── Group Chat Rooms ──
export async function createRoom(data: { user_id: number; name: string }) {
    return apiFetch('/rooms', { method: 'POST', body: JSON.stringify(data) });
}
export async function joinRoom(data: { user_id: number; invite_code: string }) {
    return apiFetch('/rooms/join', { method: 'POST', body: JSON.stringify(data) });
}
export async function regenerateInviteCode(roomId: number) {
    return apiFetch(`/rooms/${roomId}/regenerate-code`, { method: 'POST' });
}
export async function getUserRooms(userId: number) { return apiFetch(`/rooms/user/${userId}`); }
export async function getRoomDetails(roomId: number) { return apiFetch(`/rooms/${roomId}`); }
export async function getRoomMessages(roomId: number, afterId?: number) {
    const query = afterId ? `?after=${afterId}` : '';
    return apiFetch(`/rooms/${roomId}/messages${query}`);
}
export async function postRoomMessage(roomId: number, data: {
    user_id?: number; sender_name: string; content: string; role?: string; persona?: string;
}) {
    return apiFetch(`/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify(data) });
}
