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
 * running node build.js from JSON files in the grammar folder
 * @author (of JSON files) Jason Schanker
 */

let rules = JSON.parse('{"rules":{"wholeNumberExp":{"wholeNumberSum":["wholeNumberExp","wholeNumberAddMinusOp","wholeNumberTerm"],"wholeNumberTermSingle":["wholeNumberTerm"]},"wholeNumberTerm":{"wholeNumberTermSingleGroupedExp":["openParenthesis","wholeNumberTerm","closeParenthesis"],"wholeNumberTermTwoGroupedExp":["openParenthesis","wholeNumberExp","wholeNumberGroupedOp","wholeNumberTerm","closeParenthesis"],"wholeNumberTermProduct":["wholeNumberTerm","wholeNumberTimesDividedByOp","wholeNumberTerm"],"wholeNumberTermAtomic":["wholeNumberAtomic"]},"wholeNumberAtomic":{"wholeNumberLiteral":"token_","identifierGet":["identifier"],"wholeNumberStringFunc":["stringExpWholeNumber"]},"wholeNumberGroupedOp":{"wholeNumberSumTwo":["wholeNumberAddMinusOp"],"wholeNumberProductTwo":["wholeNumberTimesDividedByOp"]},"wholeNumberAddMinusOp":{"wholeNumberPlus":"+","wholeNumberMinus":"-"},"wholeNumberTimesDividedByOp":{"wholeNumberTimes":"*","wholeNumberDividedBy":"/"},"expression":{"expressionText":["stringExp"],"expressionNumber":["wholeNumberExp"]},"statement":{"statementSingle":["expression"],"statementVariable":["variableStatement"],"statementPrint":["stringDisplay"],"statementSemicolon":["statement","semicolon"]},"semicolon":"token_","stringExp":{"identifierGet":["identifier"],"stringGetInputExp":["stringGetInput","openParenthesis","stringExp","closeParenthesis"],"js_stringGetInputExp":["stringPrompt","openParenthesis","stringExp","closeParenthesis"],"stringGroupedExp":["openParenthesis","stringExp","closeParenthesis"],"stringConcatenationFullExpression":["stringExp","plusStr","stringExp"],"stringCharAtFullExpression":["stringExp","dot","getCharacterNumber","openParenthesis","wholeNumberExp","closeParenthesis"],"js_stringCharAtFullExpression":["stringExp","dot","getCharacterNumberJS","openParenthesis","wholeNumberExp","closeParenthesis"],"stringAfterTextFullExpression":["stringExp","dot","getAfterText","openParenthesis","stringExp","closeParenthesis"],"stringBeforeTextFullExpression":["stringExp","dot","getBeforeText","openParenthesis","stringExp","closeParenthesis"],"stringSubstringFullExpression":["stringExp","dot","getTextFrom","openParenthesis","wholeNumberExp","closeParenthesis","dot","getTextTo","openParenthesis","wholeNumberExp","closeParenthesis"],"js_stringSubstringFullExpression":["stringExp","dot","getSubstringJS","openParenthesis","wholeNumberExp","comma","wholeNumberExp","closeParenthesis"],"stringLiteral":"token_"},"stringExpWholeNumber":{"stringFindFirstFullExpression":["stringExp","dot","findFirstOccurrenceOfText","openParenthesis","stringExp","closeParenthesis"],"js_stringFindFirstFullExpression":["stringExp","dot","jsIndexOf","openParenthesis","stringExp","closeParenthesis"],"stringExpLength":["stringExp","dot","length"]},"stringDisplay":{"js_ConsoleLogStatement":["console","dot","log","openParenthesis","expression","closeParenthesis"],"displayStatement":["display","openParenthesis","expression","closeParenthesis"]},"dot":"token_","dotStringMethodOne":["dot","stringMethodOne"],"dotStringMethodTwo":["dot","stringMethodTwo"],"stringMethodOne":{"stringMethodOneArgString":["stringMethodFirstStringArg","stringArgParens"],"stringMethodOneArgNumber":["stringMethodFirstNumberArg","numberArgParens"]},"console":"console","log":"log","display":"display","stringArgParens":["openParenthesis","stringArgCloseParenthesis"],"numberArgParens":["openParenthesis","numberArgCloseParenthesis"],"numberArgCloseParenthesis":["wholeNumberExp","closeParenthesis"],"stringArgCloseParenthesis":["stringExp","closeParenthesis"],"stringMethodTwo":["stringMethodOne","dotStringMethodOne"],"openParenthesis":"token_","closeParenthesis":"token_","comma":"token_","stringGetInput":"getInputByAsking","stringPrompt":"prompt","length":"length","getTextFrom":"getTextFromPositionNUMBER","getTextTo":"toPositionNUMBER","getSubstringJS":"substring","jsIndexOf":"indexOf","stringMethodFirstStringArg":{"findFirstOccurrenceOfText":"positionNumberOfTEXT","findLastOccurrenceOfText":"lastPositionNumberOfTEXT","getAfterText":"getAfterTEXT","getBeforeText":"getBeforeTEXT","plusStr":"+"},"stringMethodFirstNumberArg":{"getCharacterNumber":"getCharacterNUMBER","getCharacterNumberJS":"charAt"},"stringMethodSecond":{"toNumber":"toNumber"},"variableStatement":{"variableAssignment":["variablesLet","identifier","equalsSign","expression"]},"variablesLet":"let","equalsSign":"=","identifier":"token_"},"terminals":["wholeNumberPlus","wholeNumberMinus","wholeNumberTimes","wholeNumberDividedBy","semicolon","findFirstOccurrenceOfText","jsIndexOf","findLastOccurrenceOfText","getAfterText","getBeforeText","plusStr","getCharacterNumber","getCharacterNumberJS","toNumber","getTextFrom","getSubstringJS","getTextTo","stringGetInput","stringPrompt","console","log","display","length","variablesLet","equalsSign"]}');
let tokens = JSON.parse('{"stringLiteral":{"pattern":"\\"([^\\"]*)\\"|\'([^\']*)\'","order":1},"identifier":{"pattern":"([_\\\\$A-Za-z][\\\\w\\\\$]*)","order":2},"positiveDecimal":{"pattern":"(\\\\d+\\\\.[1-9]\\\\d+)","order":3},"wholeNumberLiteral":{"pattern":"\\\\d+|\\\\d*\\\\.[0]+","order":6},"dot":{"pattern":"(\\\\.)","order":7},"openParenthesis":{"pattern":"(\\\\()","order":8},"closeParenthesis":{"pattern":"(\\\\))","order":9},"comma":{"pattern":"(\\\\,)","order":10},"semicolon":{"pattern":"(\\\\;)","order":11},"negativeDecimalMOVEDFROMFOURFORNOW":{"pattern":"(-\\\\d+\\\\.[1-9]\\\\d+)","order":14},"negativeIntegerMOVEDFROMFIVEFORNOW":{"pattern":"-[1-9]\\\\d*|-[1-9]\\\\d*\\\\.[0]+","order":15}}');