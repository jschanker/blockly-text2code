import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import SeriesAnimations from "../core/series_animations.js";
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

Blockly.Python['type_in_get_input'] = Blockly.JavaScript['type_in_get_input'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_input'] = {
  validate: (exp) => {
    // TODO: Clean up code; validation logic should be part of parser

    // should be let s = getInputByAsking("Enter string with even number of characters")

    // check for let
    let match = getAfterTerminal(exp.trim(), "let");
    let processedMatch;
    let matchAfterEqual;

    if(!match) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_LET"] + ".");
      return null;      
    }

    // check for variable name s
    if(match.remaining.length && !match.remaining.startsWith("s")) {
      alert("Be sure to name the variable you're declaring s.  This will store the string with an even number of characters the user enters.");
      return match.terminal;
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    // check for = sign
    if(match.remaining.length && !match.remaining.startsWith("=")) {
      alert("Remember to include an = after the variable s you're declaring to set it to the string the user enters.");
      return match.terminal + "s";
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    if(!match.remaining.length) {
      return exp;
    }

    processedMatch = match.terminal + "s = ";

    // check for getInputByAsking
    matchAfterEqual = getAfterTerminal(match.remaining.trim(), "GETINPUTBYASKING");

    if(!matchAfterEqual) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_GETINPUTBYASKING"] + ".");
      return processedMatch;
    }

    // check for opening parenthesis
    if(matchAfterEqual.remaining.length && !matchAfterEqual.remaining.startsWith("(")) {
      alert("You're missing an opening parenthesis after " + matchAfterEqual.terminal);
      return processedMatch + matchAfterEqual.terminal;
    }

    matchAfterEqual.remaining = matchAfterEqual.remaining.JSSubstring(1).trim();

    // check for open quotes
    if(matchAfterEqual.remaining.length && !matchAfterEqual.remaining.startsWith('"') && !matchAfterEqual.remaining.startsWith("'")) {
      alert("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.")
      return processedMatch + matchAfterEqual.terminal + "(";
    }

    // check for message and closing quotes
    let matchLiteral, msgWithQuotes;
    if(matchAfterEqual.remaining.length && (matchLiteral = matchAfterEqual.remaining.match(/^"[^"]*"|^'[^']*'/))) {
      msgWithQuotes = matchLiteral[0];
      if(msgWithQuotes.toLowerCase().indexOf(" even ") === -1 && msgWithQuotes.indexOf(" ") === -1) {
        alert("Make sure the message contains the word even to tell the user you want him/her to enter an even number of characters (> 0).  And be sure it has spaces since you can and should include them in messages read by humans!");
        return processedMatch + matchAfterEqual.terminal + "(" + msgWithQuotes.substring(0, msgWithQuotes.length-1);
      }
      else if(msgWithQuotes.toLowerCase().indexOf(" even ") === -1) {
        alert("Make sure the message contains the word even to tell the user you want him/her to enter an even number of characters (> 0).");
        return processedMatch + matchAfterEqual.terminal + "(" + msgWithQuotes.substring(0, msgWithQuotes.length-1);
      }
    }

    if(matchAfterEqual.remaining.length && msgWithQuotes) matchAfterEqual.remaining = matchAfterEqual.remaining.JSSubstring(msgWithQuotes.length).trim();

    // check for closing parenthesis
    if(matchAfterEqual.remaining.length && msgWithQuotes && !matchAfterEqual.remaining.startsWith(")")) {
      alert("You're missing a closing parenthesis for " + matchAfterEqual.terminal);
      return processedMatch + matchAfterEqual.terminal + "(" + msgWithQuotes;
    }

    if(matchAfterEqual.remaining.length && msgWithQuotes) matchAfterEqual.remaining = matchAfterEqual.remaining.JSSubstring(1).trim();

    return exp;
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
            alert("Try checking what you entered again for mistakes.  You probably just have extra unnecessary code after a ).");
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

Blockly.Python['type_in_set_to_char_number_0'] = Blockly.JavaScript['type_in_set_to_char_number_0'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_to_char_number_0'] = {
  validate: (exp) => {
    // TODO: Clean up code; validation logic should be part of parser

    // should be let firstChar = s.getCharacterNUMBER(0);

    // check for let
    let match = getAfterTerminal(exp.trim(), "let");
    let processedMatch;
    let matchAfterEqual;
    let matchAfterPeriod;

    if(!match) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_LET"] + ".");
      return null;      
    }

    // check for variable name firstChar
    if(match.remaining.length && !(match.remaining.startsWith("firstChar") || "firstChar".startsWith(match.remaining))) {
      alert("Be sure to name the variable you're declaring firstChar to representing the fact that it's storing the entered string's first character.");
      return match.terminal;
    }

    match.remaining = match.remaining.JSSubstring("firstChar".length).trim();

    // check for = sign
    if(match.remaining.length && !match.remaining.startsWith("=")) {
      alert("Remember to include an = after the variable firstChar you're declaring to set it to the string's first character.");
      return match.terminal + "firstChar";
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    if(!match.remaining.length) {
      return exp;
    }

    processedMatch = match.terminal + "firstChar = ";

    // check for variable s
    if(match.remaining.length && !match.remaining.startsWith("s")) {
      if(match.remaining.startsWith('"')) {
        alert("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
      } else if(match.remaining.startsWith('f')) {
        alert("This is the string you want to get the initial character from so you'll want to use s, which stores what the user entered.")
      } else {
        alert("Be sure to include the variable s that you want to the get the value's first character from.");
      }
      return processedMatch;
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    // check for .
    if(match.remaining.length && !match.remaining.startsWith(".")) {
      alert("Be sure to include the . after the variable")
      return processedMatch + "s";
    }

    if(!match.remaining.length) {
      return exp;
    }

    processedMatch += "s.";

    // check for getCharacterNUMBER
    matchAfterPeriod = getAfterTerminal(match.remaining.JSSubstring(1).trim(), "GETCHARACTERNUMBER");

    if(!matchAfterPeriod) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"]);
      return processedMatch;
    }

    // check for opening parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("(")) {
      alert("You're missing an opening parenthesis after " + matchAfterPeriod.terminal);
      return processedMatch + matchAfterPeriod.terminal;
    }

    matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

    // check for correct position number
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("0")) {
      if(matchAfterPeriod.remaining.startsWith('"')) {
        alert("Don't use \" here as you want the computer to interpret this as a number and not text.");
      } else if(matchAfterPeriod.remaining.startsWith("1")) {
        alert("Remember that character positions start at the number 0.");
      } else if(parseInt(matchAfterPeriod.remaining)) {
        alert("The number you're entering is incorrect for getting the initial character.")
      }
      else {
        alert("Include a number for the position you want after " + matchAfterPeriod.terminal + "(");
      }
      return processedMatch + matchAfterPeriod.terminal + "(";
    }

    matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

    // check for first closing parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith(")")) {
      alert("You're missing a closing parenthesis for " + matchAfterPeriod.terminal);
      return processedMatch + matchAfterPeriod.terminal + "(0";
    }

    return exp;
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

Blockly.Python['type_in_set_to_last_char'] = Blockly.JavaScript['type_in_set_to_last_char'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_to_last_char'] = {
  validate: (exp) => {
    // TODO: Clean up code; validation logic should be part of parser

    // should be let lastChar = s.getCharacterNUMBER(s.length-1);

    // check for let
    let match = getAfterTerminal(exp.trim(), "let");
    let processedMatch;
    let matchAfterEqual;
    let matchAfterPeriod;

    if(!match) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_LET"] + ".");
      return null;      
    }

    // check for variable name lastChar
    if(match.remaining.length && !(match.remaining.startsWith("lastChar") || "lastChar".startsWith(match.remaining))) {
      alert("Be sure to name the variable you're declaring lastChar to representing the fact that it's storing the entered string's last character.");
      return match.terminal;
    }

    match.remaining = match.remaining.JSSubstring("lastChar".length).trim();

    // check for = sign
    if(match.remaining.length && !match.remaining.startsWith("=")) {
      alert("Remember to include an = after the variable lastChar you're declaring to set it to the string's last character.");
      return match.terminal + "lastChar";
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    if(!match.remaining.length) {
      return exp;
    }

    processedMatch = match.terminal + "lastChar = ";

    // check for variable s
    if(match.remaining.length && !match.remaining.startsWith("s")) {
      if(match.remaining.startsWith('"')) {
        alert("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
      } else if(match.remaining.startsWith('f')) {
        alert("This is the string you want to get the last character from so you'll want to use s, which stores what the user entered.")
      } else {
        alert("Be sure to include the variable s that you want to the get the value's last character from.");
      }
      return processedMatch;
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    // check for .
    if(match.remaining.length && !match.remaining.startsWith(".")) {
      alert("Be sure to include the . after the variable")
      return processedMatch + "s";
    }

    if(!match.remaining.length) {
      return exp;
    }

    processedMatch += "s.";

    // check for getCharacterNUMBER
    matchAfterPeriod = getAfterTerminal(match.remaining.JSSubstring(1).trim(), "GETCHARACTERNUMBER");

    if(!matchAfterPeriod) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"]);
      return processedMatch;
    }

    // check for opening parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("(")) {
      alert("You're missing an opening parenthesis after " + matchAfterPeriod.terminal);
      return processedMatch + matchAfterPeriod.terminal;
    }

    matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

/===============   FILL IN TO CHECK s.length-1 here ===============/

    // check for correct position number
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("0")) {
      if(matchAfterPeriod.remaining.startsWith('"')) {
        alert("Don't use \" here as you want the computer to interpret this as a number and not text.");
      } else if(matchAfterPeriod.remaining.startsWith("1")) {
        alert("Remember that character positions start at the number 0.");
      } else if(parseInt(matchAfterPeriod.remaining)) {
        alert("The number you're entering is incorrect for getting the initial character.")
      }
      else {
        alert("Include a number for the position you want after " + matchAfterPeriod.terminal + "(");
      }
      return processedMatch + matchAfterPeriod.terminal + "(";
    }

    matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

    // check for first closing parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith(")")) {
      alert("You're missing a closing parenthesis for " + matchAfterPeriod.terminal);
      return processedMatch + matchAfterPeriod.terminal + "(0";
    }

    return exp;
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

window.addEventListener('DOMContentLoaded', () => {
  alert("In this mission, you'll be prompting the user for a string with an even number of characters (at least 2) and then displaying a single 4-character string as first character, last character, first middle character, and second middle character in that order.  For example, for SCRABBLE, you'd display SEAB.");
  const workspace = Blockly.getMainWorkspace();
  const initialBlocks = ["type_in_get_input"];
  // set up level
  clearToolbox(workspace);
  initialBlocks.forEach(blockType => {
  	createToolboxBlock(workspace, blockType, false);
  	//workspace.options.maxInstances = ;
  	workspace.options.maxInstances[blockType] = 1;
  });
  workspace.clear();

/*
  const varBlock = document.createElement("block");
  const varVal = document.createElement("value");
  const inputVal = document.createElement("value");
  const textInputBlock = document.createElement("block");
  const textBlock = document.createElement("block");
  const textField = document.createElement("field");

  textField.setAttribute("name", "TEXT");
  textBlock.setAttribute("type", "text");
  textInputBlock.setAttribute("type", "text_input");
  varBlock.setAttribute("type", "variables_set");
  varVal.setAttribute("name", "VALUE");
  inputVal.setAttribute("name", "TEXT");

  textField.appendChild(document.createTextNode("message to user"));
  textBlock.appendChild(textField)
  textInputBlock.appendChild(inputVal);
  varVal.appendChild(textInputBlock);
  inputVal.appendChild(textBlock);
  varBlock.appendChild(varVal);
*/
  const varBlock = createBlockWithType("variables_set");
  const textInputBlock = createBlockWithType("text_input");
  const textBlock = createBlockWithType("text");

  setToolboxBlockFieldValue(textBlock, "TEXT", "message to user");
  setToolboxBlockInputValue(textInputBlock, "TEXT", textBlock);
  setToolboxBlockInputValue(varBlock, "VALUE", textInputBlock);

  workspace.options.maxInstances["variables_set"] = 0;
  document.getElementById("toolbox").append(varBlock);
  workspace.updateToolbox(document.getElementById("toolbox"));

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
        new SeriesAnimations([
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

  const citf = new CourseInstructionTaskFlow();
  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT").toLowerCase().indexOf(" even ") !== -1);
        const textInput1 = workspace.getAllBlocks().find(block => block.type === "text_input" && block.getInputTargetBlock("TEXT") === text0);
        const variablesSet2 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === textInput1 && block.getField("VAR").getText() === "s");
      	return text0 && textInput1 && variablesSet2;
      },
      new HelpMessageDirection(() => {
      	return "OK, you know the drill; let's start by asking the user for a string and storing it in a variable.  This time, we'll be asking the user for a string with an even number of characters (> 0) so make sure even (surrounded by spaces) appears in your message.  Let's store the user's string in a variable s.  But this time, we'll make it more interesting: you'll drag in the block and type in the code!  Do you remember what you'll be typing, i.e., what appeared on the blocks, from previous exercises?  If not, use the blocks above as reference, and start typing it in accordingly.  Don't worry, we'll give you hints if you make a mistake.";
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
          alert("✔ Good, so let's start by creating a variable named firstCharacter to store the initial character of the string the user enters.  As before, we'll make it more interesting by typing in the code.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          const varSetBlock = createBlockWithType("variables_set");
          const varGetBlock = createBlockWithType("variables_get");
          const getCharacterNumberBlock = createBlockWithType("t2c_text_charat");
          const numBlock = createBlockWithType("math_number");

          setToolboxBlockFieldValue(numBlock, "NUM", 0);
          setToolboxBlockFieldValue(varGetBlock, "VAR", "textVariable"); 
          setToolboxBlockInputValue(getCharacterNumberBlock, "VALUE", varGetBlock);
          setToolboxBlockInputValue(getCharacterNumberBlock, "AT", numBlock);
          setToolboxBlockInputValue(varSetBlock, "VALUE", getCharacterNumberBlock);
          /*createToolboxBlock(workspace, "text_print");
          createToolboxBlock(workspace, "variables_get");
          workspace.options.maxInstances["text_print"] = 1;
          workspace.options.maxInstances["variables_get"] = 1;*/
          createToolboxBlock(workspace, "type_in_set_to_char_number_0");
          workspace.options.maxInstances["variables_set"] = 0;
          workspace.options.maxInstances["type_in_set_to_char_number_0"] = 1;
          document.getElementById("toolbox").append(varSetBlock);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat2 = workspace.getAllBlocks().find(block => block.type === "t2c_text_charat" && block.getInputTargetBlock("VALUE") === variablesGet1 && block.getInputTargetBlock("AT") === mathNumber0);
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat2 && block.getField("VAR").getText() === "firstChar");
        const text4 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT").toLowerCase().indexOf(" even ") !== -1);
        const textInput5 = workspace.getAllBlocks().find(block => block.type === "text_input" && block.getInputTargetBlock("TEXT") === text4);
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet3 && block.getInputTargetBlock("VALUE") === textInput5 && block.getField("VAR").getText() === "s");
        return mathNumber0 && variablesGet1 && t2cTextCharat2 && variablesSet3 && text4 && textInput5 && variablesSet6;
      },
      new HelpMessageDirection(() => {
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat2 && block.getField("VAR").getText() === "firstChar");
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet3 && block.getInputTargetBlock("VALUE") === textInput5 && block.getField("VAR").getText() === "s");        

        if(variablesSet3 && variablesSet6 && variablesSet6.getPreviousBlock() === variablesSet3) {
          return "Make sure to attach the block storing the entered string's first character below the one storing the string itself.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what s is when trying get the string!";
        }

        if(variablesSet3 && variablesSet6 && variablesSet3.getPreviousBlock() !== variablesSet6) {
          return "Make sure to attach the block storing the entered string's first character below the one storing the string itself.";
        }

        return "Drag in the type-in-code block and enter the code needed to get and store the initial character of the entered string in the variable firstChar.  Be sure to attach this statement below the one declaring the variable to store the user's entered string.";
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
          alert("✔ Good, so now we'll define a variable named lastCharacter to store the last character of the string the user enters.  As before, you'll be typing in the code and as in the previous mission, remember that you don't know how many characters the string has so you'll be using " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " in your answer.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          const varSetBlock = createBlockWithType("variables_set");
          const varGetBlock = createBlockWithType("variables_get");
          const varGetBlockLen = createBlockWithType("variables_get");
          const getCharacterNumberBlock = createBlockWithType("t2c_text_charat");
          const numBlock = createBlockWithType("math_number");
          const arithmeticBlock = createBlockWithType("math_arithmetic_basic");
          const lengthBlock = createBlockWithType("t2c_text_length");

          setToolboxBlockFieldValue(numBlock, "NUM", 1);
          setToolboxBlockFieldValue(varGetBlock, "VAR", "textVariable");
          setToolboxBlockFieldValue(varGetLenBlock, "VAR", "textVariable"); 
          setToolboxBlockInputValue(getCharacterNumberBlock, "VALUE", varGetBlock);
          setToolboxBlockInputValue(getCharacterNumberBlock, "AT", arithmeticBlock);
          setToolboxBlockInputValue(arithmeticBlock, "A", lengthBlock);
          setToolboxBlockInputValue(lengthBlock, "VALUE", varGetBlockLen);
          setToolboxBlockInputValue(arithmeticBlock, "B", numBlock);
          setToolboxBlockFieldValue(arithmeticBlock, "OP", "MINUS"); 
          setToolboxBlockInputValue(varSetBlock, "VALUE", getCharacterNumberBlock);
          /*createToolboxBlock(workspace, "text_print");
          createToolboxBlock(workspace, "variables_get");
          workspace.options.maxInstances["text_print"] = 1;
          workspace.options.maxInstances["variables_get"] = 1;*/
          createToolboxBlock(workspace, "type_in_set_to_last_char");
          workspace.options.maxInstances["variables_set"] = 0;
          workspace.options.maxInstances["type_in_set_to_last_char"] = 1;
          document.getElementById("toolbox").append(varSetBlock);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextLength2 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") === variablesGet1);
        const mathArithmeticBasic3 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") === t2cTextLength2 && block.getInputTargetBlock("B") === mathNumber0 && block.getFieldValue("OP") === "MINUS");
        const variablesGet4 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat5 = workspace.getAllBlocks().find(block => block.type === "t2c_text_charat" && block.getInputTargetBlock("VALUE") === variablesGet4 && block.getInputTargetBlock("AT") === mathArithmeticBasic3);
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat5 && block.getField("VAR").getText() === "lastChar");
        const mathNumber7 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === "1");
        const variablesGet8 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat9 = workspace.getAllBlocks().find(block => block.type === "t2c_text_charat" && block.getInputTargetBlock("VALUE") === variablesGet8 && block.getInputTargetBlock("AT") === mathNumber7);
        const variablesSet10 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet6 && block.getInputTargetBlock("VALUE") === t2cTextCharat9 && block.getField("VAR").getText() === "firstChar");
        const text11 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput12 = workspace.getAllBlocks().find(block => block.type === "text_input" && block.getInputTargetBlock("TEXT") === text11);
        const variablesSet13 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet10 && block.getInputTargetBlock("VALUE") === textInput12 && block.getField("VAR").getText() === "s");
        return mathNumber0 && variablesGet1 && t2cTextLength2 && mathArithmeticBasic3 && variablesGet4 && t2cTextCharat5 && variablesSet6 && mathNumber7 && variablesGet8 && t2cTextCharat9 && variablesSet10 && text11 && textInput12 && variablesSet13;
      },
      new HelpMessageDirection(() => {
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "lastChar");
        const variablesSet10 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstChar");
        const variablesSet13 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "s");

        if(variablesSet13 && variablesSet6 && variablesSet13.getPreviousBlock() === variablesSet6) {
          return "Make sure to attach the block storing the entered string's first character below the one storing the string itself.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what s is when trying get the string!";
        }

        if(variablesSet10 && variablesSet6 && variablesSet6.getPreviousBlock() !== variablesSet10) {
          return "Make sure to attach the block storing the entered string's last character below the one storing the string's first one.  Although it won't matter which we store first, we'll do it this way for the purposes of this exercise.";
        }

        return "Drag in the type-in-code block and enter the code needed to get and store the last character of the entered string in the variable lastChar.  Be sure to attach this statement below the one declaring the variable to store the entered string's first character.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  citf.runTasks();
});