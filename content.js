let enabled = true; // Default state
let detectedEntities = [];
let tempPiiMappings = {}; // Temporary storage for PII mappings in no-url scenario
let piiMappings = {};

console.log("Content script loaded!");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.enabled !== undefined) {
    enabled = request.enabled;
    console.log("Received new state:", enabled);
    sendResponse({ status: "State updated" });
  }
  if (request.action === "detect") {
    const userMessage = getUserInputText();
    const { getResponse } = await import(chrome.runtime.getURL("openai.js"));
    const entities = await getResponse(userMessage);
    detectedEntities = processEntities(entities);
    detectWords(userMessage, detectedEntities);
  } else if (request.action === "replace") {
    const userMessage = getUserInputText();
    replaceWords(userMessage, detectedEntities);
  }
});

function getUserInputText() {
  const input = document.querySelector("textarea, input[type='text']");
  return input ? input.value : "";
}

function processEntities(entities) {
  const entityCount = {};
  return entities.map((entity) => {
    if (!entityCount[entity.entity_type]) {
      entityCount[entity.entity_type] = 0;
    }
    entityCount[entity.entity_type]++;
    const count = entityCount[entity.entity_type];
    return {
      ...entity,
      entity_type: `${entity.entity_type}${count > 1 ? count : 1}`,
    };
  });
}

function detectWords(userMessage, entities) {
  if (!enabled) return;

  const inputs = document.querySelectorAll("textarea, input[type='text']");
  inputs.forEach((input) => {
    if (input.value === userMessage) {
      let highlightedValue = input.value;
      entities.forEach((entity) => {
        const regex = new RegExp(`(${entity.text})`, "gi");
        highlightedValue = highlightedValue.replace(
          regex,
          `<span class="highlight">$1</span>`
        );
      });
      displayHighlight(input, highlightedValue);
    }
  });
}

function replaceWords(userMessage, entities) {
  const textareas = document.querySelectorAll("textarea");
  const inputs = document.querySelectorAll("input[type='text']");

  const activeConversationId = getActiveConversationId() || "no-url";
  console.log("Current active conversation ID:", activeConversationId);

  entities.forEach((entity) => {
    if (!tempPiiMappings[activeConversationId]) {
      tempPiiMappings[activeConversationId] = {};
    }
    tempPiiMappings[activeConversationId][entity.entity_type] = entity.text;
  });

  // Save tempPiiMappings to storage
  chrome.storage.local.set({ tempPiiMappings }, () => {
    console.log("Temporary PII mappings saved:", tempPiiMappings);
  });

  textareas.forEach((textarea) => {
    entities.forEach((entity) => {
      const regex = new RegExp(`(${entity.text})`, "gi");
      textarea.value = textarea.value.replace(regex, `{${entity.entity_type}}`);
    });
  });

  inputs.forEach((input) => {
    entities.forEach((entity) => {
      const regex = new RegExp(`(${entity.text})`, "gi");
      input.value = input.value.replace(regex, `{${entity.entity_type}}`);
    });
  });

  // Remove tooltips after replacement
  const existingTooltips = document.querySelectorAll(".tooltip");
  existingTooltips.forEach((existingTooltip) => existingTooltip.remove());
}

function displayHighlight(target, highlightedValue) {
  const existingTooltips = document.querySelectorAll(".tooltip");
  existingTooltips.forEach((existingTooltip) => existingTooltip.remove());

  const tooltip = document.createElement("div");
  tooltip.classList.add("tooltip");
  tooltip.innerHTML = highlightedValue;

  document.body.appendChild(tooltip);

  // Calculate the position of the tooltip
  const rect = target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;

  // Add the tooltip to measure its height
  document.body.appendChild(tooltip);

  // Measure the tooltip's height
  const tooltipHeight = tooltip.offsetHeight;

  // Threshold to determine if the tooltip is more than one line
  const singleLineHeight = parseFloat(
    window.getComputedStyle(target).lineHeight
  );

  // Position the tooltip above or below the input box based on its height
  if (tooltipHeight > singleLineHeight) {
    tooltip.style.top = `${rect.top + window.scrollY - tooltipHeight}px`;
  } else {
    tooltip.style.top = `${rect.top + window.scrollY + target.offsetHeight}px`;
  }

  target.addEventListener("blur", () => {
    tooltip.remove();
  });

  target.addEventListener("input", () => {
    tooltip.remove();
  });
}

function replaceTextInElement(element) {
  const activeConversationId = getActiveConversationId();
  const storageKey =
    activeConversationId !== "no-url"
      ? `piiMappings_${activeConversationId}`
      : null;

  chrome.storage.local.get(null, (data) => {
    const piiMappings =
      activeConversationId !== "no-url"
        ? { ...data[storageKey], ...tempPiiMappings["no-url"] }
        : tempPiiMappings["no-url"] || {};

    // Recursive function to replace text in all child nodes
    function replaceTextRecursively(node) {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          for (let [placeholder, pii] of Object.entries(piiMappings)) {
            const regexCurly = new RegExp(`\\{${placeholder}\\}`, "g");
            const regexPlain = new RegExp(placeholder, "g");
            const originalText = child.textContent;
            child.textContent = child.textContent.replace(regexCurly, pii);
            child.textContent = child.textContent.replace(regexPlain, pii);
            if (originalText !== child.textContent) {
              console.log(
                `Replaced text in element: ${originalText} -> ${child.textContent}`
              );
            }
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          replaceTextRecursively(child);
        }
      });
    }

    // Start the recursive replacement
    replaceTextRecursively(element);
  });
}

function checkMessageRenderedAndReplace(element) {
  const interval = setInterval(() => {
    const starButton = element?.parentElement?.parentElement
      ?.querySelector('button[aria-haspopup="menu"]')
      ?.querySelector("div .icon-md");

    if (starButton) {
      console.log("Message rendering complete, performing text replacement");
      replaceTextInElement(element);

      const activeConversationId = getActiveConversationId();
      if (activeConversationId !== "no-url") {
        // Move temporary mappings to actual mappings once the conversation ID is available
        chrome.storage.local.get(
          `piiMappings_${activeConversationId}`,
          (data) => {
            piiMappings[activeConversationId] = {
              ...data[`piiMappings_${activeConversationId}`],
              ...tempPiiMappings["no-url"],
            };
            chrome.storage.local.set(
              {
                [`piiMappings_${activeConversationId}`]:
                  piiMappings[activeConversationId],
              },
              () => {
                console.log(
                  "PII mappings saved for conversation:",
                  activeConversationId
                );
                // Clear temporary mappings
                delete tempPiiMappings["no-url"];
                chrome.storage.local.set({ tempPiiMappings }, () => {
                  console.log(
                    "Temporary PII mappings updated:",
                    tempPiiMappings
                  );
                });
              }
            );
          }
        );
      }
      clearInterval(interval);
    }
  }, 100); // Check every 100ms
}

function getActiveConversationId() {
  const url = window.location.href;
  const conversationIdMatch = url.match(/\/c\/([a-z0-9-]+)/);
  return conversationIdMatch ? conversationIdMatch[1] : "no-url";
}

// Improved mutation observer to handle new messages dynamically
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches('[data-message-author-role="assistant"]')) {
          console.log("New assistant message detected:", node); // Log detection
          checkMessageRenderedAndReplace(node);
        }
        node
          .querySelectorAll('[data-message-author-role="assistant"]')
          .forEach((el) => {
            console.log("New nested assistant message detected:", el); // Log nested detection
            checkMessageRenderedAndReplace(el);
          });
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Apply replacements on page load
window.addEventListener("load", () => {
  document
    .querySelectorAll('[data-message-author-role="assistant"]')
    .forEach((el) => {
      checkMessageRenderedAndReplace(el);
    });
});
