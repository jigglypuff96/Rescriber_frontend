// popup.js

// Get the current state of the extension (enabled or disabled)
chrome.storage.sync.get(["enabled"], function (result) {
  const enabled = result.enabled !== undefined ? result.enabled : true;
  const toggleButton = document.getElementById("toggleButton");
  if (!enabled) {
    toggleButton.classList.add("off");
    toggleButton.textContent = "Enable";
  } else {
    toggleButton.classList.remove("off");
    toggleButton.textContent = "Disable";
  }
});

// Add click event listener to the toggle button
document.getElementById("toggleButton").addEventListener("click", function () {
  chrome.storage.sync.get(["enabled"], function (result) {
    // if (!result) return;
    const enabled = result.enabled !== undefined ? result.enabled : true;
    const newEnabledState = !enabled;

    chrome.storage.sync.set({ enabled: newEnabledState }, function () {
      const toggleButton = document.getElementById("toggleButton");
      if (!newEnabledState) {
        toggleButton.classList.add("off");
        toggleButton.textContent = "Enable";
      } else {
        toggleButton.classList.remove("off");
        toggleButton.textContent = "Disable";
      }

      // Send a message to the content script to update the state
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { enabled: newEnabledState });
      });
    });
  });
});
