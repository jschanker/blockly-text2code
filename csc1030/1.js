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
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.runTasks();
});