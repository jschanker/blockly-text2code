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

Blockly.Python['type_in_display_first_last_name'] = Blockly.JavaScript['type_in_display_first_last_name'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_display_first_last_name'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(firstName + " " + lastName)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "display", type: "terminal"}, "(", "firstName", "+", {token: /^" "|^' '/, type: "regexp"}, "+", "lastName", ")"],
      [ 
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        (matchResultArr, remaining) => {
        	if(remaining.startsWith("\"") || remaining.startsWith("'")) {
        		displayMessage("If you're using variable names to be evaluated instead of displayed as is (e.g., displaying the text Jane instead of the text firstName), you don't want to use quotation marks.");
        	} else {
        		displayMessage("Remember the variable names are firstName and lastName.  If firstName = \"Jane\" and lastName = \"Doe\" and you want to display \"Jane Doe\", what should be displayed first?")
        	}
        },
        () => displayMessage("How do you join strings together?"),
        (matchResultArr, remaining) => {
        	if("lastName".toLowerCase().startsWith(remaining.toLowerCase()) || remaining.toLowerCase().startsWith("lastName".toLowerCase())) {
        		displayMessage("Remember that you'll want a space between the first and last name; joining the two strings together without one would result in \"JaneDoe\" instead of say \"Jane Doe\".");
        	} else {
        	  displayMessage("Remember that you want to *literally* display a space between the first and last name.  What do you need to surround text with (including spaces) when you want to display something without evaluating it?");
        	}
        },
        () => displayMessage("How do you join strings together?"),
        (matchResultArr, remaining) => {
        	if(remaining.startsWith("\"") || remaining.startsWith("'")) {
        		displayMessage("If you're using variable names to be evaluated instead of displayed as is (e.g., displaying the text Doe instead of the text lastName), you don't want to use quotation marks.");
        	} else {
        		displayMessage("Remember the variable names are firstName and lastName.  If firstName = \"Jane\" and lastName = \"Doe\" and you want to display \"Jane Doe\", what should be displayed last?")
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

Blockly.Python['type_in_set_last_name'] = Blockly.JavaScript['type_in_set_last_name'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_last_name'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(firstName + " " + lastName)
    // maybe allow single quotes for literals

    const sampleInput = "Doe, Jane";
    const sampleInput2 = "Torvalds, Linus";
    const sampleInputFirstName = sampleInput.substring(0, sampleInput.indexOf(","));
    const sampleInputLastName = sampleInput.substring(sampleInput.indexOf(",")+2);
    const sampleInput2FirstName = sampleInput.substring(0, sampleInput.indexOf(","));
    const sampleInput2LastName = sampleInput.substring(sampleInput.indexOf(",")+2);

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "lastName", "=", "enteredName", ".", {token: "GETTEXTFROMPOSITIONNUMBER", type: "terminal"}, 
       '(', '0', ')', ".", {token: "TOPOSITIONNUMBER", type: "terminal"}, "(", "commaPosition", ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring lastName to represent the fact that it should store the last name if the user entered the input in the correct form.  Since you use lastName in the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " statement, you need to use lastName here."),
        () => displayMessage("Remember to include an = after the variable lastName you're declaring to set it to the value that follows."), 
        () => displayMessage("Be sure to include the variable enteredName that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable enteredName you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith("(")) {
            displayMessage("Although you *can* have multiple opening parentheses, it's not necessary in this instance.  When you first start programming, it may be good to include them to make sure operations are performed in the required order, but it can also make your code more difficult to read and correctly match the open parentheses with closing ones.  Before continuing, remove the extra opening parenthesis here since you don't need it.");
          } else if(parseInt(remaining) === 1) {
          	displayMessage("Remember that positions start at 0.");
          } else if(parseInt(remaining)) {
          	displayMessage("The last name starts at the beginning of the string.  What number should you use if you want to start extracting text there?");
          } else {
            displayMessage("The last name starts at the beginning of the string so regardless of the string the user enters, the numerical position will always be the same.  Use a specific number, accordingly.")
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[5] + " after the starting position number."),
        () => displayMessage("Be sure to include the . after the closing parenthesis after the starting position number before the next part."),
        genericTerminalErrorMsg.bind(null, displayMessage, "TOPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        (matchResultArr, remaining) => {
          // variable commaPosition - stopping position
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place to stop extracting text cannot be a specific number if you want it to work in general regardless of the entered name.  For an entered name of " + sampleInput + ", you'd use " + sampleInput.indexOf(",") + " (stopping before it), but for " + sampleInput2 + ", you'd want to use " + sampleInput2.indexOf(",") + ".  Since it depends on the position of the comma, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'd need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle, but remember that you're already assuming you have a variable that stores the position of the comma, which might help...")
          } else {
            displayMessage("For an entered name of " + sampleInput + ", you'd use " + sampleInput.indexOf(",") + " (stopping before it), but for " + sampleInput2 + ", you'd want to use " + sampleInput2.indexOf(",") + ".  Since it depends on the position of the comma, start by entering the appropriate variable name here."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        // ) for substring
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for an entered name of " + sampleInput + ", you'd want to use " + sampleInput.indexOf(",") + " so the last character you'd extract would be at position " + (sampleInput.indexOf(",")-1) + ", mainly the " + sampleInput[sampleInput.indexOf(",")-1] + " before the comma.  If you subtracted 1, you'd instead stop extracting text at position " + (sampleInput.indexOf(",")-2) + " so you'd instead incorrectly get the " + sampleInput[sampleInput.indexOf(",")-2] + " as the last character.");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("Although " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given, you want to stop before the comma anyway.  Adding 1 means you'll instead stop at the comma.  For example, for an entered name of " + sampleInput + " the comma would be located at position " + sampleInput.indexOf(",") + " so by adding 1, you'd get " + (sampleInput.indexOf(",") + 1) + ", which means the last character you'd extract would be at position " + sampleInput.indexOf(",") + ", mainly the comma itself.");
          }
          else {
            displayMessage("What you're doing to the ending position of " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " seems incorrect or unnecessary.  Be sure to have examples in mind before deciding what to type.  If you're done, be sure to include a closing parenthesis for " + matchResultArr[10] + " after the ending position.");
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

Blockly.Python['type_in_set_first_name'] = Blockly.JavaScript['type_in_set_first_name'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_first_name'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const sampleInput = "Doe, Jane";
    const sampleInput2 = "Torvalds, Linus";
    const sampleInputLastName = sampleInput.substring(0, sampleInput.indexOf(","));
    const sampleInputFirstName = sampleInput.substring(sampleInput.indexOf(",")+2);
    const sampleInput2LastName = sampleInput2.substring(0, sampleInput2.indexOf(","));
    const sampleInput2FirstName = sampleInput2.substring(sampleInput2.indexOf(",")+2);

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "firstName", "=", "enteredName", ".", {token: "GETTEXTFROMPOSITIONNUMBER", type: "terminal"}, 
       '(', 'commaPosition', '+', '2', ")", ".", {token: "TOPOSITIONNUMBER", type: "terminal"}, "(", "enteredName", ".", {token: "LENGTH", type: "terminal"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring firstName to represent the fact that it should store the first name if the user entered the input in the correct form.  Since you use firstName in the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " statement, you need to use firstName here."),
        () => displayMessage("Remember to include an = after the variable firstName you're declaring to set it to first name."), 
        () => displayMessage("Be sure to include the variable enteredName that you want to extract text from."),
        () => displayMessage("Be sure to include the . after the variable enteredName you want to extract text from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "GETTEXTFROMPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        (matchResultArr, remaining) => {
          // variable commaPosition - 2: starting position
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            displayMessage("The correct place to start extracting text cannot be a specific number if you want it to work in general regardless of the entered name.  For an entered name of " + sampleInput + ", you'd use " + (sampleInput.indexOf(",")+2) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf(",")+2) + ".  Since it depends on the position of the comma, start by entering the appropriate variable name here instead of a specific number."); 
          } else if(getAfterTerminal(remaining, "FINDFIRSTOCCURRENCEOFTEXT")) {
            displayMessage("You'd need to refer to the variable name before using " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " so the computer knows which string to search through (haystack) to find the given needle, but remember that you're already assuming you have a variable that stores the position of the comma, which might help...")
          } else {
            displayMessage("For an entered name of " + sampleInput + ", you'd use " + (sampleInput.indexOf(",")+2) + ", but for " + sampleInput2 + ", you'd want to use " + (sampleInput2.indexOf(",")+2) + ".  Since it depends on the position of the comma, start by entering the appropriate variable name here."); 
            // Remember that since you no longer know how short or long the entered string will be, the stopping position will not always be at position " + num + ".  Instead, this position will depend on something about this string so your answer should refer to it.")
          }
        },
        (matchResultArr, remaining) => {
          if(remaining.startsWith(")") || remaining.startsWith(".")) {
            displayMessage("You do not want to start extracting text at the comma exactly since you want to get the text *after* the space that follows it.  What arithmetic operation do you want to perform on the position number you get and with what number to start at the character after the space after the comma?  For " + sampleInput + ", the comma position will be at " + sampleInput.indexOf(",") + " but you'll want to start at position " + (sampleInput.indexOf(",") + 2) + ", with " + sampleInputFirstName[0] + " whereas for " + sampleInput2 + ", the comma position will be at " + sampleInput2.indexOf(",") + " but you'll want to start at position " + (sampleInput2.indexOf(",") + 2) + ", with " + sampleInput2FirstName[0] + ".");
          } else if(remaining.replace(/\s/g, "").startsWith("--2")) {
            displayMessage("Add 2 instead of subtracting -2 as this makes your code clearer.")
          } /*else if(remaining.replace(/\s/g, "").startsWith("+1")) {
            displayMessage("Remember that there's a space after the comma and you don't want to start with the space.");
          }*/ else {
            displayMessage("What arithmetic operation do you want to perform on the position number you get and with what number to start at the character after the space after the comma?  For " + sampleInput + ", the comma position will be at " + sampleInput.indexOf(",") + " but you'll want to start at position " + (sampleInput.indexOf(",") + 2) + ", with " + sampleInputFirstName[0] + " whereas for " + sampleInput2 + ", the comma position will be at " + sampleInput2.indexOf(",") + " but you'll want to start at position " + (sampleInput2.indexOf(",") + 2) + ", with " + sampleInput2FirstName[0] + ".");
          }
        },
        (matchResultArr, remaining) => {
          const num = parseInt(remaining);
          if(!isNaN(num) || remaining.startsWith("-")) {
            if(num === 1) {
            	displayMessage("Remember that there's a space after the comma and you don't want to start with the space.  What number do you want to add to the position number of the first occurrence of the , to get to the position you want to start at?  For " + sampleInput + ", the comma position will be at " + sampleInput.indexOf(",") + " but you'll want to start at position " + (sampleInput.indexOf(",") + 2) + ", with " + sampleInputFirstName[0] + " whereas for " + sampleInput2 + ", the comma position will be at " + sampleInput2.indexOf(",") + " but you'll want to start at position " + (sampleInput2.indexOf(",") + 2) + ", with " + sampleInput2FirstName[0] + ".  Change this to the correct number, accordingly.");
            } else {
              displayMessage("What number do you want to add to the position number of the first occurrence of the , to get to the position you want to start at?  For " + sampleInput + ", the comma position will be at " + sampleInput.indexOf(",") + " but you'll want to start at position " + (sampleInput.indexOf(",") + 2) + ", with " + sampleInputFirstName[0] + " whereas for " + sampleInput2 + ", the comma position will be at " + sampleInput2.indexOf(",") + " but you'll want to start at position " + (sampleInput2.indexOf(",") + 2) + ", with " + sampleInput2FirstName[0] + ".  Change this to the correct number, accordingly.");
            }
          } else {
            displayMessage("If the name is entered correctly as e.g., " + sampleInput + " or " + sampleInput2 + ", then the number of places the last name will be beyond the position of the comma will always be the same so you can enter a *specific* number.   For " + sampleInput + ", the comma position will be at " + sampleInput.indexOf(",") + " but you'll want to start at position " + (sampleInput.indexOf(",") + 2) + ", with " + sampleInputFirstName[0] + " whereas for " + sampleInput2 + ", the comma position will be at " + sampleInput2.indexOf(",") + " but you'll want to start at position " + (sampleInput2.indexOf(",") + 2) + ", with " + sampleInput2FirstName[0] + ".  Change your answer to the specific number you can add in both cases, accordingly.");
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for "  + matchResultArr[5] + " after the starting position number."),
        () => displayMessage("Be sure to include the . after the closing parenthesis after the starting position number before the next part."),
        genericTerminalErrorMsg.bind(null, displayMessage, "TOPOSITIONNUMBER"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[matchResultArr.length-1] + "."),
        (matchResultArr, remaining) => {
          // variable enteredName
          const num = parseInt(remaining);
          if(!isNaN(num)) {
            //HINT: Remember what you used when you wanted to get the position of the last character?  How is 15, the number we used for aap kaise hain, related to this string?  What would we use for theek?
            displayMessage("The stopping position will not always be at position " + num + ".  Instead, this position will depend on something about the entered name so your answer should refer to it.")
          } else if(remaining.startsWith("commaPosition") || "commaPosition".startsWith(remaining)) {
          	displayMessage("You don't want to stop extracting text at commaPosition, do you?");
          } else {
            displayMessage("If entered correctly, the end of the first name will be at the end of the entered string.  For " + sampleInput + ", you'd use " + sampleInput.length + " while for " + sampleInput2 + ", you'd use " + sampleInput2.length + ", the position number after the last character.  Since this position number will depend on something about the entered name, your answer should refer to it.");
          }
        },
        () => displayMessage("Be sure to include the . after the variable enteredName you want to use."),
        (matchResultArr, remaining) => displayMessage("If entered correctly, the end of the first name will be at the end of the entered string.  For " + sampleInput + ", you'd use " + sampleInput.length + " while for " + sampleInput2 + ", you'd use " + sampleInput2.length + ", the position number after the last character.  Do you remember how you can get these positions from the entered name?"),
        (matchResultArr, remaining) => {
          if(remaining.replace(/\s/g, "").indexOf("-1") !== -1) {
            displayMessage("Remember that " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " ends one position before the numerical expression given.  So for example, for an enteredName of " + sampleInput + ", sampleInput.length - 1 would be " + (sampleInput.length-1) + ", which means you'd extract the text ending with the " + sampleInput.charAt(sampleInput.length-2) + " instead of the last character of " + sampleInput.charAt(sampleInput.length-1) + ".");
          }
          else if(remaining.replace(/\s/g, "").indexOf("+1") !== -1) {
            displayMessage("For an enteredName of " + sampleInput + ", enteredName.length + 1 would be " + (sampleInput.length+1) + ", but there is no character at this position since positions start at 0.");
          }
          else {
            displayMessage("What you're doing to the " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " seems incorrect.  Be sure to have examples in mind before deciding what to type.  For example, for " + sampleInput + ", the length is " + sampleInput.length + " and you want to go up to position " + sampleInput.length + " (since you'd stop extracting at character " + (sampleInput.length-1) + ").  If you're done, be sure to include a closing parenthesis for " + matchResultArr[12] + " after the ending position.");
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

Blockly.Python['type_in_set_comma_pos'] = Blockly.JavaScript['type_in_set_comma_pos'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_comma_pos'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "commaPosition", "=", "enteredName", ".", {token: "FINDFIRSTOCCURRENCEOFTEXT", type: "terminal"}, 
       '(', {token: /",[ ]?"|',[ ]?'/, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"),
        () => displayMessage("Be sure to name the variable you're declaring commaPosition to represent the fact that it should store the position of the comma.  Since you use commaPosition in the assignment of firstName and lastName, you need to use commaPosition here as well."),
        () => displayMessage("Remember to include an = after the variable commaPosition you're declaring to set it to a value."), 
        () => displayMessage("Be sure to include the variable enteredName that you want to get the position of the comma from."),
        () => displayMessage("Be sure to include the . after the variable enteredName you want to get the comma from."),
        genericTerminalErrorMsg.bind(null, displayMessage, "FINDFIRSTOCCURRENCEOFTEXT"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[5] + "."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith(",")) {
            displayMessage("Since you're looking for the literal , and don't want the computer to evaluate it in any way, you need to surround it with quotation marks.");
          } else if(remaining.startsWith("'") || remaining.startsWith('"')) {
          	if(remaining[1] !== ",") {
          		displayMessage("What string literal are you getting the position for?")
          	} else {
          		displayMessage("You're only looking for the comma, correct?  If so, remember to close the quotation marks.");
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

Blockly.Python['type_in_get_last_first_name_input'] = Blockly.JavaScript['type_in_get_last_first_name_input'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_last_first_name_input'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "enteredName", "=", {token: "GETINPUTBYASKING", type: "terminal"}, '(', 
      {token: /^"[^"]*$|^'[^']*$|^"[^"]*name[^"]*"|^'[^']*name[^']*'/i, type: "regexp"}, ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring enteredName to represent the fact that it's storing the entered name."),
        () => displayMessage("Remember to include an = after the variable enteredName you're declaring to set it to the entered name."), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETINPUTBYASKING"), 
        (matchResultArr) => displayMessage("You're missing an open parenthesis after " + matchResultArr[3] + "."),
        () => displayMessage("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.  Be sure it also includes name in it so the user knows to enter a name.  You'll also want to indicate the form: last name, first name, perhaps with an example (e.g., Doe, Jane)."),
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

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          const xmlText = "<xml xmlns=\"https://developers.google.com/blockly/xml\"><variables><variable id=\"J^{n+l{9P?kUYL]KA(p+\">question</variable><variable id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</variable><variable id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</variable><variable id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</variable></variables><block type=\"variables_set\" id=\"tey#7{]XsVkhG}b67Q2T\" x=\"-319\" y=\"-488\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field><value name=\"VALUE\"><block type=\"text\" id=\"=l59pm#xp*/yD-Zc|wg=\"><field name=\"TEXT\">Where is the code?</field></block></value><next><block type=\"variables_set\" id=\"V#~VUK$roOeC26EkmW?;\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field><value name=\"VALUE\"><block type=\"text\" id=\"Fm6?0,yRfGqw=H7jKVMb\" collapsed=\"true\"><field name=\"TEXT\"> is </field></block></value><next><block type=\"variables_set\" id=\"=;4w/TJI8U;roa?mfg#L\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"jS~Kj^9d5DIq~hf`z4jx\"><value name=\"STRING\"><block type=\"variables_get\" id=\"xI+UJ`BR2IoA=:m2.B*?\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"G8=z4#vn~DVQ58@~r(=I\" collapsed=\"true\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"t2c_text_indexof\" id=\"P;qboVh8$3`*ZQ.DG(6u\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"ha.p:6)+1H/P*LaFY!{Z\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"_sOj%ytZ)S9[LmWJWyy8\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"{NgZVPFe)E:fw$Yv(Dof\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"y|+8g+^-SfUn.Obq@)FY\" collapsed=\"true\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"t2c_text_length\" id=\"IsT]+wz{|*qErOQ@|h#:\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"*|+P2mmKcMm)4~XpH.(D\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value></block></value><value name=\"B\"><block type=\"math_number\" id=\"PD)k:DHfFxBlAdLMs3T6\"><field name=\"NUM\">1</field></block></value></block></value></block></value><next><block type=\"variables_set\" id=\"P:h{5-%+;riCuK7$;{!p\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field><value name=\"VALUE\"><block type=\"t2c_text_getsubstring\" id=\"|4rEYR5]-S(.Se?Io$/A\"><value name=\"STRING\"><block type=\"variables_get\" id=\")i*xC}G_*9N~i=U+75J0\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yob-c[3iQmj0xZ^FseA(\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"t2c_text_indexof\" id=\"CeIb)%e|Z/75OUmz6P,;\" collapsed=\"true\"><value name=\"VALUE\"><block type=\"variables_get\" id=\"/o})GDz#dEvn;u4eTzP1\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"FIND\"><block type=\"variables_get\" id=\"1y!`dr5TL(iBH/9[IE${\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"%i_jCS,Xk~[/mjxs9`;2\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"P8U0,xqxomPv[5Sl8lf=\" collapsed=\"true\"><value name=\"A\"><block type=\"variables_get\" id=\"F+gf7S+_roWS*{)ZRd24\"><field name=\"VAR\" id=\"pLvA^N8w,`$Wz.{3]Y)l\">part1</field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"B1Y=oXh=^^orOCK#H$o7\"><value name=\"A\"><block type=\"variables_get\" id=\"F%K+Hd[/:yd:JgboT*j9\"><field name=\"VAR\" id=\"_$%T7oxG9i~t(OA!X7BQ\">needle</field></block></value><value name=\"B\"><block type=\"variables_get\" id=\"I`5?hxwqw~!_@INfi)=h\"><field name=\"VAR\" id=\".;Y0_DaJCJ`w*@mXVR3h\">part2</field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"^yimQQ{W%@n8Y{e|q?69\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"wa4vc*MX?9P^9tg^%Feh\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"+.=9g9xvfL5c-dTK9e/^\"><value name=\"STRING\"><block type=\"variables_get\" id=\"#3M#7)5e`eKu`]@29I.T\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_arithmetic_basic\" id=\"?s=kF-Eb~qnIS/i9S%$k\"><field name=\"OP\">ADD</field><value name=\"A\"><block type=\"math_number\" id=\"T)vE-]HRc9Cc$neCCi=A\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"%k:EE(mi/TwO.T3CmdAH\" collapsed=\"true\"><field name=\"NUM\">4</field></block></value></block></value><value name=\"AT2\"><block type=\"math_arithmetic_basic\" id=\"sdb|tpn1#Orzs:j3RbCr\"><field name=\"OP\">MINUS</field><value name=\"A\"><block type=\"math_number\" id=\"OH]@4.1rwF7n`JII|KiR\"><field name=\"NUM\">0</field></block></value><value name=\"B\"><block type=\"math_number\" id=\"RuN^dCq6h*Au:=1N{o?j\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"bVWo@VPftSJMF{BkTgV-\"><value name=\"A\"><block type=\"text\" id=\"}2w#qm#X-Ac2dpu-I)E^\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\"HtF)g6MCQA.QWbpRxvU;\"><value name=\"STRING\"><block type=\"variables_get\" id=\"h[-ZTV~_[D$IAx`)7giP\" collapsed=\"true\"><field name=\"VAR\" id=\"J^{n+l{9P?kUYL]KA(p+\">question</field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"G/8,n/wxJQyZ$*%u5RE@\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"x2)0#6b}DquVYhIbb;9r\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"+:|Barcq-TFBDN|:$3qJ\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"*w_1[Jk?M5:GnXhb:o!c\"><value name=\"A\"><block type=\"t2c_text_getsubstring\" id=\"dB@$9@38c!o`tQ?s%LI.\"><value name=\"STRING\"><block type=\"text\" id=\"y50AfR/k,=v.MK7I%_GI\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"Yu6:xNDzTKIt)X$k3c[(\"><field name=\"NUM\">0</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"Gfv3[8J_~D6Ki1%7j15k\"><field name=\"NUM\">0</field></block></value></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"*RzX8o=3@RGBu,W%hZj(\"><value name=\"A\"><block type=\"text\" id=\"Ao~Y}]Vb2RHlwXD_zV%%\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_getsubstring\" id=\")lV7J5:N.5!%as@|;@sd\"><value name=\"STRING\"><block type=\"text\" id=\"1g.%GKzcul)Bp.[ipz,D\"><field name=\"TEXT\"></field></block></value><value name=\"AT1\"><block type=\"math_number\" id=\"p2`IFYQT}9R]~5s%{1`I\" collapsed=\"true\"><field name=\"NUM\">1</field></block></value><value name=\"AT2\"><block type=\"math_number\" id=\"={)~-f]X#gx]F1C1]yV]\"><field name=\"NUM\">0</field></block></value></block></value></block></value></block></value><next><block type=\"text_print\" id=\"}B=g!~iteAMEx$/D8PYf\"><value name=\"TEXT\"><block type=\"t2c_text_join\" id=\"bVMuG!Ow(`|Ce_^m=Uv#\"><value name=\"A\"><block type=\"text\" id=\"*Zku[rj1$}o$KCBLT)VQ\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"t2c_text_join\" id=\"sgboEU$y7?(kIDz|/Ks`\"><value name=\"A\"><block type=\"text\" id=\"S+%!|P(T}ZgzI2;*/hiu\"><field name=\"TEXT\"></field></block></value><value name=\"B\"><block type=\"text\" id=\"l/zQv2B8pU[}8R17n84+\"><field name=\"TEXT\"></field></block></value></block></value></block></value><next><block type=\"text_print\" id=\"XX4|@r/#apDP=(~l$T-J\"><value name=\"TEXT\"><block type=\"text\" id=\"c=}Eo8_u?jBYLB~$Bh,-\"><field name=\"TEXT\"></field></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></xml>";
          alert("In this mission, we'll take an input of last name, first name and display it as first name last name.  E.g., Doe, Jane would result in Jane Doe.  To remember how we can use the blocks we'll need for this task, let's redo the last code tracing exercise from the last mission.");
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
          // alert("Good, so now we're ready for today's main mission.  But since this is a challenging mission, we're going to plan ahead!  When you finish these training missions and need to take on a challenging new coding problem without guidance, you may find yourself lost and typing code that gets you nowhere.  In these situations, it may help to work backward from your objective, which is exactly what we're going to do here.  Since we want to display the user's name as \"first last\", let's suppose we have their first and last names stored in the variables firstName and lastName and *use them* to display the person's name with a space.");//we know we'll need to get their first and last names!  So let's pret ")
          alert("Good, so now we're ready for today's main mission.  But we're going to plan ahead!  When you finish these training missions and need to take on a challenging new coding problem without guidance, you may find yourself lost and typing code that gets you nowhere.  In these situations, it may help to work backward from your objective, which is exactly what we're going to do here.  Since we want to display the user's name as \"first last\", let's suppose we have their first and last names stored in the variables firstName and lastName and *use them* to display the person's full name separated by a space.");//we know we'll need to get their first and last names!  So let's pret ")
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          workspace.clear();
          toolboxManager.clearToolbox();
          toolboxManager.createToolboxBlock("type_in_display_first_last_name");
          workspace.options.maxInstances["type_in_display_first_last_name"] = 1;
        }
      }
    )
  );

  citf.addTask(
	  new CourseInstructionTask(
	    () => {
	      const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastName");
	      const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == " ");
	      const t2cTextJoin2 = workspace.getAllBlocks().filter(block => (block.type === "text_join" || block.type === "t2c_text_join") && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstName");
	      const t2cTextJoin4 = workspace.getAllBlocks().filter(block => (block.type === "text_join" || block.type === "t2c_text_join") && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
	      return variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1;
	    },
      new HelpMessageDirection(() => {

    	  return "Drag the type-in-code block, and type the necessary code to display the person's first name and last name separated by a space, assuming the first and last names are stored in the variables, firstName and lastName, respectively.  E.g., if firstName = \"Jane\" and lastName = \"Doe\", you'd want to display \"Jane Doe\".";
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
          alert("✔ Acchaa (Good), so now of course we need to get the first and last names.  Let's get the last name first.  The input will be something like \"Doe, Jane\" so the last name will be a consecutive series of characters from part of this string...");//we know we'll need to get their first and last names!  So let's pret ")
          const firstNameQuestion = "Which of the following can be used to get a consecutive series of characters from part of this string? (Enter a, b, c, or d.)\nA. " + T2C.MSG.currentLanguage.TERMINAL_GETCHARACTERNUMBER + "\nB. " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + "\nC. " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + "\nD. " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER;
          let firstNameResponse = prompt(firstNameQuestion); 
          while(typeof firstNameResponse === "string" && !firstNameResponse.toLowerCase().startsWith("d")) {
          	firstNameResponse = prompt("No, " + firstNameResponse[0] + " is not correct.  Please try again.  " + firstNameQuestion);
          }
          alert((firstNameResponse ? "Yes" : "OK, we'll tell you") + ", D " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " is the correct answer.  Now this requires the string to extract text from and both starting and ending *numbers*, the first one telling the computer where to start extracting text from and the second telling it where to stop.  For an input of \"Doe, Jane\", the last name starts at the beginning and ends at the position of the comma.  So let's assume we have the input stored in enteredName and position of the comma in commaPosition and store the last name in a variable lastName, accordingly.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          // workspace.clear();
          toolboxManager.clearToolbox();
          toolboxManager.createToolboxBlock("type_in_set_last_name");
          workspace.options.maxInstances["type_in_set_last_name"] = 1;
        }
      }
    )
  );

  citf.addTask(
	  new CourseInstructionTask(
	    () => {
	      const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastName");
	      const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === " ");
	      const t2cTextJoin2 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstName");
	      const t2cTextJoin4 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
	      const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "commaPosition");
	      const mathNumber7 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
	      const variablesGet8 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredName");
	      const t2cTextGetsubstring9 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet6.indexOf(block.getInputTargetBlock("AT2")) !== -1);
	      const variablesSet10 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint5.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring9.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "lastName");
	      return variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1 && variablesGet6.length === 1 && mathNumber7.length === 1 && variablesGet8.length === 1 && t2cTextGetsubstring9.length === 1 && variablesSet10.length === 1;
	    },
      new HelpMessageDirection(() => {
      	const variableSetBlock = workspace.getAllBlocks().find(block => block.type === "variables_set"); 
      	const textPrintBlock = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print"); 
    	  if(textPrintBlock && variableSetBlock && textPrintBlock.getNextBlock() === variableSetBlock) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring lastName needs to go above the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block so the computer knows what lastName is when attempting to display the user's full name, which references lastName!  Remember that statements are run from top to bottom.";
        }

        if(textPrintBlock && variableSetBlock && textPrintBlock.getPreviousBlock() !== variableSetBlock) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block that sets lastName above the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block so the computer knows what lastName is when attempting to display the user's full name, which references lastName.";
        }

    	  return "Drag the type-in-code block, and attach it above the previous " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.  Then type the necessary code to store the user's last name in the variable lastName, *assuming* we have the input in the form \"last name, first name\" stored in the variable enteredName (e.g., enteredName = \"Doe, Jane\") *AND* the position of the comma stored in commaPosition (e.g., for \"Doe, Jane\", commaPosition = 3).";
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
          alert("✔ Bahut acchaa (Very good), so now let's get the first name.  The input will be something like \"Doe, Jane\" so the first name will also be a consecutive series of characters from part of this string so we can once again use " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + ".  You can figure out how you could get the numerical starting and ending positions from enteredString and commaPosition, right?");//we know we'll need to get their first and last names!  So let's pret ")
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
          toolboxManager.clearToolbox();
          toolboxManager.createToolboxBlock("type_in_set_first_name");
          workspace.options.maxInstances["type_in_set_first_name"] = 1;
        }
      }
    )
  );

  citf.addTask(
	  new CourseInstructionTask(
	    () => {
	      const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastName");
	      const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === " ");
	      const t2cTextJoin2 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstName");
	      const t2cTextJoin4 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
	      const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "commaPosition");
	      const mathNumber7 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
	      const variablesGet8 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredName");
	      const t2cTextGetsubstring9 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet6.indexOf(block.getInputTargetBlock("AT2")) !== -1);
	      const variablesSet10 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint5.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring9.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "lastName");
	      const t2cTextLength12 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet8.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber13 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        const mathArithmeticBasic15 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet6.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber13.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && t2cTextLength12.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet10.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "firstName");
        return variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1 && variablesGet6.length === 2 && mathNumber7.length === 1 && variablesGet8.length === 3 && t2cTextGetsubstring9.length === 1 && variablesSet10.length === 1 && t2cTextLength12.length === 1 && mathNumber13.length === 1 && mathArithmeticBasic15.length === 1 && t2cTextGetsubstring17.length === 1 && variablesSet18.length === 1;
	    },
      new HelpMessageDirection(() => {
      	const variableSetFirstNameBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstName"); 
      	const variableSetLastNameBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "lastName"); 
      	const textPrintBlock = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print"); 
    	  if(variableSetFirstNameBlock && textPrintBlock && (textPrintBlock.getNextBlock() === variableSetFirstNameBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring firstName needs to go above the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block so the computer knows what firstName is when attempting to display the user's full name, which references firstName!  Remember that statements are run from top to bottom.";
        }

        if(variableSetFirstNameBlock && variableSetFirstNameBlock.getNextBlock() !== variableSetLastNameBlock) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block that sets firstName above the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block storing lastName.";
        }

    	  return "Drag the type-in-code block, and attach it above the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " block.  Then type the necessary code to store the user's first name in the variable firstName, *assuming* we have the input in the form \"last name, first name\" stored in the variable enteredName (e.g., enteredName = \"Doe, Jane\") *AND* the position of the comma stored in commaPosition (e.g., for \"Doe, Jane\", commaPosition = 3).  Remember that there's a space after the comma.";
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
          alert("✔ Mahaan (Great)!  So for both the first and last name, we needed the position of the comma in the input, which we assume is being stored in enteredName.  You know how to tell the computer to find the position number of the (first) comma in enteredName and store it in the variable commaPosition, right?");//we know we'll need to get their first and last names!  So let's pret ")
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
          toolboxManager.clearToolbox();
          toolboxManager.createToolboxBlock("type_in_set_comma_pos");
          workspace.options.maxInstances["type_in_set_comma_pos"] = 1;
        }
      }
    )
  );

  citf.addTask(
	  new CourseInstructionTask(
	    () => {
	      const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastName");
	      const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === " ");
	      const t2cTextJoin2 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstName");
	      const t2cTextJoin4 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
	      const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "commaPosition");
	      const mathNumber7 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
	      const variablesGet8 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredName");
	      const t2cTextGetsubstring9 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet6.indexOf(block.getInputTargetBlock("AT2")) !== -1);
	      const variablesSet10 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint5.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring9.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "lastName");
	      const t2cTextLength12 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet8.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber13 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        const mathArithmeticBasic15 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet6.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber13.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && t2cTextLength12.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet10.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "firstName");
        const text19 = workspace.getAllBlocks().filter(block => block.type === "text" && (block.getFieldValue("TEXT") == "," || block.getFieldValue("TEXT") == ", "));
        const t2cTextIndexof21 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet8.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text19.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet22 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet18.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof21.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "commaPosition");
        return variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1 && variablesGet6.length === 2 && mathNumber7.length === 1 && variablesGet8.length === 4 && t2cTextGetsubstring9.length === 1 && variablesSet10.length === 1 && t2cTextLength12.length === 1 && mathNumber13.length === 1 && mathArithmeticBasic15.length === 1 && t2cTextGetsubstring17.length === 1 && variablesSet18.length === 1 && text19.length === 1 && t2cTextIndexof21.length === 1 && variablesSet22.length === 1;
	    },
      new HelpMessageDirection(() => {
      	const variableSetCommaPositionBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "commaPosition"); 
      	const variableSetFirstNameBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstName"); 
      	const variableSetLastNameBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "lastName"); 
      	const textPrintBlock = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print"); 
    	  if(variableSetCommaPositionBlock && (variableSetCommaPositionBlock.getPreviousBlock() === textPrintBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring commaPosition must go above the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block because the computer uses commaPosition in firstName and in lastName, both which need commaPosition to determine what they are.  Since instructions are run from top to bottom, it won't be able to determine firstName and lastName, which are used in the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " otherwise!";
        }

        if(variableSetCommaPositionBlock && (variableSetCommaPositionBlock.getPreviousBlock() === variableSetFirstNameBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring commaPosition must go above the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting firstName, because the computer uses commaPosition to determine what firstName is.  Since instructions are run from top to bottom, it won't know what commaPosition means, otherwise!";
        }

        if(variableSetCommaPositionBlock && (variableSetCommaPositionBlock.getPreviousBlock() === variableSetLastNameBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block declaring commaPosition must go above the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting lastName, because the computer uses commaPosition to determine what lastName is.  Since instructions are run from top to bottom, it won't know what commaPosition means, otherwise!";
        }

        if(variableSetCommaPositionBlock && variableSetCommaPositionBlock.getNextBlock() === null) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block that sets commaPosition above the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block storing firstName.";
        }

    	  return "Drag the type-in-code block, and attach it above the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " block.  Then type the necessary code to store the position number of the (first) comma from the value of enteredName in the variable commaPosition.";
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
          alert("✔ Excellent!  So now all we have left is to ask the user to enter a name in the form last name, first name and store it in the variable enteredName and we'll be done!");//we know we'll need to get their first and last names!  So let's pret ")
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
          toolboxManager.clearToolbox();
          toolboxManager.createToolboxBlock("type_in_get_last_first_name_input");
          workspace.options.maxInstances["type_in_get_last_first_name_input"] = 1;
        }
      }
    )
  );

  citf.addTask(
	  new CourseInstructionTask(
	    () => {
	      const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastName");
	      const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") === " ");
	      const t2cTextJoin2 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstName");
	      const t2cTextJoin4 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_join" || block.type === "text_join") && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
	      const variablesGet6 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "commaPosition");
	      const mathNumber7 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
	      const variablesGet8 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "enteredName");
	      const t2cTextGetsubstring9 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathNumber7.indexOf(block.getInputTargetBlock("AT1")) !== -1 && variablesGet6.indexOf(block.getInputTargetBlock("AT2")) !== -1);
	      const variablesSet10 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && textPrint5.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring9.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "lastName");
	      const t2cTextLength12 = workspace.getAllBlocks().filter(block => block.type === "t2c_text_length" && variablesGet8.indexOf(block.getInputTargetBlock("VALUE")) !== -1);
        const mathNumber13 = workspace.getAllBlocks().filter(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        const mathArithmeticBasic15 = workspace.getAllBlocks().filter(block => block.type === "math_arithmetic_basic" && variablesGet6.indexOf(block.getInputTargetBlock("A")) !== -1 && mathNumber13.indexOf(block.getInputTargetBlock("B")) !== -1 && block.getFieldValue("OP") == "ADD");
        const t2cTextGetsubstring17 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_getsubstring" || block.type === "js_text_getsubstring") && variablesGet8.indexOf(block.getInputTargetBlock("STRING")) !== -1 && mathArithmeticBasic15.indexOf(block.getInputTargetBlock("AT1")) !== -1 && t2cTextLength12.indexOf(block.getInputTargetBlock("AT2")) !== -1);
        const variablesSet18 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet10.indexOf(block.getNextBlock()) !== -1 && t2cTextGetsubstring17.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "firstName");
        const text19 = workspace.getAllBlocks().filter(block => block.type === "text" && (block.getFieldValue("TEXT") == "," || block.getFieldValue("TEXT") == ", "));
        const t2cTextIndexof21 = workspace.getAllBlocks().filter(block => (block.type === "t2c_text_indexof" || block.type === "js_text_indexof") && variablesGet8.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && text19.indexOf(block.getInputTargetBlock("FIND")) !== -1);
        const variablesSet22 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet18.indexOf(block.getNextBlock()) !== -1 && t2cTextIndexof21.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "commaPosition");
        const text23 = workspace.getAllBlocks().filter(block => block.type === "text" && (typeof block.getFieldValue("TEXT") === "string") && block.getFieldValue("TEXT").indexOf("name") !== -1);
        const textInput24 = workspace.getAllBlocks().filter(block => (block.type === "text_input" || block.type === "js_text_input") && text23.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
        const variablesSet25 = workspace.getAllBlocks().filter(block => block.type === "variables_set" && variablesSet22.indexOf(block.getNextBlock()) !== -1 && textInput24.indexOf(block.getInputTargetBlock("VALUE")) !== -1 && block.getField("VAR").getText() === "enteredName");
        return variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1 && variablesGet6.length === 2 && mathNumber7.length === 1 && variablesGet8.length === 4 && t2cTextGetsubstring9.length === 1 && variablesSet10.length === 1 && t2cTextLength12.length === 1 && mathNumber13.length === 1 && mathArithmeticBasic15.length === 1 && t2cTextGetsubstring17.length === 1 && variablesSet18.length === 1 && text19.length === 1 && t2cTextIndexof21.length === 1 && variablesSet22.length === 1 && text23.length === 1 && textInput24.length === 1 && variablesSet25.length === 1;
	    },
      new HelpMessageDirection(() => {
      	const variableSetInputBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "enteredName");
      	const variableSetCommaPositionBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "commaPosition"); 
      	const variableSetFirstNameBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstName"); 
      	const variableSetLastNameBlock = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "lastName"); 
      	const textPrintBlock = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print"); 
    	  if(variableSetInputBlock && textPrintBlock && (textPrintBlock.getNextBlock() === variableSetInputBlock)) {
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting enteredName must go above the " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"] + " block because the computer uses enteredName in firstName and in lastName, both which need enteredName to determine what they are.  Since instructions are run from top to bottom, it won't be able to determine firstName and lastName, which are used in the " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " otherwise!";
        }

        if(variableSetInputBlock && (variableSetInputBlock.getPreviousBlock() !== null)) {
        	const varName = variableSetInputBlock.getPreviousBlock().type === "variables_set" && variableSetInputBlock.getPreviousBlock().getField("VAR").getText();
          return "The " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting enteredName must go above the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block setting " + varName + " because the computer uses enteredName to determine what " + varName + " is.  Since instructions are run from top to bottom, it won't know what enteredName means, otherwise!";
        }

        if(variableSetInputBlock && variableSetInputBlock.getNextBlock() === null) {
          return "Place the new " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block that sets enteredName above the " + T2C.MSG.currentLanguage["TERMINAL_LET"] + " variable block storing commaPosition.";
        }

    	  return "Drag the type-in-code block, and attach it above the previous " + T2C.MSG.currentLanguage.TERMINAL_LET + " block.  Then type the necessary code to ask the user for their full name in the form last, first, including the space after the comma (e.g., as Doe, Jane) and storing his/her inputted name in enteredName.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

/*
  citf.addTask(
	  new CourseInstructionTask(
	    () => {
	      const variablesGet0 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastName");
	      const text1 = workspace.getAllBlocks().filter(block => block.type === "text" && block.getFieldValue("TEXT") == " ");
	      const t2cTextJoin2 = workspace.getAllBlocks().filter(block => (block.type === "text_join" || block.type === "t2c_text_join") && text1.indexOf(block.getInputTargetBlock("A")) !== -1 && variablesGet0.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const variablesGet3 = workspace.getAllBlocks().filter(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstName");
	      const t2cTextJoin4 = workspace.getAllBlocks().filter(block => (block.type === "text_join" || block.type === "t2c_text_join") && variablesGet3.indexOf(block.getInputTargetBlock("A")) !== -1 && t2cTextJoin2.indexOf(block.getInputTargetBlock("B")) !== -1);
	      const textPrint5 = workspace.getAllBlocks().filter(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && t2cTextJoin4.indexOf(block.getInputTargetBlock("TEXT")) !== -1);
	      return variablesGet0.length === 1 && text1.length === 1 && t2cTextJoin2.length === 1 && variablesGet3.length === 1 && t2cTextJoin4.length === 1 && textPrint5.length === 1;
	    },
      new HelpMessageDirection(() => {

    	  return "Drag the type-in-code block, and attach it to the below the previously assembled " + T2C.MSG.currentLanguage.TERMINAL_DISPLAY + " block.  Then type the necessary code to get the text between the first @ and the first ., e.g., the google in coolcoder@google.com or the mail in expertsoftwareengineer@mail.co.uk.  HINT: Use " + T2C.MSG.currentLanguage.TERMINAL_GETTEXTFROMPOSITIONNUMBER + " as you did before, but consider how you'd use a second " + T2C.MSG.currentLanguage.TERMINAL_FINDFIRSTOCCURRENCEOFTEXT + " to *stop* at the correct position number this time as you'd no longer use " + T2C.MSG.currentLanguage.TERMINAL_LENGTH + " since you don't want to stop at the end.  As before, make sure your calculations simultaneously work on coolcoder@google.com (start #: 10, end before #: 16), expertsoftwareengineer@mail.co.uk (start #: 23, end before #: 27), and jdoe@foo.edu (start #: 5, end before #: 8), or any other e-mail address by substituting as you did at the beginning.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );
*/

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("✔✔✔ Outstanding!  And with that, Mission # 6 is accomplished!  Can you believe you finished the problem already?  You see how working backward can take a potentially challenging problem and make it a lot simpler?  In the next mission 7, you'll continue your training turning s's into dollar signs with a little cutting and pasting using the same types of blocks from this mission.  However, next time, you'll be typing code in straight up JavaScript!  Your ready?  Until next time!");
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