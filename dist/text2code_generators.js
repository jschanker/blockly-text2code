"use strict";var _typeof3="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},_typeof2="function"==typeof Symbol&&"symbol"==_typeof3(Symbol.iterator)?function(t){return void 0===t?"undefined":_typeof3(t)}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":void 0===t?"undefined":_typeof3(t)},_typeof="function"==typeof Symbol&&"symbol"==_typeof2(Symbol.iterator)?function(t){return void 0===t?"undefined":_typeof2(t)}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":void 0===t?"undefined":_typeof2(t)};!function(t){var o={};function e(r){if(o[r])return o[r].exports;var n=o[r]={i:r,l:!1,exports:{}};return t[r].call(n.exports,n,n.exports,e),n.l=!0,n.exports}e.m=t,e.c=o,e.d=function(t,o,r){e.o(t,o)||Object.defineProperty(t,o,{enumerable:!0,get:r})},e.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},e.t=function(t,o){if(1&o&&(t=e(t)),8&o)return t;if(4&o&&"object"==(void 0===t?"undefined":_typeof(t))&&t&&t.__esModule)return t;var r=Object.create(null);if(e.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&o&&"string"!=typeof t)for(var n in t)e.d(r,n,function(o){return t[o]}.bind(null,n));return r},e.n=function(t){var o=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(o,"a",o),o},e.o=function(t,o){return Object.prototype.hasOwnProperty.call(t,o)},e.p="",e(e.s=16)}({16:function(t,o,e){e.r(o),e(17),e(18),e(19),e(20)},17:function(t,o){Blockly.JavaScript.math_arithmetic_basic=Blockly.JavaScript.math_arithmetic,Blockly.Python.math_arithmetic_basic=Blockly.Python.math_arithmetic},18:function(t,o,e){!function(){var t=String.prototype.substring;String.prototype.substring=function(o,e){if("number"!=typeof o)throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks was not a number; it was "+o);if("number"!=typeof e&&void 0!==e)throw new Error("The ending position of one of the substring/getTextFromPositionNUMBER blocks was not a number; it was "+e);if(o<0)throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks is a negative number; it was "+o);if(o>this.length)throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks is at least the length of the string; it was "+o);if(e>this.length)throw new Error("The ending position of one of the substring/getTextFromPositionNUMBER blocks exceeds the length of the string; it was "+e);if(o>e)throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks ("+o+") exceeds the ending position ("+e+")");if(isNaN(o))throw new Error("The starting position of one of the substring/getTextFromPositionNUMBER blocks evaluates to NaN (not a number).  This could happen if you for example, multiplied a string by a number.");if(void 0!==e&&isNaN(e))throw new Error("The ending position of one of the substring/getTextFromPositionNUMBER blocks evaluates to NaN (not a number).  This could happen if you for example, multiplied a string by a number.");return t.apply(this,arguments)},Number.prototype.substring=function(){throw new Error("You tried to call substring/getTextFromPositionNUMBER on a number "+this.toString())};var o=String.prototype.indexOf;String.prototype.indexOf=function(t,e){if("string"!=typeof t)throw new Error("The item you're searching for for one of the indexOf/positionNumberOfTEXT blocks is not text; it's "+t);return o.apply(this,arguments)},Number.prototype.indexOf=function(){throw new Error("You tried to call indexOf/positionNumberOfTEXT on a number "+this.toString())};var e=String.prototype.charAt;String.prototype.charAt=function(t){if("number"!=typeof t)throw new Error("The position you supplied to a charAt/getCharacterNUMBER block is not a number; it's "+t);if(t<0)throw new Error("The starting position of one of the charAt/getCharacterNUMBER blocks is a negative number; it was "+t);if(t>=this.length)throw new Error("The starting position of one of the charAt/getCharacterNUMBER blocks is at least the length of the string; it was "+t);if(isNaN(t))throw new Error("The starting position of one of the charAt/getCharacterNUMBER blocks evaluates to NaN (not a number).  This could happen if you for example, multiplied a string by a number.");return e.apply(this,arguments)},Number.prototype.charAt=function(){throw new Error("You tried to call charAt/getCharacterNUMBER on a number "+this.toString())},window.प्रिंट_करें=window.display=function(){console.log.apply(console,arguments)},window.पूछकर_इनपुट_पाएँ=window.getInputByAsking=window.prompt,String.prototype.plus=function(t){return this+t},String.prototype.toNumber=function(){return parseFloat(this)},String.prototype.getBeforeTEXT=function(t){return beforeSubstring(this,t)},String.prototype.getAfterTEXT=function(t){return afterSubstring(this,t)},String.prototype.positionNumberOfTEXT=function(t){return this.indexOf(t)},String.prototype.के_पाठ_में=function(t){return{"के_स्थिति_संख्या":this.indexOf(t)}},String.prototype.lastPositionNumberOfTEXT=function(t){return this.lastIndexOf(t)},String.prototype.वर्ण_संख्या_पाएँ=String.prototype.getCharacterNUMBER=function(t){return this.charAt(t)},String.prototype.getTextFromPositionNUMBER=function(t){var o=this;return{toPositionNUMBER:function(e){return o.substring(t,e)}}},String.prototype.पाठ_की_स्थिति_संख्या=function(t){var o=this;return{"से_स्थिति_संख्या":function(e){return{"तक_पाएँ":o.substring(t,e)}}}},Object.defineProperty(String.prototype,"लंबाई",{get:function(){return this.length}}),window.beforeSubstring=function(t,o){var e=t.indexOf(o);return e>=0?t.substring(0,e):t},window.beforeLastSubstring=function(t,o){var e=t.lastIndexOf(o);return e>=0?t.substring(0,e):t},window.afterSubstring=function(t,o){return t.substring(t.indexOf(o)+o.length)}}(),function(){var t=function(t,o){return t+"("+(Blockly.JavaScript.valueToCode(o,"TEXT",Blockly.JavaScript.ORDER_NONE)||'""')+");\n"};Blockly.JavaScript.js_text_print=t.bind(null,"console.log"),Blockly.JavaScript.text_print=function(o){return t(T2C.MSG.currentLanguage.TEXT_PRINT_TITLE.substring(0,T2C.MSG.currentLanguage.TEXT_PRINT_TITLE.indexOf("(")),o)},Blockly.Python.js_text_print=Blockly.Python.text_print;var o=function(t,o){return[t+"("+(Blockly.JavaScript.valueToCode(o,"TEXT",Blockly.JavaScript.ORDER_NONE)||'""')+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.js_text_input=o.bind(null,"prompt"),Blockly.JavaScript.text_input=function(t){return o(T2C.MSG.currentLanguage.TEXT_INPUT_TITLE.substring(0,T2C.MSG.currentLanguage.TEXT_INPUT_TITLE.indexOf("(")),t)},Blockly.Python.js_text_input=Blockly.Python.text_input=function(t){var o=Blockly.Python.valueToCode(t,"TEXT",Blockly.Python.ORDER_NONE)||"''";return[T2C.MSG.PY.TEXT_INPUT_TITLE.replace("%1",o),Blockly.Python.ORDER_FUNCTION_CALL]},Blockly.JavaScript.t2c_text_join=function(t){return[(Blockly.JavaScript.valueToCode(t,"A",Blockly.JavaScript.ORDER_NONE)||'""')+" + "+(Blockly.JavaScript.valueToCode(t,"B",Blockly.JavaScript.ORDER_NONE)||'""'),Blockly.JavaScript.ORDER_ADDITION]},Blockly.Python.t2c_text_join=function(t){return[(Blockly.Python.valueToCode(t,"A",Blockly.Python.ORDER_NONE)||"''")+" + "+(Blockly.Python.valueToCode(t,"B",Blockly.Python.ORDER_NONE)||"''"),Blockly.Python.ORDER_ADDITIVE]},Blockly.JavaScript.js_text_indexof=function(t,o){var e=Blockly.JavaScript.valueToCode(o,"FIND",Blockly.JavaScript.ORDER_NONE)||'""';return[(Blockly.JavaScript.valueToCode(o,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||'""')+"."+t+"("+e+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]}.bind(null,"indexOf"),Blockly.JavaScript.t2c_text_indexof=function(t){var o=Blockly.JavaScript.valueToCode(t,"FIND",Blockly.JavaScript.ORDER_NONE)||'""',e=Blockly.JavaScript.valueToCode(t,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||'""';return[T2C.MSG.currentLanguage.TEXT_T2C_INDEXOF_TITLE.replace("%1",e).replace("%2",o),Blockly.JavaScript.ORDER_FUNCTION_CALL]},Blockly.Python.js_text_indexof=Blockly.Python.t2c_text_indexof=function(t){var o=Blockly.Python.valueToCode(t,"FIND",Blockly.Python.ORDER_NONE)||'""',e=Blockly.Python.valueToCode(t,"VALUE",Blockly.Python.ORDER_MEMBER)||'""';return[T2C.MSG.currentLanguage.TEXT_T2C_INDEXOF_TITLE.replace("%1",e).replace("%2",o),Blockly.Python.ORDER_FUNCTION_CALL]};var e=function(t,o){var e=Blockly.JavaScript.valueToCode(o,"AT",Blockly.JavaScript.ORDER_NONE);return[(Blockly.JavaScript.valueToCode(o,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||'""')+"."+t+"("+e+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.js_text_charat=e.bind(null,"charAt"),Blockly.JavaScript.t2c_text_charat=function(t){return e(T2C.MSG.currentLanguage.TEXT_T2C_CHARAT_TITLE.substring(3,T2C.MSG.currentLanguage.TEXT_T2C_CHARAT_TITLE.indexOf("(")),t)},Blockly.Python.t2c_text_charat=Blockly.Python.js_text_charat=function(t){var o=Blockly.Python.valueToCode(t,"AT",Blockly.Python.ORDER_NONE),e=Blockly.Python.valueToCode(t,"VALUE",Blockly.Python.ORDER_MEMBER)||'""';return[T2C.MSG.PY.TEXT_T2C_CHARAT_TITLE.replace("%1",e).replace("%2",o),Blockly.Python.ORDER_FUNCTION_CALL]},Blockly.JavaScript.t2c_text_length=function(t){var o=Blockly.JavaScript.valueToCode(t,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"''";return[T2C.MSG.currentLanguage.TEXT_T2C_LENGTH_TITLE.replace("%1",o),Blockly.JavaScript.ORDER_MEMBER]},Blockly.Python.t2c_text_length=Blockly.Python.text_length,Blockly.JavaScript.js_text_getsubstring=function(t){return[(Blockly.JavaScript.valueToCode(t,"STRING",Blockly.JavaScript.ORDER_MEMBER)||'""')+".substring("+Blockly.JavaScript.valueToCode(t,"AT1",Blockly.JavaScript.ORDER_NONE)+", "+Blockly.JavaScript.valueToCode(t,"AT2",Blockly.JavaScript.ORDER_NONE)+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]},Blockly.JavaScript.t2c_text_getsubstring=function(t){var o=Blockly.JavaScript.valueToCode(t,"STRING",Blockly.JavaScript.ORDER_MEMBER)||'""',e=Blockly.JavaScript.valueToCode(t,"AT1",Blockly.JavaScript.ORDER_NONE),r=Blockly.JavaScript.valueToCode(t,"AT2",Blockly.JavaScript.ORDER_NONE);return[T2C.MSG.currentLanguage.TEXT_T2C_GET_SUBSTRING_TITLE.replace("%1",o).replace("%2",e).replace("%3",r),Blockly.JavaScript.ORDER_FUNCTION_CALL]},Blockly.Python.t2c_text_getsubstring=Blockly.Python.js_text_getsubstring=function(t){var o=Blockly.Python.valueToCode(t,"STRING",Blockly.Python.ORDER_MEMBER)||'""',e=Blockly.Python.valueToCode(t,"AT1",Blockly.Python.ORDER_NONE),r=Blockly.Python.valueToCode(t,"AT2",Blockly.Python.ORDER_NONE);return[T2C.MSG.currentLanguage.TEXT_T2C_GET_SUBSTRING_TITLE.replace("%1",o).replace("%2",e).replace("%3",r),Blockly.JavaScript.ORDER_FUNCTION_CALL]};var r=function(t,o){var e=Blockly.JavaScript.valueToCode(o,"SUB",Blockly.JavaScript.ORDER_NONE);return[(Blockly.JavaScript.valueToCode(o,"TEXT",Blockly.JavaScript.ORDER_MEMBER)||'""')+"."+t+"("+e+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.t2c_text_after=r.bind(null,"getAfterTEXT"),Blockly.JavaScript.t2c_text_before=r.bind(null,"getBeforeTEXT")}()},19:function(t,o,e){
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
function r(t){var o=t.replace(/[^\w\$ऀ-ॣ०-९ॱ-ॿ]/g,"_");return o[0].replace(/[^_\\$|A-Z|a-z|ऄ-ह|ऽ|ॐ|क़-ॡ|ॱ-ॿ]/,"_")+o.substring(1)}Blockly.JavaScript.variables_get=function(t){return[r(t.getField("VAR").getText()),Blockly.JavaScript.ORDER_ATOMIC]},Blockly.Python.variables_get=function(t){return[r(t.getField("VAR").getText()),Blockly.Python.ORDER_ATOMIC]},Blockly.JavaScript.variables_set=function(t){var o=Blockly.JavaScript.valueToCode(t,"VALUE",Blockly.JavaScript.ORDER_ASSIGNMENT)||"0";return"let "+r(t.getField("VAR").getText())+" = "+o+";\n"},Blockly.Python.variables_set=function(t){var o=Blockly.Python.valueToCode(t,"VALUE",Blockly.Python.ORDER_NONE)||"0";return r(t.getField("VAR").getText())+" = "+o+"\n"}},20:function(t,o){Blockly.Python.code_statement=Blockly.JavaScript.code_statement=function(t){return t.getFieldValue("EXP")},Blockly.JavaScript.code_expression=function(t){return[t.getFieldValue("EXP"),Blockly.JavaScript.ORDER_NONE]},Blockly.Python.code_expression=function(t){return[t.getFieldValue("EXP"),Blockly.Python.ORDER_NONE]}}});