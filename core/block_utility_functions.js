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

/**
 * Sets 
 * @param {!Blockly.Block} sourceBlock the source block to set the input of 
 * @param {string} inputName the name of the input for which to set the block
 * @param {!Blockly.Block} inputBlock the child block to set the input to
 */
export function setValueInput(sourceBlock, inputName, inputBlock) {
  const blockInput = sourceBlock && sourceBlock.getInput(inputName);
  const valueBlockConnection = inputBlock && inputBlock.outputConnection;
    
  if(blockInput && valueBlockConnection) {
    blockInput.connection.connect(valueBlockConnection);
  }
}

/**
 * Refreshes workspace; used to render blocks after adding new ones
 * @param {Blockly.Workspace} workspace the workspace to refresh
 */
export function refreshWorkspace(workspace) {
  Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.Xml.workspaceToDom(workspace), workspace);
  Blockly.svgResize(workspace);
}

/**
 * Sets next block of given block
 * @param {!Blockly.Block} the parent block to set its next
 * @param {!Blockly.Block} the next block
 */
export function setNextBlock(sourceBlock, nextBlock) {
  if(sourceBlock.nextConnection && nextBlock.previousConnection) {
    sourceBlock.nextConnection.connect(nextBlock.previousConnection);
  }
}

/**
 * Wrapper for workspace.newBlock that also initializes Svg
 * @param {Blockly.Workspace} workspace the workspace to add the block
 * @param {string} type the type of block to add
 * @return {Blockly.Block} the newly created Block
 */
export function newBlock(workspace, type) {
  const block = workspace.newBlock(type);
  block.initSvg();
  block.moveTo(new Blockly.utils.Coordinate(workspace.getMetrics().viewLeft, 
    workspace.getMetrics().viewTop));
  return block;
}

/**
 * Moves block from the input of one to the input of another
 * @param {!Blockly.Block} sourceBlock the block to move the child from
 * @param {!Blockly.Block} destinationBlock the block to move the child to
 * @param {string} sourceInputName the name of the input where the child block is currently
 * @param {?string} destinationInputName the name of the input where to move the block to;
 * uses the input with the same name as the source if not supplied  
 */
export function moveInputBlock(sourceBlock, destinationBlock, sourceInputName, destinationInputName) {
  const inputBlock = sourceBlock && sourceBlock.getInputTargetBlock(sourceInputName);
  destinationInputName = typeof destinationInputName === "undefined" ? 
                         sourceInputName : destinationInputName;
  setValueInput(destinationBlock, destinationInputName, inputBlock);
}

/**
 * Moves the target block to the source block's location
 * @param {!Blockly.Block} sourceBlock the block for which the target block will be moved
 * @param {!Blockly.Block} targetBlock the block to move
 */
export function moveToSameLocation(sourceBlock, targetBlock) {
  if(sourceBlock && targetBlock) {
    targetBlock.moveBy(sourceBlock.getRelativeToSurfaceXY().x - targetBlock.getRelativeToSurfaceXY().x,
      sourceBlock.getRelativeToSurfaceXY().y - targetBlock.getRelativeToSurfaceXY().y);
  }
}

/**
 * Returns all blocks that are not fully visible in the workspace
 * @param {Blockly.Workspace} workspace the workspace from which to get the blocks
 * @return {Array.<Blockly.Block>} the workspace of blocks not fully visible   
 */
export function getPartiallyVisibleBlocks(workspace) {
  const workspaceMetrics = workspace.getMetrics();
  return workspace.getAllBlocks().filter(block => {
    const blockRect = block.getBoundingRectangle();
    return blockRect.left < workspaceMetrics.viewLeft || 
      blockRect.right > workspaceMetrics.viewLeft + workspaceMetrics.viewWidth || 
      blockRect.top < workspaceMetrics.viewTop || 
      blockRect.bottom > workspaceMetrics.viewTop + workspaceMetrics.viewHeight
  });
}

/**
 * Collapse blocks that don't fit and zoom as necessary
 * @param {Blockly.Workspace} workspace the workspace from which to get the blocks   
 */
export function fitBlocksInWorkspace(workspace) {
  const codeGen = T2C.MSG.currentLanguage === T2C.MSG.PY ?
    "Python" : "JavaScript";
  getPartiallyVisibleBlocks(workspace)
    .filter(block => block.getParent() && !block.nextConnection && 
      !block.isCollapsed())
    .slice().forEach(block => {
      if(block.isDisposed()) return;
      const replaceBlock = newBlock(workspace, "code_expression");
      const codeText = Blockly[codeGen].blockToCode(block)[0] || Blockly[codeGen].blockToCode(block);
      setFieldValue(replaceBlock, codeText, "EXP");
      replaceBlock.setCollapsed(true);
      const parentInput = block.getParent().getInputWithBlock(block);
      parentInput.connection.connect(replaceBlock.outputConnection);
      block.dispose(true);
  });

  refreshWorkspace(workspace);

  if(getPartiallyVisibleBlocks(workspace).length > 0) {
    workspace.zoomToFit();
  }
}

/**
 * Copies the block with all of its current field values;
 * recursively does this for all descendants if deep is true
 * @param {!Blockly.Block} block the block to copy
 * @param {boolean} deep true exactly when making a deep copy
 * @return {Blockly.Block} the copy of the block
 */
export function copyBlock(block, deep) {
  if(!block) return null;
  const workspace = block.workspace;
  
  const blockCp = newBlock(workspace, block.type);
  block.inputList.forEach(function(input) {
    input.fieldRow.forEach(function(field) {
        setFieldValue(blockCp, field.getValue(), field.name);
    });
  });
  
  if(deep) {
    block.getChildren().slice().forEach(function(childBlock) {
      if(block.getNextBlock() !== childBlock) {
        const blockInput = block.getInputWithBlock(childBlock);
        setValueInput(blockCp, blockInput.name, copyBlock(childBlock, true));
      }
    });
  }
  
  return blockCp;
}

/**
 * Creates temporary variable name with given prefix or temp
 * @param {Blockly.Workspace} workspace the workspace to get an unused variable name
 * @param {?string} prefix the prefix to use; defaults to temp if not provided
 * @return {string} unused variable name from the workspace with the given prefix
 */
export function createNewTempVariable(workspace, prefix) {
  // get next unused temp variable name
  let tempVariableName = prefix || "temp";
  let index = 1;
  let variableNames = workspace.getAllVariableNames
    .filter(varName => varName.startsWith(tempVariableName));
  
  //while(workspace.variableIndexOf(tempVariableName + index) !== -1) { //deprecated
  while(variableNames.indexOf(tempVariableName + index) !== -1) {
    index++;
  }

  tempVariableName += index; 
  workspace.createVariable(tempVariableName, "STRING");
  return tempVariableName;
}

/**
 * Wrapper for Blockly.Block.prototype.setFieldValue to handle special case logic
 * @param {Blockly.Block} block the block for which to call setFieldValue
 * @param {string} value the value to set the field name to
 * @param {string} fieldName the name of the field to set
 */
export function setFieldValue(block, value, fieldName) {
  const workspace = block.workspace;
  let setValue = value;
  if(block.type.toLowerCase().startsWith("variables_")
    && fieldName === "VAR") { 
      setValue = workspace.getAllVariableNames().indexOf(value) === -1 ?
        workspace.createVariable(value).getId() : 
        workspace.getVariable(value).getId();
  }
  block.setFieldValue(setValue, fieldName);
}

/**
 * Returns parent of given block if it exists; returns null otherwise
 * @param {!Blockly.Block} block the block to get the parent statement of if it exists
 * @return {Blockly.Block} the parent block or null if it doesn't exist 
 */
export function getParentStatementBlock(block) {
  if(!block) return null;
  let parentBlock = block.getParent();
  while(parentBlock && !parentBlock.previousConnection) {
    parentBlock = parentBlock.getParent();
  }
  return parentBlock;
}

/**
 * Get last block in stack descended from supplied block
 * @param {Blockly.Block} rootBlock the top of the stack
 * @return {Blockly.Block} the bottom of the stack with top of rootBlock
 */

export function getLastBlock(rootBlock) {
  let lastBlock = rootBlock;

  while(!lastBlock.nextConnection && lastBlock.getParent()) {
    lastBlock = lastBlock.getParent();
  }
  while(lastBlock.getNextBlock()) {
     lastBlock = lastBlock.getNextBlock();
  }
  
  return lastBlock;
}

/**
 * Transfers each child block (and its descendants) from input of given block 
 * to input with same name of replacement block and moves replacement block to
 * given block's location and copies values of fields with same names, 
 * disposing of the old block if dispose is true
 * @param {!Blockly.Block} block the block to replace
 * @param {!Blockly.Block} replaceBlock the block to replace it by
 * @param {boolean} dispose true exactly when the block should be disposed after replacing
 */
export function replaceWithBlock(block, replaceBlock, dispose) {
  // replaceBlock.initSvg();
  const parentBlock = block.getParent();
  let parentInput = null;
  let parentConnection = null;
  let blockConnectionType = -1;
  let replaceBlockPreviousConnection = null;

  block.inputList.forEach(function(input) {
    input.fieldRow.forEach(function(field) {
      if(replaceBlock.getField(field.name)) {
        setFieldValue(replaceBlock, field.getValue(), field.name);
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
      replaceBlockPreviousConnection = replaceBlock.previousConnection;
      //parentConnection.connect(replaceBlock.previousConnection);
    }
  } else {
    replaceBlock.moveBy(block.getRelativeToSurfaceXY().x - replaceBlock.getRelativeToSurfaceXY().x,
                        block.getRelativeToSurfaceXY().y - replaceBlock.getRelativeToSurfaceXY().y);
  }
  
  block.getChildren().slice().forEach(function(childBlock) {
    if(block.getNextBlock() !== childBlock) {
      // assume the child block connection is INPUT_VALUE/OUTPUT_VALUE since it's not 
      // PREVIOUS_STATEMENT/NEXT_STATEMENT
      let blockInput = block.getInputWithBlock(childBlock);
      const replaceBlockInput = replaceBlock.getInput(blockInput.name);
      if(replaceBlockInput) {
        blockInput = replaceBlockInput.connection.connect(childBlock.outputConnection);
      }
    }
    else {
      // replaceBlock.nextConnection.connect(block.getNextBlock().previousConnection);
      // if should not be needed
      if(getLastBlock(replaceBlock).nextConnection)
      getLastBlock(replaceBlock).nextConnection.connect(childBlock.previousConnection);
    }
  });

  if(replaceBlockPreviousConnection) parentConnection.connect(replaceBlockPreviousConnection);

  if(dispose) block.dispose();
  //if(!block.type) block.dispose();
  return replaceBlock;
}