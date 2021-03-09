import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
// import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
import MessageConsoleManager from "../core/message_console_manager.js";
import TypeInCodeBlock from "../core/type_in_code_block.js";
import LevelGenerator from "../core/level_generator.js";

const typeInGetLastCharNumBlock = new TypeInCodeBlock("type_in_get_last_char_number");
typeInGetLastCharNumBlock.addPossibleMatch(
  [{token: "display", type: "terminal"}, "(", "s", ".", {token: "getCharacterNUMBER", type: "terminal"}, "(", "4", ")", ")", {token: /^[;]*/, type: "regexp"}],
  [
    null,
    null,
    (matchResultArr, remaining) => {
      if(remaining.startsWith('"')) {
        return "Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)"
      } else {
        return "Be sure to include the variable s that you want to the get the value's last character from";
      } 
    },
    null,
    null,
    null,
    (matchResultArr, remaining) => {
      if(remaining.startsWith('"')) {
        return "Don't use \" here as you want the computer to interpret this as a number and not text.";
      } else if(remaining.startsWith("5")) {
        return "Remember that character positions start at the number 0.  If you count the letters of a 5-letter word such as `pizza` starting from 0, you won't get up to position 5.";
      } else if(remaining.startsWith("6")) {
        return "Determine the position of the last character a in the 5-letter word `pizza`.  If you count starting from 0, you won't get up to position 6.";
      } else if(parseInt(remaining) === 0) {
        return "You want the position of the last character, not the first.";
      } else if(parseInt(remaining)) {
        return "Determine the position of the last character a in the 5-letter word `pizza`.  The number you're entering is incorrect.";
      } else {
        return "Include a number for the position you want after " + matchResultArr[4] + "(";
      }
    },
    null,
    null,
    null
  ]
);
typeInGetLastCharNumBlock.addPossibleMatch(
  [{token: "display", type: "terminal"}, "(", "s", "[", "4", "]", ")"],
  [
    null,
    null,
    (matchResultArr, remaining) => {
      if(remaining.startsWith('"')) {
        return "Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)"
      } else {
        return "Be sure to include the variable s that you want to the get the value's last character from";
      } 
    },
    null,
    (matchResultArr, remaining) => {
      if(remaining.startsWith('"')) {
        return "Don't use \" here as you want the computer to interpret this as a number and not text.";
      } else if(remaining.startsWith("5")) {
        return "Remember that character positions start at the number 0.  If you count the letters of a 5-letter word such as `pizza` starting from 0, you won't get up to position 5.";
      } else if(remaining.startsWith("6")) {
        return "Determine the position of the last character a in the 5-letter word `pizza`.  If you count starting from 0, you won't get up to position 6.";
      } else if(parseInt(remaining) === 0) {
        return "You want the position of the last character, not the first.";
      } else if(parseInt(remaining)) {
        return "Determine the position of the last character a in the 5-letter word `pizza`.  The number you're entering is incorrect.";
      } else {
        return "Include a number for the position you want after " + matchResultArr[3] + ".";
      }
    },
    null,
    null
  ]
);
typeInGetLastCharNumBlock.addToBlocks();

function restoreAfterMoveAndFlashText(div) {
  div.style.verticalAlign = "middle";
  div.style.color = "#000";
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

// window.addEventListener('DOMContentLoaded', () => {
export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const levelGenerator = new LevelGenerator();
  const helpMsgManager = levelGenerator.createStandardHelpMessageManager();
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  const workspace = ws || Blockly.getMainWorkspace();

  const initialBlocks = ["variables_set", "text", "text_input"];
  // set up level
  // helpMsgManager.start();
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
  const d = levelGenerator.createPointer();
  document.getElementById("blockly-div").appendChild(d);

  levelGenerator.addHelpMessageTask(
    citf,
    helpMsgManager,
    () => {
    	const variableBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
    	const promptBlock = workspace.getAllBlocks().find(x => (x.type === "text_input" || x.type === "js_text_input"));
    	const textBlock = workspace.getAllBlocks().find(x => x.type === "text");
    	return variableBlock && promptBlock && textBlock &&
    	  variableBlock.getField("VAR").getText() === "s" && 
    	  variableBlock.getInputTargetBlock("VALUE") === promptBlock &&
    	  promptBlock.getInputTargetBlock("TEXT") === textBlock && 
        textBlock.getFieldValue("TEXT").includes("5") && textBlock.getFieldValue("TEXT").includes("letter");
    },
    "Drag in and assemble code blocks to ask the user for a 5-letter word, and store the input in a variable.  \nName the variable s AND\nbe sure that the message includes 5 and letters in it so the user knows to enter 5 letters.",
    () => {
    	const variableBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
    	const promptBlock = workspace.getAllBlocks().find(x => (x.type === "text_input" || x.type === "js_text_input"));
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
      return "";
    	// return "Drag in and assemble code blocks to ask the user for a 5-letter word, and store the input in a variable.  \nName the variable s AND\nbe sure that the message includes 5 and letters in it so the user knows to enter 5 letters."
    },
    null
  );

  levelGenerator.addRunTask(helpMsgManager, citf, () => {
    alert("✔ Good, but notice there's no output yet.  That's because all we did is store what the user entered.  So now let's add code blocks to display it!");
    createToolboxBlock(workspace, "text_print");
    createToolboxBlock(workspace, "variables_get");
    workspace.options.maxInstances["text_print"] = 1;
    workspace.options.maxInstances["variables_get"] = 1;
    workspace.updateToolbox(document.getElementById("toolbox"));
  }, d);

  levelGenerator.addHelpMessageTask(
    citf,
    helpMsgManager,
    () => {
    	const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
    	const displayBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
    	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get");
    	return variableSetBlock && displayBlock && variableGetBlock &&
    	  variableSetBlock.getNextBlock() && variableSetBlock.getNextBlock() === displayBlock && 
    	  displayBlock.getInputTargetBlock("TEXT") === variableGetBlock &&
    	  variableGetBlock.getField("VAR").getText() === "s";
    },
    "Now assemble the blocks to display the value of the variable that the user entered.",
    () => {
    	const variableSetBlock = workspace.getAllBlocks().find(x => x.type === "variables_set");
    	const displayBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print"));
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
      return "";
    	// return "Now assemble the blocks to display the value of the variable that the user entered."
    },
    null
  );

  levelGenerator.addRunTask(helpMsgManager, citf, () => {
    alert("✔ Great, so now that we echoed what the user entered, it's time for something new!  Let's now display the first letter of the user's word.");
    createToolboxBlock(workspace, "math_number");
    createToolboxBlock(workspace, "t2c_text_charat");
    workspace.options.maxInstances["math_number"] = 1;
    workspace.options.maxInstances["t2c_text_charat"] = 1;
    workspace.options.maxInstances["text_print"]++;
    workspace.options.maxInstances["variables_get"]++;
    workspace.updateToolbox(document.getElementById("toolbox"));
  }, d);

  levelGenerator.addHelpMessageTask(
    citf,
    helpMsgManager,
    () => {
    	const displayStringBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
    		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
    	const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");
    	const getCharacterBlock = workspace.getAllBlocks().find(x => (x.type === "t2c_text_charat" || x.type === "js_text_charat"));
    	const displayCharBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
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
    "The " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block gets the single character (letter, number, punctuation mark, space, etc.) of the string of characters at the given numerical position, starting with 0.  (E.g., for \"pizza\", the 0th character is 'p', the 1st character is 'i', the 2nd character is 'z', etc.\n  Add a statement to display the entered string's initial character.\n\nThe string to get the character from goes in the left and the number to get goes in the right.",
    () => {
    	const displayStringBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
    		&& x.getInputTargetBlock("TEXT") && x.getInputTargetBlock("TEXT").type === "variables_get");
    	const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number");
    	const getCharacterBlock = workspace.getAllBlocks().find(x => (x.type === "t2c_text_charat" || x.type === "js_text_charat"));
    	const displayCharBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
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
    	return "";//"The " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block gets the single character (letter, number, punctuation mark, space, etc.) of the string of characters at the given numerical position, starting with 0.  (E.g., for \"pizza\", the 0th character is 'p', the 1st character is 'i', the 2nd character is 'z', etc.\n  Add a statement to display the entered string's initial character.\n\nThe string to get the character from goes in the left and the number to get goes in the right."
    },
    null
  );

  levelGenerator.addRunTask(helpMsgManager, citf, () => {
    alert("✔ Excellent!  Now since you displayed the first character of the user's word, how about the last one?  But let's make it more interesting this time by having you type in the code to do this instead!  You ready?  Let's get to it!");
    createToolboxBlock(workspace, "type_in_get_last_char_number");
    workspace.options.maxInstances["type_in_get_last_char_number"] = 1;
    workspace.updateToolbox(document.getElementById("toolbox"));
  }, d);

  levelGenerator.addHelpMessageTask(
    citf,
    helpMsgManager,
    () => {
    	const displayChar0Block = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
    		&& x.getInputTargetBlock("TEXT") && (x.getInputTargetBlock("TEXT").type === "t2c_text_charat" || x.getInputTargetBlock("TEXT").type === "js_text_charat"));
    	const displayLastCharBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
    		&& x.getParent() === displayChar0Block);
    	const numberBlock = workspace.getAllBlocks().find(x => x.type === "math_number" && x.getFieldValue("NUM") === 4);
    	const getCharacterBlock = workspace.getAllBlocks().find(x => (x.type === "t2c_text_charat" || x.type === "js_text_charat") 
    		&& x.getInputTargetBlock("AT") === numberBlock && x.getParent() === displayLastCharBlock);
    	const variableGetBlock = workspace.getAllBlocks().find(x => x.type === "variables_get" 
    		&& x.getParent() === getCharacterBlock && x.getField("VAR").getText() === "s");

    	return displayChar0Block && numberBlock && getCharacterBlock && displayLastCharBlock && variableGetBlock;
    },
    "Drag in the new type-in-code block from the toolbox below the statement that displays the inputted word's first character, and type in code to print its last character.\nThe code you type in should match the previous line except you'll use a different number.",
    () => {
    	const displayChar0Block = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
    		&& x.getInputTargetBlock("TEXT") && (x.getInputTargetBlock("TEXT").type === "t2c_text_charat" || x.getInputTargetBlock("TEXT").type === "js_text_charat"));
    	const displayLastCharBlock = workspace.getAllBlocks().find(x => (x.type === "text_print" || x.type === "js_text_print") 
    		&& x.getInputTargetBlock("TEXT") && (x.getInputTargetBlock("TEXT").type === "t2c_text_charat" || x.getInputTargetBlock("TEXT").type === "js_text_charat")
    		&& x.getInputTargetBlock("TEXT").getInputTargetBlock("AT") && 
    		x.getInputTargetBlock("TEXT").getInputTargetBlock("AT").type === "math_number" &&
    		x.getInputTargetBlock("TEXT").getInputTargetBlock("AT").getFieldValue("NUM") === 4);
      const typeInBlock = workspace.getAllBlocks().find(x => x.type === "type_in_get_last_char_number");

    	if(displayChar0Block && displayLastCharBlock && displayLastCharBlock.getParent() !== displayChar0Block) {
    		return "Make sure to connect the new display statement below the previous one since you want to display word's last letter after displaying its first letter."
    	}
    	
      if(typeInBlock) {
        return typeInGetLastCharNumBlock.getErrorFeedback(typeInBlock.getFieldValue("EXP"));
      }

      return "";
    	// return "Drag in the new type-in-code block from the toolbox below the statement that displays the inputted word's first character, and type in code to print its last character.\nThe code you type in should match the previous line except you'll use a different number.";
    },
    null
  );

  levelGenerator.addRunTask(helpMsgManager, citf, () => {
    workspace.options.maxInstances["type_in_get_last_char_number"] = 0;
    // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
    alert("✔✔👍 Outstanding!  So do you feel comfortable with the new " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " block yet?  You'll get some more practice with it in the next mission.  But for now, let's conclude Mission # 1 by making sure you remember how to save and load this code the next time you want to refer to it.  Let's save and load the block code.");
  }, d);

  // SAVE/LOAD XML

  levelGenerator.addSaveXMLTask(helpMsgManager, citf, workspace, null, d, true);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("OK, now that you've copied the XML for the blocks, let's clear the workspace of the blocks and then load it (without reloading the page!) to confirm that everything works.  BE SURE NOT TO overwrite the clipboard until you load the code again or you'll lose your work!");
          levelGenerator.hideOutputAndCodeContainers();
          /*document.getElementById("load-save-text-code").addEventListener("click", () => {
            // may want to read clipboard instead to check for click
            clickedSaveTextCodeButton = true;
          })*/
        }
      }
    )
  );

  levelGenerator.addDeleteAllBlocksTask(helpMsgManager, citf, workspace, null, d);

  // load XML
  levelGenerator.addLoadXMLTask(helpMsgManager, citf, workspace, null, d);

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
          levelGenerator.hideOutputAndCodeContainers();
        }
      }
    )
  );

//  citf.runTasks();
//});

  return citf;
};