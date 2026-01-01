const API_BASE_URL = "https://carescore-ai-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  loadAnalysis();

  document
    .getElementById("downloadBtn")
    ?.addEventListener("click", downloadPDF);
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
});

function checkAuth() {
  if (!localStorage.getItem("careScoreToken")) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function getReportId() {
  return new URLSearchParams(window.location.search).get("id");
}

async function loadAnalysis() {
  const reportId = getReportId();
  if (!reportId) return;

  try {
    const res = await fetch(`${API_BASE_URL}/history/${reportId}`);
    const json = await res.json();

    if (!json.success) {
      alert("Failed to load report");
      return;
    }

    const report = json.data;
    const analysis = report.analysis_data || {};
    const tests = report.confirmed_data?.tests || [];

    updateScore(analysis.care_score || 0);

    document.getElementById("aiExplanation").innerHTML =
      analysis.explanation?.replace(/\n/g, "<br>") ||
      "Analysis pending. Please refresh.";

    renderDeviationTags(analysis.deviations || []);
    renderPlotlyChart(tests);
    renderResultsTable(tests);
  } catch (err) {
    console.error(err);
  }
}

function updateScore(score) {
  const circle = document.getElementById("scoreCircle");
  const text = document.getElementById("scoreText");
  const label = document.getElementById("scoreLabel");

  text.textContent = score;

  let status = "Needs Attention";
  let cls = "warning";

  if (score >= 80) {
    status = "Excellent Health";
    cls = "good";
  } else if (score < 50) {
    status = "Critical Attention";
    cls = "bad";
  }

  circle.className = `circle ${cls}`;
  label.textContent = status;

  setTimeout(() => {
    circle.setAttribute("stroke-dasharray", `${score}, 100`);
  }, 100);
}

function renderDeviationTags(deviations) {
  const container = document.getElementById("deviationTags");
  container.innerHTML = "";

  if (!deviations.length) {
    container.innerHTML = `<span class="tag muted">No deviations detected</span>`;
    return;
  }

  deviations.forEach((d) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = d;
    container.appendChild(tag);
  });
}

function renderPlotlyChart(tests) {
  const labels = [];
  const values = [];

  tests.forEach((t) => {
    const v = parseFloat(t.value);
    if (!isNaN(v)) {
      labels.push(t.test_name.replace(/_/g, " ").toUpperCase());
      values.push(v);
    }
  });

  if (!labels.length) return;

  Plotly.newPlot(
    "healthChart",
    [
      {
        x: labels,
        y: values,
        type: "bar",
      },
    ],
    {
      margin: { t: 20 },
      yaxis: { title: "Value" },
      xaxis: { tickangle: -35 },
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderResultsTable(tests) {
  const tbody = document.getElementById("resultsTableBody");
  tbody.innerHTML = "";

  tests.forEach((t) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${t.test_name.replace(/_/g, " ")}</td>
      <td><b>${t.value}</b></td>
      <td>${t.unit || "—"}</td>
      <td>${t.reference_range || "—"}</td>
    `;

    tbody.appendChild(tr);
  });

  if (!tests.length) {
    tbody.innerHTML = `<tr><td colspan="5">No test data available</td></tr>`;
  }
}

function downloadPDF() {
  const reportId = getReportId();
  if (reportId) {
    window.open(`${API_BASE_URL}/download/pdf/${reportId}`, "_blank");
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}
