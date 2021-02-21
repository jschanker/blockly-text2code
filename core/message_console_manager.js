/**
 * Copyright 2021 Text2Code Authors
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
class MessageConsoleManager {
	constructor(container, options) {
		this.container_ = container || this.createContainer_();
		this.tabContainer_ = this.createTabContainer_(this.container_);
		this.msgDisplay_ = this.createMsgDisplay_(this.container_);
		this.currentTab_ = null;
	  this.options_ = options;
	  this.tabs_ = [];
	  this.unassignedTabId_ = 0;
	}

	createContainer_() {
		const container = document.createElement("div");
    container.id = "message_console_manager_container";
    container.style.fontSize = "small";
    container.style.fontWeight = "bold";
    container.style.borderColor = "#000";
    // container.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    container.style.color = "#f00";
    container.style.position = "absolute";
    container.style.zIndex = "1050";
    container.style.width = "100%";//"98%";
    // container.style.minHeight = "50px";
    container.style.left = "0";
    container.style.bottom = "0";
    container.style.textAlign = "left";
    //container.style.padding = "1%";

		return container;		
	}

	createTabContainer_(container) {
		const tabContainer = document.createElement("div");
		container.appendChild(tabContainer);
		return tabContainer;
	}

	createMsgDisplay_(container) {
		const msgDisplay = document.createElement("div");
		msgDisplay.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
		msgDisplay.style.padding = "1%";
		container.appendChild(msgDisplay);
		return msgDisplay;
	}

	addTab(tabTitle, message) {
    const display = document.createElement("div");
    const tab = {
    	display, 
    	message, 
    	currentMessage: "",
    	title: tabTitle, 
    	id: this.unassignedTabId_    	
    };
    // const tab = {display, message};
    display.innerText = tabTitle;
    display.style.display = "inline-block";
    display.style.borderRadius = "10px 10px 0 0";
    display.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    display.style.padding = "5px";

    display.addEventListener("click", () => {
    	this.setSelectedTab(tab.id);
    	// display.innerText = tabTitle; // tab title may have (*) indicating new message;
    	                                 // after it's selected * should be
    	                                 // removed and only title should show
    });

    this.tabs_.push(tab);

    if(!this.currentTab_) {
    	// first created tab; set current tab to this new first one
    	this.setSelectedTab(tab.id);
    }

    this.tabContainer_.appendChild(display);
    return this.unassignedTabId_++;
	}

	changeTab(id, newTabTitle, newMessage) {
		const tab = this.tabs_.find(tab => tab.id === id);

		if(tab) {
			console.log("Changing tab", tab, "with id", id);
			tab.title = newTabTitle;
			tab.display.innerText = newTabTitle;
			tab.message = newMessage;
			console.log("Tab is now", tab);
		}

		return !!tab;
	}

	setSelectedTab(id) {
		const tab = this.tabs_.find(tab => tab.id === id);
		console.log("SETTING TAB TO ", tab);
		if(tab) {
			// maybe add CSS class for selected
    	// console.log("CLICKED", tab);
    	if(this.currentTab_) {
    		// unselect styles for current tab
    		// this.currentTab_.display.style.removeProperty("background-color");
    		this.currentTab_.display.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    		this.currentTab_.display.style.removeProperty("font-weight");
    	}

    	//display.style.backgroundColor = "#dcf4ff"; // indicate selected
    	tab.display.style.backgroundColor = "rgba(127, 122, 110, 0.5)"; // rgb(255, 244, 220)
    	tab.display.style.fontWeight = "bold";
    	tab.display.innerText = tab.title; // tab title may have (*) indicating new message;
    	                                   // after it's selected * should be
    	                                   // removed and only title should show
			this.currentTab_ = tab;
		}

		return !!tab;	
	}

	start() {
	  /* POSITIONING IGNORED FOR NOW - ORIGINALLY FOR HELP MENU DIALOG
	  this.startPosition_ = this.value_(this.options_.startPosition);
	  this.alertDisplay_.style.left = this.startPosition_.x + "px";
	  this.alertyDisplay_.style.top = this.startPosition_.y + "px";
	  */
    document.body.appendChild(this.container_);
	  this.started_ = true;
	}

	isComplete() {
		// return (typeof this.message_ === "string"); // message never changes
		return false;
  }

  finish() {
    document.body.removeChild(this.container_);
    //this.helpButton_.style.display = "none";
    if(this.options_.finish instanceof Function) {
    	this.options_.finish();
    }
  }

  animate(steps=1) {
  	const messages = this.tabs_.map(tab => this.value_(tab.message));

    // add asterisk to indicate new messages
  	this.tabs_.filter((tab, index) => this.currentTab_ !== tab && 
  		messages[index] && 
  		tab.currentMessage !== messages[index] &&
  		!tab.display.innerText.trim().endsWith("*"))
  	  .forEach(tab => tab.display.innerText += "*");

  	this.tabs_.forEach((tab, index) => tab.currentMessage = messages[index]);

  	this.msgDisplay_.innerText = this.currentTab_.currentMessage;
  }

  value_(g) {
  	return g instanceof Function ? g() : g;
  }

}

export default MessageConsoleManager;