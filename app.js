(function () {
  "use strict";

  // ── Helpers ──
  const $ = (sel) => document.querySelector(sel);
  const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  function fmtDate(d) {
    return d.getDate() + " " + MONTHS_PT[d.getMonth()];
  }

  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function parseDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function todayDate() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  // ── State ──
  let cycle = null;
  let weeks = {};
  let expandedWeeks = new Set();
  let modalWeek = null;

  // ── localStorage ──
  function loadState() {
    try {
      const c = localStorage.getItem("constancia_cycle");
      const w = localStorage.getItem("constancia_weeks");
      cycle = c ? JSON.parse(c) : null;
      weeks = w ? JSON.parse(w) : {};
    } catch (e) {
      cycle = null;
      weeks = {};
    }
    if (!cycle) {
      cycle = { name: "", total: 53, startDate: toISO(todayDate()) };
      saveState();
    }
  }

  function saveState() {
    localStorage.setItem("constancia_cycle", JSON.stringify(cycle));
    localStorage.setItem("constancia_weeks", JSON.stringify(weeks));
  }

  function getWeek(i) {
    if (!weeks[i]) weeks[i] = { days: {}, obs: "" };
    return weeks[i];
  }

  function toggleDay(weekIdx, dayIdx) {
    const w = getWeek(weekIdx);
    if (w.days[dayIdx]) {
      delete w.days[dayIdx];
    } else {
      w.days[dayIdx] = true;
    }
    saveState();
  }

  function weekDoneCount(weekIdx) {
    const w = weeks[weekIdx];
    if (!w) return 0;
    return Object.keys(w.days).length;
  }

  function isWeekComplete(weekIdx) {
    return weekDoneCount(weekIdx) === 7;
  }

  // ── Computations ──
  function totalDaysChecked() {
    let count = 0;
    for (let i = 0; i < cycle.total; i++) {
      count += weekDoneCount(i);
    }
    return count;
  }

  function streak() {
    let s = 0;
    for (let i = 0; i < cycle.total; i++) {
      if (isWeekComplete(i)) s++;
      else break;
    }
    return s;
  }

  function progress() {
    const total = cycle.total * 7;
    if (total === 0) return 0;
    return Math.round((totalDaysChecked() / total) * 100);
  }

  function weekStartDate(weekIdx) {
    return addDays(parseDate(cycle.startDate), weekIdx * 7);
  }

  function dayDate(weekIdx, dayIdx) {
    return addDays(weekStartDate(weekIdx), dayIdx);
  }

  function isDayPastOrToday(weekIdx, dayIdx) {
    return true; // TODO: restaurar verificação de data após testes
    // return dayDate(weekIdx, dayIdx) <= todayDate();
  }

  function greenClass(weekIdx) {
    const c = weekDoneCount(weekIdx);
    if (c === 0) return "";
    if (c <= 2) return "green-1";
    if (c <= 4) return "green-2";
    if (c <= 6) return "green-3";
    return "green-4";
  }

  // ── Render ──
  function render() {
    renderHeader();
    renderConfig();
    renderMetrics();
    renderHeatmap();
    renderWeeks();
  }

  function renderHeader() {
    const el = $("#header");
    let html = `<h1>Constância</h1>
      <div class="subtitle">Acompanhe seu progresso para concursos públicos</div>`;
    if (cycle.name) {
      html += `<div class="cycle-name">${esc(cycle.name)}</div>`;
    }
    el.innerHTML = html;
  }

  function renderConfig() {
    $("#cycleName").value = cycle.name || "";
    $("#cycleWeeks").value = cycle.total;
  }

  function renderMetrics() {
    const el = $("#metrics");
    const s = streak();
    el.innerHTML = `
      <div class="metric-card"><div class="metric-label">Semanas</div><div class="metric-value">${cycle.total}</div></div>
      <div class="metric-card"><div class="metric-label">Dias feitos</div><div class="metric-value green">${totalDaysChecked()}</div></div>
      <div class="metric-card"><div class="metric-label">Progresso</div><div class="metric-value amber">${progress()}%</div></div>
      <div class="metric-card"><div class="metric-label">Sequência</div><div class="metric-value">${s} sem.</div></div>`;
  }

  function renderHeatmap() {
    const grid = $("#heatmapGrid");
    grid.innerHTML = "";
    const today = todayDate();

    for (let w = 0; w < cycle.total; w++) {
      const gc = greenClass(w);
      const wk = weeks[w];
      for (let d = 0; d < 7; d++) {
        const cell = document.createElement("button");
        cell.className = "heatmap-cell";
        const dd = dayDate(w, d);
        const checked = wk && wk.days && wk.days[d];

        if (dd > today) {
          cell.classList.add("future");
        } else if (checked) {
          cell.classList.add(gc || "green-1");
          cell.classList.add("clickable");
          cell.addEventListener("click", () => { toggleDay(w, d); saveState(); render(); });
        } else {
          cell.classList.add("unchecked");
          cell.classList.add("clickable");
          cell.addEventListener("click", () => { toggleDay(w, d); saveState(); render(); });
        }
        grid.appendChild(cell);
      }
    }
  }

  function renderWeeks() {
    const el = $("#weeksList");
    el.innerHTML = "";
    for (let i = 0; i < cycle.total; i++) {
      el.appendChild(createWeekCard(i));
    }
  }

  function createWeekCard(idx) {
    const card = document.createElement("div");
    card.className = "week-card";
    const complete = isWeekComplete(idx);
    const expanded = expandedWeeks.has(idx);
    if (complete) card.classList.add("complete");
    if (expanded) card.classList.add("expanded");

    const wStart = weekStartDate(idx);
    const wEnd = addDays(wStart, 6);
    const doneCount = weekDoneCount(idx);
    const wk = getWeek(idx);

    const checkSVG = `<svg viewBox="0 0 14 14"><polyline points="3,7 6,10 11,4"/></svg>`;

    card.innerHTML = `
      <div class="week-header">
        <div class="week-check">${checkSVG}</div>
        <span class="week-title">Semana ${idx + 1}</span>
        <span class="week-dates">${fmtDate(wStart)} – ${fmtDate(wEnd)}</span>
        <span class="week-spacer"></span>
        <span class="week-days-count">${doneCount}/7 dias</span>
        <span class="week-badge ${complete ? "complete-badge" : "progress-badge"}">${complete ? "Completa" : "Em andamento"}</span>
        <button class="week-notes-btn" data-week="${idx}" title="Observações">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </button>
        <svg class="week-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="week-body">
        <div class="day-grid">${buildDayGrid(idx)}</div>
        ${wk.obs ? `<div class="week-obs-preview">${esc(wk.obs)}</div>` : ""}
      </div>`;

    // Toggle expand
    const header = card.querySelector(".week-header");
    header.addEventListener("click", (e) => {
      if (e.target.closest(".week-notes-btn")) return;
      if (expanded) expandedWeeks.delete(idx);
      else expandedWeeks.add(idx);
      renderWeeks();
    });

    // Notes button
    card.querySelector(".week-notes-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(idx);
    });

    // Day click
    card.querySelectorAll(".day-box:not(.future)").forEach((box) => {
      box.addEventListener("click", () => {
        const di = parseInt(box.dataset.day);
        toggleDay(idx, di);
        render();
      });
    });

    return card;
  }

  function buildDayGrid(weekIdx) {
    let html = "";
    for (let d = 0; d < 7; d++) {
      const past = isDayPastOrToday(weekIdx, d);
      const wk = weeks[weekIdx];
      const checked = wk && wk.days && wk.days[d];
      let cls = "day-box";
      if (!past) cls += " future";
      if (checked) cls += " checked";
      html += `<div class="day-col">
        <span class="day-label">${DAY_NAMES[d]}</span>
        <button class="${cls}" data-day="${d}">${checked ? "✓" : ""}</button>
      </div>`;
    }
    return html;
  }

  // ── Modal ──
  function openModal(weekIdx) {
    modalWeek = weekIdx;
    const wk = getWeek(weekIdx);
    $("#modalTitle").textContent = `Semana ${weekIdx + 1} — observações`;
    $("#modalTextarea").value = wk.obs || "";
    $("#modalOverlay").classList.add("open");
    $("#modalTextarea").focus();
  }

  function closeModal() {
    modalWeek = null;
    $("#modalOverlay").classList.remove("open");
  }

  function saveModal() {
    if (modalWeek === null) return;
    const wk = getWeek(modalWeek);
    wk.obs = $("#modalTextarea").value;
    saveState();
    closeModal();
    render();
  }

  // ── Apply Cycle ──
  function applyCycle() {
    const name = $("#cycleName").value.trim();
    const total = parseInt($("#cycleWeeks").value) || 53;
    cycle = { name, total: Math.max(1, Math.min(104, total)), startDate: toISO(todayDate()) };
    weeks = {};
    expandedWeeks.clear();
    saveState();
    render();
  }

  // ── Escape HTML ──
  function esc(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // ── Init ──
  function init() {
    loadState();

    // Apply button
    $("#btnApply").addEventListener("click", applyCycle);

    // Modal events
    $("#btnModalCancel").addEventListener("click", closeModal);
    $("#btnModalSave").addEventListener("click", saveModal);
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
