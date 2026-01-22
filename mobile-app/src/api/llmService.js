import { Capacitor } from '@capacitor/core';

// ==========================================
// CONFIGURATION: SET YOUR RENDER URL HERE
// Example: "https://my-app.onrender.com"
// ==========================================
const PROD_BACKEND_URL = "https://nomor-d328g22sv-john-sevens-projects.vercel.app";

// Helper to get the correct API base URL
const getApiBaseUrl = () => {
  if (Capacitor.getPlatform() === 'android') {
    // If user has set a production URL, use it
    if (PROD_BACKEND_URL && PROD_BACKEND_URL.startsWith("https")) {
      return `${PROD_BACKEND_URL}/api`;
    }
    // Otherwise fallback to Emulator Loopback (for local testing)
    return 'http://10.0.2.2:5777/api';
  }
  // Web / Electron (if local)
  return '/api';
};

export const callLLM = async (prompt, systemPrompt = "You are a helpful AI assistant.") => {
  try {
    const baseUrl = getApiBaseUrl();
    const platform = Capacitor.getPlatform();
    console.log(`[LLM Service] Platform: ${platform}, Target URL: ${baseUrl}/llm`);

    const response = await fetch(`${baseUrl}/llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        systemPrompt,
        max_tokens: 12000,
      }),
    });

    if (!response.ok) {
      console.error(`[LLM Service] Error Status: ${response.status}`);
      if (response.status === 401) {
        throw new Error("API key missing or invalid. Check backend .env.");
      }
      if (response.status === 404) {
        throw new Error(`Backend 404 Not Found at: ${baseUrl}/llm. Check URL configuration.`);
      }
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.text) {
      throw new Error("Invalid response format: 'text' field missing");
    }

    return data.text;
  } catch (error) {
    console.error("LLM Service Exception:", error);
    throw error;
  }
};
