// FILE: gcal-sync.js
// Modul sinkronisasi Google Calendar: OAuth, push jadwal & todo sebagai events.

import { State } from './core.js';

const CLIENT_ID = '589026066336-2vol76joobb9gogn7g82d0geesg1cfne.apps.googleusercontent.com'; // ← ISI CLIENT ID DARI GOOGLE CLOUD
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_KEY = 'dt_gcal_token';
const SYNC_KEY = 'dt_sync_state';

let accessToken = null;

/* ============================================================
 * INTERNAL HELPERS
 * ============================================================ */
const ALLOWED_SCRIPT_ORIGINS = ['https://accounts.google.com'];

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const allowed = ALLOWED_SCRIPT_ORIGINS.some((origin) => src.startsWith(origin));
    if (!allowed) {
      reject(new Error(`Blokir muat script dari origin tidak dikenal: ${src}`));
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    document.head.appendChild(s);
  });

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const storeToken = (token) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  accessToken = token.access_token;
};

const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  accessToken = null;
};

const getSyncState = () => {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY) || '{}'); }
  catch { return {}; }
};

const saveSyncState = (state) => {
  localStorage.setItem(SYNC_KEY, JSON.stringify(state));
};

const doFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Sesi login habis. Silakan login ulang.');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
};

/* ============================================================
 * PUBLIC API
 * ============================================================ */
export const GcalSync = (() => {

  const init = () => {
    const stored = getStoredToken();
    if (stored && stored.expires_at > Date.now()) {
      accessToken = stored.access_token;
      return true;
    }
    if (stored) clearToken();
    return false;
  };

  const isAuthenticated = () => !!accessToken;

  const auth = async () => {
    if (isAuthenticated()) return accessToken;
    await loadScript('https://accounts.google.com/gsi/client');

    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            storeToken({
              access_token: response.access_token,
              expires_at: Date.now() + (response.expires_in || 3600) * 1000,
            });
            resolve(response.access_token);
          } else {
            reject(response.error || 'Gagal mendapatkan token');
          }
        },
        error_callback: (err) => {
          reject(err?.message || 'Gagal autentikasi');
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  };

  const pushSchedule = async (schedule) => {
    const cat = State.getCategoryById(schedule.categoryId);
    const pri = State.getPriorityById(schedule.priorityId);

    return doFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify({
        summary: schedule.description || '(Tanpa judul)',
        description: `Kategori: ${cat.name}\nPrioritas: ${pri.name}`,
        start: { dateTime: `${schedule.date}T${schedule.startTime}:00`, timeZone: 'Asia/Jakarta' },
        end: { dateTime: `${schedule.date}T${schedule.endTime}:00`, timeZone: 'Asia/Jakarta' },
      }),
    });
  };

  const pushTodo = async (todo) => {
    const pri = State.getPriorityById(todo.priorityId);

    return doFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify({
        summary: todo.name || '(Tanpa judul)',
        description: `Prioritas: ${pri.name}\n(Dari To-Do DailyTrack)`,
        start: { date: todo.date, timeZone: 'Asia/Jakarta' },
        end: { date: todo.date, timeZone: 'Asia/Jakarta' },
      }),
    });
  };

  const syncAll = async (onProgress) => {
    if (!isAuthenticated()) throw new Error('Belum login');

    const syncState = getSyncState();
    const schedules = State.getSchedules();
    const todos = State.getTodos();

    const items = [
      ...schedules.map((s) => ({ ...s, _type: 'schedule' })),
      ...todos.map((t) => ({ ...t, _type: 'todo' })),
    ];

    let synced = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (syncState[item.id]) { skipped++; continue; }

      try {
        const result = item._type === 'schedule'
          ? await pushSchedule(item)
          : await pushTodo(item);
        syncState[item.id] = {
          gcalEventId: result.id,
          syncedAt: new Date().toISOString(),
          type: item._type,
        };
        synced++;
      } catch (err) {
        console.error(`Gagal sync ${item._type} ${item.id}:`, err);
        errors++;
      }

      if (onProgress) onProgress(synced, errors, skipped, i + 1, items.length);
    }

    saveSyncState(syncState);
    return { synced, errors, skipped };
  };

  const getSyncStatus = (itemId) => {
    const state = getSyncState();
    return state[itemId] || null;
  };

  const markUnsynced = (itemId) => {
    const state = getSyncState();
    if (state[itemId]) {
      delete state[itemId];
      saveSyncState(state);
    }
  };

  const clearAllSync = () => {
    localStorage.removeItem(SYNC_KEY);
  };

  const getLastSyncTime = () => {
    const state = getSyncState();
    const times = Object.values(state).map((s) => s.syncedAt).filter(Boolean).sort();
    return times.length > 0 ? times[times.length - 1] : null;
  };

  const getSyncedCount = () => {
    return Object.keys(getSyncState()).length;
  };

  const getTokenExpiry = () => {
    const stored = getStoredToken();
    return stored?.expires_at || null;
  };

  return {
    init, isAuthenticated, auth,
    pushSchedule, pushTodo, syncAll,
    getSyncStatus, markUnsynced, clearAllSync,
    getLastSyncTime, getSyncedCount, getTokenExpiry,
  };
})();
