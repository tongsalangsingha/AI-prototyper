// --- Step 1: Import necessary libraries ---
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs'; // Import File System module for future use (Dynamic Prompt)

// --- Step 2: Configuration ---
const app = express();
const port = 3000;

// ⬇️ API Key provided by the user
const API_KEY = "[Insert Your API KEY Here]"; 

if (!API_KEY || API_KEY.startsWith("YOUR_")) { 
    console.error("!!! ERROR: API_KEY is missing or invalid. Please paste your valid Google AI Studio API key into server.js");
}

// --- Step 3: Server Middleware ---
app.use(cors());      
app.use(express.json()); 

// --- Step 4: Initialize AI Model ---
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-09-2025",
    // Ensure JSON output mode is configured
    generationConfig: { responseMimeType: "application/json" }
});

// --- Step 5: Define the AI's "Brain" (System Prompt with Styling) ---

// Define the core instructions and schema
const systemInstructionsText = `
You are an expert UI/UX designer specializing in mobile app forms and layouts. Your job is to take a user's prompt and convert it into a structured JSON array of components for that screen, including basic styling.

**CRITICAL RULES:**
1.  You MUST only use the components available: "Header", "Text Field", "Button", "Checkbox", "RadioButton", "Switch".
2.  Your response MUST be a valid JSON array \`[]\` and nothing else. No introductory text.
3.  Match keywords in the user prompt to the correct component:
    * "selection", "choose one", "gender" => MUST use "RadioButton". Group with 'groupName'.
    * "check box", "agree", "terms", "opt-in" => MUST use "Checkbox".
    * "toggle", "enable/disable", "on/off" => MUST use "Switch".
    * Standard text input => use "Text Field".
    * Actions => use "Button". Use color hints ("primary", "secondary", "destructive") if appropriate.
    * Titles => use "Header". Center align headers unless specified otherwise.
4.  Keep designs clean, single column for mobile. Add appropriate labels.
5.  Use styling properties ONLY when relevant (e.g., \`textAlign\` for text, \`color\` for buttons). Default alignment is LEFT unless specified. Headers should default to CENTER.

Here is the JSON schema you MUST follow:
[
  {
    "component": "Header",
    "props": { 
      "text": "The title text", 
      "textAlign": "CENTER" | "LEFT" | "RIGHT" // Optional, default CENTER
    }
  },
  {
    "component": "Text Field",
    "props": { 
      "label": "Label above the field", 
      "placeholder": "Placeholder text inside" 
    }
  },
  {
    "component": "Button",
    "props": { 
      "label": "Text on the button", 
      "color": "primary" | "secondary" | "destructive" // Optional hint
    } 
  },
  {
    "component": "Checkbox",
    "props": { 
      "label": "Text label next to the checkbox", 
      "checked": true | false 
    }
  },
  {
    "component": "RadioButton",
    "props": { 
      "label": "Text label next to the radio button", 
      "checked": true | false, 
      "groupName": "unique_group_name" 
    }
  },
  {
    "component": "Switch",
    "props": { 
      "label": "Text label for the switch", 
      "checked": true | false 
    }
  }
]

**Example 1: "User profile settings..."**
[
  {"component": "Header", "props": {"text": "Profile Settings", "textAlign": "CENTER"}},
  {"component": "Switch", "props": {"label": "Enable Dark Mode", "checked": false}},
  {"component": "Checkbox", "props": {"label": "Subscribe to newsletter", "checked": true}},
  {"component": "Button", "props": {"label": "Save Changes", "color": "primary"}}
]

**Example 2: "Signup form..."**
[
  {"component": "Header", "props": {"text": "Create Account", "textAlign": "CENTER"}},
  {"component": "Text Field", "props": {"label": "Username", "placeholder": "Choose a username"}},
  {"component": "Text Field", "props": {"label": "Password", "placeholder": "Create a password"}},
  {"component": "Header", "props": {"text": "Gender", "textAlign": "LEFT"}}, // Left align subsection header
  {"component": "RadioButton", "props": {"label": "Male", "checked": false, "groupName": "gender"}},
  {"component": "RadioButton", "props": {"label": "Female", "checked": false, "groupName": "gender"}},
  {"component": "RadioButton", "props": {"label": "Other", "checked": false, "groupName": "gender"}},
  {"component": "Checkbox", "props": {"label": "I agree to the terms", "checked": false}},
  {"component": "Button", "props": {"label": "Register", "color": "primary"}}
]

Now, process the user's next prompt according to these rules and examples.
`;

// --- Step 6: Define the Server's API Endpoint ---
app.post('/generate', async (req, res) => {
    try {
        const userPrompt = req.body.prompt;
        if (!userPrompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }
        
        console.log(`Received prompt: ${userPrompt}`);

        // Use the instructions as the first user message
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemInstructionsText }] },
                { role: "model", parts: [{ text: "OK. I understand the rules and schema for UI components, including styling hints like textAlign and color. I will generate JSON accordingly." }] }
            ]
        });
        
        const result = await chat.sendMessage(userPrompt); 
        
        // --- (Error handling for blocked/empty responses remains the same) ---
        if (!result.response || !result.response.candidates || result.response.candidates.length === 0 || !result.response.candidates[0].content) {
            console.error("AI response was blocked or empty. Finish Reason:", result.response?.candidates?.[0]?.finishReason);
             let blockMessage = "AI response blocked or invalid.";
             if(result.response?.candidates?.[0]?.finishReason === 'SAFETY') {
                 blockMessage = "AI response blocked due to safety settings.";
             } else if (result.response?.candidates?.[0]?.finishReason) {
                 blockMessage = `AI response incomplete. Reason: ${result.response.candidates[0].finishReason}`;
             }
            return res.status(500).json({ error: blockMessage });
        }

        const responseText = result.response.text();
        console.log("AI Response:", responseText);

        // --- (Basic JSON validation remains the same) ---
         if (!responseText.trim().startsWith('[')) {
             console.error("AI did not return a valid JSON array start.");
             return res.status(500).json({ error: "AI response format error. Expected JSON array."});
         }

        res.json({ json: responseText });

    } catch (error) {
       // --- (Error handling remains the same) ---
        console.error("Error in /generate endpoint:", error); 
        let errorMessage = "Failed to generate AI response.";
         if (error?.message) {
              if (error.message.includes("API key not valid")) errorMessage = "API key not valid.";
              else if (error.message.includes("permission") || error.message.includes("denied")) errorMessage = "API key lacks permissions or billing is not enabled.";
              else errorMessage = error.message.substring(0, 100);
         }
        res.status(500).json({ error: errorMessage });
    }
});

// --- Step 7: Start the Server ---
app.listen(port, () => {
    console.log(`AI Prototyper server listening at http://localhost:${port}`);
    if (!API_KEY || API_KEY.startsWith("YOUR_")) { /* ... warning ... */ } 
    else { console.log("Gemini API key is configured."); }
});
