import {getParseTree, handleParseTreeToBlocks, workspaceToLanguageCode, workspaceToXML} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";

function displayMessage(msg, erasePrevious=true) {
  let alertDisplay = document.getElementById("alert-display");
  if(!alertDisplay) {
    alertDisplay = document.createElement("div");
    alertDisplay.id = "alert-display";
    alertDisplay.style.fontSize = "small";
    alertDisplay.style.fontWeight = "bold";
    alertDisplay.style.borderColor = "#000";
    alertDisplay.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    alertDisplay.style.color = "#f00";
    alertDisplay.style.position = "absolute";
    alertDisplay.style.zIndex = "1050";
    alertDisplay.style.width = "98%";
    alertDisplay.style.minHeight = "50px";
    alertDisplay.style.left = "0";
    alertDisplay.style.bottom = "0";
    alertDisplay.style.textAlign = "left";
    alertDisplay.style.padding = "1%";
    document.body.appendChild(alertDisplay);
  }
  if(erasePrevious) {
    alertDisplay.innerText = msg;
  } else {
    alertDisplay.innerText += msg;
  }
}

//Blockly.Python['code_statement'] = Blockly.JavaScript['code_statement'] =
Blockly.Python['type_in_display_string_literal'] = Blockly.JavaScript['type_in_display_string_literal'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_display_string_literal'] = {
  validate: (exp) => {
    const langDisplays = Object.values(T2C.MSG)
      .map(langObj => langObj["TERMINAL_DISPLAY"])
      .filter(text => typeof text === "string");
    const val = langDisplays.find(text => 
      text.startsWith(exp) || exp.startsWith(text));
    const afterText = val && val.length <= exp.length && 
      exp.substring(val.length).trim();
    const afterOpenParenthesis = afterText && 
      afterText.substring(1).trim();
    if(exp) {
      // props.editing = true;
      // console.warn("something");
      // this.setColour("#f00");                 
    }
    if(!val) {
      displayMessage("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"]);
      return null;
    }
    else if(afterText && afterText.length && !afterText.startsWith("(")) {
      displayMessage("You're missing an opening parenthesis after " + val);
      return val;
    }
    else if(afterOpenParenthesis && !afterOpenParenthesis.startsWith('"') && !afterOpenParenthesis.startsWith("'")) {
      displayMessage("Make sure the text you want to display is between \" and \" so the computer just displays it without trying to figure out what you mean!");
      return val + "(";
    }
    else if(afterOpenParenthesis && afterOpenParenthesis.indexOf('"', 1) !== -1
      && !afterOpenParenthesis.substring(afterOpenParenthesis.indexOf('"', 1)+1).trim().startsWith(")")) {
      displayMessage("Make sure to include a closing parenthesis after the string surrounded by \" and \".");
      return val + "(" + afterOpenParenthesis.substring(0, afterOpenParenthesis.indexOf('"', 1)+1);
    }
    else {
      displayMessage("");
      return exp;
    }
  },
  init: function() {
    this.appendDummyInput("STRING")
        .appendField(new Blockly.FieldTextInput("", this.validate), "EXP");
    this.setInputsInline(false);
    this.setOutput(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
    this.setTooltip(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TOOLTIP);
    this.onchange = e => {
      if(this.getFieldValue("EXP").endsWith("\r") || 
        this.getFieldValue("EXP").endsWith("\n") || (this.getFieldValue("EXP").length > 0 && e.element === "workspaceClick")) {
        if(!this.validate(this.getFieldValue("EXP")) || 
          (!this.getFieldValue("EXP").endsWith(")") && 
            !this.getFieldValue("EXP").endsWith(";"))) return;
        else {
          const parseTree = getParseTree(this.getFieldValue("EXP"));
          if(parseTree) {
            handleParseTreeToBlocks(parseTree, this);
          } else {
            alert("Try checking what you entered again for mistakes.");
          }
        }
      }
    };
    //this.onchange = parseAndConvertToBlocks.bind(this, props);
  },
  /*validate: function(colourHex) {
    console.warn("something");
    this.setColour("#f00");
  }*/
};

Blockly.Python['type_in_welcome_message'] = Blockly.JavaScript['type_in_welcome_message'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_welcome_message'] = {
  validate: (exp) => {
    const trimmedExp = exp.trim();
    const firstEndQuotePosition = trimmedExp.length ? 
      trimmedExp.substring(1).search(/[^\\]['|"]/)+2 : -1;
    const beforeFirstEndQuote = firstEndQuotePosition > 1 ? 
      trimmedExp.substring(0, firstEndQuotePosition) : trimmedExp;
    const afterFirstEndQuote = firstEndQuotePosition > 1 ? 
      trimmedExp.substring(firstEndQuotePosition+1) : trimmedExp;
    /*
    const langDisplays = Object.values(T2C.MSG)
      .map(langObj => langObj["TERMINAL_DISPLAY"])
      .filter(text => typeof text === "string");
    const val = langDisplays.find(text => 
      text.startsWith(exp) || exp.startsWith(text));
    const afterText = val && val.length <= exp.length && 
      exp.substring(val.length).trim();
    const afterOpenParenthesis = afterText && 
      afterText.substring(1).trim();
    */
    if(!trimmedExp.length) {
      displayMessage("");
      return;
    }
    else if(!trimmedExp.startsWith("\"") && !trimmedExp.startsWith("\'")) {
      displayMessage("Since you will be starting your message with text to be displayed as is such as Welcome, be sure you let the computer know this by surrounding what appears first with \" and \"");
      return null;
    }
    else if(firstEndQuotePosition > 1 && !"+firstName+".startsWith(afterFirstEndQuote.trim().replace(/\s+\+|\+\s+/g, "+")) && 
      !afterFirstEndQuote.trim().replace(/\s+\+|\+\s+/g, "+").startsWith("+firstName+")) {
      displayMessage("Be sure that the variable name firstName appears outside of quotation marks since you want its value, not literally firstName and that you include + before and after it to join the welcome at the beginning and the punctuation mark at the end.")
      return beforeFirstEndQuote;
    } else {
      displayMessage("");
      return exp;
    }
  },
  init: function() {
    this.appendDummyInput("STRING")
        .appendField(new Blockly.FieldTextInput("", this.validate), "EXP");
    this.setInputsInline(false);
    this.setOutput(true);
    this.setPreviousStatement(false);
    this.setNextStatement(false);
    this.setColour(60);
    this.setTooltip(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TOOLTIP);
    this.onchange = e => {
      if(this.getFieldValue("EXP").endsWith("\r") || 
        this.getFieldValue("EXP").endsWith("\n") || (this.getFieldValue("EXP").length > 0 && e.element === "workspaceClick")) {
        if(!this.validate(this.getFieldValue("EXP"))) return;
        else if(this.getFieldValue("EXP").trim().endsWith('"') || 
          this.getFieldValue("EXP").trim().endsWith("'")) {
          const parseTree = getParseTree(this.getFieldValue("EXP"));
          if(parseTree) {
            handleParseTreeToBlocks(parseTree, this);
          } else {
            alert("Try checking what you entered again for mistakes.");
          }
        }
      }
    };
    //this.onchange = parseAndConvertToBlocks.bind(this, props);
  },
  /*validate: function(colourHex) {
    console.warn("something");
    this.setColour("#f00");
  }*/
};

function getToolboxBlock(index) {
  return Array.from(document.querySelectorAll("rect"))
    .filter(x => x.getAttribute("fill-opacity"))[index]
}

function getPositionOnScreen(obj, p) {
  return {
    x: Math.min(p.x, window.innerWidth - obj.innerWidth),
    y: Math.min(p.y, window.innerHeight - obj.innerHeight)
  };
}

function getAbsolutePosition(workspace, block, options, offsetX = 0, offsetY = 0) {
  const blockCoords = block.getBoundingRectangle();
  const workspaceCoords = workspace.getMetrics();
  const workspaceScale = workspace.getScale();
  let adjustedOffsetX = offsetX;
  let adjustedOffsetY = offsetY;
  const blockOffsetScaleX = options.blockOffsetScaleX || 0;
  const blockOffsetScaleY = options.blockOffsetScaleY || 0;


  // workaround: need to understand coordinate systems better
  /*
  if(workspaceScale !== 1 && block.svgGroup_ instanceof SVGElement) { 
    //!block.svgGroup_.classList.constains("blocklyDragging")) {
    // console.warn("BSG:", block.svgGroup_);
    // console.warn(workspace.getSvgXY(block.svgGroup_));
    return {
      x: workspace.getSvgXY(block.svgGroup_).x + blockOffsetScaleX*block.width + offsetX,
      y: workspace.getSvgXY(block.svgGroup_).y + blockOffsetScaleY*block.height + offsetY,
    }
  }
  */

  // document.getElementById("ptr").style.left = Blockly.getMainWorkspace().getSvgXY(Blockly.getMainWorkspace().getAllBlocks()[0].svgGroup_).x + "px";
  // document.getElementById("ptr").style.top = Blockly.getMainWorkspace().getSvgXY(Blockly.getMainWorkspace().getAllBlocks()[0].svgGroup_).y + document.getElementById("top-header").offsetHeight + "px";

  return {
    x: (blockCoords.left - workspaceCoords.viewLeft + blockOffsetScaleX*block.width)
      * workspaceScale  + adjustedOffsetX,
    y: (blockCoords.top - workspaceCoords.viewTop + workspaceCoords.flyoutHeight 
      + blockOffsetScaleY*block.height) * workspaceScale  + adjustedOffsetY
  }
}

/*
function moveAndFlashText(div) {
  const steps = 100;
  let currentStep = 0;
  div.style.verticalAlign = "top";
  alert(div.style);
  function flashText() {
    if(currentStep % 50 < 25) {
      div.style.textColor = "#a00";
    } else {
      div.style.textColor = "#000";
    }
    currentStep++;
    if(currentStep < steps) {
      requestAnimationFrame(flashText);
    }
  }
  requestAnimationFrame(flashText);
}
*/

function restoreAfterMoveAndFlashText(div) {
  div.style.verticalAlign = "middle";
  div.style.color = "#000";
}

function hideOutputAndCodeContainers() {
  document.getElementById("output-container").classList.remove("show-container");
  document.getElementById("output-container").classList.add("hide-container");
  document.getElementById("text-code-container").classList.remove("show-container");
  document.getElementById("text-code-container").classList.add("hide-container");   
}

function addMoveAndFlashTask(courseInstructionTaskFlow, div) {
  const steps = 200;
  let currentStep = 0;
  function flashText() {
    if(currentStep % 50 < 25) {
      div.style.color = "#a00";
    } else {
      div.style.color = "#000";
    }
    currentStep++;
    if(currentStep < steps) {
      requestAnimationFrame(flashText);
    }
  }  
  courseInstructionTaskFlow.addTask(
    new CourseInstructionTask(
      () => currentStep >= steps,
      {
        start: () => {
          div.style.verticalAlign = "top";
          requestAnimationFrame(flashText)
        },
        isComplete: () => true,
        animate: () => true
      }
    )
  );
}

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  const workspace = ws || Blockly.getMainWorkspace(); 
  workspace.clear();
  //workspace.options.horizontalLayout = true;
  workspace.options.maxInstances = {text_print: 1, text: 1, type_in_display_string_literal: 1};
  //workspace.options.maxBlocks = 2;
  //workspace.updateToolbox(document.getElementById("toolbox"));
  workspace.setScale(1);
  refreshWorkspace(workspace);

  const toolboxBlocks = Array.from(document.querySelectorAll("rect"))
    .filter(x => x.getAttribute("fill-opacity"))  
  const displayBlock = toolboxBlocks[0];
  const textBlock = toolboxBlocks[1];
  console.warn("TEXT", textBlock);
  const d = document.createElement("div");

  d.innerText = "👆";
  d.id = "ptr";
  d.style.fontSize = "x-large";
  d.style.position = "absolute";
  d.style.zIndex = "1001";
  document.getElementById("blockly-div").appendChild(d);

  function addRunTask(courseInstructionTaskFlow) {
    courseInstructionTaskFlow.addTask(
      new CourseInstructionTask(
        () => document.getElementById("output-container").classList.contains("show-container"),
        new ParallelAnimation([
          new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_RUN_CODE, {
            startPosition: {
              x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth,
              y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight
            }
          }),
          new BlinkAnimation(d, {
            totalSteps: 100,
            toggleSteps: 25,
            startPosition: {
              x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth/2,
              y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight/2
            }
          })
        ])
      )
    );
  }

/*
  let clickedSaveTextCodeButton = false;
  let clickedSaveXMLCodeButton = false;
  let clickedLoadTextCodeButton = false;
  let clickedLoadXMLCodeButton = false;
*/
  let clipboardText = "";
  let clickedLoadButtonLast = false;
  let clickedSaveButtonLast = false;
  let generatedXMLCode;
  let generatedTextCode;
//  let clickedLoadXMLButtonLast = false;
//  let clickedSaveXMLButtonLast = false;
  //let xmlText;

  // const citf = new CourseInstructionTaskFlow();
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && Blockly.selected !== x),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Drag the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block somewhere in the workspace.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 50,
          startPosition: {
            x: displayBlock.x.baseVal.value + displayBlock.width.baseVal.value/2, 
            y: document.getElementById("top-header").offsetHeight + 
              displayBlock.y.baseVal.value + displayBlock.height.baseVal.value/2
          },
          velocity: {x: 0, y: 2}
        })
      ])
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text" && x.getParent() && x.getParent().type === "text_print"),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Drag the text block in the space in the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 50,
          startPosition: {
            x: textBlock.x.baseVal.value + textBlock.width.baseVal.value/2,
            y: document.getElementById("top-header").offsetHeight + 
              textBlock.y.baseVal.value + displayBlock.height.baseVal.value/2 
          },
          endPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
            // const coords = textBlockWs.getBoundingRectangle();
            /*
            return {       
              x: (coords.left + textBlockWs.width/2)*Blockly.getMainWorkspace().getScale() + d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                (coords.top + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2)*Blockly.getMainWorkspace().getScale() - d.offsetHeight/4
            }
            */
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, d.offsetWidth/4,  document.getElementById("top-header").offsetHeight-d.offsetHeight/4);
            //getAbsolutePosition(Blockly.getMainWorkspace(), textBlockWs, textBlockWs.width/2 + d.offsetWidth/4, document.getElementById("top-header").offsetHeight + textBlockWs.height/2 - d.offsetHeight/4)
          }
        })
      ])
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text" && x.getFieldValue("TEXT")),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Click on the area between the quotation marks in the text block and " + T2C.MSG.currentLanguage.TYPE_SOMETHING, {
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text");
            // const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 1}, d.offsetWidth,  document.getElementById("top-header").offsetHeight + d.offsetHeight);
            /*return {       
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 + d.offsetWidth,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height + d.offsetHeight // textBlockWs.height/2 covers field
            }*/
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text");
            // const coords = textBlockWs.getBoundingRectangle();
            // 0.5 for scale on y covers field
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 1}, -d.offsetWidth/4,  document.getElementById("top-header").offsetHeight);
            /*return {       
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 - d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2
            }*/
          }
        })
      ])
    )
  );
  addRunTask(citf);
  addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Congratulations! You just created and ran your first program!");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          const typeBlock = document.createElement("block");
          typeBlock.setAttribute("type", "type_in_display_string_literal");
          document.getElementById("toolbox").prepend(typeBlock);
          workspace.options.maxInstances["type_in_display_string_literal"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
        x.getNextBlock() && x.getNextBlock().type === "type_in_display_string_literal" && 
        !workspace.isDragging()),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Drag in the type-in-code block so its top groove connects to the point of the bottom of the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const typeInDisplayStringLiteralBlock = getToolboxBlock(0);
            console.warn(typeInDisplayStringLiteralBlock)
            return {
              x: typeInDisplayStringLiteralBlock.x.baseVal.value + 
                typeInDisplayStringLiteralBlock.width.baseVal.value/2, 
              y: document.getElementById("top-header").offsetHeight + 
                displayBlock.y.baseVal.value + displayBlock.height.baseVal.value/2
            }
          },
          endPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
            //const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0, blockOffsetScaleY: 1}, d.offsetWidth/4,  document.getElementById("top-header").offsetHeight);
            /*
            return {       
              x: coords.left + d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height
            }
            */
          }
        })
      ])
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && x.getNextBlock() && 
        (x.getNextBlock().type === "text_print" || x.getNextBlock().type === "js_text_print") && x.getNextBlock().getInputTargetBlock("TEXT")
        && x.getNextBlock().getInputTargetBlock("TEXT").type === "text"),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Type in code matching above block but with different text to display.  I.e., Type\n" + 
          T2C.MSG.currentLanguage["TEXT_PRINT_TITLE"].replace("%1", "\"your new message\"") + "\nreplacing your new message with whatever you want to display.  Be exact with parentheses, quotation marks, etc.  Tap off the block when you're done.", {
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "type_in_display_string_literal");
            // const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 1}, d.offsetWidth,  document.getElementById("top-header").offsetHeight + d.offsetHeight);
            /*
            return {
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 + d.offsetWidth,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height + d.offsetHeight // use textBlockWs.height/2 covers text field
            }
            */
          }
        }),
      new BlinkAnimation(d, {
        totalSteps: 200,
        toggleSteps: 50,
        startPosition: () => {
          const typeInBlock1 = workspace.getAllBlocks().find(x => x.type === "type_in_display_string_literal");
          // const coords = typeInBlock1.getBoundingRectangle();
          return getAbsolutePosition(workspace, typeInBlock1, {blockOffsetScaleX: 0, blockOffsetScaleY: 1}, 0,  document.getElementById("top-header").offsetHeight);
          /*
          return {       
            x: typeInBlock1.getBoundingRectangle().left,
            y: document.getElementById("top-header").offsetHeight + typeInBlock1.getBoundingRectangle().bottom + 
              Blockly.getMainWorkspace().getMetrics().flyoutHeight
          }
          */
        }
      })])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => document.getElementById("output-container").classList.contains("show-container"),
      new ParallelAnimation([
        {
          start: () => {
            workspace.options.maxInstances["type_in_display_string_literal"] = 0;
            workspace.updateToolbox(document.getElementById("toolbox"));
          },
          isComplete: () => true,
          animate: () => true
        },
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_RUN_CODE, {
          startPosition: {
            x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth,
            y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth/2,
            y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight/2
          }
        })
      ])
    )
  );

  addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("✔ Awesome! You just typed code for and ran your first program!");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          ["variables_get", "variables_set"].forEach(blockType => {
            const typeBlock = document.createElement("block");
            typeBlock.setAttribute("type", blockType);
            document.getElementById("toolbox").prepend(typeBlock);
            workspace.options.maxInstances[blockType] = 1;
          });
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "variables_set" && 
        x.getNextBlock() && (x.getNextBlock().type === "text_print" || x.getNextBlock().type === "js_text_print")),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Drag in the " + T2C.MSG.currentLanguage.TERMINAL_LET  + " variable declaration block directly above the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block so its bottom point connects to the groove of the top of the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const variablesSetBlock = getToolboxBlock(0);
            return {
              x: variablesSetBlock.x.baseVal.value + 
                variablesSetBlock.width.baseVal.value/2, 
              y: document.getElementById("top-header").offsetHeight + 
                variablesSetBlock.y.baseVal.value + variablesSetBlock.height.baseVal.value/2
            }
          },
          endPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
            // const coords = textBlockWs.getBoundingRectangle();
            /*
            return {       
              x: coords.left + d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0, blockOffsetScaleY: 0}, d.offsetWidth/4, document.getElementById("top-header").offsetHeight);
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "variables_set" && 
        x.getInputTargetBlock("VALUE") && x.getInputTargetBlock("VALUE").type === "text"),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Drag the text from inside the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block to the inside of the " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable declaration block directly above it so the variable stores the text.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text");
            const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + textBlockWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          },
          endPosition: () => {
            const variablesSetBlockWs = workspace.getAllBlocks().find(x => x.type === "variables_set");
            const coords = variablesSetBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, variablesSetBlockWs, {blockOffsetScaleX: 0.75, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + 3*variablesSetBlockWs.width/4, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + variablesSetBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(      
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
        x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get"),
      new ParallelAnimation([
        new HelpMessageDirection(() => {
          const varBlock = workspace.getAllBlocks().find(block => block.type === "variables_set");
          //const valueTextBlock = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print"));
          const valueTextBlock = workspace.getAllBlocks().find(block => block.type === "text" && block.getParent() === varBlock);
          const varBlockName = varBlock ? varBlock.getField("VAR").getText() : "item";
          const text = valueTextBlock ? valueTextBlock.getFieldValue("TEXT") : "";
          return "Drag the variable get block from the toolbox to the inside of the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.  This will cause the variable the text is set to (" + text + ") to display.  (The computer knows to display its value instead of the literal text " 
           + varBlockName + " because it is not surrounded by quotation marks.";
        }, {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const variablesGetBlock = getToolboxBlock(1);
            return {
              x: variablesGetBlock.x.baseVal.value + 
                variablesGetBlock.width.baseVal.value/2, 
              y: document.getElementById("top-header").offsetHeight + 
                variablesGetBlock.y.baseVal.value + variablesGetBlock.height.baseVal.value/2
            }
          },
          endPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print")
              && !x.getInputTargetBlock("TEXT"));
            //const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, d.offsetWidth/4,  document.getElementById("top-header").offsetHeight);          
            /*
            return {       
              x: coords.left + textBlockWs.width/2 + d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  addRunTask(citf);
  addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("👍 Great!  Notice how the output is the same as before, but in this program, we store one of the lines of text to display in a variable first.  Variables are useful for storing stuff we'll want to use later.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          const inputBlock = document.createElement("block");
          inputBlock.setAttribute("type", "text_input");
          document.getElementById("toolbox").prepend(inputBlock);
          workspace.options.maxInstances["text_input"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));        
          /*
          ["variables_get", "variables_set"].forEach(blockType => {
            const typeBlock = document.createElement("block");
            typeBlock.setAttribute("type", blockType);
            document.getElementById("toolbox").prepend(typeBlock);
            workspace.options.maxInstances[blockType] = 1;
          });
          workspace.options.maxInstances["type_in_display_string_literal"] = 0;
          workspace.updateToolbox(document.getElementById("toolbox"));
          */
        }
      }
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "variables_set" && 
        x.getInputTargetBlock("VALUE") && (x.getInputTargetBlock("VALUE").type === "text_input" || x.getInputTargetBlock("VALUE").type === "js_text_input")),
      new ParallelAnimation([
        new HelpMessageDirection(() => {
          const varBlock = workspace.getAllBlocks().find(block => block.type === "variables_set");
          const inputBlock = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input"));
          const valueTextBlock = workspace.getAllBlocks().find(block => block.type === "text" && (block.getParent() === varBlock || block.getParent() === inputBlock));
          const varBlockName = varBlock ? varBlock.getField("VAR").getText() : "item";
          const text = valueTextBlock ? valueTextBlock.getFieldValue("TEXT") : "";
          return "Drag the " + T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING + " block inside the " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable block and move the text block that currently resides there inside the new " + T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING + " block.  This will ask the user for text with the message " + text + " and store whatever the user types in the variable " + varBlockName + ".";
        }, {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const getInputByAskingBlock = getToolboxBlock(0);
            return {
              x: getInputByAskingBlock.x.baseVal.value + 
                getInputByAskingBlock.width.baseVal.value/2, 
              y: document.getElementById("top-header").offsetHeight + 
                getInputByAskingBlock.y.baseVal.value + getInputByAskingBlock.height.baseVal.value/2
            }
          },
          endPosition: () => {
            const variablesSetBlockWs = workspace.getAllBlocks().find(x => x.type === "variables_set");
            //const coords = variablesSetBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, variablesSetBlockWs, {blockOffsetScaleX: 0.75, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + 3*variablesSetBlockWs.width/4, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + variablesSetBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "variables_set" &&  
            x.getField("VAR").getText() === "firstName"),
      new ParallelAnimation([
        new HelpMessageDirection(() => "You will be asking the user for his/her first name, and this variable will store it.  Rename the variable:\nfirstName\nThis variable is in camel case, which is a convention in Python and JavaScript.  This means that the first letter of each word after the first is capitalized.", {
          startPosition: () => {
            const variablesSetBlockWs = workspace.getAllBlocks().find(x => x.type === "variables_set");
            //const coords = variablesSetBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, variablesSetBlockWs, {blockOffsetScaleX: 0, blockOffsetScaleY: 1}, d.offsetWidth,  document.getElementById("top-header").offsetHeight);
            /*
            return {       
              //x: coords.left + variablesSetBlockWs.width/8,
              //y: document.getElementById("top-header").offsetHeight + 
              //coords.top + 7*variablesSetBlockWs.height/8 + 
              //Blockly.getMainWorkspace().getMetrics().flyoutHeight
              x: variablesSetBlockWs.getBoundingRectangle().left + d.offsetWidth,//+ variablesSetBlockWs.width,// + variablesSetBlockWs.width/8,
              y: document.getElementById("top-header").offsetHeight + variablesSetBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + variablesSetBlockWs.height
            }
            */
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            const variablesSetBlockWs = workspace.getAllBlocks().find(x => x.type === "variables_set");
            // const coords = variablesSetBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, variablesSetBlockWs, {blockOffsetScaleX: 0, blockOffsetScaleY: 0.5}, d.offsetWidth,  document.getElementById("top-header").offsetHeight);
            /*
            return {       
              x: variablesSetBlockWs.getBoundingRectangle().left + d.offsetWidth,
              y: document.getElementById("top-header").offsetHeight + variablesSetBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + variablesSetBlockWs.height/2
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text" &&  
            x.getParent() && (x.getParent().type === "text_input" || x.getParent().type === "js_text_input") && 
            (x.getFieldValue("TEXT").toLowerCase().includes("name ") ||
             x.getFieldValue("TEXT").toLowerCase().includes(" name"))),
      new ParallelAnimation([
        new HelpMessageDirection(() => "This text is the message the user will receive asking for his/her name.  Write a message asking the user for his/her name.  Unlike the variable name which cannot have spaces in most programming languages, the message will be seen by the user and should have spaces.  The variable will store the name your user enters.", {
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text" && 
              x.getParent() && (x.getParent().type === "text_input" || x.getParent().type === "js_text_input"));
            // const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 1}, d.offsetWidth,  document.getElementById("top-header").offsetHeight);
            /*
            return {       
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 + d.offsetWidth,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height
            }
            */
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text" && 
              x.getParent() && (x.getParent().type === "text_input" || x.getParent().type === "js_text_input"));
            const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, -d.offsetWidth/4,  document.getElementById("top-header").offsetHeight);
            /*
            return {       
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 - d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2
            }
            */
          }
        })
      ])
    )
  );

  addRunTask(citf);
  addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("👍 Cool!  Notice how the output includes what you typed in for your first name.  If you run it again and type in something different, you'll see this different name.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          const textJoinBlock = document.createElement("block");
          textJoinBlock.setAttribute("type", "t2c_text_join");
          document.getElementById("toolbox").prepend(textJoinBlock);
          workspace.options.maxInstances["t2c_text_join"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));        
          /*
          ["variables_get", "variables_set"].forEach(blockType => {
            const typeBlock = document.createElement("block");
            typeBlock.setAttribute("type", blockType);
            document.getElementById("toolbox").prepend(typeBlock);
            workspace.options.maxInstances[blockType] = 1;
          });
          workspace.options.maxInstances["type_in_display_string_literal"] = 0;
          workspace.updateToolbox(document.getElementById("toolbox"));
          */
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
        x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "t2c_text_join"),
        /*&& x.getInputTargetBlock("TEXT").getInputTargetBlock("A") && 
        x.getInputTargetBlock("TEXT").getInputTargetBlock("A").type === "variables_get"
        && x.getInputTargetBlock("TEXT").getInputTargetBlock("B") && 
        x.getInputTargetBlock("TEXT").getInputTargetBlock("B").type === "text"),*/
      new ParallelAnimation([
        new HelpMessageDirection(() => {
          const varBlock = workspace.getAllBlocks().find(block => block.type === "variables_get");
          const displayBlock = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print"));
          const valueTextBlock = workspace.getAllBlocks().find(block => block.type === "text" && block.getParent() === displayBlock);
          const varBlockName = varBlock ? varBlock.getField("VAR").getText() : "item";
          const text = valueTextBlock ? valueTextBlock.getFieldValue("TEXT") : "";
          return "Drag the + block inside the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block, replacing the variable " + varBlockName + " get block currently inside it.  The + is used to join text expressions together (also called string concatenation).  We will join the text " + text + " currently appearing below with the value of the variable " + varBlockName + ", which is whatever the user types in and use the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block to display the result on a single line.";
        }, {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const textJoinBlock = getToolboxBlock(0);
            return {
              x: textJoinBlock.x.baseVal.value + 
                textJoinBlock.width.baseVal.value/2, 
              y: document.getElementById("top-header").offsetHeight + 
                textJoinBlock.y.baseVal.value + textJoinBlock.height.baseVal.value/2
            }
          },
          endPosition: () => {
            const displayBlockVarWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
              x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
            // const coords = displayBlockVarWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, displayBlockVarWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);          
            /*
            return {
              x: coords.left + displayBlockVarWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + displayBlockVarWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
        x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "t2c_text_join"
        && x.getInputTargetBlock("TEXT").getInputTargetBlock("A") && 
        x.getInputTargetBlock("TEXT").getInputTargetBlock("A").type === "text"),
        /*&& x.getInputTargetBlock("TEXT").getInputTargetBlock("B") && 
        x.getInputTargetBlock("TEXT").getInputTargetBlock("B").type === "variables_get"),*/
      new ParallelAnimation([
        new HelpMessageDirection(() => {
          const varBlock = workspace.getAllBlocks().find(block => block.type === "variables_get");
          // const displayBlock = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print"));
          const valueTextBlock = workspace.getAllBlocks().find(block => block.type === "text" && block.getParent() && (block.getParent().type === "text_print" || block.getParent().type === "js_text_print"));
          const varBlockName = varBlock ? varBlock.getField("VAR").getText() : "item";
          const text = valueTextBlock ? valueTextBlock.getFieldValue("TEXT") : "";
          return "Drag the text " + text + " appearing in the bottom " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block in the left space of the + block.";
        }, {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text" && 
              x.getParent() && (x.getParent().type === "text_print" || x.getParent().type === "text_print"));
            // const coords = textBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + textBlockWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          },
          endPosition: () => {
            const textJoinBlockWs = workspace.getAllBlocks().find(x => x.type === "t2c_text_join");
            // const coords = textJoinBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textJoinBlockWs, {blockOffsetScaleX: 0.25, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + textJoinBlockWs.width/4, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textJoinBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
        x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "t2c_text_join"
        && x.getInputTargetBlock("TEXT").getInputTargetBlock("A") && 
        x.getInputTargetBlock("TEXT").getInputTargetBlock("A").type === "text"
        && x.getInputTargetBlock("TEXT").getInputTargetBlock("B") && 
        x.getInputTargetBlock("TEXT").getInputTargetBlock("B").type === "variables_get"),
      new ParallelAnimation([
        new HelpMessageDirection(() => {
          const varBlock = workspace.getAllBlocks().find(block => block.type === "variables_get");
          // const displayBlock = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print"));
          // const valueTextBlock = workspace.getAllBlocks().find(block => block.type === "text" && block.getParent() === displayBlock);
          const varBlockName = varBlock ? varBlock.getField("VAR").getText() : "item";
          // const text = valueTextBlock ? valueTextBlock.getFieldValue("TEXT") : "";
          return "Now drag the variable " + varBlockName + " block inside the right space of the + block.";
        }, {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const variableBlockWs = workspace.getAllBlocks().find(x => x.type === "variables_get");
            // const coords = variableBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, variableBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + variableBlockWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + variableBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          },
          endPosition: () => {
            const textJoinBlockWs = workspace.getAllBlocks().find(x => x.type === "t2c_text_join");
            // const coords = textJoinBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textJoinBlockWs, {blockOffsetScaleX: 0.75, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + 3*textJoinBlockWs.width/4, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textJoinBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().filter(x => (x.type === "text_print" || x.type === "js_text_print")).length === 1,
      new ParallelAnimation([
        new HelpMessageDirection(() => "Now drag the bottom " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block in the trashcan since you no longer need it.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const displayBlockVarWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
              !x.getInputTargetBlock("TEXT"));
            // const coords = displayBlockVarWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, displayBlockVarWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + displayBlockVarWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + displayBlockVarWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          },
          endPosition: () => {
            const coords = workspace.trashcan.getClientRect();
            return {
              x: (coords.left + coords.right)/2, //+ d.offsetWidth/4,
              y: (coords.top + coords.bottom)/2
              /*
              y: document.getElementById("top-header").offsetHeight + 
                (coords.top + coords.bottom)/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
              */
            }
          }
        })
      ])
    )
  );

  addRunTask(citf);
  addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("👍 Great!  Notice how the + was used to concatenate or join together the literal message (in quotes) and the name the user enters (*NOT* in quotes).");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          const typeInWelcomeNameBlock = document.createElement("block");
          typeInWelcomeNameBlock.setAttribute("type", "type_in_welcome_message");
          document.getElementById("toolbox").prepend(typeInWelcomeNameBlock);
          workspace.options.maxInstances["type_in_welcome_message"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));        
          /*
          ["variables_get", "variables_set"].forEach(blockType => {
            const typeBlock = document.createElement("block");
            typeBlock.setAttribute("type", blockType);
            document.getElementById("toolbox").prepend(typeBlock);
            workspace.options.maxInstances[blockType] = 1;
          });
          workspace.options.maxInstances["type_in_display_string_literal"] = 0;
          workspace.updateToolbox(document.getElementById("toolbox"));
          */
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().filter(x => (x.type === "text_print" || x.type === "js_text_print")).length === 1 && 
        workspace.getAllBlocks().filter(x => x.type === "t2c_text_join").length === 0 && 
        workspace.getAllBlocks().filter(x => x.type === "variables_get").length === 0 && 
        workspace.getAllBlocks().filter(x => x.type === "text").length === 1,
      new ParallelAnimation([
        new HelpMessageDirection(() => "Now drag the + block with the text and variable blocks inside of it into the trashcan.  Do *NOT* drag the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " statement block in the trashcan since we will be using an expression type-in block.  In JavaScript, an expression is just something that produces a value whereas a statement does not.  As a block, it connects inside such as +, a variable get, text, or " + T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING + ".", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const textJoinBlockWs = workspace.getAllBlocks().find(x => x.type === "t2c_text_join");
            // const coords = textJoinBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textJoinBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + textJoinBlockWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textJoinBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          },
          endPosition: () => {
            const coords = workspace.trashcan.getClientRect();
            return {
              x: (coords.left + coords.right)/2, //+ d.offsetWidth/4,
              y: (coords.top + coords.bottom)/2
              /*
              y: document.getElementById("top-header").offsetHeight + 
                (coords.top + coords.bottom)/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
              */
            }
          },
          finish: () => {
            workspace.options.maxInstances["t2c_text_join"] = 0;
            workspace.options.maxInstances["variables_get"] = 0;
            workspace.updateToolbox(document.getElementById("toolbox"));
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") && 
        x.getInputTargetBlock("TEXT") && 
          x.getInputTargetBlock("TEXT").type === "type_in_welcome_message"),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Now drag the type-in-expression block inside the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " one.", {
          startPosition: () => {
            return {x: 0, y: document.getElementById("top-header").offsetHeight}
          }
        }),
        new GlideAnimation(d, {
          totalSteps: 150,
          startPosition: () => {
            const welcomeMessageTypeBlock = getToolboxBlock(0);
            return {
              x: welcomeMessageTypeBlock.x.baseVal.value + 
                welcomeMessageTypeBlock.width.baseVal.value/2, 
              y: document.getElementById("top-header").offsetHeight + 
                welcomeMessageTypeBlock.y.baseVal.value + welcomeMessageTypeBlock.height.baseVal.value/2
            }
          },
          endPosition: () => {
            const textPrintBlockWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
            // const coords = textPrintBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textPrintBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + textPrintBlockWs.width/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textPrintBlockWs.height/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            }
            */
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const displayBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
        const outerJoinBlock = displayBlock.getInputTargetBlock("TEXT") && 
          displayBlock.getInputTargetBlock("TEXT").type === "t2c_text_join" && 
          displayBlock.getInputTargetBlock("TEXT");
        const firstOuterJoinChild = outerJoinBlock && outerJoinBlock.getInputTargetBlock("A");
        const secondOuterJoinChild = outerJoinBlock && outerJoinBlock.getInputTargetBlock("B"); 

        if(!firstOuterJoinChild || !secondOuterJoinChild) {
          return false;
        }

        const firstTextBlock = firstOuterJoinChild.type === "t2c_text_join" ? 
          firstOuterJoinChild.getInputTargetBlock("A") : firstOuterJoinChild;
        const secondTextBlock = firstOuterJoinChild.type === "t2c_text_join" ? 
          firstOuterJoinChild.getInputTargetBlock("B") : 
          (secondOuterJoinChild.type === "t2c_text_join" && 
            secondOuterJoinChild.getInputTargetBlock("A"));
        const thirdTextBlock = secondOuterJoinChild.type === "t2c_text_join" ? 
          secondOuterJoinChild.getInputTargetBlock("B") : secondOuterJoinChild;

        return firstTextBlock && firstTextBlock.type === "text" && 
          secondTextBlock && secondTextBlock.type === "variables_get" && 
          secondTextBlock.getField("VAR").getText() === "firstName" && 
          thirdTextBlock && thirdTextBlock.type === "text"
      },
      new ParallelAnimation([
        new HelpMessageDirection(() => "Write a message to welcome the user with his/her name with punctuation at the end.  To do this type:\n(1) Something like welcome *in quotes* because you want it to be displayed as is.\n(2) + firstName (+ to join text and firstName without the quotes to get the name the user typed in and not literally the text firstName)\n(3) + and a punctuation mark in quotes to tack on a punctuation symbol at the end.", {
          startPosition: () => {
            const textPrintBlockWs = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
            // const coords = textPrintBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, textPrintBlockWs, {blockOffsetScaleX: 1, blockOffsetScaleY: 1}, 0,  document.getElementById("top-header").offsetHeight);
            /*
            return {
              x: coords.left + textPrintBlockWs.width, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                coords.top + textPrintBlockWs.height + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
            };
            */
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            const typeInBlockWs = workspace.getAllBlocks().find(x => 
              x.type === "type_in_welcome_message");
            // const coords = typeInBlockWs.getBoundingRectangle();
            return getAbsolutePosition(workspace, typeInBlockWs, {blockOffsetScaleX: 0.5, blockOffsetScaleY: 0.5}, 0, document.getElementById("top-header").offsetHeight);
            /*
            return {       
              x: typeInBlockWs.getBoundingRectangle().left + typeInBlockWs.width/2,
              y: document.getElementById("top-header").offsetHeight + typeInBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + typeInBlockWs.height/2
            }
            */
          },
          finish: () => {
            workspace.options.maxInstances["type_in_welcome_message"] = 0;
            workspace.updateToolbox(document.getElementById("toolbox"));              
          }
        })
      ])
    )
  );

  addRunTask(citf);
  addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          const loadSaveTextCodeButton = document.getElementById("load-save-text-code");
          alert("✔✔ Excellent!  You just wrote a program to welcome the user and along the way you learned some things about variables, getting input from the user, and joining together string literals and variables to produce output.  Mission 0 is just about complete; let's just make sure you can save your work and load it up later!  For extra credit, we'll show you what your code looks in pure JavaScript.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          
          loadSaveTextCodeButton.addEventListener("click", () => {
            // Avoid asking read clipboard permission; assume that button click after disk save button click meant text was copied
            //if(clickedSaveButtonLast && loadSaveTextCodeButton.textContent !== T2C.MSG.currentLanguage["BUTTON_LOAD_TEXT_CODE"]) {
            if(clickedSaveButtonLast) {
              clipboardText = document.getElementById("textCodeBox").value;
            }
            /*  
            // may want to read clipboard instead to check for click (DONE)
            navigator.clipboard.readText().then(clipText => {
              clipboardText = clipText;
              //console.warn(clipboardText);
              //console.warn(clipboardText === document.getElementById("textCodeBox").value);
            });
            */
            //clickedSaveTextCodeButton = true;
          });

          document.getElementById("save-code-button").addEventListener("click", () => {
            clickedLoadButtonLast = false;
            clickedSaveButtonLast = true;
             // save before user potentially changes it; this way you don't need to recall functions generating code/XML 
             // to check
             // This event listener needs to be attached AFTER event listener that generates code; may want to just
             // regenerate code instead so you don't depend on that, export functions from mobile.js
             if(workspace.getAllBlocks().length === 9) { // make sure the workspace wasn't changed
               generatedTextCode = workspaceToLanguageCode(workspace, T2C.MSG.currentLanguage) || document.getElementById("textCodeBox").value;
               generatedXMLCode = workspaceToXML(workspace) || document.getElementById("xmlData").value;
             } else {
               alert("Workspace changed, please restore what you originally had before saving");
             }
          });
          document.getElementById("load-code-button").addEventListener("click", () => {
            clickedLoadButtonLast = true;
            clickedSaveButtonLast = false;
          });
        }
      }
    )
  );

  // save textual code

  citf.addTask(
    new CourseInstructionTask(
      // add event listener so this isn't confused with clicking on load button and then entering code (DONE)
      () => clickedSaveButtonLast,//document.getElementById("text-code-container").classList.contains("show-container"),
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_SAVE_TEXT_CODE, {
          startPosition: {
            x: document.getElementById("save-code-button").offsetLeft + document.getElementById("save-code-button").offsetWidth,
            y: document.getElementById("save-code-button").offsetTop + document.getElementById("save-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("save-code-button").offsetLeft + document.getElementById("save-code-button").offsetWidth/2,
            y: document.getElementById("save-code-button").offsetTop + document.getElementById("save-code-button").offsetHeight/2
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      //() => clipboardText.replace(/\n|\r/g, "") === document.getElementById("textCodeBox").value.replace(/\n|\r/g, ""),
      () => clipboardText && generatedTextCode 
        && clipboardText.replace(/\n|\r/g, "") === generatedTextCode.replace(/\n|\r/g, ""),
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_SAVE_TEXT_CODE, {
          startPosition: () => {
            return {
              x: document.getElementById("load-save-text-code").offsetLeft + document.getElementById("load-save-text-code").offsetWidth,
              y: document.getElementById("load-save-text-code").offsetTop + document.getElementById("load-save-text-code").offsetHeight
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            return {
              x: document.getElementById("load-save-text-code").offsetLeft + document.getElementById("load-save-text-code").offsetWidth/2,
              y: document.getElementById("load-save-text-code").offsetTop + document.getElementById("load-save-text-code").offsetHeight/2
            };
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("OK, now that you've copied the code, let's clear the workspace of the blocks and then load it (without reloading the page!) to confirm that everything works.  BE SURE NOT TO overwrite the clipboard until you load the code again or you'll lose your work!");
          // SHOULD CALL EVENT LISTENER INSTEAD FOR NEXT 2 LINES
          //document.getElementById("output-container").classList.remove("show-container");
          //document.getElementById("output-container").classList.add("hide-container");
          hideOutputAndCodeContainers();
          /*document.getElementById("load-save-text-code").addEventListener("click", () => {
            // may want to read clipboard instead to check for click
            clickedSaveTextCodeButton = true;
          })*/
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().length === 0,
      new ParallelAnimation([
        new HelpMessageDirection(() => "Move all blocks to the trashcan or rightmouse click (hold down finger on phone) on an empty place in the workspace and select Delete.", {
          startPosition: () => {
            //const coords = workspace.trashcan.getClientRect();
            return {
              x: 50, //(coords.left + coords.right)/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                //(coords.top + coords.bottom)/2 + 
                workspace.getMetrics().flyoutHeight + 
                100
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            const coords = workspace.trashcan.getClientRect();
            return {
              x: (coords.left + coords.right)/2, //+ d.offsetWidth/4,
              y: (coords.top + coords.bottom)/2
              /*
              y: document.getElementById("top-header").offsetHeight + 
                (coords.top + coords.bottom)/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
              */
            };
          }
        })
      ])
    )
  );

  // load textual code

  citf.addTask(
    new CourseInstructionTask(
      // add event listener so this isn't confused with clicking on load button and then entering code (DONE)
      () => clickedLoadButtonLast,//document.getElementById("text-code-container").classList.contains("show-container"),
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_LOAD_TEXT_CODE, {
          startPosition: {
            x: document.getElementById("load-code-button").offsetLeft + document.getElementById("load-code-button").offsetWidth,
            y: document.getElementById("load-code-button").offsetTop + document.getElementById("load-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("load-code-button").offsetLeft + document.getElementById("load-code-button").offsetWidth/2,
            y: document.getElementById("load-code-button").offsetTop + document.getElementById("load-code-button").offsetHeight/2
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      //() => clipboardText.replace(/\n|\r/g, "") === document.getElementById("textCodeBox").value.replace(/\n|\r/g, ""),
      () => generatedTextCode.replace(/\n|\r/g, "") === document.getElementById("textCodeBox").value.replace(/\n|\r/g, ""),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Paste the code you copied in this text box.", {
          startPosition: () => {
            return {
              x: document.getElementById("textCodeBox").offsetLeft + document.getElementById("textCodeBox").offsetWidth/2,
              y: document.getElementById("textCodeBox").offsetTop + document.getElementById("textCodeBox").offsetHeight
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            return {
              x: document.getElementById("textCodeBox").offsetLeft + document.getElementById("textCodeBox").offsetWidth/2,
              y: document.getElementById("textCodeBox").offsetTop + document.getElementById("textCodeBox").offsetHeight/2
            };
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().length === 9,
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_LOAD_TEXT_CODE, {
          startPosition: () => {
            return {
              x: document.getElementById("load-save-text-code").offsetLeft + document.getElementById("load-save-text-code").offsetWidth,
              y: document.getElementById("load-save-text-code").offsetTop + document.getElementById("load-save-text-code").offsetHeight
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            return {
              x: document.getElementById("load-save-text-code").offsetLeft + document.getElementById("load-save-text-code").offsetWidth/2,
              y: document.getElementById("load-save-text-code").offsetTop + document.getElementById("load-save-text-code").offsetHeight/2
            };
          }
        })
      ])
    )
  );

  // SAVE/LOAD XML

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("👍 Great! You can also save/load the information about the blocks (XML) from/to the second box.  This will lay out the blocks exactly as you had them in the workspace.  So let's try that now.");
          hideOutputAndCodeContainers();

          document.getElementById("load-save-xml").addEventListener("click", () => {
            // may want to read clipboard instead to check for click (DONE)
             // Avoid asking read clipboard permission; assume that button click after disk save button click meant text was copied
            if(clickedSaveButtonLast) {
              clipboardText = document.getElementById("xmlData").value;
            }
            /*
            navigator.clipboard.readText().then(clipText => {
              clipboardText = clipText;
            });
            */
            //clickedSaveTextCodeButton = true;
          });
        }
      }
    )
  );

  // save XML

  citf.addTask(
    new CourseInstructionTask(
      // add event listener so this isn't confused with clicking on load button and then entering code (DONE)
      () => clickedSaveButtonLast,//document.getElementById("text-code-container").classList.contains("show-container"),
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_SAVE_XML, {
          startPosition: {
            x: document.getElementById("save-code-button").offsetLeft + document.getElementById("save-code-button").offsetWidth,
            y: document.getElementById("save-code-button").offsetTop + document.getElementById("save-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("save-code-button").offsetLeft + document.getElementById("save-code-button").offsetWidth/2,
            y: document.getElementById("save-code-button").offsetTop + document.getElementById("save-code-button").offsetHeight/2
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      //() => clipboardText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
      () => clipboardText && generatedXMLCode 
        && clipboardText.replace(/\n|\r/g, "") === generatedXMLCode.replace(/\n|\r/g, ""),
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_SAVE_XML, {
          startPosition: () => {
            return {
              x: document.getElementById("load-save-xml").offsetLeft + document.getElementById("load-save-xml").offsetWidth,
              y: document.getElementById("load-save-xml").offsetTop + document.getElementById("load-save-xml").offsetHeight
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            return {
              x: document.getElementById("load-save-xml").offsetLeft + document.getElementById("load-save-xml").offsetWidth/2,
              y: document.getElementById("load-save-xml").offsetTop + document.getElementById("load-save-xml").offsetHeight/2
            };
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("OK, now that you've copied the XML for the blocks, let's clear the workspace of the blocks and then load it (without reloading the page!) to confirm that everything works.  BE SURE NOT TO overwrite the clipboard until you load the code again or you'll lose your work!");
          hideOutputAndCodeContainers();
          /*document.getElementById("load-save-text-code").addEventListener("click", () => {
            // may want to read clipboard instead to check for click
            clickedSaveTextCodeButton = true;
          })*/
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().length === 0,
      new ParallelAnimation([
        new HelpMessageDirection(() => "Move all blocks to the trashcan or rightmouse click (hold down finger on phone) on an empty place in the workspace and select Delete.", {
          startPosition: () => {
            //const coords = workspace.trashcan.getClientRect();
            return {
              x: 50, //(coords.left + coords.right)/2, //+ d.offsetWidth/4,
              y: document.getElementById("top-header").offsetHeight + 
                //(coords.top + coords.bottom)/2 + 
                workspace.getMetrics().flyoutHeight + 
                100
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            const coords = workspace.trashcan.getClientRect();
            return {
              x: (coords.left + coords.right)/2, //+ d.offsetWidth/4,
              y: (coords.top + coords.bottom)/2
              /*
              y: document.getElementById("top-header").offsetHeight + 
                (coords.top + coords.bottom)/2 + 
                Blockly.getMainWorkspace().getMetrics().flyoutHeight
              */
            };
          }
        })
      ])
    )
  );

  // load XML

  citf.addTask(
    new CourseInstructionTask(
      // add event listener so this isn't confused with clicking on load button and then entering code (DONE)
      () => clickedLoadButtonLast,//document.getElementById("text-code-container").classList.contains("show-container"),
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_LOAD_XML, {
          startPosition: {
            x: document.getElementById("load-code-button").offsetLeft + document.getElementById("load-code-button").offsetWidth,
            y: document.getElementById("load-code-button").offsetTop + document.getElementById("load-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("load-code-button").offsetLeft + document.getElementById("load-code-button").offsetWidth/2,
            y: document.getElementById("load-code-button").offsetTop + document.getElementById("load-code-button").offsetHeight/2
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      //() => clipboardText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
      () => generatedXMLCode.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
      new ParallelAnimation([
        new HelpMessageDirection(() => "Paste the XML you copied in this text box.", {
          startPosition: () => {
            return {
              x: document.getElementById("xmlData").offsetLeft + document.getElementById("xmlData").offsetWidth/2,
              y: document.getElementById("xmlData").offsetTop + document.getElementById("xmlData").offsetHeight
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            return {
              x: document.getElementById("xmlData").offsetLeft + document.getElementById("xmlData").offsetWidth/2,
              y: document.getElementById("xmlData").offsetTop + document.getElementById("xmlData").offsetHeight/2
            };
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().length === 9,
      new ParallelAnimation([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_LOAD_XML, {
          startPosition: () => {
            return {
              x: document.getElementById("load-save-xml").offsetLeft + document.getElementById("load-save-xml").offsetWidth,
              y: document.getElementById("load-save-xml").offsetTop + document.getElementById("load-save-xml").offsetHeight
            };
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: () => {
            return {
              x: document.getElementById("load-save-xml").offsetLeft + document.getElementById("load-save-xml").offsetWidth/2,
              y: document.getElementById("load-save-xml").offsetTop + document.getElementById("load-save-xml").offsetHeight/2
            }
          }
        })
      ])
    )
  );

  // CHANGE LANGUAGE - FINAL STEP

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("👍 Excellent! As the last part of this initial exercise, let's see how the blocks look in pure JavaScript.");
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => document.getElementById("language").value === "js",
      new ParallelAnimation([
        new HelpMessageDirection(() => "Select JavaScript and then see what happens to the toolbox and blocks.", {
          startPosition: {
            x: document.getElementById("language").offsetLeft + document.getElementById("language").offsetWidth,
            y: document.getElementById("language").offsetTop + document.getElementById("language").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("language").offsetLeft + document.getElementById("language").offsetWidth/2,
            y: document.getElementById("language").offsetTop + document.getElementById("language").offsetHeight/2
          }
        })
      ])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("✔✔✔ Congratulations!  You just completed Mission 0!  In your upcoming missions, you'll begin to solve problems without explicit instructions of how to use the blocks.");
          // SHOULD CALL EVENT LISTENER INSTEAD FOR NEXT 2 LINES
        }
      }
    )
  );

  return citf;
};