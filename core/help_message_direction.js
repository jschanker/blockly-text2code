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
 * @fileoverview Class to handle creation of help message console that 
 * updates with real-time feedback
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle creation of help message console that 
 * updates with real-time feedback
 */
class HelpMessageDirection {
	constructor(message, options) {
	  this.options_ = options;
	  this.started_ = false;
	  this.message_ = message;
	  this.currentMessage_ = "";

	  this.alertDisplay_ = document.getElementById("alert-display");
    if(!this.alertDisplay_) {
      this.alertDisplay_ = document.createElement("div");
      this.alertDisplay_.id = "alert-display";
      this.alertDisplay_.style.fontSize = "small";
      this.alertDisplay_.style.fontWeight = "bold";
	    this.alertDisplay_.style.borderColor = "#000";
	    this.alertDisplay_.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
	    this.alertDisplay_.style.color = "#f00";
	    this.alertDisplay_.style.position = "absolute";
	    this.alertDisplay_.style.zIndex = "1050";
	    this.alertDisplay_.style.width = "98%";
	    this.alertDisplay_.style.minHeight = "50px";
	    this.alertDisplay_.style.left = "0";
	    this.alertDisplay_.style.bottom = "0";
	    this.alertDisplay_.style.textAlign = "left";
	    this.alertDisplay_.style.padding = "1%";
    }
	}

	start() {
	  /* POSITIONING IGNORED FOR NOW - ORIGINALLY FOR HELP MENU DIALOG
	  this.startPosition_ = this.value_(this.options_.startPosition);
	  this.alertDisplay_.style.left = this.startPosition_.x + "px";
	  this.alertyDisplay_.style.top = this.startPosition_.y + "px";
	  */
    document.body.appendChild(this.alertDisplay_);
	  this.started_ = true;
	}

	isComplete() {
		// return (typeof this.message_ === "string"); // message never changes
		return false;
  }

  finish() {
    document.body.removeChild(this.alertDisplay_);
    //this.helpButton_.style.display = "none";
    if(this.options_.finish instanceof Function) {
    	this.options_.finish();
    }
  }

  animate(steps=1) {
  	const message = this.value_(this.message_);
  	const currentMessageWithoutWhitespace = this.currentMessage_.replace(/\s/g, "");
  	const currentTextWithoutWhitespace = this.alertDisplay_.innerText.replace(/\s/g, "");

  	//if(this.currentMessage_ !== message) {
  	//if(this.alertDisplay_.innerText !== message) {
  	if(currentTextWithoutWhitespace !== message.replace(/\s/g, "") && 
  		 (currentTextWithoutWhitespace === currentMessageWithoutWhitespace || 
  		 currentTextWithoutWhitespace === "")) {
  		// console.log("MESSAGE CHANGED");
  		// only update if the currently displayed message is not equal to the message to avoid 
  	  // unnecessary DOM edits and it's not currently being used somewhere else 
  	  // (which would be the case if the inner text were not the current message and not blank) to 
  	  // permit concurrent use by e.g., type-in-code blocks
  		this.currentMessage_ = message;	
	  	if(!this.options_.queue) {
	      this.alertDisplay_.innerText = message;
	    } else {
	      this.alertDisplay_.innerText += message;
	    }
	  }
  }

  value_(g) {
  	return g instanceof Function ? g() : g;
  }

}

export default HelpMessageDirection;