window.helper = {
  enabled: undefined,
  detectedEntities: [],
  tempPlaceholder2PiiMappings: {},
  pii2PlaceholderMappings: {},
  piiMappings: {},
  entityCounts: {},
  currentEntities: [],
  currentUserMessage: "",
  tempMappings: {},
  previousUserMessage: "",
  previousEntities: [],
  useOnDeviceModel: false,

  toggleModel: async function () {
    this.useOnDeviceModel = !this.useOnDeviceModel;
    chrome.storage.local.set({ useOnDeviceModel: this.useOnDeviceModel });
    const panel = document.getElementById("pii-replacement-panel");
    if (panel) {
      const { updateModelNumberInPanel } = await import(
        chrome.runtime.getURL("replacePanel.js")
      );
      const modelNumber = window.helper.useOnDeviceModel ? 2 : 1;
      updateModelNumberInPanel(modelNumber);
    }
  },
  toggleEnabled: function (enabledStatus) {
    this.enabled = enabledStatus;
  },

  loadModelState: async function () {
    this.useOnDeviceModel = await new Promise((resolve, reject) => {
      chrome.storage.local.get(["useOnDeviceModel"], function (result) {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(
          result.useOnDeviceModel !== undefined
            ? result.useOnDeviceModel
            : false
        );
      });
    });
  },

  getEnabledStatus: async function () {
    this.enabled = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(["enabled"], function (result) {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(result.enabled !== undefined ? result.enabled : true);
      });
    });
  },

  setEnabledStatus: async function (newEnabledState) {
    this.enabled = newEnabledState;
  },

  getUserInputText: function () {
    const input = document.querySelector("textarea, input[type='text']");
    return input ? input.value : "";
  },

  generateUserMessageCluster: function (userMessage, entities) {
    let clusterMessage = `<message>${userMessage}</message>`;
    if (entities.length) {
      entities.forEach(function (value, i) {
        clusterMessage += `<pii${i + 1}>${value.text}</pii${i + 1}>`;
      });
    } else {
      return undefined;
    }
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

  findKeyByValue: function (mapping, value) {
    for (let [k, v] of Object.entries(mapping)) {
      if (v === value) {
        return { exists: true, key: k }; // Returns true and the key if the value is found
      }
    }
    return { exists: false, key: null }; // Returns false and null if the value is not found
  },

  getFromStorage: function (key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  },

  setToStorage: function (data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  processEntities: async function (entities, finalClusters) {
    const activeConversationId = this.getActiveConversationId() || "no-url";
    if (!entityCounts[activeConversationId]) {
      entityCounts[activeConversationId] = {};
    }

    const localEntityCounts = { ...entityCounts[activeConversationId] };

    for (const cluster of finalClusters) {
      for (const entity of entities) {
        if (cluster.includes(entity.text)) {
          const data = await this.getFromStorage(
            `piiMappings_${activeConversationId}`
          );
          const entity2PiiMapping = data[`piiMappings_${activeConversationId}`];

          let placeholder;
          if (this.findKeyByValue(entity2PiiMapping, entity.text).exists) {
            placeholder = this.findKeyByValue(
              entity2PiiMapping,
              entity.text
            ).key;
          } else {
            if (
              this.pii2PlaceholderMappings[activeConversationId] &&
              this.pii2PlaceholderMappings[activeConversationId].hasOwnProperty(
                entity.text
              )
            ) {
              placeholder =
                this.pii2PlaceholderMappings[activeConversationId][entity.text];
            } else if (
              this.tempMappings[activeConversationId] &&
              this.tempMappings[activeConversationId].hasOwnProperty(
                entity.text
              )
            ) {
              placeholder =
                this.tempMappings[activeConversationId][entity.text];
            } else {
              const entityType = entity.entity_type.replace(/[0-9]/g, "");
              if (entityType) {
                localEntityCounts[entityType] =
                  (localEntityCounts[entityType] || 0) + 1;
                placeholder = `${entityType}${localEntityCounts[entityType]}`;
              }
            }
          }

          if (!this.pii2PlaceholderMappings[activeConversationId]) {
            this.pii2PlaceholderMappings[activeConversationId] = {};
          }
          if (!this.tempMappings[activeConversationId]) {
            this.tempMappings[activeConversationId] = {};
          }
          cluster.forEach((item) => {
            this.pii2PlaceholderMappings[activeConversationId][item] =
              placeholder;
            this.tempMappings[activeConversationId][placeholder] = item;
          });
          // Break since we want to stop at the first match within a cluster
          break;
        }
      }
    }

    for (const entity of entities) {
      if (
        this.pii2PlaceholderMappings &&
        this.pii2PlaceholderMappings[activeConversationId]
      ) {
        entity.entity_type =
          this.pii2PlaceholderMappings[activeConversationId][entity.text];
      }
    }

    entityCounts[activeConversationId] = localEntityCounts;
    this.tempPlaceholder2PiiMappings[activeConversationId] = {
      ...this.tempPlaceholder2PiiMappings[activeConversationId],
      ...this.tempMappings[activeConversationId],
    };

    // Save tempPlaceholder2PiiMappings and pii2PlaceholderMappings to chrome storage
    await this.setToStorage({
      tempPlaceholder2PiiMappings: this.tempPlaceholder2PiiMappings,
    });
    await this.setToStorage({
      pii2PlaceholderMappings: this.pii2PlaceholderMappings,
    });

    console.log(
      "Temporary PII mappings updated:",
      this.tempPlaceholder2PiiMappings
    );
    return entities;
  },

  // processEntities: function (entities, finalClusters) {
  //   const activeConversationId = this.getActiveConversationId() || "no-url";
  //   if (!entityCounts[activeConversationId]) {
  //     entityCounts[activeConversationId] = {};
  //   }

  //   const localEntityCounts = { ...entityCounts[activeConversationId] };

  //   finalClusters.forEach((cluster) => {
  //     for (let i = 0; i < entities.length; i++) {
  //       const entity = entities[i];
  //       // Check if the cluster includes the entity's text

  //       if (cluster.includes(entity.text)) {
  //         let placeholder;
  //         chrome.storage.local.get(
  //           `piiMappings_${activeConversationId}`,
  //           (data) => {
  //             const entity2PiiMapping =
  //               data[`piiMappings_${activeConversationId}`];
  //             if (this.findKeyByValue(entity2PiiMapping, entity.text).exists) {
  //               placeholder = this.findKeyByValue(
  //                 entity2PiiMapping,
  //                 entity.text
  //               ).key;
  //             } else {
  //               const entityType = entity.entity_type.replace(/[0-9]/g, "");
  //               if (entityType) {
  //                 if (!localEntityCounts[entityType]) {
  //                   localEntityCounts[entityType] = 1;
  //                 } else {
  //                   localEntityCounts[entityType]++;
  //                 }

  //                 placeholder = `${entityType}${localEntityCounts[entityType]}`;
  //               }
  //             }

  //             if (!this.pii2PlaceholderMappings[activeConversationId]) {
  //               this.pii2PlaceholderMappings[activeConversationId] = {};
  //             }
  //             if (!this.tempMappings[activeConversationId]) {
  //               this.tempMappings[activeConversationId] = {};
  //             }
  //             cluster.forEach((item) => {
  //               if (!this.pii2PlaceholderMappings[activeConversationId][item]) {
  //                 this.pii2PlaceholderMappings[activeConversationId][item] =
  //                   placeholder;
  //               }

  //               if (!this.tempMappings[activeConversationId][placeholder]) {
  //                 this.tempMappings[activeConversationId][placeholder] = item;
  //               }
  //             });
  //           }
  //         );

  //         break;
  //       }
  //     }
  //   });

  //   entities.forEach((entity) => {
  //     if (
  //       // If this.pii2PlaceholderMappings is not undefined
  //       this.pii2PlaceholderMappings &&
  //       this.pii2PlaceholderMappings[activeConversationId]
  //     ) {
  //       entity.entity_type =
  //         this.pii2PlaceholderMappings[activeConversationId][entity.text];
  //     }
  //   });

  //   entityCounts[activeConversationId] = localEntityCounts;
  //   this.tempPlaceholder2PiiMappings[activeConversationId] = {
  //     ...this.tempPlaceholder2PiiMappings[activeConversationId],
  //     ...this.tempMappings[activeConversationId],
  //   };

  //   // Save tempPlaceholder2PiiMappings to chrome storage
  //   chrome.storage.local.set(
  //     { tempPlaceholder2PiiMappings: this.tempPlaceholder2PiiMappings },
  //     () => {
  //       console.log(
  //         "Temporary PII mappings updated:",
  //         this.tempPlaceholder2PiiMappings
  //       );
  //     }
  //   );

  //   chrome.storage.local.set({
  //     pii2PlaceholderMappings: this.pii2PlaceholderMappings,
  //   });

  //   return entities;
  // },

  getResponseDetect: async function (userMessage) {
    let entities;
    console.log("Now using on device model: ", this.useOnDeviceModel);
    if (!this.useOnDeviceModel) {
      const { getCloudResponseDetect } = await import(
        chrome.runtime.getURL("openai.js")
      );
      entities = await getCloudResponseDetect(userMessage);
    } else {
      const { getOnDeviceResponseDetect } = await import(
        chrome.runtime.getURL("ondevice.js")
      );
      entities = await getOnDeviceResponseDetect(userMessage);
    }
    return entities;
  },

  getResponseCluster: async function (clusterMessage) {
    let clustersResponse;
    if (!this.useOnDeviceModel) {
      const { getCloudResponseCluster } = await import(
        chrome.runtime.getURL("openai.js")
      );
      clustersResponse = await getCloudResponseCluster(clusterMessage);
    } else {
      const { getOnDeviceResponseCluster } = await import(
        chrome.runtime.getURL("ondevice.js")
      );
      clustersResponse = await getOnDeviceResponseCluster(clusterMessage);
    }
    return clustersResponse;
  },

  getAbstractResponse: async function (
    originalMessage,
    currentMessage,
    abstractList
  ) {
    let abstractResponse;
    if (!this.useOnDeviceModel) {
      const { getCloudAbstractResponse } = await import(
        chrome.runtime.getURL("openai.js")
      );
      const abstractResponseResult = await getCloudAbstractResponse(
        originalMessage,
        currentMessage,
        abstractList
      );
      const abstractResponseObject = JSON.parse(abstractResponseResult);
      if (abstractResponseObject) {
        abstractResponse = abstractResponseObject.text;
      } else {
        abstractResponse = undefined;
      }
    } else {
      const { getOnDeviceAbstractResponse } = await import(
        chrome.runtime.getURL("ondevice.js")
      );
      abstractResponse = await getOnDeviceAbstractResponse(
        originalMessage,
        currentMessage,
        abstractList
      );
    }
    return abstractResponse;
  },

  filterEntities: function (entities) {
    const entityPlaceholders = [
      "ADDRESS",
      "IP_ADDRESS",
      "URL",
      "SSN",
      "PHONE_NUMBER",
      "EMAIL",
      "DRIVERS_LICENSE",
      "PASSPORT_NUMBER",
      "TAXPAYER_IDENTIFICATION_NUMBER",
      "ID_NUMBER",
      "NAME",
      "USERNAME",
      "GEOLOCATION",
      "AFFILIATION",
      "DEMOGRAPHIC_ATTRIBUTE",
      "TIME",
      "HEALTH_INFORMATION",
      "FINANCIAL_INFORMATION",
      "EDUCATIONAL_RECORD",
    ];

    const placeholderPattern = new RegExp(
      `\\b(?:${entityPlaceholders.join(
        "|"
      )})\\d+\\b|\\[(?:${entityPlaceholders.join("|")})\\d+\\]`,
      "gi"
    );

    // Use a Set to keep track of unique entities
    const seen = new Set();
    const filteredEntities = entities.filter((entity) => {
      const identifier = `${entity.entity_type}:${entity.text}`;
      if (seen.has(identifier)) {
        return false; // Skip duplicate entities
      }
      seen.add(identifier);

      const match = placeholderPattern.test(entity.text);

      // Additional check for placeholders
      const additionalCheck = entityPlaceholders.some((placeholder) =>
        new RegExp(
          `\\b${placeholder}\\d+\\b|\\[${placeholder}\\d+\\]`,
          "gi"
        ).test(entity.text)
      );

      return !(match || additionalCheck);
    });

    return filteredEntities;
  },

  handleDetect: async function () {
    if (!this.enabled) {
      return;
    }
    const userMessage = this.getUserInputText();
    this.currentUserMessage = userMessage;
    let entities = await this.getResponseDetect(this.currentUserMessage);
    if (!entities) {
      this.currentEntities = [];
      return false;
    }
    entities = this.filterEntities(entities);
    if (entities.length === 0) {
      this.currentEntities = [];
      return false;
    }
    const clusterMessage = this.generateUserMessageCluster(
      this.currentUserMessage,
      entities
    );
    let finalClusters = [];
    if (clusterMessage && !this.useOnDeviceModel) {
      const clustersResponse = await this.getResponseCluster(clusterMessage);
      const clusters = JSON.parse(clustersResponse);
      const { finalClusters, associatedGroups } =
        this.simplifyClustersWithTypes(clusters, entities);
      const detectedEntities = await this.processEntities(
        entities,
        finalClusters
      );

      this.currentEntities = detectedEntities;
      return true;
    }
    finalClusters = entities.map((entity) => [entity.text]);
    const detectedEntities = await this.processEntities(
      entities,
      finalClusters
    );
    this.currentEntities = detectedEntities;
    return true;
  },

  handleDetectAndHighlight: async function () {
    if (!this.enabled) {
      return;
    }
    if (await this.handleDetect()) {
      await this.highlightWords(this.currentUserMessage, this.currentEntities);
      await this.showReplacementPanel(this.currentEntities);
    }
  },

  highlightDetectedWords: async function () {
    if (!this.enabled) {
      return;
    }
    await this.highlightWords(this.currentUserMessage, this.currentEntities);
  },

  showReplacementPanel: async function (detectedEntities) {
    if (!this.enabled) {
      return;
    }
    const { createPIIReplacementPanel } = await import(
      chrome.runtime.getURL("replacePanel.js")
    );
    const modelNumber = window.helper.useOnDeviceModel ? 2 : 1;
    await createPIIReplacementPanel(detectedEntities, modelNumber);
  },

  highlightDetectedAndShowReplacementPanel: async function () {
    if (!this.enabled) {
      return;
    }
    await this.highlightWords(this.currentUserMessage, this.currentEntities);
    this.showReplacementPanel(this.currentEntities);
  },

  saveCurrentState: function () {
    this.previousUserMessage = this.currentUserMessage;
    this.previousEntities = [...this.currentEntities];
  },

  revertToPreviousState: async function () {
    const input = document.querySelector("textarea, input[type='text']");
    if (input) {
      input.value = this.previousUserMessage;
      this.currentUserMessage = this.previousUserMessage;
      this.currentEntities = [...this.previousEntities];
      await this.updatePIIReplacementPanel(this.currentEntities);
    }
  },

  highlightWords: async function (userMessage, entities) {
    if (!this.enabled || !userMessage || !entities) return;
    if (!document.querySelector("#detect-next-to-input-button")) {
      const { addDetectButton } = await import(
        chrome.runtime.getURL("buttonWidget.js")
      );
      addDetectButton();
    }

    const inputs = document.querySelectorAll("textarea, input[type='text']");
    inputs.forEach((input) => {
      if (input.value === userMessage) {
        let highlightedValue = input.value;

        entities.forEach((entity) => {
          const regex = new RegExp(
            `(\\[?${entity.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]?)`,
            "gi"
          );
          highlightedValue = this.replaceTextWithHighlight(
            highlightedValue,
            regex
          );
        });

        this.displayHighlight(input, highlightedValue);
      }
    });
  },

  replaceTextWithHighlight: function (text, regex) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = text;

    function replaceTextNode(node) {
      const matches = node.nodeValue.match(regex);
      if (matches) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        matches.forEach((match) => {
          const index = node.nodeValue.indexOf(match, lastIndex);
          if (index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(
                node.nodeValue.substring(lastIndex, index)
              )
            );
          }
          const span = document.createElement("span");
          span.className = "highlight";
          span.textContent = match;
          fragment.appendChild(span);
          lastIndex = index + match.length;
        });
        if (lastIndex < node.nodeValue.length) {
          fragment.appendChild(
            document.createTextNode(node.nodeValue.substring(lastIndex))
          );
        }
        node.parentNode.replaceChild(fragment, node);
      }
    }

    function traverseNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        replaceTextNode(node);
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.nodeName !== "SPAN"
      ) {
        node.childNodes.forEach(traverseNodes);
      }
    }

    tempDiv.childNodes.forEach(traverseNodes);

    return tempDiv.innerHTML;
  },

  displayHighlight: function (target, highlightedValue) {
    const existingTooltips = document.querySelectorAll(
      ".pii-highlight-tooltip"
    );
    existingTooltips.forEach((existingTooltip) => existingTooltip.remove());

    const tooltip = document.createElement("div");
    tooltip.classList.add("pii-highlight-tooltip");
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

    // target.addEventListener("blur", () => {
    //   tooltip.remove();
    // });

    target.addEventListener("input", () => {
      tooltip.remove();
    });
  },

  getEntitiesForSelectedText: function (selectedTexts) {
    return this.currentEntities.filter((entity) =>
      selectedTexts.includes(entity.text)
    );
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

    // Sort entities by text length in descending order to handle substrings in replacement
    entities.sort((a, b) => b.text.length - a.text.length);

    const performReplacement = (element, value) => {
      entities.forEach((entity) => {
        const regex = new RegExp(
          `\\b${this.replacementEscapeRegExp(entity.text)}\\b`,
          "gi"
        );
        value = value.replace(regex, `[${entity.entity_type}]`);
      });
      element.value = value;
    };

    textareas.forEach((textarea) => {
      performReplacement(textarea, textarea.value);
    });

    inputs.forEach((input) => {
      performReplacement(input, input.value);
    });

    // Remove tooltips after replacement
    const existingTooltips = document.querySelectorAll(
      ".pii-highlight-tooltip"
    );
    existingTooltips.forEach((existingTooltip) => existingTooltip.remove());
  },

  replacementEscapeRegExp: function (string) {
    // Make sure things like replacing Female to Fe[Gender1] don't happen when Male is detected as Gender1, and user chooses to only replace male
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  getActiveConversationId: function () {
    const url = window.location.href;
    const conversationIdMatch = url.match(/\/c\/([a-z0-9-]+)/);
    return conversationIdMatch ? conversationIdMatch[1] : "no-url";
  },

  getEntitiesByConversationId: function () {
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
      //TODO: convert piiMappings to entities, and update panel based on the current conversationID
    });
  },

  replaceTextInElement: function (element) {
    const activeConversationId = this.getActiveConversationId();
    const storageKey =
      activeConversationId !== "no-url"
        ? `piiMappings_${activeConversationId}`
        : null;

    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error("Extension context invalidated.");
      return;
    }

    chrome.storage.local.get(null, (data) => {
      const piiMappings =
        activeConversationId !== "no-url"
          ? {
              ...data[storageKey],
              ...data.tempPlaceholder2PiiMappings[`${activeConversationId}`],
              ...data.tempPlaceholder2PiiMappings["no-url"],
            }
          : data.tempPlaceholder2PiiMappings["no-url"] || {};

      // Get the background color based on the theme
      const bgColor = document.childNodes[1].classList.contains("dark")
        ? "#23a066"
        : "#ade7cc";

      const placeholderBgColor = document.childNodes[1].classList.contains(
        "dark"
      )
        ? "rgb(213 44 126)"
        : "rgb(231 185 207)";

      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }

      // Recursive function to replace text in all child nodes
      function replaceTextRecursively(node) {
        node.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            let originalText = child.textContent;
            for (let [placeholder, pii] of Object.entries(piiMappings)) {
              const regexCurly = new RegExp(`\\[${placeholder}\\]`, "g");
              const regexPlain = new RegExp(`\\b${placeholder}\\b`, "g");

              originalText = originalText.replace(regexCurly, pii);
              originalText = originalText.replace(regexPlain, pii);
            }

            if (child.textContent !== originalText) {
              const fragment = document.createDocumentFragment();
              let lastIndex = 0;

              // Re-scan the originalText for replaced parts to wrap in spans
              const combinedRegex = new RegExp(
                Object.values(piiMappings)
                  .map((pii) => escapeRegExp(pii))
                  .join("|"),
                "g"
              );

              originalText.replace(combinedRegex, (match, offset) => {
                // Add the text before the match
                if (offset > lastIndex) {
                  fragment.appendChild(
                    document.createTextNode(
                      originalText.slice(lastIndex, offset)
                    )
                  );
                }

                const span = document.createElement("span");
                span.className = "highlight-pii-in-displayed-message";
                span.style.backgroundColor = bgColor;
                span.textContent = match;

                const placeholder = Object.keys(piiMappings).find(
                  (key) => piiMappings[key] === match
                );
                span.setAttribute("data-placeholder", placeholder);

                fragment.appendChild(span);
                lastIndex = offset + match.length;
              });

              // Add any remaining text after the last match
              if (lastIndex < originalText.length) {
                fragment.appendChild(
                  document.createTextNode(originalText.slice(lastIndex))
                );
              }
              child.replaceWith(fragment);
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            replaceTextRecursively(child);
          }
        });
      }

      // Find all <p> tags within the element and process them
      if (element.matches('[data-message-author-role="assistant"]')) {
        element
          .querySelectorAll("p, li, div, span, strong, em, u, b, i")
          .forEach((el) => {
            replaceTextRecursively(el);
          });
      } else if (element.matches('[data-message-author-role="user"]')) {
        replaceTextRecursively(element);
      }

      // After replacing text, add event listeners for the placeholders
      const spans = element.querySelectorAll(
        "span.highlight-pii-in-displayed-message"
      );
      spans.forEach((span) => {
        const placeholder = span.getAttribute("data-placeholder");
        span.addEventListener("mouseenter", () => {
          span.textContent = placeholder;
          span.style.backgroundColor = placeholderBgColor;
        });
        span.addEventListener("mouseleave", () => {
          span.textContent = piiMappings[placeholder];
          span.style.backgroundColor = bgColor;
        });
      });
    });
  },

  handleAbstractResponse: async function (
    originalMessage,
    currentMessage,
    abstractList
  ) {
    const abstractResponse = await this.getAbstractResponse(
      originalMessage,
      currentMessage,
      abstractList
    );

    if (abstractResponse) {
      const input = document.querySelector("textarea, input[type='text']");
      if (input) {
        input.value = abstractResponse;
        this.currentUserMessage = abstractResponse;
        // this.updateDetectedEntities();
        // await this.updatePanelWithCurrentDetection();
      }
    }
  },

  updateDetectedEntities: function () {
    const newDetectedEntities = [];
    const inputText = this.currentUserMessage;

    this.currentEntities.forEach((entity) => {
      if (inputText.includes(entity.text)) {
        newDetectedEntities.push(entity);
      }
    });

    this.currentEntities = newDetectedEntities;
  },

  updatePanelWithCurrentDetection: async function () {
    await this.updatePIIReplacementPanel(this.currentEntities);
  },

  getCurrentEntities: function () {
    return this.currentEntities;
  },

  handleDetectAndUpdatePanel: async function () {
    if (await this.handleDetect()) {
      await this.highlightWords(this.currentUserMessage, this.currentEntities);
      await this.updatePIIReplacementPanel(this.currentEntities);
      return;
    } else {
      await this.updatePIIReplacementPanel(this.currentEntities);
      return;
    }
  },

  updatePIIReplacementPanel: async function (detectedEntities) {
    const panel = document.getElementById("pii-replacement-panel");
    if (panel) {
      panel.remove();
      await this.showReplacementPanel(detectedEntities);
    }
  },

  checkMessageRenderedAndReplace: function (element) {
    if (element.matches('[data-message-author-role="user"]')) {
      this.currentUserMessage = element;
    }
    if (!this.enabled) {
      return;
    }
    const interval = setInterval(() => {
      const starButton = element?.parentElement?.parentElement
        ?.querySelector('button[aria-haspopup="menu"]')
        ?.querySelector("div .icon-md");

      if (starButton) {
        console.log("Message rendering complete, performing text replacement");
        this.replaceTextInElement(element);
        this.replaceTextInElement(this.currentUserMessage);

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
                  delete this.pii2PlaceholderMappings["no-url"];
                  delete this.pii2PlaceholderMappings[
                    `${activeConversationId}`
                  ];
                  delete this.tempMappings["no-url"];
                  delete this.tempMappings[`${activeConversationId}`];
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
