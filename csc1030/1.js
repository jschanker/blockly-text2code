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

Blockly.Python['type_in_get_last_char_number'] = Blockly.JavaScript['type_in_get_last_char_number'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_last_char_number'] = {
  validate: (exp) => {
  	// TODO: Clean up code; validation logic should be part of parser

  	// should be display(s.getCharacterNUMBER(4))

  	// check for display
  	let match = getAfterTerminal(exp.trim(), "display");
  	let processedMatch;
  	let matchAfterPeriod;

  	if(!match) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"]);
      return null;  		
  	}

  	// check for opening parenthesis
  	if(match.remaining.length && !match.remaining.startsWith("(")) {
  		alert("You're missing an opening parenthesis after " + match.terminal);
      return match.terminal;
  	}

  	match.remaining = match.remaining.JSSubstring(1).trim();

  	// check for variable s
    if(match.remaining.length && !match.remaining.startsWith("s")) {
    	if(match.remaining.startsWith('"')) {
    		alert("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
    	} else {
  		  alert("Be sure to include the variable s that you want to the get the value's last character from");
  		}
      return match.terminal + "(";
  	}

  	match.remaining = match.remaining.JSSubstring(1).trim();

  	// check for .
  	if(match.remaining.length && !match.remaining.startsWith(".")) {
    	alert("Be sure to include the . after the variable")
      return match.terminal + "(s";
  	}

  	if(!match.remaining.length) {
  		return exp;
  	}

    processedMatch = match.terminal + "(s.";

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
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("4")) {
    	if(matchAfterPeriod.remaining.startsWith('"')) {
    		alert("Don't use \" here as you want the computer to interpret this as a number and not text.");
    	} else if(matchAfterPeriod.remaining.startsWith("5")) {
    		alert("Remember that character positions start at the number 0.  If you count the letters of a 5-letter word such as `pizza` starting from 0, you won't get up to position 5.")
    	} else if(matchAfterPeriod.remaining.startsWith("6")) {
    		alert("Determine the position of the last character a in the 5-letter word `pizza`.  If you count starting from 0, you won't get up to position 6.")
    	} else if(parseInt(matchAfterPeriod.remaining) === 0) {
    		alert("You want the position of the last character, not the first.");
    	} else if(parseInt(matchAfterPeriod.remaining)) {
    		alert("Determine the position of the last character a in the 5-letter word `pizza`.  The number you're entering is incorrect.")
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
      return processedMatch + matchAfterPeriod.terminal + "(4";
  	}

  	matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

    // check for second closing parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith(")")) {
  		alert("You're missing a closing parenthesis for " + match.terminal);
      return processedMatch + matchAfterPeriod.terminal + "(4)";
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
  const initialBlocks = ["variables_set", "text", "text_input"];
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
      	const variableBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
      	const promptBlock = workspace.getAllBlocks().find(x => x.type === "text_input");
      	const textBlock = workspace.getAllBlocks().find(x => x.type === "text");
      	return variableBlock && promptBlock && textBlock &&
      	  variableBlock.getField("VAR").getText() === "s" && 
      	  variableBlock.getInputTargetBlock("VALUE") === promptBlock &&
      	  promptBlock.getInputTargetBlock("TEXT") === textBlock && 
          textBlock.getFieldValue("TEXT").includes("5") && textBlock.getFieldValue("TEXT").includes("letter");
      },
      new HelpMessageDirection(() => {
      	const variableBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
      	const promptBlock = workspace.getAllBlocks().find(x => x.type === "text_input");
      	const textBlock = workspace.getAllBlocks().find(x => x.type === "text");
      	if(variableBlock) {
      		const varName = variableBlock.getField("VAR").getText();
      		if(varName === "item") {
      			// Default value
      			return "You can change the variable name by clicking item and then selecting Rename variable...";
      		} else if(varName.includes("5") || varName.includes("letter")) {
      			return "The variable name, which stores the value the user enters, should be s, not " + varName + ".  The message you want to display to the user should be in the \"\" block";
      		} else if(varName !== "s") {
      			return "The variable name, which stores the value the user enters, should be s, not " + varName + ".";
      		}
      	}
      	if(textBlock) {
      		const displayText = textBlock.getFieldValue("TEXT");
      		if(displayText === "") {
      			// Default value
      			return "You can change the text by clicking the blank field and then typing the desired message.";
      		} else if(displayText === "s") {
      			return "The text which is displayed to the user should contain 5 and letters; the variable name s should appear in the let block.";
      		} else if(!displayText.includes("5") || !displayText.includes("letter")) {
      			return "Make sure the text which is displayed to the user contains 5 and letters so the user knows to enter a 5 letter word.";
      		}	
      	}
      	if(variableBlock && textBlock && variableBlock.getInputTargetBlock("VALUE") === textBlock) {
      		return "The variable should store what the user enters, which means you'll need to attach it to a getInputByAsking block.";
      	}
      	return "Drag in and assemble code blocks to ask the user for a 5-letter word, and store the input in a variable.  \nName the variable s AND\nbe sure that the message includes 5 and letters in it so the user knows to enter 5 letters."
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
          alert("✔ Good, but notice there's no output yet.  That's because all we did is store what the user entered.  So now let's add code blocks to display it!");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          createToolboxBlock(workspace, "text_print");
          createToolboxBlock(workspace, "variables_get");
          workspace.options.maxInstances["text_print"] = 1;
          workspace.options.maxInstances["variables_get"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
      	const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
      	const displayBlock = workspace.getAllBlocks().find(x => x.type === "text_print");
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get");
      	return variableSetBlock && displayBlock && variableGetBlock &&
      	  variableSetBlock.getNextBlock() && variableSetBlock.getNextBlock() === displayBlock && 
      	  displayBlock.getInputTargetBlock("TEXT") === variableGetBlock &&
      	  variableGetBlock.getField("VAR").getText() === "s";
      },
      new HelpMessageDirection(() => {
      	const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
      	const displayBlock = workspace.getAllBlocks().find(x => x.type === "text_print");
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get");
      	if(variableGetBlock) {
      		const varName = variableGetBlock.getField("VAR").getText();
      		if(varName !== "s") {
      			return "Make sure you change the variable name to s since that's what you want to display its value, which is what the user entered.";
      		}
      	}
      	if(displayBlock) {
      		if(variableSetBlock) {
      			if(displayBlock.getNextBlock() && displayBlock.getNextBlock() === variableSetBlock) {
      				return "Make sure the display block appears *after* (below) the variable set block.  Otherwise the computer would try to display what the user enters before he/she enters it!"
      			} else if(!variableSetBlock.getNextBlock()) {
      				return "Make sure to connect the display block below the let block above it.  This way the computer will ask the user for a string, store it in s and then display it!";
      			}
      		}
      		if(variableGetBlock) {
      			if(!displayBlock.getInputTargetBlock("TEXT")) {
      				return "Place the s block inside the display statement to display its value!";
      			}
      		}
      	}
      	return "Now assemble the blocks to display the value of the variable that the user entered."
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
          alert("✔ Great, so now that we echoed what the user entered, it's time for something new!  Let's now display the first letter of the user's word.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          createToolboxBlock(workspace, "math_number");
          createToolboxBlock(workspace, "t2c_text_charat");
          workspace.options.maxInstances["math_number"] = 1;
          workspace.options.maxInstances["t2c_text_charat"] = 1;
          workspace.options.maxInstances["text_print"]++;
          workspace.options.maxInstances["variables_get"]++;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
      	const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
      	const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");
      	const getCharacterBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_charat");
      	const displayCharBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x !== displayStringBlock);
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
      		&& x.getParent() !== displayStringBlock);

      	return displayStringBlock && numberBlock && getCharacterBlock && displayCharBlock && variableGetBlock && 
      	  displayStringBlock.getNextBlock() && displayStringBlock.getNextBlock() === displayCharBlock && 
      	  displayCharBlock.getInputTargetBlock("TEXT") === getCharacterBlock &&
      	  variableGetBlock.getField("VAR").getText() === "s" &&
      	  getCharacterBlock.getInputTargetBlock("VALUE") === variableGetBlock &&
      	  getCharacterBlock.getInputTargetBlock("AT") === numberBlock && 
      	  numberBlock.getFieldValue("NUM") === 0;
      },
      new HelpMessageDirection(() => {
      	const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
      	const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");
      	const getCharacterBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_charat");
      	const displayCharBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x !== displayStringBlock);
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
      		&& x.getParent() !== displayStringBlock);

      	if(displayCharBlock) {
      		if(displayCharBlock.getParent() !== displayStringBlock) {
      			return "Make sure to connect the new display statement below the previous one since you want to display word's initial letter after displaying the word itself."
      		}
      		if(displayCharBlock.getInputTargetBlock("TEXT") === numberBlock) {
      			return "You want to display the character at the initial position, not a number.  Use the " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block inside the display.";
      		}
      		if(displayCharBlock.getInputTargetBlock("TEXT") === variableGetBlock) {
      			return "You want to display the word's initial character, not the entire word.  Use the " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block inside the display.";
      		}
      	}
      	if(variableGetBlock) {
      		const varName = variableGetBlock.getField("VAR").getText();
      		if(varName !== "s") {
      			return "Make sure you change the variable name to s since you want its value's (user input's) initial letter.";
      		}
      	}
      	if(getCharacterBlock) {
      		if(variableGetBlock && getCharacterBlock.getInputTargetBlock("AT") === variableGetBlock) {
      			return "The variable storing the text (s) that you want to get the character of should go in the left side of the " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block.";
      		}
      	}
      	if(numberBlock) {
      		if(numberBlock.getFieldValue("NUM") === 1) {
      			return "Remember that positions of characters start at 0, not 1."
      		} else if(numberBlock.getFieldValue("NUM") !== 0) {
      			return "Remember that you want a number representing the word's inital position.  Change the number accordingly.";
      		}
      	}
      	return "The " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block gets the single character (letter, number, punctuation mark, space, etc.) of the string of characters at the given numerical position, starting with 0.  (E.g., for \"pizza\", the 0th character is 'p', the 1st character is 'i', the 2nd character is 'z', etc.\n  Add a statement to display the entered string's initial character.\n\nThe string to get the character from goes in the left and the number to get goes in the right."
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
          alert("✔ Excellent!  Now since you displayed the first character of the user's word, how about the last one?  But let's make it more interesting this time by having you type in the code to do this instead!  You ready?  Let's get to it!");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          createToolboxBlock(workspace, "type_in_get_last_char_number");
          workspace.options.maxInstances["type_in_get_last_char_number"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
      	const displayChar0Block = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "t2c_text_charat");
      	const displayLastCharBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getParent() === displayChar0Block);
      	const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number" && x.getFieldValue("NUM") === 4);
      	const getCharacterBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_charat" 
      		&& x.getInputTargetBlock("AT") === numberBlock && x.getParent() === displayLastCharBlock);
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
      		&& x.getParent() === getCharacterBlock && x.getField("VAR").getText() === "s");

      	return displayChar0Block && numberBlock && getCharacterBlock && displayLastCharBlock && variableGetBlock;
      },
      new HelpMessageDirection(() => {
      	const displayChar0Block = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "t2c_text_charat");
      	const displayLastCharBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "t2c_text_charat"
      		&& x.getInputTargetBlock("TEXT").getInputTargetBlock("AT") && 
      		x.getInputTargetBlock("TEXT").getInputTargetBlock("AT").type === "math_number" &&
      		x.getInputTargetBlock("TEXT").getInputTargetBlock("AT").getFieldValue("NUM") === 4);

      	if(displayChar0Block && displayLastCharBlock && displayLastCharBlock.getParent() !== displayChar0Block) {
      		return "Make sure to connect the new display statement below the previous one since you want to display word's last letter after displaying its first letter."
      	}
      	
      	return "Drag in the new type-in-code block from the toolbox below the statement that displays the inputted word's first character, and type in code to print its last character.\nThe code you type in should match the previous line except you'll use a different number.";
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
        	workspace.options.maxInstances["type_in_get_last_char_number"] = 0;
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔✔👍 Outstanding!  So do you feel comfortable with the new " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block yet?  You'll get some more practice with it in the next mission.  But for now, let's conclude Mission # 1 by making sure you remember how to save and load this code the next time you want to refer to it.  Let's save and load the block code.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          document.getElementById("save-code-button").addEventListener("click", () => {
            clickedLoadButtonLast = false;
            clickedSaveButtonLast = true;
            // should call function from module for this
            // save to compare against loaded code
            const xmlDom = Blockly.Xml.workspaceToDom(workspace);
            xmlText = Blockly.Xml.domToPrettyText(xmlDom);
          });
          document.getElementById("load-code-button").addEventListener("click", () => {
            clickedLoadButtonLast = true;
            clickedSaveButtonLast = false;
          });
          document.getElementById("load-save-xml").addEventListener("click", () => {
            // Avoid asking read clipboard permission; assume that button click meant text was copied
            /*
            navigator.clipboard.readText().then(clipText => {
              clipboardText = clipText;
            });
            */
            if(document.getElementById("load-save-text-code").textContent === T2C.MSG.currentLanguage["BUTTON_LOAD_TEXT_CODE"]) {
              clickedLoadXMLButtonLast = true;
            } else {
            	clickedSaveXMLButtonLast = true;
            }
          });
        }
      }
    )
  );

  // SAVE/LOAD XML

  citf.addTask(
    new CourseInstructionTask(
      () => clickedSaveButtonLast,//document.getElementById("output-container").classList.contains("show-container"),
      new SeriesAnimations([
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
      () => clickedSaveXMLButtonLast,
      new SeriesAnimations([
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
      new SeriesAnimations([
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
      new SeriesAnimations([
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
      () => xmlText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
      new SeriesAnimations([
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
      () => clickedLoadXMLButtonLast && workspace.getAllBlocks().length === 13,
      new SeriesAnimations([
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

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("✔✔✔ Congratulations!  You just completed Mission 1!  In your upcoming mission, you'll get the last character for strings that may not have 5 letters with the help of some new blocks.");
          // SHOULD CALL EVENT LISTENER INSTEAD FOR NEXT 2 LINES
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.runTasks();
});