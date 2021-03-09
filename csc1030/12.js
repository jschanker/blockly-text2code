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
	const blockNames = ["cs1030_12_type_in_get_ms", "cs1030_12_type_in_set_total_seconds", 
	"cs1030_12_type_in_display_total_seconds", "cs1030_12_type_in_set_total_minutes", 
	"cs1030_12_type_in_display_total_minutes", "cs1030_12_type_in_set_remaining_seconds", 
	"cs1030_12_type_in_display_remaining_seconds", "cs1030_12_type_in_set_total_hours", 
	"cs1030_12_type_in_display_total_hours", "cs1030_12_type_in_set_remaining_minutes", 
	"cs1030_12_type_in_display_remaining_minutes", "cs1030_12_type_in_set_total_days", 
	"cs1030_12_type_in_display_total_days", "cs1030_12_type_in_set_remaining_hours", 
	"cs1030_12_type_in_display_remaining_hours", "cs1030_12_type_in_display_time"];
	const blockTemplates = blockNames.map(blockName => (new TypeInCodeBlock(blockName, {collapseWhenFinished: true})));
  const varNames = ["milliseconds", "totalSeconds", "totalMinutes", "remainingSeconds", "totalHours", "remainingMinutes", "totalDays", "remainingHours"];
	const conversionFactors = ["1000", "60", "60", "24"];
	let codeBlocks = [];

	// const typeInGetMsBlock = new TypeInCodeBlock(blockNames[0], {collapseWhenFinished: true});
	let patternArrs = [
	  [{token: "let", type: "terminal"}, "milliseconds", "=", {token: "parseFloat", type: "terminal"}, "(", 
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
		// 1 => 1, 3 => 2, 7 => 4, 11 => 6
		// 1 => 0, 3 => 1, 7 => 2, 11 => 4 : (i-1)/2 - Math.trunc((i+1)/8)
		// 1 => 0, 3 => 1, 7 => 2, 11 => 3 : (i-1)/2 - Math.trunc(i/4)
		// 
	  if(i === 1 || i === 3 || i === 7 || i === 11) {
	  	patternArrs.push([
	      {token: "let", type: "terminal"}, varNames[(i+1)/2], "=",  
	      {token: "TRUNC", type: "terminal"}, '(', varNames[(i-1)/2 - Math.trunc((i+1)/8)], "/", 
	      conversionFactors[(i-1)/2 - Math.trunc(i/4)] , ")", {token: /^[;]*$/, type: "regexp"}
	    ]);
	    patternArrs.push([
	      {token: "let", type: "terminal"}, varNames[(i+1)/2], "=",  
	      varNames[(i-1)/2 - Math.trunc((i+1)/8)], "//", 
	      conversionFactors[(i-1)/2 - Math.trunc(i/4)] , {token: /^[;]*$/, type: "regexp"}
	    ]);
	  } else if(i === 5 || i === 9 || i === 13) {
	  	// 5 => 3, 9 => 5, 13 => 7
	  	// 5 => 1, 9 => 2, 13 => 4
	  	// 5 => 2, 9 => 4, 13 => 6
	  	// 5 => 1, 9 => 2, 13 => 3
	  	patternArrs.push([
	      {token: "let", type: "terminal"}, varNames[(i+1)/2], "=",  
	      varNames[(i-1)/4 + Math.trunc((i+3)/16)], "-", 
	      varNames[(i-1)/2], "*", conversionFactors[(i-1)/4], 
	      {token: /^[;]*$/, type: "regexp"}
	    ]);
	  } else if(i === 15) {
	  	patternArrs.push([
	      {token: "display", type: "terminal"}, "(", "remainingHours",  
	      ",", {token: /":"|':'/, tokenPartial: /"$|'$|":$|':$/, type: "regexp"}, ",", "remainingMinutes",  
	      ",", {token: /":"|':'/, tokenPartial: /"$|'$|":$|':$/, type: "regexp"}, ",", "remainingSeconds", ")",
	      {token: /^[;]*$/, type: "regexp"}
	    ]);
	  } else {
	  	patternArrs.push([{token: "display", type: "terminal"}, "(", varNames[i/2], ")", {token: /^[;]*$/, type: "regexp"}]);
	  }

	  if(patternArrs[0][6] === "*") {
	  	// + and * are commutative operations; allow swap of lhs and rhs
	  	const patternArrCp = patternArrs[0].slice();
	    // const lhs = lhSides[(i-1)/2];
	    patternArrCp[5] = patternArrs[0][7];
	    patternArrCp[7] = patternArrs[0][5];
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
  	if(i % 2 !== 0 && i > 1) {
		  levelGenerator.addRunTask(
		    helpMsgManager, 
		    citf, 
		    () => {
		    	if(i < 15) {
		    		alert("Directions to be added later");
		    		refreshBlocksAndAdd(i);
		    	} else {
		        alert("✔✔✔ Congratulations!  You just completed Mission 12!  In the next mission, you'll be learning about how Excel and other spreadsheet applications represents dates and times and how to break down the way you calculate the time in hours (0 - 23), minutes (0 - 59), and seconds (0 - 59) from a number of days in decimal after midnight into a series of steps using addition, subtraction, multiplication, and (integer) division that the computer (or some other person) could mindlessly follow to get the answer!  As in the last mission, if you want to save the blocks from this mission, use the XML.  Until next time, phir milenge (See you again)!");
		      }
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
		            alert("In JavaScript, Dates are represented by the number of milliseconds since January 1, 1970 at midnight UTC (Coordinated Universal Time), where 0 represents this time.  For example, 64,000 would correspond to Thu Jan 01 1970 00:01:04 GMT+0000 (Greenwich Mean Time), i.e., 64 seconds or 0 hours, 1 minute, and 4 seconds after midnight since there are 1000 milliseconds in a second.  In this mission, the user will input a number of milliseconds and you will output the time (ignoring leap seconds).  So let's start by asking the user for a number of milliseconds and storing the *numerical* value in a variable milliseconds, which we'll allow to be a non-whole number such as 64000.5.  Remember what you have to do to convert a string to a number?");
		          } else if(i === 1) {
		          	const integerDivisionMessage = // (T2C.MSG.currentLanguage === "PY") ? 
	        	      // "To do this, you'll need to know about integer division, which in Python 3 can be done using // instead of /.  So 14/5 = 2.8 but 14 // 5 = 2.  Here 2 is the quotient when you divide 14 by 5." :
	        	      "To do this, you'll need to know about " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + ", which can be used to convert a number to an integer (...,-3,-2,-1,0,1,2,3,...) by truncating or removing all digits to the right of the decimal point (e.g., " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + "(2.41) is 2).  When we are dividing 0 or some positive integer by a positive integer, we can use " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + " to perform integer division.  So " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + "(14/5) = " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + "(2.8) = 2, which is the quotient when you divide 14 by 5."
	              alert("Sahee (Right), so remembering that there are 1000 ms (milliseconds) in a second, let's get the total number of *whole* seconds contained in the entered number of ms.  So the answer for 64000, 64500, and 64543.21 should all be 64.  " + integerDivisionMessage + "  So using this information, can you do this?  Store the answer in totalSeconds.");
		          } else {
		          	alert("Message forthcoming");
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
	    		return "Ask the user for a number of milliseconds, convert the input to a number, and store it in a variable named " + varNames[0] + ".";
	    	} else if(i === 1) {
	    		return "Apply the appropriate math operation on " + varNames[0] + " and the appropriate integer to convert to the total number of whole seconds.  Recall that for an input of 64000 milliseconds, there are 64 seconds.  Be sure to apply " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + " to the result of this operation so that 64500 and 64543.21 also result in 64.  Store the final answer in " + varNames[1] + ".";
	    	} else if(i % 2 === 0) {
	    		return "Display " + varNames[i/2] + ".";
	    	} else if(i === 3) {
	    		return "Apply the appropriate math operation on " + varNames[1] + " and the appropriate integer to convert to the total number of whole minutes.  For some examples, 90, 130, and 200 seconds, the answers should be 1, 2, and 3 minutes, respectively.  As in the previous conversion, be sure to apply " + T2C.MSG.currentLanguage.TERMINAL_TRUNC + " to the result of this operation so that you get whole numbers in each case.  Store the final answer in " + varNames[2] + ".";
	    	} else if(i === 5) {
	    		return "Apply the appropriate math operations on " + varNames[1] + " and " + varNames[2] + " with the appropriate integer to convert to the remaining number of seconds.  For some examples:\n90 seconds = 1 whole minute & *30 remaining seconds* \n 130 seconds = 2 whole minutes & *10 remaining seconds*\n200 seconds = 3 whole minutes & *20 remaining seconds*\nConsider what you could do with the total number of seconds and number of whole minutes to get the remaining number of seconds.  Store the final answer in " + varNames[3] + ".  Do *NOT* include parentheses as you will not need them since the computer performs multiplication/division before addition/subtraction because they have higher precedence as they do in math (Parentheses first, exponentation next, multiplication/division next, addition/subtraction last).";
	    	} else {
	    		return "Directions to be added later.";
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

  return citf;
};