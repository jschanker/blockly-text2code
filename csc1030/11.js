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

const blockNames = ["cs1030_11_type_in_get_first3", "cs1030_11_type_in_step1", 
"cs1030_11_type_in_display_step1", "cs1030_11_type_in_step2", "cs1030_11_type_in_display_step2",
"cs1030_11_type_in_step3", "cs1030_11_type_in_display_step3",
"cs1030_11_type_in_get_last4", 
"cs1030_11_type_in_step4", "cs1030_11_type_in_display_step4",
"cs1030_11_type_in_step5", "cs1030_11_type_in_display_step5",
"cs1030_11_type_in_step6", "cs1030_11_type_in_display_step6",
"cs1030_11_type_in_step7", "cs1030_11_type_in_display_step7"];

const lhSides = ["first3", "step1", "step2", "step3", "step4", "step5", "step6", "step7"];
const ops = ["*", "+", "*", "+", "+", "-", "/"];
const rhSides = ["80", "3", "250", "last4", "last4", "750", "2"];

const blockTemplates = [];

const typeInGetFirst3NumBlock = new TypeInCodeBlock("cs1030_11_type_in_get_first3", {collapseWhenFinished: true});
let patternArr = 
  [{token: "let", type: "terminal"}, "first3", "=", {token: "parseInt", type: "terminal"}, "(", 
   {token: "GETINPUTBYASKING", type: "terminal"}, '(', {token: /^"[^"]*$|^'[^']*$|^"[^"]*first 3[^"]*"|^'[^']*first 3[^']*'/i, type: "regexp"}, ")", ")",
   {token: /^[;]*$/, type: "regexp"}];

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
// typeInGetStartNumBlock.addAllPossibleLanguageMatches(patternArr, errorFeedbackArr);
typeInGetFirst3NumBlock.addPossibleMatch(patternArr, errorFeedbackArr);
/*
typeInGetStartNumBlock.addPossibleMatch(
	patternArr.slice(0, patternArr.length-1),
	errorFeedbackArr.slice(0, errorFeedbackArr.length-1)
);
*/
// console.log("PM", typeInGetStartNumBlock.possibleMatches_);

typeInGetFirst3NumBlock.addToBlocks();

blockTemplates.push(typeInGetFirst3NumBlock);

// switch to JavaScript: should call function from mobile.js to do this
if(document.getElementById("language")) {
  document.getElementById("language").value = "js";
}
T2C.MSG.currentLanguage = T2C.MSG.JS;

for(let i = 1; i < blockNames.length; i++) {
	blockTemplates.push(new TypeInCodeBlock(blockNames[i], {collapseWhenFinished: true}));
  if(i === 7) {
    patternArr = 
      [{token: "let", type: "terminal"}, "last4", "=", {token: "parseInt", type: "terminal"}, "(", 
      {token: "GETINPUTBYASKING", type: "terminal"}, '(', {token: /^"[^"]*$|^'[^']*$|^"[^"]*last 4[^"]*"|^'[^']*last 4[^']*'/i, type: "regexp"}, ")", ")",
      {token: /^[;]*$/, type: "regexp"}];
  } else if(i < 7 && (i % 2 === 0)) {
    patternArr = [{token: "display", type: "terminal"}, "(", lhSides[i/2], ")", {token: /^[;]*$/, type: "regexp"}];
  } else if(i > 7 && (i % 2 !== 0)) {
    patternArr = [{token: "display", type: "terminal"}, "(", lhSides[(i-1)/2], ")", {token: /^[;]*$/, type: "regexp"}];
  } else if(i < 7 && (i % 2 !== 0)) {
    patternArr = [{token: "let", type: "terminal"}, lhSides[(i+1)/2], "=", lhSides[(i-1)/2],
      ops[(i-1)/2], rhSides[(i-1)/2], {token: /^[;]*$/, type: "regexp"}];
  } else {
  	patternArr = [{token: "let", type: "terminal"}, lhSides[i/2], "=", lhSides[(i-2)/2],
  	  ops[(i-2)/2], rhSides[(i-2)/2], {token: /^[;]*$/, type: "regexp"}];
  }

  blockTemplates[i].addPossibleMatch(patternArr, errorFeedbackArr.slice(0, patternArr.length));
  if(patternArr[4] === "+" || patternArr[4] === "*") {
  	// + and * are commutative operations; allow swap of lhs and rhs
  	const patternArrCp = patternArr.slice();
    // const lhs = lhSides[(i-1)/2];
    patternArrCp[3] = patternArr[5];
    patternArrCp[5] = patternArr[3];
    blockTemplates[i].addPossibleMatch(patternArrCp, errorFeedbackArr.slice(0, patternArr.length));
  }

  /*
  blockTemplates[i].addPossibleMatch(
    patternArr.slice(0, patternArr.length - 1),
    errorFeedbackArr.slice(0, patternArr.length - 1)
  );
  */
  blockTemplates[i].addToBlocks();
}

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const levelGenerator = new LevelGenerator();
  const helpMsgManager = levelGenerator.createStandardHelpMessageManager();
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  const workspace = ws || Blockly.getMainWorkspace();
  const toolboxManager = new ToolboxManager(workspace);
  workspace.clear();
  toolboxManager.clearToolbox();
  const codeBlocks = blockNames.map(blockName => newBlock(workspace, blockName));
  codeBlocks.slice(0, codeBlocks.length-1)
    .forEach((block, index) => setNextBlock(block, codeBlocks[index+1]));

  // codeBlocks.push(newBlock(workspace, "type_in_get_start_num");

  workspace.setScale(1);
  workspace.getAllBlocks().forEach(block => block.setMovable(false));
  refreshWorkspace(workspace);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
        	let num;
        	alert("Before you start this mission, the computer will again be scanning your brain, this time so it can contact you whenever it wants!  What do I mean?  Well to answer this, you may want to get your (computer) calculator ready and follow the below steps:\nEnter the first three digits of your 7-digit phone number.\n1. Multiply this number by 80.\n2. Add 3 to the result of step 1.\n 3. Multiply the result of step 2 by 250.\n 4. Add the last 4 digits of your phone number to the result of step 3. \n 5. Add the last 4 digits of your phone number (again), this time to the result of step 4 \n 6. Subtract 750 from the result of step 5. \n 7. Finally, divide the number from step 6 by 2.  Do you recognize this number?");
          alert("Do you know how the computer managed to get your full phone number?  As in the last mission, it's just an algebra trick, but this time we use two variables x (first3) and y (last4) to represent the first 3 and last 4 digits of the user's 7-digit number.  Try to verify that this works in general; this time your final expression will contain 2 variables instead of a final number 42 and the key to understanding this is that multiplying numbers by positive powers of 10 such as 10, 100, 1000, 10000, etc. add that many 0's to the end of the number (e.g., 42 * 10 cubed or 42 * 1000 = 42000, which can be thought of as shifting the digits from 42 3 places left: 10^3 * (4*10+2) = 4*10^4+2*10^3).");
          alert("Now back to the mission at hand: as with the previous mission, you'll prompt the user for the first 3 digits and in between steps 3 and 4, prompt again, this time for the last 4 digits of his/her 7-digit phone number.  During each other step, you'll store the calculations along the way in variables and display the result after each step.  This time, you'll use " + T2C.MSG.currentLanguage.TERMINAL_PARSEINT + " instead of " + T2C.MSG.currentLanguage.TERMINAL_PARSEFLOAT + " on each input, which converts what the user enters from text to a number.  The difference between the two is that the first is used to convert the string to an integer, mainly a whole number or a negative whole number: ..., -3, -2, -1, 0, 1, 2, 3, ... whereas the second is for numbers that may contain a decimal point such as 3.14.  The first three digits and last 4 digits of a phone number should both be integers whereas for the number trick, we allowed non-integer numbers, which is why we used " + T2C.MSG.currentLanguage.TERMINAL_PARSEFLOAT + " instead.");
        }
      }
    )
  );

  levelGenerator.addHelpMessageTask(
    citf,
    helpMsgManager,
    () => {
    	return blockNames.every((blockName, index) => {
    		const block = workspace.getAllBlocks().find(block => block.type === blockName);
    		return blockTemplates[index].hasFullMatch(block.getFieldValue("EXP"), false);
    	})
      return workspace.getAllBlocks()
        .every((block, index) => block.type === blockNames[index] && blockTemplates[index].hasFullMatch(block.getFieldValue("EXP"), false));
    },
    "Type in the code to get the computer to ask for the first three digits of the user's number and store it in the variable first3.  Be sure that the message contains 'first 3' with a space.  Then calculate each step's result by performing the specified operation (+ for addition, - for subtraction, * for multiplcation, or / for division) on the previous step's value.  In between steps 3 and 4, ask for the user's phone number's last 4 digits, storing the result in last4 and having a message that contains 'last 4' (with the space).  In each case, be sure to use " + T2C.MSG.currentLanguage.TERMINAL_PARSEINT + " on the input before storing the value in the variable.  Name your other variables step1, step2, step3, step4, step5, step6, and step 7.  Be sure to display the result after each step.  The steps are as follows:\n \nEnter the first three digits of your 7-digit phone number.\n1. Multiply this number by 80.\n2. Add 3 to the result of step 1.\n 3. Multiply the result of step 2 by 250.\n Enter the last 4 digits of your 7-digit phone number. \n 4. Add the last 4 digits of your phone number to the result of step 3. \n 5. Add the last 4 digits of your phone number (again), this time to the result of step 4 \n 6. Subtract 750 from the result of step 5. \n 7. Finally, divide the number from step 6 by 2.",
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
      for(let lineNumber = 0; lineNumber < blockTemplates.length; lineNumber++) {
      	const feedback = blockTemplates[lineNumber].getErrorFeedback();
      	if(feedback) {
      		return "Problem with block on line " + (lineNumber + 1) + ": " + feedback;
      	}
      }

      return "";
    },
    null
  );

  const d = levelGenerator.createPointer();
  document.body.appendChild(d);

  levelGenerator.addRunTask(
    helpMsgManager, 
    citf, 
    () => {
      alert("✔✔✔ Congratulations!  You just completed Mission 11!  In the next mission, you'll be learning about how JavaScript represents dates and times and how to break down the way you calculate the time in hours (0 - 23), minutes (0 - 59), and seconds (0 - 59) from a given number of milliseconds after midnight into a series of steps using addition, subtraction, multiplication, and (integer) division that the computer (or some other person) could mindlessly follow to get the answer for any number of milliseconds!  As in the last mission, if you want to save the blocks from this mission, use the XML.  Until next time, phir milenge (See you again)!");
    },
    d
  );

  return citf;
};