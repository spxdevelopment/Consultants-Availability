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
  // Extend the consultant list to include a fourth person.  These names
  // correspond to the rows that will appear in the overview and editing
  // interfaces.  Feel free to rename or add additional consultants as
  // required.
  // Define the list of consultants based on the assignments provided by the user.
  // Each name should be unique.  Feel free to extend or rename consultants here.
  const consultants = [
    "Ginny",
    "Kit",
    "Jeff",
    "Lauren",
    "Regina",
    "Alzer",
    "Kristin",
    "Chase",
    "Amanda",
    "Ingrid",
    "Reese",
    "Johanne",
    "Michael",
    "Shaun",
  ];

  // Define all projects to be tracked, including a special "Vacation"
  // project.  Vacation entries allow time off to be recorded and will
  // render in yellow on the overview chart.  You can add additional
  // projects to this array to extend the schedule.
  // Define the list of projects.  "Vacation" remains a special project to
  // capture time off and will render in yellow.  Other projects are taken
  // directly from the user's input.
  const projects = [
    "Stand Together",
    "EisnerAmper",
    "OPOS, Inc.",
    "Omega Healthcare Management Services",
    "iMethods",
    "Divurgent, LLC",
    "EQUIPX",
    "OmniSource",
    "SPX Outreach",
    "SPX Sales",
    "SPX Management / Operations",
    "Vacation",
  ];

  // Brand colours from the SalesSparx brand guideline (web hex values).
  // Assign a distinct colour to each project.  These colours are chosen
  // from a diverse palette inspired by the SalesSparx brand guide.  Feel
  // free to adjust or expand this palette as needed.  "Vacation" uses a
  // soft yellow to stand out.
  const projectColors = {
    "Stand Together": "#4CA09A",              // Teal
    "EisnerAmper": "#147E76",               // Dark teal
    "OPOS, Inc.": "#ee6c3c",                 // Orange
    "Omega Healthcare Management Services": "#CA2027", // Red (brand palette)
    "iMethods": "#f9844a",                   // Coral/orange
    "Divurgent, LLC": "#ffb703",            // Warm yellow
    "EQUIPX": "#219ebc",                    // Blue
    "OmniSource": "#90be6d",                 // Light green
    "SPX Outreach": "#577590",               // Blue‑grey
    "SPX Sales": "#ffafcc",                  // Soft pink
    "SPX Management / Operations": "#8e7dbe", // Purple
    // Vacation uses a distinct yellow tone to differentiate time off
    "Vacation": "#F9C74F",
  };

  // Colour used for collapsed summary bars.  We pick the primary brand
  // green to represent total allocation.  Vacation allocations are still
  // highlighted in yellow within the weekly grid.
  const summaryColor = "#4CA09A";

  // Variables to hold the currently selected reporting period.  By default,
  // these will be initialised in the init() function to cover the
  // entire available data range (October 1 2025 – December 31 2026).  They
  // are updated when the user applies a new date range.
  let selectedStartDate = null;
  let selectedEndDate = null;

  /**
   * Convert an ISO‑8601 week string (e.g. "2025-W40") into the start (Monday)
   * and end (Sunday) dates for that week.  Returns an object with
   * { start: Date, end: Date }.
   *
   * This helper uses a standard algorithm to find the Monday of the ISO week
   * based on the week number and year.  It then adds six days to compute
   * the Sunday of the same week.
   *
   * @param {string} isoWeek - The ISO week string (YYYY-W##).
   */
  function getWeekStartEnd(isoWeek) {
    const parts = isoWeek.split("-W");
    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);
    // Create a date representing the Thursday of the requested week.
    // ISO week definition: week always contains a Thursday.
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7; // Sunday becomes 7
    // Calculate the date of the Monday of week 1
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (jan4Day - 1));
    // Calculate the start of requested week
    const start = new Date(mondayOfWeek1);
    start.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    // End is six days after start
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  /**
   * Given a month string in the form "YYYY-MM", return the first and last
   * calendar dates of that month.  Returns { start: Date, end: Date }.
   *
   * @param {string} monthStr - The month string (YYYY-MM).
   */
  function getMonthStartEnd(monthStr) {
    const [yearStr, monthStrPart] = monthStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStrPart, 10) - 1;
    const start = new Date(year, month, 1);
    // The day 0 of the next month is the last day of the current month
    const end = new Date(year, month + 1, 0);
    return { start, end };
  }

  /**
   * Format a Date object into a human‑readable string (e.g. "Oct 5, 2025").
   * Uses the browser's locale for month names.
   *
   * @param {Date} date - The date to format.
   */
  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /**
   * Determine a suitable text colour (black or white) based on the
   * background colour.  Uses a luminance calculation to ensure
   * readability on both light and dark backgrounds.  Accepts a hex
   * colour string like "#4CA09A" and returns "#000000" or "#FFFFFF".
   *
   * @param {string} hex - The hex code for a colour.
   */
  function getContrastColor(hex) {
    // Strip leading '#'
    const cleaned = hex.replace(/^#/, "");
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    // Calculate luminance
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // Return black for light colours, white for dark colours
    return brightness > 128 ? "#000000" : "#FFFFFF";
  }

  /**
   * Update the period information banner above the summary table.  Displays
   * the selected week or month label and its start/end dates.  For weeks
   * the ISO week string is converted to "YYYY Week ##", and for months
   * the month string is displayed as "YYYY-MM".
   */
  function updatePeriodInfo() {
    const infoEl = document.getElementById("periodInfo");
    if (!infoEl || !selectedStartDate || !selectedEndDate) return;
    // Display the currently applied start and end dates in a friendly format.
    const startLabel = formatDate(selectedStartDate);
    const endLabel = formatDate(selectedEndDate);
    infoEl.textContent = `Period: ${startLabel} – ${endLabel}`;
  }

  /**
   * Export the current summary view to a CSV file.  Creates a table with
   * consultant names, allocations for each project and the total, then
   * triggers a download using a data URI.  The file is named based on
   * the selected period.
   *
   * @param {Object} data - The dataset loaded from localStorage.
   */
  function exportSummaryToCSV(data) {
    // Export the aggregated allocations for the selected date range.  Compute
    // the average allocation per consultant and project across all weeks in
    // the range.  If no dates are selected, do nothing.
    if (!selectedStartDate || !selectedEndDate) return;
    // Determine the week periods within range
    const allWeeks = Object.keys(data.periods.week).sort();
    const weekPeriods = allWeeks.filter((period) => {
      const { start, end } = getWeekStartEnd(period);
      return (
        (start >= selectedStartDate && start <= selectedEndDate) ||
        (end >= selectedStartDate && end <= selectedEndDate) ||
        (start <= selectedStartDate && end >= selectedEndDate)
      );
    });
    const count = weekPeriods.length;
    // Build CSV header
    const header = ["Consultant", ...data.projects, "Total (%)"].join(",");
    const rows = [];
    data.consultants.forEach((consultant) => {
      const aggAlloc = {};
      data.projects.forEach((p) => (aggAlloc[p] = 0));
      // Sum allocations across weeks
      weekPeriods.forEach((period) => {
        const allocations = (data.periods.week[period] && data.periods.week[period][consultant]) || {};
        data.projects.forEach((proj) => {
          const val = allocations[proj] || 0;
          aggAlloc[proj] += val;
        });
      });
      // Compute average
      const row = [consultant];
      let totalAvg = 0;
      data.projects.forEach((proj) => {
        const avg = count > 0 ? aggAlloc[proj] / count : 0;
        row.push(avg.toFixed(2));
        totalAvg += avg;
      });
      row.push(totalAvg.toFixed(2));
      rows.push(row.join(","));
    });
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    // Use a filename containing the date range for clarity
    const startStr = selectedStartDate.toISOString().split("T")[0];
    const endStr = selectedEndDate.toISOString().split("T")[0];
    link.download = `allocation_${startStr}_to_${endStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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
    // Define the overall timeframe for the schedule.  We cover from
    // October 1, 2025 through December 31, 2026.
    const globalStartDate = new Date(2025, 9, 1);
    const globalEndDate = new Date(2026, 11, 31);
    // Generate lists of ISO week strings and month strings across the range.
    const weekPeriods = generateWeekPeriods(globalStartDate, globalEndDate);
    const monthPeriods = generateMonthPeriods(globalStartDate, globalEndDate);
    // Initialize empty allocation objects for each period/consultant.
    weekPeriods.forEach((period) => {
      dataset.periods.week[period] = {};
      consultants.forEach((c) => {
        dataset.periods.week[period][c] = {};
        projects.forEach((p) => {
          dataset.periods.week[period][c][p] = 0;
        });
      });
    });
    monthPeriods.forEach((period) => {
      dataset.periods.month[period] = {};
      consultants.forEach((c) => {
        dataset.periods.month[period][c] = {};
        projects.forEach((p) => {
          dataset.periods.month[period][c][p] = 0;
        });
      });
    });
    /**
     * Convert a Date instance to an ISO week string (YYYY-W##).  This
     * implementation mirrors the ISO‑8601 definition where the first week
     * contains the year's first Thursday.
     */
    function dateToIsoWeek(date) {
      const target = new Date(date.getTime());
      // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
      const dayNr = (date.getDay() + 6) % 7;
      target.setDate(target.getDate() + 3 - dayNr);
      const firstThursday = new Date(target.getFullYear(), 0, 4);
      const firstDayNr = (firstThursday.getDay() + 6) % 7;
      firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
      const weekNo = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
      const year = target.getFullYear();
      return `${year}-W${pad(weekNo, 2)}`;
    }
    /**
     * Convert a Date instance to a YYYY-MM month string.
     */
    function dateToMonthStr(date) {
      return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}`;
    }
    /**
     * Generate an array of ISO week strings between two dates (inclusive).
     */
    function weeksBetween(startDate, endDate) {
      const weeks = [];
      let current = new Date(startDate);
      while (current <= endDate) {
        weeks.push(dateToIsoWeek(current));
        // Move to next week (7 days)
        current.setDate(current.getDate() + 7);
      }
      return Array.from(new Set(weeks));
    }
    /**
     * Generate an array of month strings between two dates (inclusive).
     */
    function monthsBetween(startDate, endDate) {
      const months = [];
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      let current = new Date(start);
      while (current <= end) {
        months.push(dateToMonthStr(current));
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    }
    // Predefined schedule assignments.  Each entry specifies which
    // consultant works on which project between two calendar dates and
    // the percentage allocation.  You can modify or extend this list
    // to prepopulate the dashboard with a realistic workload.
    // Define assignments based on the user's provided schedule.  Each
    // entry represents a consultant working on a project between two
    // calendar dates at a given percentage.  The date strings are
    // ISO‑formatted (YYYY‑MM‑DD) and inclusive at both ends.
    const assignments = [
      // Stand Together: Ginny 20%, Kit 75%, Jeff 5%, 20 Oct 2025 – 20 Nov 2025
      { consultant: "Ginny", project: "Stand Together", start: "2025-10-20", end: "2025-11-20", percent: 20 },
      { consultant: "Kit", project: "Stand Together", start: "2025-10-20", end: "2025-11-20", percent: 75 },
      { consultant: "Jeff", project: "Stand Together", start: "2025-10-20", end: "2025-11-20", percent: 5 },
      // EisnerAmper: Lauren 25%, Regina 25%, Alzer 5%, 1 Oct 2025 – 8 Jun 2026
      { consultant: "Lauren", project: "EisnerAmper", start: "2025-10-01", end: "2026-06-08", percent: 25 },
      { consultant: "Regina", project: "EisnerAmper", start: "2025-10-01", end: "2026-06-08", percent: 25 },
      { consultant: "Alzer", project: "EisnerAmper", start: "2025-10-01", end: "2026-06-08", percent: 5 },
      // OPOS, Inc.: Kristin 70%, Chase 70%, Alzer 10%, 1 Oct 2025 – 8 Jun 2026
      { consultant: "Kristin", project: "OPOS, Inc.", start: "2025-10-01", end: "2026-06-08", percent: 70 },
      { consultant: "Chase", project: "OPOS, Inc.", start: "2025-10-01", end: "2026-06-08", percent: 70 },
      { consultant: "Alzer", project: "OPOS, Inc.", start: "2025-10-01", end: "2026-06-08", percent: 10 },
      // Omega Healthcare Management Services: Jeff 60%, Ginny 30%, Amanda 25%, Ingrid 20%, Reese 5%, Johanne 5%, 20 Oct 2025 – 15 Feb 2026
      { consultant: "Jeff", project: "Omega Healthcare Management Services", start: "2025-10-20", end: "2026-02-15", percent: 60 },
      { consultant: "Ginny", project: "Omega Healthcare Management Services", start: "2025-10-20", end: "2026-02-15", percent: 30 },
      { consultant: "Amanda", project: "Omega Healthcare Management Services", start: "2025-10-20", end: "2026-02-15", percent: 25 },
      { consultant: "Ingrid", project: "Omega Healthcare Management Services", start: "2025-10-20", end: "2026-02-15", percent: 20 },
      { consultant: "Reese", project: "Omega Healthcare Management Services", start: "2025-10-20", end: "2026-02-15", percent: 5 },
      { consultant: "Johanne", project: "Omega Healthcare Management Services", start: "2025-10-20", end: "2026-02-15", percent: 5 },
      // iMethods: Jeff 10%, Ingrid 2%, Reese 5%, 1 Oct 2025 – 31 Dec 2025
      { consultant: "Jeff", project: "iMethods", start: "2025-10-01", end: "2025-12-31", percent: 10 },
      { consultant: "Ingrid", project: "iMethods", start: "2025-10-01", end: "2025-12-31", percent: 2 },
      { consultant: "Reese", project: "iMethods", start: "2025-10-01", end: "2025-12-31", percent: 5 },
      // Divurgent, LLC: Michael 10%, Reese 5%, Jeff 10%, 1 Oct 2025 – 31 Jan 2026
      { consultant: "Michael", project: "Divurgent, LLC", start: "2025-10-01", end: "2026-01-31", percent: 10 },
      { consultant: "Reese", project: "Divurgent, LLC", start: "2025-10-01", end: "2026-01-31", percent: 5 },
      { consultant: "Jeff", project: "Divurgent, LLC", start: "2025-10-01", end: "2026-01-31", percent: 10 },
      // EQUIPX: Reese 5%, 1 Oct 2025 – 31 Dec 2025
      { consultant: "Reese", project: "EQUIPX", start: "2025-10-01", end: "2025-12-31", percent: 5 },
      // OmniSource: Ginny 30%, Lauren 5%, Ingrid 15%, Reese 10%, Shaun 10%, 3 Nov 2025 – 10 Jan 2026
      { consultant: "Ginny", project: "OmniSource", start: "2025-11-03", end: "2026-01-10", percent: 30 },
      { consultant: "Lauren", project: "OmniSource", start: "2025-11-03", end: "2026-01-10", percent: 5 },
      { consultant: "Ingrid", project: "OmniSource", start: "2025-11-03", end: "2026-01-10", percent: 15 },
      { consultant: "Reese", project: "OmniSource", start: "2025-11-03", end: "2026-01-10", percent: 10 },
      { consultant: "Shaun", project: "OmniSource", start: "2025-11-03", end: "2026-01-10", percent: 10 },
      // SPX Outreach: Lauren 15%, Regina 15%, Alzer 15%, 1 Oct 2025 – 31 Dec 2026
      { consultant: "Lauren", project: "SPX Outreach", start: "2025-10-01", end: "2026-12-31", percent: 15 },
      { consultant: "Regina", project: "SPX Outreach", start: "2025-10-01", end: "2026-12-31", percent: 15 },
      { consultant: "Alzer", project: "SPX Outreach", start: "2025-10-01", end: "2026-12-31", percent: 15 },
      // SPX Sales: Reese 10%, Ingrid 5%, 1 Oct 2025 – 31 Dec 2026
      { consultant: "Reese", project: "SPX Sales", start: "2025-10-01", end: "2026-12-31", percent: 10 },
      { consultant: "Ingrid", project: "SPX Sales", start: "2025-10-01", end: "2026-12-31", percent: 5 },
      // SPX Management / Operations: no specific assignments provided.  Leave
      // allocations at zero but set a default date range matching the global
      // timeframe.  This project acts as a placeholder and can be edited
      // later by the user.
      // No assignments added for this project.
    ];
    // Apply each assignment across the relevant weeks and months
    assignments.forEach((item) => {
      const startDate = new Date(item.start);
      const endDate = new Date(item.end);
      // Weeks
      const isoWeeks = weeksBetween(startDate, endDate);
      isoWeeks.forEach((week) => {
        if (!dataset.periods.week[week]) {
          // Ensure period exists within the global range
          dataset.periods.week[week] = {};
          consultants.forEach((c) => {
            dataset.periods.week[week][c] = {};
          });
        }
        if (!dataset.periods.week[week][item.consultant]) {
          dataset.periods.week[week][item.consultant] = {};
        }
        dataset.periods.week[week][item.consultant][item.project] = item.percent;
      });
      // Months
      const monthList = monthsBetween(startDate, endDate);
      monthList.forEach((monthStr) => {
        if (!dataset.periods.month[monthStr]) {
          dataset.periods.month[monthStr] = {};
          consultants.forEach((c) => {
            dataset.periods.month[monthStr][c] = {};
          });
        }
        if (!dataset.periods.month[monthStr][item.consultant]) {
          dataset.periods.month[monthStr][item.consultant] = {};
        }
        dataset.periods.month[monthStr][item.consultant][item.project] = item.percent;
      });
      // Record project metadata (start and end) if not yet set or if this
      // assignment extends beyond existing bounds.
      if (!dataset.projectsInfo[item.project]) {
        dataset.projectsInfo[item.project] = {
          start: dateToIsoWeek(startDate),
          end: dateToIsoWeek(endDate),
        };
      } else {
        // Compare and adjust
        const current = dataset.projectsInfo[item.project];
        const currentStartIndex = weekPeriods.indexOf(current.start);
        const currentEndIndex = weekPeriods.indexOf(current.end);
        const newStartIndex = weekPeriods.indexOf(dateToIsoWeek(startDate));
        const newEndIndex = weekPeriods.indexOf(dateToIsoWeek(endDate));
        if (newStartIndex < currentStartIndex) current.start = dateToIsoWeek(startDate);
        if (newEndIndex > currentEndIndex) current.end = dateToIsoWeek(endDate);
      }
    });
    // For any project without explicit assignments, set default metadata covering the global range
    projects.forEach((proj) => {
      if (!dataset.projectsInfo[proj]) {
        dataset.projectsInfo[proj] = {
          start: weekPeriods[0],
          end: weekPeriods[weekPeriods.length - 1],
        };
      }
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
    // Determine whether the stored dataset matches the current schema.  If the
    // project list has changed (e.g. missing "Vacation"), we discard the old
    // data and regenerate.  This ensures that new features such as vacation
    // entries and predefined schedules are incorporated.
    // Determine whether the stored dataset matches the current schema.  If
    // any of the required projects or consultants are missing (for
    // example, after adding new names), regenerate the dataset.  This
    // ensures that assignments defined above are reflected in the stored
    // data.
    let needsRegeneration = false;
    if (!data || !data.projects || !Array.isArray(data.projects)) {
      needsRegeneration = true;
    } else {
      // Check for missing projects
      projects.forEach((proj) => {
        if (!data.projects.includes(proj)) needsRegeneration = true;
      });
      // Check for missing consultants
      if (data.consultants) {
        consultants.forEach((c) => {
          if (!data.consultants.includes(c)) needsRegeneration = true;
        });
      } else {
        needsRegeneration = true;
      }
    }
    if (needsRegeneration) {
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
    const summaryEl = document.getElementById("summaryTable");
    summaryEl.innerHTML = "";
    // Only render summary if a date range is selected
    if (!selectedStartDate || !selectedEndDate) return;
    // Update period info banner to reflect selected range
    updatePeriodInfo();
    // Render the weekly grid for the selected range
    renderWeeklyGrid(data);
    // Determine week periods within range
    const allWeeks = Object.keys(data.periods.week).sort();
    const weekPeriods = allWeeks.filter((period) => {
      const { start, end } = getWeekStartEnd(period);
      return (
        (start >= selectedStartDate && start <= selectedEndDate) ||
        (end >= selectedStartDate && end <= selectedEndDate) ||
        (start <= selectedStartDate && end >= selectedEndDate)
      );
    });
    // For each consultant, aggregate allocations across the selected weeks
    data.consultants.forEach((consultant) => {
      const aggAlloc = {};
      let count = 0;
      weekPeriods.forEach((period) => {
        const allocations = (data.periods.week[period] && data.periods.week[period][consultant]) || {};
        data.projects.forEach((proj) => {
          const val = allocations[proj] || 0;
          aggAlloc[proj] = (aggAlloc[proj] || 0) + val;
        });
        count++;
      });
      // Convert sum to average percentage per week (to keep within 0–100)
      const avgAlloc = {};
      let total = 0;
      data.projects.forEach((proj) => {
        const avg = count > 0 ? aggAlloc[proj] / count : 0;
        avgAlloc[proj] = avg;
        total += avg;
      });
      const row = document.createElement("div");
      row.className = "consultant-row";
      // Name cell
      const nameCell = document.createElement("div");
      nameCell.className = "consultant-name";
      nameCell.textContent = consultant;
      row.appendChild(nameCell);
      // Allocation bar cell (collapsed view).  Show a single green bar
      // representing the total average allocation across all projects.  The
      // bar's width corresponds to the total (capped at 100%).  We use the
      // primary brand green for the bar colour.  Detailed project colours
      // are only shown when the row is expanded.
      const bar = document.createElement("div");
      bar.className = "allocation-bar";
      bar.style.position = "relative";
      const barSeg = document.createElement("div");
      barSeg.className = "allocation-segment";
      const barWidth = total > 0 ? Math.min(100, total) : 0;
      barSeg.style.width = barWidth + "%";
      barSeg.style.backgroundColor = summaryColor;
      bar.appendChild(barSeg);
      // Fill remaining space with light grey if total < 100
      if (barWidth < 100) {
        const emptySeg = document.createElement("div");
        emptySeg.className = "allocation-segment allocation-empty";
        emptySeg.style.width = (100 - barWidth) + "%";
        bar.appendChild(emptySeg);
      }
      // Overlay total percentage text on top of the bar
      const overlay = document.createElement("span");
      overlay.textContent = Math.round(total) + "%";
      overlay.style.position = "absolute";
      overlay.style.left = "50%";
      overlay.style.top = "50%";
      overlay.style.transform = "translate(-50%, -50%)";
      overlay.style.fontSize = "0.75rem";
      overlay.style.fontWeight = "bold";
      // Choose text colour based on how filled the bar is
      overlay.style.color = barWidth > 50 ? "#ffffff" : "#000000";
      bar.appendChild(overlay);
      row.appendChild(bar);
      summaryEl.appendChild(row);
      // Build details section for expanded view
      const details = document.createElement("div");
      details.className = "details";
      const table = document.createElement("table");
      table.className = "details-table";
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      ["Project", "Average Allocation (%)"].forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      data.projects.forEach((proj) => {
        const tr = document.createElement("tr");
        const tdProj = document.createElement("td");
        tdProj.textContent = proj;
        const tdAlloc = document.createElement("td");
        tdAlloc.textContent = avgAlloc[proj] ? avgAlloc[proj].toFixed(2) : 0;
        tr.appendChild(tdProj);
        tr.appendChild(tdAlloc);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      details.appendChild(table);
      summaryEl.appendChild(details);
      // Toggle details on click
      row.addEventListener("click", () => {
        const expanded = row.classList.toggle("expanded");
        details.style.display = expanded ? "block" : "none";
      });
    });
  }

  /**
   * Render a weekly grid showing allocations per consultant across all weeks
   * within the selected year.  Each column corresponds to a week (e.g.
   * "Oct 31"), and each cell contains coloured segments proportional to
   * the allocation percentages for that week.  The grid appears only
   * when the view mode is set to "week"; otherwise it is hidden.
   *
   * @param {Object} data - The dataset loaded from storage.
   */
  function renderWeeklyGrid(data) {
    const container = document.getElementById("weeklyGridContainer");
    if (!container) return;
    const viewMode = document.getElementById("viewModeSelect").value;
    // Only show grid for weekly view
    if (viewMode !== "week") {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }
    container.style.display = "block";
    container.innerHTML = "";
    // Determine the list of week periods to display based on the selected
    // start and end dates.  If no dates are selected, do nothing.
    if (!selectedStartDate || !selectedEndDate) return;
    // Collect all week keys within the dataset and sort them chronologically
    const allWeeks = Object.keys(data.periods.week).sort();
    // Filter to weeks that fall within the selected date range
    const weekPeriods = allWeeks.filter((period) => {
      const { start, end } = getWeekStartEnd(period);
      // Week overlaps range if its start or end lies within, or if it fully
      // surrounds the range.  We'll check for any overlap.
      return (
        (start >= selectedStartDate && start <= selectedEndDate) ||
        (end >= selectedStartDate && end <= selectedEndDate) ||
        (start <= selectedStartDate && end >= selectedEndDate)
      );
    });
    if (weekPeriods.length === 0) return;
    const table = document.createElement("table");
    table.className = "weekly-grid-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    // First header cell empty (for consultant names)
    const blankTh = document.createElement("th");
    blankTh.textContent = "Consultant";
    headRow.appendChild(blankTh);
    // Add a header for each week.  Instead of the ISO week start (Monday),
    // display the end‑of‑work week date (typically a Friday).  Many
    // organisations consider Friday the final working day, so labels like
    // "Oct 31" and "Nov 07" correspond to the Friday of each ISO week.
    weekPeriods.forEach((period) => {
      const th = document.createElement("th");
      const { start } = getWeekStartEnd(period);
      // Compute the Friday date by adding 4 days to the Monday start.
      const friday = new Date(start);
      friday.setDate(start.getDate() + 4);
      th.textContent = friday.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    data.consultants.forEach((consultant) => {
      const tr = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.textContent = consultant;
      nameTd.className = "consultant-name";
      tr.appendChild(nameTd);
      weekPeriods.forEach((period) => {
        const td = document.createElement("td");
        const allocations = (data.periods.week[period] && data.periods.week[period][consultant]) || {};
        const total = Object.values(allocations).reduce((sum, v) => sum + v, 0);
        if (total > 0) {
          const factor = Math.min(1, 100 / total);
          const bar = document.createElement("div");
          bar.className = "cell-bar";
          bar.style.position = "relative";
          data.projects.forEach((proj) => {
            const value = allocations[proj] || 0;
            if (value > 0) {
              const seg = document.createElement("div");
              seg.className = "cell-segment";
              seg.style.width = (value * factor) + "%";
              seg.style.backgroundColor = projectColors[proj];
              // Add percentage label within the segment
              seg.textContent = value + "%";
              seg.style.fontSize = "0.6rem";
              seg.style.color = getContrastColor(projectColors[proj]);
              seg.style.display = "flex";
              seg.style.alignItems = "center";
              seg.style.justifyContent = "center";
              bar.appendChild(seg);
            }
          });
          td.appendChild(bar);
        } else {
          // Show a light grey bar to indicate no assignment
          const emptyBar = document.createElement("div");
          emptyBar.className = "cell-bar";
          const emptySeg = document.createElement("div");
          emptySeg.className = "cell-segment";
          emptySeg.style.width = "100%";
          emptySeg.style.backgroundColor = "#f5f5f5";
          emptyBar.appendChild(emptySeg);
          td.appendChild(emptyBar);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Initialize the dashboard on page load.
  function init() {
    const data = loadData();
    // Event listener for view mode (week/month).  Changing the view
    // re-renders the summary and grid with the selected granularity.
    const viewModeSelect = document.getElementById("viewModeSelect");
    viewModeSelect.addEventListener("change", () => {
      renderSummary(data);
    });
    // Set up date inputs with default values covering the full range of the dataset
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    // Determine global start and end dates based on dataset periods
    const weekKeys = Object.keys(data.periods.week).sort();
    if (weekKeys.length > 0) {
      const firstWeek = weekKeys[0];
      const lastWeek = weekKeys[weekKeys.length - 1];
      const { start: firstStart } = getWeekStartEnd(firstWeek);
      const { end: lastEnd } = getWeekStartEnd(lastWeek);
      // Set initial selected dates
      selectedStartDate = new Date(firstStart);
      selectedEndDate = new Date(lastEnd);
      // Populate input values (YYYY-MM-DD)
      startInput.value = firstStart.toISOString().split("T")[0];
      endInput.value = lastEnd.toISOString().split("T")[0];
    }
    // Apply period button sets the selected dates and triggers render
    const applyBtn = document.getElementById("applyPeriodBtn");
    applyBtn.addEventListener("click", () => {
      const startVal = startInput.value;
      const endVal = endInput.value;
      if (startVal && endVal) {
        const sDate = new Date(startVal);
        const eDate = new Date(endVal);
        if (sDate > eDate) {
          alert("Start date must be before end date");
          return;
        }
        selectedStartDate = sDate;
        selectedEndDate = eDate;
        renderSummary(data);
      }
    });
    // Export button triggers CSV download of current summary view
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        exportSummaryToCSV(data);
      });
    }
    // Initial render using default dates
    renderSummary(data);
  }

  // Wait for DOM to load before initializing
  document.addEventListener("DOMContentLoaded", init);
})();