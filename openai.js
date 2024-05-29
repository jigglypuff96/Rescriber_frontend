export async function getResponse(userMessage) {
  const url = "https://api.openai.com/v1/chat/completions";
  const systemPrompt = `You an expert in cybersecurity and data privacy. You are now tasked to detect PII from the given text, using the following taxonomy only:

  Identity: Names of people, including full names, first names, last names, nicknames/aliases, usernames, and initials.
  Identifiers: Numbers and codes that identify a person, such as IP addresses, SSNs, phone numbers, passport numbers, driver's license, credit card numbers and emails.
  Geolocations: Places and locations, such as cities, provinces, countries, international regions, or named infrastructures (bus stops, bridges, etc.).
  Affiliations: Names of organizations, such as public and private companies, schools, universities, public institutions, prisons, healthcare institutions, non-governmental organizations, churches, etc.
  Demographics: Demographic attributes of a person, such as native language, descent, heritage, ethnicity, nationality, religious or political group, job titles, ranks, education, physical descriptions, diagnosis, birthmarks, ages.
  Time: Description of a specific date, time, or duration.
  Online Behavior: Information related to an individual's online activities, including URLs, browsing history, search history, and social media activity.
  Health: Details concerning an individual's health status, medical conditions, treatment records, and health insurance information.
  Financial: Financial details such as bank account numbers, investment records, salary information, and other financial statuses or activities.
  Education: Educational background details, including academic records, transcripts, degrees, and certifications.
  Miscellaneous: Every other type of information that describes an individual and that does not belong to the categories above.
  
  For the given message that a user sends to a chatbot, identify all the personally identifiable information using the above taxonomy only.
  Note that the information should be related to a real person not in a public context, but okay if not uniquely identifiable.
  Result should be in its minimum possible unit.
  Return me ONLY a json in the following format: {"results": [{"entity_type": YOU_DECIDE_THE_PII_TYPE, "text": PART_OF_MESSAGE_YOU_IDENTIFIED_AS_PII]}`;
  const headers = {
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
  });

  // Retrieve the API key from Chrome storage
  const apiKey = await new Promise((resolve, reject) => {
    chrome.storage.sync.get(["openaiApiKey"], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.openaiApiKey);
      }
    });
  });

  headers["Authorization"] = `Bearer ${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return content.results;
  } catch (error) {
    console.error("Error fetching OpenAI response:", error);
    return [];
  }
}
