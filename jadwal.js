// FILE: jadwal.js
import { State, Utils, GCalService, initSharedNav, initSyncButton, initImportButton, showConfirm, showAlert } from './core.js';
import { GcalSync } from './gcal-sync.js';

const thead = document.getElementById('jadwalThead');
const tbody = document.getElementById('jadwalTbody');

let pendingDropdownOptions = [];
let editingScheduleId = null;

/* ---------------- Render Table ---------------- */
const renderThead = () => {
  const columns = State.getColumns();
  const customTh = columns.map((col) => `
    <th class="col-header-custom">
      <span>${Utils.escapeHtml(col.label)}</span>
      <button type="button" class="btn-icon-delete" data-action="delete-column" data-id="${col.id}" title="Hapus kolom">&times;</button>
    </th>
  `).join('');

  thead.innerHTML = `
    <tr>
      <th>Deskripsi</th>
      <th>Tanggal</th>
      <th>Mulai</th>
      <th>Selesai</th>
      <th>Kategori</th>
      <th>Prioritas</th>
      ${customTh}
      <th>Aksi</th>
    </tr>
  `;
};

const buildCustomCells = (schedule, columns) =>
  columns.map((col) => {
    const val = schedule.customFields?.[col.id] ?? '';
    return `<td class="td-text">${Utils.escapeHtml(val) || '-'}</td>`;
  }).join('');

const buildRowHTML = (schedule, columns) => {
  const cat = State.getCategoryById(schedule.categoryId);
  const pri = State.getPriorityById(schedule.priorityId);

  let dateCell;
  const rt = schedule.repeatType || (schedule.repeatDaily ? 'daily' : 'none');
  if (rt === 'daily') {
    dateCell = `<td><span class="repeat-daily-label">Setiap Hari</span></td>`;
  } else if (rt === 'weekly') {
    const dayName = Utils.DAY_NAMES[Utils.parseDateStr(schedule.date).getDay()];
    dateCell = `<td><span class="repeat-weekly-label">Setiap ${dayName}</span></td>`;
  } else {
    dateCell = `<td class="td-text">${Utils.formatDateDisplay(schedule.date)}</td>`;
  }

  const isRecurring = rt === 'daily' || rt === 'weekly';
  const isCompleted = schedule.completed;
  const syncStatus = GcalSync.getSyncStatus(schedule.id);
  const isSynced = syncStatus && !syncStatus.dirty;
  const syncBadge = isSynced
    ? `<span class="sync-badge synced" title="Tersinkron ${new Date(syncStatus.syncedAt).toLocaleString('id-ID')}">✓</span> `
    : `<span class="sync-badge unsynced" title="Belum disinkronkan">○</span> `;
  const actions = isCompleted
    ? `${syncBadge}<button type="button" class="btn-action btn-edit" data-action="restore-row" data-id="${schedule.id}">Pulihkan</button>
       <button type="button" class="btn-action btn-delete" data-action="delete-row" data-id="${schedule.id}">Hapus</button>`
    : `${syncBadge}<button type="button" class="btn-action btn-edit" data-action="edit-row" data-id="${schedule.id}">Edit</button>
       ${isRecurring ? '' : `<button type="button" class="btn-action btn-success" data-action="complete-row" data-id="${schedule.id}">Selesai</button>`}
       <button type="button" class="btn-action btn-gcal" data-action="gcal" data-id="${schedule.id}">G-Cal</button>
       <button type="button" class="btn-action btn-delete" data-action="delete-row" data-id="${schedule.id}">Hapus</button>`;

  return `
    <tr data-row-id="${schedule.id}" class="${isCompleted ? 'row-completed' : ''}">
      <td class="td-text td-desc">${Utils.escapeHtml(schedule.description) || '-'}</td>
      ${dateCell}
      <td class="td-text">${schedule.startTime}</td>
      <td class="td-text">${schedule.endTime}</td>
      <td><span class="badge" style="background:${cat.color};">${Utils.escapeHtml(cat.name)}</span></td>
      <td><span class="badge" style="background:${pri.color};">${Utils.escapeHtml(pri.name)}</span></td>
      ${buildCustomCells(schedule, columns)}
      <td class="action-cell">${actions}</td>
    </tr>
  `;
};

const renderTable = () => {
  renderThead();
  const columns = State.getColumns();
  const allSchedules = [...State.getSchedules()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const active = allSchedules.filter((s) => !s.completed);
  const completed = allSchedules.filter((s) => s.completed);
  const colspan = 7 + columns.length;

  let html = '';
  if (active.length) {
    html += active.map((s) => buildRowHTML(s, columns)).join('');
  }
  if (completed.length) {
    html += `<tr class="riwayat-heading"><td colspan="${colspan}"><span class="riwayat-icon">&#x1F4DA;</span> Riwayat (${completed.length})</td></tr>`;
    html += completed.map((s) => buildRowHTML(s, columns)).join('');
  }
  if (!active.length && !completed.length) {
    html = `<tr><td colspan="${colspan}" class="empty-state">Belum ada jadwal. Klik "+ Tambah Baris" untuk mulai mengisi.</td></tr>`;
  }

  tbody.innerHTML = html;
};

/* ---------------- Modal: Tambah/Edit Jadwal ---------------- */
const jadwalName = document.getElementById('jadwalName');
const jadwalDate = document.getElementById('jadwalDate');
const jadwalStart = document.getElementById('jadwalStart');
const jadwalEnd = document.getElementById('jadwalEnd');
const jadwalCategory = document.getElementById('jadwalCategory');
const jadwalPriority = document.getElementById('jadwalPriority');

const setRepeatType = (value) => {
  document.querySelectorAll('input[name="repeatType"]').forEach((el) => {
    el.checked = el.value === value;
  });
};

const patternToRepeatType = (pattern) => {
  if (pattern === 'daily' || pattern === 'weekdays') return 'daily';
  if (pattern === 'weekly') return 'weekly';
  return 'none';
};

const applyCategoryPattern = () => {
  const catId = jadwalCategory.value;
  const cat = State.getCategoryById(catId);
  if (cat && cat.repeatPattern) {
    setRepeatType(patternToRepeatType(cat.repeatPattern));
  }
};

const openJadwalModal = (scheduleId) => {
  editingScheduleId = scheduleId;
  const title = document.getElementById('modalJadwalTitle');

  jadwalCategory.innerHTML = State.getCategories()
    .map((c) => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join('')
    || '<option value="">Belum ada kategori</option>';
  jadwalPriority.innerHTML = State.getPriorities()
    .map((p) => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('')
    || '<option value="">Belum ada prioritas</option>';

  if (scheduleId) {
    title.textContent = 'Edit Jadwal';
    const s = State.getSchedules().find((item) => item.id === scheduleId);
    if (s) {
      jadwalName.value = s.description;
      jadwalDate.value = s.date;
      jadwalStart.value = s.startTime;
      jadwalEnd.value = s.endTime;
      jadwalCategory.value = s.categoryId;
      jadwalPriority.value = s.priorityId;
      setRepeatType(s.repeatType || (s.repeatDaily ? 'daily' : 'none'));
    }
  } else {
    title.textContent = 'Tambah Jadwal';
    jadwalName.value = '';
    jadwalDate.value = Utils.formatDateInput(new Date());
    jadwalStart.value = '08:00';
    jadwalEnd.value = '09:00';
    const defaultCat = State.getCategories()[0]?.id || '';
    jadwalCategory.value = defaultCat;
    jadwalPriority.value = State.getPriorities()[0]?.id || '';
    applyCategoryPattern();
  }

  ModalController.open('modalJadwal');
};

jadwalCategory.addEventListener('change', applyCategoryPattern);

document.getElementById('formJadwal').addEventListener('submit', (e) => {
  e.preventDefault();
  const repeatType = document.querySelector('input[name="repeatType"]:checked')?.value || 'none';
  const data = {
    description: jadwalName.value.trim(),
    date: jadwalDate.value,
    startTime: jadwalStart.value,
    endTime: jadwalEnd.value,
    categoryId: jadwalCategory.value,
    priorityId: jadwalPriority.value,
    repeatType,
  };

  if (editingScheduleId) {
    State.updateSchedule(editingScheduleId, data);
    GcalSync.markDirty(editingScheduleId);
  } else {
    State.addSchedule(data);
  }

  ModalController.close('modalJadwal');
  renderTable();
});

/* ---------------- Inline Editing ---------------- */
const handleCellEdit = (e) => {
  const target = e.target;
  if (!target.classList.contains('cell-input')) return;
  const { id, field } = target.dataset;
  const value = target.value;

  if (field.startsWith('custom:')) {
    const colId = field.split(':')[1];
    State.updateSchedule(id, { customFields: { [colId]: value } });
    return;
  }

  State.updateSchedule(id, { [field]: value });

  if (field === 'categoryId') {
    renderTable();
    return;
  }
  if (field === 'priorityId') target.style.backgroundColor = State.getPriorityById(value).color;
};

/* ---------------- Table Actions (via delegation) ---------------- */
tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'edit-row') {
    openJadwalModal(id);
  }
  if (action === 'complete-row') {
    State.updateSchedule(id, { completed: true });
    GcalSync.markDirty(id);
    renderTable();
  }
  if (action === 'restore-row') {
    State.updateSchedule(id, { completed: false });
    GcalSync.markDirty(id);
    renderTable();
  }
  if (action === 'delete-row') {
    const ok = await showConfirm('Hapus baris jadwal ini?');
    if (ok) {
      State.deleteSchedule(id);
      renderTable();
    }
  }
  if (action === 'gcal') {
    const schedule = State.getSchedules().find((s) => s.id === id);
    if (schedule) window.open(GCalService.buildUrl(schedule), '_blank');
  }
});

thead.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action="delete-column"]');
  if (!btn) return;
  const ok = await showConfirm('Hapus kolom ini? Data pada kolom ini di semua baris akan hilang.');
  if (ok) {
    State.deleteColumn(btn.dataset.id);
    renderTable();
  }
});

document.getElementById('btnAddRow').addEventListener('click', () => openJadwalModal(null));
document.getElementById('btnAddColumn').addEventListener('click', () => openAddColumnModal());

/* ---------------- Modal: Tambah Kolom ---------------- */
const columnTypeSelect = document.getElementById('columnType');
const dropdownGroup = document.getElementById('dropdownOptionsGroup');
const dropdownOptionInput = document.getElementById('dropdownOptionInput');
const dropdownOptionsList = document.getElementById('dropdownOptionsList');

const openAddColumnModal = () => {
  document.getElementById('formAddColumn').reset();
  pendingDropdownOptions = [];
  dropdownGroup.style.display = 'none';
  renderDropdownChips();
  ModalController.open('modalAddColumn');
};

const renderDropdownChips = () => {
  dropdownOptionsList.innerHTML = pendingDropdownOptions.map((opt, idx) => `
    <span class="chip">${Utils.escapeHtml(opt)} <button type="button" data-idx="${idx}">&times;</button></span>
  `).join('');
};

columnTypeSelect.addEventListener('change', () => {
  dropdownGroup.style.display = columnTypeSelect.value === 'dropdown' ? 'block' : 'none';
});

document.getElementById('btnAddOption').addEventListener('click', () => {
  const val = dropdownOptionInput.value.trim();
  if (!val) return;
  pendingDropdownOptions.push(val);
  dropdownOptionInput.value = '';
  renderDropdownChips();
});

dropdownOptionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddOption').click(); }
});

dropdownOptionsList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-idx]');
  if (!btn) return;
  pendingDropdownOptions.splice(Number(btn.dataset.idx), 1);
  renderDropdownChips();
});

document.getElementById('formAddColumn').addEventListener('submit', (e) => {
  e.preventDefault();
  const label = document.getElementById('columnLabel').value.trim();
  const type = columnTypeSelect.value;

  if (type === 'dropdown' && pendingDropdownOptions.length === 0) {
    showAlert('Tambahkan minimal satu pilihan untuk tipe Dropdown.');
    return;
  }

  State.addColumn({ label, type, options: [...pendingDropdownOptions] });
  renderTable();
  ModalController.close('modalAddColumn');
});

/* ---------------- Modal: Kelola Kategori & Prioritas ---------------- */
const ModalController = {
  open: (id) => document.getElementById(id).classList.add('active'),
  close: (id) => document.getElementById(id).classList.remove('active'),
};

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => ModalController.close(btn.dataset.closeModal));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
});

const patternLabels = {
  none: 'Tidak berulang', daily: 'Harian', weekly: 'Mingguan', weekdays: 'Setiap hari kerja',
};

const renderCategoryList = () => {
  const list = document.getElementById('categoryList');
  const categories = State.getCategories();
  list.innerHTML = categories.length
    ? categories.map((c) => `
        <li class="manage-item" data-id="${c.id}">
          <input type="color" data-id="${c.id}" data-action="recolor-category" value="${c.color}">
          <span class="manage-name">${Utils.escapeHtml(c.name)}</span>
          <span class="manage-pattern">${patternLabels[c.repeatPattern] || ''}</span>
          <button type="button" class="btn-icon-delete" data-action="delete-category" data-id="${c.id}">&times;</button>
        </li>`).join('')
    : '<li class="empty-state">Belum ada kategori.</li>';
};

const renderPriorityList = () => {
  const list = document.getElementById('priorityList');
  const priorities = State.getPriorities();
  list.innerHTML = priorities.length
    ? priorities.map((p) => `
        <li class="manage-item" data-id="${p.id}">
          <input type="color" data-id="${p.id}" data-action="recolor-priority" value="${p.color}">
          <span class="manage-name">${Utils.escapeHtml(p.name)}</span>
          <button type="button" class="btn-icon-delete" data-action="delete-priority" data-id="${p.id}">&times;</button>
        </li>`).join('')
    : '<li class="empty-state">Belum ada prioritas.</li>';
};

document.getElementById('btnManageCategories').addEventListener('click', () => {
  renderCategoryList();
  ModalController.open('modalCategory');
});
document.getElementById('btnManagePriorities').addEventListener('click', () => {
  renderPriorityList();
  ModalController.open('modalPriority');
});

document.getElementById('formCategory').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('categoryNameInput').value.trim();
  const color = document.getElementById('categoryColorInput').value;
  const repeatPattern = document.getElementById('categoryRepeat').value;
  if (!name) return;
  State.addCategory(name, color, repeatPattern);
  document.getElementById('categoryNameInput').value = '';
  document.getElementById('categoryRepeat').value = 'none';
  renderCategoryList();
  renderTable();
});

document.getElementById('formPriority').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('priorityNameInput').value.trim();
  const color = document.getElementById('priorityColorInput').value;
  if (!name) return;
  State.addPriority(name, color);
  document.getElementById('priorityNameInput').value = '';
  renderPriorityList();
  renderTable();
});

document.getElementById('categoryList').addEventListener('input', (e) => {
  const target = e.target.closest('[data-action="recolor-category"]');
  if (!target) return;
  State.updateCategory(target.dataset.id, { color: target.value });
  renderTable();
});
document.getElementById('categoryList').addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action="delete-category"]');
  if (!target) return;
  const ok = await showConfirm('Hapus kategori ini?');
  if (ok) {
    State.deleteCategory(target.dataset.id);
    renderCategoryList();
    renderTable();
  }
});

document.getElementById('priorityList').addEventListener('input', (e) => {
  const target = e.target.closest('[data-action="recolor-priority"]');
  if (!target) return;
  State.updatePriority(target.dataset.id, { color: target.value });
  renderTable();
});
document.getElementById('priorityList').addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action="delete-priority"]');
  if (!target) return;
  const ok = await showConfirm('Hapus prioritas ini?');
  if (ok) {
    State.deletePriority(target.dataset.id);
    renderPriorityList();
    renderTable();
  }
});

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  State.init();
  initSharedNav();
  initSyncButton(GcalSync);
  initImportButton(GcalSync);
  renderTable();
});
