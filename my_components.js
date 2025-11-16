

export const myComponents = [
  {
    name: "Header",
    description: "For screen titles or section headings.",
    props: [
      { name: "text", type: "string", description: "The heading text", required: true },
      { name: "textAlign", type: "string", options: ["LEFT", "CENTER", "RIGHT"], description: "Text alignment (default CENTER for headers)" }
    ]
  },
  {
    name: "Text Field",
    description: "For user text input. This component renders a label and input box together.",
    props: [
      { name: "label", type: "string", description: "Label text displayed above the field", required: false },
      { name: "placeholder", type: "string", description: "Placeholder text inside the input area", required: false },
      { name: "icon", type: "string", description: "Optional icon name (from available icons)", required: false },
      { name: "endIcon", type: "string", description: "Icon name for the END/RIGHT of the input (e.g., visibility toggle)", required: false }
    ]
  },
  {
    name: "Button",
    description: "For user actions like submit, save, cancel.",
    props: [
      { name: "label", type: "string", description: "Text displayed on the button", required: true },
      { name: "color", type: "string", options: ["primary", "secondary", "destructive"], description: "Color hint for button style", required: false },
      { name: "icon", type: "string", description: "Optional icon name (from available icons)", required: false },
      { name: "width", type: "string", options: ["FULL", "HUG"], description: "Set button width: FULL stretches, HUG fits content", required: false, default: "FULL" }
    ]
  },
    {
    name: "Social Button",
    description: "Branded button for social authentication (e.g., Continue with Google, Apple, Facebook).",
    props: [
      {
        name: "provider",
        type: "string",
        options: ["google", "apple", "facebook"],
        description: "Social provider identifier",
        required: true
      },
      {
        name: "label",
        type: "string",
        description: "Button label. Defaults to 'Continue with <Provider>' if omitted.",
        required: false
      },
      {
        name: "width",
        type: "string",
        options: ["FULL", "HUG"],
        description: "Width behavior of the button",
        required: false,
        default: "FULL"
      },
      {
        name: "icon",
        type: "string",
        description: "Icon name (usually same as provider, e.g. 'google')",
        required: false
      }
    ]
  },
  {
    name: "Checkbox",
    description: "For agreeing to terms or selecting multiple options. Renders a box and a label.",
    props: [
      { name: "label", type: "string", description: "Text label next to the checkbox", required: true },
      { name: "checked", type: "boolean", description: "Initial state (true/false)", required: false, default: false }
    ]
  },
  {
    name: "RadioButton",
    description: "For selecting a single option from a group. Renders a circle and a label.",
    props: [
      { name: "label", type: "string", description: "Text label next to the radio button", required: true },
      { name: "checked", type: "boolean", description: "Initial state (true/false)", required: false, default: false },
      { name: "groupName", type: "string", description: "Identifier grouping related radio buttons", required: true }
    ]
  },
  {
    name: "Switch",
    description: "For toggling settings on/off. Renders a switch and a label.",
    props: [
      { name: "label", type: "string", description: "Text label next to the switch", required: true },
      { name: "checked", type: "boolean", description: "Initial state (true/false)", required: false, default: false }
    ]
  },
  {
    name: "Label",
    description: "For simple, non-interactive text display.",
    props: [
       { name: "text", type: "string", description: "The text content", required: true },
       { name: "textAlign", type: "string", options: ["LEFT", "CENTER", "RIGHT"], description: "Text alignment (default LEFT)" }
    ]
  },
  {
    name: "Icon",
    description: "For displaying a standalone icon.",
    props: [
       { name: "icon", type: "string", description: "Icon name (from available icons)", required: true },
       { name: "size", type: "number", description: "Optional size hint (e.g., 24, 32)", required: false }
    ]
  },
    {
    name: "Link Text",
    description: "Inline or standalone clickable text link for secondary navigation (e.g., Forgot password?, Sign up).",
    props: [
      {
        name: "text",
        type: "string",
        description: "Link label text",
        required: true
      },
      {
        name: "align",
        type: "string",
        options: ["LEFT", "CENTER", "RIGHT"],
        description: "Horizontal alignment of the link",
        required: false,
        default: "LEFT"
      },
      {
        name: "variant",
        type: "string",
        options: ["PRIMARY", "SECONDARY", "SUBTLE"],
        description: "Visual emphasis level of the link",
        required: false,
        default: "SECONDARY"
      }
    ]
  },

  // --- LAYOUT COMPONENTS ---
  {
    name: "Row",
    description: "A container that arranges items HORIZONTALLY. Use this for controls, items side-by-side, etc.",
    props: [
      { name: "spacing", type: "number", description: "Space between items (e.g., 8, 16)", required: false, default: 8 },
      { name: "alignment", type: "string", options: ["TOP", "CENTER", "BOTTOM"], description: "Vertical alignment of items", required: false, default: "CENTER" },
      { name: "justify", type: "string", options: ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"], description: "Horizontal distribution (MIN=start, MAX=end)", required: false, default: "MIN" }
    ],
    children: true
  },
  {
    name: "Column",
    description: "A container that arranges items VERTICALLY. Use this to group items in a card, etc.",
    props: [
      { name: "spacing", type: "number", description: "Space between items (e.g., 8, 16)", required: false, default: 8 },
      { name: "alignment", type: "string", options: ["MIN", "CENTER", "MAX"], description: "Horizontal alignment (MIN=left, MAX=right)", required: false, default: "MIN" }
    ],
    children: true
  },
  // --- NEW: CARD COMPONENT ---
  {
    name: "Card",
    description: "A container with padding, background, border, and shadow for grouping related content. Perfect for product cards, info panels, etc.",
    props: [
      { name: "padding", type: "number", description: "Internal padding (default 16)", required: false, default: 16 },
      { name: "spacing", type: "number", description: "Space between child items (default 12)", required: false, default: 12 },
      { name: "backgroundColor", type: "string", options: ["white", "light", "dark"], description: "Card background color (default white)", required: false, default: "white" },
      { name: "hasBorder", type: "boolean", description: "Show border around card (default true)", required: false, default: true },
      { name: "hasShadow", type: "boolean", description: "Show drop shadow (default true)", required: false, default: true }
    ],
    children: true
  },
  // --- ATOMIC COMPONENTS ---
  {
    name: "Slider",
    description: "A horizontal slider for progress bars, volume, etc. Renders a track and a thumb.",
    props: [
      { name: "value", type: "number", description: "Position of thumb (0 to 100)", required: false, default: 30 }
    ]
  },
  {
    name: "Placeholder",
    description: "A simple gray box to represent an image, album art, or other media.",
    props: [
      { name: "width", type: "number", description: "Width of the box (default 100)", required: false, default: 100 },
      { name: "height", type: "number", description: "Height of the box (default 100)", required: false, default: 100 },
      { name: "label", type: "string", description: "Optional text inside the box", required: false }
    ]
  },
  // --- NEW: IMAGE COMPONENT ---
  {
    name: "Image",
    description: "Displays an image with proper sizing and corner radius. Use this for photos, product images, avatars, etc.",
    props: [
      { name: "width", type: "number", description: "Image width in pixels (default 100)", required: false, default: 100 },
      { name: "height", type: "number", description: "Image height in pixels (default 100)", required: false, default: 100 },
      { name: "alt", type: "string", description: "Alternative text description of the image", required: false, default: "Image" },
      { name: "cornerRadius", type: "number", description: "Corner roundness (0=square, 50+=circle, default 8)", required: false, default: 8 },
      { name: "fit", type: "string", options: ["FILL", "FIT", "CROP"], description: "How image fills container (default FILL)", required: false, default: "FILL" }
    ]
  },
  // --- NEW: COLOR SWATCH COMPONENT ---
  {
    name: "ColorSwatch",
    description: "A colored circle or square for color selection UI. Better than Image for color pickers.",
    props: [
      { name: "color", type: "string", description: "Color name or hint (red, blue, green, black, white, etc.)", required: true },
      { name: "size", type: "number", description: "Size of the swatch (default 40)", required: false, default: 40 },
      { name: "selected", type: "boolean", description: "Whether this color is selected (shows border)", required: false, default: false },
      { name: "shape", type: "string", options: ["circle", "square"], description: "Shape of swatch (default circle)", required: false, default: "circle" }
    ]
  }
];

// Helper function to generate schema description from the data
export function generateSchemaDescription(components) {
  let schemaString = "[\n";
  components.forEach(comp => {
    schemaString += `  {\n`;
    schemaString += `    "component": "${comp.name}", // ${comp.description}\n`;
    schemaString += `    "props": {\n`;
    comp.props.forEach((prop, index) => {
      let propLine = `      "${prop.name}": ${prop.type}`;
      if (prop.options) {
        propLine += ` (${prop.options.map(o => `"${o}"`).join(" | ")})`;
      }
      propLine += ` // ${prop.description}`;
      if (!prop.required) {
        propLine += ` (optional${prop.default !== undefined ? `, default: ${prop.default}` : ''})`;
      }
      if (index < comp.props.length - 1 || comp.children) {
            propLine += ",";
      }
      schemaString += `${propLine}\n`;
    });
    if (comp.children) {
        schemaString += `      "children": [ ... (Array of component objects as defined in this schema) ... ] // Nested components\n`;
    }
    schemaString += `    }\n`;
    schemaString += `  },\n`;
  });
   if (schemaString.endsWith(",\n")) {
      schemaString = schemaString.substring(0, schemaString.length - 2) + "\n";
   }
  schemaString += "]";
  return schemaString;
}