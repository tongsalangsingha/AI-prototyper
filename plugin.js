// This file runs in the Figma sandbox.

// createTextNode (Append Child at the end, Simplified X handling)
async function createTextNode(x, y, parent, textContent, fontSize, fontWeight, props = {}) {
    // console.log(`Creating text: "${textContent}" at (${x}, ${y})`); // Optional detailed log
    const textNode = figma.createText();
    if (!parent || typeof parent.appendChild !== 'function') { console.error("Invalid parent for text"); return null; }
    try { await figma.loadFontAsync({ family: "Inter", style: fontWeight }); textNode.fontName = { family: "Inter", style: fontWeight }; }
    catch (e) { try { await figma.loadFontAsync({ family: "Arial", style: "Regular" }); textNode.fontName = { family: "Arial", style: "Regular" }; } catch (fallbackError) { console.error("Fallback font error:", fallbackError); figma.notify("Font error."); return null; } }
    textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; textNode.fontSize = fontSize; textNode.characters = textContent;
    const padding = 24; let maxWidth = parent.width - x - padding; maxWidth = Math.max(10, maxWidth);
    textNode.resize(maxWidth, textNode.height); textNode.textAutoResize = "HEIGHT";
    const align = (props.textAlign || 'LEFT').toUpperCase();
    if (['LEFT', 'CENTER', 'RIGHT'].includes(align)) { textNode.textAlignHorizontal = align; }
    textNode.x = x; textNode.y = y;
    if (textNode.textAlignHorizontal === 'CENTER') { textNode.x = x + (maxWidth - textNode.width) / 2; }
    else if (textNode.textAlignHorizontal === 'RIGHT') { textNode.x = x + maxWidth - textNode.width; }
    parent.appendChild(textNode);
    // console.log(` -> Text created with height: ${textNode.height}`); // Optional detailed log
    return textNode;
}

// createRectangleNode (Append Child at the end)
function createRectangleNode(x, y, width, height, parent, props = {}) {
    // console.log(`Creating rect at (${x}, ${y}) size ${width}x${height}`); // Optional detailed log
     if (!parent || typeof parent.appendChild !== 'function') { return null; }
    const rect = figma.createRectangle();
    let fillColor = { r: 0.9, g: 0.9, b: 0.9 }; /* ... Color logic ... */
    if (props.color === 'primary') fillColor = { r: 0.25, g: 0.5, b: 1 }; else if (props.color === 'secondary') fillColor = { r: 0.6, g: 0.6, b: 0.6 }; else if (props.color === 'destructive') fillColor = { r: 0.9, g: 0.2, b: 0.2 }; else if (props.fillColor) fillColor = props.fillColor;
    rect.fills = [{ type: 'SOLID', color: fillColor }]; rect.cornerRadius = 4; rect.x = x; rect.y = y; rect.resize(width, height);
    parent.appendChild(rect);
    return rect;
}

// createEllipseNode (Append Child at the end)
function createEllipseNode(x, y, width, height, parent, props = {}) {
    // console.log(`Creating ellipse at (${x}, ${y}) size ${width}x${height}`); // Optional detailed log
      if (!parent || typeof parent.appendChild !== 'function') { return null; }
    const ellipse = figma.createEllipse(); const fillColor = props.fillColor || { r: 1, g: 1, b: 1 }; ellipse.fills = [{ type: 'SOLID', color: fillColor }];
     if(props.strokeColor){ ellipse.strokes = [{ type: 'SOLID', color: props.strokeColor }]; ellipse.strokeWeight = props.strokeWeight || 1; }
    ellipse.x = x; ellipse.y = y; ellipse.resize(width, height);
     parent.appendChild(ellipse);
    return ellipse;
}


// renderFromJson - Added Logging, Simplified Grouping
async function renderFromJson(json, parentFrame) {
    console.log("Starting renderFromJson...");
    const padding = 24; // Define padding earlier
    let yOffset = padding; // Initialize yOffset with padding
    const spacing = 16; const labelSpacing = 8;
    const controlSpacing = 12;

    let jsonArray;
    try { if (typeof json === 'string') jsonArray = JSON.parse(json); else jsonArray = json; if (!Array.isArray(jsonArray)) throw new Error("Data is not JSON array."); }
    catch (e) { console.error("JSON parse error:", e); figma.notify("Invalid AI data."); return false; }

    let allCreatedNodes = []; // Store only successfully created nodes/groups

    for (let i = 0; i < jsonArray.length; i++) {
        const item = jsonArray[i];
        console.log(`Processing item ${i}: ${item.component}`);
        if (!item || !item.component || !item.props) { console.warn(`Skipping invalid item ${i}`); continue; }

        let componentNodes = [];
        let elementBottom = yOffset; // Use yOffset as starting point for bottom calc
        let createdElement = null; // Store the main node/group created in this iteration

        try {
            // --- Component Creation Logic (Cases remain largely the same) ---
            // Key change: Ensure 'componentNodes' only contains valid nodes
            // Key change: Store the primary element (node or group) in 'createdElement'
            switch (item.component) {
                 case "Header": {
                     console.log(" -> Rendering Header");
                     const node = await createTextNode(padding, yOffset, parentFrame, item.props.text || "Header", 24, "Bold", item.props);
                     if (!node) throw new Error("Header node creation failed");
                     componentNodes.push(node); // Add the node itself
                     createdElement = node; // This is the main element
                     elementBottom = node.y + node.height;
                     console.log(" -> Header OK");
                     break;
                 }
                  case "Text Field": {
                     console.log(" -> Rendering Text Field");
                     let currentNodes = []; // Temporary list for grouping
                     const label = await createTextNode(padding, yOffset, parentFrame, item.props.label || "Label", 14, "Regular", item.props); if (!label) throw new Error("TF label failed"); currentNodes.push(label);
                     let currentY = label.y + label.height + labelSpacing;
                     const inputRect = createRectangleNode(padding, currentY, parentFrame.width - (2 * padding), 48, parentFrame, {}); if (!inputRect) throw new Error("TF inputRect failed"); currentNodes.push(inputRect);
                     const placeholder = await createTextNode(padding + 12, currentY + (48 / 2) - 8 , parentFrame, item.props.placeholder || "", 16, "Regular", item.props); if (!placeholder) throw new Error("TF placeholder failed");
                     placeholder.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }]; placeholder.resize(inputRect.width - 24, placeholder.height); placeholder.textAutoResize = "HEIGHT"; currentNodes.push(placeholder);
                     elementBottom = currentY + 48;
                     // Group the valid nodes
                     createdElement = figma.group(currentNodes, parentFrame);
                     createdElement.name = `${item.props.label || 'TextField'} Group`;
                     componentNodes = currentNodes; // Keep track of individual nodes if needed later
                     console.log(" -> Text Field OK");
                     break;
                 }
                  case "Button": {
                     console.log(" -> Rendering Button");
                     let currentNodes = [];
                     const buttonHeight = 48;
                     const buttonRect = createRectangleNode(padding, yOffset, parentFrame.width - (2 * padding), buttonHeight, parentFrame, item.props); if (!buttonRect) throw new Error("Button rect failed"); currentNodes.push(buttonRect);
                     const buttonText = await createTextNode( padding + 12, yOffset , parentFrame, item.props.label || "Button", 16, "Medium", item.props); if (!buttonText) throw new Error("Button text failed");
                     buttonText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; buttonText.resize(buttonRect.width - 24, buttonHeight); buttonText.textAutoResize = "HEIGHT";
                     buttonText.textAlignHorizontal = 'CENTER'; buttonText.textAlignVertical = 'CENTER'; buttonText.y = buttonRect.y + (buttonHeight / 2) - (buttonText.height / 2); currentNodes.push(buttonText);
                     elementBottom = yOffset + buttonHeight;
                     createdElement = figma.group(currentNodes, parentFrame);
                     createdElement.name = `${item.props.label || 'Button'} Group`;
                     componentNodes = currentNodes;
                     console.log(" -> Button OK");
                     break;
                 }
                 case "Checkbox":
                 case "RadioButton":
                 case "Switch": {
                     console.log(` -> Rendering ${item.component}`);
                     let currentNodes = [];
                     let controlWidth, controlHeight, controlY; const controlX = padding;
                     const labelX = controlX + (item.component === 'Switch' ? 44 : 20) + controlSpacing;

                     // Create control graphics
                     if (item.component === 'Checkbox') { /* ... create box/checkmark ... */
                          controlWidth=20; controlHeight=20; controlY=yOffset+2;
                          const box = createRectangleNode(controlX, controlY, controlWidth, controlHeight, parentFrame, {fillColor:{r:1,g:1,b:1}}); if (!box) throw new Error("Checkbox box failed"); box.strokes = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }]; box.strokeWeight = 1; box.cornerRadius = 2; currentNodes.push(box);
                          if (item.props.checked) { const cs = controlWidth * 0.6; const cn = createRectangleNode(controlX + (controlWidth - cs) / 2, controlY + (controlHeight - cs) / 2, cs, cs, parentFrame, { fillColor: { r: 0.25, g: 0.5, b: 1 } }); if(cn){cn.cornerRadius=1; currentNodes.push(cn);} else {console.warn("Checkbox checkmark failed")} }
                     } else if (item.component === 'RadioButton') { /* ... create outer/inner circle ... */
                          controlWidth=20; controlHeight=20; controlY=yOffset+2;
                          const outer = createEllipseNode(controlX, controlY, controlWidth, controlHeight, parentFrame, {fillColor:{r:1,g:1,b:1}, strokeColor:{r:0.6,g:0.6,b:0.6}, strokeWeight:1}); if(!outer) throw new Error("Radio outer failed"); currentNodes.push(outer);
                          if(item.props.checked){ const is = 10; const ri = createEllipseNode(controlX + (controlWidth - is) / 2, controlY + (controlHeight - is) / 2, is, is, parentFrame, { fillColor: { r: 0.25, g: 0.5, b: 1 } }); if(ri) currentNodes.push(ri); else {console.warn("Radio inner dot failed")} }
                     } else { // Switch /* ... create track/toggle ... */
                         controlWidth=44; controlHeight=24; controlY=yOffset; const toggleSize=20;
                         const trackFill = item.props.checked ? { r: 0.25, g: 0.5, b: 1 } : { r: 0.7, g: 0.7, b: 0.7 };
                         const track = createRectangleNode(controlX, controlY, controlWidth, controlHeight, parentFrame, { fillColor: trackFill }); if (!track) throw new Error("Switch track failed"); track.cornerRadius = controlHeight / 2; currentNodes.push(track);
                         const toggle = createEllipseNode(item.props.checked?(controlX + controlWidth - toggleSize - 2): (controlX + 2), controlY + (controlHeight-toggleSize)/2, toggleSize, toggleSize, parentFrame, {fillColor:{r:1,g:1,b:1},strokeColor:{r:0.8,g:0.8,b:0.8},strokeWeight:0.5}); if (!toggle) throw new Error("Switch toggle failed"); currentNodes.push(toggle);
                     }

                     // Create label, adjust Y, add to nodes
                     const controlCenterY = controlY + (controlHeight / 2); const estimatedLabelY = controlCenterY - 7;
                     const labelText = await createTextNode(labelX, estimatedLabelY, parentFrame, item.props.label || item.component, 14, "Regular", item.props); if (!labelText) throw new Error(`${item.component} label failed`); labelText.y = controlCenterY - (labelText.height / 2);
                     currentNodes.push(labelText);

                     elementBottom = Math.max(controlY + controlHeight, labelText.y + labelText.height);
                     // Group the control + label
                     createdElement = figma.group(currentNodes, parentFrame);
                     createdElement.name = `${item.props.label || item.component} Group`;
                     componentNodes = currentNodes; // Keep track
                     console.log(` -> ${item.component} OK`);
                     break;
                 }
                default: { /* ... Default handling ... */
                     console.log(` -> Rendering Unknown: ${item.component}`);
                     const unknownNode = await createTextNode(padding, yOffset, parentFrame, `[UNKNOWN: ${item.component}]`, 16, "Bold", {}); if (!unknownNode) throw new Error("Unknown node failed");
                     unknownNode.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]; createdElement = unknownNode; componentNodes.push(unknownNode); elementBottom = unknownNode.y + unknownNode.height;
                     console.log(" -> Unknown OK"); break;
                 }
            }

            // Add successfully created element (node or group) to the main list
            if (createdElement) {
                 allCreatedNodes.push(createdElement);
                 // Update yOffset based on the calculated bottom edge
                 yOffset = elementBottom + spacing;
            } else {
                 // Should not happen if errors are thrown, but as fallback:
                 console.warn(`No element created for item ${i}, adding fallback spacing.`);
                 yOffset += 30 + spacing;
            }

        } catch (componentError) {
             console.error(`ERROR rendering item ${i} (${item.component}):`, componentError);
             figma.notify(`Render error on ${item.component}. Check console.`);
             // Attempt to add error text node directly to parent frame
             try {
                const errorNode = await createTextNode(padding, yOffset, parentFrame, `[ERROR ${item.component}]`, 12, "Regular",{});
                if(errorNode) {
                    errorNode.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
                    allCreatedNodes.push(errorNode); // Add error node for potential cleanup
                    yOffset = errorNode.y + errorNode.height + spacing;
                } else { yOffset += 30 + spacing; } // Fallback spacing if error node fails
             } catch (errorNodeError){
                 console.error("Failed to create error node:", errorNodeError);
                 yOffset += 30 + spacing;
             }
             // Continue to the next item
        }
        console.log(` -> Completed item ${i}. Next yOffset: ${yOffset}`);
    } // End for loop

    // --- DO NOT RESIZE FRAME ---
    console.log("Finished renderFromJson loop.");
    return true; // Indicate overall success (even if some components errored out)
}


// --- Main plugin logic (onmessage handler) ---
figma.showUI(__html__, { width: 320, height: 480 });
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
        currentFrame = frame; // Store reference EARLY
        frame.name = `AI Proto - ${prompt.substring(0, 20)}... (${deviceName})`;
        frame.resize(frameWidth, frameHeight); // Set fixed size
        frame.clipsContent = true; // Clip content
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

        // Frame Positioning
        const PADDING_BETWEEN_FRAMES = 100; let newX = figma.viewport.center.x - frameWidth / 2; let newY = figma.viewport.bounds.y + 100;
        const existingFrames = figma.currentPage.children.filter(node => node.type === 'FRAME');
        if (existingFrames.length > 0) {
             let rightmostX = -Infinity; let topmostY = Infinity;
             existingFrames.forEach(f => { if (f !== frame) { const frameRightEdge = f.x + f.width; if (frameRightEdge > rightmostX) rightmostX = frameRightEdge; if (f.y < topmostY) topmostY = f.y; }});
             newX = rightmostX + PADDING_BETWEEN_FRAMES; newY = topmostY;
        }
        frame.x = newX; frame.y = newY;
        figma.currentPage.appendChild(frame);

        figma.ui.postMessage({ type: 'get-ai-response', prompt: prompt });

    } else if (msg.type === 'render-design') {
         const { json } = msg;
         // Use the stored currentFrame reference
         if (!currentFrame || currentFrame.removed) {
             console.error("Target frame lost before rendering.");
             figma.notify("Target frame lost."); figma.ui.postMessage({ type: 'error', message: 'Target frame lost.'}); return;
         }

         if (json) {
             let renderSuccess = false;
             try {
                 console.log("Calling renderFromJson...");
                 renderSuccess = await renderFromJson(json, currentFrame); // Pass the frame reference
                 console.log("renderFromJson completed. Success:", renderSuccess);
             } catch (renderError) {
                 console.error("Critical Error during rendering:", renderError);
                 figma.notify(`Critical rendering error: ${renderError.message}. Check Console.`);
                 if (currentFrame && !currentFrame.removed) currentFrame.remove(); // Use stored reference
                 figma.ui.postMessage({ type: 'error', message: `Rendering Error: ${renderError.message}` });
             }

             if (renderSuccess) {
                 // Ensure frame still exists before selecting/zooming
                 if (currentFrame && !currentFrame.removed) {
                     figma.currentPage.selection = [currentFrame];
                     figma.viewport.scrollAndZoomIntoView([currentFrame]);
                 }
                 figma.notify('✅ Design generated!');
                 figma.ui.postMessage({ type: 'generation-complete', message: 'Design rendered!' });
             } else {
                 console.log("renderFromJson indicated failure or error occurred.");
                 if (currentFrame && !currentFrame.removed) currentFrame.remove(); // Use stored reference for cleanup
                  figma.ui.postMessage({ type: 'error', message: 'Rendering failed.'});
             }
         } else { /* ... handle missing JSON error ... */
              console.error("Render command received without JSON."); figma.notify("Invalid data from UI."); if (currentFrame && !currentFrame.removed) currentFrame.remove(); figma.ui.postMessage({ type: 'error', message: 'Invalid data for rendering.'});
         }
         currentFrame = null; // Clear reference after processing

    } else if (msg.type === 'cancel-generation') { /* ... Cancel logic ... */
         console.log("Generation cancelled."); if (currentFrame && !currentFrame.removed) { currentFrame.remove(); currentFrame = null; } figma.notify("Generation cancelled.");
    }
};

