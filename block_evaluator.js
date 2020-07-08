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
 * @fileoverview Interprets parse tree and produces object with blueprint
 * data for corresponding blocks
 * @author Jason Schanker
 */

"use strict";
import ParseTreeBlockNode from "./parse_tree_block_node.js";
import BlockBlueprint from "./block_blueprint.js";

/**
 * DESCRIPTION
 */
class BlockEvaluator {
  /**
   * constructor
   * @param {Object} blockInterpretations
   */
  constructor(blockInterpretations) {
    this.interpretations_ = blockInterpretations;
  }

  /**
   * Creates blueprint for blocks from block parse tree
   * @param {ParseTreeBlockNode} root the root of the tree to convert to blueprint
   * @return {BlockBlueprint|string} blueprint object from parse tree: matches form from 
   * block-interpretation JSON files;
   * blueprint formed by replacing each %d with blueprint for corresponding block
   */
  evaluate(root) {
    if(root !== null && !(root instanceof ParseTreeBlockNode)) {
      console.assert(root !== null && !(root instanceof ParseTreeBlockNode), 
        {msg: "Non-null is invalid root type", expectedType: ParseTreeBlockNode, actual: root});
      throw new Error("Invalid root type");
    }

    else if(!root) return "";

    else {
      const args = (typeof root.rhs === "string")
        ? [root.rhs.replace(/\"/g, "'")]
        : root.rhs.map(this.evaluate.bind(this));
      const returnBlockTemplate = this.interpretations_[root.lhs];
      if(typeof returnBlockTemplate === "string") {
        return returnBlockTemplate;
      } 
      else if(returnBlockTemplate) {
        const returnBlock = new BlockBlueprint(JSON.stringify(returnBlockTemplate));
        returnBlock.args = args;
        return returnBlock;
      } else {
        return args[0];
      } 
    }
  }
}

const evaluate = root => {
  if(!root) return {};
  else if(typeof root === "string") return root.replace(/\"/g, "'");
  else if(root.rhs instanceof Array) {
    let args = root.rhs.map(evaluate);
    let returnBlock = JSON.stringify(interpretations[root.lhs]);
    if(returnBlock) {
      return JSON.parse(returnBlock.replace(/"%(\d+)"/g, (match, argNum) => {
        return (typeof args[argNum-1] === "string" ? '"' + args[argNum-1] + '"' : JSON.stringify(args[argNum-1]));
      }));
    } else {
      return args[0];
    }
  }
  else throw new Error("Invalid Root Type", root);
};

export default BlockEvaluator;