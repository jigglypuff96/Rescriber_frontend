// content.js

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
    const value = target.value;
    if (value.includes("apple")) {
      target.value = value.replace(/apple/g, "pear");
    }
  }
});
