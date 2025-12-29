const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return;

  fetchHistory();

  document
    .getElementById("searchInput")
    ?.addEventListener("input", filterReports);
  document
    .getElementById("filterSelect")
    ?.addEventListener("change", filterReports);
});

let allReports = [];

async function fetchHistory() {
  const userId = localStorage.getItem("user_id");
  const listContainer = document.getElementById("reportList");

  try {
    listContainer.innerHTML = '<div class="loading">Loading reports...</div>';

    const response = await fetch(
      `${API_BASE_URL}/history/list?user_id=${userId}`
    );
    const result = await response.json();

    if (result.success) {
      allReports = result.data;
      renderReports(allReports);
    } else {
      listContainer.innerHTML =
        '<div class="error">Failed to load history.</div>';
    }
  } catch (error) {
    console.error("Error:", error);
    listContainer.innerHTML =
      '<div class="error">Server error. Ensure backend is running.</div>';
  }
}

function renderReports(reports) {
  const listContainer = document.getElementById("reportList");
  listContainer.innerHTML = "";

  if (reports.length === 0) {
    listContainer.innerHTML =
      '<div class="empty-state">No reports found. Upload one to get started!</div>';
    return;
  }

  reports.forEach((report) => {
    const date = new Date(report.created_at).toLocaleDateString();
    const score = report.analysis_data?.care_score || "N/A";
    const status = report.status;

    let scoreClass = "score-neutral";
    if (score >= 80) scoreClass = "score-good";
    else if (score < 50) scoreClass = "score-bad";

    const card = document.createElement("div");
    card.className = "report-card";
    card.onclick = () => (window.location.href = `report.html?id=${report.id}`);

    card.innerHTML = `
            <div class="card-left">
                <div class="report-icon">📄</div>
                <div class="report-info">
                    <h3>Medical Analysis Report</h3>
                    <span class="report-date">${date}</span>
                </div>
            </div>
            <div class="card-right">
                <div class="status-badge ${
                  status === "analyzed" ? "done" : "pending"
                }">
                    ${status.replace("_", " ")}
                </div>
                <div class="care-score ${scoreClass}">
                    ${score} <span class="score-label">CareScore</span>
                </div>
            </div>
        `;

    listContainer.appendChild(card);
  });
}

function filterReports() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filterType = document.getElementById("filterSelect").value;

  const filtered = allReports.filter((report) => {
    const date = new Date(report.created_at).toLocaleDateString().toLowerCase();

    const rawText = JSON.stringify(report.raw_data || "").toLowerCase();

    const matchesSearch = date.includes(query) || rawText.includes(query);
    const matchesType =
      filterType === "all" ? true : rawText.includes(filterType);

    return matchesSearch && matchesType;
  });

  renderReports(filtered);
}
