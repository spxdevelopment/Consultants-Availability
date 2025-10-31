/*
 * Editing page script for consultant allocations.
 *
 * Allows users to view and edit the weekly or monthly allocations for a single
 * consultant.  Changes are written back to localStorage.
 */

(() => {
  const consultantsKey = "consultantAllocations";
  const projectsColors = {
    "Project 1": "#4CA09A",
    "Project 2": "#147E76",
    "Project 3": "#ee6c3c",
    "Project 4": "#FFF33B",
  };

  // Helper to parse query parameters
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Load dataset from localStorage
  function loadData() {
    const stored = localStorage.getItem(consultantsKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse data", e);
      }
    }
    return null;
  }

  // Persist dataset back to localStorage
  function saveData(data) {
    localStorage.setItem(consultantsKey, JSON.stringify(data));
  }

  // Populate consultant sidebar list
  function populateConsultantList(data) {
    const listEl = document.getElementById("consultantList");
    listEl.innerHTML = "";
    data.consultants.forEach((name) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.textContent = name;
      link.href = `edit.html?consultant=${encodeURIComponent(name)}`;
      li.appendChild(link);
      listEl.appendChild(li);
    });
  }

  // Populate year options
  function populateYearOptions(data) {
    const yearSelect = document.getElementById("editYearSelect");
    yearSelect.innerHTML = "";
    const years = new Set();
    Object.keys(data.periods.week).forEach((p) => years.add(p.split("-W")[0]));
    Object.keys(data.periods.month).forEach((p) => years.add(p.split("-")[0]));
    const sorted = Array.from(years).sort();
    sorted.forEach((year) => {
      const opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      yearSelect.appendChild(opt);
    });
  }

  // Render editing table for selected consultant, year and view mode
  function renderEditTable(data, consultant) {
    const year = document.getElementById("editYearSelect").value;
    const viewMode = document.getElementById("editViewModeSelect").value;
    const container = document.getElementById("editTableContainer");
    container.innerHTML = "";
    // Get list of periods for year
    const periods = Object.keys(data.periods[viewMode]).filter((p) => p.startsWith(year));
    periods.sort();
    // Create table
    const table = document.createElement("table");
    table.className = "edit-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    // First cell blank for period label
    const blankTh = document.createElement("th");
    blankTh.textContent = viewMode === "week" ? "Week" : "Month";
    headerRow.appendChild(blankTh);
    // Create header for each project
    data.projects.forEach((proj) => {
      const th = document.createElement("th");
      th.textContent = proj;
      headerRow.appendChild(th);
    });
    // Add total column
    const thTotal = document.createElement("th");
    thTotal.textContent = "Total (%)";
    headerRow.appendChild(thTotal);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    periods.forEach((period) => {
      const tr = document.createElement("tr");
      // Period label cell
      const labelTd = document.createElement("td");
      labelTd.textContent = viewMode === "week" ? period.replace("-W", " Week ") : period;
      tr.appendChild(labelTd);
      // For each project, create number input
      const periodAlloc = data.periods[viewMode][period][consultant] || {};
      let rowTotal = 0;
      data.projects.forEach((proj) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.min = 0;
        input.max = 100;
        input.value = periodAlloc[proj] !== undefined ? periodAlloc[proj] : 0;
        input.style.width = "60px";
        input.dataset.period = period;
        input.dataset.project = proj;
        input.addEventListener("input", () => updateRowTotal(tr));
        td.appendChild(input);
        tr.appendChild(td);
        rowTotal += parseInt(input.value, 10);
      });
      // Total cell
      const totalTd = document.createElement("td");
      totalTd.className = "row-total";
      totalTd.textContent = rowTotal;
      tr.appendChild(totalTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Update row total when an input changes
  function updateRowTotal(row) {
    let sum = 0;
    row.querySelectorAll("input").forEach((input) => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val)) sum += val;
    });
    const totalCell = row.querySelector(".row-total");
    totalCell.textContent = sum;
    // Highlight row if total > 100
    if (sum > 100) {
      row.style.backgroundColor = "#ffdddd";
    } else {
      // Remove highlight but keep zebra striping based on index
      const index = Array.from(row.parentNode.children).indexOf(row);
      row.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
    }
  }

  // Save changes to dataset
  function saveChanges(data, consultant) {
    const viewMode = document.getElementById("editViewModeSelect").value;
    const inputs = document.querySelectorAll("#editTableContainer input");
    inputs.forEach((input) => {
      const period = input.dataset.period;
      const project = input.dataset.project;
      const value = parseInt(input.value, 10) || 0;
      if (!data.periods[viewMode][period][consultant]) {
        data.periods[viewMode][period][consultant] = {};
      }
      data.periods[viewMode][period][consultant][project] = value;
    });
    saveData(data);
  }

  // Initialize page
  function init() {
    const consultant = getQueryParam("consultant");
    if (!consultant) {
      document.getElementById("editTitle").textContent = "Unknown Consultant";
      return;
    }
    const data = loadData();
    if (!data || !data.consultants.includes(consultant)) {
      document.getElementById("editTitle").textContent = `Consultant not found: ${consultant}`;
      return;
    }
    // Update title
    document.getElementById("editTitle").textContent = `Edit Allocations – ${consultant}`;
    // Populate consultants in sidebar
    populateConsultantList(data);
    // Populate year options
    populateYearOptions(data);
    // Default year
    const yearSelect = document.getElementById("editYearSelect");
    if (yearSelect.options.length > 0) {
      yearSelect.value = yearSelect.options[0].value;
    }
    // Event listeners
    const viewModeSelect = document.getElementById("editViewModeSelect");
    viewModeSelect.addEventListener("change", () => renderEditTable(data, consultant));
    yearSelect.addEventListener("change", () => renderEditTable(data, consultant));
    // Back button
    document.getElementById("backButton").addEventListener("click", () => {
      window.location.href = "index.html";
    });
    // Save button
    document.getElementById("saveButton").addEventListener("click", () => {
      saveChanges(data, consultant);
      const msg = document.getElementById("saveMessage");
      msg.textContent = "Changes saved!";
      msg.style.display = "block";
      setTimeout(() => {
        msg.style.display = "none";
      }, 2000);
    });
    // Render initial table
    renderEditTable(data, consultant);
  }

  document.addEventListener("DOMContentLoaded", init);
})();