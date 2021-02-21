import {getParseTree, handleParseTreeToBlocks, workspaceToLanguageCode} from "../core/mobile.js";
import {refreshWorkspace, newBlock, setValueInput, setFieldValue} from "../core/block_utility_functions.js";
import ToolboxManager from "../core/toolbox_manager.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
import TypeInCodeBlock from "../core/type_in_code_block.js";

const sampleInput = "apple,banana,cantaloupe,kiwi,orange";
const sampleInput2 = "atari,nintendo,sega genesis,super nintendo";
const sampleInputAfterFirst = sampleInput.substring(sampleInput.indexOf(",")+1);
const sampleInput2AfterFirst = sampleInput2.substring(sampleInput2.indexOf(",")+1);
const sampleInputAfterSecond = sampleInputAfterFirst.substring(sampleInputAfterFirst.indexOf(",")+1);
const sampleInput2AfterSecond = sampleInput2AfterFirst.substring(sampleInput2AfterFirst.indexOf(",")+1);
const sampleOutput = sampleInput2AfterSecond.substring(0, sampleInput.indexOf(","));
const sampleOutput2 = sampleInput2AfterSecond.substring(0, sampleInput.indexOf(","));

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

function oneStartsWithOther(s, t, matchCase=false) {
  const compareS = matchCase ? s : s.toLowerCase();
  const compareT = matchCase ? t : t.toLowerCase();

  return compareS.startsWith(compareT) || compareT.startsWith(compareS);
}

function getAfterTerminal(inputted, terminal) {
  const langTerminals = Object.values(T2C.MSG)
    .map(langObj => langObj["TERMINAL_" + terminal.toUpperCase()])
    .filter(text => typeof text === "string");
  const val = langTerminals.find(text => oneStartsWithOther(text, inputted, true));
    // text.startsWith(inputted) || inputted.startsWith(text));
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

Blockly.Python['type_in_get_item_list'] = Blockly.JavaScript['type_in_get_item_list'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_item_list'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let fullName = prompt("Enter string with s");
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "itemList", "=", T2C.MSG.JS.TERMINAL_GETINPUTBYASKING, '(', 
      {token: /^"[^"]*$|^'[^']*$|^"[^"]*at least 4[^"]*"|^'[^']*at least 4[^']*'/i, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring itemList."),
        () => displayMessage("Remember to include an = after the variable itemList to set it to a value."), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETINPUTBYASKING"), 
        (matchResultArr) => displayMessage("You're missing an open parenthesis after " + matchResultArr[3] + "."),
        () => displayMessage("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.  Be sure it also includes the text 'at least 4' in it so the user knows to enter at least 4 items (separated by commas)."),
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

Blockly.Python['type_in_set_after_first'] = Blockly.JavaScript['type_in_set_after_first'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_after_first'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "afterFirstComma", "=", "itemList", ".", T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER, 
       '(', "itemList", ".", T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT, "(", {token: /^","|^','/, type: "regexp"}  ,")", '+', '1', ",", "itemList", ".", {token: "LENGTH", type: "terminal"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring afterFirstComma to represent the fact that it should store the text after the first comma from the user input."),
        () => displayMessage("Remember to include an = after the variable afterFirstComma you're declaring to set it to the value that follows."), 
        () => displayMessage("Be sure to include the variable itemList that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable itemList you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        // itemList


        // fullName
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place in the string where the second item begins (after the first comma) will not be always be the same number.  For an itemList of " + sampleInput + ", you'd use " + (sampleInput.indexOf(",")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf(",") + 1) + ".  Since it depends on some property of the entered item list, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(remaining.startsWith(",")) {
            displayMessage("You need a position *number* to start extracting text from here, but a comma is not a number.  Perhaps you wanted the position of the comma instead?");
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'll need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle.")
          } else if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else {
            displayMessage("The correct place in the string where the second item begins (after the first comma) will be a number depending on the entered string.  For an itemList of " + sampleInput + ", you'd use " + (sampleInput.indexOf(",")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf(",") + 1) + ".  Since it depends on some property of the entered item list, start by entering the appropriate variable name here instead of what you have."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable itemList you want to search."),
        
        // genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => {
          if(oneStartsWithOther(remaining, T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER)) {
            //T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER.toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith(T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER.toLowerCase())) {
            displayMessage("You're already inside the parentheses of a " + T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  What do you need to give the computer now so it knows what position to start extracting text from to get the text after the first comma?");
          } else if(oneStartsWithOther(remaining, T2C.MSG.JS.TERMINAL_LENGTH)) { 
            displayMessage("You don't want to *start* extracting text after the last character of the string, right?");
          } else if(oneStartsWithOther(remaining, T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER)) {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " gives you a character, but you need a position *number* to start extracting text from for " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " to start extracting text from.");
          } else {
            displayMessage("What property of itemList do you want to determine where to start extracting text from?  Make sure your spelling and capitalization (e.g., M versus m) are correct.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        
        // comma in quotes you're searching for
        
        (matchResultArr, remaining) => {
          if(remaining.startsWith(",")) {
            displayMessage("Since you're looking for the literal , and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.match(/^",[^"]|^',[^']/)) {
            displayMessage("Remember that that second item of the entered input won't always start with " + remaining[2] + ".  Is it really necessary to include?  If you're done, close the quotation marks.");
          } else if(remaining.match(/^",$|^"$|^',$|^'$/)) {
            // this is correct, by displaying blank, other messages will be able to make use of the display div
            displayMessage("");
          } else if(parseInt(remaining) || remaining.startsWith("0")) {
            displayMessage("You're looking for the first position number of a character in itemList to tell you where the beginning of the second item is, you are not searching for the *position* of " + parseInt(remaining) + " in itemList.");
          } else if(!remaining.match(/^"|^'/)) {
            displayMessage("Since the needle you're going to use here is a string literal, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          } else {
            displayMessage("What string (needle) are you looking for in itemList (haystack) to help you calculate the position number of the start of the second item?");
          }
        },
        // (matchResultArr, remaining) => displayMessage("What string do you want to get the position of to help you determine where you should start? " + (remaining.indexOf('"') === -1 ? remaining : remaining.substring(0, remaining.indexOf('"'))) + " is not correct."),
        // (matchResultArr, remaining) => displayMessage("You're missing closing quotation marks for " + matchResultArr[matchResultArr.length-1] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("+")) {
            displayMessage("Be careful where you place the +; you certainly don't want to add a number to a comma!  Instead you want to add a number to the *position* of the comma in itemList so it should go outside of the " + matchResultArr[9] + ".");
          } else {
            displayMessage("You're missing a closing parenthesis for " + matchResultArr[9] + ".");
          }
        },
        (matchResultArr, remaining) => {
          if(remaining.startsWith(",") || remaining.startsWith(")")) {
            displayMessage("You do not want to start extracting text from the position of the comma exactly or the result will start with the comma!  Instead, you'll want to start extracting text from the position after so you'll need to do what arithmetic operation to the position number you get?  For itemList of " + sampleInput + ", the position of the comma will be at " + sampleInput.indexOf(",") + " while for itemList of " + sampleInput2 + ", the position of the comma will be at " + sampleInput2.indexOf(",") + ".  What position will the start of the second item be in each case?");
          } else if(remaining.replace(/\s/g, "").startsWith("-1")) {
            displayMessage("If you subtract 1, you'll get the position of the last character of the first item.  Instead, you'll want to start extracting text from the position after the comma so you'll need to do what arithmetic operation to the position number you get?  For example, for an itemList of " + sampleInput + ", the position of the comma will be at " + sampleInput.indexOf(",") + " so subtracting 1 will give you " + (sampleInput.indexOf(",")-1) + ", which will be the position of the first " + sampleInput.charAt(sampleInput.indexOf(",")-1) + ".  What do you want to do instead to get the position of the start of the second item from the position of the comma?");
          } else if(remaining.replace(/\s/g, "").startsWith("--1")) {
            displayMessage("Add 1 instead of subtracting -1 as this makes your code clearer.")
          } else {
            displayMessage("What operation and number should you use on the position of the comma you get from " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "?  Remember, you'll want to start extracting text from the position after the comma so you'll need to do what arithmetic operation to the position number you get?  For itemList of " + sampleInput + ", the position of the comma will be at " + sampleInput.indexOf(",") + " while for itemList of " + sampleInput2 + ", the position of the comma will be at " + sampleInput2.indexOf(",") + ".  What position will the start of the second item be in each case?");
          }
        },
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num) || remaining.startsWith("-")) {
            displayMessage("What number do you want to add to the position number of the first occurrence of the comma to get to the position of the start of the second item after it?  Change this to the correct number.");
          } else {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " gives you back a number.  What specific *number* do you want to add to the position number of the first occurrence of the comma to get to the position you want to start at?  Change this to the correct number.  For itemList of " + sampleInput + ", the position of the comma will be at " + sampleInput.indexOf(",") + " while for itemList of " + sampleInput2 + ", the position of the comma will be at " + sampleInput2.indexOf(",") + ".  To figure out what you want to add, what position will the start of the second item be in each case?");
          }
        },
        (matchResultArr) => displayMessage("You're missing a comma after the starting position.  In " + T2C.MSG.currentLanguage.LANGUAGE_NAME + ", you put the starting and ending positions in the same parentheses when using " + matchResultArr[5] + ".  The comma is used to separate the two positions with the starting position first and the ending position second in order for the computer to know which is which."),
        (matchResultArr, remaining) => {
          // variable enteredTextWithS
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            //HINT: Remember what you used when you wanted to get the position of the last character?  How is 15, the number we used for aap kaise hain, related to this string?  What would we use for theek?
            displayMessage("The stopping position will not always be at position " + num + ".  Instead, this position will depend on something about the entered string so your answer should refer to it.")
          } /*else if(remaining.startsWith("commaPosition") || "commaPosition".startsWith(remaining)) {
            displayMessage("You don't want to stop extracting text at commaPosition, do you?");
          }*/ else {
            displayMessage("If we want all of the characters after the first comma, we won't stop extracting text until we get to the end of the string.  So for " + sampleInput + ", you'd use " + sampleInput.length + " while for " + sampleInput2 + ", you'd use " + sampleInput2.length + ", the position number after the last character.  Since this position number will depend on something about the entered string, your answer should refer to it.");
          }
        },
        () => displayMessage("Be sure to include the . after the variable itemList you want to use."),
        (matchResultArr, remaining) => displayMessage("If we want all of the characters after the first comma, we won't stop extracting text until we get to the end of the string.  For " + sampleInput + ", you'd use " + sampleInput.length + " while for " + sampleInput2 + ", you'd use " + sampleInput2.length + ", the position number after the last character.  Do you remember how you can get these positions from the entered string?"),
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for an itemList of " + sampleInput + ", itemList.length - 1 would be " + (sampleInput.length-1) + ", which means you'd extract the text ending with the " + sampleInput.charAt(sampleInput.length-2) + " instead of the last character of " + sampleInput.charAt(sampleInput.length-1) + ".");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("For an itemList of " + sampleInput + ", itemList.length + 1 would be " + (sampleInput.length+1) + ", but there is no character at this position since positions start at 0.");
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

Blockly.Python['type_in_set_after_second'] = Blockly.JavaScript['type_in_set_after_second'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_after_second'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "afterSecondComma", "=", "afterFirstComma", ".", T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER, 
       '(', "afterFirstComma", ".", T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT, "(", {token: /^","|^','/, type: "regexp"}  ,")", '+', '1', ",", "afterFirstComma", ".", {token: "LENGTH", type: "terminal"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring afterSecondComma to represent the fact that it should store the text after the second comma from the user input."),
        () => displayMessage("Remember to include an = after the variable afterSecondComma you're declaring to set it to the value that follows."), 
        () => {
          if(oneStartsWith(remaining, "itemList")) {
            displayMessage("If you're using the originial inputted itemList, you will *not* be able to extract the text after the *second* comma in general when you're only able to get the position of its first comma.  What variable can you use instead?");
          } else {
            displayMessage("Be sure to include the variable that you want to extract text from.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable afterFirstComma you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        
        // afterFirstComma to start searching
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place in the inputted itemList where the third item begins (after the first comma in afterFirstComma) will not be always be the same number.  For an afterFirstComma of " + sampleInputAfterFirst + ", you'd use " + (sampleInputAfterFirst.indexOf(",")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2AfterFirst.indexOf(",") + 1) + ".  Since it depends on some property of afterFirstComma, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(oneStartsWithOther(remaining, "itemList")) {
            displayMessage("If you're using the original inputted itemList, you will *not* be able to extract the text after the *second* comma in general when you're only able to get the position of its first comma.  For example, the position of the first comma in " + sampleInput + " is " + sampleInput.indexOf(",") + " while the position of the first comma in " + sampleInput + " with its first item removed (" + sampleInputAfterFirst + ") is " + sampleInputAfterFirst.indexOf(",") + ".  Perhaps you want to use a different variable?");
          } else if(remaining.startsWith(",")) {
            displayMessage("You need a position *number* to start extracting text from here, but a comma is not a number.  Perhaps you wanted the position of the comma instead?");
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'll need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle.")
          } else if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else {
            displayMessage("The correct place in the string where the third item begins (after the first comma in afterFirstComma) will be a number depending on the entered string.  For an afterFirstComma of " + sampleInputAfterFirst + ", you'd use " + (sampleInputAfterFirst.indexOf(",")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2AfterFirst.indexOf(",") + 1) + ".  Since it depends on some property of afterFirstComma, start by entering the appropriate variable name here instead of what you have."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable afterFirstComma you want to search."),
        
        // genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => {
          if(oneStartsWithOther(remaining, T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER)) {
            displayMessage("You're already inside the parentheses of a " + T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  What do you need to give the computer now so it knows what position to start extracting text from to get the text after the first comma in afterFirstComma?");
          } else if(oneStartsWithOther(remaining, T2C.MSG.JS.TERMINAL_LENGTH)) {
            displayMessage("You don't want to *start* extracting text after the last character of the string, right?");
          } else if(oneStartsWithOther(remaining, T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER)) {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " gives you a character, but you need a position *number* to start extracting text from for " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " to start extracting text from.");
          } else {
            displayMessage("What property of afterFirstComma do you want to determine where to start extracting text from?  Make sure your spelling and capitalization (e.g., M versus m) are correct.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        
        // comma in quotes you're searching for
        
        (matchResultArr, remaining) => {
          if(remaining.startsWith(",")) {
            displayMessage("Since you're looking for the literal , and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.match(/^",[^"]|^',[^']/)) {
            displayMessage("Remember that that second item of afterFirstComma won't always start with " + remaining[2] + ".  Is it really necessary to include?  If you're done, close the quotation marks.");
          } else if(remaining.match(/^",$|^"$|^',$|^'$/)) {
            // this is correct, by displaying blank, other messages will be able to make use of the display div
            displayMessage("");
          } else if(parseInt(remaining) || remaining.startsWith("0")) {
            displayMessage("You're looking for the first position number of a character in afterFirstComma to tell you where the beginning of the second item in afterFirstComma is (third item in original itemList), you are not searching for the *position* of " + parseInt(remaining) + " in afterFirstComma.");
          } else if(!remaining.match(/^"|^'/)) {
            displayMessage("Since the needle you're going to use here is a string literal, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          } else {
            displayMessage("What string (needle) are you looking for in afterFirstComma (haystack) to help you calculate the position number of the start of its second item (third item in original list)?");
          }
        },
        // (matchResultArr, remaining) => displayMessage("What string do you want to get the position of to help you determine where you should start? " + (remaining.indexOf('"') === -1 ? remaining : remaining.substring(0, remaining.indexOf('"'))) + " is not correct."),
        // (matchResultArr, remaining) => displayMessage("You're missing closing quotation marks for " + matchResultArr[matchResultArr.length-1] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("+")) {
            displayMessage("Be careful where you place the +; you certainly don't want to add a number to a comma!  Instead you want to add a number to the *position* of the comma in afterFirstComma so it should go outside of the " + matchResultArr[9] + ".");
          } else {
            displayMessage("You're missing a closing parenthesis for " + matchResultArr[9] + ".");
          }
        },
        (matchResultArr, remaining) => {
          if(remaining.startsWith(",") || remaining.startsWith(")")) {
            displayMessage("You do not want to start extracting text from the position of the comma exactly or the result will start with the comma!  Instead, you'll want to start extracting text from the position after so you'll need to do what arithmetic operation to the position number you get?  For afterFirstComma of " + sampleInputAfterFirst + ", the position of the first comma will be at " + sampleInputAfterFirst.indexOf(",") + " while for afterFirstComma of " + sampleInput2AfterFirst + ", the position of the comma will be at " + sampleInput2AfterFirst.indexOf(",") + ".  What position will the start of the second item from afterFirstComma be in each case?");
          } else if(remaining.replace(/\s/g, "").startsWith("-1")) {
            displayMessage("If you subtract 1, you'll get the position of the last character of the first item.  Instead, you'll want to start extracting text from the position after the comma so you'll need to do what arithmetic operation to the position number you get?  For example, for an afterFirstComma of " + sampleInputAfterFirst + ", the position of the first comma will be at " + sampleInputAfterFirst.indexOf(",") + " so subtracting 1 will give you " + (sampleInputAfterFirst.indexOf(",")-1) + ", which will be the position of the first " + sampleInputAfterFirst.charAt(sampleInput.indexOf(",")-1) + ".  What do you want to do instead to get the position of the start of the second item in afterFirstComma?");
          } else if(remaining.replace(/\s/g, "").startsWith("--1")) {
            displayMessage("Add 1 instead of subtracting -1 as this makes your code clearer.")
          } else {
            displayMessage("What operation and number should you use on the position of the first comma from afterFirstComma you get from " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "?  Remember, you'll want to start extracting text from the position after the comma so you'll need to do what arithmetic operation to the position number you get?  For afterFirstComma of " + sampleInputAfterFirst + ", the position of its first comma will be at " + sampleInputAfterFirst.indexOf(",") + " while for afterFirstComma of " + sampleInput2AfterFirst + ", the position of the comma will be at " + sampleInput2AfterFirst.indexOf(",") + ".  What position will the start of the second item from afterFirstComma be in each case?");
          }
        },
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num) || remaining.startsWith("-")) {
            displayMessage("What number do you want to add to the position number of the first occurrence of the comma to get to the position of the start of the second item in afterFirstComma after it?  Change this to the correct number.");
          } else {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " gives you back a number.  What specific *number* do you want to add to the position number of the first occurrence of the comma in afterFirstComma to get to the position you want to start at?  Change this to the correct number.  For afterFirstComma of " + sampleInputAfterFirst + ", the position of the first comma will be at " + sampleInputAfterFirst.indexOf(",") + " while for afterFirstComma of " + sampleInput2AfterFirst + ", the position of the first comma will be at " + sampleInput2AfterFirst.indexOf(",") + ".  To figure out what you want to add, what position will the start of the second item be in each case?");
          }
        },
        (matchResultArr) => displayMessage("You're missing a comma after the starting position.  In " + T2C.MSG.currentLanguage.LANGUAGE_NAME + ", you put the starting and ending positions in the same parentheses when using " + matchResultArr[5] + ".  The comma is used to separate the two positions with the starting position first and the ending position second in order for the computer to know which is which."),
        (matchResultArr, remaining) => {
          // variable afterFirstComma
          const num = parseInt(remaining);
          if(oneStartsWithOther(remaining, "itemList")) {
            // displayMessage("If we want all of the characters after the first comma in afterFirstComma, the ending position we give to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " will need to be " + sampleInputAfterFirst.length + " for " + sampleInputAfterFirst + " and " + sampleInput2AfterFirst.length + " for " + sampleInput2AfterFirst + ".  These are different than one more than the ending positions for " + sampleInput + " and " + sampleInput2 + ", which would be " + sampleInput.length " and " + sampleInput2.length + ", respectively.  It'll be easier to work ");
            displayMessage("If we want all of the characters after the first comma in afterFirstComma, the ending position we give to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " will need to be " + sampleInputAfterFirst.length + " for " + sampleInputAfterFirst + " and " + sampleInput2AfterFirst.length + " for " + sampleInput2AfterFirst + ".  These are different than one more than the ending positions for " + sampleInput + " and " + sampleInput2 + ", which would be " + sampleInput.length + " and " + sampleInput2.length + ", respectively.  No calculations will be required if we work with afterFirstComma instead.");
          }
          if(!isNaN(num)) {
            //HINT: Remember what you used when you wanted to get the position of the last character?  How is 15, the number we used for aap kaise hain, related to this string?  What would we use for theek?
            displayMessage("The stopping position will not always be at position " + num + ".  Instead, this position will depend on something about afterFirstComma so your answer should refer to it.")
          } /*else if(remaining.startsWith("commaPosition") || "commaPosition".startsWith(remaining)) {
            displayMessage("You don't want to stop extracting text at commaPosition, do you?");
          }*/ else {
            displayMessage("If we want all of the characters after the first comma in afterFirstComma, we won't stop extracting text until we get to the end of the string.  So for " + sampleInputAfterFirst + ", you'd use " + sampleInputAfterFirst.length + " while for " + sampleInput2AfterFirst + ", you'd use " + sampleInput2AfterFirst.length + ", the position number after the last character.  Since this position number will depend on something about afterFirstComma, your answer should refer to it.");
          }
        },
        () => displayMessage("Be sure to include the . after the variable afterFirstComma you want to use."),
        (matchResultArr, remaining) => displayMessage("If we want all of the characters after the first comma of afterFirstComma, we won't stop extracting text until we get to the end of the string.  For " + sampleInputAfterFirst + ", you'd use " + sampleInputAfterFirst.length + " while for " + sampleInput2AfterFirst + ", you'd use " + sampleInput2AfterFirst.length + ", the position number after the last character.  Do you remember how you can get these positions from the entered string?"),
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for an afterFirstComma of " + sampleInputAfterFirst + ", afterFirstComma.length - 1 would be " + (sampleInputAfterFirst.length-1) + ", which means you'd extract the text ending with the " + sampleInputAfterFirst.charAt(sampleInputAfterFirst.length-2) + " instead of the last character of " + sampleInputAfterFirst.charAt(sampleInputAfterFirst.length-1) + ".");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("For an afterFirstComma of " + sampleInputAfterFirst + ", afterFirstComma.length + 1 would be " + (sampleInput.length+1) + ", but there is no character at this position since positions start at 0.");
          }
          else {
            displayMessage("What you're doing to the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " seems incorrect.  Be sure to have examples in mind before deciding what to type.  For example, for " + sampleInputAfterFirst + ", the length is " + sampleInputAfterFirst.length + " and you want to go up to position " + sampleInputAfterFirst.length + " (since you'd stop extracting at character " + (sampleInputAfterFirst.length-1) + ").  If you're done, be sure to include a closing parenthesis for " + matchResultArr[5] + " after the ending position.");
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

Blockly.Python['display_third_item'] = Blockly.JavaScript['display_third_item'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['display_third_item'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(firstName + " " + lastName)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "display", type: "terminal"}, "(", "afterSecondComma", ".", T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER, 
       '(', '0', ',', 'afterSecondComma', '.', T2C.MSG.JS.FINDFIRSTOCCURRENCEOFTEXT, 
       "(", {token: /^","|^','/, type: "regexp"}, ")", ')', ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        () => {
          if(oneStartsWith(remaining, "itemList")) {
            displayMessage("If you're using the originial inputted itemList, you will *not* be able to extract the text before the *third* comma in general when you're only able to get the position of its first comma.  What variable can you use instead?");
          } else if(oneStartsWith(remaining, "afterFirstComma")) {
            displayMessage("If you're using afterFirstComma, you will *not* be able to extract the text before its second comma (before third comma in itemList) in general when you're only able to get the position of its first comma.  What variable can you use instead?");
          } else {
            displayMessage("Be sure to include the variable that you want to extract text from.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable afterSecondComma you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[4] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("(")) {
            displayMessage(T2C.MSG.currentLanguage.TYPEIN_WARNING_UNNECESSARY_OPEN_PARENTHESIS);
          } else if(oneStartsWith(remaining, "secondFirstComma")) {
            displayMessage("The text occurring before the first comma in a string starts at what numerical position regardless of what it is?  Use that specific number, accordingly.")
          } else if(parseInt(remaining) === 1) {
            displayMessage("Remember that positions start at 0.");
          } else if(parseInt(remaining)) {
            displayMessage("Where do you want to start extracting text from if you want all of the text *before* the first comma in afterSecondComma.  What number should you use if you want to start extracting text there?");
          } else {
            displayMessage("The text occurring before the first comma in a string starts at what numerical position regardless of what it is?  Use that specific number, accordingly.")
          }
        },
        (matchResultArr) => displayMessage("You're missing a comma after the starting position.  In " + T2C.MSG.currentLanguage.LANGUAGE_NAME + ", you put the starting and ending positions in the same parentheses when using " + matchResultArr[4] + ".  The comma is used to separate the two positions with the starting position first and the ending position second in order for the computer to know which is which."),
   
        // afterSecondComma
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place to stop extracting text cannot be a specific number if you want it to work in general regardless of the entered list.  For an afterSecondComma of " + sampleInputAfterSecond + ", you'd use " + sampleInputAfterSecond.indexOf(",") + " (stopping before the comma), but for " + sampleInput2 + ", you'd want to use " + sampleInput2AfterSecond.indexOf(",") + ".  Since it depends on the position of the comma, start by entering the appropriate variable name here instead of a specific number.");
          } else if(oneStartsWithOther(remaining, "itemList")) {
            // displayMessage("If we want all of the characters after the first comma in afterFirstComma, the ending position we give to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " will need to be " + sampleInputAfterFirst.length + " for " + sampleInputAfterFirst + " and " + sampleInput2AfterFirst.length + " for " + sampleInput2AfterFirst + ".  These are different than one more than the ending positions for " + sampleInput + " and " + sampleInput2 + ", which would be " + sampleInput.length " and " + sampleInput2.length + ", respectively.  It'll be easier to work ");
            displayMessage("If we want all of the characters before the first comma in afterSecondComma, the ending position we give to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " will need to be " + sampleInputAfterSecond.indexOf(",") + " for " + sampleInputAfterSecond + " and " + sampleInput2AfterSecond.indexOf(",") + " for " + sampleInput2AfterSecond + ".  These are different than the ending positions of the first comma for " + sampleInput + " and " + sampleInput2 + ", which would be " + sampleInput.indexOf(",") + " and " + sampleInput2.indexOf(",") + ", respectively.  No calculations will be required if we work with afterSecondComma instead.");
          } else if(oneStartsWithOther(remaining, "afterFirstComma")) {
            // displayMessage("If we want all of the characters after the first comma in afterFirstComma, the ending position we give to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " will need to be " + sampleInputAfterFirst.length + " for " + sampleInputAfterFirst + " and " + sampleInput2AfterFirst.length + " for " + sampleInput2AfterFirst + ".  These are different than one more than the ending positions for " + sampleInput + " and " + sampleInput2 + ", which would be " + sampleInput.length " and " + sampleInput2.length + ", respectively.  It'll be easier to work ");
            displayMessage("If we want all of the characters before the first comma in afterSecondComma, the ending position we give to " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " will need to be " + sampleInputAfterSecond.indexOf(",") + " for " + sampleInputAfterSecond + " and " + sampleInput2AfterSecond.indexOf(",") + " for " + sampleInput2AfterSecond + ".  These are different than the ending positions of the first comma for " + sampleInputAfterFirst + " and " + sampleInput2AfterFirst + ", which would be " + sampleInputAfterFirst.indexOf(",") + " and " + sampleInput2AfterFirst.indexOf(",") + ", respectively.  No calculations will be required if we work with afterSecondComma instead.");
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'll need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle.")
          } else if(remaining.startsWith("(")) {
            displayMessage(T2C.MSG.currentLanguage.TYPEIN_WARNING_UNNECESSARY_OPEN_PARENTHESIS);
          } else {
            displayMessage("For an afterSecondComma of " + sampleInputAfterSecond + ", you'd use " + sampleInputAfterSecond.indexOf(",") + " (stopping before it), but for " + sampleInput2 + ", you'd want to use " + sampleInput2AfterSecond.indexOf(",") + ".  Since it depends on the position of the comma, start by entering the appropriate variable name here instead of a specific number."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable afterSecondComma you want to search."),
        
        // genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => {
          if(oneStartsWithOther(remaining, T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER)) {
            displayMessage("You're already inside the parentheses of a " + T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  What do you need to give the computer now so it knows what position to stop extracting text from to get the text before the first comma in afterSecondComma?");
          } else if(oneStartsWithOther(remaining, T2C.MSG.JS.TERMINAL_LENGTH)) {
            displayMessage("You don't want to stop extracting text after the last character of the string if you want to get everything before the first comma in afterSecondComma, right?");
          } else if(oneStartsWithOther(remaining, T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER)) {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " gives you a character, but you need to give " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + "a position *number* to stop extracting text from.");
          } else {
            displayMessage("What property of afterSecondComma do you want in order to determine where to stop extracting text?  Make sure your spelling and capitalization (e.g., M versus m) are correct.");
          }
        },
        
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        
        // comma in quotes you're searching for
        (matchResultArr, remaining) => {
          if(remaining.startsWith(",")) {
            displayMessage("Since you're looking for the literal , and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.match(/^",[^"]|^',[^']/)) {
            displayMessage("Remember that that second item of afterSecondComma won't always start with " + remaining[2] + ".  Is it really necessary to include?  If you're done, close the quotation marks.");
          } else if(remaining.match(/^",$|^"$|^',$|^'$/)) {
            // this is correct, by displaying blank, other messages will be able to make use of the display div
            displayMessage("");
          } else if(parseInt(remaining) || remaining.startsWith("0")) {
            displayMessage("You're looking for the first position number of a character in afterSecondComma to tell you where the end of the first item in afterSecondComma is (third item in original itemList), you are not searching for the *position* of " + parseInt(remaining) + " in afterSecondComma.");
          } else if(!remaining.match(/^"|^'/)) {
            displayMessage("Since the needle you're going to use here is a string literal, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          } else {
            displayMessage("What string (needle) are you looking for in afterSecondComma (haystack) to help you calculate the position number of the end of its first item (third item in original list)?");
          }
        },

        (matchResultArr, remaining) => {
          if(remaining.startsWith("+") || remaining.startsWith("-")) {
            displayMessage("Be careful where you place the math operation; you certainly don't want to add/subtract a number from a comma!  Any math you may want to do to the *position* of the comma in email (which may not be necessary) should go outside of the parentheses for the character to find in " + matchResultArr[10] + ".");
          } else {
            displayMessage("You're missing a closing parenthesis for " + matchResultArr[10] + ".");
          }
        },
        // ) for substring
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for a afterSecondComma of " + sampleInputAfterSecond + ", you'd want to use " + sampleInputAfterSecond.indexOf(",") + " so the last character you'd extract would be at position " + (sampleInputAfterSecond.indexOf(",")-1) + ", mainly the " + sampleInputAfterSecond[sampleInputAfterSecond.indexOf(",")-1] + " before the comma.  If you subtracted 1, you'd instead stop extracting text at position " + (sampleInputAfterSecond.indexOf(",")-2) + " so you'd instead incorrectly get the " + sampleInputAfterSecond[sampleInputAfterSecond.indexOf(",")-2] + " as the last character.");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("Although " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given, you want to stop before the first comma of afterSecondComma anyway.  Adding 1 means you'll instead stop at its first comma instead.  For example, for an afterSecondComma of " + sampleInputAfterSecond + " the comma would be located at position " + sampleInputAfterSecond.indexOf(",") + " so by adding 1, you'd get " + (sampleInputAfterSecond.indexOf(",") + 1) + ", which means the last character you'd extract would be at position " + sampleInputAfterSecond.indexOf(",") + ", mainly the comma itself.");
          }
          else {
            displayMessage("What you're doing to the ending position of " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " seems incorrect or unnecessary.  Be sure to have examples in mind before deciding what to type.  If you're done, be sure to include a closing parenthesis for " + matchResultArr[4] + " after the ending position.");
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

          alert("In this mission, you'll ask the user for a list of at least four (chaar in Hindi) items separated by commas and display its third item.  For example, for an input of " + sampleInput + ", you'd output " + sampleOutput + " while for an input of " + sampleInput2 + ", you'd output " + sampleOutput2 + ".  Once again we're going to be working in pure JavaScript. " + switchLanguageMsg);
          //   Remember Mission # 5 where we  
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
          alert("Theek hai (OK), so as usual, let's start by asking the user to enter a string, this time a list of at least chaar items, separated by commas, and store it in a variable itemList.  Drag in a type-in-code block, and type in the code to do this.  Be sure the message includes the text 'at least 4' in it so the user knows to enter at least 4 items (separated by commas).");
          workspace.clear();
          // Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          // workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          toolboxManager.createToolboxBlock("type_in_get_item_list");
          workspace.options.maxInstances["type_in_get_item_list"] = 1;         
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
      () => {
        const text0 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("at least 4") !== -1);
        const textInput1 = workspace.getAllBlocks().filter(block => block.type === "text_input" && text0.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet2 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && block.getNextBlock() === null && textInput1.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "itemList");
        return text0.length === 1 && textInput1.length === 1 && variablesSet2.length === 1;
      },
      new HelpMessageDirection(() => {
        const text0 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput1 = workspace.getAllBlocks().find(block => block.type === "text_input");
        const variablesSet2 = workspace.getAllBlocks().find(block => block.type === "variables_set");

        //to enter a string, this time a list of at least chaar items, separated by commas, and store it in a variable itemList.  Drag in a type-in-code block, and type in the code to do this.  Be sure the message includes the text 'at least 4' in it so the user knows to enter at least 4 items (separated by commas).
        return "Drag in the type-in-code block, and type the necessary code to ask the user for a list of at least 4 items, separated by commas, and store it in a variable itemList.  Be sure the message contains the text 'at least 4' to let the user know to type in a minimum of this number of items.";

      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      //() => document.getElementById("language").value === "js" || document.getElementById("language").value === "py",
      () => true,
      {
        start: () => {
          alert("✔ Acchaa (Good), so now think back to Mission # 5 where we found the text between the first @ and .  Do you remember how we did that?  Do you think you could use a similar strategy here?  If not, what goes wrong?");
          workspace.clear();
          // Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          // workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          toolboxManager.createToolboxBlock("type_in_get_item_list");
          workspace.options.maxInstances["type_in_get_item_list"] = 1;         
        },
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-319\" y=\"-488\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>"; 
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
          alert("✔✔✔ Amazing!  You just solved that very challenging problem.  And with that single line of code wizadry, you got the user's initials and completed Mission # 8!  Once again you typed an entire program in pure JavaScript!  In the next mission 9, you'll face a new challenge of finding the third item in a list of items separated by commas.  As you did in this mission, you'll be typing code in pure JavaScript.  Stay tuned and phir milenge (See you again)!");
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