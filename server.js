// --- Step 1: Import necessary libraries ---
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { myComponents } from './my_components.js';
import { myIcons, myIconHints } from './my_icons.js';
import { myIconSVGs } from './my_icons_svg.js';

// --- Step 2: Configuration ---
const app = express();
const port = 3000;

// SECURITY: use env variable for API key, fallback only for local dev
const API_KEY = process.env.GEMINI_API_KEY || "Enter Your API KEY HERE";
if (!API_KEY || API_KEY.startsWith("YOUR_")) {
  console.warn("WARNING: GEMINI_API_KEY is not set. Please configure your API key before running the server.");
}

// --- Step 3: Server Middleware ---
app.use(cors());
app.use(express.json());

// --- Step 4: Initialize Gemini model ---
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json"
  }
});

// --- Step 5: Helper data and functions ---

const availableComponentNames = myComponents.map(c => c.name);
const availableIconNames = myIcons;

/**
 * Build a simplified, human-readable view of the component library.
 * Used in the "selection" step of the RAG pipeline.
 */
function buildSimplifiedLibraryText(components) {
  return components.map(comp => {
    const propNames = Array.isArray(comp.props)
      ? comp.props.map(p => p.name).join(", ")
      : "";
    const propsPart = propNames ? ` (key props: ${propNames})` : "";
    return `- ${comp.name}: ${comp.description || ""}${propsPart}`;
  }).join("\n");
}

/**
 * Build a detailed description for a subset of components, including prop information.
 * This is what we "retrieve" and feed into the implementation LLM call.
 */
function buildFullSpecsTextFor(componentNames, allComponents) {
  const selected = allComponents.filter(c => componentNames.includes(c.name));
  let text = "";
  for (const comp of selected) {
    text += `Component: ${comp.name}\n`;
    if (comp.description) {
      text += `Description: ${comp.description}\n`;
    }
    if (Array.isArray(comp.props) && comp.props.length) {
      text += "Props:\n";
      for (const prop of comp.props) {
        let line = `- ${prop.name} (${prop.type || "any"})`;
        if (prop.required) line += " [required]";
        if (prop.description) line += `: ${prop.description}`;
        if (Array.isArray(prop.options) && prop.options.length) {
          line += ` Options: [${prop.options.join(", ")}]`;
        }
        if (prop.default !== undefined) {
          line += ` Default: ${JSON.stringify(prop.default)}`;
        }
        text += line + "\n";
      }
    }
    if (comp.children) {
      text += "Children: This component can contain nested child components via a \`children\` array.\n";
    }
    text += "\n";
  }
  return text;
}

/**
 * Normalize component tree so that:
 * - All children live in props.children (plugin.js expects this).
 * - Icon SVG data is injected where icon / endIcon props are used.
 */
function normalizeAndInject(node) {
  if (!node || typeof node !== "object") return;

  if (!node.props || typeof node.props !== "object") {
    node.props = {};
  }

  // If model used top-level "children", move them into props.children
  if (Array.isArray(node.children) && node.children.length > 0) {
    if (!Array.isArray(node.props.children)) {
      node.props.children = [];
    }
    node.props.children.push(...node.children);
    delete node.children;
  }

  // Inject SVG data for icons
  if (node.props.icon && myIconSVGs[node.props.icon]) {
    node.props.svgData = myIconSVGs[node.props.icon];
    console.log(`Injected SVG for icon: ${node.props.icon}`);
  }
  if (node.props.endIcon && myIconSVGs[node.props.endIcon]) {
    node.props.endSvgData = myIconSVGs[node.props.endIcon];
    console.log(`Injected SVG for endIcon: ${node.props.endIcon}`);
  }

  const children = node.props.children;
  if (children && Array.isArray(children)) {
    children.forEach(normalizeAndInject);
  }
}

/**
 * RAG Step 1: Given a feature description, ask the model to choose a small set of components
 * from the library that are most relevant for implementing this feature.
 */
async function selectComponentsForFeature(featureDescription) {
  const simplifiedLibraryText = buildSimplifiedLibraryText(myComponents);

  const selectionPrompt = `
You are helping to design a GUI using a fixed component library.

TASK:
Given a single GUI feature description and the list of available components,
select a small set of component names that best implement the feature.

Return ONLY a JSON array of component names, for example:
["Header", "Body Text", "Text Field", "Button"].

Guidelines:
- Prefer high-level components that match the semantics of the feature.
- Use layout components (Row, Column, Card) when you need grouping or alignment.
- Do NOT invent new component names.

Available components:
${simplifiedLibraryText}
`.trim();

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: selectionPrompt }]
      },
      {
        role: "model",
        parts: [{ text: "OK. I will output only a JSON array of component names." }]
      }
    ]
  });

  const result = await chat.sendMessage(featureDescription);

  if (!result.response?.candidates?.[0]?.content) {
    if (result.response?.promptFeedback?.blockReason) {
      throw new Error(`AI response blocked during component selection: ${result.response.promptFeedback.blockReason}`);
    }
    throw new Error("AI response blocked or empty during component selection.");
  }

  const text = result.response.text();
  console.log("AI component selection response:", text);

  let names;
  try {
    names = JSON.parse(text);
  } catch (e) {
    console.warn("Failed to parse component selection JSON. Falling back to default components.", e);
    names = [];
  }

  if (!Array.isArray(names)) {
    names = [];
  }

  const libraryNames = new Set(availableComponentNames);
  const filtered = names
    .filter(n => typeof n === "string")
    .map(n => n.trim())
    .filter(n => libraryNames.has(n));

  // Always ensure at least a minimal set of safe defaults (no Button by default to avoid overuse).
  const defaults = ["Header", "Body Text"];
  const combined = [...filtered, ...defaults];

  // Deduplicate and clamp length.
  const unique = Array.from(new Set(combined));
  const maxComponents = 12;
  const final = unique.slice(0, maxComponents);

  console.log("Selected components for feature:", final);
  return final;
}

// --- System prompt for feature decomposition (unchanged pipeline) ---

const featureGenerationSystemText = `
You are an expert Product Manager helping to decompose an app screen into a list of clear UI features.

Given a natural language description of a screen or flow, output a JSON array where each element has:
- "id": a short unique string id (e.g. "f1", "f2").
- "name": a short feature name.
- "description": one or two sentences that describe what the UI for this feature should do or contain.

Guidelines:
- Group tightly related elements into ONE feature:
  - A section with multiple text fields (e.g., email + password) = ONE feature "Login form".
  - Radio buttons for a single question = ONE feature.
  - A card with image, title, description, and button = ONE feature.
- Use simple, descriptive names (e.g., "Product card", "Search bar", "Checkout summary").

Response format:
[
  {
    "id": "f1",
    "name": "Short feature name",
    "description": "Clear description of what this piece of UI should contain or do."
  }
]

Return ONLY valid JSON. Do not include any extra commentary, markdown, or explanations.
`.trim();

// --- System prompt for custom feature refinement ---
const featureRefinementSystemText = `
You are an expert product manager for GUI design.

Given:
- A list of existing GUI features for a single screen, and
- A free-text description of a new feature the user wants to add,

you must return exactly ONE JSON object that describes this new feature with:
- "name": a short, specific feature name (3–7 words),
- "description": a clear, self-contained description suitable for inclusion in a feature list.

Rules:
- Do NOT modify the existing features; only refine the new one.
- Avoid duplicating existing features. If it overlaps, make the new feature more specific.
- Do NOT include IDs; the client will assign them.
- Output ONLY a single JSON object (not an array), with "name" and "description".
`.trim();

// --- Step 6: API routes ---

// Health check
app.get('/', (_req, res) => {
  res.json({ status: "ok", message: "AI Prototyper 2.5 server running with RAG implementation." });
});

// Step 6.1: Feature generation (same interface as v2.0)
app.post('/generate-features', async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    console.log(`Received /generate-features prompt: ${userPrompt}`);

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: featureGenerationSystemText }]
        },
        {
          role: "model",
          parts: [{ text: "OK. I will decompose the UI description into a JSON array of features." }]
        }
      ]
    });

    const result = await chat.sendMessage(userPrompt);

    if (!result.response?.candidates?.[0]?.content) {
      if (result.response?.promptFeedback?.blockReason) {
        throw new Error(`AI response blocked: ${result.response.promptFeedback.blockReason}`);
      }
      throw new Error("AI response blocked or empty.");
    }

    const responseText = result.response.text();
    console.log("AI Feature Response:", responseText);

    // Basic sanity check: should parse as JSON array
    JSON.parse(responseText);

    res.json({ featuresJson: responseText });
  } catch (error) {
    console.error("Error in /generate-features:", error);
    let statusCode = 500;
    let errorMessage = "Failed to generate features.";

    if (error instanceof GoogleGenerativeAIFetchError) {
      statusCode = error.status || 503;
      errorMessage = error.message || "Error communicating with AI service.";
      if (statusCode === 503) {
        errorMessage = "AI model is currently overloaded. Please try again later.";
      }
    } else if (error instanceof SyntaxError) {
      errorMessage = "AI returned invalid JSON for features.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

// Step 6.1b: Custom feature refinement / consistency check
app.post('/check-feature-consistency', async (req, res) => {
  try {
    const { description, currentFeatures } = req.body || {};

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "description".' });
    }

    const existingSummary = Array.isArray(currentFeatures)
      ? currentFeatures
        .map(f => `- ${f.name || 'Unnamed'}: ${f.description || ''}`)
        .join('\n')
      : '';

    const userPrompt = `
Existing features for this screen:
${existingSummary || '(none yet)'}

New feature description (from the user):
"${description}"

Return a single JSON object with "name" and "description" for this new feature.
`.trim();

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: featureRefinementSystemText }]
        },
        {
          role: "model",
          parts: [{ text: "OK. I will return one JSON object with name and description." }]
        }
      ]
    });

    const result = await chat.sendMessage(userPrompt);

    if (!result.response?.candidates?.[0]?.content) {
      if (result.response?.promptFeedback?.blockReason) {
        throw new Error(`AI response blocked: ${result.response.promptFeedback.blockReason}`);
      }
      throw new Error("AI response blocked or empty.");
    }

    const raw = result.response.text();
    console.log("AI Custom Feature Response:", raw);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse /check-feature-consistency JSON:", raw);
      return res.status(500).json({ error: 'AI did not return valid JSON for the custom feature.' });
    }

    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.description !== 'string') {
      return res.status(500).json({ error: 'AI response missing required fields "name" and "description".' });
    }

    res.json({ name: parsed.name, description: parsed.description });

  } catch (error) {
    console.error("Error in /check-feature-consistency:", error);
    let statusCode = 500;
    let errorMessage = "Failed to refine custom feature.";

    if (error instanceof GoogleGenerativeAIFetchError) {
      statusCode = error.status || 503;
      errorMessage = error.message || "Error communicating with AI service.";
      if (statusCode === 503) {
        errorMessage = "AI model is currently overloaded. Please try again later.";
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

// Step 6.2: Implementation generation with RAG-style component retrieval
app.post('/generate-implementation', async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    console.log(`Received /generate-implementation prompt: ${userPrompt}`);

    // --- RAG Step 1: select components for this feature ---
    const selectedComponentNames = await selectComponentsForFeature(userPrompt);

    // Always include layout components as a safety net
    const layoutComponents = ["Row", "Column", "Card"];
    const allNamesSet = new Set([...selectedComponentNames, ...layoutComponents]);
    const finalComponentNames = Array.from(allNamesSet);

    // --- RAG Step 2: retrieve full specs for only those components ---
    const fullSpecsText = buildFullSpecsTextFor(finalComponentNames, myComponents);

    const implementationPrompt = `
You are an expert UI/UX designer. Convert the given feature description into a structured JSON array using ONLY the specified components.

For each item in the array:
- "component": one of the component names listed in AVAILABLE COMPONENTS below.
- "props": an object with valid props for that component as defined in the specs.
- "children": nested child components SHOULD be placed inside "props.children" as an array of components (same structure).

AVAILABLE COMPONENTS (FULL SPECS):
${fullSpecsText}

AVAILABLE ICONS:
${availableIconNames.map(icon => `"${icon}"`).join(", ")}

ICON USAGE HINTS:
${myIconHints}

RULES:
1. Use "Row", "Column", and "Card" components to structure the layout.
2. For form fields, use "Text Field" plus any helper text components.
3. For primary actions, use "Button" with an appropriate label and optional icon.
4. Response MUST be a valid JSON array (e.g. [ { "component": "...", "props": { ... } }, ... ]).
5. Do NOT include any extra text before or after the JSON array.
`.trim();

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: implementationPrompt }]
        },
        {
          role: "model",
          parts: [{ text: "OK. I will return only a JSON array of components." }]
        }
      ]
    });

    const result = await chat.sendMessage(userPrompt);

    if (!result.response?.candidates?.[0]?.content) {
      if (result.response?.promptFeedback?.blockReason) {
        throw new Error(`AI response blocked: ${result.response.promptFeedback.blockReason}`);
      }
      throw new Error("AI response blocked or empty.");
    }

    const responseText = result.response.text();
    console.log("AI Component Response:", responseText);

    let finalJsonText = responseText;

    try {
      let components = JSON.parse(responseText);

      if (Array.isArray(components)) {
        components.forEach(normalizeAndInject);
      } else {
        normalizeAndInject(components);
      }

      finalJsonText = JSON.stringify(components);
    } catch (e) {
      console.error("Error parsing/normalizing component JSON:", e);
      finalJsonText = responseText; // fall back to raw model JSON
    }

    if (!finalJsonText.trim().startsWith("[")) {
      throw new Error("Invalid JSON start after normalization. Expected a JSON array.");
    }

    res.json({ json: finalJsonText, selectedComponents: finalComponentNames });
  } catch (error) {
    console.error("Error in /generate-implementation:", error);
    let statusCode = 500;
    let errorMessage = "Failed to generate implementation.";

    if (error instanceof GoogleGenerativeAIFetchError) {
      statusCode = error.status || 503;
      errorMessage = error.message || "Error communicating with AI service.";
      if (statusCode === 503) {
        errorMessage = "AI model is currently overloaded. Please try again later.";
      }
    } else if (error instanceof SyntaxError) {
      errorMessage = "AI returned invalid JSON for component implementation.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

// --- Step 7: Start the Server ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Using components: ${availableComponentNames.join(", ")}`);
});
