let enabled = true;

console.log("Content script loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.enabled !== undefined) {
    enabled = request.enabled;
    console.log("Received new state:", enabled);
    sendResponse({ status: "State updated" });
  }
  if (request.action === "detect") {
    detectWords();
  } else if (request.action === "replace") {
    replaceWords();
  }
});

function detectWords() {
  if (!enabled) return;

  const inputs = document.querySelectorAll("textarea, input[type='text']");
  inputs.forEach((input) => {
    const value = input.value;
    const highlightedValue = value.replace(
      /(apple)/g,
      '<span class="highlight">$1</span>'
    );
    displayHighlight(input, highlightedValue);
  });
}

function replaceWords() {
  const textareas = document.querySelectorAll("textarea");
  const inputs = document.querySelectorAll("input[type='text']");

  textareas.forEach((textarea) => {
    textarea.value = textarea.value.replace(/apple/g, "pear");
  });

  inputs.forEach((input) => {
    input.value = input.value.replace(/apple/g, "pear");
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

  const rect = target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  document.body.appendChild(tooltip);
  const tooltipHeight = tooltip.offsetHeight;
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
