// popup.js

console.log("Popup script loaded");

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
  console.log("Initial state:", enabled);
});

// Add click event listener to the toggle button
document.getElementById("toggleButton").addEventListener("click", function () {
  chrome.storage.sync.get(["enabled"], function (result) {
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

// Add click event listener to the "Detect!" button
document.getElementById("detectButton").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "detect" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          } else {
            console.log("Detect action sent");
          }
        }
      );
    } else {
      console.error("No active tab found");
    }
  });
});

// Add click event listener to the "Replace!" button
document.getElementById("replaceButton").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "replace" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          } else {
            console.log("Replace action sent");
          }
        }
      );
    } else {
      console.error("No active tab found");
    }
  });
});
