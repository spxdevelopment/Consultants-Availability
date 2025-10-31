/*
 * Consultant Allocation Dashboard
 *
 * This script powers the front‑end of the resource allocation dashboard.  It
 * generates a sample dataset of consultant project allocations between
 * October 2025 and December 2026, stores it in localStorage and renders
 * summary views for a selected year, period type (week or month) and
 * specific period.  Users can expand rows to see project details and click
 * consultant names to navigate to an editing page.
 */

(() => {
  // Configuration: list of consultants and projects.
  const consultants = ["Person 1", "Person 2", "Person 3"];
  const projects = ["Project 1", "Project 2", "Project 3", "Project 4"];

  // Brand colours from the SalesSparx brand guideline (web hex values).
  const projectColors = {
    "Project 1": "#4CA09A", // Teal
    "Project 2": "#147E76", // Dark Teal
    "Project 3": "#ee6c3c", // Orange
    "Project 4": "#FFF33B", // Yellow
  };

  // Utility: pad a number with leading zeros (for week numbers).
  function pad(num, size) {
    let s = String(num);
    while (s.length < size) s = "0" + s;
    return s;
  }

  // Generate an array of ISO‑8601 week strings (YYYY‑W##) between two dates.
  function generateWeekPeriods(startDate, endDate) {
    const result = [];
    // Clone to avoid modifying original date.
    let current = new Date(startDate);
    // Move current to Monday of its week (assuming week starts on Monday).
    const day = current.getDay(); // 0=Sun,1=Mon...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    current.setDate(current.getDate() + diffToMonday);
    while (current <= endDate) {
      // ISO week number algorithm
      const temp = new Date(current.getTime());
      // Thursday in current week decides the year.
      temp.setDate(temp.getDate() + 3);
      const isoYear = temp.getFullYear();
      // Find Thursday of week 1.
      const firstThursday = new Date(new Date(isoYear, 0, 4).getTime());
      const dayDiff = (firstThursday.getDay() + 6) % 7; // convert 0=Mon
      firstThursday.setDate(firstThursday.getDate() - dayDiff);
      // Calculate ISO week number.
      const weekNo = Math.round(
        ((temp.getTime() - firstThursday.getTime()) / 86400000) / 7 + 1
      );
      const periodString = `${isoYear}-W${pad(weekNo, 2)}`;
      result.push(periodString);
      // Move to next week (7 days).
      current.setDate(current.getDate() + 7);
    }
    return Array.from(new Set(result));
  }

  // Generate an array of month strings (YYYY‑MM) between two dates.
  function generateMonthPeriods(startDate, endDate) {
    const result = [];
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = pad(current.getMonth() + 1, 2);
      result.push(`${year}-${month}`);
      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }

  // Generate random allocations for a single period for all consultants.
  function generateRandomAllocations() {
    const allocation = {};
    consultants.forEach((consultant) => {
      // Choose a random number of projects (1–3) to assign.
      const numProjects = Math.floor(Math.random() * 3) + 1;
      // Randomly pick projects.
      const selectedProjects = [];
      while (selectedProjects.length < numProjects) {
        const proj = projects[Math.floor(Math.random() * projects.length)];
        if (!selectedProjects.includes(proj)) selectedProjects.push(proj);
      }
      // Generate random percentages that sum to at most 100.
      let remaining = 100;
      const allocations = {};
      selectedProjects.forEach((proj, index) => {
        if (index === selectedProjects.length - 1) {
          allocations[proj] = remaining;
        } else {
          // Allocate between 10 and (remaining - 10*(remainingProjects)) percent.
          const maxAlloc = remaining - 10 * (selectedProjects.length - index - 1);
          const value = Math.floor(Math.random() * (maxAlloc - 10 + 1)) + 10;
          allocations[proj] = value;
          remaining -= value;
        }
      });
      allocation[consultant] = allocations;
    });
    return allocation;
  }

  // Create the dataset covering weekly and monthly allocations between Oct 2025 and Dec 2026.
  function generateDataset() {
    const dataset = {
      consultants,
      projects,
      // Metadata about projects (start and end periods) to support project page editing
      projectsInfo: {},
      periods: {
        week: {},
        month: {},
      },
    };
    const startDate = new Date(2025, 9, 1); // October is month index 9
    const endDate = new Date(2026, 11, 31);
    const weekPeriods = generateWeekPeriods(startDate, endDate);
    const monthPeriods = generateMonthPeriods(startDate, endDate);
    weekPeriods.forEach((period) => {
      dataset.periods.week[period] = generateRandomAllocations();
    });
    monthPeriods.forEach((period) => {
      dataset.periods.month[period] = generateRandomAllocations();
    });
    // Generate random project metadata (start and end periods).  We assign each
    // project a random start and end period within the week periods list.  If end
    // comes before start, we swap them.  These values can be edited later on
    // the projects page.
    projects.forEach((proj) => {
      const startIndex = Math.floor(Math.random() * weekPeriods.length);
      let endIndex = startIndex + Math.floor(Math.random() * (weekPeriods.length - startIndex));
      // Ensure at least one period
      if (endIndex < startIndex) endIndex = startIndex;
      dataset.projectsInfo[proj] = {
        start: weekPeriods[startIndex],
        end: weekPeriods[endIndex],
      };
    });
    return dataset;
  }

  // Load dataset from localStorage or generate a new one if not present.
  function loadData() {
    const stored = localStorage.getItem("consultantAllocations");
    let data;
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch (e) {
        console.error("Error parsing stored data, regenerating", e);
      }
    }
    if (!data) {
      data = generateDataset();
      localStorage.setItem("consultantAllocations", JSON.stringify(data));
    } else {
      // Ensure projectsInfo exists; if missing, initialize based on current periods
      if (!data.projectsInfo) {
        data.projectsInfo = {};
      }
      // For each project, if metadata missing, set default start/end
      const weekPeriods = Object.keys(data.periods.week).sort();
      data.projects.forEach((proj) => {
        if (!data.projectsInfo[proj]) {
          data.projectsInfo[proj] = {
            start: weekPeriods[0],
            end: weekPeriods[weekPeriods.length - 1],
          };
        }
      });
      // Save modifications
      localStorage.setItem("consultantAllocations", JSON.stringify(data));
    }
    return data;
  }

  // Populate consultant list in sidebar.
  function populateConsultantList(data) {
    const listEl = document.getElementById("consultantList");
    listEl.innerHTML = "";
    data.consultants.forEach((name) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.textContent = name;
      // Encode consultant name for URL
      link.href = `edit.html?consultant=${encodeURIComponent(name)}`;
      li.appendChild(link);
      listEl.appendChild(li);
    });
  }

  // Populate year select options based on dataset.
  function populateYearOptions(data) {
    const yearSelect = document.getElementById("yearSelect");
    const years = new Set();
    Object.keys(data.periods.week).forEach((period) => {
      const y = period.split("-W")[0];
      years.add(y);
    });
    Object.keys(data.periods.month).forEach((period) => {
      const y = period.split("-")[0];
      years.add(y);
    });
    // Sort years
    const sorted = Array.from(years).sort();
    sorted.forEach((year) => {
      const opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      yearSelect.appendChild(opt);
    });
  }

  // Update period options based on selected year and view mode.
  function updatePeriodOptions(data) {
    const year = document.getElementById("yearSelect").value;
    const viewMode = document.getElementById("viewModeSelect").value;
    const periodSelect = document.getElementById("periodSelect");
    periodSelect.innerHTML = "";
    let periods = [];
    if (viewMode === "week") {
      periods = Object.keys(data.periods.week).filter((p) => p.startsWith(year));
    } else {
      periods = Object.keys(data.periods.month).filter((p) => p.startsWith(year));
    }
    // Sort periods chronologically
    periods.sort();
    periods.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      // Format display label
      opt.textContent = viewMode === "week" ? p.replace("-W", " Week ") : p;
      periodSelect.appendChild(opt);
    });
    // After updating, render summary
    renderSummary(data);
  }

  // Render summary table for the selected period.
  function renderSummary(data) {
    const viewMode = document.getElementById("viewModeSelect").value;
    const period = document.getElementById("periodSelect").value;
    const summaryEl = document.getElementById("summaryTable");
    summaryEl.innerHTML = "";
    if (!period) return;
    const periodData = data.periods[viewMode][period] || {};
    data.consultants.forEach((consultant) => {
      const allocations = periodData[consultant] || {};
      const row = document.createElement("div");
      row.className = "consultant-row";
      // Consultant name cell
      const nameCell = document.createElement("div");
      nameCell.className = "consultant-name";
      nameCell.textContent = consultant;
      row.appendChild(nameCell);
      // Allocation bar cell
      const bar = document.createElement("div");
      bar.className = "allocation-bar";
      // Compute total allocated percentage
      const total = Object.values(allocations).reduce((sum, v) => sum + v, 0);
      // Determine scaling factor (if overbooked)
      const factor = total > 0 ? Math.min(1, 100 / total) : 1;
      // Build segments for each project
      data.projects.forEach((proj) => {
        const seg = document.createElement("div");
        seg.className = "allocation-segment";
        const value = allocations[proj] || 0;
        // Scale width to ensure bar does not exceed 100%
        const width = value * factor;
        seg.style.width = width + "%";
        seg.style.backgroundColor = value > 0 ? projectColors[proj] : "transparent";
        bar.appendChild(seg);
      });
      // If total < 100, append empty segment to show free time
      if (total < 100) {
        const emptySeg = document.createElement("div");
        emptySeg.className = "allocation-segment allocation-empty";
        emptySeg.style.width = (100 - total) + "%";
        bar.appendChild(emptySeg);
      }
      row.appendChild(bar);
      // Append row to summary
      summaryEl.appendChild(row);
      // Create details container for expanded view
      const details = document.createElement("div");
      details.className = "details";
      // Populate details table
      const table = document.createElement("table");
      table.className = "details-table";
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      ["Project", "Allocation (%)"].forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      // Add each project even if 0 allocation (for full transparency)
      data.projects.forEach((proj) => {
        const tr = document.createElement("tr");
        const tdProj = document.createElement("td");
        tdProj.textContent = proj;
        const tdAlloc = document.createElement("td");
        tdAlloc.textContent = allocations[proj] || 0;
        tr.appendChild(tdProj);
        tr.appendChild(tdAlloc);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      details.appendChild(table);
      summaryEl.appendChild(details);
      // Toggle details on row click
      row.addEventListener("click", () => {
        const expanded = row.classList.toggle("expanded");
        details.style.display = expanded ? "block" : "none";
      });
    });
  }

  // Initialize the dashboard on page load.
  function init() {
    const data = loadData();
    // Sidebar in overview page contains only navigation; consultant list is not populated here.
    populateYearOptions(data);
    // Event listeners
    const viewModeSelect = document.getElementById("viewModeSelect");
    const yearSelect = document.getElementById("yearSelect");
    viewModeSelect.addEventListener("change", () => updatePeriodOptions(data));
    yearSelect.addEventListener("change", () => updatePeriodOptions(data));
    const periodSelect = document.getElementById("periodSelect");
    periodSelect.addEventListener("change", () => renderSummary(data));
    // Trigger initial load
    // Set default year to the earliest year available
    if (yearSelect.options.length > 0) {
      yearSelect.value = yearSelect.options[0].value;
    }
    updatePeriodOptions(data);
  }

  // Wait for DOM to load before initializing
  document.addEventListener("DOMContentLoaded", init);
})();