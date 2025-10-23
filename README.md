# AI-prototyper
Figma's plugin that apply generative AI to create your desing and can be edit on Figma application.

# Overview

AI Prototyper is a Figma plugin designed to accelerate the UI/UX design workflow by leveraging generative AI. Users can input natural language prompts describing a desired UI screen or component layout, and the plugin generates an editable prototype directly on the Figma canvas using standard Figma elements (Rectangles, Text, etc.).

Unlike approaches that generate static images or code snippets, AI Prototyper focuses on creating high-fidelity, editable designs that seamlessly integrate into a designer's existing Figma workflow.

# Features

Prompt-Based Generation: Create UI prototypes using natural language descriptions.

Editable Figma Output: Generates designs using native Figma layers (Frames, Rectangles, Text) that are fully editable.

Component Structure: Breaks down prompts into logical UI components (Headers, Text Fields, Buttons, Switches, Checkboxes, RadioButtons).

JSON-Based Workflow: Utilizes a structured JSON format to represent the UI design, facilitating communication between the AI and the Figma plugin.

Basic Styling: Supports simple styling instructions like text alignment and button color hints.



# Inspiration & Academic Context


This project draws significant inspiration from the concepts presented in the following research paper:

Kolthoff, K., Kretzer, F., Bartelt, C., Maedche, A., & Ponzetto, S. P. (2025). GUIDE: LLM-driven GUI generation decomposition for automated prototyping. In 2025 IEEE/ACM 47th International Conference on Software Engineering: Companion Proceedings (ICSE-Companion). IEEE. https://doi.org/10.1109/ICSE-COMPANION.66252.2025.00010

Specifically, this plugin attempts to implement similar ideas of prompt decomposition (breaking down a high-level request into smaller UI features) and leveraging a structured approach to translate AI output into concrete, editable designs, moving beyond static image generation.

PhD Exploration Statement: This project serves as an experimental exploration and practical implementation exercise forming part of ongoing PhD research in Human-Computer Interaction, AI in Design Tools. It is a work-in-progress used for learning and testing concepts related to AI-assisted design prototyping.


# Setup


Figma:

Install the Figma Desktop App.

Open Figma, go to Plugins > Development > Import plugin from manifest....

Select the manifest.json file located in the root of this project directory.


AI Server:

Navigate to the server/ directory in your terminal.

Install dependencies: npm install express @google/generative-ai cors

(Optional but recommended) Install nodemon globally: sudo npm install -g nodemon (use sudo if needed on Mac/Linux).

Add API Key: Open server/server.js and replace "YOUR_API_KEY_GOES_HERE" (or the existing key) with your actual Google Gemini API key obtained from Google AI Studio.

Enable Google Cloud Services: Ensure the "Generative Language API" (or similar, like Vertex AI) and Billing are enabled in the Google Cloud project associated with your API key.

Run the server: nodemon server.js (or node server.js). Keep this terminal window running.


Usage

Ensure the AI Server is running (see Setup).

In Figma, open a design file.

Run the plugin: Plugins > Development > AI Prototyper (or use the shortcut Cmd+Option+P / Ctrl+Alt+P).

Enter a description of the UI you want to create in the "Your Prompt" text area (e.g., "A login screen for a mobile banking app", "Settings page with notification toggles").

Select the target device size from the dropdown.

Click "Generate".

The plugin will communicate with the AI server and render the editable prototype on your canvas. A new frame will be created next to existing frames.

Future Work / Contributing

(Optional: Add sections here if you plan to expand the project or accept contributions)

Expand component library (based on GUIDE data or Material Design).

Implement icon support.

Add more sophisticated styling options.

Improve frame positioning logic.

Refine error handling and user feedback.

# 

This project is for research and educational purposes.
This project is AI coding assited.
