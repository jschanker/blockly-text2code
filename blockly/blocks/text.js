/**
 * @license
 * Visual Blocks Editor
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
 * @fileoverview Text blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 * Modified significantly by Jason Schanker to use new/different blocks
 */

Blockly.Blocks['text_print'] = {
  /**
   * Block for print statement.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": "display(%1);",
      "args0": [
        {
          "type": "input_value",
          "name": "TEXT"
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": Blockly.Blocks.texts.HUE,
      "tooltip": Blockly.Msg.TEXT_PRINT_TOOLTIP,
      "helpUrl": Blockly.Msg.TEXT_PRINT_HELPURL
    });
  }
};

Blockly.Blocks['js_text_print'] = {
  /**
   * Block for print statement.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": "console.log(%1);",
      "args0": [
        {
          "type": "input_value",
          "name": "TEXT"
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": Blockly.Blocks.texts.HUE,
      "tooltip": Blockly.Msg.TEXT_PRINT_TOOLTIP,
      "helpUrl": Blockly.Msg.TEXT_PRINT_HELPURL
    });
  }
};

Blockly.Blocks['text_input'] = {
  init: function() {
    this.jsonInit({
      "message0": "getInputByAsking(%1)",
      "args0": [
        {
          "type": "input_value",
          "name": "TEXT",
          "check": "String"
        }
      ],
      "output": "String",
      "colour": Blockly.Blocks.texts.HUE,
      "tooltip": Blockly.Msg.TEXT_PROMPT_TOOLTIP_TEXT,
      "helpUrl": Blockly.Msg.TEXT_PROMPT_HELPURL
    });
  }
};

Blockly.Blocks['js_text_input'] = {
  init: function() {
    this.jsonInit({
      "message0": "prompt(%1)",
      "args0": [
        {
          "type": "input_value",
          "name": "TEXT",
          "check": "String"
        }
      ],
      "output": "String",
      "colour": Blockly.Blocks.texts.HUE,
      "tooltip": Blockly.Msg.TEXT_PROMPT_TOOLTIP_TEXT,
      "helpUrl": Blockly.Msg.TEXT_PROMPT_HELPURL
    });
  }
};

Blockly.Blocks['t2c_text_join'] = {
  /**
   * Block for string concatenation.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": "%1 + %2",
      "args0": [
        {
          "type": "input_value",
          "name": "A",
          "check": "String"
        },
        {
          "type": "input_value",
          "name": "B",
          "check": "String"
        }
      ],
      "inputsInline": true,
      "output": "String",
      "colour": Blockly.Blocks.texts.HUE,
      "tooltip": "join together text",
      "helpUrl": ""
    });
  }
};

Blockly.Blocks['t2c_text_indexof'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("String");
    this.appendValueInput("FIND")
        .setCheck("String")
        .appendField(".positionNumberOfTEXT(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip(Blockly.Msg.TEXT_INDEXOF_TOOLTIP.replace("%1", 0));
    this.setHelpUrl(Blockly.Msg.TEXT_INDEXOF_HELPURL);
  }
};

Blockly.Blocks['js_text_indexof'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("String");
    this.appendValueInput("FIND")
        .setCheck("String")
        .appendField(".indexOf(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip(Blockly.Msg.TEXT_INDEXOF_TOOLTIP.replace("%1", 0));
    this.setHelpUrl(Blockly.Msg.TEXT_INDEXOF_HELPURL);
  }
};

Blockly.Blocks['t2c_text_charat'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("String");
    this.appendValueInput("AT")
        .setCheck("Number")
        .appendField(".getCharacterNUMBER(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip(Blockly.Msg.TEXT_CHARAT_FROM_START);
    this.setHelpUrl(Blockly.Msg.TEXT_CHARAT_HELPURL);
  }
};

Blockly.Blocks['t2c_text_getsubstring'] = {
  init: function() {
    this.appendValueInput("STRING")
        .setCheck("String");
    this.appendValueInput("AT1")
        .setCheck("Number")
        .appendField(".getTextFromPositionNUMBER(");
    this.appendValueInput("AT2")
        .setCheck("Number")
        .appendField(").toPositionNUMBER(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip(Blockly.Msg.TEXT_GET_SUBSTRING_TOOLTIP);
    this.setHelpUrl(Blockly.Msg.TEXT_GET_SUBSTRING_HELPURL);
  }
};

Blockly.Blocks['t2c_text_after'] = {
  init: function() {
    this.appendValueInput("TEXT")
        .setCheck("String")
    this.appendValueInput("SUB")
        .setCheck("String")
        .appendField(".getAfterTEXT(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip('returns all text appearing after second text in the first text');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['t2c_text_before'] = {
  init: function() {
    this.appendValueInput("TEXT")
        .setCheck("String")
    this.appendValueInput("SUB")
        .setCheck("String")
        .appendField(".getBeforeTEXT(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip('returns all text appearing before second text in the first text');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['js_text_charat'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("String");
    this.appendValueInput("AT")
        .setCheck("Number")
        .appendField(".charAt(");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip(Blockly.Msg.TEXT_CHARAT_FROM_START);
    this.setHelpUrl(Blockly.Msg.TEXT_CHARAT_HELPURL);
  }
};

Blockly.Blocks['js_text_getsubstring'] = {
  init: function() {
    this.appendValueInput("STRING")
        .setCheck("String");
    this.appendValueInput("AT1")
        .setCheck("Number")
        .appendField(".substring(");
    this.appendValueInput("AT2")
        .setCheck("Number")
        .appendField(", ");
    this.appendDummyInput()
        .appendField(")");
    this.setInputsInline(true);
    this.setOutput(true, "String");
    this.setColour(Blockly.Blocks.texts.HUE);
    this.setTooltip(Blockly.Msg.TEXT_GET_SUBSTRING_TOOLTIP);
    this.setHelpUrl(Blockly.Msg.TEXT_GET_SUBSTRING_HELPURL);
  }
};