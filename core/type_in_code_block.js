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
 * @fileoverview Class to handle type-in-code block creation
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to handle type-in-code block creation
 */

import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";

class TypeInCodeBlock {
  constructor(blockName) {
  	this.blockName_ = blockName;
  	this.possibleMatches_ = [];
  	this.possibleErrorFunctions_ = [];
  	this.currentExp_ = "";
  	this.hasUnknownError_ = false;

  	this.standardErrorMessages = {
  		MISTYPED_TERMINAL: (terminal, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED
  		    .replace("%1", T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] || terminal),
  		MISSING_OPEN_PARENTHESIS: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_OPEN_PARENTHESIS
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_OPEN_BRACKET: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_OPEN_BRACKET
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_CLOSE_PARENTHESIS: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_CLOSE_PARENTHESIS
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_CLOSE_BRACKET: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_CLOSE_BRACKET
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_PERIOD_AFTER_VARIABLE: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_PERIOD_AFTER_VARIABLE
  		    .replace("%1", matchResultArr[forIndex]),
  		UNNECESSARY_OPEN_PARENTHESIS: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_WARNING_UNNECESSARY_OPEN_PARENTHESIS
  		    .replace("%1", matchResultArr[forIndex]),
  		UNKNOWN: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_UNKNOWN_ERROR
  		    .replace("%1", matchResultArr[forIndex])
  	};
  }

  oneStartsWithOther_(s, t, matchCase=false) {
    const compareS = matchCase ? s : s.toLowerCase();
    const compareT = matchCase ? t : t.toLowerCase();

    return compareS.startsWith(compareT) || compareT.startsWith(compareS);
  }

  getAfterTerminal_(inputted, terminal) {
		// JavaScript built-in substring method overriden for beginner intended use;
		// this is used to get back some of the index out-of-bounds behavior;
		// TODO: Preserve reference to built-in one and remove this function   
		String.prototype.JSSubstring = function(startIndex, endIndex) {
		  if(startIndex >= this.length || startIndex === endIndex) return "";
		  else return this.substring(startIndex, endIndex);
		}

    const langTerminals = Object.values(T2C.MSG)
      .map(langObj => langObj["TERMINAL_" + terminal.toUpperCase()])
      .filter(text => typeof text === "string");
    const val = langTerminals.find(text => this.oneStartsWithOther_(text, inputted, true));
      // text.startsWith(inputted) || inputted.startsWith(text));
    if(val) {
      return {terminal: val, remaining: inputted.JSSubstring(val.length).trim()};
    }
    // return undefined otherwise
  }

  getTerminalIndexForSymbol_(patternArr, index) {
  	if(["[", "(", "."].indexOf(patternArr[index]) !== -1) {
  		return index-1;
  	}
  	else if([")", "]"].indexOf(patternArr[index]) !== -1) {
  		// rule should be beyond short enough that rebuilding stack each time
  		// is not an efficiency concern
  		const stack = [];
  		for(let i = 0; i < index; i++) {
  			// console.log(stack, patternArr[i]);
  			if(patternArr[i] === "(" || patternArr[i] === "[") {
  				stack.push(i);
  			}
  			else if([")", "]"].indexOf(patternArr[i]) !== -1) {
  				const topSymbol = patternArr[stack[stack.length-1]]; 
  				console.assert(
  					["(", "["].indexOf(topSymbol) === [")", "]"].indexOf(patternArr[i]), 
  					"Opening bracket/parenthesis not closed in type-in-code block pattern."
  				);
  				stack.pop();
  			}
  		}
  		return stack[stack.length-1]-1;
  	}
  }

  displayMessage_(msg, erasePrevious=true) {
	  let alertDisplay = document.getElementById("alert-display");
	  if(!alertDisplay) {
	    alertDisplay = document.createElement("div");
	    alertDisplay.id = "alert-display";
	    alertDisplay.style.fontSize = "small";
	    alertDisplay.style.fontWeight = "bold";
	    alertDisplay.style.borderColor = "#000";
	    alertDisplay.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
	    alertDisplay.style.color = "#f00";
	    alertDisplay.style.position = "absolute";
	    alertDisplay.style.zIndex = "1050";
	    alertDisplay.style.width = "98%";
	    alertDisplay.style.minHeight = "50px";
	    alertDisplay.style.left = "0";
	    alertDisplay.style.bottom = "0";
	    alertDisplay.style.textAlign = "left";
	    alertDisplay.style.padding = "1%";
	    document.body.appendChild(alertDisplay);
	  }
	  if(erasePrevious) {
	    alertDisplay.innerText = msg;
	  } else {
	    alertDisplay.innerText += msg;
	  }
	}

	/**
	 * attempts to match s against matchArr, producing appropriate errors
	 * @param {string} s the string to parse
	 * @param {!Array.<string|{token: string, type: string}>} matchArr 
	 * @returns {{match: Array.<string>, error: boolean, remainingText: string}} match is the array of matches 
	 * up to the first unsuccessful match, if any; 
	 * error is true exactly when there was an unsuccessful match;
	 * remainingText is the unmatched text
	 */
  matchStatement_(s, matchArr) {
	  let matchResultArr = [];
	  let remainingText = s;
	  let processedMatch = "";
	  let matchResult;
	  let hasError = false;
	  let i = -1;

	  while(i < matchArr.length-1 && remainingText && !hasError) {
	    ++i;
	    if(typeof matchArr[i] === "string") {
	      if(remainingText.length < matchArr[i].length && matchArr[i].startsWith(remainingText)) {
	        matchResult = remainingText;
	        remainingText = "";
	      } else if(remainingText.startsWith(matchArr[i])) {
	        matchResult = matchArr[i];
	        remainingText = remainingText.substring(matchArr[i].length).trim();
	      } else {
	        hasError = true;
	      }
	    } else if(matchArr[i].type === "terminal") {
	      const result = this.getAfterTerminal_(remainingText.trim(), matchArr[i].token);
	      if(result) {
	        matchResult = result.terminal;
	        remainingText = result.remaining;
	      } else {
	        hasError = true;
	      }
	    } else if(matchArr[i].type === "regexp") {
	      const result = remainingText.trim().match(matchArr[i].token);
	      // console.log("REG", result, remainingText.trim())
	      if(result) {
	        matchResult = result[0];
	        remainingText = remainingText.substring(result[0].length).trim();
	      } else {
	        hasError = true;
	      }
	    } else {
	      // unknown type
	      hasError = true;
	    }

	    if(!hasError) {
	      matchResultArr.push(matchResult);
	    }
	  }

	  // displayMessage("") should not be part of non-error
	  return {
	  	match: matchResultArr, 
	  	error: hasError, 
	  	remainingText: remainingText
	  };

	    //errorMsg: hasError ? errorFunctionArr[i](matchResultArr, remainingText) : 
	    //(this.displayMessage_("") || "")};
	}

	hasFullMatch_(s) {
		return this.possibleMatches_.find(possibleMatchArr => {
		  const match = this.matchStatement_(s, possibleMatchArr).match;
		  return possibleMatchArr.length === match.length;
		});
	}

	generateErrorFunction(errorHandler, patternArr, index) {
		const pattern = patternArr[index];
		/*if(errorHandler instanceof Array) {
			return (matchResultArr, remaining) => {
				for(let i = 0; i < errorHandler.length && 
					generateErrorFunction(errorHandler[i], pattern[i])(matchResultArr, remaining); i++);
			};
		} else*/ 
		if(errorHandler instanceof Function) {
			// console.log("E", index, errorHandler);
			return errorHandler;
		} else if(typeof errorHandler === "string") {
			// return this.displayMessage_.bind(this, errorHandler);
			// return () => this.displayMessage_(errorHandler);
			return () => errorHandler;
		} else if(errorHandler && errorHandler.type === "GENERIC_MESSAGE") {
			errorHandler.args = Array.isArray(errorHandler.args) ? errorHandler.args : [];
			return (matchResultArr, remaining) => 
			  this.standardErrorMessages[errorHandler.value](...errorHandler.args, matchResultArr, remaining)
			/*
			return (matchResultArr, remaining) => 
			  this.displayMessage_(this.standardErrorMessages[errorHandler.value](...errorHandler.args, matchResultArr, remaining))
			*/
			//return this.displayMessage_.bind(this, 
			//	this.standardErrorMessages[errorHandler.value](...errorHandler.args, matchResultArr, remaining));
		} else {
			// empty or not recognized
			let messageType = "UNKNOWN";
			const args = [];
			if(pattern && typeof pattern === "string") {
				let indexOfPattern = ["(", "[", ")", "]", "."].indexOf(pattern);
        if(indexOfPattern !== -1) {
			  	messageType = ["MISSING_OPEN_PARENTHESIS", "MISSING_OPEN_BRACKET", 
			  	"MISSING_CLOSE_PARENTHESIS", "MISSING_CLOSE_BRACKET", "MISSING_PERIOD_AFTER_VARIABLE"][indexOfPattern];
			  	args.push(this.getTerminalIndexForSymbol_(patternArr, index));
			  }
			}
			
			if(pattern.type && pattern.type.toUpperCase() === "TERMINAL" || this.equalsTerminal_(pattern)) {
				messageType = "MISTYPED_TERMINAL";
				//console.log("PATTERN", pattern);
				args.push(pattern.type ? pattern.token : pattern);
				//console.log("ARGS", args)
			}

      // console.log("MSG", messageType, this.standardErrorMessages[messageType], args);
      // console.log("MSG", messageType, this.standardErrorMessages[messageType](...args, [], "ac"));
		  // this.displayMessage_(this.standardErrorMessages[messageType](...errorHandler.args, matchResultArr, remaining));
			return (matchResultArr, remaining) => 
			  this.standardErrorMessages[messageType](...args, matchResultArr, remaining);
		}

		/*else if(!errorHandler) {
			if()
		}*/
		/*else if(!errorHandler) {

		} else {
			return () => this.displayMessage_("");
		}*/
	}

	equalsTerminal_(s) {
    return Object.values(T2C.MSG)
      .find(langObj => Object.keys(langObj).find(key => 
      	key.toUpperCase().startsWith("TERMINAL_") && langObj[key] === s));
	}

	setCurrentExp(exp) {
		this.currentExp_ = exp;
	}

  addPossibleMatch(arr, errorArr) {
  	this.possibleMatches_.push(arr);
  	this.possibleErrorFunctions_.push(
  		errorArr
  	  .map((errorItem, index) => this.generateErrorFunction(errorItem, arr, index))
  	);
  }

  getErrorFeedback() {
  	const result = this.possibleMatches_.reduce((acc, pattern, index) => {
  		const patternResult = this.matchStatement_(this.currentExp_, pattern);
  		patternResult.pattern = pattern;
  		patternResult.index = index;
  		// return (acc.pattern.length === 0 || !patternResult.error && acc.error || patternResult.match.length/pattern.length > acc.match.length/acc.pattern.length) ? 
  		return (acc.pattern.length === 0 || !patternResult.error && acc.error || patternResult.match.length > acc.match.length) ? 
  		  patternResult : acc;
  	}, {pattern: [], match: [], error: true, remainingText: this.currentExp_, index: -1});

  	if(result.error) {
      return this.possibleErrorFunctions_[result.index][result.match.length](result.match, result.remainingText);
    } else if(this.hasUnknownError_) {
    	return T2C.MSG.currentLanguage.TYPEIN_UNKNOWN_ERROR;
    } else {
	    return "";
	  }
  }

  addToBlocks(options={}) {
  	const typeInCodeBlock = this;
  	Blockly.Python[this.blockName_] = Blockly.JavaScript[this.blockName_] = Blockly.JavaScript['code_statement'];
  	Blockly.Blocks[this.blockName_] = {
		  validate: (exp) => {
		  	const result = this.possibleMatches_.reduce((acc, pattern, index) => {
		  		const patternResult = this.matchStatement_(exp, pattern);
		  		patternResult.pattern = pattern;
		  		patternResult.index = index;
		  		return (!patternResult.error && acc.error || patternResult.match.length/pattern.length >= acc.match.length/acc.pattern.length) ? 
		  		  patternResult : acc;
		  	}, {pattern: [false], match: [], error: true, remainingText: exp, index: -1});
		  	
        this.setCurrentExp(exp);

        if(result.error) {
        	// this.setCurrentExp(exp);
        	// this.possibleErrorFunctions_[result.index][result.match.length](result.match, result.remainingText);
        } else { 
	        // this.displayMessage_("");
	        return exp;
	      }

		  	return result.error ? result.match.join("") : exp;

		  	// this.possibleErrorFunctions_[0]
		  	// const result = this.matchStatement_(exp, this.possibleMatches_[0], this.possibleErrorFunctions_[0]);
		  	// return result.error ? result.match.join("") : exp;
		  },

		  init: function() {
		    this.appendDummyInput("STRING")
		        .appendField(new Blockly.FieldTextInput("", this.validate), "EXP");
		    this.setInputsInline(false);
		    this.setOutput(options.isExpression);
		    this.setPreviousStatement(!options.isExpression);
		    this.setNextStatement(!options.isExpression);
		    this.setColour(60);
		    this.setTooltip(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TOOLTIP);
		    this.onchange = e => {
		    	const exp = this.getFieldValue("EXP");
		      typeInCodeBlock.hasUnknownError_ = false;
	        if(exp.length > 0 && e.element === "workspaceClick" && typeInCodeBlock.hasFullMatch_(exp)) {
	          const parseTree = getParseTree(this.getFieldValue("EXP"));
	          if(parseTree) {
	            handleParseTreeToBlocks(parseTree, this);
	          } else {
	            //displayMessage(T2C.MSG.currentLanguage.TYPEIN_UNKNOWN_ERROR);
	            //alert(T2C.MSG.currentLanguage.TYPEIN_UNKNOWN_ERROR);
	            typeInCodeBlock.hasUnknownError_ = true;
	          }
	        }
		    };
		    //this.onchange = parseAndConvertToBlocks.bind(this, props);
		  },
		  /*validate: function(colourHex) {
		    console.warn("something");
		    this.setColour("#f00");
		  }*/
		};
  }
}

export default TypeInCodeBlock;