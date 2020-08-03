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
  window.प्रिंट_करें = window.display = function() {
    console.log.apply(console, arguments);
  };

  window.पूछकर_इनपुट_पाएँ = window.getInputByAsking = window.prompt;
  String.prototype.plus = function(y) { return this + y;};
  String.prototype.toNumber = function() { return parseFloat(this); };
  String.prototype.getBeforeTEXT = function(substr) { return beforeSubstring(this, substr); };
  String.prototype.getAfterTEXT = function(substr) { return afterSubstring(this, substr); };

  String.prototype.positionNumberOfTEXT = function(substr) { return this.indexOf(substr); };
  String.prototype.के_पाठ_में = function(substr){
    var that = this;
    return {
      के_स्थिति_संख्या: that.indexOf(substr)
    };
  };

  String.prototype.lastPositionNumberOfTEXT = function(substr) { return this.lastIndexOf(substr); };
  String.prototype.वर्ण_संख्या_पाएँ = String.prototype.getCharacterNUMBER = function(position) { return this.charAt(position); };
  String.prototype.getTextFromPositionNUMBER = function(startPos) {
    var that = this;
    return {
      toPositionNUMBER: function(endPos) {
        return that.substring(startPos,endPos);
      }
    }; 
  };

  String.prototype.पाठ_की_स्थिति_संख्या = function(startPos) {
    var that = this;
    return {
      से_स्थिति_संख्या: function(endPos) {
        return {
          तक_पाएँ: that.substring(startPos,endPos)
        };
      }
    };
  };

  Object.defineProperty(String.prototype, 'लंबाई', {
    get: function () {
      return this.length;
    }
  });

  window.beforeSubstring = function(str, substr) {
    var endIndex = str.indexOf(substr);
    return endIndex >= 0 ? str.substring(0, endIndex) : str;
  };

  window.beforeLastSubstring = function(str, substr) {
    var endIndex = str.lastIndexOf(substr);
    return endIndex >= 0 ? str.substring(0, endIndex) : str;
  };

  window.afterSubstring = function(str, substr) {
    return str.substring(str.indexOf(substr) + substr.length);
  };
})();

/*
if(document.getElementById("consoleDisplay")) {
  if(!console) console = {};
  console.realLog = console.log; // keep reference to actual log for debugging purposes
  console.log = function() {
    document.getElementById("consoleDisplay").appendChild(
        document.createTextNode(Array.prototype.join.call(arguments, " ") + "\n"));
  };
}
*/

(function() {
  var printCode = function(funcName, block) {
    // Print statement.
    var msg = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '""';
    return funcName + '(' + msg + ');\n';   
  };
  Blockly.JavaScript['js_text_print'] = printCode.bind(null, 'console.log');
  Blockly.JavaScript['text_print'] = function(block) {
    return printCode(T2C.MSG.currentLanguage['TEXT_PRINT_TITLE']
      .substring(0, T2C.MSG.currentLanguage['TEXT_PRINT_TITLE'].indexOf("(")), block);
  };
  Blockly.Python['js_text_print'] = Blockly.Python['text_print']; 

  var promptCode = function(funcName, block) {
    // Prompt user for input.
    var msg = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '""';
    var code = funcName + '(' + msg + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_input'] = promptCode.bind(null, 'prompt');
  Blockly.JavaScript['text_input'] = function(block) {
    return promptCode(T2C.MSG.currentLanguage['TEXT_INPUT_TITLE']
      .substring(0, T2C.MSG.currentLanguage['TEXT_INPUT_TITLE'].indexOf("(")), block);
  }
  //Blockly.Python['js_text_input'] = Blockly.Python['text_input'] = Blockly.Python['text_prompt'];
  Blockly.Python['js_text_input'] = Blockly.Python['text_input'] = function(block) {
    // Prompt user for input.
    var msg = Blockly.Python.valueToCode(block, 'TEXT',
        Blockly.Python.ORDER_NONE) || '\'\'';
    var code = T2C.MSG.PY["TEXT_INPUT_TITLE"].replace("%1", msg);
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];    
  };

  Blockly.JavaScript['t2c_text_join'] = function(block) {
    var argument0 = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_NONE) || '""';
    var argument1 = Blockly.JavaScript.valueToCode(block, 'B', Blockly.JavaScript.ORDER_NONE) || '""';
    return [argument0 + " + " + argument1, Blockly.JavaScript.ORDER_ADDITION];
  };
  // Blockly.Python['t2c_text_join'] = Blockly.Python['text_join'];
  Blockly.Python['t2c_text_join'] =  function(block) {
    var argument0 = Blockly.Python.valueToCode(block, 'A', Blockly.Python.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.Python.valueToCode(block, 'B', Blockly.Python.ORDER_NONE) || '\'\'';
    return [argument0 + " + " + argument1, Blockly.Python.ORDER_ADDITIVE];
  };

  var indexOfCode = function(funcName, block) {
    // Search the text for a substring.
    var substring = Blockly.JavaScript.valueToCode(block, 'FIND',
        Blockly.JavaScript.ORDER_NONE) || '""';
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
        Blockly.JavaScript.ORDER_MEMBER) || '""';
    var code = text + '.' + funcName + '(' + substring + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_indexof'] = indexOfCode.bind(null, 'indexOf');
  //Blockly.JavaScript['t2c_text_indexof'] = indexOfCode.bind(null, 'positionNumberOfTEXT');
  Blockly.JavaScript['t2c_text_indexof'] = function(block) {
    // Get substring.
    var substring = Blockly.JavaScript.valueToCode(block, 'FIND',
        Blockly.JavaScript.ORDER_NONE) || '""';
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
        Blockly.JavaScript.ORDER_MEMBER) || '""';
    var code = T2C.MSG.currentLanguage['TEXT_T2C_INDEXOF_TITLE']
      .replace("%1", text).replace("%2", substring);

    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };
  //Blockly.Python['js_text_indexof'] = Blockly.Python['t2c_text_indexof'] = Blockly.Python['text_indexOf'];
  Blockly.Python['js_text_indexof'] = Blockly.Python['t2c_text_indexof'] = function(block) {
    // Get substring.
    var substring = Blockly.Python.valueToCode(block, 'FIND',
        Blockly.Python.ORDER_NONE) || '""';
    var text = Blockly.Python.valueToCode(block, 'VALUE',
        Blockly.Python.ORDER_MEMBER) || '""';
    var code = T2C.MSG.currentLanguage['TEXT_T2C_INDEXOF_TITLE']
      .replace("%1", text).replace("%2", substring);

    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  var charAtCode = function(funcName, block) {
    // Get letter at index.
    var at = Blockly.JavaScript.valueToCode(block, 'AT',
        Blockly.JavaScript.ORDER_NONE);
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
        Blockly.JavaScript.ORDER_MEMBER) || '""';
    var code = text + '.' + funcName + '(' + at + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_charat'] = charAtCode.bind(null, 'charAt');
  //Blockly.JavaScript['t2c_text_charat'] = charAtCode.bind(null, 'getCharacterNUMBER');
  Blockly.JavaScript['t2c_text_charat'] = function(block) {
    return charAtCode(T2C.MSG.currentLanguage['TEXT_T2C_CHARAT_TITLE']
      .substring(3, T2C.MSG.currentLanguage['TEXT_T2C_CHARAT_TITLE'].indexOf("(")), block);
  };
  // Blockly.Python['t2c_text_charat'] = Blockly.Python['js_text_charat'] = Blockly.Python['text_charAt'];
  Blockly.Python['t2c_text_charat'] = Blockly.Python['js_text_charat'] = function(block) {
    // Get letter at index.
    var at = Blockly.Python.valueToCode(block, 'AT',
        Blockly.Python.ORDER_NONE);
    var text = Blockly.Python.valueToCode(block, 'VALUE',
        Blockly.Python.ORDER_MEMBER) || '""';
    var code = T2C.MSG.PY["TEXT_T2C_CHARAT_TITLE"]
      .replace("%1", text).replace("%2", at);
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['t2c_text_length'] = function(block) {
  // String or array length.
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
      Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    return [T2C.MSG.currentLanguage['TEXT_T2C_LENGTH_TITLE'].replace("%1", text), Blockly.JavaScript.ORDER_MEMBER];
  };

  Blockly.Python['t2c_text_length'] = Blockly.Python['text_length'];

  Blockly.JavaScript['js_text_getsubstring'] = function(block) {
    // Get substring.
    var text = Blockly.JavaScript.valueToCode(block, 'STRING',
        Blockly.JavaScript.ORDER_MEMBER) || '""';
    var at1 = Blockly.JavaScript.valueToCode(block, 'AT1',
      Blockly.JavaScript.ORDER_NONE);
    var at2 = Blockly.JavaScript.valueToCode(block, 'AT2',
      Blockly.JavaScript.ORDER_NONE);
  
    var code = text + '.substring(' + at1 + ', ' + at2 + ')';

    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['t2c_text_getsubstring'] = function(block) {
    // Get substring.
    var text = Blockly.JavaScript.valueToCode(block, 'STRING',
        Blockly.JavaScript.ORDER_MEMBER) || '""';
    var at1 = Blockly.JavaScript.valueToCode(block, 'AT1',
      Blockly.JavaScript.ORDER_NONE);
    var at2 = Blockly.JavaScript.valueToCode(block, 'AT2',
      Blockly.JavaScript.ORDER_NONE);
    var code = T2C.MSG.currentLanguage['TEXT_T2C_GET_SUBSTRING_TITLE']
      .replace("%1", text).replace("%2", at1).replace("%3", at2);
  
    //var code = text + '.getTextFromPositionNUMBER(' + at1 + ').toPositionNUMBER(' + at2 + ')';

    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  // Blockly.Python['t2c_text_getsubstring'] = Blockly.Python['js_text_getsubstring'] = Blockly.Python['text_getSubstring'];

  Blockly.Python['t2c_text_getsubstring'] = function(block) {
    // Get substring.
    var text = Blockly.Python.valueToCode(block, 'STRING',
        Blockly.Python.ORDER_MEMBER) || '""';
    var at1 = Blockly.Python.valueToCode(block, 'AT1',
      Blockly.Python.ORDER_NONE);
    var at2 = Blockly.Python.valueToCode(block, 'AT2',
      Blockly.Python.ORDER_NONE);
    var code = T2C.MSG.currentLanguage['TEXT_T2C_GET_SUBSTRING_TITLE']
      .replace("%1", text).replace("%2", at1).replace("%3", at2);
  
    //var code = text + '.getTextFromPositionNUMBER(' + at1 + ').toPositionNUMBER(' + at2 + ')';

    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  var getBeforeAfterCode = function(funcName, block) {
    // Get text appearing before or after.
    var sub = Blockly.JavaScript.valueToCode(block, 'SUB',
        Blockly.JavaScript.ORDER_NONE);
    var text = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_MEMBER) || '""';
    var code = text + '.' + funcName + '(' + sub + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['t2c_text_after'] = getBeforeAfterCode.bind(null, 'getAfterTEXT');
  Blockly.JavaScript['t2c_text_before'] = getBeforeAfterCode.bind(null, 'getBeforeTEXT');  
})();