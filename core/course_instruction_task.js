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
 * @fileoverview Class to represent CourseTaskInstruction with direction 
 * @author Jason Schanker
 */

"use strict";

class CourseInstructionTask {
  constructor(taskCondition, directions) {
  	this.taskCondition_ = taskCondition;
  	this.directions_ = directions;
  }

  areDirectionsCompleted() {
  	return this.directions_.isComplete();
  }

  startDirections() {
  	this.directions_.start();
  }

  showDirectionStep(steps=1) {
  	this.directions_.animate(steps);
  }

  isTaskCompleted() {
  	return this.taskCondition_();
  }
} 

export default CourseInstructionTask;