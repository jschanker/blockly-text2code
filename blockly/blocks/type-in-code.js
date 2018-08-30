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
  Blockly.Blocks['code_expression'] = {
    init: function() {
      var editing = false;
      this.appendDummyInput("STRING")
          .appendField("Enter Code Expression:")
          .appendField(new Blockly.FieldTextInput("", function(exp) {
              if(exp) {
                  editing = true;
              }
          }), "EXP");
      this.setInputsInline(true);
      this.setOutput(true);
      this.setColour(60);
      this.setTooltip(Blockly.Msg.TEXT_GET_SUBSTRING_TOOLTIP);
      this.setHelpUrl(Blockly.Msg.TEXT_GET_SUBSTRING_HELPURL);
      var thisBlock = this;
      this.onchange = function(e) {
          if(editing && e.type !== Blockly.Events.CHANGE) {
            editing = false;
            console.log("Parsing", this.getFieldValue("EXP"));
            let parseTree = parseTopDown(this.getFieldValue("EXP"))[0];
            let evaluation = evaluate(parseTree);
            console.log("Parse Tree:", parseTree);
            console.log("Evaluation: ", evaluation);
            console.log(createBlocks(evaluation, thisBlock).toString());
          }
      };
    }
  };

  Blockly.Blocks['code_statement'] = {
    init: function() {
      var editing = false;
      this.appendDummyInput("STRING")
          .appendField("Enter Code Statement:")
          .appendField(new Blockly.FieldTextInput("", function(exp) {
              if(exp) {
                  editing = true;
              }
          }), "EXP");
      this.setInputsInline(true);
      this.setOutput(false);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(60);
      this.setTooltip(Blockly.Msg.TEXT_GET_SUBSTRING_TOOLTIP);
      this.setHelpUrl(Blockly.Msg.TEXT_GET_SUBSTRING_HELPURL);
      var thisBlock = this;
      this.onchange = function(e) {
          if(editing && e.type !== Blockly.Events.CHANGE) {
            editing = false;
            console.log("Parsing", this.getFieldValue("EXP"));
            let parseTree = parseTopDown(this.getFieldValue("EXP"))[0];
            let evaluation = evaluate(parseTree);
            console.log("Parse Tree:", parseTree);
            console.log("Evaluation: ", evaluation);
            console.log(createBlocks(evaluation, thisBlock).toString());
          }
      };
    }
  };
})();