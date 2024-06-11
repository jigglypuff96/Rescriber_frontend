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
      (entity) => `<li>${entity.text} - ${entity.entity_type} 
      <button class="replace-single-btn" data-pii-text="${entity.text}" data-entity-type="${entity.entity_type}">Replace</button></li>`
    )
    .join("");
  panel.innerHTML = `
          <h4>PII Replacements</h4>
          <ul id="pii-list">${piiList}</ul>
          <button id="replace-all-btn">Replace All</button>
          <button id="highlight-btn">Highlight</button>
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
    window.helper.detectWords(userMessage, detectedEntities);
  });
}
