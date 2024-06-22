let enabled;
let previousEnabled;
let detectedEntities = [];
let piiMappings = {};
let entityCounts = {}; // To track counts of each entity type

let currentConversationId = window.helper.getActiveConversationId();
let typingTimer;
const doneTypingInterval = 1000;

console.log("Content script loaded!");

function checkForConversationChange() {
  if (!enabled) {
    previousEnabled = enabled;
    return;
  }
  const newConversationId = window.helper.getActiveConversationId();
  if (
    newConversationId !== currentConversationId ||
    enabled !== previousEnabled
  ) {
    previousEnabled = enabled;
    currentConversationId = newConversationId;
    removeTooltipAndPanel();
    document.removeEventListener("input", typingHandler);
    document.addEventListener("input", typingHandler);
    window.helper.getEnabledStatus();
    enabled = window.helper.enabled;
  }
}

function typingHandler(e) {
  const input = document.querySelector("textarea, input[type='text']");
  if (input.contains(e.target)) {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
  }
}

async function doneTyping() {
  showLoadingIndicator();
  const { userMessage, detectedEntities } =
    await window.helper.handleDetectAndUpdatePanel();
  let noFound = true;
  if (detectedEntities.length > 0) {
    noFound = false;
  }
  updateDetectButton(noFound);
}

function showLoadingIndicator() {
  const detectButton = document.getElementById("detect-next-to-input-button");
  if (detectButton) {
    detectButton.innerHTML = `<span class="loader"></span>`;
  }
}

function updateDetectButton(noFound) {
  const detectButton = document.getElementById("detect-next-to-input-button");
  if (detectButton) {
    detectButton.innerHTML = `<span class="detected-circle"></span>`;
    const detectedCircle = detectButton.querySelector(".detected-circle");
    const extensionId = chrome.runtime.id;
    if (noFound) {
      detectedCircle.style.backgroundImage = `url(chrome-extension://${extensionId}/images/check4.png)`;
    } else {
      detectedCircle.style.backgroundImage = `url(chrome-extension://${extensionId}/images/magnifier5.png)`;
    }

    detectButton.addEventListener("click", () => {
      if (detectedCircle) {
        window.helper.highlightDetectedWords();
      }
    });
  }
}

setInterval(checkForConversationChange, 1000);

function removeTooltipAndPanel() {
  const tooltip = document.querySelector(".pii-highlight-tooltip");
  if (tooltip) {
    tooltip.remove();
  }

  const panel = document.getElementById("pii-replacement-panel");
  if (panel) {
    panel.remove();
  }
}

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log("Message received:", request);

  if (request.enabled !== undefined) {
    enabled = request.enabled;
    window.helper.setEnabledStatus(enabled);
    console.log("Received new state:", enabled);
    sendResponse({ status: "State updated" });
    initializeButton();
  }
  if (request.action === "detect") {
    window.helper.handleDetectAndHighlight();
  } else if (request.action === "highlight") {
    const userMessage = window.helper.getUserInputText();
    window.helper.highlightWords(userMessage, detectedEntities);
  } else if (request.action === "replace-single") {
    window.helper.replaceSinglePii(request.piiText, request.entityType);
  } else if (request.action === "replace-all") {
    window.helper.replaceWords(detectedEntities);
  }
});

// Improved mutation observer to handle new messages dynamically
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches('[data-message-author-role="assistant"]')) {
          console.log("New assistant message detected:", node); // Log detection
          window.helper.checkMessageRenderedAndReplace(node);
        }
        node
          .querySelectorAll('[data-message-author-role="assistant"]')
          .forEach((el) => {
            console.log("New nested assistant message detected:", el); // Log nested detection
            window.helper.checkMessageRenderedAndReplace(el);
          });
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Load entity counts from storage
chrome.storage.local.get("entityCounts", (data) => {
  entityCounts = data.entityCounts || {};
  console.log("Loaded entity counts:", entityCounts);
});

// Apply replacements on page load
async function initialize() {
  const { initializeButton } = await import(
    chrome.runtime.getURL("buttonWidget.js")
  );
  console.log("calling initialize button");
  initializeButton();
}

// Call the initialize function when the content script loads and the DOM is ready
window.addEventListener("load", async () => {
  initialize();
  await window.helper.getEnabledStatus();
  enabled = window.helper.enabled;

  document
    .querySelectorAll('[data-message-author-role="assistant"]')
    .forEach((el) => {
      window.helper.checkMessageRenderedAndReplace(el);
    });
});
