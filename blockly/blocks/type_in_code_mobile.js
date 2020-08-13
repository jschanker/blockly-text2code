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

import {parseAndConvertToBlocks} from "../../core/mobile.js";

(function() {
  function updateAutocomplete(val, optionsArr, fieldArr, filterFunc) {
    filterFunc = filterFunc || (x => x);
    const newOptions = optionsArr.slice(1)
      .map(opt => matchPartial(opt[0], val))
      .filter(opt => opt)
      .filter(filterFunc)
      .map(opt => [opt, opt]);   
    substituteArr(fieldArr, [optionsArr[0]].concat(newOptions));
  }
  function substituteArr(oldArr, newArr) {
    while(oldArr.length > 0) oldArr.pop();
    oldArr.push(...newArr);
  }

  function matchPartial(matchStr, text) {
    let match;
    if(!matchStr.length) return "";
    else if(!text.length) {
//    return matchStr.replace(/%\d+|\,|\)|;/g, "");
      const nextVar = matchStr.search(/%[a|s|d|v|o]/);
      return matchStr.substring(0, nextVar !== -1 ? nextVar : matchStr.length);
    }
    //else if(match = matchStr.match(/^%\d+/)) {
    else if(match = matchStr.match(/^%[a|s|d|v]/)) {
      const initialMatch = matchPartial(matchStr.substring(match[0].length), 
          text.substring(1)) || 
         matchPartial(matchStr, text.substring(1));
      return initialMatch && text.charAt(0) + initialMatch;
    }
    else if(match = matchStr.match(/^%o/)) {
      const initialMatch = matchPartial(matchStr.substring(match[0].length), text);
      if(initialMatch) return initialMatch;
      const secondaryMatch = matchPartial(matchStr, text.substring(1));
      return secondaryMatch && (text.charAt(0) + secondaryMatch);
    }
    else {
      if(text.charAt(0) === matchStr.charAt(0)) {
        const initialMatch = matchPartial(matchStr.substring(1), text.substring(1));
        return initialMatch && text.charAt(0) + initialMatch;
      } else {
        //return null;
        return "";
      }
    }
  }
  // ISSUES: After entering syntactically incorrect code and dismissing alert, block is dragged around
  //         Also need to fix grammar: display interpreted as variable and display("") not registered as valid

  Blockly.Blocks['code_expression'] = {
    init: function() {
      var props = {editing: false};
      this.appendDummyInput("STRING")
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
      // %a: any type, %v: variable name, %s: string, %d: integer
      /*
      const autocompleteOptions = [
        T2C.MSG.currentLanguage["TEXT_PRINT_TITLE"],
        Blockly.Msg["VARIABLES_SET"].replace("%1", "%v").replace("%2", "%a")
      ];
      */
      // const OPTIONS = [["Autocomplete Options", "None"],
      //                  [T2C.MSG.currentLanguage["TEXT_PRINT_TITLE"], "text_print"],
      //                  [T2C.MSG.currentLanguage["TEXT_INPUT_TITLE"], "text_input"],
      //                  ["", "variables_set"],
      //                  ["", "variables_get"],
      //                  ["", "math_number"],
      //                  ["", "math_arithmetic_basic"],
      //                  ["", "text"],
      //                  [T2C.MSG.currentLanguage.TEXT_T2C_LENGTH_TITLE, "t2c_text_length"],
      //                  [T2C.MSG.currentLanguage.TEXT_T2C_INDEXOF_TITLE, "t2c_text_indexof"],
      //                  [T2C.MSG.currentLanguage.TEXT_T2C_CHARAT_TITLE, "t2c_text_charat"],
      //                  [T2C.MSG.currentLanguage.TEXT_T2C_GET_SUBSTRING_TITLE, "t2c_text_getsubstring"]];
      const OPTIONS = [
          ["Autocomplete Options", ""],
          T2C.MSG.currentLanguage["TEXT_PRINT_TITLE"].replace("%1", "%a"),
          Blockly.Msg["VARIABLES_SET"].replace("%1", "%v").replace("%2", "%a"),
          T2C.MSG.currentLanguage["TEXT_INPUT_TITLE"].replace("%1", "%s"),
          T2C.MSG.currentLanguage["TEXT_T2C_LENGTH_TITLE"].replace("%1", "%s"),
          T2C.MSG.currentLanguage["TEXT_T2C_INDEXOF_TITLE"].replace("%1", "%s").replace("%2", "%s"),
          T2C.MSG.currentLanguage["TEXT_T2C_CHARAT_TITLE"].replace("%1", "%s").replace("%2", "%d"),
          T2C.MSG.currentLanguage["TEXT_T2C_GET_SUBSTRING_TITLE"].replace("%1", "%s").replace("%2", "%d").replace("%3", "%d")
        ].map((opt, index) => {
          if(index === 0) {
            return opt;
          }
          else if(index === 1 || index === 2 || /^%[a|s|d|v]/.test(opt)) {
            return [opt, opt];
          }
          else {
            return ["%o" + opt, opt];
          }
        });
        console.warn(OPTIONS);

      const shownOPTIONS = OPTIONS.map((opt, index) => {
        if(index === 0) return opt;
        const matchedOpt = matchPartial(opt[0], "");
        return [matchedOpt, matchedOpt];
      }).filter(opt => opt[0]);
      console.warn("SHOWN", shownOPTIONS);
      const props = {editing: false, OPTIONS, shownOPTIONS, updateAutocomplete};
      console.warn("PROPS", props);
      this.appendDummyInput("FILLER")
          .appendField(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TITLE)
          .appendField(new Blockly.FieldDropdown(shownOPTIONS), 'AUTOCPLT')
      this.appendDummyInput("STRING")
          .appendField(new Blockly.FieldMultilineInput("", (exp) => {
              if(exp) {
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