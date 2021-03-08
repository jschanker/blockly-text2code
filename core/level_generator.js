import {getParseTree, handleParseTreeToBlocks, workspaceToLanguageCode, workspaceToXML} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
import MessageConsoleManager from "../core/message_console_manager.js";
import TypeInCodeBlock from "../core/type_in_code_block.js";

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
 * @fileoverview Class to handle creation of level directions and tasks;
 * This is really a utility class and should be changed accordingly to remove state
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle creation of level directions and tasks
 */

class LevelGenerator {
	constructor(courseInstructionTaskFlow) {
		/*
		this.helpMsgManager_ = new MessageConsoleManager();
    this.directionsTabId_ = this.helpMsgManager_.addTab(T2C.MSG.currentLanguage.DIRECTIONS, "");
    this.feedbackTabId_ = this.helpMsgManager_.addTab(T2C.MSG.currentLanguage.FEEDBACK, "");
    */
    this.state_ = {};
    this.courseInstructionTaskFlow_ = courseInstructionTaskFlow;
	}

	loadLevelTasks(courseInstructionTaskFlow, ws) {
		const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
    const workspace = ws || Blockly.getMainWorkspace();
    const toolboxManager = new ToolboxManager(workspace);
    this.helpMsgManager_.start();

    return citf;
	}

	set mainCourseInstructionTaskFlow(courseInstructionTaskFlow) {
		this.courseInstructionTaskFlow_ = courseInstructionTaskFlow;
	}

	createStandardHelpMessageManager() {
		const helpMsgManager = new MessageConsoleManager();
		helpMsgManager.addTab(T2C.MSG.currentLanguage.DIRECTIONS, ""); // directionsTabId
		helpMsgManager.addTab(T2C.MSG.currentLanguage.FEEDBACK, ""); // feedbackTabId

		return helpMsgManager;
	}

	createHelpMessageDirections(helpMsgManager, directions, feedback, finish) {
		// const helpMsgManager = helpMsgManager || this.createStandardHelpMessageManager();
    return {
      start: () => {
      	const directionsTabId = helpMsgManager.getTabIdByTitle(T2C.MSG.currentLanguage.DIRECTIONS);
        helpMsgManager.setTabHandlerByTitle(T2C.MSG.currentLanguage.DIRECTIONS, directions);
        helpMsgManager.setTabHandlerByTitle(T2C.MSG.currentLanguage.FEEDBACK, feedback);
        helpMsgManager.start();
        helpMsgManager.setSelectedTab(directionsTabId);
      },
      isComplete: () => false,
      animate: (steps) => helpMsgManager.animate(steps),
      finish: () => {
      	if(typeof finish === "function") finish();
      	// helpMsgManager.finish();
      }
    }
  }

  createHelpMessageTask(helpMsgManager, condition, directions, feedback, finish) {
    return new CourseInstructionTask(
      typeof condition === "function" ? condition : () => true, 
      this.createHelpMessageDirections(helpMsgManager, directions, feedback, finish)
    );
  }

	hideOutputAndCodeContainers() {
	  document.getElementById("output-container").classList.remove("show-container");
	  document.getElementById("output-container").classList.add("hide-container");
	  document.getElementById("text-code-container").classList.remove("show-container");
	  document.getElementById("text-code-container").classList.add("hide-container");   
	}

  addHelpMessageTask(courseInstructionTaskFlow, helpMsgManager, condition, directions, feedback, finish) {
    courseInstructionTaskFlow.addTask(this.createHelpMessageTask(helpMsgManager, condition, directions, feedback, finish));
  }

  addMoveAndFlashTask(courseInstructionTaskFlow, div, finish) {
	  const steps = 200;
	  let currentStep = 0;
	  function flashText() {
	    if(currentStep % 50 < 25) {
	      div.style.color = "#a00";
	    } else {
	      div.style.color = "#000";
	    }
	    currentStep++;
	    if(currentStep < steps) {
	      requestAnimationFrame(flashText);
	    }
	  }
	  function restoreAfterMoveAndFlashText(div) {
	    div.style.verticalAlign = "middle";
	    div.style.color = "#000";
	  }  
	  courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      () => currentStep >= steps,
	      {
	        start: () => {
	          div.style.verticalAlign = "top";
	          requestAnimationFrame(flashText)
	        },
	        isComplete: () => true,
	        animate: () => true,
	        finish: () => {
	        	if(typeof finish === "function") {
	        		finish();
	        	}
	        	restoreAfterMoveAndFlashText(div);
            this.hideOutputAndCodeContainers();  
	        }
	      }
	    )
	  );
	}

	createPointer() {
		const pointer = document.createElement("div");
    pointer.innerText = "👆";
    pointer.id = "ptr";
    pointer.style.fontSize = "x-large";
    pointer.style.position = "absolute";
    pointer.style.zIndex = "1001";

    return pointer;		
	}

	setMaxesFromWorkspace(workspace) {
    const optionMaxInstances = workspace.options.maxInstances; 
    workspace.options.maxInstances = {};
    workspace.getAllBlocks().forEach(block => {
      workspace.options.maxInstances[block.type] = ++workspace.options.maxInstances[block.type] || 1;
    });
    Object.keys(optionMaxInstances).forEach(key => {
      workspace.options.maxInstances[key] = workspace.options.maxInstances[key] || optionMaxInstances[key];
    })
  }

	addRunTask(helpMsgManager, courseInstructionTaskFlow, finish, ptr, doFlashTaskAfter=true) {
    courseInstructionTaskFlow.addTask(
      new CourseInstructionTask(
        () => document.getElementById("output-container").classList.contains("show-container"),
        new ParallelAnimation([
          this.createHelpMessageDirections(helpMsgManager, T2C.MSG.currentLanguage.BUTTON_RUN_CODE, ""),
          new BlinkAnimation(ptr || this.createPointer(), {
            totalSteps: 100,
            toggleSteps: 25,
            startPosition: {
              x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth/2,
              y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight/2
            },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
          })
        ])
      )
    );
    if(doFlashTaskAfter) {
    	this.addMoveAndFlashTask(courseInstructionTaskFlow, document.getElementById("output-container").querySelectorAll(".table-cell")[0], finish);
    }
  }

  addDeleteAllBlocksTask(helpMsgManager, courseInstructionTaskFlow, workspace, finish, ptr) {
	  courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      () => workspace.getAllBlocks().length === 0,
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager,() => "Move all blocks to the trashcan or rightmouse click (hold down finger on phone) on an empty place in the workspace and select Delete.", ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            const coords = workspace.trashcan.getClientRect();
	            return {
	              x: (coords.left + coords.right)/2, //+ d.offsetWidth/4,
	              y: (coords.top + coords.bottom)/2
	              /*
	              y: document.getElementById("top-header").offsetHeight + 
	                (coords.top + coords.bottom)/2 + 
	                Blockly.getMainWorkspace().getMetrics().flyoutHeight
	              */
	            };
	          }
	        })
	      ])
	    )
	  );
  }

  addLoadSaveListeners_(workspace, resetState=false) {
  	if(resetState) {
	  	this.state_.clickedLoadButtonLast = false;
	  	this.state_.clickedSaveButtonLast = false;
	  	this.state_.clickedLoadXMLButtonLast = false;
	  	this.state_.clickedSaveXMLButtonLast = false;
	  	this.state_.clickedLoadTextCodeButtonLast = false;
	  	this.state_.clickedSaveTextCodeButtonLast = false;
	  	this.state_.generatedTextCode = workspaceToLanguageCode(workspace, T2C.MSG.currentLanguage);
	  	this.state_.generatedXMLText = workspaceToXML(workspace);
	  }

  	const saveCodeButtonListener = () => {
      this.state_.clickedLoadButtonLast = false;
      this.state_.clickedSaveButtonLast = true;
      this.state_.clickedLoadXMLButtonLast = false;
	  	this.state_.clickedSaveXMLButtonLast = false;
	  	this.state_.clickedLoadTextCodeButtonLast = false;
	  	this.state_.clickedSaveTextCodeButtonLast = false;
      // should call function from module for this
      // save to compare against loaded code
      // const xmlDom = Blockly.Xml.workspaceToDom(workspace);
      // this.state.xmlText_ = Blockly.Xml.domToPrettyText(xmlDom);
    };
    const loadCodeButtonListener = () => {
      this.state_.clickedLoadButtonLast = true;
      this.state_.clickedSaveButtonLast = false;
      this.state_.clickedLoadXMLButtonLast = false;
	  	this.state_.clickedSaveXMLButtonLast = false;
	  	this.state_.clickedLoadTextCodeButtonLast = false;
	  	this.state_.clickedSaveTextCodeButtonLast = false;
    };
    const loadSaveXMLListener = () => {
      // Avoid asking read clipboard permission; assume that button click meant text was copied
      /*
      navigator.clipboard.readText().then(clipText => {
        clipboardText = clipText;
      });
      */
      //if(document.getElementById("load-save-xml").textContent === T2C.MSG.currentLanguage["BUTTON_LOAD_XML"]) {
      if(this.state_.clickedLoadButtonLast) {
        this.state_.clickedLoadXMLButtonLast = true;
      } else {
      	// attempting save
      	// make sure the workspace wasn't changed, can still change text in textarea, perhaps readonly?
        if(this.state_.generatedTextCode.replace(/\s/g, "") !== document.getElementById("textCodeBox").value.replace(/\s/g, "")) {
      	  alert("Workspace or selected language changed, please restore what you originally had before saving");
        } else {
        	this.state_.generatedXMLText = workspaceToXML(workspace);
      	  this.state_.clickedSaveXMLButtonLast = true;
        }
      }
    };

    const loadSaveTextCodeListener = () => {
      // Avoid asking read clipboard permission; assume that button click meant text was copied
      /*
      navigator.clipboard.readText().then(clipText => {
        clipboardText = clipText;
      });
      */
      /*
      if(clickedSaveButtonLast) {
        this.state_.clipboardText = document.getElementById("textCodeBox").value;
      }
      */
      // if(document.getElementById("load-save-text-code").textContent === T2C.MSG.currentLanguage["BUTTON_LOAD_TEXT_CODE"]) {
      if(this.state_.clickedLoadButtonLast) {
      	this.state_.clickedLoadTextCodeButtonLast = true;
      } else {
     	  if(this.state_.generatedTextCode.replace(/\s/g, "") !== document.getElementById("textCodeBox").value.replace(/\s/g, "")) {
      	  alert("Workspace or selected language changed, please restore what you originally had before saving");
        } else {
      	  this.state_.clickedSaveTextCodeButtonLast = true;
        }
      }
    };

  	this.state_.listeners = 
  	  [
  	    {id: "load-code-button", listener: loadCodeButtonListener}, 
  	    {id: "save-code-button", listener: saveCodeButtonListener},
  	    {id: "load-save-text-code", listener: loadSaveTextCodeListener},
  	    {id: "load-save-xml", listener: loadSaveXMLListener}
  	  ]

  	this.state_.listeners.forEach(listenerObj => 
  		document.getElementById(listenerObj.id).addEventListener("click", listenerObj.listener));
  }

  removeLoadSaveListeners_() {
    this.state_.listeners.forEach(listenerObj => 
  		document.getElementById(listenerObj.id).removeEventListener("click", listenerObj.listener));
    return true;
  }

  createAddSaveListenersDirections_(workspace, resetState=false) {
  	return {
	    start: () => {
	    	this.addLoadSaveListeners_(workspace, resetState);
	    },
	    isComplete: () => true,
	    animate: () => true
	  };
  }

  addSaveXMLTask(helpMsgManager, courseInstructionTaskFlow, workspace, finish, ptr, resetState) {
		courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      () => this.state_.clickedSaveButtonLast,//document.getElementById("output-container").classList.contains("show-container"),
	      new ParallelAnimation([
	        this.createAddSaveListenersDirections_(workspace, resetState),
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_SAVE_XML, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: {
	            x: document.getElementById("save-code-button").offsetLeft + document.getElementById("save-code-button").offsetWidth/2,
	            y: document.getElementById("save-code-button").offsetTop + document.getElementById("save-code-button").offsetHeight/2
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
	  );

	  courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	    	// hacky way to remove listeners on end
	      () => this.state_.clickedSaveXMLButtonLast && this.removeLoadSaveListeners_(),
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_SAVE_XML, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            return {
	              x: document.getElementById("load-save-xml").offsetLeft + document.getElementById("load-save-xml").offsetWidth/2,
	              y: document.getElementById("load-save-xml").offsetTop + document.getElementById("load-save-xml").offsetHeight/2
	            };
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
	  );
  }

  addLoadXMLTask(helpMsgManager, courseInstructionTaskFlow, workspace, finish, ptr, resetState) {
  	courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      // add event listener so this isn't confused with clicking on load button and then entering code (DONE)
	      () => this.state_.clickedLoadButtonLast,//document.getElementById("text-code-container").classList.contains("show-container"),
	      new ParallelAnimation([
	        this.createAddSaveListenersDirections_(workspace, resetState),
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_LOAD_XML, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: {
	            x: document.getElementById("load-code-button").offsetLeft + document.getElementById("load-code-button").offsetWidth/2,
	            y: document.getElementById("load-code-button").offsetTop + document.getElementById("load-code-button").offsetHeight/2
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
    );

    courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      // () => xmlText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
	      () => this.state_.generatedXMLText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager, () => "Paste the XML you copied in this text box.", ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            return {
	              x: document.getElementById("xmlData").offsetLeft + document.getElementById("xmlData").offsetWidth/2,
	              y: document.getElementById("xmlData").offsetTop + document.getElementById("xmlData").offsetHeight/2
	            };
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
    );

    courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      () => this.state_.generatedXMLText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, "")
	         && this.state_.clickedLoadXMLButtonLast && this.removeLoadSaveListeners_(),
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_LOAD_XML, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            return {
	              x: document.getElementById("load-save-xml").offsetLeft + document.getElementById("load-save-xml").offsetWidth/2,
	              y: document.getElementById("load-save-xml").offsetTop + document.getElementById("load-save-xml").offsetHeight/2
	            };
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
	  );
  }

  addSaveTextCodeTask(helpMsgManager, courseInstructionTaskFlow, workspace, finish, ptr, resetState) {
		courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      () => this.state_.clickedSaveButtonLast,//document.getElementById("output-container").classList.contains("show-container"),
	      new ParallelAnimation([
	        this.createAddSaveListenersDirections_(workspace, resetState),
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_SAVE_TEXT_CODE, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: {
	            x: document.getElementById("save-code-button").offsetLeft + document.getElementById("save-code-button").offsetWidth/2,
	            y: document.getElementById("save-code-button").offsetTop + document.getElementById("save-code-button").offsetHeight/2
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
	  );

	  courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	    	// hacky way to remove listeners on end
	      () => this.state_.clickedSaveTextCodeButtonLast && this.removeLoadSaveListeners_(),
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_SAVE_TEXT_CODE, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            return {
	              x: document.getElementById("load-save-text-code").offsetLeft + document.getElementById("load-save-text-code").offsetWidth/2,
	              y: document.getElementById("load-save-text-code").offsetTop + document.getElementById("load-save-text-code").offsetHeight/2
	            };
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
	  );
	}

	addLoadTextCodeTask(helpMsgManager, courseInstructionTaskFlow, workspace, finish, ptr, resetState) {
  	courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      // add event listener so this isn't confused with clicking on load button and then entering code (DONE)
	      () => this.state_.clickedLoadButtonLast,//document.getElementById("text-code-container").classList.contains("show-container"),
	      new ParallelAnimation([
	        this.createAddSaveListenersDirections_(workspace, resetState),
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_LOAD_TEXT_CODE, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: {
	            x: document.getElementById("load-code-button").offsetLeft + document.getElementById("load-code-button").offsetWidth/2,
	            y: document.getElementById("load-code-button").offsetTop + document.getElementById("load-code-button").offsetHeight/2
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
    );

    courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      // () => xmlText.replace(/\n|\r/g, "") === document.getElementById("xmlData").value.replace(/\n|\r/g, ""),
	      () => this.state_.generatedTextCode.replace(/\n|\r/g, "") === document.getElementById("textCodeBox").value.replace(/\n|\r/g, ""),
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager, () =>  "Paste the code you copied in this text box.", ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            return {
	              x: document.getElementById("textCodeBox").offsetLeft + document.getElementById("textCodeBox").offsetWidth/2,
	              y: document.getElementById("textCodeBox").offsetTop + document.getElementById("textCodeBox").offsetHeight/2
	            };
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
    );

    courseInstructionTaskFlow.addTask(
	    new CourseInstructionTask(
	      () => this.state_.generatedTextCode.replace(/\n|\r/g, "") === document.getElementById("textCodeBox").value.replace(/\n|\r/g, "")
	         && this.state_.clickedLoadTextCodeButtonLast && this.removeLoadSaveListeners_(),
	      new ParallelAnimation([
	        this.createHelpMessageDirections(helpMsgManager, () => T2C.MSG.currentLanguage.BUTTON_LOAD_TEXT_CODE, ""),
	        new BlinkAnimation(ptr || this.createPointer(), {
	          totalSteps: 100,
	          toggleSteps: 25,
	          startPosition: () => {
	            return {
	              x: document.getElementById("load-save-text-code").offsetLeft + document.getElementById("load-save-text-code").offsetWidth/2,
	              y: document.getElementById("load-save-text-code").offsetTop + document.getElementById("load-save-text-code").offsetHeight/2
	            };
	          },
            container: document.getElementById("blockly-div"),
            addAtStart: !ptr,
            removeAtEnd: !ptr
	        })
	      ])
	    )
	  );
  }
}

export default LevelGenerator;