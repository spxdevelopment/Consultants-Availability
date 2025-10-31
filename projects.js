/*
 * Projects management page script.
 *
 * Allows adding, editing and deleting projects, setting their active start/end
 * periods, and assigning consultants.  Assignments will ensure that the
 * dataset contains entries for each consultant/project pair across all
 * periods with zero allocations when first assigned.
 */

(() => {
  const storageKey = "consultantAllocations";

  function loadData() {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  }

  function saveData(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  // Get list of ISO week periods from data
  function getWeekPeriods(data) {
    return Object.keys(data.periods.week).sort();
  }

  // Determine which consultants are assigned to a project (any non‑zero allocation)
  function getAssignedConsultants(data, project) {
    const assigned = new Set();
    ["week", "month"].forEach((mode) => {
      const periods = data.periods[mode];
      Object.keys(periods).forEach((period) => {
        const pData = periods[period];
        Object.keys(pData).forEach((consultant) => {
          const allocs = pData[consultant];
          if (allocs && allocs[project] > 0) {
            assigned.add(consultant);
          }
        });
      });
    });
    return Array.from(assigned);
  }

  function renderTable(data) {
    const container = document.getElementById("projectsTableContainer");
    container.innerHTML = "";
    const table = document.createElement("table");
    table.className = "edit-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Project", "Start Period", "End Period", "Consultants", "Actions"].forEach((text) => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    const weekPeriods = getWeekPeriods(data);
    data.projects.forEach((project) => {
      const tr = document.createElement("tr");
      // Name cell
      const nameTd = document.createElement("td");
      nameTd.textContent = project;
      tr.appendChild(nameTd);
      // Start select
      const startTd = document.createElement("td");
      const startSelect = document.createElement("select");
      weekPeriods.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        if (data.projectsInfo[project] && data.projectsInfo[project].start === p) {
          opt.selected = true;
        }
        startSelect.appendChild(opt);
      });
      startTd.appendChild(startSelect);
      tr.appendChild(startTd);
      // End select
      const endTd = document.createElement("td");
      const endSelect = document.createElement("select");
      weekPeriods.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        if (data.projectsInfo[project] && data.projectsInfo[project].end === p) {
          opt.selected = true;
        }
        endSelect.appendChild(opt);
      });
      endTd.appendChild(endSelect);
      tr.appendChild(endTd);
      // Consultants multi-select
      const consTd = document.createElement("td");
      const multi = document.createElement("select");
      multi.multiple = true;
      multi.size = Math.min(data.consultants.length, 4);
      data.consultants.forEach((consultant) => {
        const opt = document.createElement("option");
        opt.value = consultant;
        opt.textContent = consultant;
        if (getAssignedConsultants(data, project).includes(consultant)) {
          opt.selected = true;
        }
        multi.appendChild(opt);
      });
      consTd.appendChild(multi);
      tr.appendChild(consTd);
      // Actions
      const actTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "save-button";
      delBtn.style.backgroundColor = "#CA2027";
      delBtn.addEventListener("click", () => {
        if (confirm(`Delete project ${project}?`)) {
          deleteProject(data, project);
          renderTable(data);
        }
      });
      actTd.appendChild(delBtn);
      tr.appendChild(actTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function addProject(data, name) {
    if (!name || name.trim() === "") return;
    if (data.projects.includes(name)) {
      alert("Project already exists");
      return;
    }
    data.projects.push(name);
    // Default start: first week, end: last week
    const weekPeriods = getWeekPeriods(data);
    data.projectsInfo[name] = { start: weekPeriods[0], end: weekPeriods[weekPeriods.length - 1] };
    // Initialize allocations for all consultants across all periods
    ["week", "month"].forEach((mode) => {
      Object.keys(data.periods[mode]).forEach((period) => {
        data.consultants.forEach((consultant) => {
          if (!data.periods[mode][period][consultant]) {
            data.periods[mode][period][consultant] = {};
          }
          data.periods[mode][period][consultant][name] = 0;
        });
      });
    });
    saveData(data);
  }

  function deleteProject(data, name) {
    data.projects = data.projects.filter((p) => p !== name);
    if (data.projectsInfo[name]) delete data.projectsInfo[name];
    // Remove from all periods
    ["week", "month"].forEach((mode) => {
      Object.keys(data.periods[mode]).forEach((period) => {
        Object.keys(data.periods[mode][period]).forEach((consultant) => {
          if (data.periods[mode][period][consultant][name] !== undefined) {
            delete data.periods[mode][period][consultant][name];
          }
        });
      });
    });
    saveData(data);
  }

  function saveChanges(data) {
    const table = document.querySelector("#projectsTableContainer table");
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    rows.forEach((row) => {
      const cells = row.children;
      const project = cells[0].textContent;
      const start = cells[1].querySelector("select").value;
      const end = cells[2].querySelector("select").value;
      data.projectsInfo[project].start = start;
      data.projectsInfo[project].end = end;
      // Assigned consultants from multi-select
      const options = cells[3].querySelectorAll("option");
      const selectedConsultants = [];
      options.forEach((opt) => {
        if (opt.selected) selectedConsultants.push(opt.value);
      });
      // For each consultant: if selected, ensure project entry exists with 0 if absent
      data.consultants.forEach((consultant) => {
        const isSelected = selectedConsultants.includes(consultant);
        ["week", "month"].forEach((mode) => {
          Object.keys(data.periods[mode]).forEach((period) => {
            if (!data.periods[mode][period][consultant]) {
              data.periods[mode][period][consultant] = {};
            }
            if (isSelected) {
              if (data.periods[mode][period][consultant][project] === undefined) {
                data.periods[mode][period][consultant][project] = 0;
              }
            } else {
              if (data.periods[mode][period][consultant][project] !== undefined) {
                delete data.periods[mode][period][consultant][project];
              }
            }
          });
        });
      });
    });
    saveData(data);
  }

  function init() {
    const data = loadData();
    if (!data) return;
    // Ensure projectsInfo exists; if not, initialize with default start and end
    if (!data.projectsInfo) {
      data.projectsInfo = {};
    }
    const weekPeriods = getWeekPeriods(data);
    // For each project, if no metadata, assign default start and end
    data.projects.forEach((proj) => {
      if (!data.projectsInfo[proj]) {
        data.projectsInfo[proj] = {
          start: weekPeriods[0],
          end: weekPeriods[weekPeriods.length - 1],
        };
      }
    });
    saveData(data);
    renderTable(data);
    document.getElementById("addProjectBtn").addEventListener("click", () => {
      const name = prompt("Enter project name:");
      if (name) {
        addProject(data, name);
        renderTable(data);
      }
    });
    document.getElementById("saveProjectsBtn").addEventListener("click", () => {
      saveChanges(data);
      const msg = document.getElementById("projectSaveMsg");
      msg.textContent = "Changes saved!";
      msg.style.display = "block";
      setTimeout(() => {
        msg.style.display = "none";
      }, 2000);
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();