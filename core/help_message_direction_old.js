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
 * @fileoverview Class to handle creation of help message icon and dialog
 * box
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle creation of help message icon and dialog box 
 */
class HelpMessageDirection {
	constructor(message, options) {
		//this.message_ = this.value_(message);
		this.options_ = options;
		this.helpButton_ = document.createElement("button");
		this.helpButton_.innerText = "?";
		this.helpButton_.style.fontSize = "x-large";
		this.helpButton_.style.fontWeight = "bold";
		this.helpButton_.style.borderRadius = "5px";
		this.helpButton_.style.borderColor = "#000";
		this.helpButton_.style.backgroundColor = "#ccc";
		this.helpButton_.style.position = "absolute";
		this.helpButton_.style.zIndex = "1050";
		this.helpButton_.style.minWidth = "50px";
		this.helpButton_.style.minHeight = "50px";
		this.helpButton_.style.textAlign = "center";
		this.helpButton_.addEventListener("click", () => {
			alert(this.value_(message));
		});
		this.helpButton_.id = "help";
		this.started_ = false;
	}
	start() {
	  this.startPosition_ = this.value_(this.options_.startPosition);
	  this.helpButton_.style.left = this.startPosition_.x + "px";
	  this.helpButton_.style.top = this.startPosition_.y + "px";
	  document.body.appendChild(this.helpButton_);
	  this.started_ = true;
	}
	isComplete() {
    return this.started_; 
  }
  finish() {
    document.body.removeChild(this.helpButton_);
    //this.helpButton_.style.display = "none";
    if(this.options_.finish instanceof Function) {
    	this.options_.finish();
    }
  }
  animate(steps=1) {
  	// NO OP for now
  }
  value_(g) {
  	return g instanceof Function ? g() : g;
  }
}

export default HelpMessageDirection;