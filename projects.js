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

  /**
   * Retrieve a default allocation percentage for a given consultant and
   * project.  Returns the first non‑zero value found across any period
   * (week or month).  If no allocation has been set previously, returns 0.
   *
   * @param {Object} data - The dataset from localStorage.
   * @param {string} project - The project name.
   * @param {string} consultant - The consultant name.
   */
  function getDefaultAllocation(data, project, consultant) {
    for (const mode of ["week", "month"]) {
      const periods = data.periods[mode];
      for (const period in periods) {
        const allocs = periods[period][consultant];
        if (allocs && allocs[project] > 0) {
          return allocs[project];
        }
      }
    }
    return 0;
  }

  /**
   * Compute the Monday date for an ISO week string (YYYY-W##).
   *
   * @param {string} isoWeek - ISO week string.
   */
  function getWeekStartDate(isoWeek) {
    const parts = isoWeek.split("-W");
    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (jan4Day - 1));
    const start = new Date(mondayOfWeek1);
    start.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    return start;
  }

  /**
   * Compute the Sunday date for an ISO week string (YYYY-W##).
   *
   * @param {string} isoWeek - ISO week string.
   */
  function getWeekEndDate(isoWeek) {
    const start = getWeekStartDate(isoWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  /**
   * Given a start week, end week and an array of month period strings (e.g.
   * "YYYY-MM"), return the subset of months that overlap with the date range
   * defined by the weeks.  A month overlaps if any day of that month falls
   * within the start–end date range.
   *
   * @param {string} startWeek - ISO week string for start.
   * @param {string} endWeek - ISO week string for end.
   * @param {string[]} monthPeriods - Sorted list of month period strings.
   */
  function getMonthsBetweenWeeks(startWeek, endWeek, monthPeriods) {
    const startDate = getWeekStartDate(startWeek);
    const endDate = getWeekEndDate(endWeek);
    const months = [];
    monthPeriods.forEach((monthStr) => {
      const [yearStr, monthPart] = monthStr.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthPart, 10) - 1;
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      if (monthEnd >= startDate && monthStart <= endDate) {
        months.push(monthStr);
      }
    });
    return months;
  }

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
    ["Project", "Start Period", "End Period", "Consultants & %", "Actions"].forEach((text) => {
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
      // Consultants allocation list: each consultant has a checkbox and percentage input
      const consTd = document.createElement("td");
      consTd.className = "cons-allocation-cell";
      data.consultants.forEach((consultant) => {
        // Wrapper for each consultant's allocation entry
        const entry = document.createElement("div");
        entry.className = "consultant-entry";
        entry.dataset.consultant = consultant;
        // Checkbox to indicate assignment
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "consultant-assign";
        // Determine initial value and checked state based on existing data
        const defaultValue = getDefaultAllocation(data, project, consultant);
        if (defaultValue > 0) {
          checkbox.checked = true;
        }
        // Label text for consultant name
        const labelSpan = document.createElement("span");
        labelSpan.textContent = consultant;
        labelSpan.style.marginLeft = "0.25rem";
        // Number input for percentage
        const input = document.createElement("input");
        input.type = "number";
        input.min = 0;
        input.max = 100;
        input.step = 1;
        input.value = defaultValue;
        input.className = "consultant-percent";
        input.style.width = "60px";
        // Disable input if not assigned
        input.disabled = !checkbox.checked;
        // Toggle input when checkbox changes
        checkbox.addEventListener("change", () => {
          input.disabled = !checkbox.checked;
          if (!checkbox.checked) {
            input.value = 0;
          }
        });
        // Build entry: checkbox, label, input
        entry.appendChild(checkbox);
        entry.appendChild(labelSpan);
        entry.appendChild(input);
        consTd.appendChild(entry);
      });
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
      // Gather consultant assignments and their specified allocations from checkboxes and inputs
      const consCell = cells[3];
      const entries = consCell.querySelectorAll(".consultant-entry");
      const consultantAllocations = {};
      entries.forEach((entry) => {
        const consultant = entry.dataset.consultant;
        const checkbox = entry.querySelector(".consultant-assign");
        const percentInput = entry.querySelector(".consultant-percent");
        if (checkbox && percentInput) {
          if (checkbox.checked) {
            const value = parseInt(percentInput.value, 10);
            consultantAllocations[consultant] = isNaN(value) ? 0 : value;
          }
        }
      });
      // Determine period ranges for updates
      const allWeekPeriods = getWeekPeriods(data);
      const allMonthPeriods = Object.keys(data.periods.month).sort();
      const startIdx = allWeekPeriods.indexOf(start);
      const endIdx = allWeekPeriods.indexOf(end);
      const targetWeekPeriods = startIdx >= 0 && endIdx >= 0 ? allWeekPeriods.slice(startIdx, endIdx + 1) : allWeekPeriods;
      const targetMonthPeriods = getMonthsBetweenWeeks(start, end, allMonthPeriods);
      // Update allocations for each consultant
      data.consultants.forEach((consultant) => {
        const isSelected = consultantAllocations.hasOwnProperty(consultant);
        const value = consultantAllocations[consultant];
        // Week periods
        if (isSelected) {
          targetWeekPeriods.forEach((period) => {
            if (!data.periods.week[period][consultant]) {
              data.periods.week[period][consultant] = {};
            }
            data.periods.week[period][consultant][project] = value;
          });
        } else {
          // Remove from all week periods
          Object.keys(data.periods.week).forEach((period) => {
            if (data.periods.week[period][consultant] && data.periods.week[period][consultant][project] !== undefined) {
              delete data.periods.week[period][consultant][project];
            }
          });
        }
        // Month periods
        if (isSelected) {
          targetMonthPeriods.forEach((monthP) => {
            if (!data.periods.month[monthP][consultant]) {
              data.periods.month[monthP][consultant] = {};
            }
            data.periods.month[monthP][consultant][project] = value;
          });
        } else {
          Object.keys(data.periods.month).forEach((monthP) => {
            if (data.periods.month[monthP][consultant] && data.periods.month[monthP][consultant][project] !== undefined) {
              delete data.periods.month[monthP][consultant][project];
            }
          });
        }
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