// popup.js

console.log("Popup script loaded");

// Get the current state of the extension (enabled or disabled)
chrome.storage.sync.get(["enabled"], function (result) {
  const enabled = result.enabled !== undefined ? result.enabled : true;
  const disableButton = document.getElementById("disableButton");
  if (!enabled) {
    disableButton.classList.add("off");
    disableButton.textContent = "Enable";
  } else {
    disableButton.classList.remove("off");
    disableButton.textContent = "Disable";
  }
  console.log("Initial state:", enabled);
});

// Add click event listener to the toggle button
document.getElementById("disableButton").addEventListener("click", function () {
  chrome.storage.sync.get(["enabled"], function (result) {
    const enabled = result.enabled !== undefined ? result.enabled : true;
    const newEnabledState = !enabled;

    chrome.storage.sync.set({ enabled: newEnabledState }, function () {
      const disableButton = document.getElementById("disableButton");
      if (!newEnabledState) {
        disableButton.classList.add("off");
        disableButton.textContent = "Enable";
      } else {
        disableButton.classList.remove("off");
        disableButton.textContent = "Disable";
      }
      console.log("New state:", newEnabledState);

      // Send a message to the content script to update the state
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { enabled: newEnabledState },
            function (response) {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
              } else {
                console.log("Response from content script:", response);
              }
            }
          );
        } else {
          console.error("No active tab found");
        }
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("model-toggle");

  toggle.addEventListener("click", function () {
    toggle.classList.toggle("checked");
    const label = toggle.querySelector(".toggle-label");
    label.textContent = toggle.classList.contains("checked") ? "2" : "1";
    updateModel(toggle.classList.contains("checked") ? 2 : 1);
  });

  function updateModel(model) {
    console.log(`Switched to model ${model}`);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "toggleModel" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          } else {
            console.log("Model toggle action sent");
          }
        }
      );
    });
  }
});
