let enabled = true; // Default state
let detectedEntities = [];
let piiMappings = {};
let entityCounts = {}; // To track counts of each entity type

console.log("Content script loaded!");

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log("Message received:", request);

  if (request.enabled !== undefined) {
    enabled = request.enabled;
    console.log("Received new state:", enabled);
    sendResponse({ status: "State updated" });
  }
  if (request.action === "detect") {
    const userMessage = window.helper.getUserInputText();
    const { getResponseDetect, getResponseCluster } = await import(
      chrome.runtime.getURL("openai.js")
    );
    const entities = await getResponseDetect(userMessage);
    const clusterMessage = window.helper.generateUserMessageCluster(
      userMessage,
      entities
    );
    const clustersResponse = await getResponseCluster(clusterMessage); // new line
    const clusters = JSON.parse(clustersResponse);
    const { finalClusters, associatedGroups } =
      window.helper.simplifyClustersWithTypes(clusters, entities);
    detectedEntities = window.helper.processEntities(entities, finalClusters);
    window.helper.detectWords(userMessage, detectedEntities);
    const { createPIIReplacementPanel } = await import(
      chrome.runtime.getURL("ui.js")
    );
    createPIIReplacementPanel(detectedEntities);
  } else if (request.action === "highlight") {
    const userMessage = window.helper.getUserInputText();
    window.helper.detectWords(userMessage, detectedEntities);
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
window.addEventListener("load", () => {
  document
    .querySelectorAll('[data-message-author-role="assistant"]')
    .forEach((el) => {
      window.helper.checkMessageRenderedAndReplace(el);
    });
});
