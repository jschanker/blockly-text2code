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
 * @fileoverview Uses blueprint from parse tree and creates blocks from it
 * @author Jason Schanker
 */

"use strict";
import BlockBlueprint from "./block_blueprint.js";
//import {shared} from "./index.js";
//import "./block_utility_functions.js";
import {setNextBlock, replaceWithBlock, setValueInput, setFieldValue, 
  newBlock, refreshWorkspace} from "./block_utility_functions.js";

function createBlocks_(blocksBlueprint, workspace) {
  var block;
  if(blocksBlueprint && blocksBlueprint.type) {
    block = newBlock(workspace, blocksBlueprint.type);
    if(blocksBlueprint.inputs) {
      Object.keys(blocksBlueprint.inputs).forEach(function(blockInputName) {
        setValueInput(block, blockInputName, 
          createBlocks_(blocksBlueprint.inputs[blockInputName], workspace));
      });
    }
    if(blocksBlueprint && blocksBlueprint.fields) {
      Object.keys(blocksBlueprint.fields).forEach(function(blockFieldName) {
        setFieldValue(block, blocksBlueprint.fields[blockFieldName], blockFieldName);
      });         
    }

    return block;
  }
  else if(blocksBlueprint && Array.isArray(blocksBlueprint.blocks)) {
    var blocks = blocksBlueprint.blocks.map(b => createBlocks_(b, workspace));
    for(var i = 0; i < blocks.length-1; i++) {
      if(!blocks[i].getNextBlock() && !blocks[i+1].getPreviousBlock()) {
        setNextBlock(blocks[i], blocks[i+1]);
      }
    }
    return blocks[0];
  }
}

/**
 * Creates blocks with given BlockBlueprint, replacing given block from workspace
 * @param {BlockBlueprint} blocksBluePrint the blueprint of the block to use for 
 * creating the new blocks
 * @param {Blockly.Block} codeBlockToReplace the block in the workspace to replace
 * @param {boolean} refresh true if workspace should be refreshed after creating block;
 * if true, the returned block will not be in the workspace
 * @returns {Blockly.Block} the replacing block 
 */

function createBlocks(blocksBlueprint, codeBlockToReplace, refresh=true) {
  const workspace = codeBlockToReplace.workspace;
  const block = createBlocks_(blocksBlueprint, workspace);
  
  replaceWithBlock(codeBlockToReplace, block, true);  
  
  // refresh workspace to render new blocks
  if(refresh) refreshWorkspace(workspace);

  return block;
};

export default createBlocks;
