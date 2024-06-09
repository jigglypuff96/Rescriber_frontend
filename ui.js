const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = chrome.runtime.getURL("ui.css");
document.head.appendChild(link);

let panel = document.getElementById("pii-replacement-panel");
if (!panel) {
  panel = document.createElement("div");
  panel.id = "pii-replacement-panel";
  panel.innerHTML = `
    <h4>PII Replacements</h4>
    <ul id="pii-list"></ul>
    <button id="replace-all">Replace All</button>
  `;
  document.body.appendChild(panel);
}

// Function to update the PII list
export function updatePiiList(detectedEntities) {
  const piiList = document.getElementById("pii-list");
  piiList.innerHTML = ""; // Clear existing list

  detectedEntities.forEach((entity) => {
    const listItem = document.createElement("li");
    listItem.innerHTML = `
      ${entity.text} - ${entity.entity_type}
      <button class="replace-single" data-pii-text="${entity.text}" data-entity-type="${entity.entity_type}">Replace</button>
    `;
    piiList.appendChild(listItem);
  });

  document.getElementById("replace-all").onclick = () => {
    replaceAllPii(detectedEntities);
  };

  const replaceButtons = document.querySelectorAll(".replace-single");
  replaceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const piiText = button.getAttribute("data-pii-text");
      const entityType = button.getAttribute("data-entity-type");
      replaceSinglePii(piiText, entityType);
    });
  });
}

function replaceSinglePii(piiText, entityType) {
  console.log(`Replacing single PII: ${piiText} - ${entityType}`);
  const inputs = document.querySelectorAll("textarea, input[type='text']");
  const regex = new RegExp(`(${piiText})`, "gi");

  inputs.forEach((input) => {
    input.value = input.value.replace(regex, `{${entityType}}`);
  });

  console.log(`Replaced ${piiText} with {${entityType}}`);
}

function replaceAllPii(detectedEntities) {
  console.log("Replacing all PII");
  detectedEntities.forEach((entity) => {
    replaceSinglePii(entity.text, entity.entity_type);
  });
}
