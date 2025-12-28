const API_BASE_URL = "http://127.0.0.1:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  setupEventListeners();
});

// 1. Auth Check
function checkAuth() {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    window.location.href = "login.html";
  }
}

// 2. Setup Buttons
function setupEventListeners() {
  const fileInput = document.getElementById("fileInput");
  const chooseFileBtn = document.getElementById("chooseFileBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const deviceCard = document.getElementById("deviceUploadCard");
  const cameraCard = document.getElementById("cameraUploadCard");

  // "Choose File" Button Click
  chooseFileBtn.addEventListener("click", () => fileInput.click());

  // Clicking the whole card also triggers input (better UX)
  deviceCard.addEventListener("click", (e) => {
    if (e.target !== chooseFileBtn) fileInput.click();
  });

  // "Use Camera" Button Click
  // On mobile, this will prompt for Camera or File
  cameraBtn.addEventListener("click", () => {
    fileInput.setAttribute("capture", "environment"); // Prefer rear camera
    fileInput.click();
  });

  // Handle File Selection
  fileInput.addEventListener("change", handleFileUpload);

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const validTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  if (!validTypes.includes(file.type)) {
    showStatus("Invalid file type. Please upload a PDF or Image.", true);
    return;
  }

  if (file.size > 16 * 1024 * 1024) {
    showStatus("File is too large. Max size is 16MB.", true);
    return;
  }

  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", localStorage.getItem("user_id"));

  try {
    console.log("Uploading...");

    const response = await fetch(`${API_BASE_URL}/report/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Success:", result);

      if (result.ai_status === "quota_exhausted") {
        localStorage.setItem(
          "ai_warning",
          "AI auto-fill unavailable. Please enter values manually."
        );
      } else {
        localStorage.removeItem("ai_warning");
      }

      window.location.href = `confirm.html?id=${result.report_id}`;
    } else {
      showStatus(result.error || "Upload failed. Please try again.", true);
      loadingOverlay.style.display = "none";
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("Server error. Is the backend running?", true);
    loadingOverlay.style.display = "none";
  }
}

// Helper to show errors
function showStatus(message, isError) {
  const statusBox = document.getElementById("statusMessage");
  statusBox.textContent = message;
  statusBox.style.display = "inline-block";
  statusBox.style.backgroundColor = isError ? "#fee2e2" : "#dcfce7";
  statusBox.style.color = isError ? "#b91c1c" : "#166534";
}
