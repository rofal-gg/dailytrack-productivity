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

const fmtLocalDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtLocalTime = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const RRULE_DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const getDayIndex = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

const toRecurrence = (schedule) => {
  const rt = schedule.repeatType || (schedule.repeatDaily ? 'daily' : 'none');
  if (rt === 'none') return undefined;
  if (rt === 'daily') return ['RRULE:FREQ=DAILY'];
  if (rt === 'weekly') return [`RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAY_MAP[getDayIndex(schedule.date)]}`];
  return undefined;
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

  const buildScheduleBody = (schedule) => {
    const cat = State.getCategoryById(schedule.categoryId);
    const pri = State.getPriorityById(schedule.priorityId);
    const body = {
      summary: schedule.description || '(Tanpa judul)',
      description: `Kategori: ${cat.name}\nPrioritas: ${pri.name}`,
      start: { dateTime: `${schedule.date}T${schedule.startTime}:00`, timeZone: 'Asia/Jakarta' },
      end: { dateTime: `${schedule.date}T${schedule.endTime}:00`, timeZone: 'Asia/Jakarta' },
      extendedProperties: { private: { dailytrack: 'v1' } },
    };
    const rrule = toRecurrence(schedule);
    if (rrule) body.recurrence = rrule;
    return JSON.stringify(body);
  };

  const buildTodoBody = (todo) => {
    const pri = State.getPriorityById(todo.priorityId);
    return JSON.stringify({
      summary: todo.name || '(Tanpa judul)',
      description: `Prioritas: ${pri.name}\n(Dari To-Do DailyTrack)`,
      start: { date: todo.date, timeZone: 'Asia/Jakarta' },
      end: { date: todo.date, timeZone: 'Asia/Jakarta' },
      extendedProperties: { private: { dailytrack: 'v1' } },
    });
  };

  const pushSchedule = async (schedule) =>
    doFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: buildScheduleBody(schedule),
    });

  const pushTodo = async (todo) =>
    doFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: buildTodoBody(todo),
    });

  const updateScheduleEvent = async (schedule, gcalEventId) =>
    doFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`, {
      method: 'PATCH',
      body: buildScheduleBody(schedule),
    });

  const updateTodoEvent = async (todo, gcalEventId) =>
    doFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`, {
      method: 'PATCH',
      body: buildTodoBody(todo),
    });

  const deleteEvent = async (gcalEventId) => {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) { clearToken(); throw new Error('Sesi login habis. Silakan login ulang.'); }
    if (res.status === 404) return;
    if (!res.ok) { const body = await res.text().catch(() => ''); throw new Error(`HTTP ${res.status}: ${body || res.statusText}`); }
  };

  const fetchEvents = async (timeMin, timeMax) => {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    return doFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  };

  const importEvents = async () => {
    if (!isAuthenticated()) throw new Error('Belum login');

    const now = new Date();
    const timeMax = new Date(now);
    timeMax.setDate(timeMax.getDate() + 30);

    const data = await fetchEvents(now, timeMax);
    const items = data.items || [];

    const syncState = getSyncState();
    const knownGcalIds = new Set(
      Object.values(syncState).map((s) => s.gcalEventId).filter(Boolean)
    );

    let schedules = 0, todos = 0;

    for (const event of items) {
      if (!event.start) continue;
      if (knownGcalIds.has(event.id)) continue;
      if (event.extendedProperties?.private?.dailytrack) continue;

      const summary = event.summary || '(Tanpa judul)';

      if (event.start.dateTime) {
        const sd = new Date(event.start.dateTime);
        const ed = new Date(event.end.dateTime);
        State.addSchedule({
          description: summary,
          date: fmtLocalDate(sd),
          startTime: fmtLocalTime(sd),
          endTime: fmtLocalTime(ed),
          categoryId: State.getCategories()[0]?.id || '',
          priorityId: State.getPriorities()[0]?.id || '',
        });
        schedules++;
      } else if (event.start.date) {
        State.addTodo({
          name: summary,
          date: event.start.date,
          priorityId: State.getPriorities()[0]?.id || '',
        });
        todos++;
      }
    }

    return { schedules, todos, total: schedules + todos };
  };

  const syncAll = async () => {
    if (!isAuthenticated()) throw new Error('Belum login');

    const syncState = getSyncState();
    const schedules = State.getSchedules();
    const todos = State.getTodos();

    const currentIds = new Set();
    const activeItems = [];

    for (const s of schedules) { currentIds.add(s.id); activeItems.push({ ...s, _type: 'schedule' }); }
    for (const t of todos) { currentIds.add(t.id); activeItems.push({ ...t, _type: 'todo' }); }

    let synced = 0, errors = 0, skipped = 0;

    for (const [id, st] of Object.entries(syncState)) {
      if (!currentIds.has(id) && st.gcalEventId) {
        try {
          await deleteEvent(st.gcalEventId);
          synced++;
        } catch (err) {
          if (err.message.includes('Sesi login')) throw err;
          errors++;
        }
        delete syncState[id];
      }
    }

    for (const item of activeItems) {
      const existing = syncState[item.id];

      if (existing && !existing.dirty) { skipped++; continue; }

      try {
        let result;
        if (existing && existing.gcalEventId) {
          result = item._type === 'schedule'
            ? await updateScheduleEvent(item, existing.gcalEventId)
            : await updateTodoEvent(item, existing.gcalEventId);
        } else {
          result = item._type === 'schedule'
            ? await pushSchedule(item)
            : await pushTodo(item);
        }
        syncState[item.id] = {
          gcalEventId: result.id,
          syncedAt: new Date().toISOString(),
          type: item._type,
          dirty: false,
        };
        synced++;
      } catch (err) {
        if (err.message.includes('Sesi login')) throw err;
        console.error(`Gagal sync ${item._type} ${item.id}:`, err);
        errors++;
      }
    }

    saveSyncState(syncState);
    return { synced, errors, skipped };
  };

  const getSyncStatus = (itemId) => {
    const state = getSyncState();
    return state[itemId] || null;
  };

  const markDirty = (itemId) => {
    const state = getSyncState();
    if (state[itemId]) {
      state[itemId].dirty = true;
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
    pushSchedule, pushTodo, syncAll, importEvents,
    getSyncStatus, markDirty, clearAllSync,
    getLastSyncTime, getSyncedCount, getTokenExpiry,
  };
})();
