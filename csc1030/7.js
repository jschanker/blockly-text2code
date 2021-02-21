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
        remainingText = remainingText.substring(result[0].length).trim();
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

// type_in_get_input_with_s

Blockly.Python['type_in_get_input_with_s'] = Blockly.JavaScript['type_in_get_input_with_s'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_input_with_s'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let s = prompt("Enter string with s");
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "enteredTextWithS", "=", T2C.MSG.JS.TERMINAL_GETINPUTBYASKING, '(', 
      {token: /^"[^"]*$|^'[^']*$|^"[^"]*with an s[^"]*"|^'[^']*with an s[^']*'/i, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring enteredTextWithS."),
        () => displayMessage("Remember to include an = after the variable enteredTextWithS to set it to a value."), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETINPUTBYASKING"), 
        (matchResultArr) => displayMessage("You're missing an open parenthesis after " + matchResultArr[3] + "."),
        () => displayMessage("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.  Be sure it also includes the text 'with an s' in it so the user knows that the string he/she enters must contain an s."),
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

Blockly.Python['type_in_set_s_pos'] = Blockly.JavaScript['type_in_set_s_pos'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_s_pos'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "sPosition", "=", "enteredTextWithS", ".", T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT, 
       '(', {token: /"s"|'s'/, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring _Position to represent the fact that it should store the position of the first _ (where _ is replaced with the character you're looking for)."),
        () => displayMessage("Remember to include an = after the variable sPosition you're declaring to set it to a value."), 
        () => displayMessage("Be sure to include the variable enteredTextWithS that you want to get the position of the s from."),
        () => displayMessage("Be sure to include the . after the variable enteredTextWithS you want to get the position of the first s from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("s")) {
            displayMessage("Since you're looking for the literal s and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.startsWith("'") || remaining.startsWith('"')) {
            if(remaining[1] !== "s") {
              displayMessage("What string literal are you getting the position for?")
            } else {
              displayMessage("You're only looking for the first s, correct?  If so, remember to close the quotation marks.");
            }
          } 
          else {
            displayMessage("Since the needle you're going to use here is a literal string and not an expression, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[5] + ".")
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

Blockly.Python['type_in_set_before_s'] = Blockly.JavaScript['type_in_set_before_s'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_before_s'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(firstName + " " + lastName)
    // maybe allow single quotes for literals

    const sampleInput = "Mississippi";
    const sampleInput2 = "sorry";
    const sampleInputBeforeS = sampleInput.substring(0, sampleInput.indexOf("s"));
    const sampleInputAfterS = sampleInput.substring(sampleInput.indexOf("s")+1);
    const sampleInput2BeforeS = sampleInput.substring(0, sampleInput.indexOf("s"));
    const sampleInput2AfterS = sampleInput.substring(sampleInput.indexOf("s")+1);

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "beforeS", "=", "enteredTextWithS", ".", T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER, 
       '(', '0', ',', 'sPosition', ')'],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring beforeS to represent the fact that it should store the text before the first occurrence of the s in the entered text."),
        () => displayMessage("Remember to include an = after the variable beforeS you're declaring to set it to the value that follows."), 
        () => displayMessage("Be sure to include the variable enteredTextWithS that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable enteredTextWithS you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else if(parseInt(remaining) === 1) {
            displayMessage("Remember that positions start at 0.");
          } else if(parseInt(remaining)) {
            displayMessage("The text occurring before the first s starts at the beginning of the string.  What number should you use if you want to start extracting text there?");
          } else {
            displayMessage("The text occurring before the first s starts at the beginning of the string so regardless of the string the user enters, the numerical position will always be the same.  Use a specific number, accordingly.")
          }
        },
        (matchResultArr) => displayMessage("You're missing a comma after the starting position.  In " + T2C.MSG.currentLanguage.LANGUAGE_NAME + ", you put the starting and ending positions in the same parentheses when using " + matchResultArr[5] + ".  The comma is used to separate the two positions with the starting position first and the ending position second in order for the computer to know which is which."),
        (matchResultArr, remaining) => {
          // variable commaPosition - stopping position
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place to stop extracting text cannot be a specific number if you want it to work in general regardless of the entered string with an s.  For an entered string of " + sampleInput + ", you'd use " + sampleInput.indexOf("s") + " (stopping before it), but for " + sampleInput2 + ", you'd want to use " + sampleInput2.indexOf("s") + ".  Since it depends on the position of the first s, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'd need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle, but remember that you're already assuming you have a variable that stores the position of the first s, which might help...")
          } else {
            displayMessage("For an entered string of " + sampleInput + ", you'd use " + sampleInput.indexOf("s") + " (stopping before it), but for " + sampleInput2 + ", you'd want to use " + sampleInput2.indexOf("s") + ".  Since it depends on the position of the first s, start by entering the appropriate variable name here."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        // ) for substring
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + matchResultArr[5] + " ends one position before the numerical expression given.  So for example, for an entered text of " + sampleInput + ", you'd want to use " + sampleInput.indexOf("s") + " so the last character you'd extract would be at position " + (sampleInput.indexOf("s")-1) + ", mainly the " + sampleInput[sampleInput.indexOf("s")-1] + " before the first s.  If you subtracted 1, you'd instead stop extracting text at position " + (sampleInput.indexOf("s")-2) + " so you'd instead incorrectly get the " + sampleInput[sampleInput.indexOf("s")-2] + " as the last character.");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("Although " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given, you want to stop before the first s anyway.  Adding 1 means you'll instead stop at the s.  For example, for an entered string of " + sampleInput + " the first s would be located at position " + sampleInput.indexOf("s") + " so by adding 1, you'd get " + (sampleInput.indexOf("s") + 1) + ", which means the last character you'd extract would be at position " + sampleInput.indexOf("s") + ", mainly the s itself.");
          }
          else {
            displayMessage("What you're doing to the ending position of " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " seems incorrect or unnecessary.  Be sure to have examples in mind before deciding what to type.  If you're done, be sure to include a closing parenthesis for " + matchResultArr[5] + " after the ending position.");
            // You're missing a closing parenthesis for "  + matchResultArr[9] + " after the ending position number.");
          }
        }
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

Blockly.Python['type_in_set_after_s'] = Blockly.JavaScript['type_in_set_after_s'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_after_s'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const sampleInput = "Mississippi";
    const sampleInput2 = "sorry";
    const sampleInputBeforeS = sampleInput.substring(0, sampleInput.indexOf("s"));
    const sampleInputAfterS = sampleInput.substring(sampleInput.indexOf("s")+1);
    const sampleInput2BeforeS = sampleInput2.substring(0, sampleInput.indexOf("s"));
    const sampleInput2AfterS = sampleInput2.substring(sampleInput.indexOf("s")+1);

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "afterS", "=", "enteredTextWithS", ".", T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER, 
       '(', 'sPosition', '+', '1', ",", "enteredTextWithS", ".", {token: "LENGTH", type: "terminal"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring afterS to represent the fact that it should store the text after the s from the user input."),
        () => displayMessage("Remember to include an = after the variable afterS you're declaring to set it to the value that follows."), 
        () => displayMessage("Be sure to include the variable enteredTextWithS that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable enteredTextWithS you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        (matchResultArr, remaining) => {
          // variable sPosition - 1: starting position
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place to start extracting text cannot be a specific number if you want it to work in general regardless of the entered string containing an s.  For an entered string of " + sampleInput + ", you'd use " + (sampleInput.indexOf("s")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf("s")+1) + ".  Since it depends on the position of the s, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'd need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle, but remember that you already have a variable that stores the position of the first s, which might help...")
          } else {
            displayMessage("For an entered string of " + sampleInput + ", you'd use " + (sampleInput.indexOf("s")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf("s")+1) + ".  Since it depends on the position of the first s, start by entering the appropriate variable name here."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        (matchResultArr, remaining) => {
          if(remaining.startsWith(")") || remaining.startsWith(",")) {
            displayMessage("You do not want to start extracting text at the first occurrence of the s exactly since you want to get the text that immediately follows it.  What arithmetic operation do you want to perform on the position number you get and with what number to start at the character after the s?  For " + sampleInput + ", the position of the first s will be at " + sampleInput.indexOf("s") + " but you'll want to start at position " + (sampleInput.indexOf("s") + 1) + ", with the second " + sampleInputAfterS[0] + " whereas for " + sampleInput2 + ", the position of the first s will be at " + sampleInput2.indexOf("s") + " but you'll want to start at position " + (sampleInput2.indexOf("s") + 1) + ", with " + sampleInput2AfterS[0] + ".");
          } else if(remaining.replace(/\s/g, "").startsWith("--1")) {
            displayMessage("Add 1 instead of subtracting -1 as this makes your code clearer.")
          } /*else if(remaining.replace(/\s/g, "").startsWith("+1")) {
            displayMessage("Remember that there's a space after the comma and you don't want to start with the space.");
          }*/ else {
            displayMessage("What arithmetic operation do you want to perform on the position number you get and with what number to start at the character after the s?  For " + sampleInput + ", the position of the first s will be at " + sampleInput.indexOf("s") + " but you'll want to start at position " + (sampleInput.indexOf("s") + 1) + ", with the second " + sampleInputAfterS[0] + " whereas for " + sampleInput2 + ", the position of the first s will be at " + sampleInput2.indexOf("s") + " but you'll want to start at position " + (sampleInput2.indexOf("s") + 1) + ", with " + sampleInput2AfterS[0] + ".");
          }
        },
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num) || remaining.startsWith("-")) {
            displayMessage("What number do you want to add to the position number of the first occurrence of the s to get to the position you want to start at?  For " + sampleInput + ", the position of the first s will be at " + sampleInput.indexOf("s") + " but you'll want to start at position " + (sampleInput.indexOf("s") + 1) + ", with " + sampleInputAfterS[0] + " whereas for " + sampleInput2 + ", the position of the first s will be at " + sampleInput2.indexOf("s") + " but you'll want to start at position " + (sampleInput2.indexOf("s") + 1) + ", with " + sampleInput2AfterS[1] + ".  Change this to the correct number, accordingly.");
          } else {
            displayMessage("If the user enters a string with an s such as e.g., " + sampleInput + " or " + sampleInput2 + ", then the number of places the last name will be beyond the position of the first s will always be the same so you can enter a *specific* number.   For " + sampleInput + ", the position of the first s will be at " + sampleInput.indexOf("s") + " but you'll want to start at position " + (sampleInput.indexOf("s") + 1) + ", with " + sampleInputAfterS[0] + " whereas for " + sampleInput2 + ", the position of the first s will be at " + sampleInput2.indexOf("s") + " but you'll want to start at position " + (sampleInput2.indexOf("s") + 1) + ", with " + sampleInput2AfterS[0] + ".  Change your answer to the specific number you can add in both cases, accordingly.");
          }
        },
        (matchResultArr) => displayMessage("You're missing a comma after the starting position.  In " + T2C.MSG.currentLanguage.LANGUAGE_NAME + ", you put the starting and ending positions in the same parentheses when using " + matchResultArr[5] + ".  The comma is used to separate the two positions with the starting position first and the ending position second in order for the computer to know which is which."),
        (matchResultArr, remaining) => {
          // variable enteredTextWithS
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            //HINT: Remember what you used when you wanted to get the position of the last character?  How is 15, the number we used for aap kaise hain, related to this string?  What would we use for theek?
            displayMessage("The stopping position will not always be at position " + num + ".  Instead, this position will depend on something about the entered string so your answer should refer to it.")
          } else if(remaining.startsWith("sPosition") || "sPosition".startsWith(remaining)) {
            displayMessage("You don't want to stop extracting text at sPosition, do you?");
          } else {
            displayMessage("If we want all of the characters after the first s, we won't stop extracting text until we get to the end of the string.  So for " + sampleInput + ", you'd use " + sampleInput.length + " while for " + sampleInput2 + ", you'd use " + sampleInput2.length + ", the position number after the last character.  Since this position number will depend on something about the entered string, your answer should refer to it.");
          }
        },
        () => displayMessage("Be sure to include the . after the variable enteredTextWithS you want to use."),
        (matchResultArr, remaining) => displayMessage("If we want all of the characters after the first s, we won't stop extracting text until we get to the end of the string.  For " + sampleInput + ", you'd use " + sampleInput.length + " while for " + sampleInput2 + ", you'd use " + sampleInput2.length + ", the position number after the last character.  Do you remember how you can get these positions from the entered string?"),
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for an enteredTextWithS of " + sampleInput + ", enteredTextWithS.length - 1 would be " + (sampleInput.length-1) + ", which means you'd extract the text ending with the " + sampleInput.charAt(sampleInput.length-2) + " instead of the last character of " + sampleInput.charAt(sampleInput.length-1) + ".");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("For an enteredTextWithS of " + sampleInput + ", enteredTextWithS.length + 1 would be " + (sampleInput.length+1) + ", but there is no character at this position since positions start at 0.");
          }
          else {
            displayMessage("What you're doing to the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " seems incorrect.  Be sure to have examples in mind before deciding what to type.  For example, for " + sampleInput + ", the length is " + sampleInput.length + " and you want to go up to position " + sampleInput.length + " (since you'd stop extracting at character " + (sampleInput.length-1) + ").  If you're done, be sure to include a closing parenthesis for " + matchResultArr[5] + " after the ending position.");
            // You're missing a closing parenthesis for "  + matchResultArr[9] + " after the ending position number.");
          }
        }
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
  }
  /*validate: function(colourHex) {
    console.warn("something");
    this.setColour("#f00");
  }*/
};

Blockly.Python['type_in_display_s_replaced_with_dollar'] = Blockly.JavaScript['type_in_display_s_replaced_with_dollar'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_display_s_replaced_with_dollar'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(beforeS + "$" + afterS)
    // maybe allow single quotes for literals

    const sampleInput = "Mississippi";
    const sampleInput2 = "sorry";
    const sampleInputBeforeS = sampleInput.substring(0, sampleInput.indexOf("s"));
    const sampleInputAfterS = sampleInput.substring(sampleInput.indexOf("s")+1);
    const sampleInput2BeforeS = sampleInput2.substring(0, sampleInput.indexOf("s"));
    const sampleInput2AfterS = sampleInput2.substring(sampleInput.indexOf("s")+1);
    const sampleOutput = sampleInputBeforeS + "$" + sampleInputAfterS;

    const result = matchStatement(exp, 
      [T2C.MSG.JS.TERMINAL_DISPLAY, "(", "beforeS", "+", {token: /^"\$"|^'\$'/, type: "regexp"}, "+", "afterS", ")"],
      [ 
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("\"") || remaining.startsWith("'")) {
            displayMessage("If you're using variable names to be evaluated instead of displayed as is (e.g., displaying the text Mi instead of the text beforeS), you don't want to use quotation marks.");
          } else {
            displayMessage("Remember the variable names are beforeS and afterS.  If beforeS = \"" + sampleInputBeforeS + "\" and afterS = \"" + sampleInputAfterS + "\" and you want to display \"" + sampleOutput + "\", what should be displayed first?")
          }
        },
        () => displayMessage("How do you join strings together?"),
        (matchResultArr, remaining) => {
          if("afterS".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("lastName".toLowerCase())) {
            displayMessage("Remember that you'll want a $ between what comes before and after the first s; joining the two strings together without one would result in \"" + sampleInputBeforeS + sampleInputAfterS + "\" instead of say \"" + sampleOutput + "\".");
          } else {
            displayMessage("Remember that you want to *literally* display a $ between what comes before and after the first s.  What do you need to surround text with when you want to display something without evaluating it?");
          }
        },
        () => displayMessage("How do you join strings together?"),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("\"") || remaining.startsWith("'")) {
            displayMessage("If you're using variable names to be evaluated instead of displayed as is (e.g., displaying the text " + sampleInputAfterS + " instead of the text afterS), you don't want to use quotation marks.");
          } else {
            displayMessage("Remember the variable names are beforeS and afterS.  If beforeS = \"" + sampleInputBeforeS + "\" and afterS = \"" + sampleInputAfterS + "\" and you want to display \"" + sampleOutput + "\", what should be displayed last?")
          }
        },
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

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  // alert("In previous missions, you'd use " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " to get a *single* character at a given numerical position in a string.  In this mission, you'll be using a new block " + T2C.MSG.EN["TERMINAL_GETTEXTFROM"] + " to display all characters between given starting and ending numerical positions.");
  const workspace = ws || Blockly.getMainWorkspace();
  const toolboxManager = new ToolboxManager(workspace);

  const sampleInput = "Mississippi";
  const splitIndex = sampleInput.indexOf("s");
  const sampleBeforeS = sampleInput.substring(0, splitIndex);
  const sampleAfterS = sampleInput.substring(splitIndex+1);
  const sampleOutput = sampleBeforeS + "$" + sampleAfterS;

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

  function setMaxesFromWorkspace(workspace) {
    const optionMaxInstances = workspace.options.maxInstances; 
    workspace.options.maxInstances = {};
    workspace.getAllBlocks().forEach(block => {
      workspace.options.maxInstances[block.type] = ++workspace.options.maxInstances[block.type] || 1;
    });
    Object.keys(optionMaxInstances).forEach(key => {
      workspace.options.maxInstances[key] = workspace.options.maxInstances[key] || optionMaxInstances[key];
    })
  }

  citf.addTask(
    new CourseInstructionTask(
      //() => document.getElementById("language").value === "js" || document.getElementById("language").value === "py",
      () => T2C.MSG.currentLanguage === T2C.MSG.JS,
      {
        start: () => {
          // const currentLanguage = document.getElementById("language").value;
          const initialBlocks = ["text_print", "text_input", "t2c_text_indexof", "t2c_text_getsubstring", "variables_set", "variables_get"];//, "variables_get", "math_number", "text", "variables_set"];
          const switchLanguageMsg = T2C.MSG.currentLanguage === T2C.MSG.JS ?
            "" : "So to start, select JavaScript from the dropdown menu at the top and watch how the blocks in the toolbox transform to their JavaScript equivalents.";// + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"]
          
          // set up level
          toolboxManager.clearToolbox();
          initialBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = 0;
          });

          alert("In this mission, you'll ask the user for a string with at least one (lowercase) s and then output the entered string with the first s replaced by $.  E.g., for " + sampleInput + ", the output would be " + sampleOutput + ".  This task can be accomplished similar to the way the last one was, but this time you're going to work in pure JavaScript.  " + switchLanguageMsg);
          workspace.clear();
          // Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          // workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();          
        },
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-319\" y=\"-488\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>"; 
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      //() => document.getElementById("language").value === "js" || document.getElementById("language").value === "py",
      () => true,
      {
        start: () => {
          alert("Theek hai (OK), so since you got the setup from last time for a similar problem, this time we'll work in the usual direction from the start of the program where we ask the user to enter a string and store it in a variable, which we'll call enteredTextWithS this time.  In pure JavaScript, we use " + T2C.MSG.JS.TERMINAL_GETINPUTBYASKING + " for " + T2C.MSG.EN.TERMINAL_GETINPUTBYASKING + ".  As before, you'll drag in a type-in-code block, and type in the code.");
          workspace.clear();
          // Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          // workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          toolboxManager.createToolboxBlock("type_in_get_input_with_s");
          workspace.options.maxInstances["type_in_get_input_with_s"] = 1;         
        },
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-319\" y=\"-488\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>"; 
        }
      }
    )
  );

// ask for input

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("with an s") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "enteredTextWithS");
        return text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
      },
      new HelpMessageDirection(() => {
        return "Drag in the type-in-code block, and type the necessary code to ask the user for a string with an s and store it in a variable enteredTextWithS.  Be sure the message contains the text 'with an s' to let the user know that his/her string needs at least one s and to use the JavaScript " + T2C.MSG.JS.TERMINAL_GETINPUTBYASKING + " instead of " + T2C.MSG.EN.TERMINAL_GETINPUTBYASKING + ".";
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
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          // alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          // clearToolbox(workspace);
          // workspace.updateToolbox(document.getElementById("toolbox"));
          // alert("Good, so now we're ready for today's main mission.  But since this is a challenging mission, we're going to plan ahead!  When you finish these training missions and need to take on a challenging new coding problem without guidance, you may find yourself lost and typing code that gets you nowhere.  In these situations, it may help to work backward from your objective, which is exactly what we're going to do here.  Since we want to display the user's name as \"first last\", let's suppose we have their first and last names stored in the variables firstName and lastName and *use them* to display the person's name with a space.");//we know we'll need to get their first and last names!  So let's pret ")
          alert("✔ Acchaa (Good), so last time we got the position of the comma so we could get the last name which came before it and the first name which came two places after.  Do you remember what we used to do this?  Just to make it more interesting, we'll give you the choices in JavaScript this time and see if you can figure out the equivalences.");//we know we'll need to get their first and last names!  So let's pret ")
          const firstNameQuestion = "Which of the following can be used to get the position of a needle (string) appearing in another one (haystack)? (Enter a, b, c, or d.)\nA. " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "\nB. " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "\nC. " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + "\nD. " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER;
          let firstNameResponse = prompt(firstNameQuestion); 
          while(typeof firstNameResponse === "string" && !firstNameResponse.toLowerCase().startsWith("b")) {
            firstNameResponse = prompt("No, " + firstNameResponse[0] + " is not correct.  Please try again.  " + firstNameQuestion);
          }
          alert((firstNameResponse ? "Yes" : "OK, we'll tell you") + ", B " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " is the correct answer.  The solution to the last problem could be thought of as taking a piece of paper with say |Doe, Jane|, making cuts around the comma |Doe|, |Jane| using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " to determine where to cut, " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " to get the pieces, and + to paste the ones we want to keep (with perhaps a new piece (the space)).  No rearrangement is needed here, but the idea is the same.  So let's start by determining/storing the position number to cut at.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // workspace.clear();
          const jsBlocks = ["js_text_print", "js_text_input", "js_text_indexof", "js_text_getsubstring", "variables_set", "variables_get", "text"];//, "variables_get", "math_number", "text", "variables_set"];
          
          toolboxManager.clearToolbox();
          jsBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = 0;
          });

          // toolboxManager.removeToolboxBlocks(block => block.type === "type_in_get_input_with_s");
          setMaxesFromWorkspace(workspace);
          toolboxManager.createToolboxBlock("type_in_set_s_pos");
          workspace.options.maxInstances["type_in_set_s_pos"] = 1;
        }
      }
    )
  );

// get position of first s

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredTextWithS");
        const text19 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === "s");
        const t2cTextIndexof21 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet6.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text19.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet22 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && t2cTextIndexof21.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "sPosition");
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("with an s") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet22.indexOf(block.getNextBlock()) !== -1 && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "enteredTextWithS");
        return variablesGet6.length === 1 && text19.length === 1 && t2cTextIndexof21.length === 1 && variablesSet22.length === 1 && text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
      },
      new HelpMessageDirection(() => {
        const variableSetInputBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "enteredTextWithS");
        const variableSetSPositionBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "sPosition");

        if(variableSetSPositionBlock && (variableSetSPositionBlock.getNextBlock() === variableSetInputBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring sPosition must go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting enteredTextWithS because it won't be able to find the position of the s in the entered string if it hasn't been entered yet!  Remember instructions are run from top to bottom.";
        }

        if(variableSetSPositionBlock && (variableSetSPositionBlock.getPreviousBlock() === null)) {
          return "Place the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring sPosition below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting enteredTextWithS, because the computer uses this variable to determine what sPosition is.";
        }

        return "Drag the type-in-code block, and attach it below the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " block.  Then type the necessary code to store the position number of the (first) _ from the value of enteredTextWithS in the variable called _Position filling in the blank with the character(s) in the same case (lower or upper) that you're searching for.";

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
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          // alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          // clearToolbox(workspace);
          // workspace.updateToolbox(document.getElementById("toolbox"));
          // alert("Good, so now we're ready for today's main mission.  But since this is a challenging mission, we're going to plan ahead!  When you finish these training missions and need to take on a challenging new coding problem without guidance, you may find yourself lost and typing code that gets you nowhere.  In these situations, it may help to work backward from your objective, which is exactly what we're going to do here.  Since we want to display the user's name as \"first last\", let's suppose we have their first and last names stored in the variables firstName and lastName and *use them* to display the person's name with a space.");//we know we'll need to get their first and last names!  So let's pret ")
          alert("✔ Bahut acchaa (Very good), so now let's get the text before the first s.  E.g., for \"" + sampleInput + "\", we'd want \"" + sampleBeforeS +  "\".  The equivalent of " + T2C.MSG.EN.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " in " + T2C.MSG.currentLanguage.LANGUAGE_NAME + " is " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " except you'll only use one set of parentheses with the starting and ending positions separated by a comma.  You can figure out how you could get the numerical starting and ending positions from enteredTextWithS and sPosition in " + T2C.MSG.currentLanguage.LANGUAGE_NAME + ", right?");//we know we'll need to get their first and last names!  So let's pret ")
          /*
          const firstNameQuestion = "Which of the following can be used to get a consecutive series of characters from part of this string? (Enter a, b, c, or d.)\nA. " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "\nB. " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "\nC. " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + "\nD. " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER;
          let firstNameResponse = prompt(firstNameQuestion); 
          while(typeof firstNameResponse === "string" && firstNameResponse.toLowerCase().startsWith("d")) {
            firstNameResponse = prompt("No, " + firstNameResponse[0] + "is not correct.  Please try again.  " + firstNameQuestion);
          }
          alert((firstNameResponse ? "Yes" : "OK, we'll tell you" + ", D " + T2C.MSG.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " is the correct answer.  Now this requires the string to extract text from and both starting and ending *numbers*, the first one telling the computer where to start extracting text from and the second telling it where to stop.  For an input of \"Doe, Jane\", the last name starts at the beginning and ends at the position of the comma.  So let's assume we have the input stored in enteredName and position of the comma in commaPosition and store the last name in a variable lastName, accordingly.");
          */
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // workspace.clear();
          toolboxManager.removeToolboxBlocks(block => block.getAttribute("type") === "type_in_set_s_pos");
          setMaxesFromWorkspace(workspace);
          toolboxManager.createToolboxBlock("type_in_set_before_s");
          workspace.options.maxInstances["type_in_set_before_s"] = 1;
        }
      }
    )
  );

  // before s

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredTextWithS");
        const variablesGet9 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "sPosition");
        const mathNumber15 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet6.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet9.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "beforeS");
        const text19 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === "s");
        const t2cTextIndexof21 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet6.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text19.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet22 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet18.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof21.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "sPosition");
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("with an s") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet22.indexOf(block.getNextBlock()) !== -1 && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "enteredTextWithS");
        return variablesGet6.length === 2 && variablesGet9.length === 1 && mathNumber15.length === 1 && t2cTextGetsubstring17.length === 1 && variablesSet18.length === 1 && text19.length === 1 && t2cTextIndexof21.length === 1 && variablesSet22.length === 1 && text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
      },
      new HelpMessageDirection(() => {
        const variableSetInputBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "enteredTextWithS");
        const variableSetSPositionBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "sPosition");
        const variableSetBeforeSBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "beforeS"); 

        if(variableSetBeforeSBlock && variableSetBeforeSBlock.getNextBlock() !== null) {
          const varName = variableSetBeforeSBlock.getNextBlock().type === "variables_set" && variableSetBeforeSBlock.getNextBlock().getField("VAR").getText();
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting beforeS must go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting " + varName + " because the computer uses this one to determine what beforeS is.  Since instructions are run from top to bottom, it won't know what  " + varName + " means, otherwise!";
        }

        if(variableSetBeforeSBlock && variableSetBeforeSBlock.getPreviousBlock() === null) {
          return "Place the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring beforeS below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting sPosition, because the computer uses this variable to determine what beforeS is.";
        }

        return "Drag the type-in-code block, and attach it below the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable block setting sPosition.  Then type the necessary code to store the text coming before the first s of the user input in beforeS (assuming there was an s).  E.g., for " + sampleInput + ", have it store " + sampleBeforeS;

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
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          // alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          // clearToolbox(workspace);
          // workspace.updateToolbox(document.getElementById("toolbox"));
          // alert("Good, so now we're ready for today's main mission.  But since this is a challenging mission, we're going to plan ahead!  When you finish these training missions and need to take on a challenging new coding problem without guidance, you may find yourself lost and typing code that gets you nowhere.  In these situations, it may help to work backward from your objective, which is exactly what we're going to do here.  Since we want to display the user's name as \"first last\", let's suppose we have their first and last names stored in the variables firstName and lastName and *use them* to display the person's name with a space.");//we know we'll need to get their first and last names!  So let's pret ")
          alert("✔ Mahaan (Great)!  So now let's get the text after the s.  E.g., for \"" + sampleInput + "\", we'd want \"" + sampleAfterS +  "\".");//we know we'll need to get their first and last names!  So let's pret ")
          /*
          const firstNameQuestion = "Which of the following can be used to get a consecutive series of characters from part of this string? (Enter a, b, c, or d.)\nA. " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "\nB. " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "\nC. " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + "\nD. " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER;
          let firstNameResponse = prompt(firstNameQuestion); 
          while(typeof firstNameResponse === "string" && firstNameResponse.toLowerCase().startsWith("d")) {
            firstNameResponse = prompt("No, " + firstNameResponse[0] + "is not correct.  Please try again.  " + firstNameQuestion);
          }
          alert((firstNameResponse ? "Yes" : "OK, we'll tell you" + ", D " + T2C.MSG.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " is the correct answer.  Now this requires the string to extract text from and both starting and ending *numbers*, the first one telling the computer where to start extracting text from and the second telling it where to stop.  For an input of \"Doe, Jane\", the last name starts at the beginning and ends at the position of the comma.  So let's assume we have the input stored in enteredName and position of the comma in commaPosition and store the last name in a variable lastName, accordingly.");
          */
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // workspace.clear();
          toolboxManager.removeToolboxBlocks(block => block.getAttribute("type") === "type_in_set_before_s");
          setMaxesFromWorkspace(workspace);
          toolboxManager.createToolboxBlock("type_in_set_after_s");
          workspace.options.maxInstances["type_in_set_after_s"] = 1;
        }
      }
    )
  );

  // after s
  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredTextWithS");
        const t2cTextLength7 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet6.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber8 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet9 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "sPosition");
        const mathArithmeticBasic10 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet9.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber8.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring12 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet6.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic10.indexOf(block.getInputTargetBlock("AT1")) !== -1 && t2cTextLength7.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet13 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && t2cTextGetsubstring12.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "afterS");
        const mathNumber15 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet6.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet9.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "beforeS");
        const text19 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "s");
        const t2cTextIndexof21 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet6.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text19.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet22 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet18.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof21.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "sPosition");
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("with an s") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet22.indexOf(block.getNextBlock()) !== -1 && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "enteredTextWithS");
        return variablesGet6.length === 4 && t2cTextLength7.length === 1 && mathNumber8.length === 1 && variablesGet9.length === 2 && mathArithmeticBasic10.length === 1 && t2cTextGetsubstring12.length === 1 && variablesSet13.length === 1 && mathNumber15.length === 1 && t2cTextGetsubstring17.length === 1 && variablesSet18.length === 1 && text19.length === 1 && t2cTextIndexof21.length === 1 && variablesSet22.length === 1 && text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
      },
      new HelpMessageDirection(() => {
        const variableSetInputBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "enteredTextWithS");
        const variableSetSPositionBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "sPosition"); 
        const variableSetAfterSBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "afterS"); 
        const variableSetBeforeSBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "beforeS"); 
        
        if(variableSetAfterSBlock && (variableSetAfterSBlock.getNextBlock() !== null && variableSetAfterSBlock.getNextBlock() !== variableSetBeforeSBlock)) {
          const varName = variableSetAfterSBlock.getNextBlock().type === "variables_set" && variableSetAfterSBlock.getNextBlock().getField("VAR").getText();
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting afterS must go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting " + varName + " because the computer uses this one to determine what afterS is.  Since instructions are run from top to bottom, it won't know what " + varName + " means, otherwise!";
        }

        if(variableSetAfterSBlock && (variableSetAfterSBlock.getNextBlock() === variableSetBeforeSBlock || variableSetAfterSBlock.getPreviousBlock() === null)) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting afterS below the previous " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " block setting beforeS.  E.g., for an entered string of " + sampleInput + ", you'd display " + sampleAfterS + ".";
        }

        return "Drag the type-in-code block, and attach it below the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " variable block setting beforeS.  Then type the necessary code to store the text coming after the first s of the user input in afterS (assuming there was an s).";

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
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          // alert("👍 Great!  So are you seeing 2 lines of text here, or did you get an error?  If you received an error, it means your text that you entered wasn't long enough.  E.g., you can't extract all the characters from the input from position 1 to before position 15 for an input of bahut acchaa whose last character appears at position 11 (positions 12, 13, and 14 don't exist for this string!).  On the other hand, if your text was too long, you wouldn't get all of the characters beyond the initial one.  So to conclude this mission, let's fix this problem so it works for any string with at least 1 character!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          // clearToolbox(workspace);
          // workspace.updateToolbox(document.getElementById("toolbox"));
          // alert("Good, so now we're ready for today's main mission.  But since this is a challenging mission, we're going to plan ahead!  When you finish these training missions and need to take on a challenging new coding problem without guidance, you may find yourself lost and typing code that gets you nowhere.  In these situations, it may help to work backward from your objective, which is exactly what we're going to do here.  Since we want to display the user's name as \"first last\", let's suppose we have their first and last names stored in the variables firstName and lastName and *use them* to display the person's name with a space.");//we know we'll need to get their first and last names!  So let's pret ")
          alert("✔✔ Excellent, so now we display the result of pasting, which will be the same in " + T2C.MSG.currentLanguage.LANGUAGE_NAME + " that it was in " + T2C.MSG.EN.LANGUAGE_NAME + ".  E.g., for an input of " + sampleInput + " , we'd have a beforeS of " + sampleBeforeS + ", an afterS of " + sampleAfterS + " and would want " + sampleOutput + ".");//we know we'll need to get their first and last names!  So let's pret ")
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // workspace.clear();
          //toolboxManager.clearToolbox();
          toolboxManager.removeToolboxBlocks(block => block.getAttribute("type") === "type_in_set_after_s");
          setMaxesFromWorkspace(workspace);
          toolboxManager.createToolboxBlock("type_in_display_s_replaced_with_dollar");
          workspace.options.maxInstances["type_in_display_s_replaced_with_dollar"] = 1;
        }
      }
    )
  );

  // display s replaced with $
  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "afterS");
        const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "$");
        const t2cTextJoin2 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
        const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "beforeS");
        const t2cTextJoin4 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
        const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredTextWithS");
        const t2cTextLength7 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet6.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber8 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet9 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "sPosition");
        const mathArithmeticBasic10 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet9.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber8.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring12 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet6.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic10.indexOf(block.getInputTargetBlock("AT1")) !== -1 && t2cTextLength7.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet13 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && t2cTextGetsubstring12.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "afterS" && textPrint5.indexOf(block.getNextBlock()) !== -1);
        const mathNumber15 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet6.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet9.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "beforeS" && variablesSet13.indexOf(block.getNextBlock()) !== -1);
        const text19 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == "s");
        const t2cTextIndexof21 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet6.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text19.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet22 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet18.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof21.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "sPosition");
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("with an s") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet22.indexOf(block.getNextBlock()) !== -1 && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "enteredTextWithS");
        return  variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1 && variablesGet6.length === 4 && t2cTextLength7.length === 1 && mathNumber8.length === 1 && variablesGet9.length === 2 && mathArithmeticBasic10.length === 1 && t2cTextGetsubstring12.length === 1 && variablesSet13.length === 1 && mathNumber15.length === 1 && t2cTextGetsubstring17.length === 1 && variablesSet18.length === 1 && text19.length === 1 && t2cTextIndexof21.length === 1 && variablesSet22.length === 1 && text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
      },
      new HelpMessageDirection(() => {
        const variableSetInputBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "enteredTextWithS");
        const textPrintBlock = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print"); 
        if(variableSetInputBlock && textPrintBlock && (textPrintBlock.getNextBlock() === variableSetInputBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block must go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting enteredTextWithS because the computer uses enteredTextWithS in beforeS and afterS, both which need enteredTextWithS to determine what they are.  Since instructions are run from top to bottom, it won't be able to determine beforeS and afterS, which are used in the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " otherwise!";
        }

        if(textPrintBlock && (textPrintBlock.getNextBlock() !== null)) {
          const varName = textPrintBlock.getNextBlock().type === "variables_set" && textPrintBlock.getNextBlock().getField("VAR").getText();
          return "The " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block must go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting " + varName + " because the computer uses  " + varName + " in what it displays!  Since instructions are run from top to bottom, it won't know what  " + varName + " means, otherwise!";
        }

        if(textPrintBlock && textPrintBlock.getPreviousBlock() === null) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block below the previous " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " block setting afterS.";
        }

        return "Drag the type-in-code block, and type the necessary code to display the user's entered string with its first s replaced by a $ (assuming the user typed in a string with at least one s).  E.g., for an entered string of " + sampleInput + ", you'd display " + sampleOutput + ".";

        // return "Drag the type-in-code block, and attach it above the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " block.  Then type the necessary code to ask the user for their full name in the form last, first, including the space after the comma (e.g., as Doe, Jane) and storing his/her inputted name in enteredName.";

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
          alert("✔✔✔ Outstanding!  And with that, Mission # 7 is accomplished and you just typed an entire program in pure JavaScript!  That wasn't too bad was it?  In the next mission 8, you'll get a person's first/last initials from their first and last name.  As you did in this mission, you'll be typing code in pure JavaScript except you'll be returning to the " + T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER + " to get single characters at given positions.  Phir milenge (See you again)!");
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