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
 * @fileoverview Blueprint for block(s) used by generator to create blocks;
 * matches form of block-interpretation JSON files
 * @author Jason Schanker
 */

"use strict";

/**
 * Data Structure to represent blueprint of block and all its descendants
 * used by the generator 
 */
class BlockBlueprint {
	/**
	 * @param {string} blockJSON the JSON to construct the template from
	 */
  constructor(blockJSON) {
  	this.blockTemplate_ = JSON.parse(blockJSON);
  	this.args_ = [];
  	this.blockVal_ = null; 
  	//this.type_ = this.blockTemplate_.type;
  	//this.fields_ = this.blockTemplate_.fields;
  	//this.inputs_ = this.blockTemplate_.inputs;
  	//this.blocks_ = this.blockTemplate_.blocks;
  }

  /**
   * Sets the arguments to the given values and substitutes these
   * values into the template
   * @param {Array.<BlockBlueprint|string>} argArr
   */
  set args(argArr) {
  	//this.args_ = argArr.map(arg => arg instanceof BlockBluePrint ? arg.blockVal_ : arg);
  	this.args_ = argArr;
  	/*
  	Object.keys()
  	this.blockVal_ = JSON.parse(this.blockTemplate_.replace(/"%(\d+)"/g, (match, argNum) => {
      return (typeof argArr[argNum-1] === "string" ? 
      	'"' + argArr[argNum-1] + '"' : JSON.stringify(argArr[argNum-1]));
    }));
    */
    this.blockVal_ = this.evaluate_(this.blockTemplate_);
  }

  /**
   * Returns deep copy of val with each %index replaced by BlockBlueprint/string 
   * values of corresponding arguments at these indices; assumes %num appears alone
   * when the argument at that position is a Blockblueprint 
   * @param {Object} val the value to evaluate
   * @return {Object} val with substitutions
   */
  evaluate_(val) {
  	if(val instanceof BlockBlueprint) {
  		return val;
  	} else if(typeof val === "string") {
  		// splitting and replacing is inefficient, but should be negligibly more so
  		// for this use case; this is where substitutions are made
  		const arrVal = val.split(/(%\d+)/)
  		  .map(part => {
          const argNum = part.startsWith("%") && parseInt(part.substring(1));
          return argNum ? this.evaluate_(this.args_[argNum-1]) : part;
        })
        //part.replace(/%(\d+)/, (_, argNum) => 
  		  //this.evaluate_(this.args_[argNum-1])));
  		return arrVal.find(part => part instanceof BlockBlueprint) ||
  		       arrVal.join("");
  	} else if(Array.isArray(val)) {
  		return val.map(this.evaluate_.bind(this));
  	} else {
  		const result = {};
  		Object.keys(val).forEach(key => {
  			result[key] = this.evaluate_(val[key]);
  		});
  		return result;
  	}
  }

  /**
   * @property type
   */
  get type() {
  	return this.blockVal_ && this.blockVal_.type;
  }

  /**
   * @property inputs
   */
  get inputs() {
  	return this.blockVal_ && this.blockVal_.inputs;
  }

  /**
   * @property fields
   */
  get fields() {
  	return this.blockVal_ && this.blockVal_.fields;
  }

  /**
   * @property blocks
   */
  get blocks() {
  	return this.blockVal_ && this.blockVal_.blocks;
  }

  /**
   * @property {BlockBluePrint} value of block
   */
/*
  get value() {
  	return this.blockVal_;
  }
*/

  /**
   * Checks if property contains "%num", which means value hasn't been set
   * @param {string} val
   * @return {boolean} true when val doesn't contain "%num"
   */ 
  hasBeenSet_(val) {
  	return !/"%(\d+)"/.test(val);
  }

  /**
   * @param {string} propertyName property name 
   * @return {Array.<BlockBluePrint|string>}
   */
  keys(propertyName) {
  	return this.blockVal_[propertyName]
  	  .filter(key => this.hasBeenSet_(key));
  }
}

export default BlockBlueprint;