// This file runs in the Figma sandbox.

// --- 1. HELPER FUNCTIONS ---
async function createTextNode(textContent, fontSize, fontWeightStyle, props = {}) {
    console.log(`[createTextNode] Creating: "${textContent}", Size: ${fontSize}, Weight: ${fontWeightStyle}`);
    const textNode = figma.createText();
    let fontStyle = fontWeightStyle; 
    let loadedFont = false;
    // --- Font Loading Logic ---
    try { 
        await figma.loadFontAsync({ family: "Inter", style: fontStyle });
        textNode.fontName = { family: "Inter", style: fontStyle };
        loadedFont = true;
        console.log(`[createTextNode] Loaded font: Inter ${fontStyle}`);
    }
    catch (e) {
        console.warn(`[createTextNode] Could not load "Inter ${fontStyle}". Trying "Inter Regular".`);
        try {
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            textNode.fontName = { family: "Inter", style: "Regular" };
            loadedFont = true;
            console.log(`[createTextNode] Loaded fallback font: Inter Regular`);
        } catch (e2) {
             console.warn("[createTextNode] Could not load 'Inter Regular'. Trying 'Arial Regular'.");
        }
    }
    if (!loadedFont) {
        try {
            await figma.loadFontAsync({ family: "Arial", style: "Regular" });
            textNode.fontName = { family: "Arial", style: "Regular" };
            loadedFont = true;
            console.log(`[createTextNode] Loaded fallback font: Arial Regular`);
        } catch (fallbackError) {
            console.error("[createTextNode] Fatal font error: Could not load 'Arial Regular'.", fallbackError);
            figma.notify("Error: Could not load any fonts.");
            throw new Error("Font loading failed.");
        }
    }
    // --- End Font Loading ---
    textNode.characters = textContent;
    textNode.fontSize = fontSize;
    textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    if (textNode.fontName.style === "Regular") {
         if (fontWeightStyle === "Bold") {
             const availableFonts = await figma.listAvailableFontsAsync();
             const familyFonts = availableFonts.filter(f => f.fontName.family === textNode.fontName.family);
             if (familyFonts.some(f => f.fontName.style === "Bold")) {
                 try {
                     await figma.loadFontAsync({ family: textNode.fontName.family, style: "Bold" });
                     textNode.fontName = { family: textNode.fontName.family, style: "Bold" };
                     console.log(`[createTextNode] Applied Bold style separately for ${textNode.fontName.family}`);
                 } catch (boldErr) { console.warn(`[createTextNode] Couldn't apply Bold style for ${textNode.fontName.family}`); }
             } else { console.warn(`[createTextNode] Bold style not available for ${textNode.fontName.family}`); }
        } else if (fontWeightStyle === "Medium") {
             const availableFonts = await figma.listAvailableFontsAsync();
             const familyFonts = availableFonts.filter(f => f.fontName.family === textNode.fontName.family);
              if (familyFonts.some(f => f.fontName.style === "Medium")) {
                 try {
                     await figma.loadFontAsync({ family: textNode.fontName.family, style: "Medium" });
                     textNode.fontName = { family: textNode.fontName.family, style: "Medium" };
                     console.log(`[createTextNode] Applied Medium style separately for ${textNode.fontName.family}`);
                 } catch (medErr) { console.warn(`[createTextNode] Couldn't apply Medium style for ${textNode.fontName.family}`); }
             } else { console.warn(`[createTextNode] Medium style not available for ${textNode.fontName.family}`); }
        }
    }
    const align = (props.textAlign || 'LEFT').toUpperCase();
    if (['LEFT', 'CENTER', 'RIGHT'].includes(align)) {
        textNode.textAlignHorizontal = align;
    }
    
    // Default text auto-resize - HEIGHT allows wrapping when width is constrained
    textNode.textAutoResize = "HEIGHT";
    textNode.layoutGrow = 0; 
    textNode.layoutAlign = "INHERIT"; 
    
    console.log(`[createTextNode] Text="${textNode.characters}", Width=${textNode.width}, Height=${textNode.height}`);
    return textNode; 
}

function createRectangleNode(props = {}) {
    const rect = figma.createRectangle();
    let fillColor = { r: 0.9, g: 0.9, b: 0.9 }; 
    if (props.color === 'primary') fillColor = { r: 0.25, g: 0.5, b: 1 };
    else if (props.color === 'secondary') fillColor = { r: 0.6, g: 0.6, b: 0.6 };
    else if (props.color === 'destructive') fillColor = { r: 0.9, g: 0.2, b: 0.2 };
    else if (props.fillColor) fillColor = props.fillColor;
    rect.fills = [{ type: 'SOLID', color: fillColor }];
    rect.cornerRadius = props.cornerRadius || 4;
    const width = props.width || "FILL";
    const height = props.height || "HUG";
    rect.resize(width === "FILL" ? 100 : width, height === "HUG" ? 50 : height); 
    if (width === "FILL") rect.layoutAlign = "STRETCH";
    return rect; 
}

function createIconNode(svgData, size, props = {}) {
     console.log(`[createIconNode] Creating. Size: ${size}`);
    try {
        const iconNode = figma.createNodeFromSvg(svgData);
        iconNode.resize(size, size); 
        console.log(`[createIconNode] SVG node created & resized. Width=${iconNode.width}, Height=${iconNode.height}`);
        const iconColor = props.color || { r: 0.1, g: 0.1, b: 0.1 };
        const newFill = { type: 'SOLID', color: iconColor };
        function recolor(node) {
            if ('fills' in node && Array.isArray(node.fills)) {
                 if (node.fills.length > 0 && node.fills[0].type === 'SOLID') {
                     if(node.fills[0].color.r < 1 || node.fills[0].color.g < 1 || node.fills[0].color.b < 1) {
                         node.fills = [newFill];
                     }
                 }
            }
            if (node.children) {
                node.children.forEach(recolor);
            }
        }
        recolor(iconNode);
        console.log(`[createIconNode] Recolor complete. Returning node.`);
        return iconNode; 
    } catch (e) {
        console.error("[createIconNode] Error creating SVG node:", e.message);
        figma.notify(`Error creating SVG icon. See console.`);
        return null;
    }
}

// --- 2. RECURSIVE RENDERER ---
async function renderComponents(jsonArray) {
    if (!Array.isArray(jsonArray)) {
        console.error("Invalid JSON data: not an array.", jsonArray);
        return []; 
    }
    const createdNodes = []; 
    for (const item of jsonArray) {
        if (!item || !item.component || !item.props) {
            console.warn("Skipping invalid item:", item);
            continue;
        }
        console.log(`Processing component: ${item.component}`);
        let newNode = null; 
        try {
            switch (item.component) {
                case "Header": {
                    newNode = await createTextNode(item.props.text || "Header", 24, "Bold", item.props);
                    if (newNode) {
                        newNode.name = "Header";
                        newNode.layoutAlign = "STRETCH";
                        // Allow header to wrap if needed
                        newNode.textAutoResize = "HEIGHT";
                    }
                    break;
                }
                case "Label": {
                    newNode = await createTextNode(item.props.text || "Label", 14, "Regular", item.props);
                    if (newNode) {
                        newNode.name = "Label";
                        // Allow label to wrap when needed
                        newNode.textAutoResize = "HEIGHT";
                        
                        if (newNode.textAlignHorizontal === "CENTER" || newNode.textAlignHorizontal === "RIGHT") {
                            newNode.layoutAlign = "STRETCH"; 
                        } else {
                            newNode.layoutAlign = "STRETCH"; // Changed: Always stretch to allow wrapping
                        }
                        newNode.layoutGrow = 0;
                    }
                    break;
                }
                case "Icon": {
                    if (!item.props.svgData) throw new Error(`Icon ${item.props.icon} missing SVG data`);
                    newNode = createIconNode(item.props.svgData, item.props.size || 24, item.props);
                    if (newNode) newNode.name = item.props.icon;
                    break;
                }
                case "Button": {
                    const buttonFrame = figma.createFrame();
                    newNode = buttonFrame; 
                    buttonFrame.name = `${item.props.label || 'Button'} (Button)`;
                    buttonFrame.layoutMode = "HORIZONTAL";
                    buttonFrame.primaryAxisSizingMode = "AUTO"; 
                    buttonFrame.counterAxisSizingMode = "AUTO";
                    
                    const buttonWidthProp = (item.props.width || "FULL").toUpperCase();
                    
                    if (buttonWidthProp === "FULL") {
                        buttonFrame.layoutAlign = "STRETCH"; 
                        buttonFrame.primaryAxisAlignItems = "CENTER"; 
                    } else {
                        buttonFrame.layoutAlign = "INHERIT"; 
                        buttonFrame.primaryAxisAlignItems = "MIN"; 
                    }

                    buttonFrame.itemSpacing = 8;
                    buttonFrame.paddingLeft = 16;
                    buttonFrame.paddingRight = 16;
                    buttonFrame.paddingTop = 12;
                    buttonFrame.paddingBottom = 12;
                    buttonFrame.counterAxisAlignItems = "CENTER"; 
                    
                    let fillColor = { r: 0.9, g: 0.9, b: 0.9 };
                    if (item.props.color === 'primary') fillColor = { r: 0.25, g: 0.5, b: 1 };
                    else if (item.props.color === 'secondary') fillColor = { r: 0.6, g: 0.6, b: 0.6 };
                    buttonFrame.fills = [{ type: 'SOLID', color: fillColor }];
                    buttonFrame.cornerRadius = 8;
                    
                    if (item.props.icon && item.props.svgData) {
                        const icon = createIconNode(item.props.svgData, 18, { color: {r:1, g:1, b:1} }); 
                        if (icon) buttonFrame.appendChild(icon); 
                    }
                    const text = await createTextNode(item.props.label || "Button", 16, "Medium", item.props);
                    if (text) {
                        text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; 
                        text.layoutGrow = 0; 
                        text.layoutAlign = "INHERIT";
                        buttonFrame.appendChild(text); 
                    }
                    break;
                }
                    case "Social Button": {
                    const sbFrame = figma.createFrame();
                    newNode = sbFrame;

                    const providerRaw = (item.props.provider || item.props.icon || "google").toLowerCase();
                    const providerName = providerRaw.charAt(0).toUpperCase() + providerRaw.slice(1);

                    sbFrame.name = `${item.props.label || `Continue with ${providerName}`} (Social Button)`;
                    sbFrame.layoutMode = "HORIZONTAL";
                    sbFrame.primaryAxisSizingMode = "AUTO";
                    sbFrame.counterAxisSizingMode = "AUTO";

                    const widthProp = (item.props.width || "FULL").toUpperCase();
                    if (widthProp === "FULL") {
                        sbFrame.layoutAlign = "STRETCH";
                        sbFrame.primaryAxisAlignItems = "CENTER";
                    } else {
                        sbFrame.layoutAlign = "INHERIT";
                        sbFrame.primaryAxisAlignItems = "MIN";
                    }

                    sbFrame.itemSpacing = 8;
                    sbFrame.paddingLeft = 16;
                    sbFrame.paddingRight = 16;
                    sbFrame.paddingTop = 12;
                    sbFrame.paddingBottom = 12;
                    sbFrame.counterAxisAlignItems = "CENTER";
                    sbFrame.cornerRadius = 8;

                    // Colors based on provider
                    let bg = { r: 0.9, g: 0.9, b: 0.9 };
                    let textColor = { r: 0, g: 0, b: 0 };
                    let iconColor = { r: 0, g: 0, b: 0 };

                    if (providerRaw === "google") {
                        bg = { r: 1, g: 1, b: 1 };
                        textColor = { r: 0.2, g: 0.2, b: 0.2 };
                    } else if (providerRaw === "apple") {
                        bg = { r: 0, g: 0, b: 0 };
                        textColor = { r: 1, g: 1, b: 1 };
                        iconColor = { r: 1, g: 1, b: 1 };
                    } else if (providerRaw === "facebook") {
                        bg = { r: 0.09, g: 0.30, b: 0.65 };
                        textColor = { r: 1, g: 1, b: 1 };
                        iconColor = { r: 1, g: 1, b: 1 };
                    }

                    sbFrame.fills = [{ type: 'SOLID', color: bg }];

                    // Expect server to have injected svgData based on item.props.icon
                    if (item.props.icon && item.props.svgData) {
                        const icon = createIconNode(item.props.svgData, 18, { color: iconColor });
                        if (icon) sbFrame.appendChild(icon);
                    }

                    const labelText = item.props.label || `Continue with ${providerName}`;
                    const textNode = await createTextNode(labelText, 16, "Medium", item.props);
                    if (textNode) {
                        textNode.fills = [{ type: 'SOLID', color: textColor }];
                        textNode.layoutGrow = 0;
                        textNode.layoutAlign = "INHERIT";
                        sbFrame.appendChild(textNode);
                    }

                    break;
                }

                case "Text Field": {
                    const tfFrame = figma.createFrame();
                    newNode = tfFrame;
                    tfFrame.name = `${item.props.label || 'TextField'} (Field)`;
                    tfFrame.layoutMode = "VERTICAL";
                    tfFrame.layoutAlign = "STRETCH"; 
                    tfFrame.primaryAxisSizingMode = "AUTO"; 
                    tfFrame.itemSpacing = 8;
                    
                    if (item.props.label) {
                        const labelNode = await createTextNode(item.props.label, 14, "Regular", {});
                         if (labelNode) {
                            labelNode.layoutAlign = "STRETCH"; 
                            tfFrame.appendChild(labelNode);
                         }
                    }

                    const inputRowFrame = figma.createFrame();
                    inputRowFrame.name = "Input Area";
                    inputRowFrame.layoutMode = "HORIZONTAL"; 
                    inputRowFrame.layoutAlign = "STRETCH"; 
                    inputRowFrame.primaryAxisSizingMode = "FIXED"; 
                    inputRowFrame.counterAxisSizingMode = "FIXED"; 
                    inputRowFrame.resize(100, 48); 
                    inputRowFrame.itemSpacing = 8;
                    inputRowFrame.paddingLeft = 12;
                    inputRowFrame.paddingRight = 12;
                    inputRowFrame.counterAxisAlignItems = "CENTER"; 
                    inputRowFrame.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
                    inputRowFrame.cornerRadius = 8;
                    tfFrame.appendChild(inputRowFrame); 

                    if (item.props.icon && item.props.svgData) {
                         const startIcon = createIconNode(item.props.svgData, 20, { color: {r:0.3, g:0.3, b:0.3} }); 
                         if (startIcon) {
                            startIcon.layoutGrow = 0;
                            inputRowFrame.appendChild(startIcon);
                         }
                    }

                    if (item.props.placeholder) {
                        const placeholder = await createTextNode(item.props.placeholder, 16, "Regular", {});
                         if (placeholder) {
                            placeholder.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
                            placeholder.layoutAlign = "STRETCH";
                            placeholder.layoutGrow = 1;
                            placeholder.textAlignVertical = "CENTER";
                            inputRowFrame.appendChild(placeholder); 
                         }
                    } else {
                        const spacer = figma.createFrame();
                        spacer.name = "Spacer";
                        spacer.resize(1, 16); 
                        spacer.layoutGrow = 1;
                        spacer.fills = [];
                        inputRowFrame.appendChild(spacer);
                    }

                    if (item.props.endIcon && item.props.endSvgData) {
                         const endIcon = createIconNode(item.props.endSvgData, 20, { color: {r:0.3, g:0.3, b:0.3} }); 
                         if (endIcon) {
                            endIcon.layoutGrow = 0;
                            inputRowFrame.appendChild(endIcon);
                         }
                    }
                    
                    break;
                }
                case "Link Text": {
                    const linkNode = await createTextNode(
                        item.props.text || "Link",
                        14,
                        "Regular",
                        item.props
                    );
                    newNode = linkNode;
                    if (linkNode) {
                        linkNode.name = "Link Text";

                        // Link color (blue-ish)
                        linkNode.fills = [{
                            type: 'SOLID',
                            color: { r: 0.1, g: 0.35, b: 0.9 }
                        }];

                        // Underline to make it feel like a link
                        linkNode.textDecoration = "UNDERLINE";

                        // Optional alignment override
                        const align = (item.props.align || "LEFT").toUpperCase();
                        if (["LEFT", "CENTER", "RIGHT"].includes(align)) {
                            linkNode.textAlignHorizontal = align;
                        }
                    }
                    break;
                }

                // --- NEW: CHECKBOX COMPONENT ---
                case "Checkbox": {
                    const checkboxFrame = figma.createFrame();
                    newNode = checkboxFrame;
                    checkboxFrame.name = "Checkbox";
                    checkboxFrame.layoutMode = "HORIZONTAL";
                    checkboxFrame.layoutAlign = "INHERIT";
                    checkboxFrame.primaryAxisSizingMode = "AUTO";
                    checkboxFrame.counterAxisSizingMode = "AUTO";
                    checkboxFrame.itemSpacing = 8;
                    checkboxFrame.counterAxisAlignItems = "CENTER";
                    checkboxFrame.fills = [];

                    // Create checkbox box
                    const box = figma.createRectangle();
                    box.name = "Box";
                    box.resize(20, 20);
                    box.cornerRadius = 4;
                    box.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
                    box.strokeWeight = 2;
                    
                    const isChecked = item.props.checked || false;
                    if (isChecked) {
                        box.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.5, b: 1 } }];
                        // Add checkmark
                        const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#FFFFFF"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
                        const checkIcon = createIconNode(checkSvg, 16, { color: {r:1, g:1, b:1} });
                        if (checkIcon) {
                            box.layoutMode = "HORIZONTAL";
                            box.primaryAxisAlignItems = "CENTER";
                            box.counterAxisAlignItems = "CENTER";
                            box.appendChild(checkIcon);
                        }
                    } else {
                        box.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                    }
                    
                    checkboxFrame.appendChild(box);

                    // Add label
                    const label = await createTextNode(item.props.label || "Checkbox", 14, "Regular", {});
                    if (label) {
                        label.layoutGrow = 0;
                        checkboxFrame.appendChild(label);
                    }
                    
                    console.log(`[Checkbox] Created: ${item.props.label}, checked: ${isChecked}`);
                    break;
                }
                // --- NEW: RADIOBUTTON COMPONENT ---
                case "RadioButton": {
                    try {
                        const radioFrame = figma.createFrame();
                        newNode = radioFrame;
                        radioFrame.name = "RadioButton";
                        radioFrame.layoutMode = "HORIZONTAL";
                        radioFrame.layoutAlign = "INHERIT";
                        radioFrame.primaryAxisSizingMode = "AUTO";
                        radioFrame.counterAxisSizingMode = "AUTO";
                        radioFrame.itemSpacing = 8;
                        radioFrame.counterAxisAlignItems = "CENTER";
                        radioFrame.fills = [];

                        // Create radio circle outer ring
                        const outerCircle = figma.createFrame();
                        outerCircle.name = "Circle";
                        outerCircle.resize(20, 20);
                        outerCircle.cornerRadius = 10; // Perfect circle
                        outerCircle.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
                        outerCircle.strokeWeight = 2;
                        outerCircle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                        outerCircle.clipsContent = false;
                        
                        const isChecked = item.props.checked || false;
                        if (isChecked) {
                            // Use absolute positioning for the inner dot
                            // Create an Ellipse which is naturally circular
                            const innerDot = figma.createEllipse();
                            innerDot.name = "Dot";
                            innerDot.resize(8, 8);
                            innerDot.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.5, b: 1 } }];
                            
                            // Position it in the center: (20-8)/2 = 6
                            innerDot.x = 6;
                            innerDot.y = 6;
                            
                            outerCircle.appendChild(innerDot);
                            console.log(`[RadioButton] Added inner dot at (${innerDot.x}, ${innerDot.y})`);
                        }
                        
                        radioFrame.appendChild(outerCircle);

                        // Add label
                        const label = await createTextNode(item.props.label || "Radio", 14, "Regular", {});
                        if (label) {
                            label.layoutGrow = 0;
                            radioFrame.appendChild(label);
                        }
                        
                        console.log(`[RadioButton] Created: ${item.props.label}, checked: ${isChecked}`);
                    } catch (radioError) {
                        console.error("[RadioButton] Error:", radioError);
                        throw radioError;
                    }
                    break;
                }
                // --- NEW: SWITCH COMPONENT ---
                case "Switch": {
                    const switchFrame = figma.createFrame();
                    newNode = switchFrame;
                    switchFrame.name = "Switch";
                    switchFrame.layoutMode = "HORIZONTAL";
                    switchFrame.layoutAlign = "INHERIT";
                    switchFrame.primaryAxisSizingMode = "AUTO";
                    switchFrame.counterAxisSizingMode = "AUTO";
                    switchFrame.itemSpacing = 8;
                    switchFrame.counterAxisAlignItems = "CENTER";
                    switchFrame.fills = [];

                    // Create switch track
                    const track = figma.createRectangle();
                    track.name = "Track";
                    track.resize(44, 24);
                    track.cornerRadius = 12;
                    
                    const isChecked = item.props.checked || false;
                    if (isChecked) {
                        track.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.5, b: 1 } }];
                    } else {
                        track.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
                    }

                    // Add thumb
                    const thumb = figma.createEllipse();
                    thumb.name = "Thumb";
                    thumb.resize(18, 18);
                    thumb.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                    thumb.x = isChecked ? 23 : 3;
                    thumb.y = 3;
                    track.appendChild(thumb);
                    
                    switchFrame.appendChild(track);

                    // Add label
                    const label = await createTextNode(item.props.label || "Switch", 14, "Regular", {});
                    if (label) {
                        label.layoutGrow = 0;
                        switchFrame.appendChild(label);
                    }
                    
                    console.log(`[Switch] Created: ${item.props.label}, checked: ${isChecked}`);
                    break;
                }
                 case "Slider": {
                    const sliderFrame = figma.createFrame();
                    newNode = sliderFrame;
                    sliderFrame.name = "Slider";
                    sliderFrame.layoutMode = "HORIZONTAL";
                    sliderFrame.layoutGrow = 1; 
                    sliderFrame.layoutAlign = "STRETCH"; 
                    sliderFrame.resize(100, 20); 
                    sliderFrame.counterAxisAlignItems = "CENTER";
                    sliderFrame.fills = []; 
                    const track = createRectangleNode({ fillColor: { r: 0.8, g: 0.8, b: 0.8 }, cornerRadius: 4});
                    track.layoutGrow = 1; 
                    track.resize(100, 8); 
                    sliderFrame.appendChild(track); 
                    break;
                }
                case "Placeholder": {
                    const pFrame = figma.createFrame(); 
                    newNode = pFrame;
                    pFrame.name = "Placeholder";
                    pFrame.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]; 
                    pFrame.layoutAlign = "STRETCH"; 
                    pFrame.resize(item.props.width || 100, item.props.height || 100);
                    pFrame.primaryAxisSizingMode = "FIXED"; 
                    pFrame.counterAxisSizingMode = "FIXED"; 
                    if (item.props.label) {
                        pFrame.layoutMode = "HORIZONTAL";
                        pFrame.counterAxisAlignItems = "CENTER";
                        pFrame.primaryAxisAlignItems = "CENTER";
                        const label = await createTextNode(item.props.label, 14, "Regular", {});
                        if (label) {
                           label.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]; 
                           pFrame.appendChild(label); 
                        }
                    }
                    break;
                }
                // --- IMAGE COMPONENT ---
                case "Image": {
                    const imageFrame = figma.createFrame();
                    newNode = imageFrame;
                    imageFrame.name = item.props.alt || "Image";
                    
                    const width = item.props.width || 100;
                    const height = item.props.height || 100;
                    const cornerRadius = item.props.cornerRadius !== undefined ? item.props.cornerRadius : 8;
                    
                    imageFrame.resize(width, height);
                    imageFrame.cornerRadius = cornerRadius;
                    imageFrame.clipsContent = true;
                    
                    // Create gradient placeholder
                    imageFrame.fills = [{
                        type: 'GRADIENT_LINEAR',
                        gradientTransform: [[1, 0, 0], [0, 1, 0]],
                        gradientStops: [
                            { position: 0, color: { r: 0.8, g: 0.8, b: 0.9, a: 1 } },
                            { position: 1, color: { r: 0.6, g: 0.6, b: 0.8, a: 1 } }
                        ]
                    }];
                    
                    // Add image icon overlay
                    const imageIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
                    const imageIcon = createIconNode(imageIconSvg, Math.min(width, height) * 0.3, { color: { r: 1, g: 1, b: 1 } });
                    
                    if (imageIcon) {
                        imageFrame.layoutMode = "HORIZONTAL";
                        imageFrame.primaryAxisAlignItems = "CENTER";
                        imageFrame.counterAxisAlignItems = "CENTER";
                        imageFrame.appendChild(imageIcon);
                    }
                    
                    const fit = (item.props.fit || "FILL").toUpperCase();
                    if (fit === "FILL") {
                        imageFrame.layoutAlign = "STRETCH";
                    } else {
                        imageFrame.layoutAlign = "INHERIT";
                    }
                    
                    imageFrame.primaryAxisSizingMode = "FIXED";
                    imageFrame.counterAxisSizingMode = "FIXED";
                    
                    console.log(`[Image] Created image: ${width}x${height}, corner: ${cornerRadius}, fit: ${fit}`);
                    break;
                }
                // --- NEW: COLOR SWATCH COMPONENT ---
                case "ColorSwatch": {
                    const swatchFrame = figma.createFrame();
                    newNode = swatchFrame;
                    swatchFrame.name = "ColorSwatch";
                    
                    const size = item.props.size || 40;
                    const shape = (item.props.shape || "circle").toLowerCase();
                    const selected = item.props.selected || false;
                    
                    swatchFrame.resize(size, size);
                    swatchFrame.cornerRadius = shape === "circle" ? size / 2 : 8;
                    
                    // Map color names to RGB values
                    const colorName = (item.props.color || "gray").toLowerCase();
                    let fillColor = { r: 0.5, g: 0.5, b: 0.5 }; // default gray
                    
                    if (colorName.includes("red")) fillColor = { r: 0.9, g: 0.2, b: 0.2 };
                    else if (colorName.includes("blue")) fillColor = { r: 0.2, g: 0.4, b: 0.9 };
                    else if (colorName.includes("green")) fillColor = { r: 0.2, g: 0.8, b: 0.3 };
                    else if (colorName.includes("yellow")) fillColor = { r: 0.95, g: 0.85, b: 0.2 };
                    else if (colorName.includes("orange")) fillColor = { r: 1, g: 0.6, b: 0.2 };
                    else if (colorName.includes("purple") || colorName.includes("violet")) fillColor = { r: 0.6, g: 0.3, b: 0.9 };
                    else if (colorName.includes("pink")) fillColor = { r: 1, g: 0.4, b: 0.7 };
                    else if (colorName.includes("black")) fillColor = { r: 0.1, g: 0.1, b: 0.1 };
                    else if (colorName.includes("white")) fillColor = { r: 1, g: 1, b: 1 };
                    else if (colorName.includes("brown")) fillColor = { r: 0.6, g: 0.4, b: 0.2 };
                    else if (colorName.includes("beige") || colorName.includes("tan")) fillColor = { r: 0.96, g: 0.87, b: 0.7 };
                    
                    swatchFrame.fills = [{ type: 'SOLID', color: fillColor }];
                    
                    // Add border for white/light colors or when selected
                    if (selected || colorName.includes("white") || colorName.includes("beige")) {
                        swatchFrame.strokes = [{ type: 'SOLID', color: selected ? { r: 0.25, g: 0.5, b: 1 } : { r: 0.8, g: 0.8, b: 0.8 } }];
                        swatchFrame.strokeWeight = selected ? 3 : 1;
                    }
                    
                    swatchFrame.layoutAlign = "INHERIT";
                    
                    console.log(`[ColorSwatch] Created: ${colorName}, size: ${size}, shape: ${shape}, selected: ${selected}`);
                    break;
                }
                // --- CARD COMPONENT ---
                case "Card": {
                    const cardFrame = figma.createFrame();
                    newNode = cardFrame;
                    cardFrame.name = "Card";
                    cardFrame.layoutMode = "VERTICAL";
                    
                    const padding = item.props.padding || 16;
                    const spacing = item.props.spacing || 12;
                    const bgColor = item.props.backgroundColor || "white";
                    const hasBorder = item.props.hasBorder !== false;
                    const hasShadow = item.props.hasShadow !== false;
                    
                    let fillColor = { r: 1, g: 1, b: 1 };
                    if (bgColor === "light") fillColor = { r: 0.95, g: 0.95, b: 0.95 };
                    else if (bgColor === "dark") fillColor = { r: 0.2, g: 0.2, b: 0.2 };
                    
                    cardFrame.fills = [{ type: 'SOLID', color: fillColor }];
                    cardFrame.cornerRadius = 12;
                    
                    if (hasBorder) {
                        cardFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
                        cardFrame.strokeWeight = 1;
                    }
                    
                    if (hasShadow) {
                        cardFrame.effects = [{
                            type: 'DROP_SHADOW',
                            color: { r: 0, g: 0, b: 0, a: 0.1 },
                            offset: { x: 0, y: 2 },
                            radius: 8,
                            visible: true,
                            blendMode: 'NORMAL'
                        }];
                    }
                    
                    cardFrame.layoutAlign = "STRETCH";
                    cardFrame.primaryAxisSizingMode = "AUTO";
                    cardFrame.counterAxisSizingMode = "FIXED";
                    cardFrame.itemSpacing = spacing;
                    cardFrame.paddingTop = padding;
                    cardFrame.paddingBottom = padding;
                    cardFrame.paddingLeft = padding;
                    cardFrame.paddingRight = padding;
                    
                    const children = item.props.children;
                    if (children && Array.isArray(children) && children.length > 0) {
                        const childNodes = await renderComponents(children);
                        childNodes.forEach(child => {
                            if (child) cardFrame.appendChild(child);
                        });
                        console.log(`[Card] Appended ${childNodes.filter(Boolean).length} children.`);
                    } else {
                        console.warn("[Card] component has no valid children property in props.");
                    }
                    
                    console.log(`[Card] Created with padding: ${padding}, spacing: ${spacing}, bg: ${bgColor}`);
                    break;
                }
                // --- LAYOUT COMPONENTS (RECURSIVE) ---
                case "Row": {
                    const rowFrame = figma.createFrame();
                    newNode = rowFrame;
                    rowFrame.name = "Row";
                    rowFrame.layoutMode = "HORIZONTAL";
                    rowFrame.layoutAlign = "STRETCH";
                    rowFrame.primaryAxisSizingMode = "FIXED"; 
                    rowFrame.counterAxisSizingMode = "AUTO"; 
                    rowFrame.itemSpacing = item.props.spacing || 8;
                    
                    // FIX: Convert alignment values to valid Figma enums
                    let counterAlign = (item.props.alignment || "CENTER").toUpperCase();
                    if (counterAlign === "TOP") counterAlign = "MIN";
                    if (counterAlign === "BOTTOM") counterAlign = "MAX";
                    if (!["MIN", "MAX", "CENTER"].includes(counterAlign)) {
                        counterAlign = "CENTER";
                    }
                    rowFrame.counterAxisAlignItems = counterAlign;
                    
                    let justify = (item.props.justify || "MIN").toUpperCase(); 
                    if (justify === "START") justify = "MIN";
                    if (justify === "END") justify = "MAX";
                    if (["MIN", "MAX", "CENTER", "SPACE_BETWEEN"].includes(justify)) {
                        rowFrame.primaryAxisAlignItems = justify;
                    } else {
                         rowFrame.primaryAxisAlignItems = "MIN"; 
                    }
                    
                    const children = item.props.children; 
                    if (children && Array.isArray(children) && children.length > 0) {
                        const childNodes = await renderComponents(children); 
                        childNodes.forEach(child => {
                            if (child) rowFrame.appendChild(child);
                        });
                        console.log(`[Row] Appended ${childNodes.filter(Boolean).length} children.`);
                    } else {
                         console.warn("[Row] component has no valid children property in props.");
                    }
                    break;
                }
                case "Column": {
                    const colFrame = figma.createFrame();
                    newNode = colFrame;
                    colFrame.name = "Column";
                    colFrame.layoutMode = "VERTICAL";
                    colFrame.layoutAlign = "STRETCH";
                    colFrame.primaryAxisSizingMode = "AUTO"; 
                    colFrame.counterAxisSizingMode = "FIXED"; 
                    colFrame.itemSpacing = item.props.spacing || 8;
                    let align = (item.props.alignment || "MIN").toUpperCase(); 
                    if (align === "LEFT") align = "MIN";
                    if (align === "RIGHT") align = "MAX";
                    if ((["MIN", "MAX", "CENTER"].includes(align))) {
                        colFrame.counterAxisAlignItems = align;
                    } else {
                        colFrame.counterAxisAlignItems = "MIN";
                    }
                    const children = item.props.children;
                    if (children && Array.isArray(children) && children.length > 0) {
                        const childNodes = await renderComponents(children);
                        childNodes.forEach(child => {
                             if (child) colFrame.appendChild(child);
                        });
                        console.log(`[Column] Appended ${childNodes.filter(Boolean).length} children.`);
                    } else {
                        console.warn("[Column] component has no valid children property in props.");
                    }
                    break;
                }
                
                default: {
                    newNode = await createTextNode(`[UNKNOWN: ${item.component}]`, 16, "Bold", {});
                    if (newNode) newNode.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
                    break;
                }
            }
            if (newNode) {
                if (!newNode.name || newNode.name.startsWith("Frame")) {
                   newNode.name = item.component; 
                }
                createdNodes.push(newNode);
            } else {
                 console.warn(`Node creation ultimately failed for component: ${item.component}`);
            }
        } catch (componentError) {
             console.error(`ERROR rendering item ${item.component}:`, componentError.message, componentError.stack); 
             figma.notify(`Render error on ${item.component}. Check console.`);
             try { 
                 const errNode = await createTextNode(`[ERROR: ${item.component}]`, 12, "Regular",{});
                 if (errNode) {
                     errNode.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
                     createdNodes.push(errNode); 
                 }
             } catch (e) {}
        }
    }
    return createdNodes; 
}

// --- 3. MAIN PLUGIN LOGIC ---
figma.showUI(__html__, { width: 340, height: 640 });
let currentFrame = null;
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'start-generation') {
         const { prompt, device } = msg; 
         currentFrame = null; 
         let frameWidth = 375; let frameHeight = 812; let deviceName = "Mobile"; 
         if (device.startsWith('Tablet')) { frameWidth = 768; frameHeight = 1024; deviceName = "Tablet";} 
         else if (device.startsWith('Desktop')) { frameWidth = 1440; frameHeight = 900; deviceName = "Desktop";} 
         const frame = figma.createFrame(); 
         if (!frame) {figma.notify("Frame creation failed."); return;} 
         currentFrame = frame; 
         frame.name = `AI Proto - ${prompt.substring(0, 20)}... (${deviceName})`; 
         frame.resize(frameWidth, frameHeight);
         frame.clipsContent = true; 
         frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
         frame.layoutMode = "VERTICAL";
         frame.primaryAxisSizingMode = "FIXED"; 
         frame.counterAxisSizingMode = "FIXED";
         frame.paddingTop = 24;
         frame.paddingBottom = 24;
         frame.paddingLeft = 24;
         frame.paddingRight = 24;
         frame.itemSpacing = 16;
         const PADDING_BETWEEN_FRAMES = 100; 
         let newX = figma.viewport.center.x - frameWidth / 2; 
         let newY = figma.viewport.bounds.y + 100; 
         const existingFrames = figma.currentPage.children.filter(node => node.type === 'FRAME'); 
         if (existingFrames.length > 0) { 
             let rightmostX = -Infinity; let topmostY = Infinity; 
             existingFrames.forEach(f => { 
                 if (f !== frame) { 
                     const frameRightEdge = f.x + f.width; 
                     if (frameRightEdge > rightmostX) rightmostX = frameRightEdge; 
                     if (f.y < topmostY) topmostY = f.y; 
                 }
             }); 
             newX = rightmostX + PADDING_BETWEEN_FRAMES; 
             newY = topmostY; 
         } 
         frame.x = newX; frame.y = newY; 
         figma.currentPage.appendChild(frame);
    } else if (msg.type === 'render-design') {
         const { json } = msg; 
         if (!currentFrame || currentFrame.removed) { 
             console.error("Target frame lost."); 
             figma.notify("Target frame lost. Please start over."); 
             figma.ui.postMessage({ type: 'error', message: 'Target frame lost.'}); 
             return; 
         }
         if (json) { 
             let renderSuccess = false; 
             try { 
                 console.log("Calling top-level renderComponents..."); 
                 const topLevelNodes = await renderComponents(json); 
                 topLevelNodes.forEach(node => {
                     if (node) currentFrame.appendChild(node);
                 });
                 renderSuccess = true;
                 console.log("Top-level renderComponents completed."); 
             } catch (renderError) { 
                 console.error("Critical Render Error:", renderError); 
                 figma.notify(`Render error: ${renderError.message}.`); 
                 figma.ui.postMessage({ type: 'error', message: `Render Error: ${renderError.message}` }); 
             }
             if (renderSuccess) { 
                 if (currentFrame && !currentFrame.removed) { 
                     figma.currentPage.selection = [currentFrame]; 
                     figma.viewport.scrollAndZoomIntoView([currentFrame]); 
                 } 
                 figma.notify('✅ Feature rendered!');
                 figma.ui.postMessage({ type: 'generation-complete', message: 'Feature rendered!' }); 
             } else { 
                 console.log("Render indicated failure."); 
                 figma.ui.postMessage({ type: 'error', message: 'Rendering failed.'}); 
             }
         } else { 
             console.error("No JSON."); 
             figma.notify("Invalid data."); 
             figma.ui.postMessage({ type: 'error', message: 'Invalid data.'}); 
         }
    } else if (msg.type === 'cancel-generation') { 
        console.log("Cancelled. Removing frame."); 
        if (currentFrame && !currentFrame.removed) { 
            currentFrame.remove(); 
            currentFrame = null; 
        } 
        figma.notify("Cancelled and frame removed.");
    } else if (msg.type === 'finish-generation') {
        console.log("Finished with frame. Ready for new one.");
        currentFrame = null;
        figma.notify("Prototype finished. Ready for a new design.");
    }
};
