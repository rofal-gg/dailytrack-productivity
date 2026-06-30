// FILE: todo.js
import { State, Utils, initSharedNav, initSyncButton, initImportButton, showConfirm } from './core.js';
import { GcalSync } from './gcal-sync.js';

const todoListEl = document.getElementById('todoList');
const todoPrioritySelect = document.getElementById('todoPriority');
const progressBarFill = document.getElementById('progressBarFill');
const progressLabel = document.getElementById('progressLabel');
const progressFraction = document.getElementById('progressFraction');

const groupByDate = (items) =>
  items.reduce((acc, item) => { (acc[item.date] = acc[item.date] || []).push(item); return acc; }, {});

const renderSelectOptions = () => {
  todoPrioritySelect.innerHTML = State.getPriorities()
    .map((p) => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('')
    || '<option value="">Belum ada prioritas</option>';
};

const renderTodoCard = (item) => {
  const pri = State.getPriorityById(item.priorityId);
  const syncStatus = GcalSync.getSyncStatus(item.id);
  const isSynced = syncStatus && !syncStatus.dirty;
  const syncBadge = isSynced
    ? `<span class="sync-badge synced" title="Tersinkron ${new Date(syncStatus.syncedAt).toLocaleString('id-ID')}">✓</span> `
    : `<span class="sync-badge unsynced" title="Belum disinkronkan">○</span> `;
  return `
    <article class="todo-card ${item.completed ? 'completed' : ''}" style="background:${pri.color}33; border-left-color:${pri.color};" data-id="${item.id}">
      <label class="todo-checkbox-wrapper">
        <input type="checkbox" class="todo-checkbox" data-action="toggle-todo" data-id="${item.id}" ${item.completed ? 'checked' : ''}>
        <span class="custom-checkbox"></span>
      </label>
      <div class="card-body">
        <h4 class="card-title">${Utils.escapeHtml(item.name)}</h4>
        <div class="card-meta">
          <span class="badge card-date-badge">${Utils.formatDateDisplay(item.date)}</span>
          <span class="badge" style="background:${pri.color};">${Utils.escapeHtml(pri.name)}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        ${syncBadge}
        <button type="button" class="btn-action btn-delete" data-action="delete-todo" data-id="${item.id}">Hapus</button>
      </div>
    </article>
  `;
};

const updateProgressBar = (todos) => {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressBarFill.style.width = `${percent}%`;
  progressLabel.textContent = `${percent}% Selesai`;
  progressFraction.textContent = `${completed}/${total}`;
};

const renderTodos = () => {
  const allTodos = [...State.getTodos()].sort((a, b) => a.date.localeCompare(b.date));
  updateProgressBar(allTodos);

  if (allTodos.length === 0) {
    todoListEl.innerHTML = '<p class="empty-state">Belum ada To-Do. Klik "+ Tambah To-Do" untuk mulai.</p>';
    return;
  }

  const activeTodos = allTodos.filter((t) => !t.completed);
  const completedTodos = allTodos.filter((t) => t.completed);

  let html = '';

  if (activeTodos.length) {
    const grouped = groupByDate(activeTodos);
    Object.keys(grouped).sort().forEach((dateKey) => {
      html += `<h3 class="date-group-header">${Utils.formatDateDisplay(dateKey)}</h3>
        <div class="item-list">${grouped[dateKey].map(renderTodoCard).join('')}</div>`;
    });
  }

  if (completedTodos.length) {
    html += `<h3 class="date-group-header riwayat-header">&#x1F4DA; Riwayat (${completedTodos.length})</h3>
      <div class="item-list">${completedTodos.map(renderTodoCard).join('')}</div>`;
  }

  todoListEl.innerHTML = html;
};

todoListEl.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === 'toggle-todo') { State.toggleTodo(id); GcalSync.markDirty(id); renderTodos(); }
  if (action === 'delete-todo') {
    (async () => {
      const ok = await showConfirm('Hapus to-do ini?');
      if (ok) { State.deleteTodo(id); renderTodos(); }
    })();
  }
});

document.getElementById('btnAddTodo').addEventListener('click', () => {
  renderSelectOptions();
  document.getElementById('formTodo').reset();
  document.getElementById('todoDate').value = Utils.formatDateInput(new Date());
  document.getElementById('modalTodo').classList.add('active');
});

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.closeModal).classList.remove('active'));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
});

document.getElementById('formTodo').addEventListener('submit', (e) => {
  e.preventDefault();
  State.addTodo({
    name: document.getElementById('todoName').value.trim(),
    date: document.getElementById('todoDate').value,
    priorityId: document.getElementById('todoPriority').value,
  });
  renderTodos();
  document.getElementById('modalTodo').classList.remove('active');
});

document.addEventListener('DOMContentLoaded', () => {
  State.init();
  initSharedNav();
  initSyncButton(GcalSync);
  initImportButton(GcalSync);
  renderSelectOptions();
  renderTodos();
});
