/**
 * Copyright 2021 Text2Code Authors
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
 * @fileoverview Class for managing blocks in toolbox 
 * @author Jason Schanker
 */

class ToolboxManager {
  constructor(workspace) {
    this.workspace_ = workspace || Blocky.getMainWorkspace();
    this.toolboxBlocks_ = [];
    this.toolBoxDOM_ = document.getElementById("toolbox"); 
  }

  createBlockWithType_(blockType) {
    const block = document.createElement("block");
    block.setAttribute("type", blockType);
    return block;
  }

  clearToolbox() {
    Array.from(this.toolBoxDOM_.children).forEach(x => x.remove());
    this.workspace_.options.maxInstances = {};
    this.workspace_.updateToolbox(document.getElementById("toolbox"));
    this.toolboxBlocks_ = [];
  }

  createToolboxBlock(blockType, prepend=true) {
    const block = this.createBlockWithType_(blockType);
    if(prepend) {
      document.getElementById("toolbox").prepend(block);
      this.toolboxBlocks_.unshift(block);
    } else {
      document.getElementById("toolbox").append(block);
      this.toolboxBlocks_.push(block);
    }
    //if(update)
    this.workspace_.updateToolbox(document.getElementById("toolbox"));
    return block;
  }

  setToolboxBlockFieldValue(block, fieldName, fieldValue) {
    const field = document.createElement("field");
    field.setAttribute("name", fieldName);
    field.appendChild(document.createTextNode(fieldValue));
    block.appendChild(field);
  }

  setToolboxBlockInputValue(block, inputName, inputValueBlock) {
    const inputVal = document.createElement("value");
    inputVal.setAttribute("name", inputName)
    inputVal.appendChild(inputValueBlock);
    block.appendChild(inputVal);
  }

  removeToolboxBlocks(conditionFunc) {
    const removeBlockBooleans = this.toolBoxBlocks_.map(conditionFunc);
    removeBlockBooleans.forEach((doRemove, index) => {
      if(doRemove) this.toolboxBlocks_[index].remove();
    });
    this.toolBoxBlocks_ = 
      this.toolboxBlocks_.filter((_, index) => !removeBlockBooleans[index]);
    this.workspace_.updateToolbox(document.getElementById("toolbox"));
    return block;
  }
}

export default ToolboxManager;