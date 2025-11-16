# AI Prototyper: LLM-Driven GUI Generation with a Decomposition-Based Workflow

AI Prototyper is a Figma plugin and local Node.js backend that generates editable UI prototypes from natural-language prompts.  
It replicates and extends the **GUIDE** methodology by:

- **Decomposing** a high-level prompt into a list of GUI features.
- Using **retrieval-augmented generation (RAG)** to implement each feature with a fixed component library.
- Rendering the result as **native Figma nodes** using auto-layout.

---

## Key Features

- **Decomposition-based generation**  
  - Converts a high-level description (e.g. “A login screen for a fitness app”) into a structured list of features with names and descriptions.

- **Retrieval-augmented implementation (RAG)**  
  - For each feature, the backend:
    1. Asks the LLM to select relevant components from `my_components.js`.  
    2. Retrieves full specs for those components.  
    3. Asks the LLM to output a JSON component tree using only the retrieved components.  
  - This keeps generation grounded in the component library and improves structural consistency.

- **Figma-native prototypes**  
  - The sandbox script (`plugin.js`) turns the component JSON into Figma frames using auto-layout, text styles, and SVG icons from `my_icons_svg.js`.
  - All output is fully editable in Figma.

- **Custom feature refinement**  
  - When you add a custom feature, the plugin calls `/check-feature-consistency` to turn your free-text idea into a clean **name + description** entry in the feature list instead of inserting the raw prompt.

- **Multilingual prompts (experimental)**  
  - Prompts and labels can be issued in English or other languages/scripts (e.g. Thai, Malayalam).  
  - Structural behaviour is robust; localisation quality depends on the LLM’s language support.

---

## Project Structure
![overview of plugin structure](plugin_architecture.png)
