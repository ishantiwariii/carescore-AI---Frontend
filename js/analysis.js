const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  loadAnalysis();

  // Setup Download Button
  document.getElementById("downloadBtn").addEventListener("click", downloadPDF);
});

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

// 1. Fetch & Render Data
async function loadAnalysis() {
  const reportId = getReportId();
  if (!reportId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/history/${reportId}`);
    const result = await response.json();

    if (result.success) {
      const report = result.data;
      const analysis = report.analysis_data || {};
      const confirmedData = report.confirmed_data || {};

      // A. Update CareScore
      updateScore(analysis.care_score || 0);

      // B. Update Explanation
      const aiDiv = document.getElementById("aiExplanation");
      if (analysis.explanation) {
        // Convert newlines to breaks for readability
        aiDiv.innerHTML = analysis.explanation.replace(/\n/g, "<br>");
      } else {
        aiDiv.innerHTML = "Analysis pending... please refresh in a moment.";
      }

      // C. Update Deviation Tags
      const tagsContainer = document.getElementById("deviationTags");
      tagsContainer.innerHTML = "";
      (analysis.deviations || []).forEach((dev) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = dev;
        tagsContainer.appendChild(tag);
      });

      // D. Render Chart
      renderChart(confirmedData);

      // E. Render Detail List
      renderList(confirmedData);
    } else {
      alert("Could not load report.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// 2. Animate Score Circle
function updateScore(score) {
  const circle = document.getElementById("scoreCircle");
  const text = document.getElementById("scoreText");
  const label = document.getElementById("scoreLabel");

  // Set Text
  text.textContent = score;

  // Determine Color & Label
  let colorClass = "warning";
  let statusText = "Needs Attention";

  if (score >= 80) {
    colorClass = "good";
    statusText = "Excellent Health";
  } else if (score < 50) {
    colorClass = "bad";
    statusText = "Critical Attention";
  }

  circle.classList.add(colorClass);
  label.textContent = statusText;

  // Animate Stroke (0 to Score)
  // Formula: stroke-dasharray="current, 100"
  setTimeout(() => {
    circle.setAttribute("stroke-dasharray", `${score}, 100`);
  }, 100);
}

// 3. Render Chart.js
function renderChart(data) {
  const ctx = document.getElementById("healthChart").getContext("2d");

  // Filter only numeric values
  const labels = [];
  const values = [];

  for (const [key, val] of Object.entries(data)) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      labels.push(key.replace(/_/g, " ")); // Format label
      values.push(num);
    }
  }

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Test Value",
          data: values,
          backgroundColor: "rgba(37, 99, 235, 0.6)",
          borderColor: "rgba(37, 99, 235, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

// 4. Render Details List
function renderList(data) {
  const list = document.getElementById("metricsList");
  list.innerHTML = "";

  for (const [key, val] of Object.entries(data)) {
    const li = document.createElement("li");
    li.innerHTML = `
            <span style="text-transform: capitalize; color: #64748b;">${key.replace(
              /_/g,
              " "
            )}</span>
            <b>${val}</b>
        `;
    list.appendChild(li);
  }
}

// 5. Download Function
function downloadPDF() {
  const reportId = getReportId();
  if (reportId) {
    // Triggers the backend route which serves the file with correct headers
    window.open(`${API_BASE_URL}/download/pdf/${reportId}`, "_blank");
  }
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});
