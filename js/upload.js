const API_BASE_URL = "https://carescore-ai-backend.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

function setupEventListeners() {
  const fileInput = document.getElementById("fileInput");
  const chooseFileBtn = document.getElementById("chooseFileBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const deviceCard = document.getElementById("deviceUploadCard");

  chooseFileBtn.addEventListener("click", () => fileInput.click());

  deviceCard.addEventListener("click", (e) => {
    if (e.target !== chooseFileBtn) fileInput.click();
  });

  cameraBtn.addEventListener("click", () => {
    fileInput.setAttribute("capture", "environment");
    fileInput.click();
  });

  fileInput.addEventListener("change", handleFileUpload);
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
    showStatus("Invalid file type. Upload PDF or image only.", true);
    return;
  }

  if (file.size > 16 * 1024 * 1024) {
    showStatus("File too large. Max size is 16MB.", true);
    return;
  }

  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", localStorage.getItem("user_id"));

  try {
    const res = await fetch(`${API_BASE_URL}/report/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (result.success === false && result.error === "QUOTA_EXHAUSTED") {
      loadingOverlay.style.display = "none";
      showStatus(
        "AI quota exhausted. Upload cannot continue. Please try later.",
        true
      );
      return;
    }

    if (!res.ok || !result.report_id) {
      loadingOverlay.style.display = "none";
      showStatus(result.error || "Upload failed.", true);
      return;
    }

    window.location.href = `confirm.html?id=${result.report_id}`;
  } catch (err) {
    console.error(err);
    loadingOverlay.style.display = "none";
    showStatus("Server error. Please try again.", true);
  }
}

function showStatus(message, isError) {
  const el = document.getElementById("statusMessage");
  el.textContent = message;
  el.style.display = "inline-block";
  el.style.backgroundColor = isError ? "#fee2e2" : "#dcfce7";
  el.style.color = isError ? "#b91c1c" : "#166534";
}
