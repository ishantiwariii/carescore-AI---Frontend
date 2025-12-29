console.log("auth-guard loaded");

document.addEventListener("DOMContentLoaded", async () => {
  const currentPage = window.location.pathname.split("/").pop();

  const PUBLIC_PAGES = [
    "",
    "index.html",
    "login.html",
    "register.html",
    "about.html",
    "verify.html",
  ];

  // 🔐 SINGLE SOURCE OF TRUTH = SUPABASE
  const { data, error } = await supabase.auth.getSession();

  if (error) return;

  // 1️⃣ logged in + public page → dashboard
  if (
    data.session &&
    ["login.html", "register.html", "index.html"].includes(currentPage)
  ) {
    window.location.href = "dashboard.html";
    return;
  }

  // ❌ Not logged in & trying to access protected page
  if (!data.session && !PUBLIC_PAGES.includes(currentPage)) {
    window.location.href = "index.html";
    return;
  }

  // ✅ Logged in
  if (data.session) {
    const session = data.session;
    const user = session.user;

    // cache token for backend calls
    localStorage.setItem("careScoreToken", session.access_token);
    localStorage.setItem("user_id", user.id);

    setupNavbar(user);
  } else {
    // public page UI
    setupLoggedOutNavbar();
  }
});

/* =========================
   NAVBAR HELPERS
========================= */
function setupNavbar(user) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const usernameEl = document.getElementById("navUsername");
  const navMenu = document.getElementById("navMenu");

  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-block";
  if (navMenu) navMenu.style.display = "flex";

  if (usernameEl) {
    usernameEl.style.display = "inline-block";
    usernameEl.textContent = user.email;
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = "index.html";
    };
  }
}

function setupLoggedOutNavbar() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const usernameEl = document.getElementById("navUsername");
  const navMenu = document.getElementById("navMenu");

  if (loginBtn) loginBtn.style.display = "inline-block";
  if (logoutBtn) logoutBtn.style.display = "none";
  if (usernameEl) usernameEl.style.display = "none";
  if (navMenu) navMenu.style.display = "none";
}
