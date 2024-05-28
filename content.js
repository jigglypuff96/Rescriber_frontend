document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
    const value = target.value;
    const highlightedValue = value.replace(
      /(apple)/g,
      '<span class="highlight">$1</span>'
    );
    target.value = value;
    displayHighlight(target, highlightedValue);
  }
});

function displayHighlight(target, highlightedValue) {
  const existingTooltips = document.querySelectorAll(".tooltip");
  existingTooltips.forEach((existingTooltip) => existingTooltip.remove());

  const tooltip = document.createElement("div");
  tooltip.classList.add("tooltip");
  tooltip.innerHTML = highlightedValue;

  const rect = target.getBoundingClientRect();
  tooltip.style.top = `${rect.top + window.scrollY + target.offsetHeight}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(tooltip);
  target.addEventListener("blur", () => {
    tooltip.remove();
  });

  target.addEventListener("input", () => {
    tooltip.remove();
  });
}

// Add a button to the bottom right corner of the page
const replaceButton = document.createElement("button");
replaceButton.innerText = "Replace!";
replaceButton.classList.add("replace-button");
document.body.appendChild(replaceButton);

replaceButton.addEventListener("click", () => {
  const inputs = document.querySelectorAll("textarea, input");
  inputs.forEach((input) => {
    input.value = input.value.replace(/apple/g, "pear");
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
  });
});
