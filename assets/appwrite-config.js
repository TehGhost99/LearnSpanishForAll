// Appwrite Cloud configuration for LearnSpanishForAll.
// Public project ID is safe to ship in the browser. Never put API keys here.
window.APPWRITE_CONFIG = {
  endpoint: "https://sfo.cloud.appwrite.io/v1",
  projectId: "6a78a8d900090c79eec5",
  projectName: "Learnig Spanish",
  databaseId: "6a78f1210011f4b9c94e", // TablesDB "Practice"
  tableId: "progress",
  // Deployed Appwrite Function that grades written checks via Groq (GPT-OSS 20B).
  functionId: "grade-check"
};
