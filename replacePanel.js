export function createPIIReplacementPanel(detectedEntities) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL("ui.css");
  document.head.appendChild(link);

  let panel = document.getElementById("pii-replacement-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "pii-replacement-panel";
    panel.classList.add("pii-replacement-panel");
    document.body.appendChild(panel);
  }

  const piiList = detectedEntities
    .map(
      (entity) => `
      <li class="pii-item">
        <span>${entity.text} - ${entity.entity_type}</span>
        <button class="replace-single-btn" data-pii-text="${entity.text}" data-entity-type="${entity.entity_type}">Replace</button>
        <input type="checkbox" class="pii-checkbox" data-entity-text="${entity.text}">
      </li>`
    )
    .join("");
  panel.innerHTML = `
    <div class="pii-replacement-header">
      <h4>PII Replacements</h4>
      <div class="right-corner-buttons">
        <button id="highlight-btn">Highlight</button>
        <button id="close-panel-btn">X</button>
      </div>
    </div>
    <ul id="pii-list">${piiList}</ul>
    <div class="pii-replacement-footer">
      <button id="replace-all-btn">Replace All</button>
      <button id="abstract-btn" disabled>Abstract</button>
    </div>
  `;

  document.querySelectorAll(".replace-single-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const piiText = button.getAttribute("data-pii-text");
      const entityType = button.getAttribute("data-entity-type");
      window.helper.replaceSinglePii(piiText, entityType);
    });
  });

  document.getElementById("replace-all-btn").addEventListener("click", () => {
    window.helper.replaceWords(detectedEntities);
  });

  document.getElementById("highlight-btn").addEventListener("click", () => {
    const userMessage = window.helper.getUserInputText();
    window.helper.highlightWords(userMessage, detectedEntities);
  });

  document.getElementById("abstract-btn").addEventListener("click", () => {
    const checkedItems = Array.from(
      document.querySelectorAll(".pii-checkbox:checked")
    ).map((checkbox) => checkbox.getAttribute("data-entity-text"));

    if (checkedItems.length > 0) {
      const originalMessage = window.helper.currentUserMessage;
      const currentMessage = window.helper.getUserInputText();
      window.helper.handleAbstractResponse(
        originalMessage,
        currentMessage,
        checkedItems
      );
    }
  });

  document.querySelectorAll(".pii-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const anyChecked = Array.from(
        document.querySelectorAll(".pii-checkbox")
      ).some((cb) => cb.checked);
      document.getElementById("abstract-btn").disabled = !anyChecked;
    });
  });

  // Add click event to bring panel to front
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
    panel.style.zIndex = 1001; // Set a high z-index to bring it to front
    const tooltip = document.querySelector(".pii-highlight-tooltip");
    if (tooltip) {
      tooltip.style.zIndex = 1000; // Ensure tooltip has a lower z-index
    }
  });

  // Add click event to close the panel
  document.getElementById("close-panel-btn").addEventListener("click", () => {
    panel.style.display = "none";
  });
}

// Ensure tooltip has a lower z-index initially
document.addEventListener("click", (event) => {
  const tooltip = document.querySelector(".pii-highlight-tooltip");
  const panel = document.getElementById("pii-replacement-panel");
  if (tooltip && !panel.contains(event.target)) {
    tooltip.style.zIndex = 1000; // Set a lower z-index
  }
});

// Add click event to tooltip to bring it to front
document.addEventListener("click", (event) => {
  const tooltip = document.querySelector(".pii-highlight-tooltip");
  if (tooltip && tooltip.contains(event.target)) {
    tooltip.style.zIndex = 1001; // Bring tooltip to front
    const panel = document.getElementById("pii-replacement-panel");
    if (panel) {
      panel.style.zIndex = 1000; // Ensure panel has a lower z-index
    }
  }
});
