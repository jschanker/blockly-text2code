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

import {parseAndConvertToBlocks, getParseTree, handleParseTreeToBlocks} from
    '../../core/mobile.js';
import Match from '../../core/match.js';
import FeedbackManager from '../../core/feedback_manager.js';
import {newBlock, copyBlock} from '../../core/block_utility_functions.js';

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

  Blockly.Blocks['code_statement_hybrid'] = {
    init: function() {
      this.jsonInit({
        "message0": "%1 %2 %3",
        "args0": [
          {
            "type": "field_dropdown",
            "name": "MODE",
            "options": [
              ["Text Mode", 'TEXT'],
              ["Block Mode", 'BLOCK']
            ]
          },
          {
            "type": "field_input",
            "name": 'EXP'
          },
          {
            "type": "input_dummy",
            "name": "INPUT_MODE"
          }
        ]/*,
        "message1": "%1",
        "args1": [{
          "type": "input_statement",
          "name": "EXP_STATEMENT"
        }]*/,
        "inputsInline": true,
        "tooltip": T2C.MSG.currentLanguage.TYPEIN_EXPRESSION_TOOLTIP,
        "nextStatement": true,
        "previousStatement": true,
        "colour": 60,
        "mutator": "block_text_toggle",
        "helpUrl": Blockly.Msg.MATH_ARITHMETIC_HELPURL
      });
      this.onchange = Blockly.Constants.TypeIn.BLOCK_TEXT_TOGGLE_EXTENSION
          .bind(this);
      this.setInitialMaxInstances();
      this.updateWorkspaceMaxBlocksOnModeChange(true);
    },
    setMatchBlueprint: function(matchBlueprint) {
      this.matchBlueprint = matchBlueprint;
    },
    setTextMatch: function(textMatch) {
      this.textMatch = textMatch;
    },
    setTextFeedbackManager: function(feedbackManager) {
      this.feedbackManagerText = feedbackManager;
    },
    setBlockFeedbackManager: function(feedbackManager) {
      this.feedbackManagerBlock = feedbackManager;
    },
    setInitialMaxInstances: function() {
      this.initialMaxInstances = {};
      if (this.workspace.options && this.workspace.options.maxInstances) {
        const maxInstances = this.workspace.options.maxInstances;
        Object.keys(maxInstances).forEach(blockType => {
          this.initialMaxInstances[blockType] = maxInstances[blockType];
        });
      }
      console.warn("MY MAX INSTANCES", this.id, this.initialMaxInstances);
    },
    // block should keep track of max blocks for creating its mutator toolbox
    setCurrentMaxInstances: function(match) {
      const currentMaxInstances = {};
      this.initialMaxInstances = this.initialMaxInstances || {};
      this.currentMaxInstances = this.currentMaxInstances || {}; // added here
      Object.keys(this.initialMaxInstances).forEach(blockType => {
        currentMaxInstances[blockType] = this.initialMaxInstances[blockType];
      });

      if (!match) {
        // removed here
        // this.currentMaxInstances = this.currentMaxInstances || {};
        Object.keys(this.currentMaxInstances).forEach(blockType => {
          if(!currentMaxInstances[blockType]) {
            currentMaxInstances[blockType] = 0;
          }
        });
        this.currentMaxInstances = currentMaxInstances;
      } else {
        Match.getRemainingToolboxBlocks(match, this.currentMaxInstances);
      }

      if (this.updateMaxInstances) {
        this.workspace && 
            (this.workspace.options || (this.workspace.options = {})) &&
            (this.workspace.options.maxInstances = this.currentMaxInstances);

        if (this.toolboxManager) {
          Object.keys(this.currentMaxInstances).forEach(blockType => {
            if (!this.currentMaxInstances[blockType]) {
              // console.error("Removing", blockType);
              this.toolboxManager.removeToolboxBlocksWithType(blockType);
            } else if (!this.toolboxManager
                .findToolboxBlockWithType(blockType)) {
              // console.error("Adding", blockType);
              this.toolboxManager.createToolboxBlock(blockType, true);
            }
          });
        }
      }

      return this.currentMaxInstances;
      /*
      return match ?
          Match.getRemainingToolboxBlocks(match, this.currentMaxInstances) :
          this.currentMaxInstances;
      */
    },
    updateWorkspaceMaxBlocksOnModeChange: function(shouldUpdate) {
      this.updateMaxInstances = shouldUpdate;
    },
    setToolboxManager: function(tbm) {
      this.toolboxManager = tbm;
    },
    isMatchComplete: function() {
      // temporary hack, should not rely on colour of block for this
      return this.getColour() === '#008800';
    }
  };

  Blockly.Constants.TypeIn = {};
  Blockly.Constants.TypeIn.BLOCK_TEXT_TOGGLE_MIXIN = {
    /**
     * Create XML to represent whether the element is in text or block mode.
     * @return {!Element} XML storage element.
     * @this {Blockly.Block}
     */
    mutationToDom: function() {
      const container = Blockly.utils.xml.createElement('mutation');
      const isBlockMode = (this.getFieldValue('MODE') === 'BLOCK');
      container.setAttribute('is_block_mode', isBlockMode);
      return container;
    },
    /**
     * Parse XML to append statement input if in block mode
     * @param {!Element} xmlElement XML storage element.
     * @this {Blockly.Block}
     */
    domToMutation: function(xmlElement) {
      this.updateShape_(xmlElement.getAttribute('is_block_mode'));
    },

    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this {Blockly.Block}
     */
  /*
    decompose: function(workspace) {
      // placeholder container block here
      let containerBlock = newBlock(workspace, 'variables_set');
      // convert text to correct blocks if in text mode & switch to block mode
      this.updateShape_(true);

      const statementBlock = this.getInputTargetBlock('EXP_STATEMENT');
      if (statementBlock) {
        containerBlock.dispose();
        // containerBlock = copyBlock(statementBlock, true, workspace);
        containerBlock = Blockly.Xml
            .domToBlock(Blockly.Xml.blockToDom(statementBlock), workspace);
      }
    
      //const containerBlock = newBlock(workspace, 'code_statement_hybrid');
      this.updateShape_(true);

      containerBlock.setPreviousStatement(false);
      containerBlock.setNextStatement(false);
      if (!workspace.options) {
        workspace.options = {};
      }
      if (!workspace.options.maxInstances) {
        workspace.options.maxInstances = {};
      }
      // change to blocks from match
      workspace.options.maxInstances["text_print"] = 2;
      workspace.options.maxInstances["variables_get"] = 1;
      return containerBlock;
    },
  */
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this {Blockly.Block}
   */
  // saveConnections: function(containerBlock) {
    // console.warn("COPY", copyBlock(containerBlock, true))
    // return copyBlock(containerBlock, true);
  // },

  /*
    compose: function(containerBlock) {
      if(this.getFieldValue('MODE') !== 'BLOCK') {
        this.setFieldValue('BLOCK', 'MODE');
      }
      this.updateShape_(true);
      //const workspace = this.workspace; // main workspace
      this.getInputTargetBlock('EXP_STATEMENT')
          && this.getInputTargetBlock('EXP_STATEMENT').dispose();

      const workspaceContainerBlock = Blockly.Xml
          .domToBlock(Blockly.Xml.blockToDom(containerBlock), this.workspace);
      // workspaceContainerBlock.setMovable(true);
      // console.error(this.getInput('EXP_STATEMENT') === Blockly
          .getMainWorkspace().getAllBlocks()[0].getInput('EXP_STATEMENT'));
      console.error(workspaceContainerBlock);
      this.getInput('EXP_STATEMENT').connection.connect(workspaceContainerBlock
          .previousConnection);
    },
  */

    /**
     * Modify this block to add a statement input and remove the text field if
     *     switching to block mode or to remove a statement input and add the
     *     text field if switching to text mode. When switching from text to
     *     block mode, additionally, get the text match, parse the correct
     *     text and attach appropriate blocks to the statement input, 
     *     accordingly.  When switching to text mode, additionally convert
     *     blocks to textual code and use it for the text field.
     * @param {boolean} divisorInput True if this block has a divisor input.
     * @private
     * @this {Blockly.Block}
     */
    updateShape_: function(blockMode) {
      if(blockMode === 'true' || blockMode === true) {
        //this.setFieldValue("TEXT", "MODE");
        let statementBlock;
        if (this.getField('EXP') && this.matchBlueprint) {
          // duplicated in standard_match_managers
          const textMatch = Match.getMatchResult(
              this.getField('EXP'),
              {
                id: 10000,
                type: 'field',
                name: 'EXP',
                value: {
                  type: 'component',
                  name: this.matchBlueprint.value.matchManagerType,
                  value: this.matchBlueprint.value.value
                }
              }
          );
        // if (this.getField('EXP') && this.textMatch) {
          //const parseTree = getParseTree(this.getFieldValue('EXP'));
          //console.error(this.getField)
          //this.setFieldValue('TEXT', 'MODE'); // hack to toggle text match
          //const textMatch = Match.getMatchResult(this, this.matchBlueprint);
          //this.setFieldValue('BLOCK', 'MODE'); // restore
          const textMatchStr = Match.getTextToParseFromMatch(textMatch);
          const partialTextMatchStr =
              Match.getTextToParseFromMatch(textMatch, true);
          // console.error("Text Match", textMatchStr, typeof textMatchStr);
          const paddedTextMatches = [partialTextMatchStr, textMatchStr]
              .map(s => [s, s + ')', s + '\'', s + '"', s + '\')', s + '")'])
              .flat();
          // console.error("Padded Text Matches", paddedTextMatches);
          const parseTreeTextMatch = paddedTextMatches.find(paddedTextMatch =>
              getParseTree(paddedTextMatch));
          const parseTree = getParseTree(parseTreeTextMatch || '');
          // console.error("Parse Tree", parseTree);
          statementBlock = parseTree ? handleParseTreeToBlocks(parseTree,
              newBlock(this.workspace, 'text_print'), false) : "";
          this.matchBlueprint.value.value.textMode = false;
            // duplicated in standard_match_managers
            const blockMatch = Match.getMatchResult(
                statementBlock,
                {
                  id: -1,
                  type: 'component',
                  name: this.matchBlueprint.value.matchManagerType,
                  value: this.matchBlueprint.value.value
                }
            );

          if (parseTree) {
            this.setCurrentMaxInstances(blockMatch);
            const correctBlocks = blockMatch.filter(matchItem => 
                matchItem.match instanceof Blockly.Block)
                .map(matchItem => matchItem.match);

            console.warn("Match and blocks", blockMatch, correctBlocks);
/*
            correctBlocks.forEach(block => {
              this.currentMaxInstances[block.type] = 
                ++this.currentMaxInstances[block.type] || 1;
            });
*/
            statementBlock.getDescendants().forEach(block => {
              //if(block.type === 'code_expression') {
              //  block.dispose(false);
              //}
              if (correctBlocks.indexOf(block) === -1) {
                block.dispose(true);
              } else {
                this.currentMaxInstances[block.type] = 
                    ++this.currentMaxInstances[block.type] || 1;                
              }
            });
            this.workspace.render();
          }
          // this.setCurrentMaxInstances(blockMatch);
        }
        if(this.getField('EXP')) {
          // mode switched but, for no match blueprint yet
          this.getInput('INPUT_MODE').removeField('EXP');
        }
        if (!this.getInput('EXP_STATEMENT')) {
          this.appendStatementInput('EXP_STATEMENT');
          if (statementBlock && statementBlock.previousConnection) {
            this.getInput('EXP_STATEMENT').connection.connect(
                statementBlock.previousConnection);
            // statementBlock.setMovable(false);
          } else if (statementBlock) {
            statementBlock.dispose();
          }
        }
      } else {
        let s = '';
        this.setCurrentMaxInstances();
        //this.setFieldValue('BLOCK', 'MODE');
        if (this.getInput('EXP_STATEMENT')) {
          const statementBlock = this.getInputTargetBlock('EXP_STATEMENT');
          if (statementBlock) {
            // remove comments so they don't pollute textual code
            statementBlock.getDescendants().forEach(block => {
              block.setCommentText('');
              block.setCommentText(null);
            });
            s = Blockly.JavaScript.blockToCode(statementBlock);
            statementBlock.dispose(); // remove block after conversion
            //s = statementBlock.toString().replace(/“|”/g, '"')
            //    .replace("(?)", "('')");
            if (this.matchBlueprint) {
              // duplicated in standard_match_managers
              this.matchBlueprint.value.value.textMode = true;
              /*
              // hack-y to create field here for purpose of matching s
              const tempField = new Blockly.Field(s);
              tempField.name = 'TEMP';
              const textMatch = Match.getMatchResult(
                  tempField,
                  {
                    id: 10000,
                    type: 'field',
                    name: 'TEMP',
                    value: {
                      type: 'component',
                      name: this.matchBlueprint.value.matchManagerType,
                      value: this.matchBlueprint.value.value
                    }
                  }
              );
              */
              let tryS = s;
              do {
                const textMatch = Match.getMatchResult(
                  s,
                  {
                    type: 'component',
                    name: this.matchBlueprint.value.matchManagerType,
                    value: this.matchBlueprint.value.value
                  }
                );

                console.warn('Text Match', textMatch, 'S', s, 'TRY S', tryS);
                tryS = Match.getTextToParseFromMatch(textMatch, true);
                // peel off final characters until match has no errors
              } while (tryS !== s && (s = s.substring(0, s.length-1)) !== '');
            }
          }
          this.removeInput('EXP_STATEMENT');
        }
        if(!this.getField('EXP')) {
          this.getInput('INPUT_MODE')
              .appendField(new Blockly.FieldTextInput(s/*.split("\n")
              .filter(line => !line.startsWith('//')).join('\n')*/, () => {

              }), 'EXP');
        }
      }
    }
  };

  /**
   * 'code_statement_hybrid_mutator' extension to the 'code_statement_hybrid'
   *     block that can update the block shape/set appropriate attached statement
   *     blocks/field text value based on whether mode is "BLOCK" or "TEXT".
   * @this {Blockly.Block}
   */
  Blockly.Constants.TypeIn.BLOCK_TEXT_TOGGLE_EXTENSION = function(event) {
    // Change to text mode when bubble is closed
    // MUTATOR DIALOG NOT CURRENTLY USED
    if (event.element === 'mutatorOpen' && !event.newValue || // used version
       event.type === 'bubble_open' && !event.isOpen) { // current version
      this.setFieldValue('TEXT', 'MODE');
      this.updateShape_(false);
      // console.error('SHOULD NOT REACH THIS NOW!');
      //console.error(this.getInputTargetBlock('EXP_STATEMENT').toString());
    }
    this.getField('MODE').setValidator(function(option) {
      this.getSourceBlock().updateShape_((option === 'BLOCK'));
    });

    if(event.element === 'workspaceClick' || // used version
        event.targetType === 'workspace') { // current version
      if (this.isMatchComplete()) {
        // Convert to statement block, and replace block with this result
        this.setFieldValue('BLOCK', 'MODE');
        this.updateShape_(true);
        const previousBlock = this.getPreviousBlock();
        const nextBlock = this.getNextBlock();
        const statementBlock = this.getInputTargetBlock('EXP_STATEMENT');
        if (statementBlock) {
          statementBlock.unplug();
          if (previousBlock && statementBlock.previousConnection) {
            statementBlock.previousConnection.connect(
                previousBlock.nextConnection);
          }
          if (nextBlock && statementBlock.nextConnection) {
            statementBlock.nextConnection.connect(
                nextBlock.previousConnection);
          }
        }
        this.dispose();
      } else if (this.getFieldValue('MODE') === 'TEXT' &&
          this.matchBlueprint && this.getField('EXP')) {
          let s = this.getFieldValue('EXP') || '';
          let tryS = s;
          do {
            const textMatch = Match.getMatchResult(
                s,
                {
                  type: 'component',
                  name: this.matchBlueprint.value.matchManagerType,
                  value: this.matchBlueprint.value.value
                }
            );

            console.warn('Text Match', textMatch, 'S', s, 'TRY S', tryS);
            tryS = Match.getTextToParseFromMatch(textMatch, true);
            // peel off final characters until match has no errors
          } while (tryS !== s && (s = s.substring(0, s.length-1)) !== '');

        this.setFieldValue(s, 'EXP');
      }
    }

    // TODO: The below feedback generation, this method in general, AND 
    //     updateShape_ are in desperate need of refactoring!
    if (this.matchBlueprint) {
      const match = Match.getMatchResult(this, this.matchBlueprint);
      if (this.getFieldValue('MODE') === 'TEXT' && this.feedbackManagerText) {
        FeedbackManager.displayFeedback(match,
            T2C.FeedbackManagers['code_statement_hybrid'].feedbackJsonBlock,
            this.feedbackManagerText);
      } else if (this.getFieldValue('MODE') === 'BLOCK' &&
          this.feedbackManagerBlock) {
        FeedbackManager.displayFeedback(match,
            this.feedbackManagerBlock.feedbackManager,
            this.feedbackManagerBlock);
      }
    }
  };

  // Blockly.Extensions.registerMixin('block_text_toggle',
  //     Blockly.Constants.TypeIn.BLOCK_TEXT_TOGGLE_MIXIN,
  //     Blockly.Constants.TypeIn.BLOCK_TEXT_TOGGLE_EXTENSION);

  Blockly.Extensions.registerMutator('block_text_toggle',
      Blockly.Constants.TypeIn.BLOCK_TEXT_TOGGLE_MIXIN, null,
      ['variables_set', 'text_print', 'text_input', 'text', 'math_number',
      't2c_text_join']);
})();