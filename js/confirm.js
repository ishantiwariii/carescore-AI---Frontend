const API_BASE_URL = "https://carescore-ai-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  loadReportData();
  setupEventListeners();
});

function checkAuth() {
  if (!localStorage.getItem("careScoreToken")) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function getReportId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
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
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/history/${reportId}`);
    const result = await res.json();

    if (!result.success) {
      showError("Failed to load report data.");
      return;
    }

    const raw = result.data.raw_data || {};
    container.innerHTML = "";

    if (raw.lab) {
      addSectionHeader("Lab Information");
      Object.entries(raw.lab).forEach(([k, v]) => {
        addKeyValueRow(`lab.${k}`, v);
      });
    }

    if (raw.patient) {
      addSectionHeader("Patient Information");
      Object.entries(raw.patient).forEach(([k, v]) => {
        addKeyValueRow(`patient.${k}`, v);
      });
    }

    if (Array.isArray(raw.tests)) {
      addSectionHeader("Test Results");
      raw.tests.forEach((test) => addTestRow(test));
    }

    if (!raw.lab && !raw.patient && !raw.tests) {
      addSectionHeader("Extracted Data");
      addKeyValueRow("", "");
    }
  } catch (err) {
    console.error(err);
    showError("Server connection error.");
  }
}

function addSectionHeader(title) {
  const container = document.getElementById("fieldsContainer");
  const h = document.createElement("h3");
  h.className = "section-header";
  h.textContent = title;
  container.appendChild(h);
}

function addKeyValueRow(key = "", value = "") {
  const container = document.getElementById("fieldsContainer");
  const div = document.createElement("div");
  div.className = "data-row";

  div.innerHTML = `
    <input class="input-name" value="${key}" placeholder="field name">
    <input class="input-value" value="${value}" placeholder="value">
    <button class="delete-btn">×</button>
  `;

  div.querySelector(".delete-btn").onclick = () => div.remove();
  container.appendChild(div);
}

function addTestRow(test = {}) {
  const container = document.getElementById("fieldsContainer");
  const div = document.createElement("div");
  div.className = "data-row test-row";

  div.innerHTML = `
    <input class="input-name" value="${
      test.test_name || ""
    }" placeholder="Test name">
    <input class="input-value" value="${test.value || ""}" placeholder="Value">
    <input class="input-unit" value="${test.unit || ""}" placeholder="Unit">
    <input class="input-range" value="${
      test.reference_range || ""
    }" placeholder="Reference range">
    <button class="delete-btn">×</button>
  `;

  div.querySelector(".delete-btn").onclick = () => div.remove();
  container.appendChild(div);
}

function setupEventListeners() {
  document.getElementById("addRowBtn").addEventListener("click", () => {
    addTestRow();
  });

  document
    .getElementById("confirmBtn")
    .addEventListener("click", handleConfirm);

  document.getElementById("cancelBtn").addEventListener("click", () => {
    if (confirm("Discard this report?")) {
      window.location.href = "dashboard.html";
    }
  });
}

async function handleConfirm() {
  const reportId = getReportId();
  const rows = document.querySelectorAll(".data-row");

  const confirmedData = {
    lab: {},
    patient: {},
    tests: [],
  };

  let hasError = false;

  rows.forEach((row) => {
    if (row.classList.contains("test-row")) {
      const name = row.querySelector(".input-name").value.trim();
      const value = row.querySelector(".input-value").value.trim();
      const unit = row.querySelector(".input-unit").value.trim();
      const range = row.querySelector(".input-range").value.trim();

      if (!name || !value) {
        hasError = true;
        row.style.border = "1px solid red";
        return;
      }

      confirmedData.tests.push({
        test_name: name.toLowerCase().replace(/\s+/g, "_"),
        value,
        unit,
        reference_range: range,
      });
    } else {
      const key = row.querySelector(".input-name").value.trim();
      const value = row.querySelector(".input-value").value.trim();

      if (!key || !value) return;

      if (key.startsWith("lab.")) {
        confirmedData.lab[key.replace("lab.", "")] = value;
      } else if (key.startsWith("patient.")) {
        confirmedData.patient[key.replace("patient.", "")] = value;
      }
    }
  });

  if (hasError) {
    showError("Please complete or delete invalid rows.");
    return;
  }

  if (confirmedData.tests.length === 0) {
    showError("Please add at least one test result.");
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

    if (result.success) {
      window.location.href = `analysis.html?id=${reportId}`;
    } else {
      showError(result.error || "Analysis failed.");
      document.getElementById("processingOverlay").style.display = "none";
    }
  } catch (err) {
    console.error(err);
    showError("Server error during analysis.");
    document.getElementById("processingOverlay").style.display = "none";
  }
}
