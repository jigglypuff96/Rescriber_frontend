export async function getOnDeviceResponseDetect(userMessageDetect) {
  const response = await fetch("http://localhost:3000/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessageDetect }),
  });
  const data = await response.json();
  const resultString = data.results;
  const jsonObject = JSON.parse(resultString);
  return jsonObject.results;
}

export async function getOnDeviceResponseCluster(userMessageCluster) {
  const response = await fetch("http://localhost:3000/cluster", {
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
  const response = await fetch("http://localhost:3000/abstract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userMessage }),
  });
  const data = await response.json();
  const resultString = data.results;
  const jsonObject = JSON.parse(resultString);
  return jsonObject.results;
}
