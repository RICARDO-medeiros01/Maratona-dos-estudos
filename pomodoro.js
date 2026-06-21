(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ── Durations (seconds) ──
  const DURATIONS = { pomodoro: 25 * 60, short: 5 * 60, long: 15 * 60 };

  // ── State ──
  let pomoState = {
    mode: "pomodoro",
    timeLeft: DURATIONS.pomodoro,
    running: false,
    tasks: [],
    activeTaskIdx: 0,
    pomosCompleted: 0
  };
  let timerInterval = null;

  // ── localStorage ──
  function loadPomo() {
    try {
      const s = localStorage.getItem("constancia_pomodoro");
      if (s) {
        const saved = JSON.parse(s);
        pomoState.tasks = saved.tasks || [];
        pomoState.activeTaskIdx = saved.activeTaskIdx || 0;
        pomoState.pomosCompleted = saved.pomosCompleted || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function savePomo() {
    localStorage.setItem("constancia_pomodoro", JSON.stringify({
      tasks: pomoState.tasks,
      activeTaskIdx: pomoState.activeTaskIdx,
      pomosCompleted: pomoState.pomosCompleted
    }));
  }

  // ── Format ──
  function fmtTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  // ── Timer logic ──
  function startTimer() {
    if (pomoState.running) return;
    pomoState.running = true;
    $("#pomoStartBtn").textContent = "Pausar";
    timerInterval = setInterval(() => {
      pomoState.timeLeft--;
      updateDisplay();
      if (pomoState.timeLeft <= 0) {
        stopTimer();
        onTimerDone();
      }
    }, 1000);
  }

  function pauseTimer() {
    pomoState.running = false;
    $("#pomoStartBtn").textContent = "Continuar";
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function stopTimer() {
    pomoState.running = false;
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetTimer() {
    stopTimer();
    pomoState.timeLeft = DURATIONS[pomoState.mode];
    $("#pomoStartBtn").textContent = "Iniciar";
    updateDisplay();
  }

  function onTimerDone() {
    // Play notification sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 830;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      }, 350);
    } catch (e) { /* audio not available */ }

    if (pomoState.mode === "pomodoro") {
      pomoState.pomosCompleted++;
      // Increment active task pomo count
      const task = pomoState.tasks[pomoState.activeTaskIdx];
      if (task) task.done++;
      savePomo();
    }

    // Auto switch mode
    if (pomoState.mode === "pomodoro") {
      const shouldLong = pomoState.pomosCompleted % 4 === 0;
      setMode(shouldLong ? "long" : "short");
    } else {
      setMode("pomodoro");
    }

    $("#pomoStartBtn").textContent = "Iniciar";
    renderPomo();
  }

  function setMode(mode) {
    pomoState.mode = mode;
    pomoState.timeLeft = DURATIONS[mode];
    pomoState.running = false;
    clearInterval(timerInterval);
    timerInterval = null;

    document.querySelectorAll(".pomo-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.mode === mode);
    });

    $("#pomoStartBtn").textContent = "Iniciar";
    updateDisplay();
  }

  function updateDisplay() {
    $("#pomoDisplay").textContent = fmtTime(pomoState.timeLeft);
  }

  // ── Task management ──
  function addTask(name) {
    pomoState.tasks.push({ name, target: 1, done: 0, completed: false });
    if (pomoState.tasks.length === 1) pomoState.activeTaskIdx = 0;
    savePomo();
    renderPomo();
  }

  function removeTask(idx) {
    pomoState.tasks.splice(idx, 1);
    if (pomoState.activeTaskIdx >= pomoState.tasks.length) {
      pomoState.activeTaskIdx = Math.max(0, pomoState.tasks.length - 1);
    }
    savePomo();
    renderPomo();
  }

  function toggleTaskDone(idx) {
    const task = pomoState.tasks[idx];
    task.completed = !task.completed;
    // Move to next incomplete task if this was active
    if (task.completed && idx === pomoState.activeTaskIdx) {
      const next = pomoState.tasks.findIndex((t, i) => i > idx && !t.completed);
      if (next !== -1) pomoState.activeTaskIdx = next;
    }
    savePomo();
    renderPomo();
  }

  function selectTask(idx) {
    pomoState.activeTaskIdx = idx;
    savePomo();
    renderPomo();
  }

  // ── Render ──
  function renderPomo() {
    const tasks = pomoState.tasks;
    const active = tasks[pomoState.activeTaskIdx];

    // Task label
    $("#pomoTaskLabel").textContent = active ? `#${pomoState.activeTaskIdx + 1}` : "#1";
    $("#pomoTaskName").textContent = active ? active.name : "—";

    // Task list
    const list = $("#pomoTaskList");
    list.innerHTML = "";

    tasks.forEach((t, i) => {
      const item = document.createElement("div");
      item.className = "pomo-task-item";
      if (i === pomoState.activeTaskIdx) item.classList.add("active-task");
      if (t.completed) item.classList.add("task-done");

      const checkSVG = `<svg viewBox="0 0 14 14"><polyline points="3,7 6,10 11,4"/></svg>`;

      item.innerHTML = `
        <div class="pomo-task-check ${t.completed ? 'done' : ''}">${checkSVG}</div>
        <span class="pomo-task-text">${escH(t.name)}</span>
        <span class="pomo-task-pomos">${t.done}/${t.target}</span>
        <div style="position:relative">
          <button class="pomo-task-menu" title="Opções">⋮</button>
          <div class="pomo-dropdown">
            <button data-action="select">Selecionar</button>
            <button data-action="incr">+ Pomodoro alvo</button>
            <button data-action="decr">− Pomodoro alvo</button>
            <button data-action="remove" class="danger">Remover</button>
          </div>
        </div>`;

      // Check click
      item.querySelector(".pomo-task-check").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaskDone(i);
      });

      // Menu toggle
      const menuBtn = item.querySelector(".pomo-task-menu");
      const dropdown = item.querySelector(".pomo-dropdown");

      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Close all others
        document.querySelectorAll(".pomo-dropdown.open").forEach(d => {
          if (d !== dropdown) d.classList.remove("open");
        });
        dropdown.classList.toggle("open");
      });

      // Dropdown actions
      dropdown.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.remove("open");
          const action = btn.dataset.action;
          if (action === "select") selectTask(i);
          else if (action === "incr") { t.target++; savePomo(); renderPomo(); }
          else if (action === "decr") { t.target = Math.max(1, t.target - 1); savePomo(); renderPomo(); }
          else if (action === "remove") removeTask(i);
        });
      });

      // Click row to select
      item.addEventListener("click", () => selectTask(i));

      list.appendChild(item);
    });

    // Footer
    const totalPomos = tasks.reduce((s, t) => s + t.target, 0);
    const donePomos = tasks.reduce((s, t) => s + t.done, 0);
    $("#pomoDoneCount").textContent = donePomos;
    $("#pomoTotalCount").textContent = totalPomos;

    // Estimated finish
    const remaining = totalPomos - donePomos;
    if (remaining > 0) {
      const minsLeft = remaining * 25 + (remaining - 1) * 5;
      const finish = new Date(Date.now() + minsLeft * 60000);
      const h = String(finish.getHours()).padStart(2, "0");
      const m = String(finish.getMinutes()).padStart(2, "0");
      const hrs = (minsLeft / 60).toFixed(1);
      $("#pomoFinishTime").textContent = `${h}:${m} (${hrs}h)`;
    } else {
      $("#pomoFinishTime").textContent = "--:--";
    }

    updateDisplay();
  }

  function escH(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Add task input ──
  function showAddTaskInput() {
    const addBtn = $("#pomoAddTask");
    addBtn.style.display = "none";

    const row = document.createElement("div");
    row.className = "pomo-task-input-row";
    row.innerHTML = `
      <input type="text" placeholder="Nome da tarefa..." autofocus>
      <button class="pomo-input-save">OK</button>
      <button class="pomo-input-cancel">✕</button>`;

    addBtn.parentNode.insertBefore(row, addBtn);

    const input = row.querySelector("input");
    input.focus();

    function save() {
      const name = input.value.trim();
      if (name) addTask(name);
      row.remove();
      addBtn.style.display = "";
    }

    function cancel() {
      row.remove();
      addBtn.style.display = "";
    }

    row.querySelector(".pomo-input-save").addEventListener("click", save);
    row.querySelector(".pomo-input-cancel").addEventListener("click", cancel);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") save();
      if (e.key === "Escape") cancel();
    });
  }

  // ── Close dropdowns on outside click ──
  document.addEventListener("click", () => {
    document.querySelectorAll(".pomo-dropdown.open").forEach(d => d.classList.remove("open"));
  });

  // ── Init ──
  function initPomodoro() {
    loadPomo();

    // Toggle widget
    $("#pomodoroToggle").addEventListener("click", () => {
      const widget = $("#pomodoroWidget");
      const toggle = $("#pomodoroToggle");
      widget.classList.toggle("open");
      toggle.classList.toggle("active");
    });

    // Mode tabs
    document.querySelectorAll(".pomo-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        stopTimer();
        setMode(tab.dataset.mode);
        renderPomo();
      });
    });

    // Start/pause
    $("#pomoStartBtn").addEventListener("click", () => {
      if (pomoState.running) pauseTimer();
      else startTimer();
    });

    // Add task
    $("#pomoAddTask").addEventListener("click", showAddTaskInput);

    renderPomo();
  }

  document.addEventListener("DOMContentLoaded", initPomodoro);
})();
