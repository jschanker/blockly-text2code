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
 * Public class for maintaining/accessing all parse trees with a given start symbol 
 * (e.g., statement); interface for Parser
 */
class ParseForest {
	/**
	 * Constructs new Parse forest
	 * @param {string} lhs - the initial lefthand side of the root's rule
	 * @param {string|Array.<ParseForest>} rhs - the initial righthand side of the root
	 */
	constructor(lhs, rhs) {
		this.root_ = new ParseTreeRHSidesNode(lhs, 
			[Array.isArray(rhs) ? rhs.map(forest => forest.root_) : rhs]);
	}

  /**
   * Creates new ParseForest with given lhs 
   * and right-hand sides by concatenating second Array's right-hand sides
   * to each of the ones from the first
   * @param {string} newRoot the left-hand side of the forest
   * @param {ParseForest} forest the forest whose right-hand sides to be concatenated
   * @return {ParseForest} resulting forest after concatenation
   */ 
	rhsConcat(newRoot, forest) {
		let newForest = new ParseForest(newRoot, []);
		newForest.root_ = ParseTreeRHSidesNode.concatToEach(newRoot, this.root_, forest.root_);
		return newForest;
	}

 /**
  * @property{string} rootLHS the root of the derivation trees
  */
	get rootLHS() {
		return this.root_.lhs;
	}

  /**
   * Produces a new Array of forests in which all forests from supplied Array 
   * with a common left-hand side root have been merged
   * @param{Array.<ParseForest>!} arrOfForests Array of forests to merge
   * @return{Array.<ParseForest>} Merged Array of forests
   */
	static mergeForests(arrOfForests) {
		const arrOfForestsCp = arrOfForests.slice();
		// put forests with same root together
		arrOfForestsCp.sort((f1, f2) => 
			(f1.root_.lhs === f2.root_.lhs) ? 0 : ((f1.root_.lhs < f2.root_.lhs) ? -1 : 1));
		//	(f1.root_.lhs !== f2.root_.lhs) * ((f1.root_.lhs < f2.root_.lhs) - 42));

		const mergedForests = [];

		for(let i = 0; i < arrOfForestsCp.length; i++) {
			if(i === 0 || mergedForests[mergedForests.length-1].root_.lhs !== arrOfForestsCp[i].root_.lhs) {
				mergedForests.push(arrOfForestsCp[i]);
			} else {
				mergedForests[mergedForests.length-1].root_.merge(arrOfForestsCp[i].root_);
			}			
		} 

		return mergedForests;
	}

  /**
   * Returns all parse trees represented by the root of this forest
   * by using the converter from the inputted ParseTreeBlockConnector 
   * @param {ParseTreeBlockConnector} ptbc
   * @return {Object} parse trees in the appropriate format
   */
	parseTrees(ptbc) {
		return ptbc.convertToBlockParseTrees(this.root_);
	}
}