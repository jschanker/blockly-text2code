/**
 * @license
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
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
 * @fileoverview Generating JavaScript for variable blocks.
 * @author fraser@google.com (Neil Fraser)
 * Modified by Jason Schanker to allow variable names in Devanagari script
 */
'use strict';

function getValidVariableName(variableName) {
  var varName = variableName.replace(/[^\w\$ऀ-ॣ०-९ॱ-ॿ]/g, "_");
  return varName[0].replace(/[^_\\$|A-Z|a-z|ऄ-ह|ऽ|ॐ|क़-ॡ|ॱ-ॿ]/, "_") + varName.substring(1);	
}

Blockly.JavaScript['variables_get'] = function(block) {
  // NOTE: May be potential duplication of different variable names after transformation (e.g., a_b and a@b)
  // Variable getter.
  //  var code = Blockly.JavaScript.variableDB_.getName(block.getFieldValue('VAR'),
  //      Blockly.VARIABLE_CATEGORY_NAME);
  var code = getValidVariableName(block.getFieldValue('VAR'));
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['variables_set'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.JavaScript.valueToCode(block, 'VALUE',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  //var varName = Blockly.JavaScript.variableDB_.getName(
  //    block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var varName = getValidVariableName(block.getFieldValue('VAR'));
  return 'let ' + varName + ' = ' + argument0 + ';\n';
};