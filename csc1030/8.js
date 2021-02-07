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

Blockly.Python['type_in_get_full_name'] = Blockly.JavaScript['type_in_get_full_name'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_full_name'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let fullName = prompt("Enter string with s");
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "fullName", "=", T2C.MSG.JS.TERMINAL_GETINPUTBYASKING, '(', 
      {token: /^"[^"]*$|^'[^']*$|^"[^"]*full name[^"]*"|^'[^']*full name[^']*'/i, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring fullName."),
        () => displayMessage("Remember to include an = after the variable fullName to set it to a value."), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETINPUTBYASKING"), 
        (matchResultArr) => displayMessage("You're missing an open parenthesis after " + matchResultArr[3] + "."),
        () => displayMessage("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.  Be sure it also includes the text 'full name' in it so the user knows to enter his/her full name."),
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

Blockly.Python['type_in_print_initials'] = Blockly.JavaScript['type_in_print_initials'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_print_initials'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(firstName + " " + lastName)
    // maybe allow single quotes for literals

    const sampleInput = "Jane Doe";
    const sampleInput2 = "Linus Torvalds";
    const sampleInputFirstName = sampleInput.substring(0, sampleInput.indexOf(" "));
    const sampleInputLastName = sampleInput.substring(sampleInput.indexOf(" ")+1);
    const sampleInputFirstInitial = sampleInputFirstName[0];
    const sampleInputLastInitial = sampleInputLastName[0];
    const sampleOutput = sampleInputFirstInitial + "." + sampleInputLastInitial + ".";

    const sampleInput2FirstName = sampleInput2.substring(0, sampleInput2.indexOf(" "));
    const sampleInput2LastName = sampleInput2.substring(sampleInput2.indexOf(" ")+1);
    const sampleInput2FirstInitial = sampleInput2FirstName[0];
    const sampleInput2LastInitial = sampleInput2LastName[0];
    const sampleOutput2 = sampleInput2FirstInitial + "." + sampleInput2LastInitial + ".";

    const result = matchStatement(exp, 
      [T2C.MSG.JS.TERMINAL_DISPLAY, "(", "fullName", ".", T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER, '(', '0', ')', 
      "+", {token: /^"."|^'.'/, type: "regexp"}, "+", "fullName", ".", T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER, 
      "(", "fullName", ".", T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT, "(",  {token: /^" "|^' '/, type: "regexp"}, ")", 
      "+", "1", ")", "+", {token: /^"."|^'.'/, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        () => displayMessage("Be sure to include the variable fullName that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable fullName you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETCHARACTERNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[4] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else if(parseInt(remaining) === 1) {
            displayMessage("Remember that positions start at 0.");
          } else if(parseInt(remaining)) {
            displayMessage("In what position will the first initial of " + sampleInputFirstInitial + " appear if the person enters " + sampleInput + " or the first initial of " + sampleInput2FirstInitial + " if the person enters " + sampleInput2 + "?");
          } else if("fullName".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("fullName".toLowerCase())) {
            displayMessage("Assuming the full name is always entered as first last such as " + sampleInput + " with a first initial of " + sampleInputFirstInitial + " or " + sampleInput2 + " with a first initial of " + sampleInput2FirstInitial + ", the numerical position will always be the same.  Use a specific number, accordingly.");
          } else {
            displayMessage("Assuming the full name is always entered as first last such as " + sampleInput + " with a first initial of " + sampleInputFirstInitial + " or " + sampleInput2 + " with a first initial of " + sampleInput2FirstInitial + ", the numerical position will always be the same.  Use a specific number, accordingly.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[4] + "."),
        
        // + after firstInitial
        () => displayMessage("How do you join text together?"),
        (matchResultArr, remaining) => {
          if("fullName".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("fullName".toLowerCase())) {
            displayMessage("What character do you want to appear after the first initial of " + sampleInputFirstInitial + " to get the text " + sampleOutput + " if the person enters " + sampleInput + " or the first initial of " + sampleInput2FirstInitial + " to get " + sampleOutput2 + " if the person enters " + sampleInput2 + "?  It's the same in both cases.");
          } else if(remaining.startsWith(".")) {
            displayMessage("Since you want a literal . and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.match(/^"\.$|^"$|^'\.$|^'$/)) {
            // this is correct, by displaying blank, other messages will be able to make use of the display div
            displayMessage("");
          } else {
            displayMessage("What character do you want to appear after the first initial of " + sampleInputFirstInitial + " to get the text " + sampleOutput + " if the person enters " + sampleInput + " or the first initial of " + sampleInput2FirstInitial + " to get " + sampleOutput2 + " if the person enters " + sampleInput2 + "?  It's the same in both cases.");
          }
        },
        () => displayMessage("How do you join text together?"),
        (matchResultArr, remaining) => {
          if("lastInitial".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("lastInitial".toLowerCase())) {
            displayMessage("You don't have lastInitial defined.  As with the first initial, where do you get it from?");
          } else if(T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER.toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith(T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER.toLowerCase())) {
            displayMessage("Remember you need to give the text you want to extract the character from first when using " + T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER + ".");
          } else {  
            displayMessage("Given you have the first initial and a period, what do you want to appear next?  As with the first initial, where do you get it from?");
          }
        },
        () => displayMessage("Be sure to include the . after the variable fullName you want to extract text from."),
        () => displayMessage("At this point, you'd have " + sampleInputFirstInitial + ". for " + sampleInput + " and " + sampleInput2FirstInitial + ". for " + sampleInput2 + ".  So what would you display next: a number, a character, or something else?  Type in the appropriate of " + T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + ", " + T2C.MSG.JS.TERMINAL_LENGTH + ", " + T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER + ", etc. accordingly, being mindful of spelling and case."),
        
        // open parenthesis for charAt for last initial
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        
        // fullName
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place in the string where the last initial appears will not be always be the same number.  For a full name of " + sampleInput + ", you'd use " + (sampleInput.indexOf(" ")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf(" ") + 1) + ".  Since it depends on some property of the entered name, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'll need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle.")
          } else if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else {
            displayMessage("The correct place in the string where the last initial appears will be a number depending on the entered string.  For a full name of " + sampleInput + ", you'd use " + (sampleInput.indexOf(" ")+1) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf(" ") + 1) + ".  Since it depends on some property of the entered name, start by entering the appropriate variable name here instead of what you have."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        () => displayMessage("Be sure to include the . after the variable fullName you want to search."),
        
        // genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => {
          if(T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER.toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith(T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER.toLowerCase())) {
            displayMessage("You're already inside the parentheses of a " + T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER + ".  What do you need to give it now so it can get the last initial from fullName?");
          } else if(T2C.MSG.JS.TERMINAL_LENGTH.toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith(T2C.MSG.JS.TERMINAL_LENGTH.toLowerCase())) {
            displayMessage("Getting the number of characters in the entire string does not help you find the position of the last initial unless you also had something like the number of characters in the first or last name.   For example, the length of " + sampleInput + " is " + sampleInput.length + " while the last initial is at position " + (sampleInput.indexOf(" ") + 1) + " whereas the length of " + sampleInput2 + " is " + sampleInput2.length + " while the last initial is at position " + (sampleInput2.indexOf(" ") + 1) + ".");
          } else if(T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER.toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith(T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER.toLowerCase())) {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " gives you part of the text, but you want the position number of the last initial to give to " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + " to get the character at that position.");
          } else {
            displayMessage("Given you have the first initial and a period, what do you want to appear next?  What property of fullName do you want to get its position?  Make sure your spelling and capitalization (e.g., M versus m) are correct.");
          }
        },
        
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        // space you're searching for
        (matchResultArr, remaining) => {
          if("positionOfLastInitial".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("positionOfLastInitial".toLowerCase())) {
            displayMessage("The position of the last initial will not be defined; you're using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " to calculate it.");
          } else if(remaining.match(/^""|^''/)) {
            displayMessage("You are trying to get the location of an empty string; that's not what you want, right?");
          } else if(remaining.match(/^" [^"]|^' [^']/)) {
            displayMessage("Remember that that last name of an entered input won't always start with " + remaining[2] + ".  Is it really necessary to include?  If you're done, close the quotation marks.");
          } else if(remaining.match(/^" $|^"$|^' $|^'$/)) {
            // this is correct, by displaying blank, other messages will be able to make use of the display div
            displayMessage("");
          } else if(parseInt(remaining) || remaining.startsWith("0")) {
            displayMessage("You're looking for the first position number of a character in fullName to tell you where the last initial is, you are not searching for the *position* of " + parseInt(remaining) + " in fullName.");
          } else if(!remaining.match(/^"|^'/)) {
            displayMessage("Since the needle you're going to use here is a string literal, you need to surround it with quotation marks.  You're currently missing quotation marks.");
          } else {
            displayMessage("What string (needle) are you looking for in lastName (haystack) to help you calculate the position number of the last initial?");
          }
        },
        // (matchResultArr, remaining) => displayMessage("What string do you want to get the position of to help you determine where you should start? " + (remaining.indexOf('"') === -1 ? remaining : remaining.substring(0, remaining.indexOf('"'))) + " is not correct."),
        // (matchResultArr, remaining) => displayMessage("You're missing closing quotation marks for " + matchResultArr[matchResultArr.length-1] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("+")) {
            displayMessage("Be careful where you place the +; you certainly don't want to add a number to a space!  Instead you want to add a number to the *position* of the space in fullName so it should go outside of the " + matchResultArr[17] + ".");
          } else {
            displayMessage("You're missing a closing parenthesis for " + matchResultArr[17] + ".");
          }
        },
        (matchResultArr, remaining) => {
          if(remaining.startsWith(")")) {
            displayMessage("You do not want to get the character located at the position of the space exactly or you'll get back the space itself!  Instead, you'll want to get the character at the position after so you'll need to do what arithmetic operation to the position number you get?  For fullName of " + sampleInput + ", the position of the space will be at " + sampleInput.indexOf(" ") + " while for fullName of " + sampleInput2 + ", the position of the space will be at " + sampleInput2.indexOf(" ") + ".  What position will the last initial be in each case?");
          } else if(remaining.replace(/\s/g, "").startsWith("-1")) {
            displayMessage("If you subtract 1, you'll get the position of the last character of the first name.  Instead, you'll want to get the character at the position after the space so you'll need to do what arithmetic operation to the position number you get?  For example, for a fullName of " + sampleInput + ", the position of the space will be at " + sampleInput.indexOf(" ") + " so subtracting 1 will give you " + (sampleInput.indexOf(" ")-1) + ", which will be the position of the first " + sampleInputFirstName.charAt(sampleInputFirstName.length-1) + ".  What do you want to do instead to get the position of the last initial from the position of the space?");
          } else if(remaining.replace(/\s/g, "").startsWith("--1")) {
            displayMessage("Add 1 instead of subtracting -1 as this makes your code clearer.")
          } else {
            displayMessage("What operation and number should you use on the position of the space you get from " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "?  Remember, you'll want to get the character at the position after so you'll need to do what arithmetic operation to the position number you get?  For fullName of " + sampleInput + ", the position of the space will be at " + sampleInput.indexOf(" ") + " while for fullName of " + sampleInput2 + ", the position of the space will be at " + sampleInput2.indexOf(" ") + ".  What position will the last initial be in each case?");
          }
        },
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num) || remaining.startsWith("-")) {
            displayMessage("What number do you want to add to the position number of the first occurrence of the space to get to the position of the last initial?  Change this to the correct number.");
          } else {
            displayMessage(T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " gives you back a number.  What specific *number* do you want to add to the position number of the first occurrence of the space to get to the position you want to start at?  Change this to the correct number.  For fullName of " + sampleInput + ", the position of the space will be at " + sampleInput.indexOf(" ") + " while for fullName of " + sampleInput2 + ", the position of the space will be at " + sampleInput2.indexOf(" ") + ".  To figure out what you want to add, what position will the last initial be in each case?");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for the second "  + matchResultArr[4] + "."),
        // + after last initial
        (matchResultArr, remaining) => {
          if(remaining.startsWith(")")) {
            displayMessage("At this point, you have " + sampleOutput.substring(0,sampleOutput.length-1) + " for " + sampleInput + " and " + sampleOutput2.substring(0,sampleOutput2.length-1) + " for " + sampleInput2 + ".  What are you missing?");
          } else {
            displayMessage("At this point, you have " + sampleOutput.substring(0,sampleOutput.length-1) + " for " + sampleInput + " and " + sampleOutput2.substring(0,sampleOutput2.length-1) + " for " + sampleInput2 + ".  What should go next and what do you do to add more to the text you already have?");
          }
        },
        (matchResultArr, remaining) => {
          if("fullName".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("fullName".toLowerCase())) {
            displayMessage("What character do you want to appear after the last initial of " + sampleInputFirstInitial + " to get the text " + sampleOutput + " if the person enters " + sampleInput + " or the last initial of " + sampleInput2FirstInitial + " to get " + sampleOutput2 + " if the person enters " + sampleInput2 + "?  It's the same in both cases.");
          } else if(remaining.startsWith(".")) {
            displayMessage("Since you want a literal . and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.match(/^"\.$|^"$|^'\.$|^'$/)) {
            // this is correct, by displaying blank, other messages will be able to make use of the display div
            displayMessage("");
          } else {
            displayMessage("What character do you want to appear after the last initial of " + sampleOutput.substring(0,sampleOutput.length-1) + " to get the text " + sampleOutput + " if the person enters " + sampleInput + " or the last initial of " + sampleOutput2.substring(0,sampleOutput2.length-1) + " to get " + sampleOutput2 + " if the person enters " + sampleInput2 + "?  It's the same in both cases.");
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
          const initialBlocks = ["text_print", "text_input", "t2c_text_indexof", "t2c_text_charat", "variables_set", "variables_get"];//, "variables_get", "math_number", "text", "variables_set"];
          const switchLanguageMsg = T2C.MSG.currentLanguage === T2C.MSG.JS ?
            "" : "So to start, select JavaScript from the dropdown menu at the top and watch how the blocks in the toolbox transform to their JavaScript equivalents.";// + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"]
          
          // set up level
          toolboxManager.clearToolbox();
          initialBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = 0;
          });

          alert("In this mission, you'll ask the user for their first and last name separated by a space (output from Mission # 6) and print their initials separated by periods.  For example, for an input of Jane Doe, you'd output J.D.  Once again you're going to work in pure JavaScript, but this time you'll accomplish the task using " + T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " and " + T2C.MSG.JS.TERMINAL_GETCHARACTERNUMBER + " instead of " + T2C.MSG.JS.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " and " + T2C.MSG.JS.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  You'll also do this with only two lines of code, one to store the input and one to display the output!  " + switchLanguageMsg);
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
          alert("Theek hai (OK), so let's ask the user to enter their full name (no middle name) in the form first last such as Jane Doe, and store it in a variable fullName.  Remember that in pure JavaScript, we use " + T2C.MSG.JS.TERMINAL_GETINPUTBYASKING + " for " + T2C.MSG.EN.TERMINAL_GETINPUTBYASKING + ".  As before, you'll drag in a type-in-code block, and type in the code.");
          workspace.clear();
          // Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), workspace);
          Blockly.svgResize(workspace);
          // workspace.getAllBlocks().forEach(block => block.setMovable(false));
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          toolboxManager.createToolboxBlock("type_in_get_full_name");
          workspace.options.maxInstances["type_in_get_full_name"] = 1;         
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
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("full name") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "fullName");
        return text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
      },
      new HelpMessageDirection(() => {
        return "Drag in the type-in-code block, and type the necessary code to ask the user for their full name in the form first last (no middle) and store it in a variable fullName.  Be sure the message contains the text 'full name' to let the user know to type in his/her first and last name.  Also, use the JavaScript " + T2C.MSG.JS.TERMINAL_GETINPUTBYASKING + " instead of " + T2C.MSG.EN.TERMINAL_GETINPUTBYASKING + ".";
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
          alert("✔ Acchaa (Good), so now with one more line of code we're going to finish today's mission!  In this next step, you're going to display the user's initials (assuming he/she entered his/her correct name in the form first last).  So for Jane Doe, you'd output J.D. (with the periods between the first and last initials).");//we know we'll need to get their first and last names!  So let's pret ")
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // workspace.clear();
          const jsBlocks = ["js_text_print", "js_text_input", "js_text_indexof", "js_text_charat", "variables_set", "variables_get", "text"];//, "variables_get", "math_number", "text", "variables_set"];
          
          toolboxManager.clearToolbox();
          jsBlocks.forEach((blockType, index) => {
            toolboxManager.createToolboxBlock(blockType, false);
            workspace.options.maxInstances[blockType] = 0;
          });

          // toolboxManager.removeToolboxBlocks(block => block.type === "type_in_get_input_with_s");
          setMaxesFromWorkspace(workspace);
          toolboxManager.createToolboxBlock("type_in_print_initials");
          workspace.options.maxInstances["type_in_print_initials"] = 1;
        }
      }
    )
  );

// In this next step, you're going to display the user's initials (assuming he/she entered his/her correct name in the form first last).  So for Jane Doe, you'd output J.D. (with the periods between the first and last initials).

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === ".");
        const mathNumber1 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const text2 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === " ");
        const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "fullName");
        const jsTextIndexof4 = workspace.getAllBlocks().filter(block => (block.type === "js_text_indexof" || block.type === "t2c_text_indexof") && variablesGet3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text2.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const mathArithmeticBasic5 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && jsTextIndexof4.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber1.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const jsTextCharat7 = workspace.getAllBlocks().filter(block => (block.type === "js_text_charat" || block.type === "t2c_text_charat") && variablesGet3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && mathArithmeticBasic5.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const t2cTextJoin8 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && jsTextCharat7.indexOf(block.getInputTargetBlock("A")) !== -1 && text0.indexOf(block.getInputTargetBlock("B")) !== -1);
        const t2cTextJoin10 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && text0.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin8.indexOf(block.getInputTargetBlock("B")) !== -1);
        const mathNumber11 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const jsTextCharat13 = workspace.getAllBlocks().filter(block => (block.type === "js_text_charat" || block.type === "t2c_text_charat") && variablesGet3.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && mathNumber11.indexOf(block.getInputTargetBlock("AT")) !== -1);
        const t2cTextJoin14 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_join" && jsTextCharat13.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin10.indexOf(block.getInputTargetBlock("B")) !== -1);
        const jsTextPrint15 = workspace.getAllBlocks().filter(block => (block.type === "js_text_print" || block.type === "t2c_text_print") && block.getNextBlock() === null && t2cTextJoin14.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const text16 = workspace.getAllBlocks().filter(block => block.type === "text" && block.type === "text" && typeof block.getFieldValue("TEXT") === "string" && block.getFieldValue("TEXT").toLowerCase().indexOf("full name") !== -1);
        const jsTextInput17 = workspace.getAllBlocks().filter(block => (block.type === "js_text_input" || block.type === "t2c_text_input") && text16.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && jsTextPrint15.indexOf(block.getNextBlock()) !== -1 && jsTextInput17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "fullName");
        return text0.length === 2 && mathNumber1.length === 1 && text2.length === 1 && variablesGet3.length === 3 && jsTextIndexof4.length === 1 && mathArithmeticBasic5.length === 1 && jsTextCharat7.length === 1 && t2cTextJoin8.length === 1 && t2cTextJoin10.length === 1 && mathNumber11.length === 1 && jsTextCharat13.length === 1 && t2cTextJoin14.length === 1 && jsTextPrint15.length === 1 && text16.length === 1 && jsTextInput17.length === 1 && variablesSet18.length === 1;
      },
      new HelpMessageDirection(() => {
        const variableSetInputBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "fullName");
        const textPrintBlock = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print");

        if(variableSetInputBlock && textPrintBlock && (textPrintBlock.getNextBlock() === variableSetInputBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block must go below the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting fullName because the computer needs to know what the user's name is in order to display his/her initials.  Remember that instructions are run from top to bottom.";
        }

        if(textPrintBlock && textPrintBlock.getPreviousBlock() === null) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block below the previous " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " block setting fullName.";
        }

        return "Drag the type-in-code block, and type the necessary code to display the user's user's initials (assuming he/she entered his/her correct name in the form first last).  So for Jane Doe, you'd output J.D. (with the periods between the first and last initials).  Do this in one line!";
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
          alert("✔✔✔ Outstanding!  And with that single line of code wizadry, you got the user's initials and completed Mission # 8!  Once again you typed an entire program in pure JavaScript!  In the next mission 9, you'll face a new challenge of finding the third item in a list of items separated by commas.  As you did in this mission, you'll be typing code in pure JavaScript.  Stay tuned and phir milenge (See you again)!");
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