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
 * @fileoverview Class to handle DOM blinking animation
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle DOM gliding animation from one position to another 
 */
class BlinkAnimation {
	constructor(obj, options) {
		this.obj_ = obj;
		this.options_ = options;
	}
	start() {
		this.numOfSteps_ = 0;
		this.totalSteps_ = this.value_(this.options_.totalSteps);
		this.startPosition_ = this.value_(this.options_.startPosition);
		this.toggleSteps_ = this.value_(this.options_.toggleSteps);

		this.obj_.style.left = this.startPosition_.x + "px";
	  this.obj_.style.top = this.startPosition_.y + "px";
	}
	isComplete() {
    return this.numOfSteps_ >= this.totalSteps_; 
  }
  animate(steps=1) {
  	const runSteps = Math.min(steps, this.totalSteps_ - this.numOfSteps_);
  	this.obj_.style.display = 
  	  this.numOfSteps_ % (2*this.toggleSteps_) < this.toggleSteps_ ? "none" : "block";
  	this.numOfSteps_ += runSteps;
  }
  value_(g) {
  	return g instanceof Function ? g() : g;
  }
}

export default BlinkAnimation;