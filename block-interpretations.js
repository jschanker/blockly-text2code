/**
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
 * @fileoverview Automatically generated (these comments excluded) by 
 * running node build.js from JSON files in the block-interpretation folder
 * @author (of JSON files) Jason Schanker
 */

let interpretations = JSON.parse('{"wholeNumberLiteral":{"type":"math_number","fields":{"NUM":"%1"}},"wholeNumberSum":{"type":"math_arithmetic_basic","fields":{"OP":"%2"},"inputs":{"A":"%1","B":"%3"}},"wholeNumberTermTwoGroupedExp":{"type":"math_arithmetic_basic","fields":{"OP":"%3"},"inputs":{"A":"%2","B":"%4"}},"wholeNumberTermProduct":{"type":"math_arithmetic_basic","fields":{"OP":"%2"},"inputs":{"A":"%1","B":"%3"}},"wholeNumberPlus":"ADD","wholeNumberMinus":"MINUS","wholeNumberTimes":"MULTIPLY","wholeNumberDividedBy":"DIVIDE","wholeNumberTermSingleGroupedExp":"%2","stringLiteral":{"type":"text","fields":{"TEXT":"%1"}},"stringGetInputExp":{"type":"text_input","inputs":{"TEXT":"%3"}},"js_stringGetInputExp":{"type":"js_text_input","inputs":{"TEXT":"%3"}},"displayStatement":{"type":"text_print","inputs":{"TEXT":"%3"}},"js_ConsoleLogStatement":{"type":"js_text_print","inputs":{"TEXT":"%5"}},"stringFindFirstFullExpression":{"type":"%3","inputs":{"VALUE":"%1","FIND":"%5"}},"js_stringFindFirstFullExpression":{"type":"%3","inputs":{"VALUE":"%1","FIND":"%5"}},"stringSubstringFullExpression":{"type":"%3","inputs":{"STRING":"%1","AT1":"%5","AT2":"%10"}},"stringCharAtFullExpression":{"type":"%3","inputs":{"VALUE":"%1","AT":"%5"}},"js_stringCharAtFullExpression":{"type":"%3","inputs":{"VALUE":"%1","AT":"%5"}},"js_stringSubstringFullExpression":{"type":"%3","inputs":{"STRING":"%1","AT1":"%5","AT2":"%7"}},"stringAfterTextFullExpression":{"type":"%3","inputs":{"TEXT":"%1","SUB":"%5"}},"stringBeforeTextFullExpression":{"type":"%3","inputs":{"TEXT":"%1","SUB":"%5"}},"stringConcatenationFullExpression":{"type":"%2","inputs":{"A":"%1","B":"%3"}},"stringGroupedExp":"%2","plusStr":"t2c_text_join","findFirstOccurrenceOfText":"t2c_text_indexof","getCharacterNumber":"t2c_text_charat","getCharacterNumberJS":"js_text_charat","getSubstringJS":"js_text_getsubstring","jsIndexOf":"js_text_indexof","getTextFrom":"t2c_text_getsubstring","getAfterText":"t2c_text_after","getBeforeText":"t2c_text_before","identifierGet":{"type":"variables_get","fields":{"VAR":"%1"}},"variableAssignment":{"type":"variables_set","fields":{"VAR":"%2"},"inputs":{"VALUE":"%4"}}}');