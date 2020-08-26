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
 * @fileoverview Class for managing flow of animations and directions for tasks
 * @author Jason Schanker
 */

"use strict";

class CourseInstructionTaskFlow {
  constructor() {
  	this.tasks_ = [];
  }

  addTask(task) {
  	this.tasks_.push(task);
  }

  runTasks() {
  	const FRAME_RATE = 5;
  	const stages = this.tasks_.length;
  	let currentStage = 0;//{taskNum: 0, directionsComplete: false};
  	let lastTime = 0;
  	this.tasks_[0].startDirections();
  	const runTasksHelper = (ms) => {
  		if(ms - lastTime >= FRAME_RATE) {
  		  if(!this.tasks_[currentStage].areDirectionsCompleted() && 
  			  !this.tasks_[currentStage].isTaskCompleted()) {
  		    this.tasks_[currentStage].showDirectionStep(1);
  		  }
  		  else if(this.tasks_[currentStage].isTaskCompleted()) {
  		  	this.tasks_[currentStage].finish();
  		  	++currentStage;
  		  	if(currentStage < this.tasks_.length) {
  		  		this.tasks_[currentStage].startDirections();
  		  	}
  		  	lastTime = ms;
  		  }
  		  lastTime += FRAME_RATE;
  		}
  		if(currentStage < this.tasks_.length) {
  			requestAnimationFrame(runTasksHelper);
  		}
  		console.log("Running Task", currentStage);
  	};

  	requestAnimationFrame(runTasksHelper);
  }
}

export default CourseInstructionTaskFlow;