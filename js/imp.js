const API_BASE_URL = "https://carescore-ai-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return;

  fetchImportantReports();
});

async function fetchImportantReports() {
  const userId = localStorage.getItem("user_id");
  const listContainer = document.getElementById("importantList");
  const emptyState = document.getElementById("emptyState");

  try {
    listContainer.innerHTML =
      '<div class="loading">Finding critical reports...</div>';

    const response = await fetch(
      `${API_BASE_URL}/history/list?user_id=${userId}`
    );
    const result = await response.json();

    if (result.success) {
      const criticalReports = result.data.filter((report) => {
        const score = report.analysis_data?.care_score;
        return score !== undefined && score < 70;
      });

      if (criticalReports.length === 0) {
        listContainer.innerHTML = "";
        emptyState.classList.remove("hidden");
        emptyState.style.display = "block";
      } else {
        emptyState.classList.add("hidden");
        renderImportantCards(criticalReports);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function renderImportantCards(reports) {
  const listContainer = document.getElementById("importantList");
  listContainer.innerHTML = "";

  reports.forEach((report) => {
    const date = new Date(report.created_at).toLocaleDateString();
    const score = report.analysis_data?.care_score;

    const deviations = report.analysis_data?.deviations || [];
    const mainIssue = deviations.length > 0 ? deviations[0] : "Requires review";

    const card = document.createElement("div");
    card.className = "imp-card";
    card.style.borderLeft = "5px solid #ef4444";
    card.onclick = () => (window.location.href = `report.html?id=${report.id}`);

    card.innerHTML = `
            <div class="imp-content">
                <div class="imp-header">
                    <h3>⚠️ Action Needed</h3>
                    <span class="imp-date">${date}</span>
                </div>
                <p class="imp-reason">Detected: <strong>${mainIssue}</strong></p>
                <div class="imp-score">CareScore: ${score}/100</div>
            </div>
            <button class="view-btn">View Analysis</button>
        `;

    listContainer.appendChild(card);
  });
}
