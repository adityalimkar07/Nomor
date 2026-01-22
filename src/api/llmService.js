// Frontend now talks to our own backend; API key lives only on the server (.env)
export const getApiKey = () => {
  // For backwards compatibility we still allow storing a dummy value in localStorage
  // to indicate that AI features are "configured", but the real key is on the backend.
  return localStorage.getItem("anthropicApiKey") || process.env.REACT_APP_ANTHROPIC_API_PLACEHOLDER || null;
};

export const setApiKey = (key) => {
  // We only store a placeholder flag in the browser; real key should be on backend .env
  localStorage.setItem("anthropicApiKey", key || "configured");
};

export const callLLM = async (prompt, systemPrompt = null) => {
  // Client-side check removed; we rely on the backend to handle the key.
  // if (!configured) { ... }

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      max_tokens: 12000, // Increased max_tokens to prevent JSON truncation
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.details || `API error: ${response.status}`;
    console.error('Backend API error:', errorData);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (data && typeof data.text === "string") {
    return data.text.trim();
  }

  console.error('Unexpected API response format:', data);
  throw new Error("Unexpected API response format from backend");
};
