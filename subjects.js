(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  
  let subjects = [];

  function loadSubjects() {
    try {
      const s = localStorage.getItem("constancia_subjects");
      if (s) {
        subjects = JSON.parse(s);
      } else {
        subjects = [
          { name: "Direito Constitucional", subtopics: [{ text: "Princípios Fundamentais", done: false }] }
        ];
      }
    } catch (e) {
      subjects = [];
    }
  }

  function saveSubjects() {
    localStorage.setItem("constancia_subjects", JSON.stringify(subjects));
  }

  function renderSubjects() {
    const list = $("#subjList");
    list.innerHTML = "";

    subjects.forEach((subj, sIdx) => {
      const card = document.createElement("div");
      card.className = "subj-card";

      // Card Header
      const header = document.createElement("div");
      header.className = "subj-card-header";
      
      const title = document.createElement("div");
      title.className = "subj-card-title";
      title.textContent = subj.name;

      const delBtn = document.createElement("button");
      delBtn.className = "subj-del-btn";
      delBtn.title = "Excluir matéria";
      delBtn.innerHTML = "×";
      delBtn.addEventListener("click", () => {
        if (confirm(`Excluir a matéria "${subj.name}"?`)) {
          subjects.splice(sIdx, 1);
          saveSubjects();
          renderSubjects();
        }
      });

      header.appendChild(title);
      header.appendChild(delBtn);
      card.appendChild(header);

      // Subtopics List
      const subtopicsContainer = document.createElement("div");
      subtopicsContainer.className = "subj-subtopics";

      subj.subtopics.forEach((sub, tIdx) => {
        const item = document.createElement("div");
        item.className = "subj-subtopic-item";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = sub.done;
        cb.addEventListener("change", () => {
          sub.done = cb.checked;
          saveSubjects();
          text.classList.toggle("done", sub.done);
        });

        const text = document.createElement("div");
        text.className = "subj-subtopic-text";
        if (sub.done) text.classList.add("done");
        text.textContent = sub.text;

        const subDelBtn = document.createElement("button");
        subDelBtn.className = "subj-del-btn";
        subDelBtn.innerHTML = "×";
        subDelBtn.title = "Excluir assunto";
        subDelBtn.addEventListener("click", () => {
          subj.subtopics.splice(tIdx, 1);
          saveSubjects();
          renderSubjects();
        });

        item.appendChild(cb);
        item.appendChild(text);
        item.appendChild(subDelBtn);
        subtopicsContainer.appendChild(item);
      });

      // Add Subtopic Button
      const addSubBtn = document.createElement("button");
      addSubBtn.className = "subj-add-subtopic-btn";
      addSubBtn.innerHTML = "+ Adicionar assunto";
      addSubBtn.addEventListener("click", () => {
        addSubBtn.style.display = "none";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "subj-subtopic-text-input";
        input.placeholder = "Novo assunto...";
        
        subtopicsContainer.appendChild(input);
        input.focus();

        const save = () => {
          const val = input.value.trim();
          if (val) {
            subj.subtopics.push({ text: val, done: false });
            saveSubjects();
          }
          renderSubjects();
        };

        input.addEventListener("blur", save);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") renderSubjects();
        });
      });

      subtopicsContainer.appendChild(addSubBtn);
      card.appendChild(subtopicsContainer);
      list.appendChild(card);
    });
  }

  function initSubjects() {
    loadSubjects();

    // Toggle widget
    $("#subjectsToggle").addEventListener("click", () => {
      const widget = $("#subjectsWidget");
      const toggle = $("#subjectsToggle");
      widget.classList.toggle("open");
      toggle.classList.toggle("active");
    });

    // Add new subject
    $("#subjAddBtn").addEventListener("click", () => {
      const btn = $("#subjAddBtn");
      btn.style.display = "none";

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "6px";
      
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Nome da matéria...";
      input.className = "subj-subtopic-text-input";
      input.style.flex = "1";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "OK";
      saveBtn.style.background = "#639922";
      saveBtn.style.color = "#fff";
      saveBtn.style.border = "none";
      saveBtn.style.borderRadius = "4px";
      saveBtn.style.padding = "0 8px";
      saveBtn.style.cursor = "pointer";

      row.appendChild(input);
      row.appendChild(saveBtn);

      btn.parentNode.insertBefore(row, btn);
      input.focus();

      const save = () => {
        const val = input.value.trim();
        if (val) {
          subjects.push({ name: val, subtopics: [] });
          saveSubjects();
        }
        row.remove();
        btn.style.display = "";
        renderSubjects();
      };

      saveBtn.addEventListener("click", save);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") {
          row.remove();
          btn.style.display = "";
        }
      });
    });

    renderSubjects();
  }

  document.addEventListener("DOMContentLoaded", initSubjects);
})();
