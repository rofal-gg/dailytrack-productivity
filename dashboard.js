// FILE: dashboard.js
import { State, Utils, initSharedNav, initSyncButton, initImportButton, initResetSyncButton } from './core.js';
import { GcalSync } from './gcal-sync.js';

const HOURS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`); // 06:00–22:00
const getHour = (timeStr) => parseInt(timeStr.split(':')[0], 10);
const inRange = (h) => h >= 6 && h <= 22;

let weekStart = Utils.getMonday(new Date());
let colorMode = 'category';

const matrixGrid = document.getElementById('matrixGrid');
const todoWeekGrid = document.getElementById('todoWeekGrid');
const weekLabel = document.getElementById('weekLabel');
const legendEl = document.getElementById('legend');

const getWeekDates = () => Array.from({ length: 7 }, (_, i) => Utils.addDays(weekStart, i));

const renderChip = (schedule) => {
  let color;
  if (colorMode === 'category') {
    color = State.getCategoryById(schedule.categoryId).color;
  } else {
    color = State.getPriorityById(schedule.priorityId).color;
  }
  return `<div class="matrix-chip" data-id="${schedule.id}" style="background:${color}; border-left-color:${color}; filter:brightness(0.97); cursor:pointer;" title="${Utils.escapeHtml(schedule.description)}">
    ${schedule.startTime} ${Utils.escapeHtml(schedule.description || '(Tanpa judul)')}
  </div>`;
};

const renderLegend = () => {
  const legendMode = document.querySelector('.color-mode-toggle .btn-toggle.active')?.textContent || 'Kategori';
  const groups = [];
  groups.push({ label: 'Kategori', items: State.getCategories() });
  groups.push({ label: 'Prioritas', items: State.getPriorities() });

  legendEl.innerHTML = groups.map((g) => `
    <span class="legend-group">
      <span class="legend-group-label">${g.label}:</span>
      ${g.items.map((item) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${item.color}"></span>${Utils.escapeHtml(item.name)}</span>`
      ).join('')}
    </span>
  `).join('');
};

const renderMatrix = () => {
  const weekDates = getWeekDates();
  const schedules = State.getSchedules();
  const weekStartStr = Utils.formatDateInput(weekStart);
  const weekEndStr = Utils.formatDateInput(Utils.addDays(weekStart, 6));

  // Header
  let html = `<div class="matrix-cell matrix-head-cell matrix-corner">Jam</div>`;
  weekDates.forEach((d) => {
    html += `<div class="matrix-cell matrix-head-cell">${Utils.DAY_NAMES_SHORT[d.getDay()]}<div class="day-date">${d.getDate()}/${d.getMonth() + 1}</div></div>`;
  });

  // Baris per jam
  HOURS.forEach((hourLabel) => {
    const hourNum = parseInt(hourLabel, 10);
    html += `<div class="matrix-cell matrix-time-cell">${hourLabel}</div>`;
    weekDates.forEach((d) => {
      const dateStr = Utils.formatDateInput(d);
      const items = schedules.filter((s) => {
        const rt = s.repeatType || (s.repeatDaily ? 'daily' : 'none');
        const dateMatch = s.date === dateStr;
        const isBeforeWeekEnd = s.date <= weekEndStr;
        const dayMatch = rt === 'weekly' && isBeforeWeekEnd && Utils.parseDateStr(s.date).getDay() === d.getDay();
        const dailyMatch = rt === 'daily' && isBeforeWeekEnd;
        return (dateMatch || dailyMatch || dayMatch) && getHour(s.startTime) === hourNum;
      });
      html += `<div class="matrix-cell">${items.map(renderChip).join('')}</div>`;
    });
  });

  // Baris "Lainnya" untuk jadwal di luar 06:00–22:00
  html += `<div class="matrix-cell matrix-time-cell">Lainnya</div>`;
  weekDates.forEach((d) => {
    const dateStr = Utils.formatDateInput(d);
    const items = schedules.filter((s) => {
      const rt = s.repeatType || (s.repeatDaily ? 'daily' : 'none');
      const dateMatch = s.date === dateStr;
      const isBeforeWeekEnd = s.date <= weekEndStr;
      const dayMatch = rt === 'weekly' && isBeforeWeekEnd && Utils.parseDateStr(s.date).getDay() === d.getDay();
      const dailyMatch = rt === 'daily' && isBeforeWeekEnd;
      return (dateMatch || dailyMatch || dayMatch) && !inRange(getHour(s.startTime));
    });
    html += `<div class="matrix-cell">${items.map(renderChip).join('')}</div>`;
  });

  matrixGrid.innerHTML = html;
};

const renderTodoWeek = () => {
  const weekDates = getWeekDates();
  const todos = State.getTodos();

  let html = `<div class="todo-week-label-cell">To-Do</div>`;
  weekDates.forEach((d) => {
    const dateStr = Utils.formatDateInput(d);
    const items = todos.filter((t) => t.date === dateStr);
    const itemsHtml = items.length
      ? items.map((t) => {
          const pri = State.getPriorityById(t.priorityId);
          return `
            <label class="todo-mini ${t.completed ? 'completed' : ''}" style="background:${pri.color}33; border-left-color:${pri.color};">
              <input type="checkbox" data-action="toggle-todo" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
              <span class="todo-mini-text">${Utils.escapeHtml(t.name)}</span>
            </label>`;
        }).join('')
      : `<span style="color:var(--color-text-muted); font-size:0.68rem;">-</span>`;
    html += `<div class="todo-week-cell">${itemsHtml}</div>`;
  });

  todoWeekGrid.innerHTML = html;
};

const renderWeekLabel = () => {
  weekLabel.textContent = Utils.formatWeekRangeLabel(weekStart);
};

const renderAll = () => {
  renderWeekLabel();
  renderLegend();
  renderMatrix();
  renderTodoWeek();
};

const setColorMode = (mode) => {
  colorMode = mode;
  document.getElementById('btnColorCategory').classList.toggle('active', mode === 'category');
  document.getElementById('btnColorPriority').classList.toggle('active', mode === 'priority');
  renderAll();
};

document.getElementById('btnColorCategory').addEventListener('click', () => setColorMode('category'));
document.getElementById('btnColorPriority').addEventListener('click', () => setColorMode('priority'));

todoWeekGrid.addEventListener('change', (e) => {
  const target = e.target.closest('[data-action="toggle-todo"]');
  if (!target) return;
  State.toggleTodo(target.dataset.id);
  renderTodoWeek();
});

document.getElementById('btnPrevWeek').addEventListener('click', () => {
  weekStart = Utils.addDays(weekStart, -7);
  renderAll();
});
document.getElementById('btnNextWeek').addEventListener('click', () => {
  weekStart = Utils.addDays(weekStart, 7);
  renderAll();
});
document.getElementById('btnThisWeek').addEventListener('click', () => {
  weekStart = Utils.getMonday(new Date());
  renderAll();
});

matrixGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.matrix-chip');
  if (!chip) return;
  const schedule = State.getSchedules().find((s) => s.id === chip.dataset.id);
  if (!schedule) return;
  const cat = State.getCategoryById(schedule.categoryId);
  const pri = State.getPriorityById(schedule.priorityId);
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-field"><span class="detail-label">Deskripsi</span><span class="detail-value">${Utils.escapeHtml(schedule.description || '(Tanpa judul)')}</span></div>
    <div class="detail-field"><span class="detail-label">Tanggal</span><span class="detail-value">${Utils.formatDateDisplay(schedule.date)}</span></div>
    <div class="detail-field"><span class="detail-label">Waktu</span><span class="detail-value">${schedule.startTime} – ${schedule.endTime}</span></div>
    <div class="detail-field"><span class="detail-label">Kategori</span><span class="detail-value"><span class="detail-swatch" style="background:${cat.color}"></span>${Utils.escapeHtml(cat.name)}</span></div>
    <div class="detail-field"><span class="detail-label">Prioritas</span><span class="detail-value"><span class="detail-swatch" style="background:${pri.color}"></span>${Utils.escapeHtml(pri.name)}</span></div>
  `;
  document.getElementById('modalDetail').classList.add('active');
});

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.closeModal).classList.remove('active'));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
});

document.addEventListener('DOMContentLoaded', () => {
  State.init();
  initSharedNav();
  initSyncButton(GcalSync);
  initImportButton(GcalSync);
  initResetSyncButton(GcalSync);
  renderAll();
});
