document.getElementById("saveButton").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
    alert("API key saved.");
  });
});

chrome.storage.sync.get(["openaiApiKey"], (result) => {
  if (result.openaiApiKey) {
    document.getElementById("apiKey").value = result.openaiApiKey;
  }
});
