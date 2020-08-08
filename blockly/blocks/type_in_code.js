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
 * @fileoverview Blocks to type in code that get converted to corresponding 
 * math, text, etc. code blocks for Blockly.
 * @author Jason Schanker
 */

//import {shared} from "../../index.js";
import {parseAndConvertToBlocks} from "../../core/index.js";

(function() {
  function substituteArr(oldArr, newArr) {
    while(oldArr.length > 0) oldArr.pop();
    oldArr.push(...newArr);
  }
  /*
  function matchPartial(matchStr, text) {
    
    const states = {
      READ_NONVAR: 0,
      READ_PERCENT: 1,
      READ_PERCENT_DIGIT: 2
    };
    let currentState = states.READ_NONVAR;
    let retString = "";
    let currentPos = 0;
    
    matmatchStr.substring(1)

    return retString;
  }
  */
  function matchPartial(matchStr, text) {
    let match;
    if(!matchStr.length) return "";
    else if(!text.length) {
      return matchStr.replace(/%\d+/g, "");
    }
    else if(match = matchStr.match(/^%\d+/)) {
      return text.charAt(0) + 
        (matchPartial(matchStr.substring(match[0].length), 
          text.substring(1)) || 
         matchPartial(matchStr, text.substring(1)));
    }
    else {
      if(text.charAt(0) === matchStr.charAt(0)) {
        return text.charAt(0) + 
          matchPartial(matchStr.substring(1), text.substring(1));
      } else {
        return null;
      }
    }
  }
  // ISSUES: After entering syntactically incorrect code and dismissing alert, block is dragged around
  //         Also need to fix grammar: display interpreted as variable and display("") not registered as valid

  Blockly.Blocks['code_expression'] = {
    init: function() {
      var props = {editing: false};
      this.appendDummyInput("STRING")
          .appendField(T2C.MSG.currentLanguage.TYPEIN_EXPRESSION_TITLE)
          //.appendField(new Blockly.FieldTextInput("", function(exp) {
          .appendField(new Blockly.FieldMultilineInput("", function(exp) {
              if(exp) {
                  props.editing = true;
              }
          }), "EXP");
      this.setInputsInline(true);
      this.setOutput(true);
      this.setColour(60);
      this.setTooltip(T2C.MSG.currentLanguage.TYPEIN_EXPRESSION_TOOLTIP);
      //this.setHelpUrl(Blockly.Msg.TYPEIN_EXPRESSION_HELPURL);
      //var thisBlock = this;
      this.onchange = parseAndConvertToBlocks.bind(this, props);
    }
  };

  Blockly.Blocks['code_statement'] = {
    init: function() {
      const candidateBlockArr = [{text: /di[^\s()]*/, type: "text_print"}, {text: /getIn[^\s()]*/, type: "text_input"}];
      const OPTIONS = [["Autocomplete Options", "None"],
                       [T2C.MSG.currentLanguage["TEXT_PRINT_TITLE"], "text_print"],
                       [T2C.MSG.currentLanguage["TEXT_INPUT_TITLE"], "text_input"],
                       /*["", "variables_set"],
                       ["", "variables_get"],
                       ["", "math_number"],
                       ["", "math_arithmetic_basic"],
                       ["", "text"],*/
                       [T2C.MSG.currentLanguage.TEXT_T2C_LENGTH_TITLE, "t2c_text_length"],
                       [T2C.MSG.currentLanguage.TEXT_T2C_INDEXOF_TITLE, "t2c_text_indexof"],
                       [T2C.MSG.currentLanguage.TEXT_T2C_CHARAT_TITLE, "t2c_text_charat"],
                       [T2C.MSG.currentLanguage.TEXT_T2C_GET_SUBSTRING_TITLE, "t2c_text_getsubstring"]];
      const shownOPTIONS = OPTIONS.slice();
      var props = {editing: false, shownOPTIONS, candidateBlockArr};
      this.appendDummyInput("FILLER")
          .appendField(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TITLE)
          .appendField(new Blockly.FieldDropdown(shownOPTIONS), 'AUTOCPLT')
          //.appendField(new Blockly.FieldDropdown(() => {
          //  return shownOPTIONS.filter(opt => {
            //console.warn(this.getFieldValue("EXP"));
          //    return true;//!this.getFieldValue("EXP") || opt[0].startsWith(this.getFieldValue("EXP"))
          //  })
          //}), 'AUTOCPLT')
          //.appendField(new Blockly.FieldTextInput("", function(exp) {
      this.appendDummyInput("STRING")
          .appendField(new Blockly.FieldMultilineInput("", (exp) => {
              if(exp) {
                //OPTIONS.push(["sometrhing", 'foo'])
                //OPTIONS.push([this.getFieldValue("EXP"), this.getFieldValue("EXP")])
                /*
                const newOptions = OPTIONS.slice(1)
                  .map(option => option[0].split(/(%\d+|.)/)
                    .filter(x => x)
                    .map(x => x.length > 1 ? "(.)*" : "(?:" + 
                      ((x !== "(" && x !== ")" && x !== ".") ? x : "\\" + x) 
                      + "|$)")
                    .join(""))
                  //.map((opt, index) => [opt, OPTIONS[index+1][1]])
                  .map(regExpOpt => this.getFieldValue("EXP").match(new RegExp(regExpOpt)))
                  .map((option, index) => [option && option[0], OPTIONS[index+1][1]])
                  .map(x =>)
                  .filter(optionText => optionText[0])
                 */
                 const newOptions = OPTIONS.slice(1)
                   .map(opt => [matchPartial(opt[0], this.getFieldValue("EXP")), 
                     opt[1]])
                   .filter(opt => opt[0])   
                  //.map((option, index) => option[0].split(/(%\d+)/)
                    //.split(/(%\d+)/))
                  //.filter((option, index) => 
                  //  index === 0 || option[0].startsWith(this.getFieldValue("EXP")));
                //console.warn("O", OPTIONS[0]);
                substituteArr(shownOPTIONS, [OPTIONS[0]].concat(newOptions));
                console.warn(this.getFieldValue("EXP"), shownOPTIONS);
                props.editing = true;
              }
          }), "EXP");
      this.setInputsInline(false);
      this.setOutput(false);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(60);
      this.setTooltip(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TOOLTIP);
      //this.setHelpUrl(Blockly.Msg.TYPEIN_EXPRESSION_HELPURL);
      //var thisBlock = this;
      this.onchange = parseAndConvertToBlocks.bind(this, props);
    }
  };
})();