import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace, newBlock, setValueInput, setFieldValue} from "../core/block_utility_functions.js";
import ToolboxManager from "../core/toolbox_manager.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
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

function genericTerminalErrorMsg(displayFunc, terminal) {
  displayFunc("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] + ".");
}

/**
 * attempts to match s against matchArr, producing appropriate errors
 * @param {string} s the string to parse
 * @param {!Array.<string|{token: string, type: string}>} matchArr 
 * @param {!Array.<Function>} errorFunctionArr - errorFunction[i] returns error message for 
 * matchArr[i]
 * @returns {match: Array.<string>, error: boolean, errorMsg: string} match is the array of matches up
 * up to the first unsuccessful match, if any; 
 * error is true exactly when there was an unsuccessful match;
 * errorMsg is the error message from errorFunction[i] where i is the first index of an 
 * unsuccessful match, if any or "" otherwise
 */

function matchStatement(s, matchArr, errorFunctionArr) {
  let matchResultArr = [];
  let remainingText = s;
  let processedMatch = "";
  let matchResult;
  let hasError = false;
  let i = -1;

  while(i < matchArr.length-1 && remainingText && !hasError) {
    ++i;
    if(typeof matchArr[i] === "string") {
      if(remainingText.length < matchArr[i].length && matchArr[i].startsWith(remainingText)) {
        matchResult = remainingText;
        remainingText = "";
      } else if(remainingText.startsWith(matchArr[i])) {
        matchResult = matchArr[i];
        remainingText = remainingText.substring(matchArr[i].length).trim();
      } else {
        hasError = true;
      }
    } else if(matchArr[i].type === "terminal") {
      const result = getAfterTerminal(remainingText.trim(), matchArr[i].token);
      if(result) {
        matchResult = result.terminal;
        remainingText = result.remaining;
      } else {
        hasError = true;
      }
    } else if(matchArr[i].type === "regexp") {
      const result = remainingText.trim().match(matchArr[i].token);
      // console.log("REG", result, remainingText.trim())
      if(result) {
        matchResult = result[0];
        remainingText = remainingText.substring(result[0].length);
      } else {
        hasError = true;
      }
    } else {
      // unknown type
      hasError = true;
    }

    if(!hasError) {
      matchResultArr.push(matchResult);
    }
  }

  // displayMessage("") should not be part of non-error
  return {match: matchResultArr, error: hasError,
    errorMsg: hasError ? errorFunctionArr[i](matchResultArr, remainingText) : 
    (displayMessage("") || "")};
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

Blockly.Python['type_in_get_email_input'] = Blockly.JavaScript['type_in_get_email_input'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_email_input'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "email", "=", {token: "GETINPUTBYASKING", type: "terminal"}, '(', 
      {token: /^"[^"]*$|^'[^']*$|^"[^"]*e[-]?mail[^"]*"|^'[^']*e[-]?[^']*mail'/i, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring email to represent the fact that it's storing the entered e-mail address."),
        () => displayMessage("Remember to include an = after the variable email you're declaring to set it to the entered e-mail address."), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETINPUTBYASKING"), 
        (matchResultArr) => displayMessage("You're missing an open parenthesis after " + matchResultArr[3] + "."),
        () => displayMessage("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.  Be sure it also includes e-mail in it so the user knows to enter an e-mail."),
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for " + matchResultArr[3] + ".")
      ]);

    return result.error ? result.match.join("") : exp;
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
            displayMessage("Try checking what you entered again for mistakes.");
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


let clickedLoadButtonLast = false;
let clickedSaveButtonLast = false;
let clickedLoadXMLButtonLast = false;
let clickedSaveXMLButtonLast = false;
let xmlText;

function displayMessage(msg, erasePrevious=true) {
  let alertDisplay = document.getElementById("alert-display");
  if(!alertDisplay) {
    alertDisplay = document.createElement("div");
    alertDisplay.id = "alert-display";
    alertDisplay.style.fontSize = "small";
    alertDisplay.style.fontWeight = "bold";
    alertDisplay.style.borderColor = "#000";
    alertDisplay.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    alertDisplay.style.color = "#f00";
    alertDisplay.style.position = "absolute";
    alertDisplay.style.zIndex = "1050";
    alertDisplay.style.width = "98%";
    alertDisplay.style.minHeight = "50px";
    alertDisplay.style.left = "0";
    alertDisplay.style.bottom = "0";
    alertDisplay.style.textAlign = "left";
    alertDisplay.style.padding = "1%";
    document.body.appendChild(alertDisplay);
  }
  if(erasePrevious) {
    alertDisplay.innerText = msg;
  } else {
    alertDisplay.innerText += msg;
  }
}

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  // alert("In previous missions, you'd use " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " to get a *single* character at a given numerical position in a string.  In this mission, you'll be using a new block " + T2C.MSG.EN["TERMINAL_GETTEXTFROM"] + " to display all characters between given starting and ending numerical positions.");
  const workspace = ws || Blockly.getMainWorkspace();
  const toolboxManager = new ToolboxManager(workspace);

  workspace.setScale(1);
  refreshWorkspace(workspace);
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
        new ParallelAnimation([
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

/*
  const initialBlocks = ["t2c_text_getsubstring", "text_print", "variables_get", "math_number", "text", "variables_set"];
  // set up level

  toolboxManager.clearToolbox();
  initialBlocks.forEach((blockType, index) => {
    toolboxManager.createToolboxBlock(workspace, blockType, false);
    workspace.options.maxInstances[blockType] = index === 3 ? 2 : 1;
  });

  workspace.clear();

  const initialBlocks = ["type_in_get_email_input"];
  // set up level
  clearToolbox(workspace);
  initialBlocks.forEach(blockType => {
    createToolboxBlock(workspace, blockType, false);
    //workspace.options.maxInstances = ;
    workspace.options.maxInstances[blockType] = 1;
  });

  workspace.clear();
*/
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          // alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          // restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          // hideOutputAndCodeContainers();
          // clearToolbox(workspace);
          // workspace.updateToolbox(document.getElementById("toolbox"));
          alert("THIS MISSION IS IN PROGRESS.  In this mission, you will get all of the text between the @ and the . in an e-mail address.  As a warm-up exercise, you'll get everything after the @ to start.")
          workspace.clear();
          toolboxManager.clearToolbox();
          toolboxManager.createToolboxBlock("type_in_get_email_input");
          workspace.options.maxInstances["type_in_get_email_input"] = 1;
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().find(block => block.type === "text" && 
          ((block.getFieldValue("TEXT") || "").toLowerCase().indexOf("email") !== -1 || (block.getFieldValue("TEXT") || "").toLowerCase().indexOf("e-mail") !== -1));
        const textInput1 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text0);
        const variablesSet2 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === textInput1 && block.getField("VAR").getText() === "email");
        return text0 && textInput1 && variablesSet2;
      },
      new HelpMessageDirection(() => {
        return "So now let's start applying these ideas to get the text appearing between the first @ and . in an e-mail address (e.g., google from coolcoder@google.com or mail from expertsoftwareengineer@mail.co.uk).  First, let's ask the user for an e-mail address and store it in a variable email.  Drag in the type-in-code block and type in the necessary code.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
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
          const toolboxBlocks = ["t2c_text_getsubstring", "t2c_text_length", "text_print", "variables_get", "math_number", "text", "text_input", "variables_set"]
          const maxBlocks = [1, 1, 1, 2, 1, 1, 1, 1];
          const assembledBlock = workspace.getAllBlocks().find(block => block.type === "variables_set");
          toolboxManager.clearToolbox();
          toolboxBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = maxBlocks[index];
          });
          if(assembledBlock) {
            assembledBlock.setCollapsed(true);
          }
          alert("✔ Nice, so as a warm-up and review, let's start by displaying everything that appears *after* the @ in any e-mail address where the text before the @ is exactly 9 characters, such as coolcoder@gmail.com using the " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " and " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " blocks.  We'll use a specific number for the starting position so it can't work in general, but we'll fix that soon by adding the new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " block.");
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "email");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 10);
        const t2cTextGetsubstring4 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring" && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber2 && block.getInputTargetBlock("AT2") === t2cTextLength1);
        const textPrint5 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring4);
        const text6 = workspace.getAllBlocks().find(block => block.type === "text" && 
          ((block.getFieldValue("TEXT") || "").toLowerCase().indexOf("email") !== -1 || (block.getFieldValue("TEXT") || "").toLowerCase().indexOf("e-mail") !== -1));
        const textInput7 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text6);
        const variablesSet8 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint5 && block.getInputTargetBlock("VALUE") === textInput7 && block.getField("VAR").getText() === "email");
        return variablesGet0.length === 2 && t2cTextLength1 && mathNumber2 && t2cTextGetsubstring4 && textPrint5 && text6 && textInput7 && variablesSet8;
      },
      new HelpMessageDirection(() => {
        const text6 = workspace.getAllBlocks().find(block => block.type === "text" && 
          ((block.getFieldValue("TEXT") || "").toLowerCase().indexOf("email") !== -1 || (block.getFieldValue("TEXT") || "").toLowerCase().indexOf("e-mail") !== -1));
        const textInput7 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text6);
        const variablesSet8 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getInputTargetBlock("VALUE") === textInput7 && block.getField("VAR").getText() === "email");
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length");
        const mathNumber2 = workspace.getAllBlocks().find(block => block.type === "math_number");
        const t2cTextGetsubstring4 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring");
        const textPrint5 = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print");

        const emailSampleInput = "coolcoder@gmail.com";
      
        if(variablesGet0.find(block => block.getField("VAR").getText() !== "email")) {
            return "Make sure the variable get blocks are both set to email so they refer to the one storing the entered e-mail.";
        }

        if(variablesSet8 && variablesSet8.getField("VAR").getText() !== "email") {
            return "Make sure the name of the variable storing the user's input stays email.";
        }

        if(t2cTextGetsubstring4) {
          if(variablesGet0.indexOf(t2cTextGetsubstring4.getInputTargetBlock("AT1")) !== -1) {
            return "You placed the email block in the starting position of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  But email stores a string, not a number; what would it mean to start extracting text at position *NUMBER* coolcoder@gmail.com?";
          }
          if(variablesGet0.indexOf(t2cTextGetsubstring4.getInputTargetBlock("AT2")) !== -1) {
            return "You placed the email block in the ending position of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  But email stores a string, not a number; what would it mean to stop extracting text at position *NUMBER* coolcoder@gmail.com?";
          }
          if(t2cTextLength1 && t2cTextGetsubstring4.getInputTargetBlock("AT1") === t2cTextLength1) {
            return "You placed the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " block in the starting position of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  But for say " + emailSampleInput + ", the last position is at " + (emailSampleInput.length-1).toString() + " and its length is " + emailSampleInput.length + ".  You certainly don't want to start extracting text at position 19, which doesn't even exist!";
          }
          if(mathNumber2 && t2cTextGetsubstring4.getInputTargetBlock("AT2") === mathNumber2) {
            return "You cannot use a *specific* number for the ending position if you don't know how long the e-mail address is.  Change the block in the last position of the " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " block, accordingly.";
          }
          if(mathNumber2 && t2cTextGetsubstring4.getInputTargetBlock("AT1") === mathNumber2) {
            const startIndex = mathNumber2.getFieldValue("NUM");
            if(startIndex === 11) {
              return "The given starting position is incorrect.  Remember that the initial character starts at position (index) 0 and unlike the given ending position to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ", the computer starts extracting text from the first position number you give it.";
            }
            if(startIndex === 9) {
              return "The given starting position is incorrect.  Remember that you want to start extracting text *after* the @ and unlike the given ending position to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ", the computer starts extracting text from the first position number you give it.";
            }
            if(startIndex === "coolcoder@gmail.com".length) {
              return "The first number given to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " is the starting position, not the ending one.";
            }
            if(startIndex !== 10) {
              return "Incorrect number for the starting position.  Please try recounting the characters from the beginning of the string, starting from 0 until you get to the character after the @ sign.";
            }
          }
        }

        if(textPrint5 && t2cTextGetsubstring4 && textPrint5.getInputTargetBlock("TEXT") !== t2cTextGetsubstring4) {
          return "As with the last exercise, you'll want to show a substring of the e-mail so the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " should be placed in " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + ".";
        }

        if(textPrint5 && variablesSet8 && textPrint5.getNextBlock() === variablesSet8) {
          return "Since instructions are run from top to bottom, you can't display a substring of email before the user enters it!";
        }

        if(textPrint5 && textPrint5.getPreviousBlock() === null) {
          return "Be sure to attach the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " block.";
        }

        return "Drag in and assemble the blocks of code so that the computer displays everything that appears *after* the @ in any entered e-mail address where the text before the @ is exactly 9 characters, such as coolcoder@gmail.com using the " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " and " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " blocks.  For this part, use a specific number for the starting position.";
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
          const toolboxBlocks = ["t2c_text_indexof", "math_arithmetic_basic", "text",  "variables_get", "math_number", "t2c_text_getsubstring", "t2c_text_length", "text_print", "text_input", "variables_set"]
          const maxBlocks = [1, 1, 2, 3, 1, 1, 1, 1, 1, 1];
          const assembledBlocks = workspace.getAllBlocks().filter(block => block.type === "variables_get" || block.type === "t2c_text_length");
          alert("✔ Good, so did you type in coolcoder@google.com or some other e-mail address with 9 characters before the @, or did you enjoy breaking the rules and watching it fail?!!  Well, now it's time to make it work for those troublemakers so long as they're kind enough to enter an @.\nTo do this, we'll use our new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " and will need some arithmetic as well.");//  HINT: If you didn't know what email was but you were able to ask for the position number of whatever character(s) you want, what position would you ask for?  Once you had that position, what math operation would you use to get the starting position of the string after the @?  Make sure your calculations work on coolcoder@google.com, jdoe@foo.edu, or any other e-mail address!");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          toolboxManager.clearToolbox();
          toolboxBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = maxBlocks[index];
          });
          assembledBlocks.forEach(block => block.setCollapsed(true));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "email");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const text3 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == "@");
        const t2cTextIndexof5 = workspace.getAllBlocks().find(block => block.type === "t2c_text_indexof" && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getInputTargetBlock("FIND") === text3);
        const mathArithmeticBasic6 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && (block.getInputTargetBlock("A") === t2cTextIndexof5 && block.getInputTargetBlock("B") === mathNumber2 || 
          block.getInputTargetBlock("B") === t2cTextIndexof5 && block.getInputTargetBlock("A") === mathNumber2) && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring" && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathArithmeticBasic6 && block.getInputTargetBlock("AT2") === t2cTextLength1);
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring8);
        const text10 = workspace.getAllBlocks().find(block => block.type === "text" && 
          ((block.getFieldValue("TEXT") || "").toLowerCase().indexOf("email") !== -1 || (block.getFieldValue("TEXT") || "").toLowerCase().indexOf("e-mail") !== -1));
        const textInput11 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text10);
        const variablesSet12 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint9 && block.getInputTargetBlock("VALUE") === textInput11 && block.getField("VAR").getText() === "email");
        return variablesGet0.length === 3 && t2cTextLength1 && mathNumber2 && text3 && t2cTextIndexof5 && mathArithmeticBasic6 && t2cTextGetsubstring8 && textPrint9 && text10 && textInput11 && variablesSet12;
      },
      new HelpMessageDirection(() => {
        const text10 = workspace.getAllBlocks().find(block => block.type === "text" && 
          ((block.getFieldValue("TEXT") || "").toLowerCase().indexOf("email") !== -1 || (block.getFieldValue("TEXT") || "").toLowerCase().indexOf("e-mail") !== -1));
        const textInput11 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text10);
        const variablesSet12 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getInputTargetBlock("VALUE") === textInput11 && block.getField("VAR").getText() === "email");
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length");
        const mathNumber2 = workspace.getAllBlocks().find(block => block.type === "math_number");
        const text3 = workspace.getAllBlocks().find(block => block.type === "text" && block !== text10); // check that field value is @
        const t2cTextIndexof5 = workspace.getAllBlocks().find(block => block.type === "t2c_text_indexof");
        const mathArithmeticBasic6 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring");
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print"));

        const emailSampleInput = "coolcoder@gmail.com";

        if(t2cTextIndexof5) {
          if(text3 && t2cTextIndexof5.getInputTargetBlock("VALUE") === text3) {
            return "The first space in the " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " block is for the string you want to search through (proverbial haystack), not the string you're looking for (proverbial needle) so you'll want to move the text block, accordingly.";
          }
          if(variablesGet0.indexOf(t2cTextIndexof5.getInputTargetBlock("FIND")) !== -1) {
            return "The second space in the " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " block is for the string you're looking for (proverbial needle), not the one you want to search through (proverbial haystack) so you'll want to move the variable get block, accordingly.";
          }
          if(text3 && t2cTextIndexof5.getInputTargetBlock("FIND") === text3) {
            const needle = text3.getFieldValue("TEXT") || "";
            if(needle === ".") {
              return "You don't know how many characters there may be before the period after the at sign as this can depend on the e-mail address so this won't work for calculating the starting position.";
            }
            if(needle.toLowerCase() === "at") {
              return "The literal 2-character string " + needle.toLowerCase() + " will not necessarily appear in the address.  You don't need to use letters for the needle (string your searching for); you can use symbols as well.";
            }
            if(needle !== "@") {
              return "It's possible that " + needle + " won't necessarily appear in an e-mail address, or at least it won't help you calculate the desired starting position.  Try something else.";
            }
            if(t2cTextGetsubstring8 && t2cTextGetsubstring8.getInputTargetBlock("AT1") === t2cTextIndexof5) {
              return "You'll need to perform a math operation on the position number of the @ since if you start extracting text at the position of the @, the string you get back will always start with an @!  For example, for " + emailSampleInput + ", you'd start extracting text at position " + emailSampleInput.indexOf("@") + ", which means you'd get " + emailSampleInput.substring(emailSampleInput.indexOf("@")) + ".  What do you do with this number if you'd want to start at position number " + (emailSampleInput.indexOf("@")+1).toString() + ", the position of the " + emailSampleInput.charAt(emailSampleInput.indexOf("@")+1) + " immediately after the @ instead?";
            }
          }
        }

        if(mathArithmeticBasic6) {
          if(variablesGet0.find(block => block === mathArithmeticBasic6.getInputTargetBlock("A") || block === mathArithmeticBasic6.getInputTargetBlock("B"))) {
            return "The variable email holds a string such as " + emailSampleInput + ", not a number so what would it mean to perform a math operation on it?  Remove it from the arithmetic block, accordingly.";
          }
          if(t2cTextIndexof5 && mathNumber2 && (mathArithmeticBasic6.getInputTargetBlock("A") === t2cTextIndexof5 && mathArithmeticBasic6.getInputTargetBlock("B") === mathNumber2 || 
            mathArithmeticBasic6.getInputTargetBlock("B") === t2cTextIndexof5 && mathArithmeticBasic6.getInputTargetBlock("A") === mathNumber2)) {
            const num = mathNumber2.getFieldValue("NUM");
            const op = mathArithmeticBasic6.getFieldValue("OP");
            if(mathArithmeticBasic6.getInputTargetBlock("B") === mathNumber2 && op === "MINUS" && num === -1) {
              return "Although you can subtract -1, it's clearer to add 1 so switch the operation to addition and the number from -1 to 1.";
            }
            if(mathArithmeticBasic6.getInputTargetBlock("B") === mathNumber2 && op === "MINUS" && num === 1) {
              return "Subtracting 1 from the answer will move your position back one.  Do you want to start extracting text 1 place before?";
            }
            if(op !== "ADD" || num !== 1) {
              return "Using your given operation and number, the starting position you're calculating does not seem to work for every e-mail address in general.  Try (re)examining some e-mail addresses and the specific starting positions of the calculations for these examples to help you see your error.";
            }
          }
        }
      
        if(variablesGet0.find(block => block.getField("VAR").getText() !== "email")) {
            return "Make sure the variable get blocks are all set to email so they refer to the one storing the entered e-mail.";
        }

        if(variablesSet12 && variablesSet12.getField("VAR").getText() !== "email") {
            return "Make sure the name of the variable storing the user's input stays email.";
        }

        if(t2cTextGetsubstring8) {
          if(variablesGet0.indexOf(t2cTextGetsubstring8.getInputTargetBlock("AT1")) !== -1) {
            return "You placed the email block in the starting position of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  But email stores a string, not a number; what would it mean to start extracting text at position *NUMBER* coolcoder@gmail.com?";
          }
          if(variablesGet0.indexOf(t2cTextGetsubstring8.getInputTargetBlock("AT2")) !== -1) {
            return "You placed the email block in the ending position of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  But email stores a string, not a number; what would it mean to stop extracting text at position *NUMBER* coolcoder@gmail.com?";
          }
          if(t2cTextLength1 && t2cTextGetsubstring8.getInputTargetBlock("AT1") === t2cTextLength1) {
            return "You placed the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " block in the starting position of the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " block.  But for say " + emailSampleInput + ", the last position is at " + (emailSampleInput.length-1).toString() + " and its length is " + emailSampleInput.length + ".  You certainly don't want to start extracting text at position 19, which doesn't even exist!";
          }
          if(mathNumber2 && t2cTextGetsubstring8.getInputTargetBlock("AT2") === mathNumber2) {
            return "You cannot use a *specific* number for the ending position if you don't know how long the e-mail address is.  Change the block in the last position of the " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " block, accordingly.";
          }
        }

        if(textPrint9 && t2cTextGetsubstring8 && textPrint9.getInputTargetBlock("TEXT") !== t2cTextGetsubstring8) {
          return "As with the last exercise, you'll want to show a substring of the e-mail so the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " should be placed in " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + ".";
        }

        if(textPrint9 && variablesSet12 && textPrint9.getNextBlock() === variablesSet12) {
          return "Since instructions are run from top to bottom, you can't display a substring of email before the user enters it!";
        }

        if(textPrint9 && textPrint9.getPreviousBlock() === null) {
          return "Be sure to attach the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " block.";
        }

        return "Use the new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " and arithmetic blocks in the place of the starting position of the specific number 10 you currently have in the " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " block so that the computer displays everything that appears *after* the @ in any entered e-mail address, regardless of how long the text is before the @.\nHINT: If you didn't know what email was but you were able to ask for the position number of whatever character(s) you want, what position would you ask for?  Once you had that position, what math operation would you use to get the starting position of the string after the @?  Make sure your calculations work on coolcoder@google.com, jdoe@foo.edu, or any other e-mail address!";
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
          const toolboxBlocks = ["t2c_text_indexof", "math_arithmetic_basic", "text",  "variables_get", "math_number", "t2c_text_getsubstring", "t2c_text_length", "text_print", "text_input", "variables_set"]
          const maxBlocks = [1, 1, 2, 3, 1, 1, 1, 1, 1, 1];
          const assembledBlocks = workspace.getAllBlocks().filter(block => block.type === "text_print" || block.type === "js_text_print");
          alert("✔ Great work!  So now let's return to the original task, to get the text between the first @ and the first ., e.g., the google in coolcoder@google.com or the mail in expertsoftwareengineer@mail.co.uk.  To simplify, we'll assume the first . always follows the first @, which may not always be the case in an e-mail address (e.g., jane.doe@gmail.com).  So are you up to the task of typing it all in!  You'll use two " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " this time.");
          hideOutputAndCodeContainers();
          toolboxManager.clearToolbox();
          toolboxBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = maxBlocks[index];
          });
          assembledBlocks.forEach(block => block.setCollapsed(true));
        }
      }
    )
  );

  // You might have thought to use the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " block to get the number of characters before the @, but you'd need the substring before the @ to do this so instead " , but you can't   We'll use a specific number for the starting position so it can't work in general, but we'll fix that soon by adding the new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " block.");

  return citf;
}