document.getElementById("refresh-cache").addEventListener("click", () => {
  const status = document.getElementById("status");
  status.textContent = "Rafraîchissement en cours...";

  chrome.runtime.sendMessage({ action: "refreshRolimons" }, (response) => {
    if (response?.success) {
      status.textContent = "✅ Cache Rolimon's mis à jour !";
    } else {
      status.textContent = "❌ Échec du rafraîchissement (rate limit ?)";
    }
    setTimeout(() => { status.textContent = ""; }, 3000);
  });
});
