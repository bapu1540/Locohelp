import { supabase, getCurrentUser } from "./supabase";

/**
 * Sends a prompt to the AI server and saves the chat history to Supabase.
 */
export async function askAIAndSave(userPrompt: string) {
  try {
    // 1. Send prompt to our secure server-side Gemini API
    const response = await fetch("/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Server Error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.text;

    // 2. Save chat history to Supabase with the user's ID
    const currentUser = getCurrentUser();
    const userId = currentUser?.uid || "anonymous";
    
    try {
      await supabase.from("chats").insert({
        prompt: userPrompt,
        response: aiResponse,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
    } catch (e) {}
    
    return aiResponse;
  } catch (error) {
    console.error("Error asking AI:", error);
    throw error;
  }
}
