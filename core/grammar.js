 /**
 * Copyright 2018-2020 Text2Code Authors
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
 * @fileoverview Automatically generated by 
 * running node build.js from JSON files in the grammar folder
 * @author (of JSON files) Jason Schanker
 */

export const rules = JSON.parse('{"rules":{"wholeNumberExp":{"wholeNumberSum":["wholeNumberExp","wholeNumberAddMinusOp","wholeNumberTerm"],"wholeNumberTermSingle":["wholeNumberTerm"]},"wholeNumberTerm":{"wholeNumberTermSingleGroupedExp":["openParenthesis","wholeNumberTerm","closeParenthesis"],"wholeNumberTermTwoGroupedExp":["openParenthesis","wholeNumberExp","wholeNumberGroupedOp","wholeNumberTerm","closeParenthesis"],"wholeNumberTermProduct":["wholeNumberTerm","wholeNumberTimesDividedByOp","wholeNumberTerm"],"wholeNumberTermAtomic":["wholeNumberAtomic"]},"wholeNumberAtomic":{"wholeNumberLiteral":"token_","identifierGet":["identifier"],"wholeNumberStringFunc":["stringExpWholeNumber"]},"wholeNumberGroupedOp":{"wholeNumberSumTwo":["wholeNumberAddMinusOp"],"wholeNumberProductTwo":["wholeNumberTimesDividedByOp"]},"wholeNumberAddMinusOp":{"wholeNumberPlus":"+","wholeNumberMinus":"-"},"wholeNumberTimesDividedByOp":{"wholeNumberTimes":"*","wholeNumberDividedBy":"/"},"expression":{"expressionText":["stringExp"],"expressionNumber":["wholeNumberExp"]},"statement":{"statementSingle":["expression"],"statementVariable":["variableStatement"],"statementPrint":["stringDisplay"],"statementSemicolon":["statement","semicolon"],"statementBlockExp":["expression","statementSeparator","statement"],"statementBlockVariable":["variableStatement","statementSeparator","statement"],"statementBlockPrint":["stringDisplay","statementSeparator","statement"]},"statementSeparator":{"semicolonEnd":["semicolon"],"newLineEnd":["newLine"],"carriageReturnEnd":["carriageReturn"],"semicolonMultiSeparator":["semicolon","statementSeparator"],"newLineMultiSeparator":["newLine","statementSeparator"],"carriageReturnMultiSeparator":["carriageReturn","statementSeparator"]},"semicolon":"token_","newLine":"\\n","carriageReturn":"\\r","stringExp":{"identifierGet":["identifier"],"stringGetInputExp":["stringGetInput","openParenthesis","stringExp","closeParenthesis"],"js_stringGetInputExp":["stringPrompt","openParenthesis","stringExp","closeParenthesis"],"stringGroupedExp":["openParenthesis","stringExp","closeParenthesis"],"stringConcatenationFullExpression":["stringExp","plusStr","stringExp"],"stringCharAtFullExpression":["stringExp","dot","getCharacterNumber","openParenthesis","wholeNumberExp","closeParenthesis"],"py_stringCharAtFullExpression":["stringExp","openBracket","wholeNumberExp","closeBracket"],"js_stringCharAtFullExpression":["stringExp","dot","getCharacterNumberJS","openParenthesis","wholeNumberExp","closeParenthesis"],"stringAfterTextFullExpression":["stringExp","dot","getAfterText","openParenthesis","stringExp","closeParenthesis"],"stringBeforeTextFullExpression":["stringExp","dot","getBeforeText","openParenthesis","stringExp","closeParenthesis"],"stringSubstringFullExpression":["stringExp","dot","getTextFrom","openParenthesis","wholeNumberExp","closeParenthesis","dot","getTextTo","openParenthesis","wholeNumberExp","stringSubstringCloseParenthesisOptionalTail"],"py_stringSubstringFullExpression":["stringExp","openBracket","wholeNumberExp","colon","wholeNumberExp","closeBracket"],"js_stringSubstringFullExpression":["stringExp","dot","getSubstringJS","openParenthesis","wholeNumberExp","comma","wholeNumberExp","closeParenthesis"],"stringLiteral":"token_","funcStringGetInputExp":["stringGetInput"],"funcJS_stringGetInputExp":["stringPrompt"],"func_stringCharAtFullExpression":["stringExp","dot","getCharacterNumber"],"funcJS_stringCharAtFullExpression":["stringExp","dot","getCharacterNumberJS"],"funcStringSubstringFullExpression":["stringExp","dot","getTextFrom"],"funcBStringSubstringFullExpression":["stringExp","dot","getTextFrom","openParenthesis","wholeNumberExp","closeParenthesis"],"funcJS_stringSubstringFullExpression":["stringExp","dot","getSubstringJS"]},"stringExpWholeNumber":{"stringFindFirstFullExpression":["stringExp","dot","findFirstOccurrenceOfText","openParenthesis","stringExp","stringFindFirstCloseParenthesisOptionalTail"],"js_stringFindFirstFullExpression":["stringExp","dot","jsIndexOf","openParenthesis","stringExp","closeParenthesis"],"stringExpLength":["stringExp","dot","length"],"py_stringExpLength":["len","openParenthesis","stringExp","closeParenthesis"],"funcStringFindFirstFullExpression":["stringExp","dot","findFirstOccurrenceOfText"],"funcJS_StringFindFirstFullExpression":["stringExp","dot","jsIndexOf"]},"stringDisplay":{"js_ConsoleLogStatement":["console","dot","log","openParenthesis","expression","closeParenthesis"],"displayStatement":["display","openParenthesis","expression","closeParenthesis"],"funcJS_ConsoleLogStatement":["console","dot","log"],"funcDisplayStatement":["display"]},"stringSubstringCloseParenthesisOptionalTail":{"stringSubstringCloseParenthesisNoTail":["closeParenthesis"],"stringSubstringCloseParenthesisTail":["closeParenthesis","dot","substringTail"]},"stringFindFirstCloseParenthesisOptionalTail":{"stringFindFirstCloseParenthesisNoTail":["closeParenthesis"],"stringFindFirstCloseParenthesisTail":["closeParenthesis","dot","findFirstTail"]},"dot":"token_","console":"console","log":"log","display":"display","openParenthesis":"token_","closeParenthesis":"token_","openBracket":"token_","closeBracket":"token_","comma":"token_","stringGetInput":"getInputByAsking","stringPrompt":"prompt","length":"length","len":"len","getTextFrom":"getTextFromPositionNUMBER","getTextTo":"toPositionNUMBER","getSubstringJS":"substring","jsIndexOf":"indexOf","findFirstOccurrenceOfText":"positionNumberOfTEXT","findLastOccurrenceOfText":"lastPositionNumberOfTEXT","getAfterText":"getAfterTEXT","getBeforeText":"getBeforeTEXT","plusStr":"+","getCharacterNumber":"getCharacterNUMBER","getCharacterNumberJS":"charAt","toNumber":"toNumber","substringTail":"tak_paen","findFirstTail":"ke_sthiti_sankhya","variableStatement":{"variableAssignment":["variablesLet","identifier","equalsSign","expression"],"variableAssignmentNoLet":["identifier","equalsSign","expression"]},"variablesLet":"let","equalsSign":"=","identifier":"token_"},"terminals":["wholeNumberPlus","wholeNumberMinus","wholeNumberTimes","wholeNumberDividedBy","semicolon","newLine","carriageReturn","findFirstOccurrenceOfText","jsIndexOf","findLastOccurrenceOfText","getAfterText","getBeforeText","plusStr","getCharacterNumber","getCharacterNumberJS","toNumber","getTextFrom","getSubstringJS","getTextTo","stringGetInput","stringPrompt","console","log","display","length","substringTail","findFirstTail","variablesLet","equalsSign"]}');
export const tokens = JSON.parse('{"stringLiteral":{"pattern":"\\"([^\\"]*)\\"|\'([^\']*)\'","order":1},"identifier":{"pattern":"([_\\\\$A-Za-z|ऄ-ह|ऽ|ॐ|क़-ॡ|ॱ-ॿ][\\\\w\\\\$|ऀ-ॣ|०-९|ॱ-ॿ]*)","order":2},"positiveDecimal":{"pattern":"(\\\\d+\\\\.[1-9]\\\\d+)","order":3},"wholeNumberLiteral":{"pattern":"\\\\d+|\\\\d*\\\\.[0]+","order":6},"dot":{"pattern":"(\\\\.)","order":7},"openParenthesis":{"pattern":"(\\\\()","order":8},"closeParenthesis":{"pattern":"(\\\\))","order":9},"openBracket":{"pattern":"(\\\\[)","order":10},"closeBracket":{"pattern":"(\\\\])","order":11},"comma":{"pattern":"(\\\\,)","order":12},"semicolon":{"pattern":"(\\\\;)","order":13},"colon":{"pattern":"(:)","order":14},"negativeDecimalMOVEDFROMFOURFORNOW":{"pattern":"(-\\\\d+\\\\.[1-9]\\\\d+)","order":15},"negativeIntegerMOVEDFROMFIVEFORNOW":{"pattern":"-[1-9]\\\\d*|-[1-9]\\\\d*\\\\.[0]+","order":16}}');