const API_BASE_URL = "https://carescore-ai-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadReportData();
  setupEventListeners();
});

function checkAuth() {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
  }
}

function getReportId() {
  return new URLSearchParams(window.location.search).get("id");
}

function showError(msg) {
  const el = document.getElementById("statusMessage");
  el.textContent = msg;
  el.style.display = "block";
}

async function loadReportData() {
  const reportId = getReportId();
  const container = document.getElementById("fieldsContainer");

  if (!reportId) {
    showError("Invalid report.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/history/${reportId}`);
    const result = await res.json();

    if (!result.success || !result.data?.raw_data) {
      showError("No extracted data available.");
      return;
    }

    const raw = result.data.raw_data;
    container.innerHTML = "";

    if (raw.lab) {
      addSectionHeader("Lab Information");
      Object.entries(raw.lab).forEach(([k, v]) =>
        addKeyValueRow(`lab.${k}`, v)
      );
    }

    if (raw.patient) {
      addSectionHeader("Patient Information");
      Object.entries(raw.patient).forEach(([k, v]) =>
        addKeyValueRow(`patient.${k}`, v)
      );
    }

    if (Array.isArray(raw.tests) && raw.tests.length > 0) {
      addSectionHeader("Test Results");
      raw.tests.forEach(addTestRow);
    } else {
      showError("No test data extracted.");
    }
  } catch (err) {
    console.error(err);
    showError("Server connection error.");
  }
}

function addSectionHeader(title) {
  const h = document.createElement("h3");
  h.className = "section-header";
  h.textContent = title;
  document.getElementById("fieldsContainer").appendChild(h);
}

function addKeyValueRow(key = "", value = "") {
  const div = document.createElement("div");
  div.className = "data-row";
  div.innerHTML = `
    <input class="input-name" value="${key}">
    <input class="input-value" value="${value}">
    <button class="delete-btn">×</button>
  `;
  div.querySelector(".delete-btn").onclick = () => div.remove();
  document.getElementById("fieldsContainer").appendChild(div);
}

function addTestRow(test = {}) {
  const div = document.createElement("div");
  div.className = "data-row test-row";
  div.innerHTML = `
    <input class="input-name" value="${test.test_name || ""}">
    <input class="input-value" value="${test.value || ""}">
    <input class="input-unit" value="${test.unit || ""}">
    <input class="input-range" value="${test.reference_range || ""}">
    <button class="delete-btn">×</button>
  `;
  div.querySelector(".delete-btn").onclick = () => div.remove();
  document.getElementById("fieldsContainer").appendChild(div);
}

function setupEventListeners() {
  document
    .getElementById("confirmBtn")
    .addEventListener("click", handleConfirm);

  document.getElementById("cancelBtn").addEventListener("click", () => {
    if (confirm("Discard this report?")) {
      window.location.href = "dashboard.html";
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html";
    });
  }
}

async function handleConfirm() {
  const reportId = getReportId();
  const userId = localStorage.getItem("user_id");

  if (!reportId) {
    showError("Invalid report ID.");
    return;
  }

  if (!userId) {
    showError("Session expired. Please log in again.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  const rows = document.querySelectorAll(".data-row");
  const confirmedData = { lab: {}, patient: {}, tests: [] };
  let hasError = false;

  rows.forEach((row) => {
    const nameInput = row.querySelector(".input-name");
    const valueInput = row.querySelector(".input-value");

    if (!nameInput || !valueInput) return;

    const name = nameInput.value.trim();
    const value = valueInput.value.trim();

    if (!name || !value) return;

    if (row.classList.contains("test-row")) {
      const unit = row.querySelector(".input-unit").value.trim();
      const range = row.querySelector(".input-range").value.trim() || null;

      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        hasError = true;
        row.style.border = "1px solid red";
        return;
      }

      confirmedData.tests.push({
        test_name: name.toLowerCase().replace(/\s+/g, "_"),
        value: numericValue,
        unit,
        reference_range: range,
      });
      return;
    }

    if (name.startsWith("patient.")) {
      confirmedData.patient[name.replace("patient.", "")] = value;
      return;
    }

    if (name.startsWith("lab.")) {
      confirmedData.lab[name.replace("lab.", "")] = value;
    }
  });

  if (hasError || confirmedData.tests.length === 0) {
    showError("Please fix highlighted fields before continuing.");
    return;
  }

  document.getElementById("processingOverlay").style.display = "flex";

  try {
    const res = await fetch(`${API_BASE_URL}/analysis/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_id: reportId,
        confirmed_data: confirmedData,
      }),
    });

    const result = await res.json();

    if (result.success === false && result.error === "QUOTA_EXHAUSTED") {
      showError(
        "AI quota exhausted. Analysis cannot continue right now. Please try again later."
      );
      document.getElementById("processingOverlay").style.display = "none";
      return;
    }

    if (!result.success) {
      showError(result.message || result.error || "Analysis failed.");
      document.getElementById("processingOverlay").style.display = "none";
      return;
    }

    window.location.href = `analysis.html?id=${reportId}`;
  } catch (err) {
    console.error(err);
    showError("Server error during analysis.");
    document.getElementById("processingOverlay").style.display = "none";
  }
}
