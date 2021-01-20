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
 * @fileoverview Class to handle animations in parallel
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle animations in parallel
 */
class ParallelAnimation {
	constructor(animations) {
		this.animations_ = animations;
	}
	start() {
		this.animations_.forEach(animation => animation.start());
	}
	isComplete() {
    return this.animations_.every(animation => animation.isComplete());
  }
  finish() {
  	this.animations_.filter(animation => animation.finish instanceof Function)
  	  .forEach(animation => animation.finish());
  }
  animate(steps=1) {
    this.animations_.filter(animation => !animation.isComplete())
      .forEach(animation => animation.animate(steps));
  }
}

export default ParallelAnimation;