const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  loadReportData();
  setupEventListeners();
});
const aiWarning = localStorage.getItem("ai_warning");
if (aiWarning) {
  showError(aiWarning);
  localStorage.removeItem("ai_warning");
}
// 1. Get Report ID from URL
function getReportId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function checkAuth() {
  if (!localStorage.getItem("careScoreToken")) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// 2. Load Data from Backend
async function loadReportData() {
  const reportId = getReportId();
  const container = document.getElementById("fieldsContainer");

  if (!reportId) {
    window.location.href = "dashboard.html"; // No ID, go back
    return;
  }

  try {
    // Fetch the existing report to get the raw AI data
    const response = await fetch(`${API_BASE_URL}/history/${reportId}`);
    const result = await response.json();

    if (result.success) {
      const rawData = result.data.raw_data || {};

      // Clear loading text
      container.innerHTML = "";

      // Populate Rows
      if (Object.keys(rawData).length === 0) {
        // If AI found nothing, add one empty row
        addRow("", "");
      } else {
        for (const [key, value] of Object.entries(rawData)) {
          addRow(key, value);
        }
      }
    } else {
      showError("Failed to load report data.");
    }
  } catch (error) {
    console.error(error);
    showError("Server connection error.");
  }
}

// 3. Helper: Create a Row HTML
function addRow(key = "", value = "") {
  const container = document.getElementById("fieldsContainer");
  const div = document.createElement("div");
  div.className = "data-row";

  // Normalize key for display (remove underscores)
  const displayKey = key.replace(/_/g, " ");

  div.innerHTML = `
        <input type="text" placeholder="Test Name (e.g. Hemoglobin)" value="${displayKey}" class="input-name">
        <input type="text" placeholder="Value (e.g. 13.5)" value="${value}" class="input-value">
        <button class="delete-btn" title="Remove row">×</button>
    `;

  // Add Delete Logic
  div.querySelector(".delete-btn").addEventListener("click", () => {
    div.remove();
  });

  container.appendChild(div);
}

// 4. Setup Event Listeners
function setupEventListeners() {
  // Add Row Button
  document
    .getElementById("addRowBtn")
    .addEventListener("click", () => addRow());

  // Confirm Button
  document
    .getElementById("confirmBtn")
    .addEventListener("click", handleConfirm);

  // Cancel Button
  document.getElementById("cancelBtn").addEventListener("click", () => {
    if (confirm("Discard this report?")) {
      window.location.href = "dashboard.html";
    }
  });
}

// 5. Submit Logic (The "Analyze" Step)
async function handleConfirm() {
  const reportId = getReportId();
  const rows = document.querySelectorAll(".data-row");
  const confirmedData = {};
  let hasError = false;

  // A. Collect Data
  rows.forEach((row) => {
    const name = row.querySelector(".input-name").value.trim();
    const val = row.querySelector(".input-value").value.trim();

    if (name && val) {
      // Convert to snake_case for backend consistency
      const cleanName = name.toLowerCase().replace(/\s+/g, "_");
      confirmedData[cleanName] = val;
    } else if (name || val) {
      // Warn if one field is filled but not the other
      row.style.border = "1px solid red";
      hasError = true;
    }
  });

  if (hasError) {
    showError("Please complete all fields or delete empty rows.");
    return;
  }

  if (Object.keys(confirmedData).length === 0) {
    showError("Please add at least one test result.");
    return;
  }

  // B. Send to Backend
  document.getElementById("processingOverlay").style.display = "flex";

  try {
    const response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_id: reportId,
        confirmed_data: confirmedData,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Success! Redirect to Analysis Page
      window.location.href = `analysis.html?id=${reportId}`;
    } else {
      showError(result.error || "Analysis failed.");
      document.getElementById("processingOverlay").style.display = "none";
    }
  } catch (error) {
    console.error(error);
    showError("Server error during analysis.");
    document.getElementById("processingOverlay").style.display = "none";
  }
}

function showError(msg) {
  const el = document.getElementById("statusMessage");
  el.textContent = msg;
  el.style.display = "block";
}
