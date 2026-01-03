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

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
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

    const score = Number(analysis.care_score);
    updateScore(isNaN(score) ? 0 : score);

    let explanationText = "Analysis pending. Please refresh.";

    if (typeof analysis.explanation === "string") {
      explanationText = analysis.explanation;
    } else if (analysis.explanation?.content) {
      explanationText = analysis.explanation.content;
    } else if (analysis.explanation?.summary) {
      explanationText = analysis.explanation.summary;
    }

    explanationText = explanationText
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");

    document.getElementById("aiExplanation").innerHTML = explanationText;

    let deviationList = [];

    if (Array.isArray(analysis.deviations)) {
      deviationList = analysis.deviations;
    } else if (analysis.deviations && typeof analysis.deviations === "object") {
      deviationList = Object.entries(analysis.deviations)
        .filter(([_, status]) => status !== "normal")
        .map(([test, status]) => `${test.replace(/_/g, " ")} (${status})`);
    }

    renderDeviationTags(deviationList);

    renderPlotlyChart(tests);
    renderResultsTable(tests);
  } catch (err) {
    console.error("Analysis load failed:", err);
  }
}

function updateScore(score) {
  const circle = document.getElementById("scoreCircle");
  const text = document.getElementById("scoreText");
  const label = document.getElementById("scoreLabel");

  const normalized = Math.max(0, Math.min(100, Number(score)));
  text.textContent = normalized;

  let status = "Needs Attention";
  let cls = "warning";

  if (normalized >= 80) {
    status = "Excellent Health";
    cls = "good";
  } else if (normalized < 50) {
    status = "Critical Attention";
    cls = "bad";
  }

  circle.classList.remove("good", "warning", "bad");
  circle.classList.add(cls);

  label.textContent = status;

  circle.style.strokeDasharray = "0, 100";
  setTimeout(() => {
    circle.style.strokeDasharray = `${normalized}, 100`;
  }, 50);
}

function renderDeviationTags(deviations) {
  const container = document.getElementById("deviationTags");
  container.innerHTML = "";

  if (!deviations.length) return;

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
    if (!isNaN(v) && v > 0) { // log scale requires > 0
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
        hovertemplate: "%{x}<br>Value: %{y}<extra></extra>",
      },
    ],
    {
      margin: { t: 20 },
      yaxis: {
        title: "Value (log scale)",
        type: "log",
        autorange: true,
      },
      xaxis: { tickangle: -35 },
    },
    { displayModeBar: false, responsive: true }
  );
}


function renderResultsTable(tests) {
  const tbody = document.getElementById("resultsTableBody");
  tbody.innerHTML = "";

  if (!tests.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">No test data available</td></tr>`;
    return;
  }

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
}

function downloadPDF() {
  const reportId = getReportId();
  if (reportId) {
    window.open(`${API_BASE_URL}/download/pdf/${reportId}`, "_blank");
  }
}
