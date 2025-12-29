document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    console.error("User not found");
    return;
  }

  const user = data.user;

  document.getElementById("profileEmail").textContent = user.email || "—";

  document.getElementById("profileUserId").textContent = user.id;

  document.getElementById("profileCreated").textContent = user.created_at
    ? new Date(user.created_at).toLocaleString()
    : "—";

  document.getElementById("profileUsername").textContent =
    user.user_metadata?.username || user.user_metadata?.name || "Not set";
});
