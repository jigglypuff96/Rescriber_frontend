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
        <input type="checkbox" class="pii-checkbox" data-entity-text="${entity.text}">
      </li>`
    )
    .join("");
  panel.innerHTML = `
    <div class="pii-replacement-header">
      <h4>PrivacyGuard</h4>
      <div class="right-corner-buttons">
        <button id="highlight-btn">Show tooltip</button>
        <span id="select-all">Select All</span>
        <input type="checkbox" id="select-all-checkbox">
        <button id="close-panel-btn">X</button>
      </div>
    </div>
    <ul id="pii-list">${piiList}</ul>
    <div class="pii-replacement-footer">
    <div class="replace-abstract"></div>
      <button id="replace-btn" class="replacePanelActionButton" disabled>Replace</button>
      <button id="abstract-btn" class="replacePanelActionButton" disabled>Abstract<span class="loader-circle" style="display: none;"></span></button>
      <button id="revert-btn" class="replacePanelActionButton" disabled>
        <img src="${chrome.runtime.getURL("images/revert.jpg")}" alt="Revert">
      </button>
    </div>
  `;

  document
    .getElementById("select-all-checkbox")
    .addEventListener("change", () => {
      const allChecked = document.getElementById("select-all-checkbox").checked;
      document.querySelectorAll(".pii-checkbox").forEach((checkbox) => {
        // checkbox.checked = true;
        checkbox.checked = allChecked;
      });
      toggleButtonsState();
    });

  document.querySelectorAll(".pii-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", toggleButtonsState);
  });

  document.getElementById("replace-btn").addEventListener("click", () => {
    const checkedItems = Array.from(
      document.querySelectorAll(".pii-checkbox:checked")
    ).map((checkbox) => checkbox.getAttribute("data-entity-text"));

    if (checkedItems.length > 0) {
      window.helper.saveCurrentState();
      const entitiesToReplace =
        window.helper.getEntitiesForSelectedText(checkedItems);
      window.helper.replaceWords(entitiesToReplace);
    }
    document.getElementById("abstract-btn").disabled = true;
    document.getElementById("replace-btn").disabled = true;
    document.getElementById("revert-btn").disabled = false;
    disableCheckedCheckboxes();
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
            document.getElementById("replace-btn").disabled = true;
            document.getElementById("revert-btn").disabled = false;
            disableCheckedCheckboxes();
          });
      }
    });

  document.getElementById("revert-btn").addEventListener("click", () => {
    window.helper.revertToPreviousState();
    document.getElementById("revert-btn").disabled = true;
  });

  document.getElementById("close-panel-btn").addEventListener("click", () => {
    panel.style.display = "none";
  });

  document.getElementById("highlight-btn").addEventListener("click", () => {
    window.helper.highlightDetectedWords();
  });

  function checkTooltip() {
    const tooltip = document.querySelector(".pii-highlight-tooltip");
    const highlightButton = document.getElementById("highlight-btn");
    if (tooltip && highlightButton) {
      highlightButton.disabled = tooltip !== null;
    }
  }

  // Initial check
  checkTooltip();

  // Observe changes to the tooltip's existence
  const observer = new MutationObserver(() => {
    checkTooltip();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
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

  function toggleButtonsState() {
    const anyChecked = Array.from(
      document.querySelectorAll(".pii-checkbox")
    ).some((cb) => cb.checked);
    document.getElementById("replace-btn").disabled = !anyChecked;
    document.getElementById("abstract-btn").disabled = !anyChecked;
  }

  function showAbstractLoading() {
    document.querySelector(".loader-circle").style.display = "inline-block";
  }

  function hideAbstractLoading() {
    document.querySelector(".loader-circle").style.display = "none";
  }

  function disableCheckedCheckboxes() {
    const checkboxes = document.querySelectorAll(".pii-checkbox");
    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        checkbox.disabled = true;
        checkbox.checked = false;
      }
    });
  }
}
