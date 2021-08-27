// import './standard_match_managers.js';

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
 * @fileoverview Class to maintain matches for a given block/field from item
 *    and match blueprint.
 * @author Jason Schanker
 */

"use strict";

/**
 * Class to get best matches for a given block/field from item
 *    and match blueprint.
 */
class Match {
  static oneStartsWithOther_(s, t, matchCase=false) {
    const compareS = matchCase ? s : s.toLowerCase();
    const compareT = matchCase ? t : t.toLowerCase();

    return compareS.startsWith(compareT) || compareT.startsWith(compareS);
  }

  static getAfter_(s, t) {
    if (Match.oneStartsWithOther_(s, t)) {
      return t.substring(Math.min(s.length, t.length));
    }
    // return undefined if neither is prefix of each other
  }

  /**
   * Finds language object with this terminal if such a language exists; returns undefined otherwise
   * @param {string} s the string to determine if a terminal
   * @returns {Object|undefined} a language object with a key prefixed with TERMINAL whose value is s
   * or undefined if no such language object exists 
   */
  static equalsTerminal(s) {
    return Object.values(T2C.MSG)
      .find(langObj => Object.keys(langObj).find(key => 
        key.toUpperCase().startsWith("TERMINAL_") && langObj[key] === s));
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/
  //     Regular_Expressions#escaping
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  static getAfterTerminal_(inputted, terminal) {
    const langTerminals = Object.values(T2C.MSG)
      .map(langObj => langObj['TERMINAL_' + terminal.toUpperCase()])
      .filter(text => typeof text === 'string');
    // const val = langTerminals.find(text => Match.oneStartsWithOther_(text, inputted.trim(), true));
    //const val = langTerminals.find(text => RegExp("\s*" + text + "\s*").test(inputted) || 
    //  RegExp("\s*" + inputted).test(text));
    const leadingWhitespace = inputted.match(/^\s*/)[0];
    const trailingWhitespace = inputted.match(/\s*$/)[0];
    let matchRegEx;
    // handle whitespace
    // const val = langTerminals.find(text => matchRegEx = inputted.match(RegExp("^\\s*" + text + "\\s*")) || 
    //  text.match(RegExp(leadingWhitespaceInput + inputted));
    const val = langTerminals.find(text => matchRegEx
        = inputted.match(RegExp('^\\s*' + Match.escapeRegExp(text)))
        || (leadingWhitespace + text)
        .match(RegExp('^\\s*' + Match.escapeRegExp(inputted))));
    const match = val && matchRegEx[0];

    if(typeof val === 'string') {
      // return {terminal: val, remaining: Match.getAfter_(val, inputted), match};
      return {terminal: val, remaining: Match.getAfter_(match, inputted), match};
    }
    // return undefined otherwise
  }

  static getTerminalIndexForSymbol(patternArr, index) {
    if (['[', '(', '.'].indexOf(Match.getExpected(patternArr[index])) !== -1) {
      return index-1;
    } else if ([')', ']']
        .indexOf(Match.getExpected(patternArr[index])) !== -1) {
      // rule should be beyond short enough that rebuilding stack each time
      // is not an efficiency concern
      const stack = [];
      for (let i = 0; i < index; i++) {
        // console.log(stack, patternArr[i]);
        const expected = Match.getExpected(patternArr[i]);
        if (expected === '(' || expected === '[') {
          stack.push(i);
        }
        else if ([')', ']'].indexOf(expected) !== -1) {
          const topSymbol =
              Match.getExpected(patternArr[stack[stack.length-1]]); 
          console.assert(
              ['(', '['].indexOf(topSymbol) === [')', ']']
              .indexOf(expected), 
              'Opening bracket/parenthesis not closed in type-in-code block' + 
              'pattern.'
          );
          stack.pop();
        }
      }
      return stack[stack.length-1]-1;
    }
  }

  static getBlocksInBlueprint(blueprint, maxInstances={}) {
    if (blueprint.type === 'block') {
      const blockType = blueprint.value.type || blueprint.value.types
        && blueprint.value.types[0];
        const blockInputBlueprints = blueprint.value.inputs;
      if (blockType) {
        maxInstances[blockType] = ++maxInstances[blockType] || 1;
      }
      if (Array.isArray(blockInputBlueprints)) {
        blockInputBlueprints.forEach(blockInputBlueprint => 
            Match.getBlocksInBlueprint(blockInputBlueprint, maxInstances));
      }
    } else if (blueprint.type === 'input') {
      Match.getBlocksInBlueprint(blueprint.value, maxInstances);
    } else if (blueprint.type === 'component'
        && T2C.MatchManagers[blueprint.name]) {
      if(typeof T2C.MatchManagers[blueprint.name]
          .getBlocksInMatch === 'function') {
        T2C.MatchManagers[blueprint.name].getBlocksInBlueprint(blueprint.value,
            maxInstances);
      }
    }

    return maxInstances;
  }

  static getRemainingToolboxBlocks(matchArr, maxInstances={}) {
    const remainingBlueprints = matchArr.filter(matchItem => 
        matchItem.remainingBlueprint).map(matchItem => 
        matchItem.remainingBlueprint);

    remainingBlueprints.forEach(blueprint => 
        Match.getBlocksInBlueprint(blueprint, maxInstances));
    return maxInstances;
  }

  static getTextToParseFromMatch(textMatchArr, allowPartial=false) {
    return textMatchArr.map(textComponent => {
      /*if (typeof textComponent.id !== 'undefined' 
          && typeof textComponent.match === 'string'
          && textComponent.isMatchComplete) {*/
      if ((!textComponent.length || textComponent.length === 1) &&
          typeof textComponent.match === 'string' &&
          (textComponent.isMatchComplete || allowPartial)) {
        return textComponent.match;
      } else {
        return '';
      }
    }).join('');
  }

  static makeErrorMatch_(item, id, expected) {
    return {
      id,
      expected,
      length: 0,
      match: null,
      remaining: item,
      isMatchComplete: false,
      hasError: true
    };
  }

  static getExpected(item) {
    if (item == null) {
      return item;
    } else {
      return [item.value, item.match, item.expected, item]
          .find(x => typeof x === 'string');
    }
  }

  /**
   * attempts to match item against matchArr
   * @param {Object} item the item to match
   * @param {!Array.<Object>} matchBlueprint 
   * @returns {{match: Array.<Object>, remaining: Object, hasError: boolean, isMatchComplete: boolean}} match is the array of matches 
   * up to the first unsuccessful match, if any; 
   * error is true exactly when there was an unsuccessful match;
   * remainingText is the unmatched text
   */
  static getSequentialMatchResult_(item, matchBlueprint) {
    let matchResultArr = [];
    let matchResult = [{match: null, remaining: item, hasError: false,
        isMatchComplete: true}];
    let i = -1;

    while (i < matchBlueprint.length-1 &&
        matchResult[matchResult.length-1].remaining &&
        !matchResult[matchResult.length-1].hasError &&
        matchResult[matchResult.length-1].isMatchComplete) {
      ++i;
      const remaining = matchResult[matchResult.length-1].remaining;
      matchResult = Match.getMatchResult(remaining, matchBlueprint[i]);
      matchResultArr.push(...matchResult);
    }

    // add matches for regex that match empty strings
    if (!matchResult[matchResult.length-1].remaining &&
        matchResult[matchResult.length-1].isMatchComplete) {
      while (i < matchBlueprint.length-1 && matchBlueprint[++i] &&
          matchBlueprint[i].type === 'regexp' && 
          matchBlueprint[i].token.test('')) {
        matchResultArr.push({match: '', hasError: false, remaining: '',
            isMatchComplete: true});
      }
    }

     // console.error('Sequential Match Result', matchResultArr, i,
     //    matchBlueprint);

    return [{
      id: matchBlueprint.id,
      match: matchBlueprint.value,
      type: matchBlueprint.type,
      length: matchResultArr.length+1,
      remaining: null,
      //isMatchComplete: matchBlueprint.length === matchResultArr.length &&
      isMatchComplete: (i === matchBlueprint.length - 1) &&
          matchResultArr.every(match => match.isMatchComplete),
      hasError: matchResultArr.some(match => match.hasError)
    }].concat(matchResultArr);
  }

  /**
   * Get match result for item
   * @param {!Object} item the item to compare against
   * @param {!Object} matchBlueprint the blueprint for the correct item
   * @returns {Array.<Object>} resulting match Array
   */
  static getMatchResult(item, matchBlueprint) {
    if (matchBlueprint.type === 'component') {
      const matchResult = T2C.MatchManagers[matchBlueprint.name]
          .getMatchResult(item, matchBlueprint.value);
      return [{
        id: matchBlueprint.id,
        match: item,
        length: matchResult.length+1,
        remaining: matchResult.length > 0 ?
            matchResult[matchResult.length-1].remaining : null,
        isMatchComplete: matchResult.every(matchItem => matchItem
            .isMatchComplete),
        hasError: matchResult.some(match => match.hasError)
      }].concat(matchResult);
    } else if (matchBlueprint.type === 'block') {
      // console.assert(item instanceof Blockly.Block, 
      //     {item, errorMsg: ' is not a block.'});
      if (item instanceof Blockly.Block && 
          (item.type === matchBlueprint.value.type ||
          Array.isArray(matchBlueprint.value.types) &&
          matchBlueprint.value.types.includes(item.type))) {
        // block type is correct one
        const blockInputs = matchBlueprint.value.inputs.map(input =>
            item.getInput(input.name));
        const blockFields = matchBlueprint.value.fields.map(field =>
            item.getField(field.name));
        const matchResult = Match.getMatchResult(
            blockInputs.concat(blockFields),
            {type: 'Array', value: matchBlueprint.value.inputs.concat(
            matchBlueprint.value.fields)});
        return [
            {
              id: matchBlueprint.id,
              match: item,
              length: matchResult.length+1,
              remaining: null,
              isMatchComplete: matchResult.every(matchItem => matchItem
                  .isMatchComplete),
              hasError: false
            }
        ].concat(matchResult);
      } else {
        return [{
          id: matchBlueprint.id,
          match: null,
          length: 0,
          remaining: item,
          remainingBlueprint: matchBlueprint, // for blocks to add to toolbox
          hasError: item != null,
          isMatchComplete: false
        }]
      }
    } else if (matchBlueprint.type === 'input') {
      if (item instanceof Blockly.Input && item.name === matchBlueprint.name) {
        const matchResult = Match.getMatchResult(item.connection &&
            item.connection.targetBlock(), matchBlueprint.value);
        return [{
          id: matchBlueprint.id,
          match: item,
          length: matchResult.length+1,
          remaining: null,
          isMatchComplete: true,
          hasError: false
        }].concat(matchResult)
      } else {
        return [{
          id: matchBlueprint.id,
          match: null,
          length: 0,
          remaining: item,
          hasError: item != null,
          isMatchComplete: false
        }]
      }
    } else if (matchBlueprint.type === 'field') {
      if (item instanceof Blockly.Field && item.name === matchBlueprint.name) {
        const matchResult = Match.getMatchResult(
            matchBlueprint.useText ? 
            item.getText() : item.getValue(), matchBlueprint.value);
        // false for hasError if default value instead of empty string?
        return [{
          id: matchBlueprint.id,
          expected: Match.getExpected(matchBlueprint.value),
          match: item,
          length: matchResult.length+1,
          remaining: matchResult[matchResult.length-1].remaining,
          isMatchComplete: matchResult.every(match => match.isMatchComplete),
          hasError: item.getValue() !== '' &&
              matchResult.some(match => match.hasError)
        }].concat(matchResult)
      } else {
        return [{
          id: matchBlueprint.id,
          match: null,
          length: 0,
          remaining: item,
          //hasError: item !== null && typeof item !== "undefined",
          hasError: item != null,
          isMatchComplete: false
        }]
      }
    } else if (matchBlueprint.type === 'property') {
      // not implemented
      const propertyName = matchBlueprint.property;
      return Match.makeErrorMatch_(item, id);
    } else if(matchBlueprint.type === 'exact') {
      const compItem = matchBlueprint.property ?
          item[matchBlueprint.name] : item;
      let matchBlueprintItem = matchBlueprint.value;
      let isMatchComplete = true;
      // let remaining = "";
      const errorMatch = [{
        id: matchBlueprint.id, 
        expected: Match.getExpected(matchBlueprintItem), 
        match: null, 
        remaining: compItem, 
        hasError: true, 
        isMatchComplete: false
      }];

      if (typeof compItem === 'string' &&
          typeof matchBlueprintItem === 'string') {
        let matchBlueprintSpacePrefix = matchBlueprintItem.match(/^\s*/)[0];
        let compItemSpacePrefix = compItem.match(/^\s*/)[0];
        let compItemLTrim = compItem.substring(compItemSpacePrefix.length);
        let matchBlueprintItemLTrim = matchBlueprintItem
            .substring(matchBlueprintSpacePrefix.length);
        let matchBlueprintSpacePostfix = matchBlueprintItem.match(/\s*$/)[0];
        let compItemSpacePostfix = compItem.match(/\s*$/)[0];

        const errorMatchConditions = 
            !compItemSpacePrefix.endsWith(matchBlueprintSpacePrefix) &&
            (!matchBlueprint.partial || compItemLTrim) ||
            (compItemLTrim && !compItemLTrim
            .startsWith(matchBlueprintItemLTrim) &&
            (!matchBlueprint.partial || !matchBlueprintItemLTrim
            .startsWith(compItemLTrim))) ||
            (!matchBlueprint.postfix && compItemLTrim.substring(Math.min(
              matchBlueprintItemLTrim.length, compItemLTrim.length)).trim());

        if (errorMatchConditions) {
          return errorMatch;
        } else if (matchBlueprintItemLTrim.length > compItemLTrim.length) {
          return [{
            id: matchBlueprint.id,
            match: compItem,
            remaining: '',
            hasError: false,
            isMatchComplete: false
          }];
        } else {
          return [{
            id: matchBlueprint.id,
            match: compItemSpacePrefix + matchBlueprintItemLTrim,
            remaining: compItem.substring(compItemSpacePrefix.length
                + matchBlueprintItemLTrim.length),
            hasError: false,
            isMatchComplete: true
          }]
        }
      } else {
        return compItem === matchBlueprintItem ? 
            [{id: matchBlueprint.id, match: compItem, remaining: null,
            hasError: false, isMatchComplete: false}] : errorMatch;
      }
    } else if (matchBlueprint.type === 'includes') {
      // no allowance of partial now
      const compItem = matchBlueprint.property ?
          item[matchBlueprint.name] : item;

      return (typeof compItem.includes === 'function' && compItem.includes(
          matchBlueprint.value)) ? 
          [{id: matchBlueprint.id, match: compItem, remaining: null,
          hasError: false, isMatchComplete: true}] : 
          [{id: matchBlueprint.id, expected: Match.getExpected(matchBlueprint
          .value), match: null, remaining: compItem,
          hasError: compItem != null && compItem !== "",
          isMatchComplete: false}];
    } else if (matchBlueprint.type === 'or') {
      const bestMatchWithIndex = 
          Match.getBestMatchWithIndex_(item, matchBlueprint.value,
          matchBlueprint.comparer);
      // console.error("BEST MATCH WITH INDEX", bestMatchWithIndex);
      const bestMatchArr = bestMatchWithIndex.matchArr;
      return [{
        id: matchBlueprint.id,
        match: bestMatchWithIndex.pattern,
        index: bestMatchWithIndex.index,
        length: bestMatchWithIndex.matchArr.length + 1,
        remaining: null,
        hasError: bestMatchArr.some(matchItem => matchItem.hasError),
        isMatchComplete: true
      }].concat(bestMatchWithIndex.matchArr);
    } else if (matchBlueprint.type === 'Array') {
      if(typeof item === 'string') {
        return Match.getSequentialMatchResult_(item, matchBlueprint.value);
      }
      console.assert(Array.isArray(matchBlueprint.value));
      const resultMatchArr = matchBlueprint.value.map(
          (itemmatchBlueprint, index) => { 
        const itemResult = Match.getMatchResult(item[index], itemmatchBlueprint);
        //itemResult.index = index;
        //itemResult.pattern = itemmatchBlueprint;
        return itemResult;
      });
      const flattenedResultMatchArr = resultMatchArr.flat();

      return [{
          id: matchBlueprint.id,
          match: matchBlueprint.value,
          type: matchBlueprint.type,
          length: flattenedResultMatchArr.length+1,
          remaining: null,
          isMatchComplete: flattenedResultMatchArr
              .every(match => match.isMatchComplete),
          hasError: resultMatchArr.some(match => match.hasError)
        }].concat(flattenedResultMatchArr);
    } else if (matchBlueprint.type === "regexp") {
      // this logic doesn't have automatic way for determining partial matches
      //     of regexp from full match, currently caller needs to explicitly
      //     tell it what partial match means in tokenPartial, needed when 
      //     regexp is last pattern to match so type-in-block knows when to
      //     turn green indicating full match
      //console.assert(typeof item === "string");
      const itemStr = item.toString();
      const startPadding = itemStr.match(/^\s*/)[0];
      let isMatchComplete = false;
      // const endPadding = item.match(/$\s*/)[0];
      // should fix this in case regex requires match start with fixed amount of
      //    whitespace; currently matches all or none
      let result = itemStr.match(matchBlueprint.token) || itemStr.trim().match(
          matchBlueprint.token);
      const partialResult = matchBlueprint.tokenPartial && 
          (itemStr.match(matchBlueprint.tokenPartial) || itemStr.trim().match(
          matchBlueprint.token));
      if (result || partialResult) {
        if(result) {
          isMatchComplete = true;
        } else {
          result = partialResult;
        }
        return [{
          id: matchBlueprint.id,
          expected: matchBlueprint.token,
          match: startPadding + result[0],
          length: 1,
          remaining: itemStr.substring(startPadding.length + result[0].length),
          isMatchComplete,
          hasError: false
        }]
      } else {
        return [Match.makeErrorMatch_(item, matchBlueprint.id, matchBlueprint
            .token)];
      }
    } else if(matchBlueprint.type === 'terminal') {
      if(item instanceof Blockly.Block) {

      } else {
        const itemResult = Match.getAfterTerminal_(item, matchBlueprint.token);
        return [{
          id: matchBlueprint.id,
          expected: T2C.MSG.currentLanguage['TERMINAL_' 
              + matchBlueprint.token.toUpperCase()],
          terminal: itemResult ? itemResult.terminal : null,
          match: itemResult ? itemResult.match : null,
          remaining: itemResult ? itemResult.remaining : item,
          //hasError: item === "" && item === null && typeof item === "undefined" && !itemResult,
          hasError: !itemResult,
          isMatchComplete: itemResult && itemResult.match.includes(
              itemResult.terminal)
        }]
      }
    }
  }

  static getNonEmptyMatchLength_(matchArr) {
    const nonemptyMatchArr = matchArr.filter(matchObj =>
        matchObj.match != null && matchObj.match != '');
    // console.error("MATCH ARRAY CHOICE", nonemptyMatchArr);
    return nonemptyMatchArr.length;
  }

  /**
   * Get best match with index in form {match, index}
   * @param {Function?} matchComparer should return true exactly when the first argument
   * is a strictly better match than the second
   * @returns {Object|null} the best match according to matchComparer with the associated index
   */
  static getBestMatchWithIndex_(item, matchBlueprintArr, matchComparer) {
    // Leave private until return type is solidified (e.g., should be instance
    //     of new MatchResult class?) 
    //     MatchResult should have {match, error, remaining} properties
    matchComparer = typeof matchComparer === 'function' ? 
      //matchComparer : (a, b) => this.totalLength(a) > this.totalLength(b);
      matchComparer : 
      (a, b) => {
        //return //a.match != null && b.match == null || 
        return (Match.getNonEmptyMatchLength_(a) >
            Match.getNonEmptyMatchLength_(b)) || !a.hasError && b.hasError;
        //Match.recursiveTotalMatches_(a) > Match.recursiveTotalMatches_(b) || 
      };

    const result = matchBlueprintArr.reduce(
        (bestMatch, matchBlueprintItem, index) => {
      const currentMatch = Match.getMatchResult(item, matchBlueprintItem);
      return (index === 0 || matchComparer(currentMatch, bestMatch.matchArr)) ?
        {
          index,
          pattern: matchBlueprintItem,
          matchArr: currentMatch,
        } : 
        bestMatch;
    }, {index: -1, matchArr: [], pattern: {}});

    return result;
  }
}

export default Match;