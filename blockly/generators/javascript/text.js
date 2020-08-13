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
String.prototype.positionNumberOfTEXT = function(substr) { return this.indexOf(substr) + 1; };
String.prototype.lastPositionNumberOfTEXT = function(substr) { return this.lastIndexOf(substr) + 1; };
String.prototype.getCharacterNUMBER = function(position) { return this.charAt(position-1); };
String.prototype.getTextFromPositionNUMBER = function(startPos) {
  var that = this;
  return {
    toPositionNUMBER: function(endPos) {
      return that.substring(startPos-1,endPos);
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
  Blockly.Python['js_text_print'] = Blockly.Python['text_print']; 

  var promptCode = function(funcName, block) {
    // Prompt user for input.
    var msg = Blockly.JavaScript.valueToCode(block, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var code = funcName + '(' + msg + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_input'] = promptCode.bind(null, 'prompt');
  Blockly.JavaScript['text_input'] = promptCode.bind(null, 'getInputByAsking');
  //Blockly.Python['js_text_input'] = Blockly.Python['text_input'] = Blockly.Python['text_prompt'];
  Blockly.Python['js_text_input'] = Blockly.Python['text_input'] = function(block) {
    // Prompt user for input.
    var msg = Blockly.Python.valueToCode(block, 'TEXT',
        Blockly.Python.ORDER_NONE) || '\'\'';
    var code = T2C.MSG.PY["TEXT_INPUT_TITLE"].replace("%1", msg);
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];    
  };

  Blockly.JavaScript['t2c_text_join'] = function(block) {
    var argument0 = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.JavaScript.valueToCode(block, 'B', Blockly.JavaScript.ORDER_NONE) || '\'\'';
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
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var text = Blockly.JavaScript.valueToCode(block, 'VALUE',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var code = text + '.' + funcName + '(' + substring + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_indexof'] = indexOfCode.bind(null, 'indexOf');
  Blockly.JavaScript['t2c_text_indexof'] = indexOfCode.bind(null, 'positionNumberOfTEXT');
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
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var code = text + '.' + funcName + '(' + at + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['js_text_charat'] = charAtCode.bind(null, 'charAt');
  Blockly.JavaScript['t2c_text_charat'] = charAtCode.bind(null, 'getCharacterNUMBER');
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

  // Blockly.Python['t2c_text_getsubstring'] = Blockly.Python['js_text_getsubstring'] = Blockly.Python['text_getSubstring'];

  Blockly.Python['t2c_text_getsubstring'] = Blockly.Python['js_text_getsubstring'] = function(block) {
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
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    var code = text + '.' + funcName + '(' + sub + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  };

  Blockly.JavaScript['t2c_text_after'] = getBeforeAfterCode.bind(null, 'getAfterTEXT');
  Blockly.JavaScript['t2c_text_before'] = getBeforeAfterCode.bind(null, 'getBeforeTEXT');  
})();