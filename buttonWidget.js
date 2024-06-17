export function initializeButton() {
  observeSendButton();
  console.log("finished initalizingButton");
}

function observeSendButton() {
  const sendButton = document.querySelector(
    'button[data-testid="fruitjuice-send-button"]'
  );

  if (sendButton) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "disabled"
        ) {
          if (!sendButton.hasAttribute("disabled") && window.helper.enabled) {
            addDetectButton();
          } else {
            removeDetectButton();
          }
        }
      });
    });

    observer.observe(sendButton, { attributes: true });

    // Initially check the button state
    if (!sendButton.hasAttribute("disabled") && window.helper.enabled) {
      addDetectButton();
    } else {
      removeDetectButton();
    }
  } else {
    console.error("Send button not found");
  }
}

function addDetectButton() {
  const sendButton = document.querySelector(
    'button[data-testid="fruitjuice-send-button"]'
  );
  if (sendButton && !document.getElementById("detect-next-to-input-button")) {
    const detectButton = document.createElement("button");
    detectButton.id = "detect-next-to-input-button";
    detectButton.className = "detect-next-to-input-button";
    detectButton.innerHTML = `<span class="detect-circle"></span>`;

    // Append the detect button next to the send button
    document.body.appendChild(detectButton);

    // Add event listener to handle click action
    detectButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevents the event from bubbling up to parent elements
      window.helper.handleDetectAndHighlight();
    });
  }
}

function removeDetectButton() {
  const detectButton = document.getElementById("detect-next-to-input-button");
  if (detectButton) {
    detectButton.remove();
  }
}
