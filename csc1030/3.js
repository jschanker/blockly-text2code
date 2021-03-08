import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
import MessageConsoleManager from "../core/message_console_manager.js";
import TypeInCodeBlock from "../core/type_in_code_block.js";
import LevelGenerator from "../core/level_generator.js";

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

Blockly.Python['type_in_get_input'] = Blockly.JavaScript['type_in_get_input'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_input'] = {
  validate: (exp) => {
    // TODO: Clean up code; validation logic should be part of parser

    // should be let s = getInputByAsking("Enter string with even number of characters")

    // check for let
    let match = getAfterTerminal(exp.trim(), "let");
    let processedMatch;
    let matchAfterEqual;

    if(!match) {
      displayMessage("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_LET"] + ".");
      return null;      
    }

    // check for variable name s
    if(match.remaining.length && !match.remaining.startsWith("s")) {
      displayMessage("Be sure to name the variable you're declaring s.  This will store the string with an even number of characters the user enters.");
      return match.terminal;
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    // check for = sign
    if(match.remaining.length && !match.remaining.startsWith("=")) {
      displayMessage("Remember to include an = after the variable s you're declaring to set it to the string the user enters.");
      return match.terminal + "s";
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    if(!match.remaining.length) {
      displayMessage("");
      return exp;
    }

    processedMatch = match.terminal + "s = ";

    // check for getInputByAsking
    matchAfterEqual = getAfterTerminal(match.remaining.trim(), "GETINPUTBYASKING");

    if(!matchAfterEqual) {
      displayMessage("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_GETINPUTBYASKING"] + ".");
      return processedMatch;
    }

    // check for opening parenthesis
    if(matchAfterEqual.remaining.length && !matchAfterEqual.remaining.startsWith("(")) {
      displayMessage("You're missing an opening parenthesis after " + matchAfterEqual.terminal);
      return processedMatch + matchAfterEqual.terminal;
    }

    matchAfterEqual.remaining = matchAfterEqual.remaining.JSSubstring(1).trim();

    // check for open quotes
    if(matchAfterEqual.remaining.length && !matchAfterEqual.remaining.startsWith('"') && !matchAfterEqual.remaining.startsWith("'")) {
      displayMessage("The message to supply to the user should be surrounded by \" and \" because you want it to be displayed as is.")
      return processedMatch + matchAfterEqual.terminal + "(";
    }

    // check for message and closing quotes
    let matchLiteral, msgWithQuotes;
    if(matchAfterEqual.remaining.length && (matchLiteral = matchAfterEqual.remaining.match(/^"[^"]*"|^'[^']*'/))) {
      msgWithQuotes = matchLiteral[0];
      if(msgWithQuotes.toLowerCase().indexOf(" even ") === -1 && msgWithQuotes.indexOf(" ") === -1) {
        displayMessage("Make sure the message contains the word even to tell the user you want him/her to enter an even number of characters (> 0).  And be sure it has spaces since you can and should include them in messages read by humans!");
        return processedMatch + matchAfterEqual.terminal + "(" + msgWithQuotes.substring(0, msgWithQuotes.length-1);
      }
      else if(msgWithQuotes.toLowerCase().indexOf(" even ") === -1) {
        displayMessage("Make sure the message contains the word even (surrounded by spaces) to tell the user you want him/her to enter an even number of characters (> 0).");
        return processedMatch + matchAfterEqual.terminal + "(" + msgWithQuotes.substring(0, msgWithQuotes.length-1);
      }
    }

    if(matchAfterEqual.remaining.length && msgWithQuotes) matchAfterEqual.remaining = matchAfterEqual.remaining.JSSubstring(msgWithQuotes.length).trim();

    // check for closing parenthesis
    if(matchAfterEqual.remaining.length && msgWithQuotes && !matchAfterEqual.remaining.startsWith(")")) {
      displayMessage("You're missing a closing parenthesis for " + matchAfterEqual.terminal);
      return processedMatch + matchAfterEqual.terminal + "(" + msgWithQuotes;
    }

    if(matchAfterEqual.remaining.length && msgWithQuotes) matchAfterEqual.remaining = matchAfterEqual.remaining.JSSubstring(1).trim();

    displayMessage("");
    return exp;
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
            displayMessage("Try checking what you entered again for mistakes.  You probably just have extra unnecessary code after a ).");
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

Blockly.Python['type_in_set_to_char_number_0'] = Blockly.JavaScript['type_in_set_to_char_number_0'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_to_char_number_0'] = {
  validate: (exp) => {
    // TODO: Clean up code; validation logic should be part of parser

    // should be let firstChar = s.getCharacterNUMBER(0);

    // check for let
    let match = getAfterTerminal(exp.trim(), "let");
    let processedMatch;
    let matchAfterPeriod;

    if(!match) {
      displayMessage("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_LET"] + ".");
      return null;      
    }

    // check for variable name firstChar
    if(match.remaining.length && !(match.remaining.startsWith("firstChar") || "firstChar".startsWith(match.remaining))) {
      displayMessage("Be sure to name the variable you're declaring firstChar to representing the fact that it's storing the entered string's first character.");
      return match.terminal;
    }

    match.remaining = match.remaining.JSSubstring("firstChar".length).trim();

    // check for = sign
    if(match.remaining.length && !match.remaining.startsWith("=")) {
      displayMessage("Remember to include an = after the variable firstChar you're declaring to set it to the string's first character.");
      return match.terminal + "firstChar";
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    if(!match.remaining.length) {
      displayMessage("");
      return exp;
    }

    processedMatch = match.terminal + "firstChar = ";

    // check for variable s
    if(match.remaining.length && !match.remaining.startsWith("s")) {
      if(match.remaining.startsWith('"')) {
        displayMessage("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
      } else if(match.remaining.startsWith('f')) {
        displayMessage("This is the string you want to get the initial character from so you'll want to use s, which stores what the user entered.")
      } else {
        displayMessage("Be sure to include the variable s that you want to the get the value's first character from.");
      }
      return processedMatch;
    }

    match.remaining = match.remaining.JSSubstring(1).trim();

    // check for .
    if(match.remaining.length && !match.remaining.startsWith(".")) {
      displayMessage("Be sure to include the . after the variable")
      return processedMatch + "s";
    }

    if(!match.remaining.length) {
      displayMessage("");
      return exp;
    }

    processedMatch += "s.";

    // check for getCharacterNUMBER
    matchAfterPeriod = getAfterTerminal(match.remaining.JSSubstring(1).trim(), "GETCHARACTERNUMBER");

    if(!matchAfterPeriod) {
      displayMessage("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"]);
      return processedMatch;
    }

    // check for opening parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("(")) {
      displayMessage("You're missing an opening parenthesis after " + matchAfterPeriod.terminal);
      return processedMatch + matchAfterPeriod.terminal;
    }

    matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

    // check for correct position number
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith("0")) {
      if(matchAfterPeriod.remaining.startsWith('"')) {
        displayMessage("Don't use \" here as you want the computer to interpret this as a number and not text.");
      } else if(matchAfterPeriod.remaining.startsWith("1")) {
        displayMessage("Remember that character positions start at the number 0.");
      } else if(parseInt(matchAfterPeriod.remaining)) {
        displayMessage("The number you're entering is incorrect for getting the initial character.")
      }
      else {
        displayMessage("Include a number for the position you want after " + matchAfterPeriod.terminal + "(");
      }
      return processedMatch + matchAfterPeriod.terminal + "(";
    }

    matchAfterPeriod.remaining = matchAfterPeriod.remaining.JSSubstring(1).trim();

    // check for first closing parenthesis
    if(matchAfterPeriod.remaining.length && !matchAfterPeriod.remaining.startsWith(")")) {
      displayMessage("You're missing a closing parenthesis for " + matchAfterPeriod.terminal);
      return processedMatch + matchAfterPeriod.terminal + "(0";
    }

    displayMessage("");
    return exp;
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

Blockly.Python['type_in_set_to_last_char'] = Blockly.JavaScript['type_in_set_to_last_char'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_to_last_char'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let lastChar = s.getCharacterNUMBER(s.length-1);

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "lastChar", "=", "s", ".", 
      {token: "GETCHARACTERNUMBER", type: "terminal"}, "(", "s", ".",
      {token: "LENGTH", type: "terminal"}, "-", "1", ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring lastChar to representing the fact that it's storing the entered string's last character."),
        () => displayMessage("Remember to include an = after the variable lastChar you're declaring to set it to the string's last character."), 
        (matchResultArr, remaining) => {
          if(remaining.startsWith('"')) {
            displayMessage("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
          } else if(remaining.startsWith('l')) { // anticipates lastCharacter
            displayMessage("This is the string you want to get the last character from so you'll want to use s, which stores what the user entered.")
          } else {
            displayMessage("Be sure to include the variable s that you want to the get the value's last character from.");
          }
        }, 
        () => displayMessage("Be sure to include the . after the variable"), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETCHARACTERNUMBER"), 
        (matchResultArr) => "You're missing an open parenthesis after " + matchResultArr[5] + ".", 
        (matchResultArr, remaining) => {
          if(remaining.startsWith("-")) {
            displayMessage("Let's get the length of the string first when calculating the position of the last character even though it doesn't need to appear before the operation."); //even though you don't need to do the arithmetic in this order.")
          } 
          else if(!isNaN(parseInt(remaining))) {
            displayMessage("Remember that since the string can be of any length, its last character will not always be at position " + parseInt(remaining) + ".")
          } else {
            displayMessage("To get the length of a string, you'll need to first specify the string you want the length of.  In this case, you'll need to use the length of the entered string (stored in s) to get the position of its last character.");
          }
        }, 
        (matchResultArr, remaining) => {
          if(remaining.startsWith("(")) {
            displayMessage("An expression representing a number should go after the open parenthesis for " + matchResultArr[5] + ".  It wouldn't make sense to get the character at position number \"pizza\" (or whatever string the user enters), right?");
          } else {
            displayMessage("Be sure to include the . after the variable s if you want to get its length.");
          }
        },
        genericTerminalErrorMsg.bind(null, displayMessage, "LENGTH"), 
        (matchResultArr, remaining) => { 
          if(remaining.startsWith("(")) {
            displayMessage("The length of a 5-character string such as pizza is 5, but since you start counting from 0, this was not the position of the last character.  Consider using some math operation to calculate the correct position.");
          } else if(remaining.startsWith("+")) {
            displayMessage("Consider adding a number such as 1 to 5, which is the length of pizza.  This gives you 6, but you wouldn't use 6 for the number of the position for the last character, right?");
          } else {
            displayMessage("Type the appropriate option (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE) that you want to perform on the string's length to calculate the character's last position.  Your current answer won't work in general.");
          }
        }, 
        (matchResult, remaining) => {
          const num = parseInt(remaining);
          if(isNaN(num)) {
            displayMessage("Remember that the length is a number.  What would it mean to subtract a string from a number?");
          } else if(num === 0) {
            displayMessage("The length of a 5-character string such as pizza is 5, but since you start counting from 0, this was not the position of the last character.  Also subtracting 0 doesn't change the quantity (e.g., 5 - 0 = 5) so it wouldn't be necessary.")
          }
          else {
            displayMessage("What number do you want to subtract from the length of the string to get the position of its last character?  pizza had a length of 5, and its last character was at what position?  food has a length of 4, and its last character is at what position?")
          }
        }, 
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for " + matchResultArr[5])
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

// position of second middle character:

Blockly.Python['type_in_set_to_position_of_second_middle_char'] = Blockly.JavaScript['type_in_set_to_position_of_second_middle_char'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_to_position_of_second_middle_char'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let positionOfSecondMiddleChar = s.length/2;

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "positionOfSecondMiddleChar", "=", "s", ".", 
      {token: "LENGTH", type: "terminal"}, "/", "2"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring positionOfSecondMiddleChar to represent the fact that it's storing the position number of the string's second middle character."),
        () => displayMessage("Remember to include an = after the variable positionOfSecondMiddleChar you're declaring to set it to the position of the string's second middle character."), 
        (matchResultArr, remaining) => {
          if(!isNaN(parseInt(remaining))) {
            displayMessage("Let's get the length of the string first when calculating the position of the second middle character even though it doesn't need to appear before the operation.")
          } else if(remaining.startsWith('"')) {
            displayMessage("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
          } else if(remaining.startsWith('l') || remaining.startsWith('p')) { // anticipates lastCharacter/positionOfSecondMiddleCharacter
            displayMessage("This is the string you want to get the length of so you'll want to use s, which stores what the user entered.")
          } else {
            displayMessage("Be sure to include the variable s that you want to the get the length of.");
          }
        }, 
        () => displayMessage("Be sure to include the . after the variable"), 
        genericTerminalErrorMsg.bind(null, displayMessage, "LENGTH"),  
        (matchResultArr, remaining) => { 
          if(remaining.startsWith("-")) {
            displayMessage("If you subtract a *specific number* for the length, this won't work in general.  For example, the length of SCRABBLE is 8 and the position of its second middle character is 4.  So subtracting 4 from the length works for that example, but if your string were FOOD, the middle character is at 2, but subtracting 4 from the length of 4 gives you 0.");
          } else if(remaining.startsWith("+")) {
            displayMessage("Remember that the last character is at the length of the string - 1.  If you add zero or a positive number to the length, you'll get the position of a character that does not exist!  For example, if you add 1 to the length of pizza, you'll get 5 + 1 or 6, but the position of the last character is 4 so you'll go out of bounds!");
          } else if(remaining.startsWith("*")) {
            displayMessage("Multiplication could work, but not by a positive whole number since multiplying the length of the string by 1, 2, 3, or 4 will always be greater than the position of the last character of the string, which is its length - 1.  For example, multiplying the length of pizza by 4, gives you 5 * 4 = 20 and there's no 20th character!  What operation could you use instead so you don't refer to a position that's out of bounds?")
          } else {
            displayMessage("Type the appropriate option (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE) that you want to perform on the string's length to calculate the position of its second middle character.");
          }
        }, 
        (matchResult, remaining) => {
          const num = parseInt(remaining);
          if(remaining.startsWith('"') || remaining.startsWith("'")) {
            displayMessage("Remember that the length is a number.  What would it mean to divide a string from a number?");
          } else if(isNaN(num)) {
            displayMessage("Remember that the length is a number.  You wouldn't divide it by the string the user enters (e.g., what would 8/SCRABBLE mean?) and you can't divide it by positionOfSecondMiddleChar because you're defining that variable.  And if you divide any positive number by itself, that'd be 1 anyway which won't be the position of the second middle character in general.  You can divide the length by a specific number to get the position of the second middle character.  What should that be?");
          } 
          else {
            displayMessage("If you divide the length of SCRABBLE by " + num + ", you'll get " + 8/num + ", which is not the position of its second middle character (4).  Try a different number.  Also verify that it works for strings of other even lengths such as CODE.");
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

Blockly.Python['type_in_set_to_position_of_first_middle_char'] = Blockly.JavaScript['type_in_set_to_position_of_first_middle_char'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_set_to_position_of_first_middle_char'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let positionOfFirstMiddleChar = positionOfSecondMiddleChar - 1;

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "positionOfFirstMiddleChar", "=", "positionOfSecondMiddleChar", "-", "1"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring positionOfFirstMiddleChar to represent the fact that it's storing the position number of the string's first middle character."),
        () => displayMessage("Remember to include an = after the variable positionOfFirstMiddleChar you're declaring to set it to the position of the string's first middle character."), 
        (matchResultArr, remaining) => {
          if(remaining.startsWith("-")) {
            displayMessage("Let's get the length of the string first when calculating the position of the first middle character even though it doesn't need to appear before the operation."); //even though you don't need to do the arithmetic in this order.")
          } 
          else if(remaining.startsWith('"')) {
            displayMessage("Don't use \" here as you want the computer to evaluate the variable.")
          } else if(remaining.startsWith('l')) {
            displayMessage("While you might use a math operation on the *position* of the last character, which is a number, to get the position of the first middle character, you would not use the character itself.  E.g., you might do a math operation on 4, which is the position of the a in pizza, but not the a itself.  However, try using a math operation on the *position* of the second middle character instead.")
          } else if(remaining.startsWith('s')) {
            displayMessage("Instead of using the length of the string s this time to calculate the position of the first middle character, try using the position of the second middle character instead.");
          } else {
            displayMessage("You'll want to use the position of the second middle character to get the position of the first middle character.  You already stored that in what variable?");
          }
        },
        (matchResultArr, remaining) => { 
          if(remaining.startsWith("/")) {
            displayMessage("Dividing the position of the second middle character by a number won't get the previous position where the first middle character resides.  For example, for SCRABBLE, the second middle character is at position 4.  Dividing this by 2 gets you 2, the position of the R, by 3 gets you 4/3, which is not even a position, etc.  What would you do to the 4 to get to the position of the first middle character at 3?");
          } else if(remaining.startsWith("+")) {
            displayMessage("Adding a positive number won't be what you want as that moves you forward.  For example, the position of the second middle character of SCRABBLE is 4.  Adding 1, 2, or 3 would give you 5, 6, or 7, the positions of the second B, the L, and the E, respectively, not the position of the first middle character (A).");
          } else if(remaining.startsWith("*")) {
            displayMessage("Multiplying the position of the second middle character by a whole number won't get the previous position where the first middle character resides in general.  For example, for SCRABBLE, the second middle character is at position 4.  For example, multiplying by 0 always gives you 0 (position of initial character), by 1 gives you 4 (unchanged: position of second middle character), by 2 gives you 8 (number that's out of bounds beyond the position of the last character at 7).  What would you do to the 4 to get to the position of the first middle character at 3?");
          } else {
            displayMessage("Type the appropriate option (+ = ADD, - = SUBTRACT, * = MULTIPLY, / = DIVIDE) that you want to perform on positionOfSecondMiddleChar to calculate the position of the entered string's first middle character.");
          }
        }, 
        (matchResult, remaining) => {
          const num = parseInt(remaining);
          if(remaining.startsWith('"') || remaining.startsWith("'")) {
            displayMessage("Remember that positionOfSecondMiddleChar is a number and that quotes are for specific strings such as 'pizza'.  Why would you subtract a specific string from a number and what would it mean?");
          } else if(isNaN(num)) {
            displayMessage("Regardless of whether the string is at, code, pizzas, scrabble, or any other string with an even number of characters (not 0), you can always subtract the same number from the position of the second middle character to get the position of the first middle character.  The positions of the second middle characters and first characters are as follows (what number do you subtract from the first number to get the second?): \nat       : 1 | 0\ncode     : 2 | 1\npizzas   : 3 | 2\nscrabble : 4 | 3");
          } 
          else {
            displayMessage("If you subtract " + num + "from the position of the second middle character of SCRABBLE, you'll get " + 4 - num + ", which is not the position of its first middle character (3).  Try a different number.  Also verify that it works for strings of other even lengths such as CODE.");
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

Blockly.Python['type_in_get_first_middle_char'] = Blockly.JavaScript['type_in_get_first_middle_char'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_first_middle_char'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let firstMiddleChar = s.getCharacterNUMBER(positionOfFirstMiddleChar);

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "firstMiddleChar", "=", "s", ".", {token: "GETCHARACTERNUMBER", type: "terminal"}, 
        "(", "positionOfFirstMiddleChar",  ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring firstMiddleChar to represent the fact that it's storing the string's first middle character."),
        () => displayMessage("Remember to include an = after the variable firstMiddleChar you're declaring to set it to the string's first middle character."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith('"')) {
            displayMessage("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
          } else if(remaining.startsWith('l') || remaining.startsWith('p') || remaining.startsWith('f')) {
            displayMessage("To get the a character at a given position in a string, you'll first need to specify the string you want to get the first middle character from so you'll want to use s, which stores what the user entered.")
          } else {
            displayMessage("Be sure to include the variable s that you want to the get the value's first middle character from.");
          }
        }, 
        () => displayMessage("Be sure to include the . after the variable"), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETCHARACTERNUMBER"), 
        (matchResultArr) => "You're missing an open parenthesis after " + matchResultArr[5] + ".",
        (matchResultArr, remaining) => {
          if(remaining.startsWith('"') || remaining.startsWith("'")) {
            displayMessage("Remember that quotes are for specific strings such as 'pizza', but you want something representing a number after the open parenthesis for " + matchResultArr[5] + ".  It wouldn't make sense to get the character at position *number* \"pizza\" of some string, right?");
          } else if(!isNaN(remaining)) {
            displayMessage("You can't use a specific number here since the position of the first middle character will depend on the length of the string entered.");
          } else {
            displayMessage("You already have a variable storing the position number of the character that you want, don't you?  If a variable stores the result of a valid math operation, it should be a number so you can use it here.  For example, if s stores the 8-character user input SCRABBLE, s.length - 1 evaluates to 8 - 1 or 7.  So if a variable positionOfLastChar is set to s.length-1, it'll store 7.  You can then use s.length-1 in " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " and it'd get the 7th character.  Now you don't have such a variable here, but you do have a variable that stores the position number of the first middle character, which is what you want, right?")
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for " + matchResultArr[5] + ".")
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

Blockly.Python['type_in_get_second_middle_char'] = Blockly.JavaScript['type_in_get_second_middle_char'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_get_second_middle_char'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be let secondMiddleChar = s.charAt(positionOfSecondMiddleChar)

    const result = matchStatement(exp, 
      [{token: "let", type: "terminal"}, "secondMiddleChar", "=", "s", ".", {token: "GETCHARACTERNUMBER", type: "terminal"}, 
        "(", "positionOfSecondMiddleChar",  ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "LET"), 
        () => displayMessage("Be sure to name the variable you're declaring secondMiddleChar to represent the fact that it's storing the string's second middle character."),
        () => displayMessage("Remember to include an = after the variable secondMiddleChar you're declaring to set it to the string's second middle character."),
        (matchResultArr, remaining) => {
          if(remaining.startsWith('"')) {
            displayMessage("Don't use \" here as you want the computer to evaluate what you typed (e.g., the word the user entered instead of the letter s)")
          } else if(remaining.startsWith('l') || remaining.startsWith('p') || remaining.startsWith('f')) {
            displayMessage("To get the a character at a given position in a string, you'll first need to specify the string you want to get the second middle character from so you'll want to use s, which stores what the user entered.")
          } else {
            displayMessage("Be sure to include the variable s that you want to the get the value's second middle character from.");
          }
        }, 
        () => displayMessage("Be sure to include the . after the variable"), 
        genericTerminalErrorMsg.bind(null, displayMessage, "GETCHARACTERNUMBER"), 
        (matchResultArr) => "You're missing an open parenthesis after " + matchResultArr[5] + ".",
        (matchResultArr, remaining) => {
          if(remaining.startsWith('"') || remaining.startsWith("'")) {
            displayMessage("Remember that quotes are for specific strings such as 'pizza', but you want something representing a number after the open parenthesis for " + matchResultArr[5] + ".  It wouldn't make sense to get the character at position *number* \"pizza\" of some string, right?");
          } else if(!isNaN(remaining)) {
            displayMessage("You can't use a specific number here since the position of the second middle character will depend on the length of the string entered.");
          } else {
            displayMessage("You already have a variable storing the position number of the character that you want, don't you?  If a variable stores the result of a valid math operation, it should be a number so you can use it here.  For example, if s stores the 8-character user input SCRABBLE, s.length - 1 evaluates to 8 - 1 or 7.  So if a variable positionOfLastChar is set to s.length-1, it'll store 7.  You can then use s.length-1 in " + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"] + " and it'd get the 7th character.  Now you don't have such a variable here, but you do have a variable that stores the position number of the second middle character, which is what you want, right?")
          }
        },
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for " + matchResultArr[5] + ".")
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


//
Blockly.Python['type_in_combine_first_last_middle2_chars'] = Blockly.JavaScript['type_in_combine_first_last_middle2_chars'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_combine_first_last_middle2_chars'] = {
  validate: (exp) => {
    // TODO: validation logic should be part of parser

    // should be console.log(s + ": " + firstChar + lastChar + firstMiddleChar + secondMiddleChar)
    // maybe allow single quotes for literals

    const result = matchStatement(exp, 
      [{token: "display", type: "terminal"}, "(", "s", "+", '"', ': ', '"', "+", "firstChar", "+", "lastChar", "+", "firstMiddleChar", "+", "secondMiddleChar", ")"],
      [
        genericTerminalErrorMsg.bind(null, displayMessage, "DISPLAY"),
        (matchResultArr, remaining) => displayMessage("You're missing an open parenthesis after " + matchResultArr[0] + "."),
        () => displayMessage("First you want to display the string the user entered, which is stored in the variable s."),
        () => displayMessage("Recall from Mission 0 that you can join strings using + ."),
        () => displayMessage("After the string the user entered, you want to literally display the separator text.  Do you remember what you need to use so the string is displayed exactly as is."),
        () => displayMessage("You want a colon followed by a space.  Be sure to display both and nothing else."),
        () => displayMessage("Remember that you'll need (to close the) quotation marks before joining it with the first character that comes next.  This is because you'll want the computer to display the first character, which is stored in the variable firstChar.  You don't want to literally display firstChar so it needs to be outside of quotation marks."),
        () => displayMessage("You need to include +'s between all strings you want to join together."),
        () => displayMessage("The first character should be displayed next.  Recall that it's stored in firstChar."),
        () => displayMessage("You need to include +'s between all strings you want to join together."),
        () => displayMessage("The last character should be displayed next.  Recall that it's stored in lastChar."),
        () => displayMessage("You need to include +'s between all strings you want to join together."),
        () => displayMessage("The first middle character should be displayed next.  What variable stores it?"),
        () => displayMessage("You need to include +'s between all strings you want to join together."),
        () => displayMessage("The second middle character should be displayed next.  What variable stores it?"),
        (matchResultArr, remaining) => displayMessage("You're missing a closing parenthesis for " + matchResultArr[0] + ".")
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

function clearToolbox(workspace) {
  Array.from(document.getElementById("toolbox").children).forEach(x => x.remove());
  workspace.options.maxInstances = {};
  workspace.updateToolbox(document.getElementById("toolbox"));
}

function createToolboxBlock(workspace, blockType, prepend=true) {
	const block = createBlockWithType(blockType);
  if(prepend) {
    document.getElementById("toolbox").prepend(block);
  } else {
    document.getElementById("toolbox").append(block);
  }
  //if(update) 
  workspace.updateToolbox(document.getElementById("toolbox"));
  return block;
}

function createBlockWithType(blockType) {
  const block = document.createElement("block");
  block.setAttribute("type", blockType);
  return block;
}

function setToolboxBlockFieldValue(block, fieldName, fieldValue) {
  const field = document.createElement("field");
  field.setAttribute("name", fieldName);
  field.appendChild(document.createTextNode(fieldValue));
  block.appendChild(field);
}

function setToolboxBlockInputValue(block, inputName, inputValueBlock) {
  const inputVal = document.createElement("value");
  inputVal.setAttribute("name", inputName)
  inputVal.appendChild(inputValueBlock);
  block.appendChild(inputVal);
}

function removeToolboxBlock(workspace, type) {
    // FIX: THIS DOESN'T WORK : NO TYPE PROPERTY ON DOM BLOCKS;
    //     workspace.getToolbox() returns null for some reason
	console.log(workspace.getToolbox()); 
	const block = Array.from(document.getElementById("toolbox").children)
	  .find(x => x.type === type);
	console.warn(Array.from(document.getElementById("toolbox").children))
	if(block) block.remove();
	workspace.updateToolbox(document.getElementById("toolbox"));
	return block;
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

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  // THIS MISSION IS IN DEVELOPMENT!  THE MESSAGE WILL BE REMOVED WHEN IT CAN BE COMPLETED.\n
  alert("In this mission, you'll be prompting the user for a string with an even number of characters (at least 2) and then displaying a single 4-character string as first character, last character, first middle character, and second middle character in that order.  For example, for SCRABBLE, you'd display SEAB.");
  const workspace = ws || Blockly.getMainWorkspace();
  const initialBlocks = ["type_in_get_input"];
  // set up level
  clearToolbox(workspace);
  initialBlocks.forEach(blockType => {
  	createToolboxBlock(workspace, blockType, false);
  	//workspace.options.maxInstances = ;
  	workspace.options.maxInstances[blockType] = 1;
  });
  workspace.clear();

/*
  const varBlock = document.createElement("block");
  const varVal = document.createElement("value");
  const inputVal = document.createElement("value");
  const textInputBlock = document.createElement("block");
  const textBlock = document.createElement("block");
  const textField = document.createElement("field");

  textField.setAttribute("name", "TEXT");
  textBlock.setAttribute("type", "text");
  textInputBlock.setAttribute("type", "text_input");
  varBlock.setAttribute("type", "variables_set");
  varVal.setAttribute("name", "VALUE");
  inputVal.setAttribute("name", "TEXT");

  textField.appendChild(document.createTextNode("message to user"));
  textBlock.appendChild(textField)
  textInputBlock.appendChild(inputVal);
  varVal.appendChild(textInputBlock);
  inputVal.appendChild(textBlock);
  varBlock.appendChild(varVal);
*/
  const varBlock = createBlockWithType("variables_set");
  const textInputBlock = createBlockWithType("text_input");
  const textBlock = createBlockWithType("text");

  setToolboxBlockFieldValue(textBlock, "TEXT", "message to user");
  setToolboxBlockInputValue(textInputBlock, "TEXT", textBlock);
  setToolboxBlockInputValue(varBlock, "VALUE", textInputBlock);

  workspace.options.maxInstances["variables_set"] = 0;
  document.getElementById("toolbox").append(varBlock);
  workspace.updateToolbox(document.getElementById("toolbox"));

  workspace.setScale(1);
  refreshWorkspace(workspace);

  const toolboxBlocks = Array.from(document.querySelectorAll("rect"))
    .filter(x => x.getAttribute("fill-opacity"));
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

  // const citf = new CourseInstructionTaskFlow();
  citf.addTask(
    new CourseInstructionTask(
      () => {
        const text0 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT").toLowerCase().indexOf(" even ") !== -1);
        const textInput1 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text0);
        const variablesSet2 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === textInput1 && block.getField("VAR").getText() === "s");
      	return text0 && textInput1 && variablesSet2;
      },
      new HelpMessageDirection(() => {
      	return "OK, you know the drill; let's start by asking the user for a string and storing it in a variable.  This time, we'll be asking the user for a string with an even number of characters (> 0) so make sure even (surrounded by spaces) appears in your message.  Let's store the user's string in a variable s.  But this time, we'll make it more interesting: you'll drag in the block and type in the code!  Do you remember what you'll be typing, i.e., what appeared on the blocks, from previous exercises?  If not, use the blocks above as reference, and start typing it in accordingly.  Don't worry, we'll give you hints if you make a mistake.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Good, so let's start by creating a variable named firstCharacter to store the initial character of the string the user enters.  As before, we'll make it more interesting by typing in the code.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          const varSetBlock = createBlockWithType("variables_set");
          const varGetBlock = createBlockWithType("variables_get");
          const getCharacterNumberBlock = createBlockWithType("t2c_text_charat");
          const numBlock = createBlockWithType("math_number");

          setToolboxBlockFieldValue(numBlock, "NUM", 0);
          setToolboxBlockFieldValue(varGetBlock, "VAR", "textVariable"); 
          setToolboxBlockInputValue(getCharacterNumberBlock, "VALUE", varGetBlock);
          setToolboxBlockInputValue(getCharacterNumberBlock, "AT", numBlock);
          setToolboxBlockInputValue(varSetBlock, "VALUE", getCharacterNumberBlock);
          /*createToolboxBlock(workspace, "text_print");
          createToolboxBlock(workspace, "variables_get");
          workspace.options.maxInstances["text_print"] = 1;
          workspace.options.maxInstances["variables_get"] = 1;*/
          createToolboxBlock(workspace, "type_in_set_to_char_number_0");
          workspace.options.maxInstances["variables_set"] = 0;
          workspace.options.maxInstances["type_in_set_to_char_number_0"] = 1;
          document.getElementById("toolbox").append(varSetBlock);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat2 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") === variablesGet1 && block.getInputTargetBlock("AT") === mathNumber0);
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat2 && block.getField("VAR").getText() === "firstChar");
        const text4 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT").toLowerCase().indexOf(" even ") !== -1);
        const textInput5 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text4);
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet3 && block.getInputTargetBlock("VALUE") === textInput5 && block.getField("VAR").getText() === "s");
        return mathNumber0 && variablesGet1 && t2cTextCharat2 && variablesSet3 && text4 && textInput5 && variablesSet6;
      },
      new HelpMessageDirection(() => {
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstChar");
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "s");        

        if(variablesSet3 && variablesSet6 && variablesSet6.getPreviousBlock() === variablesSet3) {
          return "Make sure to attach the block storing the entered string's first character below the one storing the string itself.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what s is when trying get the string!";
        }

        if(variablesSet3 && variablesSet6 && variablesSet3.getPreviousBlock() !== variablesSet6) {
          return "Make sure to attach the block storing the entered string's first character below the one storing the string itself.";
        }

        return "Drag in the type-in-code block and enter the code needed to get and store the initial character of the entered string in the variable firstChar.  Be sure to attach this statement below the one declaring the variable to store the user's entered string.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Good, so now we'll define a variable named lastCharacter to store the last character of the string the user enters.  As before, you'll be typing in the code and as in the previous mission, remember that you don't know how many characters the string has so you'll be using " + T2C.MSG.currentLanguage["TERMINAL_LENGTH"] + " in your answer.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          const varSetBlock = createBlockWithType("variables_set");
          const varGetBlock = createBlockWithType("variables_get");
          const varGetBlockLen = createBlockWithType("variables_get");
          const getCharacterNumberBlock = createBlockWithType("t2c_text_charat");
          const numBlock = createBlockWithType("math_number");
          const arithmeticBlock = createBlockWithType("math_arithmetic_basic");
          const lengthBlock = createBlockWithType("t2c_text_length");

          setToolboxBlockFieldValue(numBlock, "NUM", 1);
          setToolboxBlockFieldValue(varGetBlock, "VAR", "textVariable");
          setToolboxBlockFieldValue(varGetBlockLen, "VAR", "textVariable"); 
          setToolboxBlockInputValue(getCharacterNumberBlock, "VALUE", varGetBlock);
          setToolboxBlockInputValue(getCharacterNumberBlock, "AT", arithmeticBlock);
          setToolboxBlockInputValue(arithmeticBlock, "A", lengthBlock);
          setToolboxBlockInputValue(lengthBlock, "VALUE", varGetBlockLen);
          setToolboxBlockInputValue(arithmeticBlock, "B", numBlock);
          setToolboxBlockFieldValue(arithmeticBlock, "OP", "MINUS"); 
          setToolboxBlockInputValue(varSetBlock, "VALUE", getCharacterNumberBlock);
          /*createToolboxBlock(workspace, "text_print");
          createToolboxBlock(workspace, "variables_get");
          workspace.options.maxInstances["text_print"] = 1;
          workspace.options.maxInstances["variables_get"] = 1;*/
          createToolboxBlock(workspace, "type_in_set_to_last_char");
          workspace.options.maxInstances["variables_set"] = 0;
          workspace.options.maxInstances["type_in_set_to_last_char"] = 1;
          document.getElementById("toolbox").append(varSetBlock);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextLength2 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic3 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") === t2cTextLength2 && block.getInputTargetBlock("B") === mathNumber0 && block.getFieldValue("OP") === "MINUS");
        // const variablesGet4 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat5 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathArithmeticBasic3);
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat5 && block.getField("VAR").getText() === "lastChar");
        const mathNumber7 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        // const variablesGet8 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat9 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathNumber7);
        const variablesSet10 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet6 && block.getInputTargetBlock("VALUE") === t2cTextCharat9 && block.getField("VAR").getText() === "firstChar");
        const text11 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput12 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text11);
        const variablesSet13 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet10 && block.getInputTargetBlock("VALUE") === textInput12 && block.getField("VAR").getText() === "s");
        // return mathNumber0 && variablesGet1 && t2cTextLength2 && mathArithmeticBasic3 && variablesGet4 && t2cTextCharat5 && variablesSet6 && mathNumber7 && variablesGet8 && t2cTextCharat9 && variablesSet10 && text11 && textInput12 && variablesSet13;
        return mathNumber0 && t2cTextLength2 && mathArithmeticBasic3 && t2cTextCharat5 && variablesSet6 && mathNumber7 && t2cTextCharat9 && variablesSet10 && text11 && textInput12 && variablesSet13;
      },
      new HelpMessageDirection(() => {
        const variablesSet6 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "lastChar");
        const variablesSet10 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstChar");
        const variablesSet13 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "s");

        if(variablesSet13 && variablesSet6 && variablesSet13.getPreviousBlock() === variablesSet6) {
          return "Make sure to attach the block storing the entered string's last character below the one storing the string itself.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what s is when trying get the string!";
        }

        if(variablesSet10 && variablesSet6 && variablesSet6.getPreviousBlock() !== variablesSet10) {
          return "Make sure to attach the block storing the entered string's last character below the one storing the string's first one.  Although it won't matter which we store first, we'll do it this way for the purposes of this exercise.";
        }

        return "Drag in the type-in-code block and enter the code needed to get and store the last character of the entered string in the variable lastChar.  Be sure to attach this statement below the one declaring the variable to store the entered string's first character.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Great, so enough review, it's time for something new!  We will need to get the middle two characters.  Just like the last character, this will require do some math on the length of the string to get the correct position numbers.  Let's start by getting just the *position* of the *2nd* middle character first.  We'll do the second first because the relationship between the length and the last position is easier to see.  And then we can use this number to get the position of the first middle character since it appears one place before the second.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          createToolboxBlock(workspace, "type_in_set_to_position_of_second_middle_char");
          workspace.options.maxInstances["type_in_set_to_position_of_second_middle_char"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        // const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength2 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic3 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") === mathNumber0 && block.getFieldValue("OP") === "DIVIDE");
        const variablesSet4 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === mathArithmeticBasic3 && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const mathNumber5 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet6 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength7 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic8 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" 
          && block.getInputTargetBlock("B") === mathNumber5 && block.getFieldValue("OP") === "MINUS");
        // const variablesGet9 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat10 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathArithmeticBasic8);
        const variablesSet11 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet4 && block.getInputTargetBlock("VALUE") === t2cTextCharat10 && block.getField("VAR").getText() === "lastChar");
        const mathNumber12 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        // const variablesGet13 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat14 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathNumber12);
        const variablesSet15 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet11 && block.getInputTargetBlock("VALUE") === t2cTextCharat14 && block.getField("VAR").getText() === "firstChar");
        const text16 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput17 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text16);
        const variablesSet18 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet15 && block.getInputTargetBlock("VALUE") === textInput17 && block.getField("VAR").getText() === "s");
        return mathNumber0 && mathArithmeticBasic3 && variablesSet4 && mathNumber5 && mathArithmeticBasic8 && t2cTextCharat10 && variablesSet11 && mathNumber12 && t2cTextCharat14 && variablesSet15 && text16 && textInput17 && variablesSet18;
      },
      new HelpMessageDirection(() => {
        const variablesSet4 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const variablesSet11 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "lastChar");
        const variablesSet18 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "s");
        const previousBlockName = variablesSet4 && variablesSet4.getPreviousBlock() && variablesSet4.getPreviousBlock().type === "variables_set"
          && variablesSet4.getPreviousBlock().getField("VAR").getText();
        const nextBlockName = variablesSet4 && variablesSet4.getNextBlock() && variablesSet4.getNextBlock().type === "variables_set"
          && variablesSet4.getNextBlock().getField("VAR").getText();

        if(variablesSet4 && variablesSet18 && variablesSet4.getNextBlock() === variablesSet18) {
          return "Make sure to attach the block storing the position of the string's second middle character below the one storing the string itself.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what s is when trying to get its length in the calculation of the its second middle character's position!";
        }

        if(variablesSet4 && (!previousBlockName || previousBlockName !== "lastChar")) {
          return "Make sure to attach this block storing the position of the second middle character below the last one you entered in which you store the last character in the variable lastChar.";
        }

        return "Drag in the type-in-code block, and enter the code needed to calculate the position of the second middle character of the entered string FROM the string's length and store it in the variable positionOfSecondMiddleChar.  Be sure to attach this statement below the one declaring the variable to store the entered string's last character.\nThis means you'll be using s.length and a math operation in your code.\nIf you're not sure what math operation and number to use, consider the following strings' lengths and second middle character positions: \nat       : 2 | 1\ncode     : 4 | 2\npizzas   : 6 | 3\nscrabble : 8 | 4";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Great again!  So now let's get the *position* of the first middle character.   Remember the first middle character appears *one place before* the second so what math operation can you use on the position of the second middle character to get the position of the first middle character?");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          createToolboxBlock(workspace, "type_in_set_to_position_of_first_middle_char");
          workspace.options.maxInstances["type_in_set_to_position_of_first_middle_char"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        //const mathNumber0 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const mathArithmeticBasic2 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") === variablesGet1 && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === mathArithmeticBasic2 && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        const mathNumber4 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        // const variablesGet5 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength6 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length"  && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic7 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") === mathNumber4 && block.getFieldValue("OP") === "DIVIDE");
        const variablesSet8 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet3 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic7 && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        // const mathNumber9 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet10 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength11 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic12 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        // const variablesGet13 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat14 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat")  && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathArithmeticBasic12);
        const variablesSet15 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet8 && block.getInputTargetBlock("VALUE") === t2cTextCharat14 && block.getField("VAR").getText() === "lastChar");
        const mathNumber16 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        // const variablesGet17 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat18 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathNumber16);
        const variablesSet19 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet15 && block.getInputTargetBlock("VALUE") === t2cTextCharat18 && block.getField("VAR").getText() === "firstChar");
        const text20 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput21 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text20);
        const variablesSet22 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet19 && block.getInputTargetBlock("VALUE") === textInput21 && block.getField("VAR").getText() === "s");
        return variablesGet1 && mathArithmeticBasic2 && variablesSet3 && mathNumber4 && mathArithmeticBasic7 && variablesSet8 && mathArithmeticBasic12 && t2cTextCharat14 && variablesSet15 && mathNumber16 && t2cTextCharat18 && variablesSet19 && text20 && textInput21 && variablesSet22;
      },
      new HelpMessageDirection(() => {
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        const variablesSet8 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const previousBlockName = variablesSet3 && variablesSet3.getPreviousBlock() && variablesSet3.getPreviousBlock().type === "variables_set"
          && variablesSet3.getPreviousBlock().getField("VAR").getText();
        const nextBlockName = variablesSet3 && variablesSet3.getNextBlock() && variablesSet3.getNextBlock().type === "variables_set"
          && variablesSet3.getNextBlock().getField("VAR").getText();

        if(variablesSet3 && variablesSet8 && variablesSet3.getNextBlock() === variablesSet8) {
          "Make sure to attach this block storing the position of the first middle character *below* the last one you entered in which you store the position of the second middle character in the variable positionOfSecondMiddleChar.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what positionOfSecondMiddleChar is when trying to calculate positionOfFirstMiddleChar, which uses it in the arithmetic operation!";
        }

        if(variablesSet3 && (!previousBlockName || previousBlockName !== "positionOfSecondMiddleChar")) {
          return "Make sure to attach this block storing the position of the first middle character below the last one you entered in which you store the position of the second middle character in the variable positionOfSecondMiddleChar.";
        }

        return "Drag in the type-in-code block, and enter the code needed to calculate the position of the first middle character of the entered string FROM the position of the second middle character and store it in the variable positionOfFirstMiddleChar.  Be sure to attach this statement below the one declaring the variable to store the position of the entered string's second middle character.\nThis means you'll be using positionOfFirstMiddleChar and a math operation in your code.\nIf you're not sure what math operation and number to use, consider the positions of the second middle characters and first characters of the following: \nat       : 1 | 0\ncode     : 2 | 1\npizzas   : 3 | 2\nscrabble : 4 | 3";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Excellent!  So now that we have the positions of the first and second middle characters, let's store the characters themselves, starting with the first middle one.");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          createToolboxBlock(workspace, "type_in_get_first_middle_char");
          workspace.options.maxInstances["type_in_get_first_middle_char"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        // const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat2 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === variablesGet0);
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat2 && block.getField("VAR").getText() === "firstMiddleChar");
        //const mathNumber4 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        const variablesGet5 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const mathArithmeticBasic6 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") === variablesGet5 && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        const variablesSet7 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet3 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic6 && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        const mathNumber8 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        // const variablesGet9 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength10 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic11 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") === mathNumber8 && block.getFieldValue("OP") === "DIVIDE");
        const variablesSet12 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet7 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic11 && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        // const mathNumber13 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet14 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        // const t2cTextLength15 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic16 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        // const variablesGet17 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat18 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathArithmeticBasic16);
        const variablesSet19 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet12 && block.getInputTargetBlock("VALUE") === t2cTextCharat18 && block.getField("VAR").getText() === "lastChar");
        const mathNumber20 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") == 0);
        // const variablesGet21 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat22 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathNumber20);
        const variablesSet23 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet19 && block.getInputTargetBlock("VALUE") === t2cTextCharat22 && block.getField("VAR").getText() === "firstChar");
        const text24 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput25 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text24);
        const variablesSet26 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet23 && block.getInputTargetBlock("VALUE") === textInput25 && block.getField("VAR").getText() === "s");
        return variablesGet0 && t2cTextCharat2 && variablesSet3 && variablesGet5 && mathArithmeticBasic6 && variablesSet7 && mathNumber8 && mathArithmeticBasic11 && variablesSet12 && mathArithmeticBasic16 && t2cTextCharat18 && variablesSet19 && mathNumber20 && t2cTextCharat22 && variablesSet23 && text24 && textInput25 && variablesSet26;
      },
      new HelpMessageDirection(() => {
        const variablesSet7 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstMiddleChar");
        const previousBlockName = variablesSet3 && variablesSet3.getPreviousBlock() && variablesSet3.getPreviousBlock().type === "variables_set"
          && variablesSet3.getPreviousBlock().getField("VAR").getText();
        const nextBlockName = variablesSet3 && variablesSet3.getNextBlock() && variablesSet3.getNextBlock().type === "variables_set"
          && variablesSet3.getNextBlock().getField("VAR").getText();

        if(variablesSet3 && variablesSet7 && variablesSet3.getNextBlock() === variablesSet7) {
          "Make sure to attach this block storing the first middle character *below* the last one you entered in which you store its position in the variable positionOfFirstMiddleChar.  Since instructions are run top to bottom, if you reversed the order, the computer wouldn't know what positionOfFirstMiddleChar is when trying to get the character at that position!";
        }

        if(variablesSet3 && (!previousBlockName || previousBlockName !== "positionOfFirstMiddleChar")) {
          return "Make sure to attach this block storing the first middle character below the last one you entered in which you store its position in the variable positionOfFirstMiddleChar.";
        }

        return "Drag in the type-in-code block and enter the code needed to get the first middle character of the entered string from its position and store it in the variable firstMiddleChar.  Be sure to attach this statement below the one declaring the variable to store the position of the entered string's first middle character.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  // SWITCH THE LANGUAGE TO INDUSTRY STANDARD LANGUAGE
/*
  citf.addTask(
    new CourseInstructionTask(
      () => document.getElementById("language").value === "js",
      new SeriesAnimations([
        new HelpMessageDirection(() => "Select JavaScript and then see what happens to the toolbox and blocks.", {
          startPosition: {
            x: document.getElementById("language").offsetLeft + document.getElementById("language").offsetWidth,
            y: document.getElementById("language").offsetTop + document.getElementById("language").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("language").offsetLeft + document.getElementById("language").offsetWidth/2,
            y: document.getElementById("language").offsetTop + document.getElementById("language").offsetHeight/2
          }
        })
      ])
    )
  );
*/

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => document.getElementById("language").value === "js" || document.getElementById("language").value === "py",
      {
        start: () => {
          const currentLanguage = document.getElementById("language").value;
          const switchLanguageMsg = (currentLanguage === "js" || currentLanguage === "py") ?
            "" : "But let's type this using pure JavaScript or Python.  Select JavaScript or Python and watch how the declaration for the firstMiddleChar translates for reference.";// + T2C.MSG.currentLanguage["TERMINAL_GETCHARACTERNUMBER"]
          alert("✔ Excellent x 2!  So now it's time to store the 2nd middle character.  " + switchLanguageMsg);
        },
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          createToolboxBlock(workspace, "type_in_get_second_middle_char");
          workspace.options.maxInstances["type_in_get_second_middle_char"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        // const variablesGet0 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        // const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat2 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") && block.getInputTargetBlock("AT").type === "variables_get" && block.getInputTargetBlock("AT").getField("VAR").getText() === "positionOfSecondMiddleChar");
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === null && block.getInputTargetBlock("VALUE") === t2cTextCharat2 && block.getField("VAR").getText() === "secondMiddleChar");
        const variablesGet4 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        // const variablesGet5 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat6 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === variablesGet4);
        const variablesSet7 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet3 && block.getInputTargetBlock("VALUE") === t2cTextCharat6 && block.getField("VAR").getText() === "firstMiddleChar");
        // const mathNumber8 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet9 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const mathArithmeticBasic10 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "variables_get" && block.getInputTargetBlock("A").getField("VAR").getText() === "positionOfSecondMiddleChar" && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        const variablesSet11 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet7 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic10 && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        const mathNumber12 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        // const variablesGet13 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength14 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic15 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") === mathNumber12 && block.getFieldValue("OP") === "DIVIDE");
        const variablesSet16 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet11 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic15 && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        // const mathNumber17 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet18 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        // const t2cTextLength19 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //   && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic20 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        // const variablesGet21 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat22 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathArithmeticBasic20);
        const variablesSet23 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet16 && block.getInputTargetBlock("VALUE") === t2cTextCharat22 && block.getField("VAR").getText() === "lastChar");
        const mathNumber24 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        // const variablesGet25 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat26 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathNumber24);
        const variablesSet27 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet23 && block.getInputTargetBlock("VALUE") === t2cTextCharat26 && block.getField("VAR").getText() === "firstChar");
        const text28 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput29 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text28);
        const variablesSet30 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet27 && block.getInputTargetBlock("VALUE") === textInput29 && block.getField("VAR").getText() === "s");
        return t2cTextCharat2 && variablesSet3 && variablesGet4 && t2cTextCharat6 && variablesSet7 && mathArithmeticBasic10 && variablesSet11 && mathNumber12 && mathArithmeticBasic15 && variablesSet16 && mathArithmeticBasic20 && t2cTextCharat22 && variablesSet23 && mathNumber24 && t2cTextCharat26 && variablesSet27 && text28 && textInput29 && variablesSet30;
      },
      new HelpMessageDirection(() => {
        const variablesSet3 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "secondMiddleChar");
        // const variablesSet7 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "firstMiddleChar");
        // const variablesSet16 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const previousBlockName = variablesSet3 && variablesSet3.getPreviousBlock() && variablesSet3.getPreviousBlock().type === "variables_set"
          && variablesSet3.getPreviousBlock().getField("VAR").getText();
        const nextBlockName = variablesSet3 && variablesSet3.getNextBlock() && variablesSet3.getNextBlock().type === "variables_set"
          && variablesSet3.getNextBlock().getField("VAR").getText();

        if(variablesSet3 && (!previousBlockName || previousBlockName !== "firstMiddleChar")) {
          return "Make sure to attach this block storing the second middle character below the last one you entered in which you store the user's first middle character in the variable firstMiddleChar.";
        }

        return "Drag in the type-in-code block and enter the code needed to get the second middle character of the entered string from its position and store it in the variable secondMiddleChar.  Do this in " + T2C.MSG.currentLanguage.LANGUAGE_NAME + " by adapting the code from the last blocks assembled to get the first middle character.  Be sure to attach this statement below the one declaring the variable to store the entered string's first middle character.";
      }, {
        startPosition:getAbsolutePosition(workspace, null, {}, 50, document.getElementById("top-header").offsetHeight + 50)
      })
    )
  );

  //addRunTask(citf);
  //addMoveAndFlashTask(citf, document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          // moveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          alert("✔ Excellent x 3!  So now for the grand finale: we need to put all of these characters together and display them on one line.  Do you remember how to do that?  Also, let's include the full string the user enters at the beginning because our users can be forgetful!\n  So for an input of SCRABBLE, we'd want the output to be as follows: \nSCRABBLE: SEAB");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          createToolboxBlock(workspace, "type_in_combine_first_last_middle2_chars");
          workspace.options.maxInstances["type_in_combine_first_last_middle2_chars"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => {
        const variablesGet0 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "secondMiddleChar");
        const variablesGet1 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstMiddleChar");
        const t2cTextJoin2 = workspace.getAllBlocks().find(block => block.type === "t2c_text_join" && block.getInputTargetBlock("A") === variablesGet1 && block.getInputTargetBlock("B") === variablesGet0);
        const variablesGet3 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "lastChar");
        const t2cTextJoin4 = workspace.getAllBlocks().find(block => block.type === "t2c_text_join" && block.getInputTargetBlock("A") === variablesGet3 && block.getInputTargetBlock("B") === t2cTextJoin2);
        const variablesGet5 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "firstChar");
        const t2cTextJoin6 = workspace.getAllBlocks().find(block => block.type === "t2c_text_join" && block.getInputTargetBlock("A") === variablesGet5 && block.getInputTargetBlock("B") === t2cTextJoin4);
        const text7 = workspace.getAllBlocks().find(block => block.type === "text" && block.getFieldValue("TEXT") === ": ");
        const t2cTextJoin8 = workspace.getAllBlocks().find(block => block.type === "t2c_text_join" && block.getInputTargetBlock("A") === text7 && block.getInputTargetBlock("B") === t2cTextJoin6);
        // const variablesGet9 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextJoin10 = workspace.getAllBlocks().find(block => block.type === "t2c_text_join" && block.getInputTargetBlock("A") 
          && block.getInputTargetBlock("A").type === "variables_get" && block.getInputTargetBlock("A").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") === t2cTextJoin8);
        const textPrint11 = workspace.getAllBlocks().find(block => (block.type === "text_print" || block.type === "js_text_print") && block.getNextBlock() === null && block.getInputTargetBlock("TEXT") === t2cTextJoin10);
        // const variablesGet12 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        // const variablesGet13 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat14 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") && block.getInputTargetBlock("AT").type === "variables_get" && block.getInputTargetBlock("AT").getField("VAR").getText() === "positionOfSecondMiddleChar");
        const variablesSet15 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint11 && block.getInputTargetBlock("VALUE") === t2cTextCharat14 && block.getField("VAR").getText() === "secondMiddleChar");
        const variablesGet16 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        // const variablesGet17 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat18 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === variablesGet16);
        const variablesSet19 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet15 && block.getInputTargetBlock("VALUE") === t2cTextCharat18 && block.getField("VAR").getText() === "firstMiddleChar");
        // const mathNumber20 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet21 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        const mathArithmeticBasic22 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "variables_get" && block.getInputTargetBlock("A").getField("VAR").getText() === "positionOfSecondMiddleChar" && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        const variablesSet23 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet19 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic22 && block.getField("VAR").getText() === "positionOfFirstMiddleChar");
        const mathNumber24 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 2);
        // const variablesGet25 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        //const t2cTextLength26 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //  && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic27 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") === mathNumber24 && block.getFieldValue("OP") === "DIVIDE");
        const variablesSet28 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet23 && block.getInputTargetBlock("VALUE") === mathArithmeticBasic27 && block.getField("VAR").getText() === "positionOfSecondMiddleChar");
        // const mathNumber29 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 1);
        // const variablesGet30 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        // const t2cTextLength31 = workspace.getAllBlocks().find(block => block.type === "t2c_text_length" && block.getInputTargetBlock("VALUE") 
        //   && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s");
        const mathArithmeticBasic32 = workspace.getAllBlocks().find(block => block.type === "math_arithmetic_basic" && block.getInputTargetBlock("A") && block.getInputTargetBlock("A").type === "t2c_text_length" 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("A").getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("B") && block.getInputTargetBlock("B").type === "math_number" && block.getInputTargetBlock("B").getFieldValue("NUM") === 1 && block.getFieldValue("OP") === "MINUS");
        // const variablesGet33 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat34 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathArithmeticBasic32);
        const variablesSet35 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet28 && block.getInputTargetBlock("VALUE") === t2cTextCharat34 && block.getField("VAR").getText() === "lastChar");
        const mathNumber36 = workspace.getAllBlocks().find(block => block.type === "math_number" && block.getFieldValue("NUM") === 0);
        // const variablesGet37 = workspace.getAllBlocks().find(block => block.type === "variables_get" && block.getField("VAR").getText() === "s");
        const t2cTextCharat38 = workspace.getAllBlocks().find(block => (block.type === "t2c_text_charat" || block.type === "js_text_charat") && block.getInputTargetBlock("VALUE") 
          && block.getInputTargetBlock("VALUE").type === "variables_get" && block.getInputTargetBlock("VALUE").getField("VAR").getText() === "s" && block.getInputTargetBlock("AT") === mathNumber36);
        const variablesSet39 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet35 && block.getInputTargetBlock("VALUE") === t2cTextCharat38 && block.getField("VAR").getText() === "firstChar");
        const text40 = workspace.getAllBlocks().find(block => block.type === "text");
        const textInput41 = workspace.getAllBlocks().find(block => (block.type === "text_input" || block.type === "js_text_input") && block.getInputTargetBlock("TEXT") === text40);
        const variablesSet42 = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === variablesSet39 && block.getInputTargetBlock("VALUE") === textInput41 && block.getField("VAR").getText() === "s");
        return variablesGet0 && variablesGet1 && t2cTextJoin2 && variablesGet3 && t2cTextJoin4 && variablesGet5 && t2cTextJoin6 && text7 && t2cTextJoin8 && t2cTextJoin10 && textPrint11 && t2cTextCharat14 && variablesSet15 && variablesGet16 && t2cTextCharat18 && variablesSet19 && mathArithmeticBasic22 && variablesSet23 && mathNumber24 && mathArithmeticBasic27 && variablesSet28 && mathArithmeticBasic32 && t2cTextCharat34 && variablesSet35 && mathNumber36 && t2cTextCharat38 && variablesSet39 && text40 && textInput41 && variablesSet42;
      },
      new HelpMessageDirection(() => {
        const textPrint = workspace.getAllBlocks().find(block => block.type === "text_print" || block.type === "js_text_print");
        const variablesSet = workspace.getAllBlocks().find(block => block.type === "variables_set" && block.getNextBlock() === textPrint && block.getField("VAR").getText() === "secondMiddleChar");
        const previousBlockName = textPrint && textPrint.getPreviousBlock() && textPrint.getPreviousBlock().type === "variables_set"
          && textPrint.getPreviousBlock().getField("VAR").getText();
        const nextBlockName = textPrint && textPrint.getNextBlock() && textPrint.getNextBlock().type === "variables_set"
          && textPrint.getNextBlock().getField("VAR").getText();

        if(textPrint && !previousBlockName) {
          return "Make sure to attach this block displaying the entered string and its first, last, and first and second middle characters below the last one you entered in which you store the user's second middle character in the variable secondMiddleChar.";
        }

        if(nextBlockName) {
          return "Make sure to attach this block displaying the entered string and its first, last, and first and second middle characters below the last one you entered in which you store the user's second middle character in the variable secondMiddleChar.  Since instructions are run top to bottom, if you place this before the block you did, the computer wouldn't know what " + (nextBlockName.startsWith("positionOf") ? nextBlockName.substring(10) : nextBlockName) + " means!";
        }

        return "Drag in the type-in-code block and place it below the block that stores the second character in a variable.  Enter code to display the user entered string, followed by the string literal \": \" followed by its first character, then its last character, then its first middle character, and finally its second middle character.\n  So for an input of SCRABBLE, we'd want the output to be as follows: \nSCRABBLE: SEAB";
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
          alert("✔✔✔ Congratulations!  You just completed the challenging Mission 3!  Take a moment to bask in your accomplishments!  Not only did you solve the problem yourself, you also proved to be an excellent teacher!  You managed to explain to the computer how it could solve the problem as well in a language it could understand.  This meant you were also perfect in your grammar, spelling everything correctly and placing every parenthesis and period where it needed to go, making your English teachers proud!\nIn Mission 4, we'll introduce a new block that'll allow you to get *all* the characters from a starting position to an ending one (rather than just getting one character at a time).  We'll then use this block to display a string with its initial character removed.  Until next time!");
          //overcame the obstacle of the necessity of perfection when typing in code, making your English teachers proud of your grammar precision");
          restoreAfterMoveAndFlashText(document.getElementById("output-container").querySelectorAll(".table-cell")[0]);
          hideOutputAndCodeContainers();
          clearToolbox(workspace);
          createToolboxBlock(workspace, "code_statement");
          workspace.options.maxInstances["code_statement"] = 1;
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );
  return citf;
};
//  citf.runTasks();
// });