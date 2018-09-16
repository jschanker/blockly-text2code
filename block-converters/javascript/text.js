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
 * @fileoverview Converts Text2Code text block to pure JavaScript block
 * @author Jason Schanker
 */

function convertTextBlocksToJSBlocks(block) {
	if(block.type === "text_print") replaceWithBlock(block, workspace.newBlock("js_text_print"), true);
	else if(block.type === "text_input") replaceWithBlock(block, workspace.newBlock("js_text_input"), true);
	else if(block.type === "t2c_text_indexof") {
		var plusBlock = workspace.newBlock("math_arithmetic_basic");
		var numberOneBlock = workspace.newBlock("math_number");
		numberOneBlock.setFieldValue(1, "NUM");
		plusBlock.setFieldValue('ADD', "OP");
		if(block.outputConnection.targetConnection) {
	    block.outputConnection.targetConnection.connect(plusBlock.outputConnection);
	  } else {
	    moveToSameLocation(block, plusBlock);
	  }
		setValueInput(plusBlock, "A", block);
		setValueInput(plusBlock, "B", numberOneBlock);
		replaceWithBlock(block, workspace.newBlock("js_text_indexof"), true);
	}
	else if(block.type === "t2c_text_charat") {
		var atBlock = block.getInputTargetBlock("AT");
		// adjust for indices starting at 0 instead of 1
    if(atBlock && (atBlock.type === "math_number")) {
      atBlock.setFieldValue(atBlock.getFieldValue("NUM")-1, "NUM");
    }
    else if(atBlock) {
      var minusBlock = workspace.newBlock("math_arithmetic_basic");
      var numberOneBlock = workspace.newBlock("math_number");
      numberOneBlock.setFieldValue(1, "NUM");
      minusBlock.setFieldValue('MINUS', "OP");
      setValueInput(minusBlock, "A", atBlock);
      setValueInput(minusBlock, "B", numberOneBlock);
      setValueInput(block, "AT", minusBlock);
      //minusBlock.getInput("A").connection.connect(atBlock.outputConnection);
      //minusBlock.getInput("B").connection.connect(numberOneBlock.outputConnection);
      //block.getInput("AT").connection.connect(minusBlock.outputConnection);
		}
	  replaceWithBlock(block, workspace.newBlock("js_text_charat"), true);
	}
	else if(block.type === "t2c_text_getsubstring") {
	  var atBlock = block.getInputTargetBlock("AT1");
	  if(atBlock && atBlock.type === "math_number") {
	    atBlock.setFieldValue(atBlock.getFieldValue("NUM")-1, "NUM");
	  }
	  else if(atBlock) {
	    var minusBlock = workspace.newBlock("math_arithmetic_basic");
	    var numberOneBlock = workspace.newBlock("math_number");
	    numberOneBlock.setFieldValue(1, "NUM");
	    minusBlock.setFieldValue('MINUS', "OP");
	    minusBlock.getInput("A").connection.connect(atBlock.outputConnection);
	    minusBlock.getInput("B").connection.connect(numberOneBlock.outputConnection);
	    block.getInput("AT1").connection.connect(minusBlock.outputConnection);
	  }
	  block.type = "js_text_getsubstring";
	}

	else if(block.type === "t2c_text_before") {
	  var needleBlock = block.getInputTargetBlock("SUB");
	  var textBlock = block.getInputTargetBlock("TEXT");
	  var textBlockCp = null;
	  var substringBlock = workspace.newBlock("js_text_getsubstring");
	  var startBlock = workspace.newBlock("math_number");
	  var indexOfBlock = workspace.newBlock("js_text_indexof");
	              
	  startBlock.setFieldValue(0, "NUM");
	              
	  if(textBlock) {
	    if(textBlock.type === "text") {
	      textBlockCp = workspace.newBlock(textBlock.type);
	      textBlockCp.setFieldValue(textBlock.getFieldValue("TEXT"), "TEXT");
	                  
	      indexOfBlock.getInput("VALUE").connection.connect(textBlockCp.outputConnection);
	      substringBlock.getInput("STRING").connection.connect(textBlock.outputConnection);
	    }
	    else if(textBlock.type === "variables_get") {
	      textBlockCp = workspace.newBlock(textBlock.type);
	      textBlockCp.setFieldValue(textBlock.getFieldValue("VAR"), "VAR");
	                  
	      indexOfBlock.getInput("VALUE").connection.connect(textBlockCp.outputConnection);
	      substringBlock.getInput("STRING").connection.connect(textBlock.outputConnection);
	    }
	    else {
	      // Blockly.Workspace.prototype.createVariable = function(name, opt_type, opt_id)
	      //var tempVariableName = Blockly.Variables.generateUniqueName(workspace);
	                    
	      // get next unused temp variable name
	      var tempVariableName = createNewTempVariable();
	      var setBlock = workspace.newBlock("variables_set");
	      setBlock.setFieldValue(tempVariableName, "VAR");
	      setValueInput(setBlock, "VALUE", textBlock);
	                    
	      var tempVariableBlock = workspace.newBlock("variables_get");
	      tempVariableBlock.setFieldValue(tempVariableName, "VAR");
	      var tempVariableBlockCp = copyBlock(tempVariableBlock);
	      setValueInput(indexOfBlock, "VALUE", tempVariableBlockCp);
	      setValueInput(substringBlock, "STRING", tempVariableBlock);
	                    
	      // insert variable initialization before statement block using getBeforeText value
	      var parentStatementBlock = getParentStatementBlock(block);
	      if(parentStatementBlock) {
	        var previousBlock = parentStatementBlock.previousConnection.targetBlock();
	        if(previousBlock) {
	          setBlock.previousConnection.connect(previousBlock.nextConnection);
	        }
	        parentStatementBlock.previousConnection.connect(setBlock.nextConnection);
	      }
	    }
	  }
	              
	  if(needleBlock) setValueInput(indexOfBlock, "FIND", needleBlock);
	  setValueInput(substringBlock, "AT1", startBlock);
	  setValueInput(substringBlock, "AT2", indexOfBlock);
	  if(block.outputConnection.targetConnection) block.outputConnection.targetConnection.connect(substringBlock.outputConnection);
	  else moveToSameLocation(block, substringBlock);
	  block.dispose();
	}

	else if(block.type === "t2c_text_after") {
	  var parentBlock = block.getParent();
	  var substringBlock = workspace.newBlock("js_text_getsubstring");
	  var textBlock = block.getInputTargetBlock("TEXT");
	  var needleBlock = block.getInputTargetBlock("SUB");
	  var indexOfBlock = workspace.newBlock("js_text_indexof");
	  var textLengthBlock = workspace.newBlock("text_length");
	  var needleLengthBlock = workspace.newBlock("text_length");
	  var plusBlock = workspace.newBlock("math_arithmetic_basic");
	  plusBlock.setFieldValue('ADD', "OP"); 
	  
	  if(textBlock) {
	    if(textBlock.type !== "text" && textBlock.type !== "variables_get") {
	      var textVariableSetBlock = workspace.newBlock("variables_set");
	      var tempVariableName = createNewTempVariable();
	      textVariableSetBlock.setFieldValue(tempVariableName, "VAR");
	      setValueInput(textVariableSetBlock, "VALUE", textBlock);
	      // append before statement
	      var parentStatementBlock = getParentStatementBlock(block);
	      if(parentStatementBlock) {
	        var previousStatementBlock = parentStatementBlock.previousConnection.targetBlock();
	        if(previousStatementBlock) { 
	          textVariableSetBlock.previousConnection.connect(previousStatementBlock.nextConnection);
	        }
	        parentStatementBlock.previousConnection.connect(textVariableSetBlock.nextConnection);
	      }
	      //setValueInput(block, "TEXT", workspace.newBlock(""));
	      textBlock = workspace.newBlock("variables_get");
	      textBlock.setFieldValue(tempVariableName, "VAR");
	      setValueInput(substringBlock, "STRING", textBlock);
	    }
	    else {
	      setValueInput(substringBlock, "STRING", textBlock);
	    }
	    setValueInput(indexOfBlock, "VALUE", copyBlock(textBlock));
	    setValueInput(textLengthBlock, "VALUE", copyBlock(textBlock));
	  }
	  
	  if(needleBlock) {
	    if(needleBlock.type !== "text" && needleBlock.type !== "variables_get") {
	      var needleVariableSetBlock = workspace.newBlock("variables_set");
	      var tempVariableNeedleName = createNewTempVariable();
	      needleVariableSetBlock.setFieldValue(tempVariableNeedleName, "VAR");
	      setValueInput(needleVariableSetBlock, "VALUE", needleBlock);
	      // append before statement
	      var parentStatementBlock2 = getParentStatementBlock(block);
	      if(parentStatementBlock2) {
	        var previousStatementBlock2 = parentStatementBlock2.previousConnection.targetBlock();
	        if(previousStatementBlock2) { 
	          needleVariableSetBlock.previousConnection.connect(previousStatementBlock2.nextConnection);
	        }
	        parentStatementBlock2.previousConnection.connect(needleVariableSetBlock.nextConnection);
	      }
	      //setValueInput(block, "TEXT", workspace.newBlock(""));
	      needleBlock = workspace.newBlock("variables_get");
	      needleBlock.setFieldValue(tempVariableNeedleName, "VAR");
	    }
	    if(needleBlock.type === "variables_get") {
	      setValueInput(plusBlock, "B", needleLengthBlock);
	      setValueInput(needleLengthBlock, "VALUE", copyBlock(needleBlock));
	    } else {
	      var lengthNumberBlock = workspace.newBlock("math_number");
	      lengthNumberBlock.setFieldValue(needleBlock.getFieldValue("TEXT").length, "NUM");
	      setValueInput(plusBlock, "B", lengthNumberBlock);
	      needleLengthBlock.dispose();
	    }
	    setValueInput(indexOfBlock, "FIND", needleBlock);
	  } else {
	    setValueInput(plusBlock, "B", needleLengthBlock);              
	  }
	  setValueInput(plusBlock, "A", indexOfBlock);
	  setValueInput(substringBlock, "AT1", plusBlock);
	  setValueInput(substringBlock, "AT2", textLengthBlock);

	  //setValueInput(block.getParent(), substringBlock); -- need to replace below
	  if(block.outputConnection.targetConnection) {
	    block.outputConnection.targetConnection.connect(substringBlock.outputConnection);
	  } else {
	    moveToSameLocation(block, substringBlock);
	  }
	  block.dispose();
	}
}
