// js/index.js
const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return; // auth-guard handles redirect

  fetchDashboardData(userId);
});

/* =========================
   NAVBAR
========================= */
function setupNavbar(user) {
  const navUser = document.getElementById("navUsername");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");

  if (navUser) {
    navUser.style.display = "block";
    navUser.textContent = user.email;
  }

  if (logoutBtn) {
    logoutBtn.style.display = "block";
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = "login.html";
    };
  }

  if (loginBtn) loginBtn.style.display = "none";
}

/* =========================
   DASHBOARD DATA
========================= */
async function fetchDashboardData(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/history/list?user_id=${userId}`);
    const result = await res.json();

    if (result.success) {
      const reports = result.data;
      updateGreeting();
      updateStats(reports);
      updateRecentActivity(reports);
    }
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

function updateGreeting() {
  const greetName = document.getElementById("greetName");
  if (greetName) greetName.textContent = "Welcome back 👋";
}

/* =========================
   STATS
========================= */
function updateStats(reports) {
  const totalCount = reports.length;

  const sorted = [...reports].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const latestScore = sorted[0]?.analysis_data?.care_score ?? "N/A";

  let trackingDays = 0;
  if (reports.length) {
    const first = new Date(sorted.at(-1).created_at);
    trackingDays = Math.ceil((Date.now() - first) / (1000 * 60 * 60 * 24));
  }

  const h2s = document.querySelectorAll(".stats-grid h2");
  if (!h2s.length) return;

  h2s[0].textContent = totalCount;
  h2s[1].textContent = latestScore;
  h2s[2].textContent = trackingDays;
  h2s[3].textContent = reports.length > 1 ? "+1" : "-";
}

/* =========================
   RECENT ACTIVITY
========================= */
function updateRecentActivity(reports) {
  const list = document.querySelector(".activity-list");
  if (!list) return;

  list.innerHTML = "";

  const recent = reports.slice(0, 3);
  if (!recent.length) {
    list.innerHTML =
      "<p style='color:#64748b;padding:10px'>No activity yet.</p>";
    return;
  }

  recent.forEach((report) => {
    const score = report.analysis_data?.care_score || 0;
    const date = new Date(report.created_at).toLocaleDateString();

    let status = "Neutral",
      cls = "neutral";
    if (score >= 80) (status = "Good"), (cls = "good");
    else if (score < 60) (status = "Attention"), (cls = "improve");

    const li = document.createElement("li");
    li.className = `activity-item ${cls}`;
    li.innerHTML = `
      <span class="dot" style="background:${getColor(cls)}"></span>
      <div class="activity-info">
        <strong>Health Report</strong>
        <small>CareScore ${score} • ${date}</small>
      </div>
      <span class="badge ${cls}">${status}</span>
    `;

    li.onclick = () => (window.location.href = `report.html?id=${report.id}`);

    list.appendChild(li);
  });
}

function getColor(cls) {
  if (cls === "good") return "#16a34a";
  if (cls === "improve") return "#ea580c";
  return "#475569";
}
/* =========================
   INIT DASHBOARD
========================= */
function initDashboard(session) {
  const user = session.user;

  // cache token (NOT source of truth)
  localStorage.setItem("careScoreToken", session.access_token);
  localStorage.setItem("user_id", user.id);

  setupNavbar(user);
  fetchDashboardData(user.id);
}
