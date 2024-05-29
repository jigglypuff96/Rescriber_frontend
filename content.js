// content.js

let enabled = true; // Default state
let detectedEntities = [];

console.log("Content script loaded");

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
    detectedEntities = await getResponse(userMessage);
    detectWords(userMessage, detectedEntities);
  } else if (request.action === "replace") {
    replaceWords(detectedEntities);
  }
});

function getUserInputText() {
  const input = document.querySelector("textarea, input[type='text']");
  return input ? input.value : "";
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

function replaceWords(entities) {
  const textareas = document.querySelectorAll("textarea");
  const inputs = document.querySelectorAll("input[type='text']");

  textareas.forEach((textarea) => {
    entities.forEach((entity) => {
      const regex = new RegExp(`(${entity.text})`, "gi");
      textarea.value = textarea.value.replace(regex, `[${entity.entity_type}]`);
    });
  });

  inputs.forEach((input) => {
    entities.forEach((entity) => {
      const regex = new RegExp(`(${entity.text})`, "gi");
      input.value = input.value.replace(regex, `[${entity.entity_type}]`);
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
