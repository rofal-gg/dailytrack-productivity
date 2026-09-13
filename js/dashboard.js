// FILE: dashboard.js
import { State, Utils, initSharedNav, initSyncButton, initImportButton, initResetSyncButton, setModalOpen } from './core.js';
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
const matrixMobile = document.getElementById('matrixMobile');

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

const renderMobileView = () => {
  if (window.innerWidth > 768) return;
  const weekDates = getWeekDates();
  const schedules = State.getSchedules();
  const weekEndStr = Utils.formatDateInput(Utils.addDays(weekStart, 6));
  let html = '';

  weekDates.forEach((d) => {
    const dateStr = Utils.formatDateInput(d);
    const dayName = Utils.DAY_NAMES[d.getDay()];
    const dateDisplay = `${d.getDate()}/${d.getMonth() + 1}`;

    let slotsHtml = '';
    HOURS.forEach((hourLabel) => {
      const hourNum = parseInt(hourLabel, 10);
      const items = schedules.filter((s) => {
        const rt = s.repeatType || (s.repeatDaily ? 'daily' : 'none');
        const dateMatch = s.date === dateStr;
        const isBeforeWeekEnd = s.date <= weekEndStr;
        const dayMatch = rt === 'weekly' && isBeforeWeekEnd && Utils.parseDateStr(s.date).getDay() === d.getDay();
        const dailyMatch = rt === 'daily' && isBeforeWeekEnd;
        return (dateMatch || dailyMatch || dayMatch) && getHour(s.startTime) === hourNum;
      });

      slotsHtml += `<div class="mobile-time-slot">
        <span class="mobile-time-label">${hourLabel}</span>
        <div class="mobile-chips">
          ${items.length ? items.map((s) => {
            const color = colorMode === 'category'
              ? State.getCategoryById(s.categoryId).color
              : State.getPriorityById(s.priorityId).color;
            return `<div class="mobile-chip" data-id="${s.id}" style="border-left-color:${color}; background:${color}22;">
              ${Utils.escapeHtml(s.description || '(Tanpa judul)')}
            </div>`;
          }).join('') : ''}
        </div>
      </div>`;
    });

    // "Lainnya" slot
    const otherItems = schedules.filter((s) => {
      const rt = s.repeatType || (s.repeatDaily ? 'daily' : 'none');
      const dateMatch = s.date === dateStr;
      const isBeforeWeekEnd = s.date <= weekEndStr;
      const dayMatch = rt === 'weekly' && isBeforeWeekEnd && Utils.parseDateStr(s.date).getDay() === d.getDay();
      const dailyMatch = rt === 'daily' && isBeforeWeekEnd;
      return (dateMatch || dailyMatch || dayMatch) && !inRange(getHour(s.startTime));
    });

    if (otherItems.length) {
      slotsHtml += `<div class="mobile-time-slot">
        <span class="mobile-time-label">Lainnya</span>
        <div class="mobile-chips">
          ${otherItems.map((s) => {
            const color = colorMode === 'category'
              ? State.getCategoryById(s.categoryId).color
              : State.getPriorityById(s.priorityId).color;
            return `<div class="mobile-chip" data-id="${s.id}" style="border-left-color:${color}; background:${color}22;">
              ${Utils.escapeHtml(s.description || '(Tanpa judul)')}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    html += `<div class="mobile-day-card">
      <div class="mobile-day-header">${dayName} <span class="mobile-day-date">${dateDisplay}</span></div>
      ${slotsHtml}
    </div>`;
  });

  matrixMobile.innerHTML = html;
};

const renderAll = () => {
  renderWeekLabel();
  renderLegend();
  renderMatrix();
  renderTodoWeek();
  renderMobileView();
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
  setModalOpen(true);
});

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => { document.getElementById(btn.dataset.closeModal).classList.remove('active'); setModalOpen(false); });
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.classList.remove('active'); setModalOpen(false); } });
});

matrixMobile.addEventListener('click', (e) => {
  const chip = e.target.closest('.mobile-chip');
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
  setModalOpen(true);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderMobileView(), 150);
});

(function initSwipeGesture() {
  const targets = document.querySelectorAll('.matrix-scroll, .matrix-mobile');
  let startX = 0;
  let startY = 0;

  targets.forEach((el) => {
    el.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) {
        document.getElementById('btnNextWeek').click();
      } else {
        document.getElementById('btnPrevWeek').click();
      }
    }, { passive: true });
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  State.init();
  initSharedNav();
  initSyncButton(GcalSync);
  initImportButton(GcalSync);
  initResetSyncButton(GcalSync);
  renderAll();
});
