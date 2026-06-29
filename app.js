(function () {
  'use strict';

  const STORAGE_KEY = 'studyTrackerData';

  const PRIORITY_COLORS = {
    alta: '#e05050',
    media: '#e08830',
    baixa: '#5080e0'
  };

  const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  function getCycleStartDate(weeks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonday = addDays(today, -getMondayBasedDow(today));
    return addDays(thisMonday, -(weeks - 1) * 7);
  }

  function buildDefaultWeekDays(weeks) {
    const weekDays = {};
    for (let w = 0; w < weeks; w++) {
      if (w === 0) {
        weekDays['0'] = [true, false, true, false, true, false, false];
      } else if (w === 1) {
        weekDays['1'] = [true, true, true, true, true, true, true];
      } else {
        weekDays[String(w)] = [false, false, false, false, false, false, false];
      }
    }
    return weekDays;
  }

  function buildDefaultHeatmap(weeks) {
    const heatmap = {};
    const start = getCycleStartDate(weeks);
    const weekDays = buildDefaultWeekDays(weeks);
    for (let w = 0; w < weeks; w++) {
      const days = weekDays[String(w)] || [];
      days.forEach((checked, d) => {
        if (checked) {
          const key = formatDateKey(addDays(start, w * 7 + d));
          heatmap[key] = w === 1 && d >= 5 ? 4 : (d % 2 === 0 ? 1 : 2);
        }
      });
    }
    return heatmap;
  }

  const DEFAULT_DATA = {
    title: '',
    subjects: [
      { id: 's1', name: 'Direito Constitucional', priority: 'alta' },
      { id: 's2', name: 'Direito Administrativo', priority: 'alta' },
      { id: 's3', name: 'Português', priority: 'media' },
      { id: 's4', name: 'Raciocínio Lógico', priority: 'baixa' }
    ],
    cycle: {
      weeks: 2,
      startDate: null,
      weekDays: null
    },
    heatmap: null,
    tasks: [
      { id: 't1', text: 'Direito Constitucional — art. 5º', done: false },
      { id: 't2', text: 'Português — interpretação de texto', done: false }
    ],
    pomodoro: {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15
    }
  };

  function initDefaultCycleData(data) {
    const weeks = data.cycle.weeks || 2;
    if (!data.cycle.startDate) {
      data.cycle.startDate = formatDateKey(getCycleStartDate(weeks));
    }
    if (!data.cycle.weekDays) {
      data.cycle.weekDays = buildDefaultWeekDays(weeks);
    }
    if (!data.heatmap) {
      data.heatmap = buildDefaultHeatmap(weeks);
    }
    return data;
  }

  function migrateCycleDatesIfNeeded() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const heatmapStart = addDays(today, -364);
    const cycleStart = parseDate(state.cycle.startDate);
    cycleStart.setHours(0, 0, 0, 0);
    const cycleEnd = addDays(cycleStart, state.cycle.weeks * 7 - 1);

    if (cycleEnd < heatmapStart || cycleStart > today) {
      state.cycle.startDate = formatDateKey(getCycleStartDate(state.cycle.weeks));
      syncHeatmapFromCycle(true);
      saveState();
    }
  }

  function syncHeatmapFromCycle(rebuild) {
    if (rebuild) {
      state.heatmap = {};
    }
    for (let w = 0; w < state.cycle.weeks; w++) {
      const days = (state.cycle.weekDays || {})[String(w)] || [];
      for (let d = 0; d < 7; d++) {
        const dateKey = formatDateKey(getWeekDate(w, d));
        if (days[d]) {
          if (!state.heatmap[dateKey] || state.heatmap[dateKey] < 1) {
            state.heatmap[dateKey] = 1;
          }
        } else if (rebuild) {
          delete state.heatmap[dateKey];
        }
      }
    }
  }

  function getDaySessionCount(date) {
    const key = formatDateKey(date);
    const heatmapCount = state.heatmap[key] || 0;
    if (heatmapCount > 0) return heatmapCount;
    return isDayCheckedInCycle(date) ? 1 : 0;
  }

  const isFirstLoad = !localStorage.getItem(STORAGE_KEY);
  let state = initDefaultCycleData(loadState());
  migrateCycleDatesIfNeeded();
  syncHeatmapFromCycle(false);
  let timerInterval = null;
  let timerRemaining = 0;
  let timerRunning = false;
  let currentMode = 'pomodoro';
  let expandedWeeks = new Set(isFirstLoad ? [0] : []);

  // ── Persistence ──────────────────────────────────────────

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return structuredClone(DEFAULT_DATA);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── Date helpers ─────────────────────────────────────────

  function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(date) {
    return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function getMondayBasedDow(date) {
    const dow = date.getDay();
    return dow === 0 ? 6 : dow - 1;
  }

  function getWeekDate(weekIndex, dayIndex) {
    const start = parseDate(state.cycle.startDate);
    return addDays(start, weekIndex * 7 + dayIndex);
  }

  function getIntensityLevel(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }

  // ── Stats ────────────────────────────────────────────────

  function countDaysDone() {
    let total = 0;
    const weekDays = state.cycle.weekDays || {};
    for (let w = 0; w < state.cycle.weeks; w++) {
      const days = weekDays[String(w)] || [false, false, false, false, false, false, false];
      total += days.filter(Boolean).length;
    }
    return total;
  }

  function calcProgress() {
    const expected = state.cycle.weeks * 7;
    if (expected === 0) return 0;
    return Math.round((countDaysDone() / expected) * 100);
  }

  function calcStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let d = new Date(today);

    while (true) {
      const key = formatDateKey(d);
      const sessions = state.heatmap[key] || 0;
      const hasStudy = sessions > 0 || isDayCheckedInCycle(d);
      if (!hasStudy) break;
      streak++;
      d = addDays(d, -1);
    }
    return streak;
  }

  function isDayCheckedInCycle(date) {
    const start = parseDate(state.cycle.startDate);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((date - start) / 86400000);
    if (diff < 0) return false;
    const weekIndex = Math.floor(diff / 7);
    const dayIndex = diff % 7;
    if (weekIndex >= state.cycle.weeks) return false;
    const days = (state.cycle.weekDays || {})[String(weekIndex)];
    return days ? days[dayIndex] : false;
  }

  function updateStats() {
    document.getElementById('stat-weeks').textContent = state.cycle.weeks;
    document.getElementById('stat-days').textContent = countDaysDone();
    const progress = calcProgress();
    const progressEl = document.getElementById('stat-progress');
    progressEl.textContent = progress + '%';
    progressEl.className = 'stat-value ' + (progress >= 80 ? 'stat-green' : 'stat-orange');
    document.getElementById('stat-streak').textContent = calcStreak() + 'd';
  }

  // ── Title ────────────────────────────────────────────────

  function renderTitle() {
    const input = document.getElementById('goal-title');
    input.value = state.title;
    input.addEventListener('input', () => {
      state.title = input.value;
      saveState();
    });
  }

  // ── Subjects ─────────────────────────────────────────────

  function renderSubjects() {
    const list = document.getElementById('subjects-list');
    document.getElementById('subjects-count').textContent = state.subjects.length;
    list.innerHTML = '';

    state.subjects.forEach(subject => {
      const li = document.createElement('li');
      li.className = `subject-item priority-${subject.priority}`;
      li.innerHTML = `
        <div class="subject-info">
          <span class="subject-name">${escapeHtml(subject.name)}</span>
          <span class="badge badge-${subject.priority}">${subject.priority}</span>
        </div>
        <button class="btn-remove-subject" data-id="${subject.id}" title="Remover">&times;</button>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll('.btn-remove-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.subjects = state.subjects.filter(s => s.id !== btn.dataset.id);
        saveState();
        renderSubjects();
      });
    });
  }

  function openSubjectModal() {
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-priority').value = 'media';
    document.getElementById('modal-subject').hidden = false;
    document.getElementById('subject-name').focus();
  }

  function closeSubjectModal() {
    document.getElementById('modal-subject').hidden = true;
  }

  function saveSubject() {
    const name = document.getElementById('subject-name').value.trim();
    if (!name) return;
    state.subjects.push({
      id: uid(),
      name,
      priority: document.getElementById('subject-priority').value
    });
    saveState();
    renderSubjects();
    closeSubjectModal();
  }

  // ── Heatmap ──────────────────────────────────────────────

  function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    container.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = today;
    const startDate = addDays(today, -364);

    // Semana atual à esquerda; semanas anteriores à direita
    const weeks = [];
    let weekStart = addDays(today, -getMondayBasedDow(today));

    for (let i = 0; i < 53; i++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(addDays(weekStart, d));
      }
      weeks.push(week);
      weekStart = addDays(weekStart, -7);
    }

    const monthsRow = document.createElement('div');
    monthsRow.className = 'heatmap-months';
    monthsRow.style.width = (weeks.length * 14) + 'px';

    let lastMonthKey = '';
    weeks.forEach((week, wi) => {
      const validDays = week.filter(d => {
        const n = new Date(d);
        n.setHours(0, 0, 0, 0);
        return n >= startDate && n <= endDate;
      });
      if (validDays.length === 0) return;

      const refDay = validDays.reduce((max, d) => {
        const nd = new Date(d);
        nd.setHours(0, 0, 0, 0);
        const mx = new Date(max);
        mx.setHours(0, 0, 0, 0);
        return nd > mx ? d : max;
      }, validDays[0]);

      const ref = new Date(refDay);
      ref.setHours(0, 0, 0, 0);
      const monthKey = `${ref.getFullYear()}-${ref.getMonth()}`;

      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        const label = document.createElement('span');
        label.className = 'heatmap-month-label';
        label.textContent = MONTH_LABELS[ref.getMonth()];
        label.style.left = (wi * 14) + 'px';
        monthsRow.appendChild(label);
      }
    });

    const body = document.createElement('div');
    body.className = 'heatmap-body';

    const daysLabels = document.createElement('div');
    daysLabels.className = 'heatmap-days-labels';
    for (let d = 0; d < 7; d++) {
      const label = document.createElement('div');
      label.className = 'heatmap-day-label';
      label.textContent = (d === 0 || d === 2 || d === 4) ? DAY_LABELS[d] : '';
      daysLabels.appendChild(label);
    }

    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';

    weeks.forEach(week => {
      const weekCol = document.createElement('div');
      weekCol.className = 'heatmap-week';

      week.forEach(date => {
        const cell = document.createElement('div');
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        if (normalized < startDate || normalized > endDate) {
          cell.className = 'heatmap-cell empty';
        } else {
          const count = getDaySessionCount(normalized);
          const level = getIntensityLevel(count);
          cell.className = `heatmap-cell level-${level}`;
          cell.dataset.date = formatDateKey(normalized);
          cell.dataset.count = count;

          cell.addEventListener('mouseenter', (e) => showTooltip(e, normalized, count));
          cell.addEventListener('mousemove', moveTooltip);
          cell.addEventListener('mouseleave', hideTooltip);
        }
        weekCol.appendChild(cell);
      });

      grid.appendChild(weekCol);
    });

    body.appendChild(daysLabels);
    body.appendChild(grid);

    container.appendChild(monthsRow);
    container.appendChild(body);
  }

  function showTooltip(e, date, count) {
    const tooltip = document.getElementById('heatmap-tooltip');
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const sessionWord = count === 1 ? 'sessão' : 'sessões';
    tooltip.textContent = `${dd}/${mm}/${yyyy} — ${count} ${sessionWord} de estudo`;
    tooltip.hidden = false;
    moveTooltip(e);
  }

  function moveTooltip(e) {
    const tooltip = document.getElementById('heatmap-tooltip');
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = (e.clientY - 8) + 'px';
  }

  function hideTooltip() {
    document.getElementById('heatmap-tooltip').hidden = true;
  }

  function updateHeatmapForDay(dateKey, delta) {
    const current = state.heatmap[dateKey] || 0;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      delete state.heatmap[dateKey];
    } else {
      state.heatmap[dateKey] = next;
    }
  }

  // ── Weeks ────────────────────────────────────────────────

  function renderWeeks() {
    const list = document.getElementById('weeks-list');
    list.innerHTML = '';
    document.getElementById('cycle-weeks').value = state.cycle.weeks;

    for (let w = 0; w < state.cycle.weeks; w++) {
      const weekStart = getWeekDate(w, 0);
      const weekEnd = getWeekDate(w, 6);
      const days = (state.cycle.weekDays || {})[String(w)] || [false, false, false, false, false, false, false];
      const daysDone = days.filter(Boolean).length;
      const isComplete = daysDone === 7;
      const isExpanded = expandedWeeks.has(w);
      const observations = (state.cycle.observations || {})[String(w)] || '';

      const card = document.createElement('div');
      card.className = 'week-card' + (isComplete ? ' complete' : '') + (isExpanded ? ' expanded' : '');

      card.innerHTML = `
        <div class="week-header" data-week="${w}">
          <div class="week-checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="week-info">
            <div class="week-title">Semana ${w + 1} (${formatDisplayDate(weekStart)} – ${formatDisplayDate(weekEnd)})</div>
            <div class="week-meta">
              <span class="week-days-count">${daysDone}/7 dias</span>
              <span class="badge ${isComplete ? 'badge-complete' : 'badge-progress'}">${isComplete ? 'Completa' : 'Em andamento'}</span>
            </div>
          </div>
          <svg class="week-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="week-body" data-week="${w}">
          <div class="week-days"></div>
          <textarea class="week-obs-input" placeholder="Adicionar observações..." data-week="${w}">${escapeHtml(observations)}</textarea>
        </div>
      `;

      const daysContainer = card.querySelector('.week-days');
      days.forEach((checked, d) => {
        const label = document.createElement('label');
        label.className = 'day-checkbox-label';
        label.innerHTML = `
          <input type="checkbox" data-week="${w}" data-day="${d}" ${checked ? 'checked' : ''}>
          ${DAY_LABELS[d]}
        `;
        daysContainer.appendChild(label);
      });

      list.appendChild(card);
    }

    list.querySelectorAll('.week-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.day-checkbox-label') || e.target.closest('.week-obs-input')) return;
        const w = Number(header.dataset.week);
        if (expandedWeeks.has(w)) {
          expandedWeeks.delete(w);
        } else {
          expandedWeeks.add(w);
        }
        renderWeeks();
      });
    });

    list.querySelectorAll('.day-checkbox-label input').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleDay(Number(cb.dataset.week), Number(cb.dataset.day), cb.checked);
      });
    });

    list.querySelectorAll('.week-obs-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const w = e.target.dataset.week;
        if (!state.cycle.observations) state.cycle.observations = {};
        state.cycle.observations[String(w)] = e.target.value;
        saveState();
      });
    });
  }

  function toggleDay(weekIndex, dayIndex, checked) {
    if (!state.cycle.weekDays) state.cycle.weekDays = {};
    if (!state.cycle.weekDays[String(weekIndex)]) {
      state.cycle.weekDays[String(weekIndex)] = [false, false, false, false, false, false, false];
    }

    const wasChecked = state.cycle.weekDays[String(weekIndex)][dayIndex];
    state.cycle.weekDays[String(weekIndex)][dayIndex] = checked;

    const date = getWeekDate(weekIndex, dayIndex);
    const dateKey = formatDateKey(date);

    if (checked && !wasChecked) {
      updateHeatmapForDay(dateKey, 1);
    } else if (!checked && wasChecked) {
      updateHeatmapForDay(dateKey, -1);
    }

    saveState();
    updateStats();
    renderHeatmap();
    renderWeeks();
  }

  function applyCycle() {
    const weeks = Math.max(1, Math.min(52, Number(document.getElementById('cycle-weeks').value) || 1));
    state.cycle.weeks = weeks;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    state.cycle.startDate = formatDateKey(today);

    if (!state.cycle.weekDays) state.cycle.weekDays = {};

    const existingKeys = Object.keys(state.cycle.weekDays).map(Number);
    existingKeys.forEach(k => {
      if (k >= weeks) {
        delete state.cycle.weekDays[String(k)];
      }
    });

    for (let w = 0; w < weeks; w++) {
      if (!state.cycle.weekDays[String(w)]) {
        state.cycle.weekDays[String(w)] = [false, false, false, false, false, false, false];
      }
    }

    syncHeatmapFromCycle(true);
    saveState();
    updateStats();
    renderHeatmap();
    renderWeeks();
  }

  // ── Tasks ────────────────────────────────────────────────

  function renderTasks() {
    const list = document.getElementById('tasks-list');
    list.innerHTML = '';

    state.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '');
      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
        <span class="task-text" data-id="${task.id}">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          <button class="btn-task-edit" data-id="${task.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-task-delete" data-id="${task.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const task = state.tasks.find(t => t.id === cb.dataset.id);
        if (task) {
          task.done = cb.checked;
          saveState();
          renderTasks();
        }
      });
    });

    list.querySelectorAll('.btn-task-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startEditTask(btn.dataset.id);
      });
    });

    list.querySelectorAll('.btn-task-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(btn.dataset.id);
      });
    });
  }

  function startEditTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const textEl = document.querySelector(`.task-text[data-id="${taskId}"]`);
    if (!textEl) return;

    const li = textEl.closest('.task-item');
    li.classList.add('editing');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.text;
    input.maxLength = 120;

    textEl.replaceWith(input);
    input.focus();
    input.select();

    function saveEdit() {
      const newText = input.value.trim();
      if (newText && newText !== task.text) {
        task.text = newText;
        saveState();
      }
      renderTasks();
    }

    function cancelEdit() {
      renderTasks();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });

    input.addEventListener('blur', () => {
      saveEdit();
    });
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveState();
    renderTasks();
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    state.tasks.push({ id: uid(), text: trimmed, done: false });
    saveState();
    renderTasks();
  }

  // ── Pomodoro ─────────────────────────────────────────────

  function getModeMinutes(mode) {
    const p = state.pomodoro;
    if (mode === 'shortBreak') return p.shortBreak;
    if (mode === 'longBreak') return p.longBreak;
    return p.pomodoro;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function updateTimerDisplay() {
    document.getElementById('timer-display').textContent = formatTime(timerRemaining);
  }

  function resetTimer() {
    stopTimer();
    timerRemaining = getModeMinutes(currentMode) * 60;
    updateTimerDisplay();
    updateTimerButton();
  }

  function stopTimer() {
    timerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateTimerButton();
  }

  function startTimer() {
    if (timerRunning) {
      stopTimer();
      return;
    }
    timerRunning = true;
    updateTimerButton();
    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        timerRemaining = 0;
        updateTimerDisplay();
        stopTimer();
        onTimerComplete();
      }
    }, 1000);
  }

  function updateTimerButton() {
    const btn = document.getElementById('btn-timer-toggle');
    const text = document.getElementById('timer-toggle-text');
    if (timerRunning) {
      btn.innerHTML = `
        <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span id="timer-toggle-text">Pausar</span>
      `;
    } else {
      btn.innerHTML = `
        <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span id="timer-toggle-text">Iniciar</span>
      `;
    }
  }

  function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    resetTimer();
  }

  function onTimerComplete() {
    playBeep();
    const labels = { pomodoro: 'Pomodoro', shortBreak: 'Pausa curta', longBreak: 'Pausa longa' };
    const msg = `${labels[currentMode]} finalizado!`;
    showToast(msg);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro', { body: msg });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') new Notification('Pomodoro', { body: msg });
      });
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) { /* ignore */ }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 4000);
  }

  function openPomodoroModal() {
    document.getElementById('setting-pomodoro').value = state.pomodoro.pomodoro;
    document.getElementById('setting-short').value = state.pomodoro.shortBreak;
    document.getElementById('setting-long').value = state.pomodoro.longBreak;
    document.getElementById('modal-pomodoro').hidden = false;
  }

  function closePomodoroModal() {
    document.getElementById('modal-pomodoro').hidden = true;
  }

  function savePomodoroSettings() {
    state.pomodoro.pomodoro = Math.max(1, Number(document.getElementById('setting-pomodoro').value) || 25);
    state.pomodoro.shortBreak = Math.max(1, Number(document.getElementById('setting-short').value) || 5);
    state.pomodoro.longBreak = Math.max(1, Number(document.getElementById('setting-long').value) || 15);
    saveState();
    closePomodoroModal();
    resetTimer();
  }

  // ── Utils ────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ─────────────────────────────────────────────────

  function init() {
    const savedTheme = localStorage.getItem('studyTrackerTheme');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    if (isFirstLoad) saveState();

    renderTitle();
    renderSubjects();
    updateStats();
    renderHeatmap();
    renderWeeks();
    renderTasks();
    resetTimer();

    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('studyTrackerTheme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('studyTrackerTheme', 'dark');
      }
    });

    document.getElementById('btn-add-subject').addEventListener('click', openSubjectModal);
    document.getElementById('btn-add-subject-header').addEventListener('click', openSubjectModal);
    document.getElementById('btn-subject-cancel').addEventListener('click', closeSubjectModal);
    document.getElementById('btn-subject-save').addEventListener('click', saveSubject);
    document.getElementById('modal-subject').addEventListener('click', (e) => {
      if (e.target.id === 'modal-subject') closeSubjectModal();
    });

    document.getElementById('btn-apply-cycle').addEventListener('click', applyCycle);
    document.getElementById('cycle-weeks').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCycle();
    });

    document.getElementById('btn-timer-toggle').addEventListener('click', startTimer);
    document.getElementById('btn-timer-reset').addEventListener('click', resetTimer);
    document.getElementById('btn-pomodoro-settings').addEventListener('click', openPomodoroModal);
    document.getElementById('btn-pomodoro-cancel').addEventListener('click', closePomodoroModal);
    document.getElementById('btn-pomodoro-save').addEventListener('click', savePomodoroSettings);
    document.getElementById('modal-pomodoro').addEventListener('click', (e) => {
      if (e.target.id === 'modal-pomodoro') closePomodoroModal();
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    const taskInput = document.getElementById('task-input');
    taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTask(taskInput.value);
        taskInput.value = '';
      } else if (e.key === 'Escape') {
        taskInput.value = '';
        taskInput.blur();
      }
    });

    document.getElementById('btn-task-confirm').addEventListener('click', () => {
      addTask(taskInput.value);
      taskInput.value = '';
      taskInput.focus();
    });

    document.getElementById('btn-task-cancel').addEventListener('click', () => {
      taskInput.value = '';
      taskInput.focus();
    });

    document.getElementById('btn-add-task-header').addEventListener('click', () => {
      taskInput.focus();
    });

    document.getElementById('subject-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveSubject();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSubjectModal();
        closePomodoroModal();
      }
    });
  }

  init();
})();
