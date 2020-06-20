/**
 * Copyright 2020 Text2Code Authors
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
 * @fileoverview Association class between one responsible for internal 
 * representation of parse trees maintained during the parsing algorithm 
 * and the block evaluator that interprets the parse trees as blocks  
 * @author Jason Schanker
 */

"use strict";

class ParseTreeBlockConnector {
  /**
   * Converts up to given maximum number of 
   * derivation trees represented by the supplied root
   * to ones used for their interpretations as blocks and returns 
   * Array of corresponding roots  
   * @param{ParseTreeRHSidesNode} parseTreeRHSidesRoot
   * @param{number} [max=1] the maximum number of derivation trees to return 
   * @return{Array.<ParseTreeBlockNode>} Array of parse tree roots
   */
	convertToBlockParseTrees(parseTreeRHSidesRoot, max=1) {
		return parseTreeRHSidesRoot.rhsides.map(rhs => {
			if(typeof rhs === "string") {
				return [new ParseTreeBlockNode(parseTreeRHSidesRoot.lhs, rhs)];
			} else {
				return cartesianProductArray(rhs.map(node => this.convertToBlockParseTrees(node, max)))
				  .map(rhsOfRhs => (new ParseTreeBlockNode(parseTreeRHSidesRoot.lhs, rhsOfRhs)));
			}
		}).reduce((acc, arr) => acc.concat(arr), []) // flatten Array
		  .slice(0,max); // cut off at first max many derivations
	}
}