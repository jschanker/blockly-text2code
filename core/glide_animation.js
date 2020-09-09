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
 * @fileoverview Class to handle DOM gliding animation from one position 
 * to another
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle DOM gliding animation from one position to another 
 */
class GlideAnimation {
	constructor(obj, options) {
		this.obj_ = obj;
		this.options_ = options;
	}
	start() {
		this.numOfMoves_ = 0;
		this.totalSteps_ = this.value_(this.options_.totalSteps);
		this.startPosition_ = this.value_(this.options_.startPosition);
		this.endPosition_ = this.value_(this.options_.endPosition) || 
		  {x: this.startPosition_.x + this.value_(this.options_.velocity).x
		  	* this.totalSteps_,
		   y: this.startPosition_.y + this.value_(this.options_.velocity).y
		    * this.totalSteps_};
	  this.velocity_ = 
	    {x: (this.endPosition_.x - this.startPosition_.x)/this.totalSteps_,
	     y: (this.endPosition_.y - this.startPosition_.y)/this.totalSteps_}

		this.obj_.style.left = this.startPosition_.x + "px";
	  this.obj_.style.top = this.startPosition_.y + "px";
	}
	isComplete() {
    return this.numOfMoves_ >= this.totalSteps_; 
  }
  finish() {
  	if(this.options_.finish instanceof Function) {
    	this.options_.finish();
    }
  }
  animate(steps=1) {
  	const runSteps = Math.min(steps, this.totalSteps_ - this.numOfMoves_);
  	this.obj_.style.left = parseFloat(this.obj_.style.left) 
  	  + this.velocity_.x*runSteps + "px";
  	this.obj_.style.top = parseFloat(this.obj_.style.top) 
  	  + this.velocity_.y*runSteps + "px";
  	this.numOfMoves_ += steps;
  }
  value_(g) {
  	return g instanceof Function ? g() : g;
  }
}

export default GlideAnimation;