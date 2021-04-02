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
  constructor(blockName, options={}) {
  	this.blockName_ = blockName;
  	this.possibleMatches_ = [];
  	this.possibleErrorFunctions_ = [];
  	this.currentExp_ = "";
  	this.hasUnknownError_ = false;
  	this.options_ = options;

  	this.standardErrorMessages = {
  		EXTRA_AT_END: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_REMOVE_EXTRA_AT_END
  		    .replace("%1", remaining),
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
    if(typeof val === "string") {
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
	  let isMatchComplete;

	  while(i < matchArr.length-1 && remainingText && !hasError) {
	  	isMatchComplete = false;
	    ++i;
	    if(typeof matchArr[i] === "string") {
	      if(remainingText.length < matchArr[i].length && matchArr[i].startsWith(remainingText)) {
	        matchResult = remainingText;
	        remainingText = "";
	      } else if(remainingText.startsWith(matchArr[i])) {
	        matchResult = matchArr[i];
	        remainingText = remainingText.substring(matchArr[i].length).trim();
	        isMatchComplete = true;
	      } else {
	        hasError = true;
	      }
	    } else if(matchArr[i].type === "terminal") {
	    	// currently isMatchComplete is always false in this case, adjust getAfterTerminal
	      const result = this.getAfterTerminal_(remainingText.trim(), matchArr[i].token);
	      if(result) {
	        matchResult = result.terminal;
	        remainingText = result.remaining;
	      } else {
	        hasError = true;
	      }
	    } else if(matchArr[i].type === "regexp") {
	    	// this logic doesn't have automatic way for determining partial matches of regexp from full match, 
	    	// currently caller needs to explicitly tell it what partial match means in tokenPartial,
	    	// needed when regexp is last pattern to match so type-in-block knows when to turn green indicating
	    	// full match 
	      let result = remainingText.trim().match(matchArr[i].token); 
	      const partialResult = matchArr[i].tokenPartial && remainingText.trim().match(matchArr[i].tokenPartial);
	      // console.log("REG", result, remainingText.trim())
	      if(result || partialResult) {
	      	if(result) {
	      		isMatchComplete = true;
	      	} else {
	      		result = partialResult;
	      	}
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

    // add matches for regex that match empty strings
	  if(!remainingText && isMatchComplete) {
	  	while(i < matchArr.length-1 && matchArr[++i] && matchArr[i].type === "regexp" && matchArr[i].token.test("")) {
	  		matchResultArr.push("");
	  	}
	  }

	  // displayMessage("") should not be part of non-error
	  return {
	  	match: matchResultArr, 
	  	error: hasError, 
	  	remainingText: remainingText,
	  	isMatchComplete
	  };

	    //errorMsg: hasError ? errorFunctionArr[i](matchResultArr, remainingText) : 
	    //(this.displayMessage_("") || "")};
	}

	hasFullMatch(s, allowExtra=true) {
		/*
		return this.possibleMatches_.find(possibleMatchArr => {
		  const {match, error, remainingText, isMatchComplete} = 
		    this.matchStatement_(s, possibleMatchArr);//.match;
		  return isMatchComplete && 
		    (possibleMatchArr.length === match.length && allowExtra || 
		    possibleMatchArr.length === match.length && !remainingText);
		});
		*/
		/*
	  return this.possibleMatches_.find(possibleMatchArr => {
	  	const usePossibleMatchArr = allowExtra ? 
	  	  possibleMatchArr : possibleMatchArr.concat({type: "regexp", token: /^$/});
		  const {match, error, remainingText, isMatchComplete} = 
		    this.matchStatement_(s, usePossibleMatchArr);//.match;
		  return isMatchComplete && (usePossibleMatchArr.length === match.length);
		});
		*/
		return (allowExtra && this.possibleMatches_ || this.addNoExtraMatches_())
		  .find(possibleMatchArr => {
		    const {match, error, remainingText, isMatchComplete} = 
		      this.matchStatement_(s, possibleMatchArr);//.match;
		    return isMatchComplete && (possibleMatchArr.length === match.length);
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
			return (matchResultArr, remaining) => {
				if(messageType === "UNKNOWN") {
					if(pattern && typeof pattern === "string" && !pattern.startsWith("(") && remaining.startsWith("(")) {
						messageType = "UNNECESSARY_OPEN_PARENTHESIS";
					}
				}
			  return this.standardErrorMessages[messageType](...args, matchResultArr, remaining);
			}
		}

		/*else if(!errorHandler) {
			if()
		}*/
		/*else if(!errorHandler) {

		} else {
			return () => this.displayMessage_("");
		}*/
	}

  /**
   * Finds language object with this terminal if such a language exists; returns undefined otherwise
   * @param {string} s the string to determine if a terminal
   * @returns {Object|undefined} a language object with a key prefixed with TERMINAL whose value is s
   * or undefined if no such language object exists 
   */
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

  addAllPossibleLanguageMatches(arr, errorArr) {
  	// This method currently only does terminal substitutions when they're in the same place
  	const languageMatchArrays = 
	  	Object.values(T2C.MSG)
	  	  .map(langObj => arr
	  	  	.map(pattern => (pattern && pattern.type === "terminal") ? 
	  	  		(typeof langObj["TERMINAL_" + pattern.token.toUpperCase()] === "string" ? 
	  	  			langObj["TERMINAL_" + pattern.token.toUpperCase()] : pattern.token) : pattern)
	  	  	);
	  languageMatchArrays.forEach(langMatchArr => {
	  	this.addPossibleMatch(langMatchArr, errorArr);
	  });
  }

  addNoExtraMatches_(possibleMatchesArr) {
  	possibleMatchesArr = possibleMatchesArr || this.possibleMatches_;
  	return possibleMatchesArr.map(possibleMatch => 
  		possibleMatch.concat({type: "regexp", token: /^$/}));
  }

  /**
   * Add error function for extra text at end of match (e.g., print("foo")garbage)
   */  
  addNoExtraErrorMessages_(errorFunctionArr) {
  	errorFunctionArr = errorFunctionArr || this.possibleErrorFunctions_;
  	return errorFunctionArr.map(errorFunctionArr => 
  		errorFunctionArr.concat(
  			(matchResultArr, remaining) => 
  			  this.standardErrorMessages.EXTRA_AT_END("", matchResultArr, remaining)
  		)
  	);
  }

  getErrorFeedback(currentExp) {
  	currentExp = typeof currentExp === "string" ? currentExp : this.currentExp_;
  	const result = this.addNoExtraMatches_().reduce((acc, pattern, index) => {
  		const patternResult = this.matchStatement_(this.currentExp_, pattern);
  		patternResult.pattern = pattern;
  		patternResult.index = index;
  		if(patternResult.error && !acc.error) {
  			return acc;
  		} else if(!patternResult.error && acc.error) {
  			return patternResult;
  		} else {
  			// return acc.pattern.length === 0 || (patternResult.match.length/pattern.length > acc.match.length/acc.pattern.length) ?
  		  return acc.pattern.length === 0 || (patternResult.match.filter(x => x).length > acc.match.filter(x => x).length) ? 
  		    patternResult : acc;
  		}
		}, {pattern: [], match: [], error: true, remainingText: this.currentExp_, index: -1});
// if(currentExp && this.addNoExtraMatches_().length > 0) throw new Error(JSON.stringify(result));
/*
  	const result = this.possibleMatches_.reduce((acc, pattern, index) => {
  		const patternResult = this.matchStatement_(this.currentExp_, pattern);
  		patternResult.pattern = pattern;
  		patternResult.index = index;
  		// return (acc.pattern.length === 0 || !patternResult.error && acc.error || patternResult.match.length/pattern.length > acc.match.length/acc.pattern.length) ? 
  		return (acc.pattern.length === 0 || !patternResult.error && acc.error || patternResult.match.length > acc.match.length) ? 
  		  patternResult : acc;
  	}, {pattern: [], match: [], error: true, remainingText: this.currentExp_, index: -1});
*/
  	if(result.error) {
  		// result.index = result.match.join("") ? result.index : 0; // has at least one match
      return this.addNoExtraErrorMessages_()[result.index][result.match.length](result.match, result.remainingText);
    } else if(this.hasUnknownError_) {
    	return T2C.MSG.currentLanguage.TYPEIN_UNKNOWN_ERROR;
    } else {
	    return "";
	  }
  }

  getCodeGeneratorForLanguage(langCode, isStatement) {
  	const typeInBlockObj = this;
  	return function(block) {
  	  const exp = block.getFieldValue("EXP");
  	  let i = 0;

  	  while(i < typeInBlockObj.possibleMatches_.length) {
  	  	const langObj = T2C.MSG[langCode];
  	  	const possibleMatchArr = typeInBlockObj.possibleMatches_[i];
  	  	const {match, error, remainingText, isMatchComplete} = 
  	  	  typeInBlockObj.matchStatement_(exp, possibleMatchArr);
        if(possibleMatchArr.length === match.length && !remainingText && isMatchComplete) {
        	const code = match
        	  .map((matchPart, index) => {
        	  	const pattern = possibleMatchArr[index];
        	  	if(pattern && pattern.type === "terminal") {
        	  		if(typeof langObj["TERMINAL_" + pattern.token.toUpperCase()] === "string") {
        	  			return langObj["TERMINAL_" + pattern.token.toUpperCase()];
        	  		} else {
        	  			return pattern.token;
        	  		}
        	  	} else if(typeof pattern === "string" && typeInBlockObj.equalsTerminal_(pattern)) {
        	  		// THIS WON'T NECESSARILY WORK IF MULTIPLE TERMINAL KEYS WITH SAME VALUE
        	  		// console.log("HERE", pattern, langObj);
        	  		const usedLangObj = typeInBlockObj.equalsTerminal_(pattern)
        	  		const terminalKey = Object.keys(usedLangObj)
        	  		  .find(key => key.toUpperCase().startsWith("TERMINAL_") && usedLangObj[key] === pattern)
        	  		return terminalKey ? langObj[terminalKey] : pattern;
        	  	} else {
        	  		return matchPart;
        	  	}
        	  })
        	  .join("");

        	if(isStatement) {
        		return (code.endsWith(T2C.MSG[langCode].STATEMENT_SEPARATOR) ? 
        			code : (code + T2C.MSG[langCode].STATEMENT_SEPARATOR)) + "\n";
        	} else {
        		return [code, Blockly[T2C.MSG[langCode].LANGUAGENAME].ORDER_NONE]
        	}
        }
        ++i;
  	  }

  	  return "";
  	};
  }

  addToBlocks(options={}) {
  	const typeInCodeBlock = this;
  	Blockly.Python[this.blockName_] = this.getCodeGeneratorForLanguage("PY", !options.isExpression);
  	Blockly.JavaScript[this.blockName_] = this.getCodeGeneratorForLanguage("JS", !options.isExpression);
  	// Blockly.Python[this.blockName_] = Blockly.JavaScript[this.blockName_] = Blockly.JavaScript['code_statement'];
  	Blockly.Blocks[this.blockName_] = {
		  validate: function(exp) {
		  	const sourceBlock = this.getSourceBlock();
		  	const result = typeInCodeBlock.possibleMatches_.reduce((acc, pattern, index) => {
		  		const patternResult = typeInCodeBlock.matchStatement_(exp, pattern);
		  		patternResult.pattern = pattern;
		  		patternResult.index = index;
		  		if(patternResult.error && !acc.error) {
		  			return acc;
		  		} else if(!patternResult.error && acc.error) {
		  			return patternResult;
		  		} else {
		  			// return acc.pattern.length === 0 || (patternResult.match.length/pattern.length >= acc.match.length/acc.pattern.length) ? 
		  			return acc.pattern.length === 0 || (patternResult.match.filter(x => x).length > acc.match.filter(x => x).length) ? 
		  		    patternResult : acc;
		  		}
		  	}, {pattern: [], match: [], error: true, remainingText: exp, index: -1});
		  	
		  	// probably don't want to change state in what should be pure validate function
        typeInCodeBlock.setCurrentExp(exp);
        if(result.error) {
        	console.log("ERROR", result);
        	sourceBlock.setColour("#800");
        	// this.setCurrentExp(exp);
        	// this.possibleErrorFunctions_[result.index][result.match.length](result.match, result.remainingText);
        } else if(typeInCodeBlock.hasFullMatch(exp, false)) {
        	sourceBlock.setColour("#080");
        } else {
        	sourceBlock.setColour(60);
	        // this.displayMessage_("");
	        // Blockly.utils.dom.addClass(htmlInput, 'blocklyInvalidInput');
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
		    	const hasFullMatch = typeInCodeBlock.hasFullMatch(exp, false);
		    	if(Blockly.selected !== this) {
		    		// update value to validated one that now appears on block
		    		// so there won't be error feedback for this one that now
		    		// has correct code
		    		typeInCodeBlock.setCurrentExp(exp);
		    		this.setColour(hasFullMatch ? "#080" : 60);
		    		// this.getColour()
		    		// this.setColour(this.getColour());
		    	}
		    	// console.log(this.type, Blockly.selected !== this, exp, typeInCodeBlock.currentExp_)
		      typeInCodeBlock.hasUnknownError_ = false;
		      /*
		      if(hasFullMatch) {
		      	// this.setColour("#afa");
		      	this.setColour("#080");
		      } else if(exp !== typeInCodeBlock.currentExp_) {
		      	// this.setColour("#faa"); // Blockly Error color (https://github.com/google/blockly/blob/fd239e49b2ad1bd9adaf00dcac74b247f94558d9/core/css.js#L439)
		        this.setColour("#800");
		      } else {
		      	this.setColour(60);
		      }*/
	        if(exp.length > 0 && e.element === "workspaceClick" && hasFullMatch) {
	        	if(typeInCodeBlock.options_.collapseWhenFinished) {
	        		return this.setCollapsed(true);
	        	}
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