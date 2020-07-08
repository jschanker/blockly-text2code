/**
 * Copyright 2018, 2020 Text2Code Authors
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

"use strict";

/** 
 * Class to compute and store outputs of functions
 * for use in later computations
 */
class Memoizer {
  /**
   * Create a new instance of a Memoizer
   */
	constructor() {
		this.clear();
		this.funcs_ = [];
	}

  /**
   * Serializes Array
   * @param {!Array} argArr the Array to serialize
   * @return {string} serialized Array
   */
	serialize_(argArr) {
		return JSON.stringify(argArr);
	}

  /**
   * Computes and stores output from function applied to given
   * arguments from Array, reusing previously computed values
   * @param {!Function} func the function to compute
   * @param {!Array} argArr the Array of arguments to supply to func
   * @return the output of func applied to argArr
   */
	compute(func, argArr) {
		let uid = this.funcs_.indexOf(func);
    if(uid === -1) {
      uid = this.funcs_.length;
      this.funcs_.push(func);
    }
    
    const key = this.serialize_(argArr.concat(uid));
    let retVal;

    if(key in this.memo_) {
        retVal = this.memo_[key];
    } else {
        // shallow freeze: prevent functions from making shallow changes
        // to memoized value 
        retVal = Object.freeze(func(...argArr));
        this.memo_[key] = retVal;
    }

    return retVal;
	}

  /**
   * Clears memo table
   */
	clear() {
		this.memo_ = {};
	}
}