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
(function() {
  // ISSUES: After entering syntactically incorrect code and dismissing alert, block is dragged around
  //         Also need to fix grammar: display interpreted as variable and display("") not registered as valid
  var parseAndConvertToBlocks = function(props, e) {
    if(props.editing && e.type !== Blockly.Events.CHANGE) {
      props.editing = false;
      const displayLog = console.log;
      console.log = console.realLog; // temporarily reset for debugging
      console.log("Parsing", this.getFieldValue("EXP"));
      //let parseTree = parseTopDown(this.getFieldValue("EXP"))[0];
      const parseTree = shared.parser.parseBottomUpCYK(this.getFieldValue("EXP"), 
        shared.parseTreeBlockConnector)[0];
      //if(parseTree) console.log(createBlocks(evaluation, thisBlock).toString());
      if(parseTree) {
        const evaluation = shared.evaluator.evaluate(parseTree);
        console.log("Parse Tree:", parseTree);
        console.log("Evaluation: ", evaluation);
        console.log(createBlocks(evaluation, this).toString());
      }
      else alert("There seems to be a problem with the code you entered.  Check that your spelling is correct, that you use lowercase and capital letters as required, that every open parenthesis ( has a matching closed one ), that you use quotation marks as needed, and other potential issues with syntax.");
      console.log = displayLog; // restore
    }
  };
  Blockly.Blocks['code_expression'] = {
    init: function() {
      var props = {editing: false};
      this.appendDummyInput("STRING")
          .appendField(T2C.MSG.currentLanguage.TYPEIN_EXPRESSION_TITLE)
          .appendField(new Blockly.FieldTextInput("", function(exp) {
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
      var props = {editing: false};
      this.appendDummyInput("STRING")
          .appendField(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TITLE)
          .appendField(new Blockly.FieldTextInput("", function(exp) {
              if(exp) {
                  props.editing = true;
              }
          }), "EXP");
      this.setInputsInline(true);
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