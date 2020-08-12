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
 * @fileoverview Abtraction for internal representation/manipulation of
 * parse tree derivations
 * @author Jason Schanker
 */

"use strict";

/**
 * Internal class for representing all parse trees with a given starting 
 * nonterminal in a subderivation  
 * ParseTreeRHSidesNode is a recursively defined data structure of form
 * {lhs: string, rhsides: Array.<string|Array.<ParseTreeRHSidesNode>>}
 * where lhs is the common starting nonterminal; rhsides represents all possible 
 * immediate children parse trees resulting from one application of a production 
 * rule (rhs is a root in rhsides exactly when lhs -> rhs can be used at this 
 * step in one of the possible derivations)
 */
class ParseTreeRHSidesNode {
	/**
	 * construct a new Node for a single left-hand side and Array of right-hand sides
	 * @param {string} lhs - left-hand side of rule
	 * @param {Array.<string|Array.<ParseTreeRHSidesNode>>} [rhsides=[]] represents parse trees 
	 * of immediate children
	 */
	constructor(lhs, rhsides=[]) {
		this.lhs_ = lhs;
		this.rhsides_ = rhsides;
	}

  /**
   * Merges right-hand sides of given node into this one if lefthand sides match
   * @param {ParseTreeRHSidesNode} node to merge righthand sides
   */
  merge(node,max=1) {
  	console.assert(this.lhs_ === node.lhs_, 
  		{msg: "This lhs of " + this.lhs_ + 
  		" does not match node's lhs of " + node.lhs_});
  	if(this.rhsides_.length < max) this.rhsides_.push(...node.rhsides_);
  }

  /**
   * @property {string} lhs the root's lefthand side
   */
	get lhs() {
		return this.lhs_;
	}

  /**
   * @property {Array.<string|Array.<ParseTreeRHSidesNode>>} rhsides the node's immediate
   * child parse trees
   */
	get rhsides() {
		return this.rhsides_;
	}

  /**
   * Creates new ParseTreeRHSidesNode with given lhs 
   * and right-hand sides by concatenating second Array
   * to each of the ones from the first
   * @param {string} lhs lefthand side of new ParseTreeRHSidesNode
   * @param {ParseTreeRHSidesNode} sourceNode node with right hand sides to append to
   * @param {ParseTreeRHSidesNode} appendRHSNodes Nodes to append
   * @return {ParseTreeRHSidesNode} resulting ParseTreeRHSidesNode after concatenation
   */ 
	static concatToEach(lhs, sourceNode, appendRHSNodes) {
  	return new ParseTreeRHSidesNode(lhs, 
  	  sourceNode.rhsides_.map(rhs => rhs.concat(appendRHSNodes)));
  }
}

export default ParseTreeRHSidesNode;