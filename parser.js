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

  const flattenOneLevel = arr => arr.reduce((acc, subArr) => acc.concat(subArr), []);
  const joinEachItemToFront = (items, arrs) => flattenOneLevel(arrs.map(arr => items.map(item => [item].concat(arr))));
  const getRHSOfTokenMatch = (lhs, token) => {
    if(Object.keys(tokens).indexOf(lhs) !== -1 && token.tokenType === lhs) {
      return token.value;
    }
    else if(rules.terminals.indexOf(lhs) !== -1 && 
            Array.from(ruleSets[lhs])
                 .some(rhs => rhs === token.value)) {
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