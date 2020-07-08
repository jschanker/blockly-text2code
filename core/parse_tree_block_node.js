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

/**
 * ParseTreeBlockNode class
 */
class ParseTreeBlockNode {
	/**
	 * construct a new Node for a single parse tree
	 * @param {string} lhs - root of parse tree
	 * @param {string|Array.<ParseTreeBlockNode>} rhs parse tree(s) 
	 * rooted at immediate children
	 */
	constructor(lhs, rhs) {
		this.lhs_ = lhs;
		this.rhs_ = rhs;
	}

  /**
   * @property {string} lhs
   */
	get lhs() {
		return this.lhs_;
	}

 /**
  * @property {string|Array.<ParseTreeBlockNode>} rhs
  */
	get rhs() {
		return this.rhs_;
	}
}

export default ParseTreeBlockNode;