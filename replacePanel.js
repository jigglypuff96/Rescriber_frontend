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
      <div class="abstract-and-revert">
        <button id="abstract-btn" disabled>Abstract</button>
        <button id="revert-btn" disabled>
        <img src="${chrome.runtime.getURL(
          "images/revert.jpg"
        )}" alt="Revert"></button>
      </div>
        
      
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

  document
    .getElementById("abstract-btn")
    .addEventListener("click", async () => {
      const checkedItems = Array.from(
        document.querySelectorAll(".pii-checkbox:checked")
      ).map((checkbox) => checkbox.getAttribute("data-entity-text"));

      if (checkedItems.length > 0) {
        const originalMessage = window.helper.currentUserMessage;
        const currentMessage = window.helper.getUserInputText();

        // Save the current state before abstraction
        window.helper.saveCurrentState();

        showAbstractLoading();
        await window.helper
          .handleAbstractResponse(originalMessage, currentMessage, checkedItems)
          .finally(() => {
            hideAbstractLoading();
            document.getElementById("abstract-btn").disabled = true;
            document.getElementById("revert-btn").disabled = false;
          });
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

  document.getElementById("revert-btn").addEventListener("click", async () => {
    await window.helper.revertToPreviousState();
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

function showAbstractLoading() {
  const abstractBtn = document.getElementById("abstract-btn");
  if (abstractBtn) {
    abstractBtn.innerHTML = 'Abstract<span class="loader-circle"></span>';
  }
}

function hideAbstractLoading() {
  const abstractBtn = document.getElementById("abstract-btn");
  if (abstractBtn) {
    abstractBtn.innerHTML = "Abstract";
  }
}

// Ensure tooltip has a lower z-index initially
document.addEventListener("click", (event) => {
  const tooltip = document.querySelector(".pii-highlight-tooltip");
  const panel = document.getElementById("pii-replacement-panel");
  if (tooltip && panel) {
    if (panel.contains(event.target)) {
      tooltip.style.zIndex = 999; // Set a lower z-index
    } else if (tooltip.contains(event.target)) {
      tooltip.style.zIndex = 1001; // Bring tooltip to front
      panel.style.zIndex = 1000; // Ensure panel has a lower z-index
    } else {
      tooltip.remove();
      panel.remove();
    }
  }
});
