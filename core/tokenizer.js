/**
 * Copyright 2018, 2020 Text2Code Authors
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

"use strict";

/**
 * Lexer
 */
class Tokenizer {

	/**
   * Create a Tokenizer from supplied token definitions and associated precedence rules
   * @param {!Object.<string, {pattern:RegExp, order:number}>} tokens Definition 
   * of lexical tokens with orders denoting precedence for matching.
   */
  constructor(tokens) {
  	// tokens used from grammar.js, should modularize
  	this.tokens_ = tokens;
	  this.tokensRegExp_ = Object.keys(tokens).map(key => {
		  return {key: key, value: RegExp(tokens[key].pattern), order: tokens[key].order};
	  });

	  this.tokensRegExp_.sort((a, b) => a.order - b.order);
  }

  /**
   * Determines whether supplied string matches the pattern for a token
   * @param {!string} s the string to check
   * @return {boolean} returns true exactly when s is token
   */
  isToken(s) {
  	// TODO
  	return false;
  }

  /**
   * Determines whether s is a token type
   * @param {!string} s the string to check
   * @return {boolean} returns true exactly when s is a token type
   */
  isTokenType(s) {
  	return Object.keys(this.tokens_).indexOf(s) !== -1;
  	//return Object.keys(this.tokensRegExp_).indexOf(s) !== -1;
  }

	/**
   * Tokenizes the code string, yielding an Array of tokens
   * @param {string} codeString the code string to tokenize 
   * @return {!Array.<{tokenType: string, value: string}>} Array of tokens from code string
   */
  tokenize(codeString) {
	  const helper = str => {
		  if(str.trim() === "") return [];
		  let match, i = 0;
		  while(i < this.tokensRegExp_.length && !(match = this.tokensRegExp_[i].value.exec(str))) {
		    i++;
		  }
		  if(!match) {
		  	return str.trim().split("").filter(char => char.search(/\s/) === -1)
			    .map(char => Object({tokenType: "none", value: char}));
			}
		  else {
		    // only use first captured part if capturing parentheses are present
		    let capturedPart = match instanceof Array ? match.slice(1).find(matchPart => matchPart != null) : null;
		    let usedPart = capturedPart != null ? capturedPart : str.substring(match.index, match.index + match[0].length);
		    return helper(str.substring(0, match.index)).concat( 
					[{tokenType: this.tokensRegExp_[i].key, value: usedPart}])
		      .concat(helper(str.substring(match.index + match[0].length))
		    );
		  }
	  };

	  return helper(codeString);
	}
}

export default Tokenizer;