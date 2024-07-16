// popup.js

console.log("Popup script loaded");

function updateButtonState(enabled) {
  const disableButton = document.getElementById("disableButton");
  if (!enabled) {
    disableButton.classList.add("off");
    disableButton.textContent = "Enable";
  } else {
    disableButton.classList.remove("off");
    disableButton.textContent = "Disable";
  }
  console.log("Button state updated:", enabled);
}

document.getElementById("disableButton").addEventListener("click", function () {
  chrome.storage.sync.get(["enabled"], function (result) {
    const enabled = result.enabled === undefined ? true : result.enabled;
    const newEnabledState = !enabled;

    chrome.storage.sync.set({ enabled: newEnabledState }, function () {
      updateButtonState(newEnabledState);
      console.log("New state:", newEnabledState);
      updateEnabledStatus(newEnabledState);
    });
  });
});

function updateEnabledStatus(enabledStatus) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "toggleEnabled", enabled: enabledStatus },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        } else {
          console.log("Enabled status update sent");
        }
      }
    );
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize the disable button state based on stored value
  chrome.storage.sync.get(["enabled"], function (result) {
    const enabled = result.enabled === undefined ? true : result.enabled;
    updateButtonState(enabled);
  });

  const toggle = document.getElementById("model-toggle");
  chrome.storage.local.get(["useOnDeviceModel"], function (result) {
    const useOnDeviceModel =
      result.useOnDeviceModel !== undefined ? result.useOnDeviceModel : false;
    if (useOnDeviceModel) {
      toggle.classList.add("checked");
      toggle.querySelector(".toggle-label").textContent = "2";
    } else {
      toggle.classList.remove("checked");
      toggle.querySelector(".toggle-label").textContent = "1";
    }
  });

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
