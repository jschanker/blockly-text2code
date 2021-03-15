import {getParseTree, handleParseTreeToBlocks, workspaceToLanguageCode} from "../core/mobile.js";
import {refreshWorkspace, newBlock, setValueInput, setFieldValue, setNextBlock} from "../core/block_utility_functions.js";
import ToolboxManager from "../core/toolbox_manager.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
import MessageConsoleManager from "../core/message_console_manager.js";
import TypeInCodeBlock from "../core/type_in_code_block.js";
import LevelGenerator from "../core/level_generator.js";

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
	const blockNames = ["cs1030_13_type_in_get_days", "cs1030_13_type_in_set_whole_days",
	"cs1030_13_type_in_set_total_hours", "cs1030_13_type_in_display_total_hours", 
	"cs1030_13_type_in_set_whole_hours", "cs1030_13_type_in_set_remaining_hours", 
	"cs1030_13_type_in_display_remaining_hours", "cs1030_13_type_in_set_total_minutes", 
	"cs1030_13_type_in_display_total_minutes", "cs1030_13_type_in_set_whole_minutes",
	"cs1030_13_type_in_set_remaining_minutes", "cs1030_13_type_in_display_remaining_minutes", 
	"cs1030_13_type_in_set_total_seconds", "cs1030_13_type_in_display_total_seconds",
	"cs1030_13_type_in_set_whole_seconds", "cs1030_13_type_in_set_remaining_seconds", 
	"cs1030_13_type_in_display_remaining_seconds", "cs1030_13_type_in_display_time"];
	const blockTemplates = blockNames.map(blockName => (new TypeInCodeBlock(blockName, {collapseWhenFinished: true})));
  const varNames = ["days", "wholeDays", "totalHours", "wholeHours", "remainingHours", "totalMinutes", "wholeMinutes", "remainingMinutes", "totalSeconds", "wholeSeconds", "remainingSeconds"];
	const textNames = varNames.map(varName => varName
		.replace(/([A-Z])/, (_, uppercaseLetter) => " number of " + uppercaseLetter).toLowerCase());
	const conversionFactors = ["24", "60", "60"];
	let codeBlocks = [];

	// const typeInGetMsBlock = new TypeInCodeBlock(blockNames[0], {collapseWhenFinished: true});
	let patternArrs = [
	  [{token: "let", type: "terminal"}, varNames[0], "=", {token: "parseFloat", type: "terminal"}, "(", 
	   {token: "GETINPUTBYASKING", type: "terminal"}, '(', {token: /^"[^"]*$|^'[^']*$|^"[^"]*"|^'[^']*'/, type: "regexp"}, ")", ")",
	   {token: /^[;]*$/, type: "regexp"}]
	];

	let errorFeedbackArr = [
		null, 
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	];

	patternArrs.forEach(patternArr => blockTemplates[0].addPossibleMatch(patternArr, errorFeedbackArr.slice(0, patternArr.length)));
	blockTemplates[0].addToBlocks();
	// typeInGetMsBlock.addPossibleMatch(patternArr, errorFeedbackArr);
	// typeInGetMsBlock.addToBlocks();
  // blockTemplates.push(typeInGetMsBlock);
  // const typeInTotalSecondsBlock = new TypeInCodeBlock(blockNames[1], {collapseWhenFinished: true});
	// typeInTotalSecondsBlock.addPossibleMatch(patternArr, errorFeedbackArr);
	// typeInTotalSecondsBlock.addToBlocks();
	// blockTemplates.push(typeInTotalSecondsBlock);


	for(let i = 1; i < blockNames.length; i++) {

		patternArrs = [];
		if(i === 1 || i % 5 === 4) {
			// whole_____ = M.t(total_____);
			// 1 => 1, 4 => 3, 9 => 6, 14 => 9
		  // 1 => 0, 4 => 2, 9 => 5, 14 => 8 
			patternArrs.push([
	      {token: "let", type: "terminal"}, varNames[i === 1 ? 1 : 3 * Math.trunc((i+1)/5)], "=",  
	      {token: "TRUNC", type: "terminal"}, '(', varNames[(i-1) && (3 * Math.trunc((i+1)/5) - 1)], ")", 
	      {token: /^[;]*$/, type: "regexp"}
	    ]);
		} else if(i % 5 === 2 && i < blockNames.length - 1) {
			// total_____ = total_____ * conversionFactor
			// 2 => 2, 7 => 5, 12 => 8
			// 2 => 0, 7 => 2, 12 => 5
			// 2 => 0, 7 => 1, 12 => 2 
			patternArrs.push([
	      {token: "let", type: "terminal"}, varNames[3 * Math.trunc(i/5) + 2], "=",  
	      varNames[2*Math.trunc(i/7) + 3*Math.trunc(i/8)], "*", 
	      conversionFactors[Math.trunc(i/5)], {token: /^[;]*$/, type: "regexp"}
	    ]);
		} else if(i % 5 === 0) {
			// remaining_____ = whole______ - total______*conversionFactors________
			// 5 => 4, 10 => 7, 15 => 10
			// 5 => 1, 10 => 3, 15 => 6
			// 5 => 0, 10 => 1, 15 => 2 
	  	patternArrs.push([
	      {token: "let", type: "terminal"}, varNames[3 * Math.trunc(i/5) + 1], "=", 
	      varNames[3 * Math.trunc(i/5)], "-", varNames[2 * Math.trunc(i/5) - 1 + Math.trunc(i/15)], 
	      "*", conversionFactors[Math.trunc(i/5) - 1], {token: /^[;]*$/, type: "regexp"}
	    ]);
	  } else if(i === blockNames.length - 1) {
	  	patternArrs.push([
	      {token: "display", type: "terminal"}, "(", "remainingHours",  
	      ",", {token: /":"|':'/, tokenPartial: /"$|'$|":$|':$/, type: "regexp"}, ",", "remainingMinutes",  
	      ",", {token: /":"|':'/, tokenPartial: /"$|'$|":$|':$/, type: "regexp"}, ",", "remainingSeconds", ")",
	      {token: /^[;]*$/, type: "regexp"}
	    ]);
	  } else {
	  	// 3 => 2, 6 => 4, 8 => 5, 11 => 7, 13 => 8, 16 => 10
	  	patternArrs.push([{token: "display", type: "terminal"}, "(", varNames[i - Math.round(i/3) - Math.trunc(i/12)], ")", {token: /^[;]*$/, type: "regexp"}]);
	  }

	  const multIndex = patternArrs[0].indexOf("*");

	  if(multIndex !== -1) {
	  	// + and * are commutative operations; allow swap of lhs and rhs
	  	const patternArrCp = patternArrs[0].slice();
	    // const lhs = lhSides[(i-1)/2];
	    patternArrCp[multIndex-1] = patternArrs[0][multIndex+1];
	    patternArrCp[multIndex+1] = patternArrs[0][multIndex-1];
	    patternArrs.push(patternArrCp);
	  }

	  patternArrs.forEach(patternArr => blockTemplates[i].addPossibleMatch(patternArr, errorFeedbackArr.slice(0, patternArr.length)));
	  blockTemplates[i].addToBlocks();
  }

  const levelGenerator = new LevelGenerator();
  const helpMsgManager = levelGenerator.createStandardHelpMessageManager();
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  const workspace = ws || Blockly.getMainWorkspace();
  const toolboxManager = new ToolboxManager(workspace);
  workspace.clear();
  toolboxManager.clearToolbox();
  const d = levelGenerator.createPointer();
  document.body.appendChild(d);
  // const codeBlocks = blockNames.map(blockName => newBlock(workspace, blockName));

  // switch to JavaScript: should call function from mobile.js to do this
  if(document.getElementById("language")) {
    document.getElementById("language").value = "js";
  }
  T2C.MSG.currentLanguage = T2C.MSG.JS;

  const refreshBlocksAndAdd = i => {
  	codeBlocks = codeBlocks.map(currentBlock => 
	    workspace.getAllBlocks().find(newBlock => currentBlock.type === newBlock.type));
	  codeBlocks.push(newBlock(workspace, blockNames[i]));
	  if(i > 0) setNextBlock(codeBlocks[i-1], codeBlocks[i]);
	  workspace.getAllBlocks().forEach(block => block.setMovable(false));
    refreshWorkspace(workspace);
  };

  workspace.setScale(1);
//  workspace.getAllBlocks().forEach(block => block.setMovable(false));
//  refreshWorkspace(workspace);

  for(let i = 0; i < blockNames.length; i++) {
  	if(i % 5 === 2 && i > 2 || i % 5 === 4) {
		  levelGenerator.addRunTask(
		    helpMsgManager, 
		    citf, 
		    () => {
		    	if(i === 4) {
		        alert("Sahee (Right) so now since we'll want the " + textNames[4] + ", which will be a whole number, and we'll later want " + textNames[7] + ", let's get the " + textNames[3] + " next from the " + textNames[2] + ".  You remember how we can do this, right?");
		      } else {
	    		  alert("Directions to be added later");
	    		}
	    		refreshBlocksAndAdd(i);
	    	},
		    d
		  );
  	} else {
		  citf.addTask(
		    new CourseInstructionTask(
		      () => true,
		      {
		        start: () => true,
		        isComplete: () => true,
		        animate: () => true,
		        finish: () => {
		        	if(i === 0) {
		            alert("In Excel/Google Sheets, Dates are represented as the number of days since December 31, 1899 at midnight (represented by 0; 1 represents a day later or January 1, 1900 at midnight). Fractions of days affect the hours/minutes/seconds so e.g., 3.25 represents January 3, 1900 at 06:00:00 am (3 and 1 quarter day after December 31 at midnight).  You can see this by typing a number in a cell in a spreadsheet and switching the format to e.g., Time, Long Date, Date time, etc.  In this mission, the user will input a number of days after midnight in decimal such as 3.25 and you will again output the time (ignoring leap seconds).  So let's start by asking the user for a number of days in decimal and storing the *numerical* result in a variable named " + varNames[0] + ".  As in the previous missions, you'll need to convert the user input to a number.");
		          } else if(i === 1) {
	              alert("Sahee (Right), so this time we're going to work in the opposite direction from the previous mission to get the time, proceeding from the largest unit of the total " + textNames[0] + " to the smallest unit of " + textNames[textNames.length-1].substring(textNames[textNames.length-1].indexOf(" ") + 1) + ".  Recall that in the previous exercise, before the last step to get the " + textNames[4] + ", we first got the " + textNames[1] + " so we could subtract out the " + textNames[3] + " contributed by them.  So let's start by getting " + textNames[1] + " from the inputted " + textNames[0] + ".");
	              	// remembering that there are 1000 ms (milliseconds) in a second, let's get the total number of *whole* seconds contained in the entered number of ms.  So the answer for 64000, 64500, and 64543.21 should all be 64.  " + integerDivisionMessage + "  So using this information, can you do this?  Store the answer in totalSeconds.");
		          } else if(i === 2) {
		          	alert("Acchaa (Good) so now we'll get the " + textNames[2] + " from the " + textNames[0] + ".  Do *NOT* use " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + " this time as we'll need to preserve what comes after the decimal point to get " + textNames[7] + " and " + textNames[10] + ".");
		          } else if(i === 3) {
		          	alert("Phir se acchaa (Good again).  So let's now display the " + textNames[2] + " to verify it's what you expect for an example you have in mind.");
		          } else if(i === 5) {
		          	alert("Mahaan (Great), so now that we have " + textNames[3] + " and " + textNames[1] + ", you remember how to calculate the " + textNames[4] + " from the last mission, right?  As before, use some examples, show the math operations, and then substitute the numbers with the appropriate variables to get the hour number that'll display on a clock."); // you'll need to get the remaining number of seconds after you've accounted for the minutes.  So for example, 90 seconds after midnight would be 00:01:30 (1 minute, 30 seconds), 130 seconds after would be 00:02:10 (2 minutes, 10 seconds), and 200 seconds after would be 00:03:20 (3 minutes, 20 seconds).  You got the 1, 2, and 3 from 90, 130, and 210 so how do you go from:\n90 and 1 => 30,\n 130 and 2 => 10, \n 200 and 3 => 20 \nFind the common operations you use in each and then substitute these numbers with the variables totalSeconds and totalMinutes to get your answer, which you should store in remainingSeconds.")
		          } else {
		          	alert("Message to be added later");
		          }
		          codeBlocks = codeBlocks.map(currentBlock => 
		          	workspace.getAllBlocks().find(newBlock => currentBlock.type === newBlock.type));
		          codeBlocks.push(newBlock(workspace, blockNames[i]));
		          if(i > 0) setNextBlock(codeBlocks[i-1], codeBlocks[i]);
		          workspace.getAllBlocks().forEach(block => block.setMovable(false));
	            refreshWorkspace(workspace);
		        }
		      }
		    )
		  );
		}

	  levelGenerator.addHelpMessageTask(
	    citf,
	    helpMsgManager,
	    () => {
	    	return blockNames.slice(0,i+1).every((blockName, index) => {
	    		const block = workspace.getAllBlocks().find(block => block.type === blockName);
	    		return blockTemplates[index].hasFullMatch(block.getFieldValue("EXP"), false);
	    	})
	      return workspace.getAllBlocks()
	        .every((block, index) => block.type === blockNames[index] && blockTemplates[index].hasFullMatch(block.getFieldValue("EXP"), false));
	    },
	    () => {
	    	if(i === 0) {
	    		return "Ask the user for a number of " + textNames[0] + ", convert the input to a number, and store it in a variable named " + varNames[0] + ".";
	    	} else if(i === 1) {
	    		return "Store the total " + textNames[1] + " in the variable " + varNames[1] + " by using " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + " on " + varNames[0] + ".";
	    		// return "Apply the appropriate math operation on " + varNames[0] + " and the appropriate integer to convert to the total number of whole seconds.  Recall that for an input of 64000 milliseconds, there are 64 seconds.  Be sure to apply " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + " to the result of this operation so that 64500 and 64543.21 also result in 64.  Store the final answer in " + varNames[1] + ".";
	    	} else if(i % 5 === 1 || i % 5 === 3) {
	    		return "Display " + varNames[i - Math.round(i/3) - Math.trunc(i/12)] + ".";
	    	} else if(i === 2) {
	    		return "Apply the appropriate math operation on " + varNames[0] + " and the appropriate integer to convert to the " + textNames[2] + ".  Do NOT apply " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + ".  Store the final answer in " + varNames[2] + ".";
	    	} else if(i === 4) {
	    		return "Next, store the " + textNames[3] + " in the variable " + varNames[3] + ".";
	    	} else if(i === 5) {
	    		// Pop up with math calculations div hint, drag in (blank numbers = numbers/operations: Match 58 whole hours, 2 days : |58| |OP| |2| |OP| |#| = |10|)
	    		return "Apply the appropriate math operations on " + varNames[3] + " and " + varNames[1] + " and the appropriate integer to convert to the " + textNames[4] + ".  Store this result in " + varNames[4] + "."; // " remaining number of seconds.  For some examples:\n90 seconds = 1 whole minute & *30 remaining seconds* \n 130 seconds = 2 whole minutes & *10 remaining seconds*\n200 seconds = 3 whole minutes & *20 remaining seconds*\nConsider what you could do with the total number of seconds and number of whole minutes to get the remaining number of seconds.  Store the final answer in " + varNames[3] + ".  Do *NOT* include parentheses as you will not need them since the computer performs multiplication/division before addition/subtraction because they have higher precedence as they do in math (Parentheses first, exponentation next, multiplication/division next, addition/subtraction last).";
	    	} else if(i % 5 === 2 && i < blockNames.length - 1) {
	    		const setIndex = 3 * Math.trunc(i/5) + 2;
	    		const getIndex = 2*Math.trunc(i/7) + 3*Math.trunc(i/8);
	    		return "Get the " + textNames[setIndex] + " from the " + varNames[getIndex] + " and store the result in " + varNames[setIndex] + "."; 
	    	} else if(i % 5 === 0) {
	    		const setIndex = 3 * Math.trunc(i/5) + 1;
	    		const getIndex1 = 3 * Math.trunc(i/5);
	    		const getIndex2 = 2 * Math.trunc(i/5) - 1 + Math.trunc(i/15);
	    		return "Get the " + textNames[setIndex] + " from the " + varNames[getIndex2] + " and " + varNames[getIndex1] + " and store the result in " + varNames[setIndex] + "."; 
	    	} else if(i % 5 === 4) {
	    		const setIndex = 3 * Math.trunc((i+1)/5);
	    		const getIndex = 3 * Math.trunc((i+1)/5) - 1;
	    		return "Get the " + textNames[setIndex] + " from the " + varNames[getIndex] + " and store the result in " + varNames[setIndex] + ".";	    		
	  	  } else {
	    		return "Display the time in the form hour (0 - 23): minute (0 - 59): second (0 - 59).  Don't worry about including a leading 0, e.g., 2 : 4 : 5 is fine if the time is 2:04:05 AM.  Use commas in your " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " between the variables representing the numbers and the string literals ':' separating them.";
	    	}
	    },
	    () => {
	      // const typeInBlock0 = workspace.getAllBlocks().find(x => x.type === "type_in_get_start_num");
	      // const currentFieldValues = workspace.getAllBlocks().map(block => block.getFieldValue("EXP"))
	      // const typeInBlocks = blockNames.map(blockName => workspace.getAllBlocks().find(block => block.type === blockName));
	      // const typeInBlock = typeInBlocks.find(block => block && block.type)
	      //  .find((block, index) => block.type === blockNames[index] && blockTemplates[index].getErrorFeedback(block.getFieldValue("EXP")));
	      // if(typeInBlock) {
	      // 	const lineNumber = blockNames.indexOf(typeInBlock.type);
	      //  return "Problem with block on line " + (lineNumber + 1) + ": " + blockTemplates[lineNumber].getErrorFeedback();
	      // }
	      for(let lineNumber = 0; lineNumber < i+1; lineNumber++) {
	      	const feedback = blockTemplates[lineNumber].getErrorFeedback();
	      	if(feedback) {
	      		return "Problem with block on line " + (lineNumber + 1) + ": " + feedback;
	      	}
	      }

	      return "";
	    },
	    null
	  );
	}

	levelGenerator.addRunTask(
    helpMsgManager, 
    citf, 
    () => {
    	alert("✔✔✔ Congratulations!  You just completed Mission 13!  In the next mission, we pick up with Booleans where the only possible values are true and false.  As in the last mission, if you want to save the blocks from this mission, use the XML.  Until next time, phir milenge (See you again)!"); //and logic where we start programming");
    },
    d
  );

  return citf;
};