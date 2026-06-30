// FILE: core.js
// Modul inti: konstanta storage, utilitas, layer penyimpanan, dan state management.
// Diimpor sebagai ES Module oleh dashboard.js, jadwal.js, dan todo.js.

export const STORAGE_KEYS = {
  CATEGORIES: 'dt_categories',
  PRIORITIES: 'dt_priorities',
  COLUMNS: 'dt_columns',
  SCHEDULES: 'dt_schedules',
  TODOS: 'dt_todos',
};

/* ============================================================
 * UTILS
 * ============================================================ */
export const Utils = (() => {
  const pad = (n) => n.toString().padStart(2, '0');

  const generateId = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));

  const formatDateInput = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Minggu
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const parseDateStr = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateDisplay = (dateStr) => {
    const date = parseDateStr(dateStr);
    return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDateShort = (dateStr) => {
    const date = parseDateStr(dateStr);
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  };

  const formatWeekRangeLabel = (monday) => {
    const sunday = addDays(monday, 6);
    const sameMonth = monday.getMonth() === sunday.getMonth();
    const startLabel = sameMonth
      ? `${monday.getDate()}`
      : `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]}`;
    return `${startLabel} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
  };

  return {
    pad, generateId, escapeHtml, formatDateInput, addDays, getMonday,
    DAY_NAMES, DAY_NAMES_SHORT, parseDateStr, formatDateDisplay, formatDateShort, formatWeekRangeLabel,
  };
})();

/* ============================================================
 * STORAGE — satu-satunya layer yang menyentuh localStorage
 * ============================================================ */
const Storage = (() => {
  const load = (key, fallback = []) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error(`Gagal membaca localStorage[${key}]`, err);
      return fallback;
    }
  };

  const save = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error(`Gagal menyimpan localStorage[${key}]`, err);
    }
  };

  return { load, save };
})();

/* ============================================================
 * STATE — single source of truth, sinkron otomatis ke Storage
 * ============================================================ */
export const State = (() => {
  let categories = [];
  let priorities = [];
  let columns = [];
  let schedules = [];
  let todos = [];

  const seedDefaultsIfEmpty = () => {
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      Storage.save(STORAGE_KEYS.CATEGORIES, [
        { id: 'cat-kuliah', name: 'Kuliah', color: '#cdd6ff', repeatPattern: 'weekly' },
        { id: 'cat-tugas', name: 'Tugas', color: '#ffd8a8', repeatPattern: 'none' },
        { id: 'cat-rapat', name: 'Rapat', color: '#e3c9ff', repeatPattern: 'none' },
        { id: 'cat-pribadi', name: 'Pribadi', color: '#b8f2e6', repeatPattern: 'none' },
      ]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRIORITIES)) {
      Storage.save(STORAGE_KEYS.PRIORITIES, [
        { id: 'pri-tinggi', name: 'Tinggi', color: '#ffadad' },
        { id: 'pri-sedang', name: 'Sedang', color: '#ffe08a' },
        { id: 'pri-rendah', name: 'Rendah', color: '#b9fbc0' },
      ]);
    }
  };

  const init = () => {
    seedDefaultsIfEmpty();
    categories = Storage.load(STORAGE_KEYS.CATEGORIES, []);
    priorities = Storage.load(STORAGE_KEYS.PRIORITIES, []);
    columns = Storage.load(STORAGE_KEYS.COLUMNS, []);
    schedules = Storage.load(STORAGE_KEYS.SCHEDULES, []);
    todos = Storage.load(STORAGE_KEYS.TODOS, []);
  };

  // ---- Categories ----
  const getCategories = () => categories;
  const getCategoryById = (id) => categories.find((c) => c.id === id) || { name: 'Tanpa Kategori', color: '#e0e3ec', repeatPattern: 'none' };
  const addCategory = (name, color, repeatPattern = 'none') => {
    const item = { id: Utils.generateId(), name, color, repeatPattern };
    categories.push(item);
    Storage.save(STORAGE_KEYS.CATEGORIES, categories);
    return item;
  };
  const updateCategory = (id, patch) => {
    const item = categories.find((c) => c.id === id);
    if (item) { Object.assign(item, patch); Storage.save(STORAGE_KEYS.CATEGORIES, categories); }
  };
  const deleteCategory = (id) => {
    categories = categories.filter((c) => c.id !== id);
    Storage.save(STORAGE_KEYS.CATEGORIES, categories);
  };

  // ---- Priorities ----
  const getPriorities = () => priorities;
  const getPriorityById = (id) => priorities.find((p) => p.id === id) || { name: 'Tanpa Prioritas', color: '#e0e3ec' };
  const addPriority = (name, color) => {
    const item = { id: Utils.generateId(), name, color };
    priorities.push(item);
    Storage.save(STORAGE_KEYS.PRIORITIES, priorities);
    return item;
  };
  const updatePriority = (id, patch) => {
    const item = priorities.find((p) => p.id === id);
    if (item) { Object.assign(item, patch); Storage.save(STORAGE_KEYS.PRIORITIES, priorities); }
  };
  const deletePriority = (id) => {
    priorities = priorities.filter((p) => p.id !== id);
    Storage.save(STORAGE_KEYS.PRIORITIES, priorities);
  };

  // ---- Custom Columns (khusus tabel Jadwal) ----
  const getColumns = () => columns;
  const addColumn = ({ label, type, options = [] }) => {
    const col = { id: Utils.generateId(), label, type, options };
    columns.push(col);
    Storage.save(STORAGE_KEYS.COLUMNS, columns);
    schedules.forEach((s) => {
      s.customFields = s.customFields || {};
      if (!(col.id in s.customFields)) s.customFields[col.id] = '';
    });
    Storage.save(STORAGE_KEYS.SCHEDULES, schedules);
    return col;
  };
  const deleteColumn = (id) => {
    columns = columns.filter((c) => c.id !== id);
    Storage.save(STORAGE_KEYS.COLUMNS, columns);
    schedules.forEach((s) => { if (s.customFields) delete s.customFields[id]; });
    Storage.save(STORAGE_KEYS.SCHEDULES, schedules);
  };

  // ---- Schedules ----
  const getSchedules = () => schedules;
  const addSchedule = (data = {}) => {
    const today = Utils.formatDateInput(new Date());
    const customFields = {};
    columns.forEach((c) => { customFields[c.id] = ''; });
    const item = {
      id: Utils.generateId(),
      description: '',
      date: today,
      startTime: '08:00',
      endTime: '09:00',
      categoryId: categories[0]?.id || '',
      priorityId: priorities[0]?.id || '',
      customFields,
      completed: false,
      repeatDaily: false,
      repeatType: 'none',
      ...data,
    };
    if (!data.repeatType) {
      const cat = categories.find((c) => c.id === item.categoryId);
      if (cat?.repeatPattern === 'daily' || cat?.repeatPattern === 'weekdays') item.repeatType = 'daily';
      else if (cat?.repeatPattern === 'weekly') item.repeatType = 'weekly';
      else item.repeatType = 'none';
    }
    item.repeatDaily = item.repeatType === 'daily';
    schedules.push(item);
    Storage.save(STORAGE_KEYS.SCHEDULES, schedules);
    return item;
  };
  const updateSchedule = (id, patch) => {
    const item = schedules.find((s) => s.id === id);
    if (!item) return;
    if (patch.customFields) {
      item.customFields = { ...item.customFields, ...patch.customFields };
      delete patch.customFields;
    }
    Object.assign(item, patch);
    item.repeatDaily = item.repeatType === 'daily';
    Storage.save(STORAGE_KEYS.SCHEDULES, schedules);
  };
  const deleteSchedule = (id) => {
    schedules = schedules.filter((s) => s.id !== id);
    Storage.save(STORAGE_KEYS.SCHEDULES, schedules);
  };

  // ---- Todos ----
  const getTodos = () => todos;
  const addTodo = (data = {}) => {
    const item = {
      id: Utils.generateId(),
      completed: false,
      categoryId: categories[0]?.id || '',
      priorityId: priorities[0]?.id || '',
      ...data,
    };
    todos.push(item);
    Storage.save(STORAGE_KEYS.TODOS, todos);
    return item;
  };
  const deleteTodo = (id) => {
    todos = todos.filter((t) => t.id !== id);
    Storage.save(STORAGE_KEYS.TODOS, todos);
  };
  const toggleTodo = (id) => {
    const item = todos.find((t) => t.id === id);
    if (item) { item.completed = !item.completed; Storage.save(STORAGE_KEYS.TODOS, todos); }
  };

  // ---- Reset ----
  const resetAll = () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  };

  return {
    init,
    getCategories, getCategoryById, addCategory, updateCategory, deleteCategory,
    getPriorities, getPriorityById, addPriority, updatePriority, deletePriority,
    getColumns, addColumn, deleteColumn,
    getSchedules, addSchedule, updateSchedule, deleteSchedule,
    getTodos, addTodo, deleteTodo, toggleTodo,
    resetAll,
  };
})();

/* ============================================================
 * GOOGLE CALENDAR LINK GENERATOR
 * ============================================================ */
export const GCalService = (() => {
  const toGCalDateTime = (dateStr, timeStr) =>
    `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`;

  const buildUrl = (schedule) => {
    const start = toGCalDateTime(schedule.date, schedule.startTime);
    const end = toGCalDateTime(schedule.date, schedule.endTime);
    const cat = State.getCategoryById(schedule.categoryId);
    const pri = State.getPriorityById(schedule.priorityId);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: schedule.description || '(Tanpa judul)',
      dates: `${start}/${end}`,
      details: `Kategori: ${cat.name} | Prioritas: ${pri.name}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return { buildUrl };
})();

/* ============================================================
 * CSV EXPORTER
 * ============================================================ */
export const CsvExporter = (() => {
  const escapeCsv = (value) => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const buildRows = () => {
    const columns = State.getColumns();
    const header = ['Tipe', 'Tanggal', 'Waktu', 'Nama', 'Kategori', 'Prioritas', 'Status', ...columns.map((c) => c.label)];
    const rows = [header];

    State.getSchedules().forEach((s) => {
      const cat = State.getCategoryById(s.categoryId);
      const pri = State.getPriorityById(s.priorityId);
      const customVals = columns.map((c) => s.customFields?.[c.id] ?? '');
      rows.push(['Jadwal', s.date, `${s.startTime}-${s.endTime}`, s.description, cat.name, pri.name, '-', ...customVals]);
    });

    State.getTodos().forEach((t) => {
      const cat = State.getCategoryById(t.categoryId);
      const pri = State.getPriorityById(t.priorityId);
      const blanks = columns.map(() => '');
      rows.push(['To-Do', t.date, '', t.name, cat.name, pri.name, t.completed ? 'Selesai' : 'Belum Selesai', ...blanks]);
    });

    return rows;
  };

  const exportToFile = () => {
    const rows = buildRows();
    const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dailytrack-export-${Utils.formatDateInput(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { exportToFile, buildRows };
})();

/* ============================================================
 * CUSTOM DIALOG (menggantikan alert / confirm bawaan)
 * ============================================================ */
let dialogResolve = null;

const createDialog = () => {
  const div = document.createElement('div');
  div.id = 'appDialog';
  div.className = 'modal-overlay';
  div.innerHTML = `
    <div class="modal modal-sm" role="dialog">
      <div class="modal-header">
        <h3 id="appDialogTitle">Konfirmasi</h3>
      </div>
      <div class="modal-body">
        <p id="appDialogMessage"></p>
      </div>
      <div class="modal-footer" id="appDialogFooter">
        <button id="appDialogCancel" class="btn btn-outline" style="display:none;">Batal</button>
        <button id="appDialogOk" class="btn btn-primary">OK</button>
      </div>
    </div>`;
  document.body.appendChild(div);

  div.addEventListener('click', (e) => {
    if (e.target === div) {
      if (dialogResolve) dialogResolve(false);
      div.classList.remove('active');
    }
  });
  document.getElementById('appDialogOk').addEventListener('click', () => {
    if (dialogResolve) dialogResolve(true);
    div.classList.remove('active');
  });
  document.getElementById('appDialogCancel').addEventListener('click', () => {
    if (dialogResolve) dialogResolve(false);
    div.classList.remove('active');
  });

  return div;
};

const getDialog = () => document.getElementById('appDialog') || createDialog();

export const showAlert = (message) => {
  const d = getDialog();
  document.getElementById('appDialogTitle').textContent = 'Perhatian';
  document.getElementById('appDialogMessage').textContent = message;
  document.getElementById('appDialogOk').style.display = '';
  document.getElementById('appDialogCancel').style.display = 'none';
  d.classList.add('active');
  return new Promise((resolve) => {
    dialogResolve = (val) => { resolve(val); dialogResolve = null; };
  });
};

export const showConfirm = (message) => {
  const d = getDialog();
  document.getElementById('appDialogTitle').textContent = 'Konfirmasi';
  document.getElementById('appDialogMessage').textContent = message;
  document.getElementById('appDialogOk').style.display = '';
  document.getElementById('appDialogCancel').style.display = '';
  document.getElementById('appDialogCancel').textContent = 'Batal';
  document.getElementById('appDialogOk').textContent = 'OK';
  d.classList.add('active');
  return new Promise((resolve) => {
    dialogResolve = (val) => { resolve(val); dialogResolve = null; };
  });
};

/* ============================================================
 * NAVBAR ACTIONS BERSAMA (Export & Reset) — dipakai semua halaman
 * ============================================================ */
export const initSharedNav = () => {
  const btnExport = document.getElementById('btnExportCsv');
  const btnReset = document.getElementById('btnReset');

  if (btnExport) btnExport.addEventListener('click', CsvExporter.exportToFile);

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      const ok = await showConfirm('Yakin ingin menghapus SELURUH data DailyTrack (Jadwal, To-Do, Kategori, Prioritas, Kolom)? Tindakan ini tidak bisa dibatalkan.');
      if (ok) {
        State.resetAll();
        location.reload();
      }
    });
  }
};