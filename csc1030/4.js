import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace, newBlock, setValueInput, setFieldValue} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js"; 

// JavaScript built-in substring method overriden for beginner intended use;
// this is used to get back some of the index out-of-bounds behavior;
// TODO: Preserve reference to built-in one and remove this function   
String.prototype.JSSubstring = function(startIndex, endIndex) {
  if(startIndex >= this.length || startIndex === endIndex) return "";
  else return this.substring(startIndex, endIndex);
}

function getAfterTerminal(inputted, terminal) {
  const langTerminals = Object.values(T2C.MSG)
    .map(langObj => langObj["TERMINAL_" + terminal.toUpperCase()])
    .filter(text => typeof text === "string");
  const val = langTerminals.find(text => 
    text.startsWith(inputted) || inputted.startsWith(text));
  if(val) {
    return {terminal: val, remaining: inputted.JSSubstring(val.length).trim()};
  }
  // return undefined otherwise
}

function genericTerminalErrorMsg(displayFunc, terminal) {
  displayFunc("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] + ".");
}

/**
 * attempts to match s against matchArr, producing appropriate errors
 * @param {string} s the string to parse
 * @param {!Array.<string|{token: string, type: string}>} matchArr 
 * @param {!Array.<Function>} errorFunctionArr - errorFunction[i] returns error message for 
 * matchArr[i]
 * @returns {match: Array.<string>, error: boolean, errorMsg: string} match is the array of matches up
 * up to the first unsuccessful match, if any; 
 * error is true exactly when there was an unsuccessful match;
 * errorMsg is the error message from errorFunction[i] where i is the first index of an 
 * unsuccessful match, if any or "" otherwise
 */

function matchStatement(s, matchArr, errorFunctionArr) {
  let matchResultArr = [];
  let remainingText = s;
  let processedMatch = "";
  let matchResult;
  let hasError = false;
  let i = -1;

  while(i < matchArr.length-1 && remainingText && !hasError) {
    ++i;
    if(typeof matchArr[i] === "string") {
      if(remainingText.length < matchArr[i].length && matchArr[i].startsWith(remainingText)) {
        matchResult = remainingText;
        remainingText = "";
      } else if(remainingText.startsWith(matchArr[i])) {
        matchResult = matchArr[i];
        remainingText = remainingText.substring(matchArr[i].length).trim();
      } else {
        hasError = true;
      }
    } else if(matchArr[i].type === "terminal") {
      const result = getAfterTerminal(remainingText.trim(), matchArr[i].token);
      if(result) {
        matchResult = result.terminal;
        remainingText = result.remaining;
      } else {
        hasError = true;
      }
    } else {
      // unknown type
      hasError = true;
    }

    if(!hasError) {
      matchResultArr.push(matchResult);
    }
  }

  // displayMessage("") should not be part of non-error
  return {match: matchResultArr, error: hasError,
    errorMsg: hasError ? errorFunctionArr[i](matchResultArr, remainingText) : 
    (displayMessage("") || "")};
}

Blockly.Python['type_in_all_but_first_specific_str'] = Blockly.JavaScript['type_in_all_but_first_specific_str'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_all_but_first_specific_str'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "display", type: "terminal"}, "(", "welcomeMsg", ".", {token: "GETTEXTFROMPOSITIONNUMBER", type: "terminal"}, 
       '(', '1', ")", ".", {token: "TOPOSITIONNUMBER", type: "terminal"}, "(", "15", ")", ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        () => displayMessage("Be sure to include the variable welcomeMsg that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable welcomeMsg you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[4] + "."),
        () => displayMessage("What position number should you start extracting from if you want to remove the initial character?  Change this to the correct number."),
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[4] + " after the starting position number."),
        () => displayMessage("Be sure to include the . after the closing parenthesis after the starting position number before the next part."),
        genericTerminalErrorMsg.bind(null, displayMessage, "TOPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[9] + "."),
        () => displayMessage("What position number should you stop extracting from (stops one place before) if you want to get the rest of the string?  Just use a *specific* number here.  We'll generalize this so it works for other strings next.  Change this to the correct number."),
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[9] + " after the ending position number."),
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[0] + ".")
      ]);

    return result.error ? result.match.join("") : exp;
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
      //if(this.getFieldValue("EXP").trim())
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
            displayMessage("Try checking what you entered again for mistakes.");
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

Blockly.Python['type_in_all_but_first_general_str'] = Blockly.JavaScript['type_in_all_but_first_general_str'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_all_but_first_general_str'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "display", type: "terminal"}, "(", "response", ".", {token: "GETTEXTFROMPOSITIONNUMBER", type: "terminal"}, 
       '(', '1', ")", ".", {token: "TOPOSITIONNUMBER", type: "terminal"}, "(", "response", ".", {token: "LENGTH", type: "terminal"}, ")", ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        () => displayMessage("Be sure to include the variable response that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable response you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[4] + "."),
        () => displayMessage("What position number should you start extracting from if you want to remove the initial character?  Change this to the correct number."),
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[4] + " after the starting position number."),
        () => displayMessage("Be sure to include the . after the closing parenthesis after the starting position number before the next part."),
        genericTerminalErrorMsg.bind(null, displayMessage, "TOPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[9] + "."),
        (matchResultArr, remaining) => {
          // variable response
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            //HINT: Remember what you used when you wanted to get the position of the last character?  How is 15, the number we used for aap kaise hain, related to this string?  What would we use for theek?
            displayMessage("Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          } else {
            displayMessage("Remember the expression you used when you wanted to get the position of the last character for " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "?  This is a little different because the ending position will be 1 past the position of the last character since we stop 1 place before.\nFor some examples of the numbers we'd want to use for some strings: ok: 2, theek: 5, bahut acchaa: 12");
          }
        },
        () => displayMessage("Be sure to include the . after the variable response you want to use."),
        (matchResultArr, remaining) => displayMessage("What property of response do you want to get to determine the ending position here?"),      
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for a response of theek, response.length - 1 would be 5 - 1 or 4, which means you'd extract the text ending with the second e at position 3 instead of the k at position 4.");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("For a response of theek, response.length + 1 would be 5 + 1 or 6, but there is no 5th character since positions start at 0.");
          }
          else {
            displayMessage("What you're doing to the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " seems incorrect.  Be sure to have examples in mind before deciding what to type.  For example, for theek, the length is 5 and you want to go up to position 5 (since you'd stop extracting at character 4).  If you're done, be sure to include a closing parenthesis for " + matchResultArr[9] + " after the ending position.");
            // You're missing a closing parenthesis for "  + matchResultArr[9] + " after the ending position number.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[0] + ".")
      ]);

    return result.error ? result.match.join("") : exp;
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
      //if(this.getFieldValue("EXP").trim())
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
            displayMessage("Try checking what you entered again for mistakes.");
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

function clearToolbox(workspace) {
  Array.from(document.getElementById("toolbox").children).forEach(x => x.remove());
  workspace.options.maxInstances = {};
  workspace.updateToolbox(document.getElementById("toolbox"));
}

function createToolboxBlock(workspace, blockType, prepend=true) {
  const block = createBlockWithType(blockType);
  if(prepend) {
    document.getElementById("toolbox").prepend(block);
  } else {
    document.getElementById("toolbox").append(block);
  }
  //if(update) 
  workspace.updateToolbox(document.getElementById("toolbox"));
  return block;
}

function createBlockWithType(blockType) {
  const block = document.createElement("block");
  block.setAttribute("type", blockType);
  return block;
}

function setToolboxBlockFieldValue(block, fieldName, fieldValue) {
  const field = document.createElement("field");
  field.setAttribute("name", fieldName);
  field.appendChild(document.createTextNode(fieldValue));
  block.appendChild(field);
}

function setToolboxBlockInputValue(block, inputName, inputValueBlock) {
  const inputVal = document.createElement("value");
  inputVal.setAttribute("name", inputName)
  inputVal.appendChild(inputValueBlock);
  block.appendChild(inputVal);
}

function removeToolboxBlock(workspace, type) {
    // FIX: THIS DOESN'T WORK : NO TYPE PROPERTY ON DOM BLOCKS;
    //     workspace.getToolbox() returns null for some reason
  console.log(workspace.getToolbox()); 
  const block = Array.from(document.getElementById("toolbox").children)
    .find(x => x.type === type);
  console.warn(Array.from(document.getElementById("toolbox").children))
  if(block) block.remove();
  workspace.updateToolbox(document.getElementById("toolbox"));
  return block;
}

function getAbsolutePosition(workspace, block, options, offsetX = 0, offsetY = 0) {
  const blockCoords = block && block.getBoundingRectangle() || {left: 0, top: 0};
  block = block || {width: 0, height: 0};
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

let clickedLoadButtonLast = false;
let clickedSaveButtonLast = false;
let clickedLoadXMLButtonLast = false;
let clickedSaveXMLButtonLast = false;
let xmlText;

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

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  // THIS MISSION IS IN DEVELOPMENT!  THE MESSAGE WILL BE REMOVED WHEN IT CAN BE COMPLETED.\n
  alert("In previous missions, you'd use " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " to get a *single* character at a given numerical position in a string.  In this mission, you'll be using a new block " + T2C.MSG.EN["TERMINAL_GETTEXTFROM"] + " to display all characters between given starting and ending numerical positions.");
  const workspace = ws || Blockly.getMainWorkspace();
  const initialBlocks = ["t2c_text_getsubstring", "text_print", "variables_get", "math_number", "text", "variables_set"];
  // set up level

  clearToolbox(workspace);
  initialBlocks.forEach((blockType, index) => {
    createToolboxBlock(workspace, blockType, false);
    workspace.options.maxInstances[blockType] = index === 3 ? 2 : 1;
  });
  workspace.clear();

  let textBlock = newBlock(workspace, "text");
  let variableSetBlock = newBlock(workspace, "variables_set");
  setFieldValue(textBlock, "aap kaise hain?", "TEXT");
  setValueInput(variableSetBlock, "VALUE", textBlock);
  setFieldValue(variableSetBlock, "welcomeMsg", "VAR");

  workspace.setScale(1);
  refreshWorkspace(workspace);

  const toolboxBlocks = Array.from(document.querySelectorAll("rect"))
    .filter(x => x.getAttribute("fill-opacity"));
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

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 9);
        const mathNumber1 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 4);
        const variablesGet2 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring3 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && block.getInputTargetBlock("STRING") === variablesGet2 && block.getInputTargetBlock("AT1") === mathNumber1 && block.getInputTargetBlock("AT2") === mathNumber0);
        const textPrint4 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring3);
        const text5 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint4 && block.getInputTargetBlock("VALUE") === text5 && block.getField("VAR").getText() === "welcomeMsg");
        return mathNumber0 && mathNumber1 && variablesGet2 && t2cTextGetsubstring3 && textPrint4 && text5 && variablesSet6;
      },
      new HelpMessageDirection(() => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number");
        const mathNumber1 = workspace.getAllBlocks().find(block => block.type === "math_number" && block !== mathNumber0);
        const variablesGet2 = workspace.getAllBlocks().find(block => block.type === "variables_get");
        const t2cTextGetsubstring3 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring");
        const textPrint4 = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print");
        const text5 = workspace.getAllBlocks().find(block => block.type === "text");
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set");
        
        if(t2cTextGetsubstring3 && (t2cTextGetsubstring3.getInputTargetBlock("AT1") === mathNumber0 || t2cTextGetsubstring3.getInputTargetBlock("AT1") === mathNumber1)) {
          const startIndex = t2cTextGetsubstring3.getInputTargetBlock("AT1").getFieldValue("NUM");
          if(startIndex === 5) {
            return "The given starting position is incorrect.  Remember that the initial character starts at position (index) 0 and unlike the given ending position to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ", the computer starts extracting text from the first position number you give it.";
          }
          if(startIndex === 3) {
            return "The given starting position is incorrect.  Remember that the initial character starts at position (index) 0 and that spaces are characters as well.";
          }
          if(startIndex === 9) {
            return "The given starting position is incorrect.  The first number given to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " is the starting position, not the ending one.";
          }
          if(startIndex !== 4) {
            return "Incorrect number for the starting position.  Please try recounting the characters from the beginning of the string, starting from 0 and include spaces in your count.";
          }
        }

        if(t2cTextGetsubstring3 && (t2cTextGetsubstring3.getInputTargetBlock("AT2") === mathNumber0 || t2cTextGetsubstring3.getInputTargetBlock("AT2") === mathNumber1)) {
          const endIndex = t2cTextGetsubstring3.getInputTargetBlock("AT2").getFieldValue("NUM");
          if(endIndex === 8) {
            return "The given ending position is incorrect.  Remember to count spaces and unlike the given starting position to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ", the computer stops extracting text *one place before* the second number you give it.";
          }
          if(endIndex === 4) {
            return "The given ending position is incorrect.  The second number given to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " is the ending position, not the starting one.";
          }
          if(endIndex !== 9) {
            return "Incorrect number for the ending position.  Please try recounting the characters from the beginning of the string, starting from 0 and include spaces in your count.";
          }
        }

        if(variablesSet6 && variablesSet6.getField("VAR").getText() !== "welcomeMsg") {
          return "Make sure you keep the variable name for the " + T2C.MSG.currentLanguage.TERMINAL_LET + "block as it was; it should be welcomeMsg.";
        }

        if(variablesSet6 && variablesSet6.getInputTargetBlock("VALUE") !== text5) {
          return "Keep the text block with the text aap kaise hain? inside the " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable block.  When using the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block, refer to the variable welcomeMsg.";
        }

        if(text5.getFieldValue("TEXT") !== "aap kaise hain?") {
          return "Make sure to leave the text aap kaise hain? for the text block.";
        }

        if(variablesGet2 && variablesGet2.getField("VAR").getText() !== "welcomeMsg") {
          return "Make sure you use the variable name welcomeMsg for the variable get block so that it refers to the value assigned to the variable.";
        }

        if(t2cTextGetsubstring3 && variablesGet2 && t2cTextGetsubstring3.getInputTargetBlock("STRING") !== variablesGet2) {
          return "Make sure to place the variable with the string's value inside the left space of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " so the computer knows which string to extract the substring from."
        }

        if(t2cTextGetsubstring3 && variablesGet2 && (t2cTextGetsubstring3.getInputTargetBlock("A") === variablesGet2 || t2cTextGetsubstring3.getInputTargetBlock("B") === variablesGet2)) {
          return "The variable which holds the text to get the string from should go inside the left space of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  The other spaces are for the *numbers* of the starting and ending positions from where to extract the text.";
        }

        if(textPrint4 && t2cTextGetsubstring3 && textPrint4.getInputTargetBlock("TEXT") !== t2cTextGetsubstring3) {
          return "You want to display the result of extracting text from welcomeMsg so you should use the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block inside of the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block."
        }

        if(textPrint4 && variablesSet6 && textPrint4.getNextBlock() === variablesSet6) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block should go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block so the computer knows what welcomeMsg is when attempting to extract text from it.  Remember that statements are run from top to bottom.";
        }

        if(textPrint4 && textPrint4.getNextBlock() !== null) {
          return "The next statement above the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block is incorrect.";
        }

        if(textPrint4 && variablesSet6 && variablesSet6.getNextBlock() !== textPrint4) {
          return "Place the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block below the " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable declaration block.";
        }

        return "Drag in and assemble the blocks from the toolbox to get the text kaise (without spaces) from aap kaise hain?  Do NOT change the existing ones.\nTo do this, use the new " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block, which takes a string, the position to start getting text from, and the position to stop at (NOTE: IT WILL STOP 1 BEFORE THE second number.)\nIn case you were curious, aap kaise hain? is the polite formal way to ask 'how are you?' in Hindi, literally, 'you (aap) how (kaise) are (hain)?'";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
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
          alert("👍 Nice!  So now let's try another example with the new block, but let's type it!  This time, you'll display everything except the string's initial character.  So we'll want to display ap kaise hain?");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // clearToolbox(workspace);
          createToolboxBlock(workspace, "type_in_all_but_first_specific_str");
          workspace.options.maxInstances["type_in_all_but_first_specific_str"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 15);
        const mathNumber1 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet2 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring3 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber1 && block.getInputTargetBlock("AT2") === mathNumber0);
        const textPrint4 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring3);
        const mathNumber5 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 9);
        const mathNumber6 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 4);
        // const variablesGet7 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber6 && block.getInputTargetBlock("AT2") === mathNumber5);
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === textPrint4 && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring8);
        const text10 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const variablesSet11 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint9 && block.getInputTargetBlock("VALUE") === text10 && block.getField("VAR").getText() === "welcomeMsg");
        return mathNumber0 && mathNumber1 && variablesGet2 && t2cTextGetsubstring3 && textPrint4 && mathNumber5 && mathNumber6 && t2cTextGetsubstring8 && textPrint9 && text10 && variablesSet11;
      },
      new HelpMessageDirection(() => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 15);
        const mathNumber1 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet2 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring3 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber1 && block.getInputTargetBlock("AT2") === mathNumber0);
        const textPrint4 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring3);
        const mathNumber5 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 9);
        const mathNumber6 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 4);
        // const variablesGet7 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber6 && block.getInputTargetBlock("AT2") === mathNumber5);
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring8);
        const text10 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const variablesSet11 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getInputTargetBlock("VALUE") === text10 && block.getField("VAR").getText() === "welcomeMsg");

        if(textPrint4 && variablesSet11 && textPrint4.getNextBlock() === variablesSet11) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block should go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block so the computer knows what welcomeMsg is when attempting to extract text from it.  Remember that statements are run from top to bottom.";
        }

        if(textPrint4 && textPrint9 && textPrint9.getNextBlock() !== textPrint4) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block that's used to display all characters beyond the initial one below the previous " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block used to display kaise.";
        }

        return "Drag in the type-in code block from the toolbox and type in the code necessary to display all the characters except the initial one from aap kaise hain?  As before, use " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + ", the variable welcomeMsg, and 2 specific numbers for the starting and ending positions.  We'll generalize this so it works for other strings next.  Place this new block below the previous " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + ".";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
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
          alert("👍 Good!  So of course this is not a very useful program as we could've just displayed two lines of text 'kaise' and 'ap kaise hain?' and the user would not know the difference.  So now let's show the usefulness of the new " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " by instead using the string literal 'aap kaise hain?' as our message to get input from the user instead.  Then our user can respond with something like theek (fine) or bahut acchaa (very good).");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // clearToolbox(workspace);
          createToolboxBlock(workspace, "text_input");
          workspace.options.maxInstances["text_input"] = 1;
          workspace.options.maxInstances["type_in_all_but_first_specific_str"] = 0;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 15);
        const mathNumber1 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet2 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "response");
        const t2cTextGetsubstring3 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber1 && block.getInputTargetBlock("AT2") === mathNumber0);
        const textPrint4 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring3);
        const mathNumber5 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 9);
        const mathNumber6 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 4);
        // const variablesGet7 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber6 && block.getInputTargetBlock("AT2") === mathNumber5);
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === textPrint4 && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring8);
        const text10 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const textInput11 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text10);
        const variablesSet12 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint9 && block.getInputTargetBlock("VALUE") === textInput11 && block.getField("VAR").getText() === "response");

        return mathNumber0 && mathNumber1 && variablesGet2.length === 2 && t2cTextGetsubstring3 && textPrint4 && mathNumber5 && mathNumber6 && t2cTextGetsubstring8 && textPrint9 && text10 && textInput11 && variablesSet12;
      },
      new HelpMessageDirection(() => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 15);
        const mathNumber1 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet2 = workspace.getAllBlocks().filter(block => block.type === "variables_get");
        const t2cTextGetsubstring3 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber1 && block.getInputTargetBlock("AT2") === mathNumber0);
        const textPrint4 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring3);
        const mathNumber5 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 9);
        const mathNumber6 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 4);
        // const variablesGet7 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "welcomeMsg");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet2.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber6 && block.getInputTargetBlock("AT2") === mathNumber5);
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === textPrint4 && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring8);
        const text10 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput11 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input"));
        const variablesSet12 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint9 && block.getInputTargetBlock("VALUE") === textInput11);

        if(variablesSet12) {
          const varName = variablesSet12.getField("VAR").getText();
          if(variablesGet2.find(block => block.getField("VAR").getText() !== varName)) {
            return "Be sure that the variable names all match so they all refer to the same text.";
          } else if(varName !== "welcomeMsg" && varName !== "response") {
            return "Be sure to name the variable response to reflect that it now holds the user response to the question aap kaise hain?  You can change a variable name by clicking its current name of " + varName + " and then selecting Rename variable...";
          }
        }
        if(textInput11) {
          if(textInput11.getParent() !== variablesSet12) {
            return "Be sure to place the " + T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING + " block inside the " + T2C.MSG.currentLanguage.TERMINAL_LET + " one so the variable stores the response from the user."
          }
          if(text10) {
            if(text10.getFieldValue("TEXT") !== "aap kaise hain?") {
              return "The message of aap kaise hain? should stay the same so change it back to that.  The only difference here is that it becomes the prompt to the user rather than the text we'll be extracting a substring from, which instead will be the user's response.";
            }
            if(text10.getParent() !== textInput11) {
              return "Place the text block with the message aap kaise hain? inside the " + T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING + " one so that the user is prompted with this question.";
            }
          }
        }

        return "Drag in the " + T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING + " block from the toolbox and make aap kaise hain? its prompt.  Then change the variable name from welcomeMsg to response to reflect the fact that the variable will now hold the user's reply to the question aap kaise hain? instead of the question itself.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
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
          alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // clearToolbox(workspace);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
     () => {
        const text0 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const textInput1 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text0);
        const variablesSet2 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === textInput1 && block.getField("VAR").getText() === "response");
        return text0 && textInput1 && variablesSet2;
      },
      new HelpMessageDirection(() => {
        return "First, delete the two " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " blocks and all the ones that appear inside them so all that's left is the initial " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable statement assigned to the user's response.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50),
        finish: () => {
          const displayBlock = createBlockWithType("text_print");
          const substringBlock = createBlockWithType("t2c_text_getsubstring");
          const varGetBlock = createBlockWithType("variables_get");
          const mathNumStartBlock = createBlockWithType("math_number");
          const mathNumEndBlock = createBlockWithType("math_number");

          setToolboxBlockFieldValue(varGetBlock, "VAR", "response");
          setToolboxBlockFieldValue(mathNumStartBlock, "NUM", 1);
          setToolboxBlockFieldValue(mathNumEndBlock, "NUM", 15);
          setToolboxBlockInputValue(displayBlock, "TEXT", substringBlock);
          setToolboxBlockInputValue(substringBlock, "STRING", varGetBlock);
          setToolboxBlockInputValue(substringBlock, "AT1", mathNumStartBlock);
          setToolboxBlockInputValue(substringBlock, "AT2", mathNumEndBlock);

          workspace.options.maxInstances["text_print"] = 0;
          workspace.options.maxInstances["text"] = 0;
          workspace.options.maxInstances["variables_get"] = 0;
          workspace.options.maxInstances["math_number"] = 0;
          workspace.options.maxInstances["t2c_text_getsubstring"] = 0;
          document.getElementById("toolbox").prepend(displayBlock);
          createToolboxBlock(workspace, "type_in_all_but_first_general_str");
          workspace.options.maxInstances["type_in_all_but_first_general_str"] = 1;
        }
      })
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "response");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "response");
        const t2cTextGetsubstring4 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber2 && block.getInputTargetBlock("AT2") === t2cTextLength1);
        const textPrint5 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring4);
        const text6 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const textInput7 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text6);
        const variablesSet8 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint5 && block.getInputTargetBlock("VALUE") === textInput7 && block.getField("VAR").getText() === "response");
        return variablesGet0.length === 2 && t2cTextLength1 && mathNumber2 && t2cTextGetsubstring4 && textPrint5 && text6 && textInput7 && variablesSet8;
      },
      new HelpMessageDirection(() => {
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "response");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "response");
        const t2cTextGetsubstring4 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber2 && block.getInputTargetBlock("AT2") === t2cTextLength1);
        const textPrint5 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring4);
        const text6 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "aap kaise hain?");
        const textInput7 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text6);
        const variablesSet8 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getInputTargetBlock("VALUE") === textInput7 && block.getField("VAR").getText() === "response");

        if(textPrint5 && variablesSet8 && textPrint5.getNextBlock() === variablesSet8) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block should go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block so the computer knows what response is when attempting to extract text from it.  Remember that statements are run from top to bottom.";
        }

        if(textPrint5 && textPrint5.getPreviousBlock() !== variablesSet8) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block that's used to display all characters beyond the initial one below the previous " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block.";
        }

        return "Drag in the type-in code block from the toolbox and type in the code necessary to display all the characters except the initial one from the user response.  As before, use " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " and the variable response in your answer.  But this time, make it work for any entered string, which means you can no longer enter a specific number for the position to end before.\nHINT: Remember what you used when you wanted to get the position of the last character?  How is 15, the number we used for aap kaise hain?, related to this string?  What would we use for theek?\nPlace this new block below the previous " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + ".";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
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
          alert("✔✔👍 You got it, excellent problem solving as always!  And with that mastery, mission 4 is now complete!  In the next mission, we'll introduce a new block that'll be used to find the position numbers of the first occurrence of a given substring in another one.  We'll then use it in combination with the " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " from this lesson to get the text appearing between the first @ and . in an e-mail address (e.g., google from coolcoder@google.com or mail from expertsoftwareengineer@mail.co.uk).");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  return citf;
}