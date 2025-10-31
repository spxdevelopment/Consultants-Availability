/*
 * Consultants management page script.
 *
 * Allows listing, adding and deleting consultants.  Each consultant row
 * displays the projects they are currently assigned to (any period with
 * non‑zero allocation) and links to the detailed editing page.
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

  // Compute project assignments for a consultant (projects with any non‑zero
  // allocation across all periods).
  function getAssignedProjects(data, consultant) {
    const assigned = new Set();
    ["week", "month"].forEach((mode) => {
      const periods = data.periods[mode];
      Object.keys(periods).forEach((period) => {
        const allocs = periods[period][consultant];
        if (allocs) {
          Object.keys(allocs).forEach((proj) => {
            if (allocs[proj] > 0) assigned.add(proj);
          });
        }
      });
    });
    return Array.from(assigned);
  }

  function renderTable(data) {
    const container = document.getElementById("consultantsTableContainer");
    container.innerHTML = "";
    const table = document.createElement("table");
    table.className = "edit-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Consultant", "Projects", "Actions"].forEach((text) => {
      const th = document.createElement("th");
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    data.consultants.forEach((consultant) => {
      const tr = document.createElement("tr");
      // Name
      const nameTd = document.createElement("td");
      nameTd.textContent = consultant;
      tr.appendChild(nameTd);
      // Projects
      const projTd = document.createElement("td");
      const assigned = getAssignedProjects(data, consultant);
      projTd.textContent = assigned.length > 0 ? assigned.join(", ") : "–";
      tr.appendChild(projTd);
      // Actions
      const actTd = document.createElement("td");
      // Edit link
      const editLink = document.createElement("a");
      editLink.href = `edit.html?consultant=${encodeURIComponent(consultant)}`;
      editLink.textContent = "Edit";
      editLink.style.marginRight = "0.5rem";
      actTd.appendChild(editLink);
      // Delete button
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "save-button";
      delBtn.style.backgroundColor = "#CA2027"; // red accent
      delBtn.style.marginLeft = "0.25rem";
      delBtn.addEventListener("click", () => {
        if (confirm(`Delete consultant ${consultant}?`)) {
          deleteConsultant(data, consultant);
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

  function addConsultant(data, name) {
    if (!name || name.trim() === "") return;
    if (data.consultants.includes(name)) {
      alert("Consultant already exists");
      return;
    }
    data.consultants.push(name);
    // For each period, create entry for new consultant with no allocations
    ["week", "month"].forEach((mode) => {
      Object.keys(data.periods[mode]).forEach((period) => {
        if (!data.periods[mode][period][name]) {
          data.periods[mode][period][name] = {};
          // Set zero for all projects
          data.projects.forEach((proj) => {
            data.periods[mode][period][name][proj] = 0;
          });
        }
      });
    });
    saveData(data);
  }

  function deleteConsultant(data, name) {
    // Remove from consultants array
    data.consultants = data.consultants.filter((c) => c !== name);
    // Remove from each period
    ["week", "month"].forEach((mode) => {
      Object.keys(data.periods[mode]).forEach((period) => {
        if (data.periods[mode][period][name]) {
          delete data.periods[mode][period][name];
        }
      });
    });
    saveData(data);
  }

  function init() {
    const data = loadData();
    if (!data) return;
    const addBtn = document.getElementById("addConsultantBtn");
    addBtn.addEventListener("click", () => {
      const name = prompt("Enter consultant name:");
      if (name) {
        addConsultant(data, name);
        renderTable(data);
      }
    });
    renderTable(data);
  }
  document.addEventListener("DOMContentLoaded", init);
})();