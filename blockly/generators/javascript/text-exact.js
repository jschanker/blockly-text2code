/**
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *            &
 * Copyright 2018 Text2Code Authors
 * https://github.com/jschanker/blockly-text2code
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 /**
 * @fileoverview Generating JavaScript for text blocks.
 * @author (Initial Block Function Definitions) fraser@google.com (Neil Fraser)
 *         (All Other Code/Modifications to Block Definitions) Jason Schanker
 */

'use strict';

(function() {
  var realSubstring = String.prototype.substring;
  String.prototype.substring = function(indexStart, indexEnd) {
    if(typeof indexStart !== "number") throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks was not a number; it was " + indexStart);
    if(typeof indexEnd !== "number" && typeof indexEnd !== "undefined") throw new Error("The ending position of one of the substring/getTextFromPositionNUMBER blocks was not a number; it was " + indexEnd);
    else if(indexStart < 0) throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks is a negative number; it was " + indexStart);
    else if(indexStart > this.length) throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks is at least the length of the string; it was " + indexStart);
    else if(indexEnd > this.length) throw new Error("The ending position of one of the substring/getTextFromPositionNUMBER blocks exceeds the length of the string; it was " + indexEnd);
    else if(indexStart > indexEnd) throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks (" + indexStart + ") exceeds the ending position (" + indexEnd + ")");
    else if(isNaN(indexStart)) throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks evaluates to NaN (not a number).  This could happen if you for example, multiplied a string by a number.");
    else if(typeof indexEnd !== "undefined" && isNaN(indexEnd)) throw new Error("The ending position of one of the substring/getTextFromPositionNUMBER blocks evaluates to NaN (not a number).  This could happen if you for example, multiplied a string by a number.");
    else return realSubstring.apply(this, arguments);
  }
  Number.prototype.substring = function() {
    throw new Error("You tried to call substring/getTextFromPositionNUMBER on a number " + this.toString());
  }
  var realIndexOf = String.prototype.indexOf;
  String.prototype.indexOf = function(searchValue, fromIndex) {
    if(typeof searchValue !== "string") throw new Error("The item you're searching for for one of the indexOf/positionNumberOfTEXT blocks is not text; it's " + searchValue)
    else return realIndexOf.apply(this, arguments);
  }
  Number.prototype.indexOf = function() {
    throw new Error("You tried to call indexOf/positionNumberOfTEXT on a number " + this.toString());
  }
  var realCharAt = String.prototype.charAt;
  String.prototype.charAt = function(index) {
    if(typeof index !== "number") throw new Error("The position you supplied to a charAt/getCharacterNUMBER block is not a number; it's " + index);
    else if(index < 0) throw new Error("The starting position of one of the charAt/getCharacterNUMBER blocks is a negative number; it was " + index);
    else if(index >= this.length) throw new Error("The starting position of one of the charAt/getCharacterNUMBER blocks is at least the length of the string; it was " + index);
    else if(isNaN(index)) throw new Error("The starting position of one of the charAt/getCharacterNUMBER blocks evaluates to NaN (not a number).  This could happen if you for example, multiplied a string by a number.");
    else return realCharAt.apply(this, arguments);
  }
  Number.prototype.charAt = function() {
    throw new Error("You tried to call charAt/getCharacterNUMBER on a number " + this.toString());
  }  
})();

function beforeSubstring(str, substr) {
  var endIndex = str.indexOf(substr);
  return endIndex >= 0 ? str.substring(0, endIndex) : str;
}

function beforeLastSubstring(str, substr) {
  var endIndex = str.lastIndexOf(substr);
  return endIndex >= 0 ? str.substring(0, endIndex) : str;
}

function afterSubstring(str, substr) {
  return str.substring(str.indexOf(substr) + substr.length);
}

var display = function() {
  console.log.apply(console, arguments);
};
var getInputByAsking = prompt;
String.prototype.plus = function(y) { return this + y;};
String.prototype.toNumber = function() { return parseFloat(this); };
String.prototype.getBeforeTEXT = function(substr) { return beforeSubstring(this, substr); };
String.prototype.getAfterTEXT = function(substr) { return afterSubstring(this, substr); };
String.prototype.positionNumberOfTEXT = function(substr) { return this.indexOf(substr); };
String.prototype.lastPositionNumberOfTEXT = function(substr) { return this.lastIndexOf(substr); };
String.prototype.getCharacterNUMBER = function(position) { return this.charAt(position); };
String.prototype.getTextFromPositionNUMBER = function(startPos) {
  var that = this;
  return {
    toPositionNUMBER: function(endPos) {
      return that.substring(startPos,endPos);
    }
  }; 
};

if(document.getElementById("consoleDisplay")) {
  if(!console) console = {};
  console.log = function() {
    document.getElementById("consoleDisplay").appendChild(
        document.createTextNode(Array.prototype.join.call(arguments, " ") + "\n"));
  };
}

(function() {
  var printCode = function(funcName, block) {
    // Print statement.
    var msg = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    return funcName + '(' + msg + ');\n';  	
  };
  Blockly.JavaScript['js_text_print'] = printCode.bind(null, 'console.log');
  Blockly.JavaScript['text_print'] = printCode.bind(null, 'display');

  var promptCode = function(funcName, block) {
    // Prompt user for input.
    var msg = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var code = funcName + '(' + msg + ');\n';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_input'] = promptCode.bind(null, 'prompt');
  Blockly.JavaScript['text_input'] = promptCode.bind(null, 'getInputByAsking');

  Blockly.JavaScript['t2c_text_join'] = function(block) {
    var argument0 = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.JavaScript.valueToCode(block, 'B', Blockly.JavaScript.ORDER_NONE) || '\'\'';
    return [argument0 + " + " + argument1, Blockly.JavaScript.ORDER_ADDITION];
  };

  var indexOfCode = function(funcName, block) {
    // Search the text for a substring.
    var substring = Blockly.JavaScript.valueToCode(block, 'FIND',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var code = text + '.' + funcName + '(' + substring + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_indexof'] = indexOfCode.bind(null, 'indexOf');
  Blockly.JavaScript['t2c_text_indexof'] = indexOfCode.bind(null, 'positionNumberOfTEXT');

  var charAtCode = function(funcName, block) {
    // Get letter at index.
    var at = Blockly.JavaScript.valueToCode(block, 'AT',
        Blockly.JavaScript.ORDER_NONE);
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var code = text + '.' + funcName + '(' + at + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_charat'] = charAtCode.bind(null, 'charAt');
  Blockly.JavaScript['t2c_text_charat'] = charAtCode.bind(null, 'getCharacterNUMBER');

  Blockly.JavaScript['js_text_getsubstring'] = function(block) {
    // Get substring.
    var text = Blockly.JavaScript.valueToCode(block, 'STRING',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var at1 = Blockly.JavaScript.valueToCode(block, 'AT1');
    var at2 = Blockly.JavaScript.valueToCode(block, 'AT2');
  
    var code = text + '.substring(' + at1 + ', ' + at2 + ')';

    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['t2c_text_getsubstring'] = function(block) {
    // Get substring.
    var text = Blockly.JavaScript.valueToCode(block, 'STRING',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var at1 = Blockly.JavaScript.valueToCode(block, 'AT1');
    var at2 = Blockly.JavaScript.valueToCode(block, 'AT2');
  
    var code = text + '.getTextFromPositionNUMBER(' + at1 + ').toPositionNUMBER(' + at2 + ')';

    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  var getBeforeAfterCode = function(funcName, block) {
    // Get text appearing before or after.
    var sub = Blockly.JavaScript.valueToCode(block, 'SUB',
        Blockly.JavaScript.ORDER_NONE);
    var text = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var code = text + '.' + funcName + '(' + sub + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['t2c_text_after'] = getBeforeAfterCode.bind(null, 'getAfterTEXT');
  Blockly.JavaScript['t2c_text_before'] = getBeforeAfterCode.bind(null, 'getBeforeTEXT');  
})();