import {getParseTree, handleParseTreeToBlocks, workspaceToLanguageCode} from "../core/mobile.js";
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

Blockly.Python['type_in_between_at_and_period'] = Blockly.JavaScript['type_in_between_at_and_period'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_between_at_and_period'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals
    const emailSampleInput = "coolcoder@google.com";
    const result = matchStatement(exp, 
      [{token: "display", type: "terminal"}, "(", "email", ".", {token: "GETTEXTFROMPOSITIONNUMBER", type: "terminal"}, 
       '(', 'email', '.', {token: "FINDFIRSTOCCURRENCEOFTEXT", type: "terminal"}, '(', '"', '@', '"', ')', '+', '1', ")", ".", 
       {token: "TOPOSITIONNUMBER", type: "terminal"}, "(", "email", ".", {token: "FINDFIRSTOCCURRENCEOFTEXT", type: "terminal"},
       "(", '"', '.', '"', ")", ")", ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        () => displayMessage("Be sure to include the variable email that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable email you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[4] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses as shown above, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else {
            displayMessage("The starting position will be as before, *the position* of the @ sign in email + 1.  To get the position of the needle @ in the haystack email, we'll first need to specify the variable email to search.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable email you want to search."),
        genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[8] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("@")) {
            displayMessage("Since you're looking for the literal @ sign and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          }
          else {
            displayMessage("Since the needle you're going to use here is a literal string and not an expression, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          }
        },
        (matchResultArr, remaining) => displayMessage("What string do you want to get the position of to help you determine where you should start? " + (remaining.indexOf('"') === -1 ? remaining : remaining.substring(0, remaining.indexOf('"'))) + " is not correct."),
        (matchResultArr, remaining) => displayMessage("You're missing closing quotation marks for " + matchResultArr[matchResultArr.length-1] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("+")) {
            displayMessage("Be careful where you place the +; you certainly don't want to add a number to the string @!  Instead you want to add a number to the *position* of the @ in email so it should go outside of the " + matchResultArr[8] + ".");
          } else {
            displayMessage("You're missing a closing parenthesis for " + matchResultArr[8] + ".");
          }
        },
        (matchResultArr, remaining) => {
          if(remaining.startsWith(")") || remaining.startsWith(".")) {
            displayMessage("You do not want to start extracting text at the @ exactly since you want to get the text *after* it.  As with before, you'll want to start at the position after so you'll need to do what arithmetic operation to the position number you get?");
          } else if(remaining.replace(/\s/g, "").startsWith("--1")) {
            displayMessage("Add 1 instead of subtracting -1 as this makes your code clearer.")
          } else {
            displayMessage("As in the previous part, what operation and number should you use on the position of the @ you get from " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " to start at the position number after the position of the @?");
          }
        },
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num) || remaining.startsWith("-")) {
            displayMessage("What number do you want to add to the position number of the first occurrence of the @ to get to the position you want to start at?  Change this to the correct number.");
          } else {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " gives you back a number.  What specific *number* do you want to add to the position number of the first occurrence of the @ to get to the position you want to start at?  Change this to the correct number.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[4] + " after the starting position number."),
        () => displayMessage("Be sure to include the . after the closing parenthesis after the starting position number before the next part."),
        genericTerminalErrorMsg.bind(null, displayMessage, "TOPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        // LEFT OFF HERE BELOW
        (matchResultArr, remaining) => {
          // variable email for indexOf - stopping position
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place to stop extracting text cannot be a specific number if you want it to work in general regardless of the e-mail address.  For an email of " + emailSampleInput + ", you'd use " + emailSampleInput.indexOf(".") + " (stopping before it), but for jdoe@foo.com, you'd want to use " + "jdoe@foo.com".indexOf(".") + ".  Since it depends on some property of the entered e-mail address, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'll need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle.")
          } else {
            displayMessage("The correct place to stop extracting text will depend on the e-mail address.  For an email of " + emailSampleInput + ", you'd use " + emailSampleInput.indexOf(".") + " (stopping before it), but for jdoe@foo.com, you'd want to use " + "jdoe@foo.com".indexOf(".") + ".  Since it depends on some property of the entered e-mail address, start by entering the appropriate variable name here."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        // .
        () => displayMessage("Be sure to include the . after the variable email you want to use to refer to one of its properties."),
        // indexOf
        (matchResultArr, remaining) => {
          if(getAfterTerminal(remaining, "LENGTH")) {
            displayMessage("If you stop immediately before the position given by the length of the variable email, you'll get the substring of all text after the @ but you only want to get the text in between the @ and .");
          } else if(getAfterTerminal(remaining, "GETCHARACTERNUMBER")) {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " gives you a *character* at a specific position; it won't give you a number, which you need for the position to stop before for " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".");
          } else if(getAfterTerminal(remaining, "GETTEXTFROMPOSITIONNUMBER")) {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " gives you part of the text; you're already using that, but you want a number, which you need for the position to stop before.");
          } else {
            displayMessage("What property of email do you want to get to determine the ending position here?  Make sure you're spelling and capitalization (e.g., M versus m) are correct.");
          }
          // displayMessage("The correct place to stop extracting text cannot be a specific number if you want it to work in general regardless of the e-mail address.  For an email of " + emailSampleInput + ", you'd use " + emailSampleInput.indexOf(".") + "(stopping before it), but for jdoe@foo.com, you'd want to use " + "jdoe@foo.com".indexOf(".") + ".  Since it depends on some property of email, use What do you look for to get the correct position and is there something you recently learned about that you could use to get it?");    
        },
        // (
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        // "
        (matchResultArr, remaining) => {
          if(remaining.startsWith(".")) {
            displayMessage("Since you're looking for the literal . and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          }
          else {
            displayMessage("Since the needle you're going to use here is a literal string and not an expression, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          }
        },
        // . - searching for
        (matchResultArr, remaining) => displayMessage("What string do you want to get the position of to help you determine where you should end?" + (remaining.indexOf('"') === -1 ? remaining : remaining.substring(0, remaining.indexOf('"'))) + " is not correct."),
        // "
        (matchResultArr, remaining) => displayMessage("You're missing closing quotation marks for " + matchResultArr[matchResultArr.length-1] + "."),
        // ) for indexOf
        (matchResultArr, remaining) => {
          if(remaining.startsWith("+") || remaining.startsWith("-")) {
            displayMessage("Be careful where you place the math operation; you certainly don't want to addto/subtract a number from a period!  Any math you may want to do to the *position* of the period in email (which may not be necessary) should go outside of the parentheses for the character to find in " + matchResultArr[18] + ".");
          } else {
            displayMessage("You're missing a closing parenthesis for " + matchResultArr[22] + ".");
          }
        },
        // ) for substring
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for an e-mail of " + emailSampleInput + ", you'd want to use " + emailSampleInput.indexOf(".") + " so the last character you'd extract would be at position " + (emailSampleInput.indexOf(".")-1) + ", mainly the " + emailSampleInput[emailSampleInput.indexOf(".")-1] + " before the period.  If you subtracted 1, you'd instead stop extracting text at position " + (emailSampleInput.indexOf(".")-2) + " so you'd instead incorrectly get the " + emailSampleInput[emailSampleInput.indexOf(".")-2] + " as the last character.");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("Although " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given, you want to stop before the period anyway.  Adding 1 means you'll instead stop at the period.  For example, for an e-mail of " + emailSampleInput + " the period would be located at position " + emailSampleInput.indexOf(".") + " so by adding 1, you'd get " + (emailSampleInput.indexOf(".") + 1) + ", which means the last character you'd extract would be at position " + emailSampleInput.indexOf(".") + ", mainly the period itself.");
          }
          else {
            displayMessage("What you're doing to the ending position of " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " seems incorrect or unnecessary.  Be sure to have examples in mind before deciding what to type.  If you're done, be sure to include a closing parenthesis for " + matchResultArr[18] + " after the ending position.");
            // You're missing a closing parenthesis for "  + matchResultArr[9] + " after the ending position number.");
          }
        },
        // ) for display
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[0] + ".")
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
          // document.getElementById("xmlData").value.replace(/\n|\r|\t/g, "").replace(/"/g, '\\"').replace(/>[\s]+</g, "><");
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"h,o`Pe$j=ny0;{YyZOf6\">s</variable><variable id=\"C=}RR#/980k=`k+0tNNX\">d</variable></variables><block type=\"variables_set\" id=\"@:vzpwV=mw^.i0SPf7V0\" x=\"18\" y=\"11\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field><value name=\"VALUE\"><block type=\"text\" id=\"j$6V6l/H[Dwr`.!vAvB[\"><field name=\"TEXT\">bahut badhiya!</field></block></value><next><block type=\"variables_set\" id=\"Oc4`#,o,Lrn5k-fD=QVo\"><field name=\"VAR\" id=\"C=}RR#/980k=`k+0tNNX\">d</field><value name=\"VALUE\"><block type=\"math_number\" id=\"2#khGl:-b,.`HM}^A=$=\"><field name=\"NUM\">2</field></block></value><next><block type=\"text_print\" id=\"kf{V=ys0qMQ6*~SF-H*k\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"E=viOFSn~.aL|mL26hT]\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"%;PO1WmU7t8=*IM;:;Xf\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field></block></value><value name=\"AT\"><block type=\"math_arithmetic_basic\" id=\"U77WV({DUp|nm-xTP~U/\"><field name=\"OP\">DIVIDE</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"yYWf)7N$H9pAiXGg35??\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"-z~ir6R}#L-NVbzdguH@\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field></block></value></block></value><value name=\"B\"><block type=\"variables_get\" id=\"c!t8M%Ya:ve7Z-61dEfc\"><field name=\"VAR\" id=\"C=}RR#/980k=`k+0tNNX\">d</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"-)P(VNA6GQ$N-tF0aA24\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"|`wTwHzqqx76^aT]Qo=n\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"m]{h{UHbN!X[+4MBuA05\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field></block></value><value name=\"AT\"><block type=\"math_arithmetic_basic\" id=\"}l]!csua:(UiMsdg?Sqb\"><field name=\"OP\">DIVIDE</field><value name=\"A\"><block type=\"math_number\" id=\"MKIf!l^_MgBNo2sqKIsW\"><field name=\"NUM\">14</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"9)F[F{!`*^Z,]K%#0#]?\"><field name=\"NUM\">2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"X5dVF-U{q4o[BN_gD(3M\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"bO)t]WlK~g#ZQ*b/*K0m\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"TtfgG3+zx+@}?D,8Q*~w\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field></block></value><value name=\"AT\"><block type=\"math_number\" id=\"a~Z9(L2{4=sC}am^6Ouk\"><field name=\"NUM\">7</field></block></value></block></value><next><block type=\"text_print\" id=\"Y(v#QxpI|pm+%qno.Vw=\"><value name=\"TEXT\"><block type=\"text\" id=\"}e1Z/G(FCFb*zeB5=Riw\"><field name=\"TEXT\">a</field></block></value></block></next></block></next></block></next></block></next></block></next></block></xml>";
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"h,o`Pe$j=ny0;{YyZOf6\">s</variable><variable id=\"C=}RR#/980k=`k+0tNNX\">d</variable></variables><block type=\"variables_set\" id=\"@:vzpwV=mw^.i0SPf7V0\" x=\"10\" y=\"10\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field><value name=\"VALUE\"><block type=\"text\" id=\"j$6V6l/H[Dwr`.!vAvB[\"><field name=\"TEXT\">bahut badhiya!</field></block></value><next><block type=\"variables_set\" id=\"Oc4`#,o,Lrn5k-fD=QVo\"><field name=\"VAR\" id=\"C=}RR#/980k=`k+0tNNX\">d</field><value name=\"VALUE\"><block type=\"math_number\" id=\"2#khGl:-b,.`HM}^A=$=\"><field name=\"NUM\">2</field></block></value><next><block type=\"text_print\" id=\"kf{V=ys0qMQ6*~SF-H*k\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"E=viOFSn~.aL|mL26hT]\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"%;PO1WmU7t8=*IM;:;Xf\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field></block></value><value name=\"AT\"><block type=\"math_arithmetic_basic\" id=\"U77WV({DUp|nm-xTP~U/\"><field name=\"OP\">DIVIDE</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"yYWf)7N$H9pAiXGg35??\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"-z~ir6R}#L-NVbzdguH@\"><field name=\"VAR\" id=\"h,o`Pe$j=ny0;{YyZOf6\">s</field></block></value></block></value><value name=\"B\"><block type=\"variables_get\" id=\"c!t8M%Ya:ve7Z-61dEfc\"><field name=\"VAR\" id=\"C=}RR#/980k=`k+0tNNX\">d</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\".W/B2RyLo}@7_,ROcZf8\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"pEyqoYVgTf;n%!v5fwlm\"><value name=\"VALUE\"><block type=\"text\" id=\"nfc_.e3dZ@t(B(#cd.q}\"><field name=\"TEXT\">bahut badhiya!</field></block></value><value name=\"AT\"><block type=\"math_arithmetic_basic\" id=\"|RBrP9*v@*6*izKt,[rn\"><field name=\"OP\">DIVIDE</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"F^olT%VI^~6:ZS,M0Y()\"><value name=\"VALUE\"><block type=\"text\" id=\"W7m3BB0ex*UlmklD9kv^\"><field name=\"TEXT\">bahut badhiya!</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"*EiuS||*_IBjQcCz7UOe\"><field name=\"NUM\">2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"-)P(VNA6GQ$N-tF0aA24\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"|`wTwHzqqx76^aT]Qo=n\"><value name=\"VALUE\"><block type=\"text\" id=\"8Qnf-u`+Y}P+L7dd6@S9\"><field name=\"TEXT\">bahut badhiya!</field></block></value><value name=\"AT\"><block type=\"math_arithmetic_basic\" id=\"}l]!csua:(UiMsdg?Sqb\"><field name=\"OP\">DIVIDE</field><value name=\"A\"><block type=\"math_number\" id=\"MKIf!l^_MgBNo2sqKIsW\"><field name=\"NUM\">14</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"9)F[F{!`*^Z,]K%#0#]?\"><field name=\"NUM\">2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"X5dVF-U{q4o[BN_gD(3M\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"bO)t]WlK~g#ZQ*b/*K0m\"><value name=\"VALUE\"><block type=\"text\" id=\"sp,K]3y^rrLm]|k5Hwue\"><field name=\"TEXT\">bahut badhiya!</field></block></value><value name=\"AT\"><block type=\"math_number\" id=\"a~Z9(L2{4=sC}am^6Ouk\"><field name=\"NUM\">7</field></block></value></block></value><next><block type=\"text_print\" id=\"Y(v#QxpI|pm+%qno.Vw=\"><value name=\"TEXT\"><block type=\"text\" id=\"}e1Z/G(FCFb*zeB5=Riw\"><field name=\"TEXT\">a</field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          alert("In this mission, you will learn about the " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " and how it can be used to say get all of the text from the first @ up to the period.  But first let's warm up by playing the role of the computer!  You'll be given blocks of code and make the same substitutions the computer does step by step.  For example, you'd be given blocks of code and would then fix the values in the blocks in each " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + ", as necessary, so that each line of output is the same.  Review the following code and run it. ");// in an e-mail address.  As a warm-up exercise, you'll review by getting all characters beyond a given starting position.  You'll follow up with a.");
          workspace.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          toolboxManager.clearToolbox();
        }
      }
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
          const s = "bahut badhiya!";
          const d = 2;
          const charPosition = s.length/d;
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"q#o)X1mj/{}xVG9{!0Id\">s</variable><variable id=\"[nHdc`Bw[H6-xTzBoCF~\">d</variable></variables><block type=\"variables_set\" id=\"Hhs.U7UR_iqHWQ[%fkOO\" x=\"8\" y=\"8\"><field name=\"VAR\" id=\"q#o)X1mj/{}xVG9{!0Id\">s</field><value name=\"VALUE\"><block type=\"text\" id=\"ZhPAvp#Qc=%gL_R[:h)k\"><field name=\"TEXT\">bahut badhiya!</field></block></value><next><block type=\"variables_set\" id=\")^veN0414B_G(e2vMS%O\"><field name=\"VAR\" id=\"[nHdc`Bw[H6-xTzBoCF~\">d</field><value name=\"VALUE\"><block type=\"math_number\" id=\"t@BLg7iRR9]dl~](^^n#\"><field name=\"NUM\">2</field></block></value><next><block type=\"text_print\" id=\"s)`9U4iuB3F-xt*da#x%\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"$@W{+q2HOkq-9Ll$PzMN\"><value name=\"STRING\"><block type=\"variables_get\" id=\"q2Zs_uj,]hR7abgk2mA~\"><field name=\"VAR\" id=\"q#o)X1mj/{}xVG9{!0Id\">s</field></block></value><value name=\"AT1\"><block type=\"variables_get\" id=\"iVX{BTCZ~]^**4^gTvA9\"><field name=\"VAR\" id=\"[nHdc`Bw[H6-xTzBoCF~\">d</field></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"__^OIeo*a*FO}6;W(g^6\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"I.X8;ES])[!4zDo.bXp(\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"Ixm^//UrleFOiXJJv6LD\"><field name=\"VAR\" id=\"q#o)X1mj/{}xVG9{!0Id\">s</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"0u-q#`Z_#GO?|2;GZqBz\"><field name=\"NUM\">3</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"W7.|U+A{(?Vn_Bzcb=-h\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"Xe`@c0}Z4xfD7_u6TrHM\"><value name=\"STRING\"><block type=\"text\" id=\"alpkTAif^Ty3In_`_+IH\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"REB:M!UI(Oq3]=ba#];(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"!A;02^^9;)=/l^Vt$#UK\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"Y(-W4Nm}3pANT4HH,Je7\"><value name=\"VALUE\"><block type=\"text\" id=\"fY_je?nmP7Fw;+a5~K@3\"><field name=\"TEXT\"></field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"hRST?a1{`j-iY)gwEFx5\"><field name=\"NUM\">3</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"lX]wo/5G42_b34Y_nCt#\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"AP/-~`k{^dL[d%gf_`^R\"><value name=\"STRING\"><block type=\"text\" id=\"R9h+ZAOo*dh[+K(YrRSp\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"T48puBe/(4nzyg.E1!e`\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"fT-W-zs@h5O{)U#DTN7@\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"qe0!`p7M.{1g-u0bR1g|\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"yx@N?NCSo^#pL](EHt|R\"><field name=\"NUM\">3</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"vkEY:[R|sQ=J2MCiq5yP\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"fcP:}LVGd5y$Fm^#@wkR\"><value name=\"STRING\"><block type=\"text\" id=\"~u`dA(TCYHcAf@@%M.h.\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"TU=)|T-9HkcDm|^L+fU.\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"|K.Q0sj,q+s9^:`ri$H^\"><field name=\"NUM\">0</field></block></value></block></value><next><block type=\"text_print\" id=\".BgI;0P=ex@|P1x*Oi-B\"><value name=\"TEXT\"><block type=\"text\" id=\"b)LgLVL^oTdle4)Z_KX%\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          alert("So from the first " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " to the next, we combine the two substitutions of " + s + " for s and " + d + " for d.  Then we substitute " + s.length + " for \"" + s + "\".length from the second " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " to the third, " + s.length/d + " for " + s.length + "/" + d + " from the third to the fourth and finally " + s.charAt(charPosition) + " for s." + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "(" + charPosition + ").\n Now it's your turn, fill in the empty text \"\" blocks/change the 0's so the substitutions are correctly made.");
          //alert("✔ Good, so did you type in coolcoder@google.com or some other e-mail address with 9 characters before the @, or did you enjoy breaking the rules and watching it fail?!!  Well, now it's time to make it work for those troublemakers so long as they're kind enough to enter an @.\nTo do this, we'll use our new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " and will need some arithmetic as well.");//  HINT: If you didn't know what email was but you were able to ask for the position number of whatever character(s) you want, what position would you ask for?  Once you had that position, what math operation would you use to get the starting position of the string after the @?  Make sure your calculations work on coolcoder@google.com, jdoe@foo.edu, or any other e-mail address!");
          // alert("So here you see an ")
          workspace.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
        }
      }
    )
  );

citf.addTask(
  new CourseInstructionTask(
    () => {
      const text0 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "hut badhi");
      const textPrint1 = workspace.getAllBlocks().filter(block => block.type === "text_print" && block.getNextBlock() === null && text0.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
      const mathNumber2 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "11");
      const mathNumber3 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "2");
      const text4 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "bahut badhiya!");
      const t2cTextGetsubstring5 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text4.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber3.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathNumber2.indexOf(block.getInputTargetBlock("AT2")) !== -1);
      const textPrint6 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint1.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring5.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
      const mathNumber7 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "3");
      const mathNumber8 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "14");
      const mathArithmeticBasic9 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && mathNumber8.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
      const t2cTextGetsubstring12 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text4.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber3.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic9.indexOf(block.getInputTargetBlock("AT2")) !== -1);
      const textPrint13 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint6.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring12.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
      const t2cTextLength16 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && text4.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
      const mathArithmeticBasic17 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && t2cTextLength16.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
      const t2cTextGetsubstring20 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text4.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber3.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic17.indexOf(block.getInputTargetBlock("AT2")) !== -1);
      const textPrint21 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint13.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring20.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
      const variablesGet23 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
      const t2cTextLength24 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet23.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
      const mathArithmeticBasic25 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && t2cTextLength24.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
      const variablesGet26 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "d");
      const t2cTextGetsubstring28 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && variablesGet23.indexOf(block.getInputTargetBlock("STRING")) !== -1 && variablesGet26.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic25.indexOf(block.getInputTargetBlock("AT2")) !== -1);
      const textPrint29 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint21.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring28.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
      const variablesSet31 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint29.indexOf(block.getNextBlock()) !== -1 && mathNumber3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "d");
      const variablesSet33 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet31.indexOf(block.getNextBlock()) !== -1 && text4.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "s");
      return text0.length === 1 && textPrint1.length === 1 && mathNumber2.length === 1 && mathNumber3.length === 4 && text4.length === 5 && t2cTextGetsubstring5.length === 1 && textPrint6.length === 1 && mathNumber7.length === 3 && mathNumber8.length === 1 && mathArithmeticBasic9.length === 1 && t2cTextGetsubstring12.length === 1 && textPrint13.length === 1 && t2cTextLength16.length === 1 && mathArithmeticBasic17.length === 1 && t2cTextGetsubstring20.length === 1 && textPrint21.length === 1 && variablesGet23.length === 2 && t2cTextLength24.length === 1 && mathArithmeticBasic25.length === 1 && variablesGet26.length === 1 && t2cTextGetsubstring28.length === 1 && textPrint29.length === 1 && variablesSet31.length === 1 && variablesSet33.length === 1;
    },    
    new HelpMessageDirection(() => {
      const allBlocks = workspace.getAllBlocks(true);
      // const variableSetBlocks = allBlocks.filter(block => block.type === "variables_set");
      const textPrintBlocks = allBlocks.filter(block => block.type === "text_print" || block.type === "js_text_print");
      const substringBlocks = allBlocks.filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring"));
      const stringLiteralInLength = allBlocks.find(block => block.type === "text" && block.getParent() && block.getParent().type === "t2c_text_length");
      const arithmeticBlockNumbers = allBlocks.find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "math_number");
      const numberBlockB = substringBlocks.map(block => block.getInputTargetBlock("AT2"))
        .find(block => block && block.type === "math_number");
      const lastLiteralBlock = textPrintBlocks.map(block => block.getInputTargetBlock("TEXT"))
        .find(block => block && block.type === "text");

      const s = "bahut badhiya!";
      const d = 2;
      const lastLiteralExpected = s.substring(d, s.length - 3);

      for(let i = 1; i <= 3; i++) {
        const textBlock = substringBlocks[i].getInputTargetBlock("STRING");
        const numberBlock = substringBlocks[i].getInputTargetBlock("AT1");
        if(textBlock && textBlock.type === "text" && textBlock.getFieldValue("TEXT") && textBlock.getFieldValue("TEXT") !== s) {
          return "The text on line " + (i + 3) + " is incorrect.  Substitute s with the value that it's initially assigned to.";
        }
        if(numberBlock && numberBlock.type === "math_number" && numberBlock.getFieldValue("NUM") && numberBlock.getFieldValue("NUM") !== d) {
          return "The number in the first position on line " + (i + 3) + " is incorrect.  Substitute d with the value that it's initially assigned to.";
        }
      }

      if(stringLiteralInLength && stringLiteralInLength.getFieldValue("TEXT") && stringLiteralInLength.getFieldValue("TEXT") !== s) {
        return "The text in the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " block on line 4 is incorrect.  Substitute s with the value that it's initially assigned to.";
      }

      if(arithmeticBlockNumbers && lastLiteralBlock) {
        const len = arithmeticBlockNumbers.getInputTargetBlock("A").getFieldValue("NUM");
        const lastLiteral = lastLiteralBlock.getFieldValue("TEXT");

        if(len === s.length - 1) {
          return "Remember the count for the length starts with 1 and include the spaces and punctuation are counted.";
        }
        else if(len && len !== s.length) {
          return "Substitute the first number in the arithmetic block with the subtraction on line 5 with s's length."; 
        }
        else if(len && numberBlockB && numberBlockB.getFieldValue("NUM") !== s.length - 3) {
          return "What is s.length - 3?  This is what should be substituted for the second number block on line 6.";
        }
        else if(len && lastLiteral) {
          if(lastLiteralExpected === lastLiteral.substring(1)) {
            return "Remember to start counting from 0 when determining what the resulting string will be on the last line.";
          }
          if(lastLiteral === lastLiteralExpected.substring(1)) {
            return "Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " starts extracting text at the exact position given for its first number.  Change the string literal on the last line, accordingly.";
          }
          if(lastLiteralExpected === lastLiteral.substring(0, lastLiteral.length-1)) {
            return "Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " stops extracting text at one position before its given second number.  Change the string literal on the last line, accordingly.";
          }
          if(lastLiteralExpected !== lastLiteral) {
            return "The string literal you have on the last line is incorrect.  Check the previous lines in order and then fix it accordingly."
          }
        }
      }

      return "Replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).";
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
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"q#o)X1mj/{}xVG9{!0Id\">s</variable><variable id=\"[nHdc`Bw[H6-xTzBoCF~\">spacePosition</variable></variables><block type=\"variables_set\" id=\"Hhs.U7UR_iqHWQ[%fkOO\" collapsed=\"true\" x=\"30\" y=\"-1\"><field name=\"VAR\" id=\"q#o)X1mj/{}xVG9{!0Id\">s</field><value name=\"VALUE\"><block type=\"text\" id=\"ZhPAvp#Qc=%gL_R[:h)k\"><field name=\"TEXT\">bahut badhiya!</field></block></value><next><block type=\"variables_set\" id=\")^veN0414B_G(e2vMS%O\" collapsed=\"true\"><field name=\"VAR\" id=\"[nHdc`Bw[H6-xTzBoCF~\">spacePosition</field><value name=\"VALUE\"><block type=\"t2c_text_indexof\" id=\"hAw#x^?o^2?:xo(wd7=H\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"dH#tNW4#kpBgp~n[WQbc\"><field name=\"VAR\" id=\"q#o)X1mj/{}xVG9{!0Id\">s</field></block></value><value name=\"FIND\"><block type=\"text\" id=\"B./%UVj[gkh,,l+)Lf$-\"><field name=\"TEXT\"> </field></block></value></block></value><next><block type=\"text_print\" id=\"s)`9U4iuB3F-xt*da#x%\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"$@W{+q2HOkq-9Ll$PzMN\"><value name=\"STRING\"><block type=\"variables_get\" id=\"q2Zs_uj,]hR7abgk2mA~\"><field name=\"VAR\" id=\"q#o)X1mj/{}xVG9{!0Id\">s</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"3{kvaG*$K2H)C:XVo,.K\"><field name=\"OP\">MINUS</field><value name=\"A\"><shadow type=\"math_number\" id=\"OUhaa+uc%A3/?~D=Hpr?\"><field name=\"NUM\">1</field></shadow><block type=\"variables_get\" id=\"iVX{BTCZ~]^**4^gTvA9\"><field name=\"VAR\" id=\"[nHdc`Bw[H6-xTzBoCF~\">spacePosition</field></block></value><value name=\"B\"><shadow type=\"math_number\" id=\"U9XnjWla5TG-//K]%1S_\"><field name=\"NUM\">1</field></shadow><block type=\"math_number\" id=\"I6/p.%Ab#m3l{uGj`7]s\"><field name=\"NUM\">3</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"__^OIeo*a*FO}6;W(g^6\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"variables_get\" id=\"QK^0)hG7ZW$zXWS*fOcE\"><field name=\"VAR\" id=\"[nHdc`Bw[H6-xTzBoCF~\">spacePosition</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"0u-q#`Z_#GO?|2;GZqBz\"><field name=\"NUM\">4</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"W7.|U+A{(?Vn_Bzcb=-h\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"Xe`@c0}Z4xfD7_u6TrHM\"><value name=\"STRING\"><block type=\"text\" id=\"alpkTAif^Ty3In_`_+IH\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"MMw]|?].qxoii#5gbDY.\"><field name=\"OP\">MINUS</field><value name=\"A\"><shadow type=\"math_number\" id=\"Zjr}U?$}ad^b%qT,r2TU\"><field name=\"NUM\">1</field></shadow><block type=\"math_number\" id=\"_u;0X[Nc*`sQk!iMH95C\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><shadow type=\"math_number\"><field name=\"NUM\">1</field></shadow><block type=\"math_number\" id=\",a,-k|+!02?C/:FWu10%\"><field name=\"NUM\">3</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"C=|6LCmIY-9(?zd$n;Yr\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"`;{%e({;q|LY5d3lIN31\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"_g}MI+Yg!%ewA7.%UlSc\"><field name=\"NUM\">4</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"lX]wo/5G42_b34Y_nCt#\"><value name=\"TEXT\"><block type=\"t2c_text_getsubstring\" id=\"AP/-~`k{^dL[d%gf_`^R\"><value name=\"STRING\"><block type=\"text\" id=\"R9h+ZAOo*dh[+K(YrRSp\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"T48puBe/(4nzyg.E1!e`\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Mf5SeAN7d(ZIhD=Pz(ic\"><field name=\"NUM\">0</field></block></value></block></value><next><block type=\"text_print\" id=\".BgI;0P=ex@|P1x*Oi-B\"><value name=\"TEXT\"><block type=\"text\" id=\"b)LgLVL^oTdle4)Z_KX%\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></xml>";
          alert("✔ Nice, so now let's tweak this a little, adding the new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " block, which given a string (haystack) to look through and a string appearing in it (needle) to find, produces the position NUMBER of its first occurrence.  As before, replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).");
          workspace.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "hut bad");
        const textPrint1 = workspace.getAllBlocks().filter(block => block.type === "text_print" && block.getNextBlock() === null && text0.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "9");
        const mathNumber3 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "2");
        const text4 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "bahut badhiya!");
        const t2cTextGetsubstring5 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text4.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber3.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathNumber2.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const textPrint6 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint1.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring5.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const mathNumber7 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "4");
        const mathNumber8 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "5");
        const mathArithmeticBasic9 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && mathNumber8.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const mathNumber10 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "3");
        const mathArithmeticBasic12 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && mathNumber8.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber10.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
        const t2cTextGetsubstring14 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text4.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic12.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic9.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const textPrint15 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint6.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring14.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesGet17 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "spacePosition");
        const mathArithmeticBasic18 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet17.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const mathArithmeticBasic21 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet17.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber10.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
        const variablesGet22 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextGetsubstring23 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && variablesGet22.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic21.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic18.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const textPrint24 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint15.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const text25 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == " ");
        const t2cTextIndexof27 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && variablesGet22.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text25.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet28 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint24.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof27.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "spacePosition");
        const variablesSet30 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet28.indexOf(block.getNextBlock()) !== -1 && text4.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "s");
        return text0.length === 1 && textPrint1.length === 1 && mathNumber2.length === 1 && mathNumber3.length === 1 && text4.length === 3 && t2cTextGetsubstring5.length === 1 && textPrint6.length === 1 && mathNumber7.length === 2 && mathNumber8.length === 2 && mathArithmeticBasic9.length === 1 && mathNumber10.length === 2 && mathArithmeticBasic12.length === 1 && t2cTextGetsubstring14.length === 1 && textPrint15.length === 1 && variablesGet17.length === 2 && mathArithmeticBasic18.length === 1 && mathArithmeticBasic21.length === 1 && variablesGet22.length === 2 && t2cTextGetsubstring23.length === 1 && textPrint24.length === 1 && text25.length === 1 && t2cTextIndexof27.length === 1 && variablesSet28.length === 1 && variablesSet30.length === 1;
      },
      new HelpMessageDirection(() => {
        const allBlocks = workspace.getAllBlocks(true);
        // const variableSetBlocks = allBlocks.filter(block => block.type === "variables_set");
        const textPrintBlocks = allBlocks.filter(block => block.type === "text_print" || block.type === "js_text_print");
        const substringBlocks = allBlocks.filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring"));
        const arithmeticABlockNumbers = allBlocks.filter(block => block.type === "math_arithmetic_basic") 
          .map(block => block.getInputTargetBlock("A"))
          .filter(block => block && block.type === "math_number");
        const substringBlockWithNumbers = substringBlocks.find(block => block.getInputTargetBlock("AT1") && block.getInputTargetBlock("AT2") 
          && block.getInputTargetBlock("AT1").type === "math_number" && block.getInputTargetBlock("AT2").type === "math_number");
        const lastLiteralBlock = textPrintBlocks.map(block => block.getInputTargetBlock("TEXT"))
          .find(block => block && block.type === "text");
        const numberAfterSubtraction = substringBlockWithNumbers && substringBlockWithNumbers.getInputTargetBlock("AT1").getFieldValue("NUM");
        const numberAfterAddition = substringBlockWithNumbers && substringBlockWithNumbers.getInputTargetBlock("AT2").getFieldValue("NUM")

        const s = "bahut badhiya!";
        const spacePosition = s.indexOf(" ");
        const lastLiteralExpected = s.substring(spacePosition - 3, spacePosition + 4);

        for(let i = 1; i <= 2; i++) {
          const textBlock = substringBlocks[i].getInputTargetBlock("STRING");
          const numberBlock = arithmeticABlockNumbers[i-1];
          if(textBlock && textBlock.type === "text" && textBlock.getFieldValue("TEXT") && textBlock.getFieldValue("TEXT") !== s) {
            return "The text on line " + (i + 3) + " is incorrect.  Substitute s with the value that it's initially assigned to.";
          }
          if(numberBlock && numberBlock.getFieldValue("NUM") && numberBlock.getFieldValue("NUM") !== spacePosition) {
            return "The left number in the " + (i === 1 ? "first" : "second") + " arithmetic block on line 4 is incorrect.  Substitute each spacePosition with the position of the first space in s, i.e., " + s + ".";
          }
        }

        if(numberAfterSubtraction && numberAfterSubtraction !== spacePosition - 3) {
          return "The " + numberAfterSubtraction + " on line 5 is incorrect; it should be the result of subtracting 3 from the value of spacePosition.";
        }

        if(numberAfterAddition && numberAfterAddition !== spacePosition + 4) {
          return "The " + numberAfterAddition + " on line 5 is incorrect; it should be the result of adding 4 to the value of spacePosition.";
        }

        if(numberAfterSubtraction && numberAfterAddition && lastLiteralBlock) {
          const lastLiteral = lastLiteralBlock.getFieldValue("TEXT");
          if(lastLiteral) {
            if(lastLiteralExpected === lastLiteral.substring(1)) {
              return "Remember to start counting from 0 when determining what the resulting string will be on the last line.";
            }
            if(lastLiteral === lastLiteralExpected.substring(1)) {
              return "Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " starts extracting text at the exact position given for its first number.  Change the string literal on the last line, accordingly.";
            }
            if(lastLiteralExpected === lastLiteral.substring(0, lastLiteral.length-1)) {
              return "Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " stops extracting text at one position before its given second number.  Change the string literal on the last line, accordingly.";
            }
            if(lastLiteralExpected !== lastLiteral) {
              return "The string literal you have on the last line is incorrect.  Check the previous lines in order and then fix it accordingly."
            }
          }
        }

        return "The new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " takes a string (haystack: a space in this code excerpt) to look through and a string appearing in it (needle) to find as inputs and produces the position NUMBER of the needle's first occurrence in haystack.  As before, replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).";
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
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</variable></variables><block type=\"variables_set\" id=\"P1YA(r1IJePVhHp%Ed|D\" movable=\"false\" x=\"-337\" y=\"-671\"><field name=\"VAR\" id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</field><value name=\"VALUE\"><block type=\"text\" id=\"eH?sx|^+[M*YG!)50`_~\" movable=\"false\"><field name=\"TEXT\">hey HEY hey!</field></block></value><next><block type=\"text_print\" id=\"8uwp:W!TVbS^rfA$tDw3\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"Di@mTUjU{+`:w^M,?7hY\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\")}3.,]B:MN(:@L.1.%M8\" movable=\"false\"><field name=\"VAR\" id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</field></block></value><value name=\"AT\"><block type=\"t2c_text_indexof\" id=\"{jf`=!cPrtVgdHWE0,:N\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"cA9|qD5|v2oX*I5y678@\" movable=\"false\"><field name=\"VAR\" id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</field></block></value><value name=\"FIND\"><block type=\"text\" id=\"._Y$K2]i~sgu}#{z3=?t\" movable=\"false\"><field name=\"TEXT\">H</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"#oLKX9(l_4,3i1v=33nN\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"xYsc48S=|pkzs)00p^w)\" movable=\"false\"><value name=\"VALUE\"><block type=\"text\" id=\"Knlk|w:(Vd_=ZH?M{B6[\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"AT\"><block type=\"t2c_text_indexof\" id=\"6Z^Bm0SY/(G[,%B;BPz3\" movable=\"false\"><value name=\"VALUE\"><block type=\"text\" id=\"XMdK2~YyMQCWjW6rNW1*\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"FIND\"><block type=\"text\" id=\"gkHSh%%BRA`wkeBdex.v\" movable=\"false\"><field name=\"TEXT\">H</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"W#|Ks*3clZo{D4uZ;OWZ\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_charat\" id=\"gT5M[rYF]7^mJuCj7hKx\" movable=\"false\"><value name=\"VALUE\"><block type=\"text\" id=\"fh-Co[SOuY2]nZ,um}Y%\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"AT\"><block type=\"math_number\" id=\"w$|.@[IJ=n^g(1yc1iOb\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value><next><block type=\"text_print\" id=\"5ezA0Gk@Z,1=w{4Y|O:_\" movable=\"false\"><value name=\"TEXT\"><block type=\"text\" id=\"+FDJie%sE;8.]TrsOEa|\" movable=\"false\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></xml>";
          alert("✔ Nice x 2!  So as you can see the new " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " allows us to extract characters before/after a desired character(s) when used to determine starting/ending positions for " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " (or just a single position for " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + ").  Let's try a few more examples where you'll again replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).");
          workspace.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === "H");
        const textPrint1 = workspace.getAllBlocks().filter(block => block.type === "text_print" && block.getNextBlock() === null && text0.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 4);
        const text3 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "hey HEY hey!");
        const t2cTextCharat4 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_charat" && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && mathNumber2.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const textPrint5 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint1.indexOf(block.getNextBlock()) !== -1 && t2cTextCharat4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const t2cTextIndexof8 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text0.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const t2cTextCharat10 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_charat" && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && t2cTextIndexof8.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const textPrint11 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint5.indexOf(block.getNextBlock()) !== -1 && t2cTextCharat10.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesGet13 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "greeting");
        const t2cTextIndexof14 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && variablesGet13.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text0.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const t2cTextCharat16 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_charat" && variablesGet13.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && t2cTextIndexof14.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const textPrint17 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint11.indexOf(block.getNextBlock()) !== -1 && t2cTextCharat16.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet19 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint17.indexOf(block.getNextBlock()) !== -1 && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "greeting");
        return text0.length === 3 && textPrint1.length === 1 && mathNumber2.length === 1 && text3.length === 4 && t2cTextCharat4.length === 1 && textPrint5.length === 1 && t2cTextIndexof8.length === 1 && t2cTextCharat10.length === 1 && textPrint11.length === 1 && variablesGet13.length === 2 && t2cTextIndexof14.length === 1 && t2cTextCharat16.length === 1 && textPrint17.length === 1 && variablesSet19.length === 1;
      },
      new HelpMessageDirection(() => {
        const allBlocks = workspace.getAllBlocks(true);
        const textGetCharNums = allBlocks.filter(block => block.type === "t2c_text_charat" || block.type === "js_text_charat")
          .map(block => block.getInputTargetBlock("VALUE"))
          .filter(block => block && block.type === "text");
        const textHaystack = allBlocks.filter(block => block.type === "t2c_text_indexof" || block.type === "js_text_indexof")
          .map(block => block.getInputTargetBlock("VALUE"))
          .find(block => block && block.type === "text");
        const numberBlock = allBlocks.find(block => block.type === "math_number" && block.getParent() 
          && (block.getParent().type === "t2c_text_charat" || block.getParent().type === "js_text_charat"))
        const resultBlock = allBlocks.find(block => block.type === "text" && block.getParent() 
          && (block.getParent().type === "text_print" || block.getParent().type === "js_text_print"))

        const greeting = "hey HEY hey!";
        const ch = "H";
        const pos = greeting.indexOf(ch);

        for(let i = 0; i <= 1; i++) {
          const textBlock = textGetCharNums[i];
          if(textBlock && textBlock.getFieldValue("TEXT") && textBlock.getFieldValue("TEXT") !== greeting) {
            return "The text before " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER +  " on line " + (i + 3) + " is incorrect.  Substitute greeting with the value that it's initially assigned to.";
          }
        }

        if(textHaystack && textHaystack.getFieldValue("TEXT") && textHaystack.getFieldValue("TEXT") !== greeting) {
          return "The text before " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT +  " on line 3 is incorrect.  Substitute greeting with the value that it's initially assigned to.";
        }

        if(numberBlock) {
          const num = numberBlock.getFieldValue("NUM");
          if(num && num === greeting.indexOf(ch.toLowerCase())) {
            return "The number you substituted on line 4 is incorrect.  " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " is case sensitive meaning that " + ch + " is different than " + ch.toLowerCase() + ".";
          }
          else if(num && num === greeting.indexOf(ch) + 1) {
            return "The number you substituted on line 4 is incorrect.  Remember that positions start at 0.";
          }
          else if(num && num === greeting.indexOf(ch) - 1) {
            return "The number you substituted on line 4 is incorrect.  " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " gets the *exact* position of the first occurrence.";
          }
          else if(num && num !== greeting.indexOf(ch)) {
            return "The number you substituted on line 4 is incorrect.  Remember to count all of the characters including spaces when getting the position of the first " + ch + ".";
          }

          if(num === greeting.indexOf(ch) && resultBlock) {
            const text = resultBlock.getFieldValue("TEXT");
            if(text === ch.toLowerCase()) {
              return "The string literal on the last line is incorrect.  Remember to type in the same case (" + ch.toLowerCase() + " versus " + ch + ")."; 
            }
            else if(text && text !== ch) {
              return "The string literal on the last line is incorrect.  Check the previous lines in order and then fix it accordingly; it should be the result of the substitution of " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "."; 
            }
          }
        }

        return "Replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).";

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
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</variable></variables><block type=\"variables_set\" id=\"P1YA(r1IJePVhHp%Ed|D\" x=\"-326\" y=\"-676\"><field name=\"VAR\" id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</field><value name=\"VALUE\"><block type=\"text\" id=\"eH?sx|^+[M*YG!)50`_~\"><field name=\"TEXT\">HEY hey hey!</field></block></value><next><block type=\"text_print\" id=\"8uwp:W!TVbS^rfA$tDw3\"><value name=\"TEXT\"><block type=\"t2c_text_indexof\" id=\"6Z^Bm0SY/(G[,%B;BPz3\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"cA9|qD5|v2oX*I5y678@\"><field name=\"VAR\" id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</field></block></value><value name=\"FIND\"><block type=\"t2c_text_charat\" id=\"Di@mTUjU{+`:w^M,?7hY\"><value name=\"VALUE\"><block type=\"variables_get\" id=\")}3.,]B:MN(:@L.1.%M8\"><field name=\"VAR\" id=\"qJ=BGly2K{YdSsh3,b#O\">greeting</field></block></value><value name=\"AT\"><block type=\"math_number\" id=\"%j2#9Bk`Q/V-+oREIuo=\"><field name=\"NUM\">8</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"#oLKX9(l_4,3i1v=33nN\"><value name=\"TEXT\"><block type=\"t2c_text_indexof\" id=\"{jf`=!cPrtVgdHWE0,:N\"><value name=\"VALUE\"><block type=\"text\" id=\"XMdK2~YyMQCWjW6rNW1*\"><field name=\"TEXT\"></field></block></value><value name=\"FIND\"><block type=\"t2c_text_charat\" id=\"Fc.lt@BOEdE2}}~tAT4O\"><value name=\"VALUE\"><block type=\"text\" id=\"._Y$K2]i~sgu}#{z3=?t\"><field name=\"TEXT\"></field></block></value><value name=\"AT\"><block type=\"math_number\" id=\"F=EkSzg5$J)k#u9O{@Iv\"><field name=\"NUM\">8</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"W#|Ks*3clZo{D4uZ;OWZ\"><value name=\"TEXT\"><block type=\"t2c_text_indexof\" id=\"*(rK`C4Ohs]u,Fq;9ERv\"><value name=\"VALUE\"><block type=\"text\" id=\"7u0KXyx$Erh[yh7YMX}$\"><field name=\"TEXT\"></field></block></value><value name=\"FIND\"><block type=\"text\" id=\"j.v2A[.!Hvb=-qby=[P{\"><field name=\"TEXT\"></field></block></value></block></value><next><block type=\"text_print\" id=\"5ezA0Gk@Z,1=w{4Y|O:_\"><value name=\"TEXT\"><block type=\"math_number\" id=\"xbR0Jl3nn%9*!YM+Oj)q\"><field name=\"NUM\">0</field></block></value></block></next></block></next></block></next></block></next></block></xml>";
          alert("✔ Nice x 3!  So as you may have noticed, you got back the character you started with.  Can you see why?  If you get the position number of an H and then ask what character is at that position, it should be H!  Now, let's reverse the order of the " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " and " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " to see what happens.");
          workspace.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "4");
        const textPrint1 = workspace.getAllBlocks().filter(block => block.type === "text_print" && block.getNextBlock() === null && mathNumber0.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const text2 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "h");
        const text3 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "HEY hey hey!");
        const t2cTextIndexof4 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text2.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const textPrint5 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint1.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const mathNumber6 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "8");
        const t2cTextCharat8 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_charat" && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && mathNumber6.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const t2cTextIndexof10 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && t2cTextCharat8.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const textPrint11 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint5.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof10.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesGet13 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "greeting");
        const t2cTextCharat14 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_charat" && variablesGet13.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && mathNumber6.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const t2cTextIndexof16 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && variablesGet13.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && t2cTextCharat14.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const textPrint17 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint11.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof16.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet19 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint17.indexOf(block.getNextBlock()) !== -1 && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "greeting");
        return mathNumber0.length === 1 && textPrint1.length === 1 && text2.length === 1 && text3.length === 4 && t2cTextIndexof4.length === 1 && textPrint5.length === 1 && mathNumber6.length === 2 && t2cTextCharat8.length === 1 && t2cTextIndexof10.length === 1 && textPrint11.length === 1 && variablesGet13.length === 2 && t2cTextCharat14.length === 1 && t2cTextIndexof16.length === 1 && textPrint17.length === 1 && variablesSet19.length === 1;
      },
      new HelpMessageDirection(() => {
        const allBlocks = workspace.getAllBlocks(true);
        const textHaystacks = allBlocks.filter(block => block.type === "t2c_text_indexof" || block.type === "js_text_indexof")
          .map(block => block.getInputTargetBlock("VALUE"))
          .filter(block => block && block.type === "text");
        const textCharNum = allBlocks.filter(block => block.type === "t2c_text_charat" || block.type === "js_text_charat")
          .map(block => block.getInputTargetBlock("VALUE"))
          .find(block => block && block.type === "text");
        const textToFindBlock = allBlocks.filter(block => block.type === "t2c_text_indexof" || block.type === "js_text_indexof")
          .map(block => block.getInputTargetBlock("FIND"))
          .find(block => block && block.type === "text");
        const resultBlock = allBlocks.find(block => block.type === "math_number" && block.getParent() 
          && (block.getParent().type === "text_print" || block.getParent().type === "js_text_print"));

        const greeting = "HEY hey hey!";
        const pos = 8;
        const ch = greeting.charAt(pos);

        for(let i = 0; i <= 1; i++) {
          const textBlock = textHaystacks[i];
          if(textBlock && textBlock.getFieldValue("TEXT") && textBlock.getFieldValue("TEXT") !== greeting) {
            return "The text before " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT +  " on line " + (i + 3) + " is incorrect.  Substitute greeting with the value that it's initially assigned to.";
          }
        }

        if(textCharNum && textCharNum.getFieldValue("TEXT") && textCharNum.getFieldValue("TEXT") !== greeting) {
          return "The text before " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER +  " on line 3 is incorrect.  Substitute greeting with the value that it's initially assigned to.";
        }

        if(textToFindBlock) {
          const textToFind = textToFindBlock.getFieldValue("TEXT");
          if(textToFind && textToFind !== ch) {
            return "The text you substituted on line 4 is incorrect.  Remember to count all of the characters, starting from 0 and including spaces, when getting the character at position " + pos + ".";
          }

          if(textToFind === ch && resultBlock) {
            const num = resultBlock.getFieldValue("NUM");
            if(num === pos) {
              return "Remember that " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " gets the position of the *first* occurrence.";
            }
            else if(num !== greeting.indexOf(ch)) {  
              return "The number on the last line is incorrect.  Check the previous lines in order and then fix it accordingly; it should be the result of the substitution of " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + ".  Remember that positions start with 0 and to count spaces."; 
            }
          }
        }

        return "Replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).";

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
          //const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-826\" y=\"-467\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" movable=\"false\" x=\"-826\" y=\"-467\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\" movable=\"false\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\" movable=\"false\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\" movable=\"false\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\" movable=\"false\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\" movable=\"false\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\" movable=\"false\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\" movable=\"false\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\" movable=\"false\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\" movable=\"false\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\" movable=\"false\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\" movable=\"false\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\" movable=\"false\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\" movable=\"false\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\" movable=\"false\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\" movable=\"false\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\" movable=\"false\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\" movable=\"false\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\" movable=\"false\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\" movable=\"false\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\" movable=\"false\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\" movable=\"false\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\" movable=\"false\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\" movable=\"false\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\" movable=\"false\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"2\" y=\"0\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-315\" y=\"-235\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" movable=\"false\" x=\"-315\" y=\"-235\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\" movable=\"false\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\" movable=\"false\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\" movable=\"false\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\" movable=\"false\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\" movable=\"false\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\" movable=\"false\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\" movable=\"false\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\" movable=\"false\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\" movable=\"false\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\" movable=\"false\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\" movable=\"false\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\" movable=\"false\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\" movable=\"false\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\" movable=\"false\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\" movable=\"false\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\" movable=\"false\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\" movable=\"false\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\" movable=\"false\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\" movable=\"false\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\" movable=\"false\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\" movable=\"false\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\" movable=\"false\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\" movable=\"false\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\" movable=\"false\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\" movable=\"false\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\" movable=\"false\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\" movable=\"false\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\" movable=\"false\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\" movable=\"false\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\" movable=\"false\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\" movable=\"false\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\" movable=\"false\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\" movable=\"false\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-319\" y=\"-488\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          alert("✔ Nice x 4!  Did you notice that you did *not* get the number you started with this time.  Can you see why?  Well, the character you got appeared earlier.  So when you looked for its first position, you got a smaller number back.  Had you gotten the character at its first position (i.e., 4 in this case), and then asked for its position, you would have indeed gotten back the number you started with.  OK, one more code reading substitution example before we get to a code writing one!  We'll skip a few steps since it's a little long, but you're up for the challenge, right?");
          workspace.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "the code is here");
        const textPrint1 = workspace.getAllBlocks().filter(block => block.type === "text_print" && block.getNextBlock() === null && text0.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const text2 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "here");
        const text3 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == " is ");
        const t2cTextJoin4 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && text3.indexOf(block.getInputTargetBlock("A")) !== -1 && text2.indexOf(block.getInputTargetBlock("B")) !== -1);
        const text5 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "the code");
        const t2cTextJoin6 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && text5.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin4.indexOf(block.getInputTargetBlock("B")) !== -1);
        const textPrint7 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint1.indexOf(block.getNextBlock()) !== -1 && t2cTextJoin6.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const mathNumber8 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "5");
        const mathNumber9 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "1");
        const text10 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "Where is the code?");
        const t2cTextGetsubstring11 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text10.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber9.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathNumber8.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const t2cTextJoin13 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && text3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextGetsubstring11.indexOf(block.getInputTargetBlock("B")) !== -1);
        const mathNumber14 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "17");
        const mathNumber15 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "9");
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && text10.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathNumber14.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const t2cTextJoin18 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin13.indexOf(block.getInputTargetBlock("B")) !== -1);
        const textPrint19 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint7.indexOf(block.getNextBlock()) !== -1 && t2cTextJoin18.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesGet22 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "question");
        const t2cTextGetsubstring23 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && variablesGet22.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber9.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathNumber8.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const t2cTextJoin25 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && text3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextGetsubstring23.indexOf(block.getInputTargetBlock("B")) !== -1);
        const mathNumber27 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "18");
        const mathArithmeticBasic28 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && mathNumber27.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber9.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
        const mathNumber29 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") == "4");
        const mathArithmeticBasic31 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && mathNumber8.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber29.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring33 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && variablesGet22.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic31.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic28.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const t2cTextJoin34 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && t2cTextGetsubstring33.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin25.indexOf(block.getInputTargetBlock("B")) !== -1);
        const textPrint35 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint19.indexOf(block.getNextBlock()) !== -1 && t2cTextJoin34.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesGet36 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "part2");
        const variablesGet37 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "needle");
        const t2cTextJoin38 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && variablesGet37.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet36.indexOf(block.getInputTargetBlock("B")) !== -1);
        const variablesGet39 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "part1");
        const t2cTextJoin40 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && variablesGet39.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin38.indexOf(block.getInputTargetBlock("B")) !== -1);
        const textPrint41 = workspace.getAllBlocks().filter(block => block.type === "text_print" && textPrint35.indexOf(block.getNextBlock()) !== -1 && t2cTextJoin40.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const t2cTextIndexof44 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_indexof" && variablesGet22.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && variablesGet37.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const t2cTextGetsubstring47 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && variablesGet22.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber9.indexOf(block.getInputTargetBlock("AT1")) !== -1 && t2cTextIndexof44.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet48 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint41.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring47.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "part2");
        const t2cTextLength51 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet22.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathArithmeticBasic52 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && t2cTextLength51.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber9.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "MINUS");
        const mathArithmeticBasic57 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && t2cTextIndexof44.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber29.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring59 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_getsubstring" && variablesGet22.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic57.indexOf(block.getInputTargetBlock("AT1")) !== -1 && mathArithmeticBasic52.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet60 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet48.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring59.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "part1");
        const variablesSet62 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet60.indexOf(block.getNextBlock()) !== -1 && text3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "needle");
        const variablesSet64 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet62.indexOf(block.getNextBlock()) !== -1 && text10.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "question");
        return text0.length === 1 && textPrint1.length === 1 && text2.length === 1 && text3.length === 4 && t2cTextJoin4.length === 1 && text5.length === 1 && t2cTextJoin6.length === 1 && textPrint7.length === 1 && mathNumber8.length === 3 && mathNumber9.length === 5 && text10.length === 3 && t2cTextGetsubstring11.length === 1 && t2cTextJoin13.length === 1 && mathNumber14.length === 1 && mathNumber15.length === 1 && t2cTextGetsubstring17.length === 1 && t2cTextJoin18.length === 1 && textPrint19.length === 1 && variablesGet22.length === 7 && t2cTextGetsubstring23.length === 1 && t2cTextJoin25.length === 1 && mathNumber27.length === 1 && mathArithmeticBasic28.length === 1 && mathNumber29.length === 2 && mathArithmeticBasic31.length === 1 && t2cTextGetsubstring33.length === 1 && t2cTextJoin34.length === 1 && textPrint35.length === 1 && variablesGet36.length === 1 && variablesGet37.length === 3 && t2cTextJoin38.length === 1 && variablesGet39.length === 1 && t2cTextJoin40.length === 1 && textPrint41.length === 1 && t2cTextIndexof44.length === 2 && t2cTextGetsubstring47.length === 1 && variablesSet48.length === 1 && t2cTextLength51.length === 1 && mathArithmeticBasic52.length === 1 && mathArithmeticBasic57.length === 1 && t2cTextGetsubstring59.length === 1 && variablesSet60.length === 1 && variablesSet62.length === 1 && variablesSet64.length === 1;
      },
      new HelpMessageDirection(() => {
        const allBlocks = workspace.getAllBlocks(true);
        const textSubstrings = allBlocks.filter(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring")
          .map(block => block.getInputTargetBlock("STRING"))
          .filter(block => block && block.type === "text");
        const textNeedles = allBlocks.filter(block => block.type === "t2c_text_join" || block.type === "text_join")
          .map(block => block.getInputTargetBlock("B"))
          .filter(block => block && (block.type === "t2c_text_join" || block.type === "text_join"))
          .map(block => block.getInputTargetBlock("A"))
          .filter(block => block && block.type === "text");
        const firstNeedlePositionBlockLine6 = allBlocks.filter(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring")
          .map(block => block.getInputTargetBlock("AT1"))
          .filter(block => block && block.type === "math_arithmetic_basic")
          .map(block => block.getInputTargetBlock("A"))
          .find(block => block && block.type === "math_number");
        const lengthNumBlockLine6 = allBlocks.filter(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring")
          .map(block => block.getInputTargetBlock("AT2"))
          .filter(block => block && block.type === "math_arithmetic_basic")
          .map(block => block.getInputTargetBlock("A"))
          .find(block => block && block.type === "math_number");
        const secondNeedlePositionBlocks = allBlocks.filter(block => block.type === "t2c_text_join" || block.type === "text_join")
          .map(block => block.getInputTargetBlock("B"))
          .filter(block => block && (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring"))
          .map(block => block.getInputTargetBlock("AT2"))
          .filter(block => block && block.type === "math_number");
        const sum1Block = allBlocks.filter(block => block.type === "t2c_text_join" || block.type === "text_join")
          .map(block => block.getInputTargetBlock("A"))
          .filter(block => block && (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring"))
          .map(block => block.getInputTargetBlock("AT1"))
          .find(block => block && block.type === "math_number");
        const diff1Block = allBlocks.filter(block => block.type === "t2c_text_join" || block.type === "text_join")
          .map(block => block.getInputTargetBlock("A"))
          .filter(block => block && (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring"))
          .map(block => block.getInputTargetBlock("AT2"))
          .find(block => block && block.type === "math_number");
        const part1TextBlock = allBlocks.filter(block => (block.type === "t2c_text_join" || block.type === "text_join")
          && block.getParent() && (block.getParent().type === "text_print" || block.getParent().type === "js_text_print"))
          .map(block => block.getInputTargetBlock("A"))
          .find(block => block && block.type === "text");
        const part2TextBlock = allBlocks.filter(block => block.type === "t2c_text_join" || block.type === "text_join")
          .map(block => block.getInputTargetBlock("B"))
          .filter(block => block && (block.type === "t2c_text_join" || block.type === "text_join"))
          .map(block => block.getInputTargetBlock("B"))
          .find(block => block && block.type === "text");
        const resultBlock = allBlocks.find(block => block.type === "text" && block.getParent() 
          && (block.getParent().type === "text_print" || block.getParent().type === "js_text_print"))

        const question = "Where is the code?";
        const needle = " is ";
        const needlePos = question.indexOf(needle);

        for(let i = 0; i <= 1; i++) {
          const textBlock = textSubstrings[i];
          if(textBlock && textBlock.getFieldValue("TEXT") && textBlock.getFieldValue("TEXT") !== question) {
            return "The text before the " + (i === 0 ? "first " : "second ") + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER +  " on line 7 is incorrect.  Substitute question with the value that it's initially assigned to.";
          }
        }

        for(let i = 0; i <= 2; i++) {
          const textBlock = textNeedles[i];
          if(textBlock && textBlock.getFieldValue("TEXT") && textBlock.getFieldValue("TEXT") !== needle) {
            return "The text after the first + (for string concatenation, NOT numbers) on line " + (i+6) + " is incorrect.  Substitute needle with the value that it's initially assigned to (*including* a single space at the beginning *and* end).";
          }
        }

        if(firstNeedlePositionBlockLine6 && firstNeedlePositionBlockLine6.getFieldValue("NUM") && firstNeedlePositionBlockLine6.getFieldValue("NUM") !== needlePos) {
          return "The first number on line 6 (in the addition block) is incorrect.  It should be the substitution of " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + ", which will be the *starting* position of the first occurrence of the value of needle.  Fix it accordingly.";
        }

        if(lengthNumBlockLine6 && lengthNumBlockLine6.getFieldValue("NUM") && lengthNumBlockLine6.getFieldValue("NUM") !== question.length) {
          return "The third number on line 6 (in the subtraction block) should be the length of the value of question.  Fix it accordingly.";
        }

        for(let i = 0; i <= 1; i++) {
          const numBlock = secondNeedlePositionBlocks[i];
          if(numBlock && numBlock.getFieldValue("NUM") && numBlock.getFieldValue("NUM") !== needlePos) {
            return "The last number on line " + (i+6) + " is incorrect.  It should be the substitution of " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + ", which will be the *starting* position of the first occurrence of the value of needle.  Fix it accordingly.";
          }
        }

        if(firstNeedlePositionBlockLine6 && firstNeedlePositionBlockLine6.getFieldValue("NUM") && firstNeedlePositionBlockLine6.getFieldValue("NUM") === needlePos 
          && sum1Block && sum1Block.getFieldValue("NUM") && sum1Block.getFieldValue("NUM") !== needlePos + 4) {
          return "The first number on line 7 should be the result of the addition with 4 from the previous line.  Fix it accordingly.";
        }

        if(lengthNumBlockLine6 && lengthNumBlockLine6.getFieldValue("NUM") && lengthNumBlockLine6.getFieldValue("NUM") === question.length 
          && diff1Block && diff1Block.getFieldValue("NUM") && diff1Block.getFieldValue("NUM") !== question.length - 1) {
          return "The second number on line 7 should be the result of the subtraction by 1 from the previous line.  Fix it accordingly.";
        }

        if(firstNeedlePositionBlockLine6 && firstNeedlePositionBlockLine6.getFieldValue("NUM") && firstNeedlePositionBlockLine6.getFieldValue("NUM") === needlePos 
          && sum1Block && sum1Block.getFieldValue("NUM") && sum1Block.getFieldValue("NUM") === needlePos + 4 && 
          lengthNumBlockLine6 && lengthNumBlockLine6.getFieldValue("NUM") && lengthNumBlockLine6.getFieldValue("NUM") === question.length && 
          diff1Block && diff1Block.getFieldValue("NUM") && diff1Block.getFieldValue("NUM") === question.length - 1 &&
          part1TextBlock && part1TextBlock.getFieldValue("TEXT") && part1TextBlock.getFieldValue("TEXT") !== question.substring(needlePos+4,question.length-1)) {
          return "The first string on line 8 (before the text concatenation +) should be the result of the substitution of the first " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  Fix it accordingly.";
        }

        if(secondNeedlePositionBlocks[1] && secondNeedlePositionBlocks[1].getFieldValue("NUM") && secondNeedlePositionBlocks[1].getFieldValue("NUM") === needlePos && 
          part2TextBlock && part2TextBlock.getFieldValue("TEXT") && part2TextBlock.getFieldValue("TEXT") !== question.substring(1,needlePos)) {
          return "The last string on line 8 (after both text concatenation +) should be the result of the substitution of the second " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  Fix it accordingly.";
        }

        if(part1TextBlock && part1TextBlock.getFieldValue("TEXT") && part1TextBlock.getFieldValue("TEXT") === question.substring(needlePos+4,question.length-1) && 
          textNeedles[2] && textNeedles[2].getFieldValue("TEXT") && textNeedles[2].getFieldValue("TEXT") === needle && 
          part2TextBlock && part2TextBlock.getFieldValue("TEXT") && part2TextBlock.getFieldValue("TEXT") === question.substring(1,needlePos) && 
          resultBlock && resultBlock.getFieldValue("TEXT") && resultBlock.getFieldValue("TEXT") !== question.substring(needlePos+4,question.length-1) + needle + question.substring(1,needlePos)) {
            return "The string on the last line is incorrect; it should be the result of the substitution of the concatenation of the three strings above it on line 8."; 
          }

        return "Replace all the blank string literals and 0's with the appropriate text and numbers that are substituted as the computer would from top to bottom so that every line of output is the same.  Try to do this without running the program until you get the message to do so (when you filled in everything correctly).";

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
          // alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          // clearToolbox(workspace);
          // workspace.updateToolbox(document.getElementById("toolbox"));
          alert("👍 Bahut badhiya (Hindi for Very nice or Awesome)!  Just as reading more books can make you a better writer, reading through code excerpts and \"tracing\" code as the computer does will make you a better code writer!  It will also make you better at finding errors or bugs.\nIn the rest of this mission, you will get all of the text between the @ and the . in an e-mail address.  As a warm-up exercise, you'll get everything after the @ to start.")
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
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
        const t2cTextGetsubstring4 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathNumber2 && block.getInputTargetBlock("AT2") === t2cTextLength1);
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
        const t2cTextGetsubstring4 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring");
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
        const t2cTextIndexof5 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getInputTargetBlock("FIND") === text3);
        const mathArithmeticBasic6 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && (block.getInputTargetBlock("A") === t2cTextIndexof5 && block.getInputTargetBlock("B") === mathNumber2 || 
          block.getInputTargetBlock("B") === t2cTextIndexof5 && block.getInputTargetBlock("A") === mathNumber2) && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && block.getInputTargetBlock("AT1") === mathArithmeticBasic6 && block.getInputTargetBlock("AT2") === t2cTextLength1);
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
        const t2cTextIndexof5 = workspace.getAllBlocks().find(block => block.type === "t2c_text_indexof" || block.type === "js_text_indexof");
        const mathArithmeticBasic6 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring");
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
            if(needle === "") {
              return "Type in something the text (needle) you're searching for in the block with quotes";
            }
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
          const toolboxBlocks = ["type_in_between_at_and_period", "t2c_text_indexof", "math_arithmetic_basic", "text",  "variables_get", "math_number", "t2c_text_getsubstring", "t2c_text_length", "text_print", "text_input", "variables_set"]
          const maxBlocks = [1, 1, 1, 2, 3, 1, 1, 1, 1, 1, 1];
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

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "email");
        const t2cTextLength1 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber2 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const text3 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "@");
        const t2cTextIndexof5 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text3.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const mathArithmeticBasic6 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && (t2cTextIndexof5.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber2.indexOf(block.getInputTargetBlock("B")) !== -1 || 
           t2cTextIndexof5.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getInputTargetBlock("A") === mathNumber2) && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic6.indexOf(block.getInputTargetBlock("AT1")) !== -1 && block.getInputTargetBlock("AT2") === t2cTextLength1);
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getPreviousBlock() !== null && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring8);
        const text10 = workspace.getAllBlocks().find(block => block.type === "text" && 
          ((block.getFieldValue("TEXT") || "").toLowerCase().indexOf("email") !== -1 || (block.getFieldValue("TEXT") || "").toLowerCase().indexOf("e-mail") !== -1));
        const textInput11 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text10);
        const variablesSet12 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint9 && block.getInputTargetBlock("VALUE") === textInput11 && block.getField("VAR").getText() === "email");

        const text13 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == ".");
        const t2cTextIndexof15 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getInputTargetBlock("FIND") === text13);

        const t2cTextGetsubstring22 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic6.indexOf(block.getInputTargetBlock("AT1")) !== -1 && block.getInputTargetBlock("AT2") === t2cTextIndexof15);
        const textPrint23 = workspace.getAllBlocks().find(block => block.type === "text_print" && block.getPreviousBlock() === textPrint9 && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring22);

        return variablesGet0.length === 6 && t2cTextLength1 && mathNumber2.length === 2 && text3.length === 2 && t2cTextIndexof5.length === 2 && mathArithmeticBasic6.length === 2 && t2cTextGetsubstring8 && textPrint9 && text10 && textInput11 && variablesSet12 && text13 && t2cTextIndexof15 && t2cTextGetsubstring22 && textPrint23;
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
        const t2cTextIndexof5 = workspace.getAllBlocks().find(block => block.type === "t2c_text_indexof" || block.type === "js_text_indexof");
        const mathArithmeticBasic6 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic");
        const t2cTextGetsubstring8 = workspace.getAllBlocks().find(block => block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring");
        const textPrint9 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print"));

        const text13 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") == ".");
        const t2cTextIndexof15 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet0.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getInputTargetBlock("FIND") === text13);

        const t2cTextGetsubstring22 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet0.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic6.indexOf(block.getInputTargetBlock("AT1")) !== -1 && block.getInputTargetBlock("AT2") === t2cTextIndexof15);
        const textPrint23 = workspace.getAllBlocks().find(block => block.type === "text_print" && block.getInputTargetBlock("TEXT") === t2cTextGetsubstring22);

        const emailSampleInput = "coolcoder@gmail.com";

/*
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

        if(textPrint23 && t2cTextGetsubstring22 && textPrint23.getInputTargetBlock("TEXT") !== t2cTextGetsubstring22) {
          return "As with the last exercise, you'll want to show a substring of the e-mail so the " + T2C.MSG.currentLanguage["TERMINAL_GETTEXTFROMPOSITIONNUMBER"] + " should be placed in " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + ".";
        }
*/
        if(textPrint23 && variablesSet12 && textPrint23.getNextBlock() === variablesSet12) {
          return "Since instructions are run from top to bottom, you can't display a substring of email before the user enters it!";
        }

        if(textPrint23 && textPrint9.getPreviousBlock() === null) {
          return "Be sure to attach the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block below the previous " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block.";
        }

        return "Drag the type-in-code block, and attach it to the below the previously assembled " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.  Then type the necessary code to get the text between the first @ and the first ., e.g., the google in coolcoder@google.com or the mail in expertsoftwareengineer@mail.co.uk.  HINT: Use " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " as you did before, but consider how you'd use a second " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " to *stop* at the correct position number this time as you'd no longer use " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " since you don't want to stop at the end.  As before, make sure your calculations simultaneously work on coolcoder@google.com (start #: 10, end before #: 16), expertsoftwareengineer@mail.co.uk (start #: 23, end before #: 27), and jdoe@foo.edu (start #: 5, end before #: 8), or any other e-mail address by substituting as you did at the beginning.";
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
          alert("✔✔✔ Outstanding!  And with that, Mission # 5 is accomplished!  In the next mission, we'll take an input of last name, first name and display it as first name last name.  E.g., Doe, Jane would result in Jane Doe.  No new blocks next time, just more challenges with the existing ones!  Until next time!");
          hideOutputAndCodeContainers();
          toolboxManager.clearToolbox();
          ["code_statement"].forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = maxBlocks[index];
          });
          //assembledBlocks.forEach(block => block.setCollapsed(true));
        }
      }
    )
  );

  return citf;
}