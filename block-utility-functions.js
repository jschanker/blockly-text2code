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
 * @fileoverview Functions for creating, copying, replacing, and getting the
 * parent of blocks.  Also for creating new temporary variables.
 * Used for creating blocks from typed in code and for converting from
 * Text2Code to JavaScript blocks.
 * @author Jason Schanker
 */

function setValueInput(sourceBlock, inputName, inputBlock) {
    var blockInput = sourceBlock && sourceBlock.getInput(inputName);
    var valueBlockConnection = inputBlock && inputBlock.outputConnection;
    
    if(blockInput && valueBlockConnection) {
      blockInput.connection.connect(valueBlockConnection);
    }
}

// The following is in the updated version of Blockly as of 5/19/20:
// https://github.com/google/blockly/blob/master/core/block.js#L603
/**
 * Return the previous statement block directly connected to this block.
 * @return {Blockly.Block} The previous statement block or null.
 */
Blockly.Block.prototype.getPreviousBlock = function() {
  return this.previousConnection && this.previousConnection.targetBlock();
};

function setNextBlock(sourceBlock, nextBlock) {
  if(sourceBlock.nextConnection && nextBlock.previousConnection) {
    sourceBlock.nextConnection.connect(nextBlock.previousConnection);
  }
}

function moveInputBlock(sourceBlock, destinationBlock, sourceInputName, destinationInputName) {
  var inputBlock = sourceBlock && sourceBlock.getInputTargetBlock(sourceInputName);
  destinationInputName = typeof destinationInputName === "undefined" ? 
                         sourceInputName : destinationInputName;
  setValueInput(destinationBlock, destinationInputName, inputBlock);
}

function moveToSameLocation(sourceBlock, targetBlock) {
    if(sourceBlock && targetBlock) {
      targetBlock.moveBy(sourceBlock.getRelativeToSurfaceXY().x - targetBlock.getRelativeToSurfaceXY().x,
                         sourceBlock.getRelativeToSurfaceXY().y - targetBlock.getRelativeToSurfaceXY().y);
    }
}

function copyBlock(block, deep) {
  if(!block) return null;
  
  var blockCp = workspace.newBlock(block.type);
  block.inputList.forEach(function(input) {
    input.fieldRow.forEach(function(field) {
        blockCp.setFieldValue(field.getValue(), field.name);
    });
  });
  
  if(deep) {
    block.getChildren().slice().forEach(function(childBlock) {
      if(block.getNextBlock() !== childBlock) {
        var blockInput = block.getInputWithBlock(childBlock);
        setValueInput(blockCp, blockInput.name, copyBlock(childBlock, true));
      }
    });
  }
  
  return blockCp;
}

function createNewTempVariable(prefix) {
  // get next unused temp variable name
  var tempVariableName = prefix || "temp";
  var index = 1;
  
  while(workspace.variableIndexOf(tempVariableName + index) !== -1) { //deprecated
    index++;
  }
  tempVariableName += index; 
  workspace.createVariable(tempVariableName, "STRING");
  return tempVariableName;
}

function getParentStatementBlock(block) {
  if(!block) return null;
  var parentBlock = block.getParent();
  while(parentBlock && !parentBlock.previousConnection) {
    parentBlock = parentBlock.getParent();
  }
  return parentBlock;
}

function replaceWithBlock(block, replaceBlock, dispose) {
  var parentBlock = block.getParent();
  var parentInput = null;
  var parentConnection = null;
  var blockConnectionType = -1;

  block.inputList.forEach(function(input) {
    input.fieldRow.forEach(function(field) {
      if(replaceBlock.getField(field.name)) {
        replaceBlock.setFieldValue(field.getValue(), field.name);
      }
    });
  });
  
  if(parentBlock) {
    parentInput = parentBlock.getInputWithBlock(block);
    parentConnection = parentInput ? parentInput.connection : parentBlock.nextConnection;
    blockConnectionType = parentConnection.targetConnection.type;
    if(blockConnectionType === Blockly.OUTPUT_VALUE) {
      parentConnection.connect(replaceBlock.outputConnection);
    }
    else if(blockConnectionType === Blockly.PREVIOUS_STATEMENT) {
      parentConnection.connect(replaceBlock.previousConnection);
    }
  } else {
    replaceBlock.moveBy(block.getRelativeToSurfaceXY().x - replaceBlock.getRelativeToSurfaceXY().x,
                        block.getRelativeToSurfaceXY().y - replaceBlock.getRelativeToSurfaceXY().y);
  }
  
  block.getChildren().slice().forEach(function(childBlock) {
    if(block.getNextBlock() !== childBlock) {
      // assume the child block connection is INPUT_VALUE/OUTPUT_VALUE since it's not 
      // PREVIOUS_STATEMENT/NEXT_STATEMENT
      var blockInput = block.getInputWithBlock(childBlock);
      var replaceBlockInput = replaceBlock.getInput(blockInput.name);
      if(replaceBlockInput) {
        blockInput = replaceBlockInput.connection.connect(childBlock.outputConnection);
      }
    }
    else {
      replaceBlock.nextConnection.connect(block.getNextBlock().previousConnection);
    }
  });

  if(dispose) block.dispose();
  return replaceBlock;
}