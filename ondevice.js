export async function getOnDeviceResponseDetect(userMessageDetect) {
  const response = await fetch("https://localhost:5331/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessageDetect }),
  });

  const data = await response.json();
  let jsonObject;
  // To receive response from both JS and Python backend
  if (data.results !== undefined || null) {
    if (data.results == "") {
      return;
    }
    jsonObject = data.results;
  } else {
    if (data == "") {
      return;
    }
    jsonObject = data;
  }
  return jsonObject;
}

export async function getOnDeviceResponseCluster(userMessageCluster) {
  const response = await fetch("https://localhost:5331/cluster", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessageCluster }),
  });
  const data = await response.json();
  const resultString = data.results;
  return data.results;
}

export async function getOnDeviceAbstractResponse(
  originalMessage,
  currentMessage,
  abstractList
) {
  const userMessage = `<Text>${currentMessage}</Text>\n<ProtectedInformation>${abstractList.join(
    ", "
  )}</ProtectedInformation>`;
  const response = await fetch("https://localhost:5331/abstract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessage }),
  });
  const data = await response.json();
  const resultString = data.results;
  return normalizeText(resultString);
}

function normalizeText(text) {
  // Remove extra spaces between characters caused by "t h i s"
  text = text.replace(/\s+/g, " ").trim(); // Replace multiple spaces with one and trim ends
  return text;
}
