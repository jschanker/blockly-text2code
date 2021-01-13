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
      alert("Be sure to include the variable s you're declaring that will store the string with an even number of characters the user enters.");
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
	const block = document.createElement("block");
    block.setAttribute("type", blockType);
    if(prepend) {
    	document.getElementById("toolbox").prepend(block);
    } else {
    	document.getElementById("toolbox").append(block);
    }
    //if(update) 
    workspace.updateToolbox(document.getElementById("toolbox"));
    return block;
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
      	return "OK, you know the drill; let's start by asking the user for a string and storing it in a variable.  This time, we'll be asking the user for a string with an even number of characters (> 0) so make sure even (surrounded by spaces) appears in your message.  Let's store the user's string in a variable s.  But this time, we'll make it more interesting: you'll drag in the block and type in the code!  Do you remember what you'll be typing, i.e., what appeared on the blocks, from previous exercises?  If not, look back, or start typing it in and we'll give you hints if you make a mistake.";
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
          alert("✔ Good, so next, as a review, let's create a variable to store the initial character of the string the user enters.  As before, we'll make it more interesting by having you type in the code.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          /*createToolboxBlock(workspace, "text_print");
          createToolboxBlock(workspace, "variables_get");
          workspace.options.maxInstances["text_print"] = 1;
          workspace.options.maxInstances["variables_get"] = 1;*/
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.runTasks();
});