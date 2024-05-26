// popup.js

document.getElementById("reviserForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const wordToReplace = document.getElementById("wordToReplace").value;
  const replacementWord = document.getElementById("replacementWord").value;

  chrome.storage.sync.get("revisions", (data) => {
    const revisions = data.revisions || [];
    revisions.push({ wordToReplace, replacementWord });
    chrome.storage.sync.set({ revisions });
    displayWords();
  });

  document.getElementById("reviserForm").reset();
});

function displayWords() {
  chrome.storage.sync.get("revisions", (data) => {
    const wordList = document.getElementById("wordList");
    wordList.innerHTML = "";
    (data.revisions || []).forEach(({ wordToReplace, replacementWord }) => {
      const div = document.createElement("div");
      div.textContent = `${wordToReplace} -> ${replacementWord}`;
      wordList.appendChild(div);
    });
  });
}

displayWords();
