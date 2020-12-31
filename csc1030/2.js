import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import SeriesAnimations from "../core/series_animations.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";

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
      	  variableBlock.getInputTargetBlock("VALUE") === promptBlock &&
      	  promptBlock.getInputTargetBlock("TEXT") === textBlock &&
          textBlock.getFieldValue("TEXT") && !variableBlock.getField("VAR").getText().includes(" ")
      },
      new HelpMessageDirection(() => {
      	const variableBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
      	const promptBlock = workspace.getAllBlocks().find(x => x.type === "text_input");
      	const textBlock = workspace.getAllBlocks().find(x => x.type === "text");
      	if(variableBlock) {
      		const varName = variableBlock.getField("VAR").getText();
      		if(varName.includes(" ")) {
      			return "Avoid spaces in your variable names as they won't be allowed if you program in languages such as JavaScript or Python.";
      		}
      	}
      	if(textBlock) {
      		const displayText = textBlock.getFieldValue("TEXT");
      		if(displayText === "") {
      			// Default value
      			return "You can change the text by clicking the blank field and then typing the desired message.";
      		} 
      	}
      	if(variableBlock && textBlock && variableBlock.getInputTargetBlock("VALUE") === textBlock) {
      		return "The variable should store what the user enters, which means you'll need to attach it to a getInputByAsking block.";
      	}
      	return "Drag in and assemble code blocks to ask the user for a string of any length, and store the input in a variable.  By string, we simply mean a series of characters, which can be numbers, letters, punctuation, or spaces.  Choose your own variable name and message this time.";
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
          alert("✔ Good, so as in the previous mission, we won't see any output because we only set a variable.  As before, let's display the string next.");
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
          variableGetBlock.getField("VAR").getText() === variableSetBlock.getField("VAR").getText();
      },
      new HelpMessageDirection(() => {
      	const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
      	const displayBlock = workspace.getAllBlocks().find(x => x.type === "text_print");
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get");
      	if(variableGetBlock && variableSetBlock) {
      		const varGetName = variableGetBlock.getField("VAR").getText();
          const varSetName = variableSetBlock.getField("VAR").getText();
      		if(varGetName !== varSetName) {
      			return "Make sure the variable name you display matches the one you set to the value of the user's input so you display what the user entered.";
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
      				return "Place the variable block inside the display statement to display its value!";
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
          alert("✔ Great, so now that we echoed what the user entered, it's time for something new!  Let's display the number of characters in the string the user entered.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          createToolboxBlock(workspace, "t2c_text_length");
          //createToolboxBlock(workspace, "t2c_text_charat");
          workspace.options.maxInstances["t2c_text_length"] = 1;
          workspace.options.maxInstances["text_print"]++;
          workspace.options.maxInstances["variables_get"]++;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  // Single length

  citf.addTask(
    new CourseInstructionTask(
      () => {
      	const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
      	const displayLengthBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
      		&& x !== displayStringBlock);
      	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
      		&& x.getParent() !== displayStringBlock);
        const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
        const lengthBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_length");

      	return displayStringBlock && displayLengthBlock && variableGetBlock && lengthBlock && variableSetBlock && 
      	  displayStringBlock.getNextBlock() && displayStringBlock.getNextBlock() === displayLengthBlock && 
      	  displayLengthBlock.getInputTargetBlock("TEXT") === lengthBlock &&
      	  variableGetBlock.getField("VAR").getText() === variableSetBlock.getField("VAR").getText() &&
      	  lengthBlock.getInputTargetBlock("VALUE") === variableGetBlock
      },
      new HelpMessageDirection(() => {
        const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
        const displayLengthBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x !== displayStringBlock);
        const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() !== displayStringBlock);
        const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
        const lengthBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_length");

      	if(displayLengthBlock) {
      		if(displayLengthBlock.getParent() !== displayStringBlock) {
      			return "Make sure to connect the new display statement below the previous one since you want to display word's length after displaying the word itself."
      		}
      		if(displayLengthBlock.getInputTargetBlock("TEXT") === variableGetBlock) {
      			return "You want to display the word's length, not the entire word.  Use the " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " block inside the display.";
      		}
      	}
        if(variableGetBlock && variableSetBlock) {
          const varGetName = variableGetBlock.getField("VAR").getText();
          const varSetName = variableSetBlock.getField("VAR").getText();
          if(varGetName !== varSetName) {
            return "Make sure the variable name you display matches the one you set to the value of the user's input so you display what the user entered.";
          }
        }
      	if(lengthBlock) {
      		if(variableGetBlock && lengthBlock.getInputTargetBlock("VALUE") !== variableGetBlock) {
      			return "Be sure to attach the variable block to the  " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " block to get the number of characters in the user input.";
      		}
      	}
      	return "The " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " block gets the number of characters in the provided string.  Unlike the " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block though, the count starts at 1!  (E.g., for \"pizza\", the length would be 5.)\n  Add a statement to display the length of the given string."
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
          alert("✔ Great!  Now since you displayed the length of the user's word, can you display double its length instead for good measure?  We'll need a new arithmetic block for this.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          createToolboxBlock(workspace, "math_number");
          createToolboxBlock(workspace, "math_arithmetic_basic");
          workspace.options.maxInstances["math_number"] = 1;
          workspace.options.maxInstances["math_arithmetic_basic"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  // Double length part

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
        const displayDoubleLengthBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x !== displayStringBlock);
        const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() !== displayStringBlock);
        const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
        const lengthBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_length");
        const arithmeticBlock = workspace.getAllBlocks().find(x => x.type === "math_arithmetic_basic");
        const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");

        return displayStringBlock && displayDoubleLengthBlock && variableGetBlock && lengthBlock && variableSetBlock && arithmeticBlock && numberBlock &&
          displayStringBlock.getNextBlock() && displayStringBlock.getNextBlock() === displayDoubleLengthBlock && 
          displayDoubleLengthBlock.getInputTargetBlock("TEXT") === arithmeticBlock &&
          variableGetBlock.getField("VAR").getText() === variableSetBlock.getField("VAR").getText() &&
          numberBlock.getParent() === arithmeticBlock && lengthBlock.getParent() === arithmeticBlock &&
          (arithmeticBlock.getFieldValue("OP") === "MULTIPLY" && numberBlock.getFieldValue("NUM") === 2 || 
           arithmeticBlock.getFieldValue("OP") === "DIVIDE" && numberBlock.getFieldValue("NUM") === 0.5);
      },
      new HelpMessageDirection(() => {
        const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
        const displayDoubleLengthBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x !== displayStringBlock);
        const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() !== displayStringBlock);
        const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
        const lengthBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_length");
        const arithmeticBlock = workspace.getAllBlocks().find(x => x.type === "math_arithmetic_basic");
        const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");

        if(displayDoubleLengthBlock) {
          if(displayDoubleLengthBlock.getParent() !== displayStringBlock) {
            return "Make sure the display statement stays below the previous one since you want to display double the word's length after displaying the word itself."
          }
          if(displayDoubleLengthBlock.getInputTargetBlock("TEXT") === lengthBlock) {
            return "You want to display double the string's length, not just its length.  Use the arithmetic (+,-,*,/) block inside the display.";
          }
          if(displayDoubleLengthBlock.getInputTargetBlock("TEXT") === variableGetBlock) {
            return "You want to display double the string's length, not the entire string.  Use the arithmetic (+,-,*,/) block inside the display.";
          }
          if(displayDoubleLengthBlock.getInputTargetBlock("TEXT") === numberBlock) {
            return "You want to display double the string's length, not just a number.  Use the arithmetic (+,-,*,/) block inside the display.";
          }
        }
        if(variableGetBlock && variableSetBlock) {
          const varGetName = variableGetBlock.getField("VAR").getText();
          const varSetName = variableSetBlock.getField("VAR").getText();
          if(varGetName !== varSetName) {
            return "Make sure the variable name you display matches the one you set to the value of the user's input so you display what the user entered.";
          }
        }
        if(lengthBlock) {
          if(variableGetBlock && lengthBlock.getInputTargetBlock("VALUE") !== variableGetBlock) {
            return "Be sure that the variable block remains inside the " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " block so you can get the number of characters in the user input before doubling it.";
          }
        }
        if(arithmeticBlock) {
          if(variableGetBlock && variableGetBlock.getParent() === arithmeticBlock) {
            return "Be sure the variable block remains inside the " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " block since you don't want to double the string itself, but its length!  Doubling 'pizza' doesn't give you 10, right?  Doubling its length of 5 does.";
          }
          if(numberBlock && 
              (arithmeticBlock.getFieldValue("OP") !== "MULTIPLY" && numberBlock.getFieldValue("NUM") !== 0.5 || 
               arithmeticBlock.getFieldValue("OP") !== "DIVIDE" && numberBlock.getFieldValue("NUM") !== 2)) {
            return "What operation/number could you use to double the length?  Select the appropriate option from the dropdown (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE), and change the value of the number block from " + numberBlock.getFieldValue("NUM") + " to this desired number accordingly.";
          }
        }
        /*
        if(numberBlock) {
          if(numberBlock.getFieldValue("NUM") !== 2 && numberBlock.getFieldValue("NUM") !== 0.5) {
            return "What number should you use to double the length?  Change the value of the number block from " + numberBlock.getFieldValue("NUM") + " to this number accordingly.";
          }
        }
        */
        return "The arithmetic block can be used on blocks producing numerical values such as " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " to add, subtract, multiply, or divide depending on the selected option from +, -, *, / by placing the number-producing blocks you want to use in the calculation.\nUsing this new arithmetic block and number block, modify your display statement to show double the length of the entered string."
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
          alert("✔ Excellent!  OK, so now that you can use the arithmetic and length blocks, let's combine them with the previous " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block to get the last character of the string, regardless of whether it's 0 characters (empty) or 100 or any other number!  You up for the challenge?  Let's get to it!");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          createToolboxBlock(workspace, "t2c_text_charat");
          workspace.options.maxInstances["t2c_text_charat"] = 1;
          workspace.options.maxInstances["variables_get"]++;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  // get last character part

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
        const getCharacterBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_charat");
        const displayLastCharBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x.getInputTargetBlock("TEXT") === getCharacterBlock);
        const arithmeticBlock = workspace.getAllBlocks().find(x => x.type === "math_arithmetic_basic");
      	const lengthBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_length");
        const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");
        const variableInCharBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() === getCharacterBlock);
        const variableInLenBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() === lengthBlock);
        const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");

      	return displayStringBlock && displayLastCharBlock && arithmeticBlock && lengthBlock && 
          numberBlock && getCharacterBlock && variableInCharBlock && variableInLenBlock && variableSetBlock &&
          variableInCharBlock.getField("VAR").getText() === variableSetBlock.getField("VAR").getText() &&
          variableInLenBlock.getField("VAR").getText() === variableSetBlock.getField("VAR").getText() && 
          getCharacterBlock.getInputTargetBlock("VALUE") === variableInCharBlock && getCharacterBlock.getInputTargetBlock("AT") === arithmeticBlock &&  
          arithmeticBlock.getInputTargetBlock("A") === lengthBlock && arithmeticBlock.getFieldValue("OP") === "MINUS" && 
          arithmeticBlock.getInputTargetBlock("B") === numberBlock && numberBlock.getFieldValue("NUM") === 1;
      },
      new HelpMessageDirection(() => {
        const displayStringBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
        const getCharacterBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_charat");
        const displayLastCharBlock = workspace.getAllBlocks().find(x => x.type === "text_print" 
          && x !== displayStringBlock);
        const arithmeticBlock = workspace.getAllBlocks().find(x => x.type === "math_arithmetic_basic");
        const lengthBlock = workspace.getAllBlocks().find(x => x.type === "t2c_text_length");
        const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");
        const variableInLenBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() === lengthBlock);
        const variableInCharBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
          && x.getParent() === getCharacterBlock);
        const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");

      	if(displayLastCharBlock && displayLastCharBlock.getParent() !== displayStringBlock) {
      		return "Make sure to connect the new display statement below the previous one since you want to display the string's last character after displaying the whole string."
      	}

        if(getCharacterBlock) {
          if(variableInCharBlock && getCharacterBlock.getInputTargetBlock("AT") === variableInCharBlock) {
            return "The variable storing the text that you want to get the character of should go in the left side of the " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block.  It wouldn't make sense to get the character at position number \"pizza\" (or whatever string the user enters), right?";
          }
          if(lengthBlock && getCharacterBlock.getInputTargetBlock("AT") === lengthBlock) {
            return "The length of the 5-character string pizza is 5, but since you start counting from 0, this was not the position of the last character that you used in the previous exercise, correct?  Consider using some math operation on this number to calculate the correct position.";
          }
          if(numberBlock && getCharacterBlock.getInputTargetBlock("AT") === numberBlock) {
            return "The position of the last character will depend on the length of the string so you can't use a specific number such as " + numberBlock.getFieldValue("NUM") + ".  You will need to use the " + MSG.T2C.currentLanguage["TERMINAL_LENGTH"] + " block and a math operation to calculate the correct position for each string containing at least one character.";
          }
        }

        if(displayLastCharBlock && getCharacterBlock) {
          if(displayLastCharBlock.getInputTargetBlock("TEXT") === arithmeticBlock) {
            return "You want to display the string's last character, not the result of an arithmetic calculation, which would be a number.";
          }
          if(displayLastCharBlock.getInputTargetBlock("TEXT") === lengthBlock) {
            return "You want to display the string's last character, not the length of the string, which would be a number.";
          }
          if(displayLastCharBlock.getInputTargetBlock("TEXT") === numberBlock) {
            return "You want to display the string's last character, not a number.";
          }
        }

        /*
        if(arithmeticBlock && arithmeticBlock.getField("OP") === "TIMES") {
          return "Select the appropriate option from the dropdown with (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE) accordingly.";
        }
        */
        if(arithmeticBlock && numberBlock && lengthBlock && getCharacterBlock) {
          if(numberBlock.getParent() === arithmeticBlock && lengthBlock.getParent() === arithmeticBlock) {
            if(arithmeticBlock.getFieldValue("OP") === "PLUS" && numberBlock.getFieldValue("NUM") === 1) {
              return "Consider that adding 1 to 5, which is the length of pizza gives you 6.  Did you use 6 for the position for the last mission?";
            }
            if(arithmeticBlock.getFieldValue("OP") !== "PLUS" && numberBlock.getFieldValue("NUM") !== 1 || 
               arithmeticBlock.getFieldValue("OP") !== "MINUS" && numberBlock.getFieldValue("NUM") !== -1) {
              return "Select the appropriate option from the arithmetic block dropdown menu (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE) and choose the appropriate number.  Your current answer won't work in general.";
            }
          }
        }

/*
        if(numberBlock && Math.abs(numberBlock.getFieldValue("NUM")) !== 1) {
          if(arithmeticBlock.getField("OP") !== "MINUS") {
            return "Select the appropriate option from the dropdown with (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE) accordingly.  What you selected is *not* correct.";
          }
        }
*/
      	
      	return "Change the math operation and number that's used with the " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " to calculate the *position* of the last character from its number of characters.  Then add a " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " and variable block in the appropriate places to display the last character, regardless of the length of the string.  To determine the appropriate math operation and number to use for the position, consider strings of different lengths.  How did you determine the number to use for the position of the last character of a 5-character string?  What would you do with the 5 to get it?  What if you wanted to calculate the position of the last character of a string of length 3?  What about the position of the last character for a string of length 10?  The math operation and number you use should be the same for each example to get your answer.";
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
          alert("✔✔👍 Outstanding!  So do you feel comfortable with using the new " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " block in combination with the arithmetic and " + T2C.MSG.currentLanguage["GETCHARACTERNUMBER"] + " blocks yet?  In the next mission, we'll use these blocks to get the middle two characters of strings with an even number of characters (and not 0).  But for now, let's conclude Mission # 2 by making sure you can save this code for later use.  Let's save and load the block code.");
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
          alert("✔✔✔ Congratulations!  You just completed Mission 2!  On to even tougher challenges ahead!");
          // SHOULD CALL EVENT LISTENER INSTEAD FOR NEXT 2 LINES
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.runTasks();
});