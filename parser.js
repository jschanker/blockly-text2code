/**
 * Copyright 2018 Text2Code Authors
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
 * @fileoverview Initial Parser for Textual Code
 * Used for converting text to blocks
 * @author Jason Schanker
 */

"use strict";
/** Class for parsing textual code **/
class Parser {
  /**
   * Create a new parser from the given lexer and grammar rules
   * @param{!Tokenizer} lexer the lexer to use 
   * @param{!Object.<rules:!Object, terminals:!Array.<string>, tokens:!Object>} grammar the 
   * formal grammar to use
   * @param{Array.<string>?} requiredSymbols the relevant nonterminal symbols; production
   * rules involving non-required non-terminal symbols may be supressed in the parse tree 
   */
  constructor(lexer, grammar, requiredSymbols) {
    this.lexer_ = lexer;
    this.createRuleSetFromGrammar_(grammar);
    requiredSymbols = requiredSymbols || [];
    //this.flattenNonessentialUnitRules_(requiredSymbols.concat("statement").concat(grammar.terminals));
    console.warn("NEW RULE SET:", this.ruleSets_);
    this.terminals_ = grammar.terminals;
    this.maxDepth_ = 0;
  }

  addRule_(lhs, rhs, ruleSets) {
    ruleSets = ruleSets || this.ruleSets_;
    if(!ruleSets[lhs]) {
      ruleSets[lhs] = new Set([rhs]);
    } else {
      let serializedRHS = Array.from(ruleSets[lhs])
        .filter(rhside => Array.isArray(rhside))
        .map(rhside => JSON.stringify(rhside));
      if(!Array.isArray(rhs) || serializedRHS.indexOf(JSON.stringify(rhs)) === -1) {
        ruleSets[lhs].add(rhs);
      }
    }    
  }

  // long running function, should be placed in build file if used

  flattenNonessentialUnitRules_(requiredSymbols) {
    const leftHandSides = Object.keys(this.ruleSets_);
    const nonessentialLHSides = leftHandSides.filter(lhs => requiredSymbols.indexOf(lhs) === -1);
    console.warn("Required symbols", requiredSymbols)
    console.warn("Nonessential", nonessentialLHSides)
    nonessentialLHSides.forEach((ruleLHS, index) => {
      console.warn("Current: ", ruleLHS, index, "out of", nonessentialLHSides.length, "processed");
      const unitRHSidesPre = Array.from(this.ruleSets_[ruleLHS]).filter(rhs => //typeof rhs === "string" || 
        Array.isArray(rhs) && rhs.length === 1)
      const unitRHSides = unitRHSidesPre.map(rhs => typeof rhs === "string" ? rhs : rhs[0]);
      // create new righthand sides where each occurrence of ruleLHS in RHS is replaced with all 
      // occurrences of unitRHSSides, e.g., for n > 0 occurrences of ruleLHS, this creates
      // unitRHSSides**n new right-hand sides 
      leftHandSides.forEach(leftHandSide => {
        const allNewRHSides = [];
        const removeCandidates = [];
        Array.from(this.ruleSets_[leftHandSide])
          .filter(rhs => Array.isArray(rhs))
          // for each Array in ruleSets_[leftHandSide], replace all unit rhs sides
          .forEach(rhs => {
            let newRHSides = [];
            let replaced = false;
            rhs.forEach((part, index) => {
              if(part !== ruleLHS) {
                if(index === 0) newRHSides.push([part]);
                else {
                  newRHSides.forEach(head => head.push(part));
                }
              } else {
                replaced = true;
                if(index === 0) newRHSides = unitRHSides.map(rhs => [rhs]); 
                else newRHSides = cartesianProductPairArray(newRHSides, unitRHSides)
                  .map(pair => pair[0].concat(pair[1]));
              }
            })

            if(replaced) removeCandidates.push(rhs);
            allNewRHSides.push(...newRHSides);
          })
        allNewRHSides.forEach(newRHSide => this.addRule_(leftHandSide, newRHSide));
        if(unitRHSidesPre.length === this.ruleSets_[ruleLHS].size) {
          removeCandidates.forEach(candidate => {
            if(!this.ruleSets_[leftHandSide].delete(candidate)) throw new Error(candidate);
          });
        }
      });

      // remove unit rules from 
      unitRHSidesPre.forEach(rhs => {
        if(!this.ruleSets_[ruleLHS].delete(rhs)) throw new Error("No delete"); 
      });
    })
  }

  getTranslations_(symbol) {
    return Object.keys(T2C.MSG).map(langCode => 
      T2C.MSG[langCode][Object.keys(T2C.MSG[langCode]).find(key => key === "TERMINAL_" + symbol.toUpperCase())])
    .filter(langValue => typeof langValue !== "undefined");
  }

  createRuleSetFromGrammar_(grammar) {
    this.ruleSets_ = {};
    Object.keys(grammar.rules).forEach(ruleLHS => {
      const potentialTerminals = [ruleLHS]; // this is hacky, should get this from terminals from grammar
      const rhs = grammar.rules[ruleLHS];
      if(typeof rhs !== "string" && !(rhs instanceof Array)) {
        Object.keys(rhs).forEach(lhs => {
          this.addRule_(ruleLHS, [lhs]);
          //if(rhs[lhs] !== "token_") 
          this.addRule_(lhs, rhs[lhs]);
          potentialTerminals.push(lhs);
          if(typeof rhs[lhs] === "string") {
            potentialTerminals.push(rhs[lhs]);
          }
        });
      } else {
        if(typeof rhs === "string") {
          potentialTerminals.push(rhs);
        }
        this.addRule_(ruleLHS, rhs);
      }
      potentialTerminals.forEach(terminal => this.getTranslations_(terminal)
        .forEach(langValue => this.addRule_(ruleLHS, langValue)));
    });
  }

  maxPathLengthToTerminalOrSplit_(start) {
    const arrOfDepths =
      (start ? [start] : Object.keys(this.ruleSets_)).map(ruleLHS => {
        if(!this.ruleSets_[ruleLHS]) {
          return [ruleLHS];
        }
        else {
          return Array.from(this.ruleSets_[ruleLHS])
            .filter(rhs => {
              return Array.isArray(rhs) && rhs.length === 1 && this.ruleSets_[rhs[0]];
            })
            .map(rhs => {
              return [ruleLHS].concat(this.maxPathLengthToTerminalOrSplit_(rhs[0]));
            });
        }
      });

    const candidates = start ? arrOfDepths[0] : [].concat(...arrOfDepths);

    if(candidates.length === 0) {
      return [start];
    }
    else {
      return candidates.reduce((acc, arr) => (acc.length > arr.length) ? acc : arr);
    }
  }

  getOppositeRules_() {
    const oppositeRules = {};

    Object.keys(this.ruleSets_).forEach(lhs => {
      //console.warn(lhs, Array.from(this.ruleSets_[lhs]));
      Array.from(this.ruleSets_[lhs]).forEach(rhs => {
        if(Array.isArray(rhs)) {
          if(rhs.length === 1) {
            // unit rules
            this.addRule_(rhs[0], lhs, oppositeRules);
          }
          /*
          else if(rhs.length === 2) {
            this.addRule_(JSON.stringify(rhs), lhs);
          }
          */
          else {
            // add intermediate rules to split up into series of rules with righthand 
            // sides of length 2 as necessary
            // E.g., split A -> BCDE into rules A -> (B,C,D)E; (B, C, D) -> (B, C)D; (B,C) -> BC
            // where (...) are each treated as single symbols
            // so generates opposite rules BC -> (B, C); (B, C)D -> (B, C, D); (B,C,D)E -> A   
            let currentLHS = lhs;
            rhs.slice(0,rhs.length-1).forEach((_, index) => {
              let newLHS = rhs.length-index-1 === 1 ? rhs[0] : 
                JSON.stringify(rhs.slice(0, rhs.length-index-1));
              this.addRule_(JSON.stringify([newLHS, rhs[rhs.length-index-1]]), currentLHS, oppositeRules);
              // currentLHS = Array.isArray(newLHS) ? JSON.stringify(newLHS) : newLHS;
              currentLHS = newLHS;
            });
          }
        } else {
          this.addRule_(rhs, lhs, oppositeRules);
        }
      });
    });

    return oppositeRules;
  }

  getUnitRules_(startParseForests, oppositeRules, maxDepth) {
    // handle unit rules
    const addedParseForests = [];
    let currentParseForests = startParseForests;
    for(let j = 0; j < maxDepth && currentParseForests.length > 0; j++) {
      let newParseForests = [];
      currentParseForests.forEach(pf => {
        if(oppositeRules[pf.rootLHS]) {
          Array.from(oppositeRules[pf.rootLHS])
            .filter(lhs => lhs !== pf.rootLHS)
            // remove duplicate rules 
//          .filter(lhs => !this.serializedInArr_({lhs: lhs, rhs: rulePair}, currentLevel[startPos].concat(newRulePairs)))
            .forEach(lhs => newParseForests.push(new ParseForest(lhs, [pf])));
        }
      });

      addedParseForests.push(...newParseForests);
      currentParseForests = newParseForests;
    }

    return addedParseForests;  
  }

  /**
   * Returns a parse tree for s or empty Array if there is none
   * @param{!string} s the code string to parse
   * @param {ParseTreeBlockConnector} ptbc
   * @return{!Array} the first derivation tree or empty Array if s 
   * is not in the language generated by the grammar
   */
  parseBottomUpCYK(s, ptbc) {
    const totalNumOfRules = Object.values(this.ruleSets_).reduce((acc, s) => acc + s.size, 0);
    const tokenArr = this.lexer_.tokenize(s);
    const maxPath = this.maxPathLengthToTerminalOrSplit_("statement");
    const oppositeRules = this.getOppositeRules_();
    console.warn("TOKEN ARRAY:", tokenArr);

    const levels = [tokenArr.map(token => 
      Array.from(oppositeRules[token.value] || []).concat(token.tokenType)
        .filter((lhs, index, arr) => arr.indexOf(lhs) === index)
        .map(lhs => new ParseForest(lhs, token.value)))];

    for(let startPos = 0; startPos < tokenArr.length; startPos++) {
      levels[0][startPos].push(...
        this.getUnitRules_(levels[0][startPos], oppositeRules, maxPath.length));
      levels[0][startPos] = ParseForest.mergeForests(levels[0][startPos]);
    }

    for(let i = 1; i < tokenArr.length; i++) {
      let currentLevel = [];
      for(let startPos = 0; startPos < tokenArr.length - i; startPos++) {
        let cartesianProduct = [];
        for(let levelNum = 0; levelNum < i; levelNum++) {
          // nonterminals on level levelNum have derivations of levelNum+1 terminals 
          let parseForestPairs = cartesianProductPairArray(levels[levelNum][startPos], 
            levels[i-1-levelNum][startPos+levelNum+1]);
          cartesianProduct.push(...parseForestPairs);
        }

        currentLevel.push(
          ParseForest.mergeForests(cartesianProduct.map(parseForestPair => 
            ({lhsides: oppositeRules[JSON.stringify([parseForestPair[0].rootLHS, parseForestPair[1].rootLHS])], 
              rhs: parseForestPair}))
            .filter(obj => typeof obj.lhsides !== "undefined")
          //.map(obj => Array.from(obj.lhsides).map(lhs => ({lhs: lhs, rhs: obj.rhs})))
            .map(obj => Array.from(obj.lhsides).map(lhs => {
              // if not intermediate rule
              if(!obj.rhs[0].rootLHS.startsWith("[")) {
                return new ParseForest(lhs, obj.rhs);
              }
              // replace intermediate rules
              else {
                return obj.rhs[0].rhsConcat(lhs, obj.rhs[1]);
              }
            }))
            .reduce((acc, arr) => acc.concat(arr),[]) // flatten
            ));

        // handle unit rules
        currentLevel[startPos].push(...
          this.getUnitRules_(currentLevel[startPos], oppositeRules, maxPath.length));
        currentLevel[startPos] = ParseForest.mergeForests(currentLevel[startPos]);
      }

      levels.push(currentLevel);
    }

    console.warn("LEVELS", levels);
    const result = levels[levels.length-1][0].find(parseForest => parseForest.rootLHS === "statement")
      .parseTrees(ptbc);
    console.warn("RESULT", result);

    return result; 
  }

  /** CODE BEYOND THIS POINT IS NOT USED BY CURRENT PARSER: LEGACY CODE 
      THAT'S BEEN PLACED ELSEWHERE/REWRITTEN TO INCREASE MAINTAINABILITY/EFFICIENCY **/

  matchLanguageToken_(rhs, token) { 
    return Object.keys(T2C.MSG).map(langCode => langCode.toUpperCase())
    .some(langCodeUpper => T2C.MSG[langCodeUpper] && T2C.MSG[langCodeUpper]["TERMINAL_" + rhs.toUpperCase()] === token.value);
  }

  flattenOneLevel_(arr) {
    return arr.reduce((acc, subArr) => acc.concat(subArr), []);
  }

  joinEachItemToFront_(items, arrs) {
    return this.flattenOneLevel_(arrs.map(arr => items.map(item => [item].concat(arr))));
  }

  getRHSOfTokenMatch_(lhs, token) {
    //if(Object.keys(tokens).indexOf(lhs) !== -1 && token.tokenType === lhs) {
    if(this.lexer_.isTokenType(lhs) !== -1 && token.tokenType === lhs) {
      return token.value;
    }
    // matchLanguageToken can use left side instead; then remove duplicate constants in msg language files
    else if(this.terminals_.indexOf(lhs) !== -1 && 
      Array.from(this.ruleSets_[lhs])
      .some(rhs => rhs === token.value || this.matchLanguageToken_(rhs,token))) {
      return token.value;
    }
    else return null;
  };

  isTerminal_(s) {
    return this.terminals_.indexOf(s) !== -1 ||
      this.lexer_.isTokenType(s);
      //Object.keys(tokens).indexOf(s) !== -1;
  }

  /**
   * Returns a parse tree for s or empty Array if there is none
   * @param{!string} s the code string to parse
   * @return{!Array} the first derivation tree or empty Array if s 
   * is not in the language generated by the grammar
   */
  parseTopDown(s) {
    console.log(this.ruleSets_);
    const totalNumOfRules = Object.values(this.ruleSets_).reduce((acc, s) => acc + s.size, 0);
    const tokenArr = this.lexer_.tokenize(s);
    const memo = new Memoizer();
    const maxPath = this.maxPathLengthToTerminalOrSplit_("statement");

    console.log("ARRAY:", maxPath, maxPath.length, totalNumOfRules);

    const parseHelper = (startFragment, startIndex, endIndex, maxRules) => {
      if(maxRules === 0 ||
         startFragment instanceof Array && startFragment.length === 0 || 
         startFragment instanceof Array && startFragment.length > endIndex - startIndex + 1) return [];
      else if(typeof startFragment === "string" && this.isTerminal_(startFragment)) {
        if(startIndex !== endIndex) return [];
        let rhs = this.getRHSOfTokenMatch_(startFragment, tokenArr[startIndex]);
        return rhs ? [{lhs: startFragment, rhs: [rhs]}] : [];
      }

      else if(typeof startFragment === "string") {
        return this.flattenOneLevel_(
                    Array.from(this.ruleSets_[startFragment])
                    .map(rhs => {
                      let results = memo.compute(parseHelper,[rhs, startIndex, endIndex, maxRules-1],0);
                      //if(result.some(r => r.length !== rhs.length)) throw new Error("Mismatch of lengths " + rhs + ": " + JSON.stringify(result));
                      if(results.some(r => r.length !== rhs.length)) {
                        console.log("throwing out", startFragment, JSON.stringify(results), rhs);
                        console.log("problem", rhs, results, results.find(r => r.length !== rhs.length));
                        return null;
                      }
                      return results.map(rootlessParseTree => ({lhs: startFragment, rhs: rootlessParseTree}));
                    })
                    .filter(result => result)
        );
      }

      // CASE WHEN startFragment.length is 1
      else if(startFragment instanceof Array && startFragment.length === 1) {
        let result = memo.compute(parseHelper, [startFragment[0], startIndex, endIndex, maxRules]);
        return result.length > 0 ? result.map(parseTree => [parseTree]) : [];
      }
      else {
        let parseTrees = [];
        for(let partitionIndex = startIndex; partitionIndex < endIndex; partitionIndex++) {
          //let prefix = memo.compute(parseHelper, [startFragment[0],startIndex,partitionIndex, maxPath.length*(partitionIndex-startIndex+1)]);
          let prefix = memo.compute(parseHelper, [startFragment[0],startIndex,partitionIndex, maxPath.length]);
          if(prefix.length > 0) {
            //let tail = memo.compute(parseHelper, [startFragment.slice(1),partitionIndex+1,endIndex, maxPath.length*(endIndex-startIndex)]);
            let tail = memo.compute(parseHelper, [startFragment.slice(1),partitionIndex+1,endIndex, maxPath.length]);
            if(tail.length > 0) {
              parseTrees.push(...this.joinEachItemToFront_(prefix, tail));
            }
          }
        }
        return parseTrees;
      }
    };

    console.log("Token Array:", tokenArr);
    //const result = memo.compute(parseHelper, ["statement", 0, tokenArr.length-1, maxPath.length*tokenArr.length]);
    const result = memo.compute(parseHelper, ["statement", 0, tokenArr.length-1, maxPath.length]);
    memo.clear();
    return result;
  }
}

console.log("Rules:", rules);

const tokenize = str => {
  // tokens used from grammar.js, should modularize
  let tokensRegExp = Object.keys(tokens).map(key => {
    return {key: key, value: RegExp(tokens[key].pattern), order: tokens[key].order};
  });
  tokensRegExp.sort((a, b) => a.order - b.order);

  const helper = str => {
    if(str.trim() === "") return [];
    let match, i = 0;
    while(i < tokensRegExp.length && !(match = tokensRegExp[i].value.exec(str))) {
      i++;
    }
    if(!match) return str.trim().split("")
                         .filter(char => char.search(/\s/) === -1)
                         .map(char => Object({tokenType: "none", value: char}));
    else {
      // only use first captured part if capturing parentheses are present
      let capturedPart = match instanceof Array ? match.slice(1).find(matchPart => matchPart != null) : null;
      let usedPart = capturedPart != null ? capturedPart : str.substring(match.index, match.index + match[0].length);
      return helper(str.substring(0, match.index)).concat( 
                [{tokenType: tokensRegExp[i].key, 
                 value: usedPart}]).concat(helper(str.substring(match.index + match[0].length)));
    }
  };
  return helper(str);
};

const memoizedFunc = (function() {
  let memo = {};
  let funcs = [];
  const memoizedFunc = (func, argArr) => {
    let uid = funcs.indexOf(func);
    if(uid === -1) {
      uid = funcs.length;
      funcs.push(func);
    }
    const arrToStr = arr => JSON.stringify(argArr.concat([uid]));
    const key = arrToStr(argArr.concat(uid));
    let retVal;

    if(key in memo) {
        retVal = memo[key];
    } else {
        // shallow freeze: prevent functions from making shallow changes
        // to memoized value 
        retVal = Object.freeze(func(...argArr));
        memo[key] = retVal;
    }

    return retVal;
  };

  memoizedFunc.clear = () => memo = {};

  return memoizedFunc;
})();


const parseTopDown = s => {
  let ruleSets = {};
  //let stringifiedRuleSegments = {};
  let totalNumOfRules;
  const tokenArr = tokenize(s);

  const addRule = (lhs, rhs) => {
    if(!ruleSets[lhs]) {
      ruleSets[lhs] = new Set([rhs]);
    } else {
      ruleSets[lhs].add(rhs);
    }
  };

  const maxPathLengthToTerminalOrSplit = (ruleSets, start) => {
    const arrOfDepths =
      (start ? [start] : Object.keys(ruleSets)).map(ruleLHS => {
        if(!ruleSets[ruleLHS]) {
          return [ruleLHS];
        }
        else {
          return Array.from(ruleSets[ruleLHS])
            .filter(rhs => {
              return Array.isArray(rhs) && rhs.length === 1 && ruleSets[rhs[0]];
            })
            .map(rhs => {
              return [ruleLHS].concat(maxPathLengthToTerminalOrSplit(ruleSets, rhs[0]));
            });
        }
      });

    const candidates = start ? arrOfDepths[0] : [].concat(...arrOfDepths);

    if(candidates.length === 0) {
      return [start];
    }
    else {
      return candidates.reduce((acc, arr) => (acc.length > arr.length) ? acc : arr);
    }
  };

  const matchLanguageToken = (rhs, token) => 
    Object.keys(T2C.MSG).map(langCode => langCode.toUpperCase())
      .some(langCodeUpper => T2C.MSG[langCodeUpper] && T2C.MSG[langCodeUpper]["TERMINAL_" + rhs.toUpperCase()] === token.value);

  const flattenOneLevel = arr => arr.reduce((acc, subArr) => acc.concat(subArr), []);
  const joinEachItemToFront = (items, arrs) => flattenOneLevel(arrs.map(arr => items.map(item => [item].concat(arr))));
  const getRHSOfTokenMatch = (lhs, token) => {
    if(Object.keys(tokens).indexOf(lhs) !== -1 && token.tokenType === lhs) {
      return token.value;
    }
    // matchLanguageToken can use left side instead; then remove duplicate constants in msg language files
    else if(rules.terminals.indexOf(lhs) !== -1 && 
            Array.from(ruleSets[lhs])
             .some(rhs => rhs === token.value || matchLanguageToken(rhs,token))) {
      return token.value;
    }
    else return null;
  };
  const isTerminal = s => rules.terminals.indexOf(s) !== -1 ||
          Object.keys(tokens).indexOf(s) !== -1;

  Object.keys(rules.rules).forEach(ruleLHS => {
    let rhs = rules.rules[ruleLHS];
    if(typeof rhs !== "string" && !(rhs instanceof Array)) {
      Object.keys(rhs).forEach(lhs => addRule(ruleLHS, [lhs]));
      Object.keys(rhs).forEach(lhs => {
        //if(rhs[lhs] !== "token_") 
        addRule(lhs, rhs[lhs])
      });
    } else {
      addRule(ruleLHS, rhs);
    }
  });

  totalNumOfRules = Object.values(ruleSets).reduce((acc, s) => acc + s.size, 0);
  const maxPath = maxPathLengthToTerminalOrSplit(ruleSets);
  console.log(maxPath, maxPath.length);

/*
  for(let startIndex = 0; startIndex < tokenArr.length; startIndex++) {
    for(let endIndex = startIndex; endIndex < tokenArr.length; endIndex++) {
      stringifiedRuleSegments[startIndex + "," + endIndex] = 
        JSON.stringify(tokenArr.slice(startIndex, endIndex+1)
                               .map(keyValuePair => keyValuePair));
    }
  }
*/

  const parseHelper = (startFragment, startIndex, endIndex, maxRules) => {
    if(maxRules === 0 ||
       startFragment instanceof Array && startFragment.length === 0 || 
       startFragment instanceof Array && startFragment.length > endIndex - startIndex + 1) return [];
    else if(typeof startFragment === "string" && isTerminal(startFragment)) {
      if(startIndex !== endIndex) return [];
      let rhs = getRHSOfTokenMatch(startFragment, tokenArr[startIndex]);
      return rhs ? [{lhs: startFragment, rhs: [rhs]}] : [];
    }

    else if(typeof startFragment === "string") {
      return flattenOneLevel(
                  Array.from(ruleSets[startFragment])
                  .map(rhs => {
                    let results = memoizedFunc(parseHelper,[rhs, startIndex, endIndex, maxRules-1],0);
                    //if(result.some(r => r.length !== rhs.length)) throw new Error("Mismatch of lengths " + rhs + ": " + JSON.stringify(result));
                    if(results.some(r => r.length !== rhs.length)) {
                      console.log("throwing out", startFragment, JSON.stringify(results), rhs);
                      console.log("problem", rhs, results, results.find(r => r.length !== rhs.length));
                      return null;
                    }
                    return results.map(rootlessParseTree => ({lhs: startFragment, rhs: rootlessParseTree}));
                  })
                  .filter(result => result)
      );
    }

    // CASE WHEN startFragment.length is 1
    else if(startFragment instanceof Array && startFragment.length === 1) {
      let result = memoizedFunc(parseHelper, [startFragment[0], startIndex, endIndex, maxRules]);
      return result.length > 0 ? result.map(parseTree => [parseTree]) : [];
    }
    else {
      let parseTrees = [];
      for(let partitionIndex = startIndex; partitionIndex < endIndex; partitionIndex++) {
        let prefix = memoizedFunc(parseHelper, [startFragment[0],startIndex,partitionIndex, maxPath.length*(partitionIndex-startIndex+1)*totalNumOfRules]);
        if(prefix.length > 0) {
          let tail = memoizedFunc(parseHelper, [startFragment.slice(1),partitionIndex+1,endIndex, maxPath.length*(partitionIndex-startIndex+1)*totalNumOfRules]);
          if(tail.length > 0) {
            parseTrees.push(...joinEachItemToFront(prefix, tail));
          }
        }
      }
      return parseTrees;
    }
  };

  console.log("Token Array:", tokenArr);
  let result = memoizedFunc(parseHelper, ["statement", 0, tokenArr.length-1, maxPath.length*tokenArr.length]);
  memoizedFunc.clear();
  return result;
}

const parseCYK = s => {
  const addTerminalRule = (lhs, rhs) => {
    if(!oppositeRules[rhs]) {
      oppositeRules[rhs] = [lhs];
    }
    else if(oppositeRules[rhs].indexOf(lhs) === -1) {
      oppositeRules[rhs].push(lhs);
    }
  };

  const flattenOneLevel = arr => arr.reduce((acc, subArr) => acc.concat(subArr)); 

  const cartesianProductArray = (arr1, arr2) => {
    if(!(arr1 instanceof Array) || !(arr2 instanceof Array)) return [];
    else return arr1.reduce((acc, firstItem) => 
                acc.concat(arr2.map(secondItem => [firstItem, secondItem])), []);
  };

  let tokenArr = tokenize(s);
  let oppositeRules = {};
  let flattenedRuleList = Object.keys(rules.rules).reduce((acc, ruleLHS) => {
    let rhs = rules.rules[ruleLHS];
    if(typeof rhs !== "string" && !(rhs instanceof Array)) {
      return acc.concat(Object.values(rhs).map(rhs => Object({[ruleLHS]: rhs})));
    } else {
      return acc.concat({[ruleLHS]: rhs});
    }
  }, []);

  tokenArr.forEach(token => addTerminalRule(token.tokenType, token.value));
  
  flattenedRuleList.forEach(rule => {
    let lhs = Object.keys(rule)[0];
    let rhs = Object.values(rule)[0];
    if(typeof rhs === "string") {
      addTerminalRule(lhs, rhs);
    }
    else if(rhs instanceof Array) {
      addTerminalRule(lhs, JSON.stringify(rhs));
    }
  });

  let valueArr = tokenArr.map(token => token.value);
  let levels = [valueArr.map(terminal => 
                 oppositeRules[terminal].map(lhs => 
                   ({lhs: lhs, rhs: terminal})))];

  for(let i = 1; i < valueArr.length; i++) {
    levels[i-1].forEach((value, index) => console.log(valueArr[index], value));
    let currentLevel = [];
    for(let startPos = 0; startPos < valueArr.length - i; startPos++) {
      let cartesianProduct = [];
      for(let levelNum = 0; levelNum < i; levelNum++) {
        // nonterminals on level levelNum have derivations of levelNum+1 terminals 
        let rulePairs = cartesianProductArray(levels[levelNum][startPos], 
                                              levels[i-1-levelNum][startPos+levelNum+1]);

        cartesianProduct.push(...rulePairs);
      }

      currentLevel.push(cartesianProduct.map(rulePair => 
        ({lhsides: oppositeRules[JSON.stringify([rulePair[0].lhs, rulePair[1].lhs])], rhs: rulePair}))
                                        .filter(obj => typeof obj.lhsides !== "undefined")
                                        .map(obj => obj.lhsides.map(lhs => ({lhs: lhs, rhs: obj.rhs})))
                                        .reduce((acc, arr) => acc.concat(arr),[]));

    }
    levels.push(currentLevel);
  }
  return levels;
};

const terminalsOnBinaryTree = root => {
  if(!root) return "";
  else if(typeof root.rhs === "string") return root.rhs;
  else return terminalsOnTree(root.rhs[0]) + terminalsOnTree(root.rhs[1]);
};

const terminalsOnTree = root => {
  console.log("R", root);
  if(!root) return "";
  else if(typeof root === "string") return root;
  else if(root.rhs instanceof Array) return root.rhs.reduce((acc, node) => acc + terminalsOnTreeA(node), "");
  else {return ""; throw new Error("shouldn't get here")};
};