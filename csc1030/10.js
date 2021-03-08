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

const blockNames = ["type_in_get_start_num", "cs1030_10_type_in_step1", 
"cs1030_10_type_in_display_step1", "cs1030_10_type_in_step2", "cs1030_10_type_in_display_step2",
"cs1030_10_type_in_step3", "cs1030_10_type_in_display_step3", 
"cs1030_10_type_in_step4", "cs1030_10_type_in_display_step4", 
"cs1030_10_type_in_step5", "cs1030_10_type_in_display_step5"];


const lhSides = ["startNum", "step1", "step2", "step3", "step4", "step5"];
const ops = ["*", "+", "-", "/", "-"];
const rhSides = ["2", "100", "16", "2", "startNum"];

const blockTemplates = [];

const typeInGetStartNumBlock = new TypeInCodeBlock("type_in_get_start_num", {collapseWhenFinished: true});
let patternArr = 
  [{token: "let", type: "terminal"}, "startNum", "=", {token: "parseFloat", type: "terminal"}, "(", 
   {token: "GETINPUTBYASKING", type: "terminal"}, '(', '"', "Enter a number:", '"', ")", ")",
   {token: /^[;]*$/, type: "regexp"}];
// alert(T2C.MSG.currentLanguage.LANGUAGE_NAME);
const useLanguageObj = (T2C.MSG.currentLanguage === T2C.MSG.PY) ? T2C.MSG.PY : T2C.MSG.JS;
// const useLanguageObj = (document.getElementById("language") && document.getElementById("language").value === "py") ? T2C.MSG.PY : T2C.MSG.JS;
const startPatternStr = patternArr.slice(0, patternArr.length-1)
  .map(patternPart => patternPart.type === "terminal" ? useLanguageObj["TERMINAL_" + patternPart.token.toUpperCase()] : patternPart).join("");
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
// typeInGetStartNumBlock.addAllPossibleLanguageMatches(patternArr, errorFeedbackArr);
typeInGetStartNumBlock.addPossibleMatch(patternArr, errorFeedbackArr);
/*
typeInGetStartNumBlock.addPossibleMatch(
	patternArr.slice(0, patternArr.length-1),
	errorFeedbackArr.slice(0, errorFeedbackArr.length-1)
);
*/
// console.log("PM", typeInGetStartNumBlock.possibleMatches_);

typeInGetStartNumBlock.addToBlocks();

blockTemplates.push(typeInGetStartNumBlock);

for(let i = 1; i < blockNames.length; i++) {
	blockTemplates.push(new TypeInCodeBlock(blockNames[i], {collapseWhenFinished: true}));
  if(i % 2 === 0) {
  	// console.log(lhSides[i/2]);
    patternArr = [{token: "display", type: "terminal"}, "(", lhSides[i/2], ")", {token: /^[;]*$/, type: "regexp"}];
  } else {
  	// console.log(lhSides[(i-1)/2], ops[(i-1)/2], rhSides[(i-1)/2]);
  	patternArr = [{token: "let", type: "terminal"}, lhSides[(i+1)/2], "=", lhSides[(i-1)/2],
  	  ops[(i-1)/2], rhSides[(i-1)/2], {token: /^[;]*$/, type: "regexp"}];
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
  codeBlocks[0].setFieldValue(startPatternStr, "EXP");
  codeBlocks[1].setFieldValue(useLanguageObj.TERMINAL_LET + "step1 = 2 * startNum", "EXP");
  codeBlocks[2].setFieldValue(useLanguageObj.TERMINAL_DISPLAY + "(step1)", "EXP");
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
        	alert("Before you start this mission, the computer will be scanning your brain and revealing the meaning of life to you!  But answers don't come so easy.  First, you'll need to choose a number and remember it.  You'll also need to perform the following operations and remember the number after each step.  Remember your starting number though!\n1. Multiply your starting number by 2.\n2. Add 100 to the result of step 1.\n 3. Subtract 16 from the result of step 2.\n 4. Divide your number from step 3 by 2. \n 5. Finally, subtract the number you started with from the number from step 4 and you'll get the meaning of life according to The Hitchiker's Guide to the Galaxy.");
          if(!confirm("Was your number 42?")) {
          	const mistakeMessage = "There must be a mistake, let's walk you through the steps to show you that you should've gotten 42.  Enter the number you chose (or click cancel if you just want to use 0): ";
          	let numStr = prompt(mistakeMessage);
          	while(numStr !== null & isNaN(parseFloat(numStr))) {
          	  numStr = prompt("What you entered doesn't seem to be a number.  " + mistakeMessage);
          	}
          	num = parseFloat(numStr) || 0;
          	alert("So you started with " + num + ":\nStep 1 result (multiplying by 2): " + (num*2) + "\nStep 2 result (adding 100 to result of step 1): " + (num*2 + 100) + "\nStep 3 result (subtracting 16 from step2 result): " + (num*2 + 84) + "\nStep 4 result (dividing step3 result by 2): " + (num + 42) + "\nStep 5 result (subtracting number you started with): 42");
          }
          alert("Do you know how the trick worked?  Hint: The computer didn't actually read your mind.  It's just an algebra trick.  Remember in algebra, when we have an unknown, we use a variable.  Here, the unknown is the starting number.  If x represents it, then after doubling it in step1, we'll have 2x.  The point is we'll have to eventually get rid of x since we always want to wind up with the same number of 42 and you can verify that we perform the operations to do just that.  If you really want to amaze your friends, you can ask them to tell you a number first and then tell them to pick a different number (and not tell you), and then perform operations to wind up with that number they asked for.  For kuch mazaa (some fun), let's try that now:");

          let enterNumberMessage = "Enter your favorite number (or cancel for 0):"
        	let favoriteNumStr = prompt(enterNumberMessage);
        	let favoriteNum;
        	while(favoriteNumStr !== null & isNaN(parseFloat(favoriteNumStr))) {
        	  favoriteNumStr = prompt("What you entered doesn't seem to be a number.  " + enterNumberMessage); // 3x + 3f
        	}
        	favoriteNum = parseFloat(favoriteNumStr) || 0;
        	alert("So now choose any new number and remember this one.  \n1. Add " + (2*favoriteNum + 5) + " to your starting number.\n2. Multiply the result of step 1 by 3.\n 3. Subtract " + (3*favoriteNum + 15) + " from the result of step 2.\n 4. Divide your number from step 3 by 3. \n 5. Finally, subtract the number you started with from the number from step 4 and you should get the number you told the computer was your favorite!");
          alert("Now back to the mission at hand: you'll have the computer challenge the user to select a number and then show him/her the result after each step, which will predictably end in 42*.  (*Note: Due to the way the computer stores numbers, if you start with a number with a decimal point, the answer it produces may not be exactly 42.)  Just as in algebra, when we program and want to store something for later use, we can use a variable, and here we'd do the same for the starting number.  You will also store each step's result in a variable.  One final note is the use of " + T2C.MSG.currentLanguage.TERMINAL_PARSEFLOAT + ", which converts what the user enters from text to a number.  This is important because otherwise, JavaScript will for example treat 1 + \"1\" as the text \"11\" (join the two together as strings) instead of adding them together as numbers to get 2 while Python will simply give you an error, refusing to add a number and string.  See QuickMaths JavaScript meme.");
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
    "Type in the code to get the computer to calculate each step's result by performing the specified operation (+ for addition, - for subtraction, * for multiplcation, or / for division) on the previous step's value.  Name your variables step1, step2, step3, step4, and step5.  Be sure to display the result after each step.  The steps are as follows:\n 1. Multiply your starting number by 2.\n2. Add 100 to the result of step 1.\n 3. Subtract 16 from the result of step 2.\n 4. Divide your number from step 3 by 2. \n 5. Finally, subtract the number you started with from the number from step 4.",
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
      alert("✔✔✔ Congratulations!  You just completed Mission 10!  Next up will be a cool phone number trick.  One final note is that if you want to save the blocks from this mission, use the XML.  Until next time, phir milenge (See you again)!");
    },
    d
  );

  return citf;
};