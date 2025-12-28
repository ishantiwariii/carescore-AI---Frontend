// CONFIGURATION
const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  // Check which page we are on
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) initLogin();
  if (registerForm) initRegister();
});

// 1. REGISTRATION LOGIC
function initRegister() {
  const form = document.getElementById("registerForm");
  const msgBox = document.getElementById("register-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get Values
    const fullName = document.getElementById("full-name").value; // (Optional: Send to backend if needed later)
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Basic Validation
    if (password !== confirmPassword) {
      showMessage(msgBox, "Passwords do not match", true);
      return;
    }

    setLoading(true, "register-btn");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(
          msgBox,
          "Account created! Please verify your email to continue.",
          false
        );

        // Redirect to verification info page
        setTimeout(() => {
          window.location.href = "verify.html";
        }, 1500);
      } else {
        showMessage(msgBox, data.error || "Registration failed", true);
      }
    } catch (err) {
      showMessage(msgBox, "Server error. Is the backend running?", true);
      console.error(err);
    } finally {
      setLoading(false, "register-btn", "Register");
    }
  });
}

// ==========================================
// 2. LOGIN LOGIC (Password + OTP)
// ==========================================
function initLogin() {
  const form = document.getElementById("loginForm");
  const msgBox = document.getElementById("auth-message");

  // Toggle Elements
  const toggleLink = document.getElementById("toggle-auth-mode");
  const passwordSection = document.getElementById("password-section");
  const otpSection = document.getElementById("otp-section");

  // Buttons
  const loginBtn = document.getElementById("login-btn"); // Password Submit
  const sendOtpBtn = document.getElementById("send-otp-btn");
  const verifyOtpBtn = document.getElementById("verify-otp-btn");

  let isOtpMode = false;

  // --- A. TOGGLE MODE (Password <-> OTP) ---
  toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    isOtpMode = !isOtpMode;

    if (isOtpMode) {
      passwordSection.style.display = "none";
      otpSection.style.display = "block";
      toggleLink.textContent = "Back to Password Login";
      // Disable default form submit for OTP mode to prevent confusion
      loginBtn.style.display = "none";
    } else {
      passwordSection.style.display = "block";
      otpSection.style.display = "none";
      toggleLink.textContent = "Or login with One-Time Code (OTP)";
      loginBtn.style.display = "block";
    }
    msgBox.style.display = "none"; // Clear errors
  });

  // --- B. PASSWORD LOGIN SUBMIT ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isOtpMode) return; // Handled by buttons below

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    setLoading(true, "login-btn");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      handleLoginResponse(response, data, msgBox);
    } catch (err) {
      showMessage(msgBox, "Connection failed", true);
    } finally {
      setLoading(false, "login-btn", "Log In");
    }
  });

  // --- C. SEND OTP ---
  sendOtpBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    if (!email) {
      showMessage(msgBox, "Please enter your email first", true);
      return;
    }

    sendOtpBtn.textContent = "Sending...";
    sendOtpBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-otp-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        showMessage(msgBox, "Code sent! Check your email.", false);
        document.getElementById("otp-verify-group").style.display = "block";
        sendOtpBtn.style.display = "none"; // Hide send button
      } else {
        const data = await response.json();
        showMessage(msgBox, data.error || "Failed to send OTP", true);
        sendOtpBtn.textContent = "Send Login Code";
        sendOtpBtn.disabled = false;
      }
    } catch (err) {
      showMessage(msgBox, "Server error", true);
      sendOtpBtn.textContent = "Send Login Code";
      sendOtpBtn.disabled = false;
    }
  });

  // --- D. VERIFY OTP ---
  verifyOtpBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const otp = document.getElementById("otp-input").value;

    verifyOtpBtn.textContent = "Verifying...";
    verifyOtpBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-otp-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      handleLoginResponse(response, data, msgBox);
    } catch (err) {
      showMessage(msgBox, "Verification failed", true);
    } finally {
      if (!msgBox.textContent.includes("Success")) {
        verifyOtpBtn.textContent = "Verify & Login";
        verifyOtpBtn.disabled = false;
      }
    }
  });
}

// 3. UTILITIES

async function handleLoginResponse(response, data, msgBox) {
  if (!response.ok) {
    showMessage(msgBox, data.error || "Login failed", true);
    return;
  }

  // 1️⃣ Store backend token (for API calls)
  localStorage.setItem("careScoreToken", data.token);
  localStorage.setItem("user_id", data.user_id);

  // 2️⃣ ALSO create Supabase session
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    showMessage(msgBox, "Missing credentials for Supabase login", true);
    return;
  }

  const { error: supabaseError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (supabaseError) {
    console.error("Supabase login error:", supabaseError);
    showMessage(msgBox, "Auth sync failed. Try again.", true);
    return;
  }

  // 3️⃣ Success
  showMessage(msgBox, "Login Successful! Redirecting...", false);

  setTimeout(() => {
    window.location.href = "index.html";
  }, 800);
}

function showMessage(element, message, isError) {
  element.style.display = "block";
  element.textContent = message;
  element.style.color = isError ? "#e11d48" : "#16a34a"; // Red or Green
  element.style.backgroundColor = isError ? "#ffe4e6" : "#dcfce7";
}

function setLoading(isLoading, btnId, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  if (isLoading) {
    btn.textContent = "Processing...";
    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.textContent = originalText;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}
