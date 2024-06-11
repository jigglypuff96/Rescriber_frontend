window.helper = {
  enabled: true,
  detectedEntities: [],
  tempPlaceholder2PiiMappings: {},
  pii2PlaceholderMappings: {},
  piiMappings: {},
  entityCounts: {},
  entities: [],

  getUserInputText: function () {
    const input = document.querySelector("textarea, input[type='text']");
    return input ? input.value : "";
  },

  generateUserMessageCluster: function (userMessage, entities) {
    let clusterMessage = `<message>${userMessage}</message>`;
    entities.forEach(function (value, i) {
      clusterMessage += `<pii${i + 1}>${value.text}</pii${i + 1}>`;
    });
    return clusterMessage;
  },

  simplifyClustersWithTypes: function (clusters, entities) {
    const groupedClusters = {};
    const associatedGroups = [];

    function mergeClusters(key, visited = new Set()) {
      if (visited.has(key)) return groupedClusters[key];
      visited.add(key);

      if (!groupedClusters[key]) {
        groupedClusters[key] = new Set(clusters[key] || []);
      }

      clusters[key]?.forEach((value) => {
        if (value !== key) {
          groupedClusters[key].add(value);
          const nestedCluster = mergeClusters(value, visited);
          nestedCluster.forEach((nestedValue) => {
            groupedClusters[key].add(nestedValue);
          });
        }
      });

      return groupedClusters[key];
    }

    Object.keys(clusters).forEach((key) => {
      mergeClusters(key);
    });

    // Merge sets with overlapping values and respect entity types
    const mergedClusters = [];
    const seen = new Set();

    Object.keys(groupedClusters).forEach((key) => {
      if (!seen.has(key)) {
        const cluster = groupedClusters[key];
        cluster.forEach((value) => seen.add(value));
        mergedClusters.push(Array.from(cluster));
      }
    });

    const finalClusters = [];
    mergedClusters.forEach((cluster) => {
      const typeMap = {};
      const associatedGroup = new Set();

      cluster.forEach((item) => {
        const entityType = entities
          .find((entity) => entity.text === item)
          ?.entity_type.replace(/[0-9]/g, "");
        if (entityType) {
          if (!typeMap[entityType]) {
            typeMap[entityType] = [];
          }
          typeMap[entityType].push(item);
        }
        associatedGroup.add(item);
      });

      Object.keys(typeMap).forEach((type) => {
        finalClusters.push(typeMap[type]);
      });

      if (Object.keys(typeMap).length > 1) {
        associatedGroups.push(Array.from(associatedGroup));
      }
    });

    return { finalClusters, associatedGroups };
  },

  processEntities: function (entities, finalClusters) {
    const activeConversationId = this.getActiveConversationId() || "no-url";
    if (!entityCounts[activeConversationId]) {
      entityCounts[activeConversationId] = {};
    }

    const localEntityCounts = { ...entityCounts[activeConversationId] };
    const pii2PlaceholderMapping = {};
    const tempMappings = {};

    finalClusters.forEach((cluster) => {
      const entityType = entities
        .find((entity) => cluster.includes(entity.text))
        ?.entity_type.replace(/[0-9]/g, "");
      if (entityType) {
        if (!localEntityCounts[entityType]) {
          localEntityCounts[entityType] = 1;
        } else {
          localEntityCounts[entityType]++;
        }

        const placeholder = `${entityType}${localEntityCounts[entityType]}`;

        cluster.forEach((item) => {
          pii2PlaceholderMapping[item] = placeholder;
          if (!tempMappings[placeholder]) {
            tempMappings[placeholder] = item;
          }
        });
      }
    });

    entities.forEach((entity) => {
      entity.entity_type =
        pii2PlaceholderMapping[entity.text] || entity.entity_type;
    });

    entityCounts[activeConversationId] = localEntityCounts;
    this.tempPlaceholder2PiiMappings[activeConversationId] = {
      ...this.tempPlaceholder2PiiMappings[activeConversationId],
      ...tempMappings,
    };

    this.pii2PlaceholderMappings[activeConversationId] = {
      ...this.pii2PlaceholderMappings[activeConversationId],
      ...pii2PlaceholderMapping,
    };

    // Save tempPlaceholder2PiiMappings to chrome storage
    chrome.storage.local.set(
      { tempPlaceholder2PiiMappings: this.tempPlaceholder2PiiMappings },
      () => {
        console.log(
          "Temporary PII mappings updated:",
          this.tempPlaceholder2PiiMappings
        );
      }
    );

    chrome.storage.local.set({
      pii2PlaceholderMappings: this.pii2PlaceholderMappings,
    });

    return entities;
  },

  detectWords: function (userMessage, entities) {
    if (!this.enabled) return;

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
        this.displayHighlight(input, highlightedValue);
      }
    });
  },

  displayHighlight: function (target, highlightedValue) {
    const existingTooltips = document.querySelectorAll(".tooltip");
    existingTooltips.forEach((existingTooltip) => existingTooltip.remove());

    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip");
    tooltip.innerHTML = highlightedValue;

    document.body.appendChild(tooltip);

    // Calculate the position of the tooltip
    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    // Set max-width to the width of the input box
    tooltip.style.maxWidth = `${rect.width}px`;

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
      tooltip.style.top = `${
        rect.top + window.scrollY + target.offsetHeight
      }px`;
    }

    target.addEventListener("blur", () => {
      tooltip.remove();
    });

    target.addEventListener("input", () => {
      tooltip.remove();
    });
  },

  replaceWords: function (entities) {
    const textareas = document.querySelectorAll("textarea");
    const inputs = document.querySelectorAll("input[type='text']");

    const activeConversationId = this.getActiveConversationId() || "no-url";
    console.log("Current active conversation ID:", activeConversationId);

    if (!this.entityCounts[activeConversationId]) {
      this.entityCounts[activeConversationId] = {};
    }

    entities.forEach((entity) => {
      if (!this.tempPlaceholder2PiiMappings[activeConversationId]) {
        this.tempPlaceholder2PiiMappings[activeConversationId] = {};
      }
      if (
        !this.tempPlaceholder2PiiMappings[activeConversationId][
          entity.entity_type
        ]
      ) {
        this.tempPlaceholder2PiiMappings[activeConversationId][
          entity.entity_type
        ] = entity.text;
      }
    });

    console.log(
      "Temporary PII mappings updated:",
      this.tempPlaceholder2PiiMappings
    );

    textareas.forEach((textarea) => {
      entities.forEach((entity) => {
        const regex = new RegExp(`(${entity.text})`, "gi");
        textarea.value = textarea.value.replace(
          regex,
          `{${entity.entity_type}}`
        );
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
  },

  replaceSinglePii: function (piiText, entityType) {
    const inputs = document.querySelectorAll("textarea, input[type='text']");
    const regex = new RegExp(`(${piiText})`, "gi");

    inputs.forEach((input) => {
      input.value = input.value.replace(regex, `{${entityType}}`);
    });
  },

  getActiveConversationId: function () {
    const url = window.location.href;
    const conversationIdMatch = url.match(/\/c\/([a-z0-9-]+)/);
    return conversationIdMatch ? conversationIdMatch[1] : "no-url";
  },

  replaceTextInElement: function (element) {
    const activeConversationId = this.getActiveConversationId();
    const storageKey =
      activeConversationId !== "no-url"
        ? `piiMappings_${activeConversationId}`
        : null;

    chrome.storage.local.get(null, (data) => {
      const piiMappings =
        activeConversationId !== "no-url"
          ? {
              ...data[storageKey],
              ...data.tempPlaceholder2PiiMappings[`${activeConversationId}`],
              ...data.tempPlaceholder2PiiMappings["no-url"],
            }
          : data.tempPlaceholder2PiiMappings["no-url"] || {};

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
  },

  checkMessageRenderedAndReplace: function (element) {
    const interval = setInterval(() => {
      const starButton = element?.parentElement?.parentElement
        ?.querySelector('button[aria-haspopup="menu"]')
        ?.querySelector("div .icon-md");

      if (starButton) {
        console.log("Message rendering complete, performing text replacement");
        this.replaceTextInElement(element);

        const activeConversationId = this.getActiveConversationId();
        if (activeConversationId !== "no-url") {
          // Move temporary mappings to actual mappings once the conversation ID is available
          chrome.storage.local.get(
            `piiMappings_${activeConversationId}`,
            (data) => {
              piiMappings[activeConversationId] = {
                ...data[`piiMappings_${activeConversationId}`],
                ...this.tempPlaceholder2PiiMappings[`${activeConversationId}`],
                ...this.tempPlaceholder2PiiMappings["no-url"],
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
                  delete this.tempPlaceholder2PiiMappings["no-url"];
                  delete this.tempPlaceholder2PiiMappings[
                    `${activeConversationId}`
                  ];
                  chrome.storage.local.set(
                    {
                      tempPlaceholder2PiiMappings:
                        this.tempPlaceholder2PiiMappings,
                    },
                    () => {
                      console.log(
                        "Temporary PII mappings updated:",
                        this.tempPlaceholder2PiiMappings
                      );
                    }
                  );
                }
              );

              // Save entityCounts to chrome storage
              chrome.storage.local.get("entityCounts", (data) => {
                const counts = data.entityCounts || {};
                counts[activeConversationId] = {
                  ...counts[activeConversationId],
                  ...entityCounts[activeConversationId],
                  ...entityCounts["no-url"],
                };
                delete entityCounts["no-url"];
                entityCounts[activeConversationId] =
                  counts[activeConversationId];
                chrome.storage.local.set({ entityCounts: counts }, () => {
                  console.log("Entity counts updated:", counts);
                });
              });
            }
          );
        }
        clearInterval(interval);
      }
    }, 100); // Check every 100ms
  },
};
