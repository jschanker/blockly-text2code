import {getParseTree, handleParseTreeToBlocks, workspaceToLanguageCode} from "../core/mobile.js";
import {refreshWorkspace, newBlock, setValueInput, setFieldValue, setNextBlock} from "../core/block_utility_functions.js";
import ToolboxManager from "../core/toolbox_manager.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import ParallelAnimation from "../core/parallel_animation.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
import MessageConsoleManager from "../core/message_console_manager.js";
import TypeInCodeBlock from "../core/type_in_code_block.js";
import LevelGenerator from "../core/level_generator.js";

export const loadLevelTasks = (courseInstructionTaskFlow, ws) => {
  function getPermutations(arr) {
    if(arr.length === 1) return [arr];
    return arr.map((x, index) => 
      getPermutations(arr.slice(0, index).concat(arr.slice(index+1)))
        .map(permutation => [arr[index]].concat(permutation))
    ).reduce((acc, part) => acc.concat(part), []); // flatten
  }

  function splitArrOnCond(arr, cond) {
    let indexOfLastSplit = -1;
    const arrParts = [];
    for(let i = 0; i < arr.length; i++) {
      if(cond(arr[i])) {
        arrParts.push(arr.slice(indexOfLastSplit+1, i));
        indexOfLastSplit = i;
      }
    }
    // if(indexOfLastSplit < arr.length-1) {
    arrParts.push(arr.slice(indexOfLastSplit+1));
    // }
    return arrParts;
  }

  function flattenOneLevel(arr) {
    return arr.reduce((acc, part) => acc.concat(part), []);
  }

  function applyMapToLevel(arr, f, level, args) {
    if(level === 0) return f(arr, ...args);
    else return arr.map((item, index) => applyMapToLevel(item, f, level-1, args));
  }


  // NOT USED HERE
  function cartesianProduct(arrs) { 
    if(arrs.length === 0) return [[]];
    const remaining = cartesianProduct(arrs.slice(1));
    return flattenOneLevel(arrs[0].map(firstItem => remaining.map(arr => [firstItem].concat(arr))));
  }

  // NOT USED HERE
  function distributeOneLevelUp(arr, level) {
    if(level === 1) return cartesianProduct(arr.map(x => Array.isArray(x) ? x : [x]));
    else return arr.map(x => Array.isArray(x) ? distributeOneLevelUp(x, level-1) : x);
  }

  function getArraysFromLevel(arr, level) {
    if(level === 0) return [arr];
    else return flattenOneLevel(getArraysFromLevel(arr, level-1)).filter(x => Array.isArray(x));
  }

  function copyWithReplacement(arr, arrToReplace, replacementArr, maxDepth=Infinity) {
    if(arr === arrToReplace) return replacementArr;
    else if(maxDepth === 0 || !Array.isArray(arr)) return arr;
    else return arr.map(x => copyWithReplacement(x, arrToReplace, replacementArr, maxDepth-1));
  }

  function replaceInAllArrays(arrsToReplaceFrom, arrToReplace, replaceArrs, maxDepth=Infinity) {
    return flattenOneLevel(arrsToReplaceFrom.map(arrToReplaceFrom => replaceArrs.map(replaceArr => copyWithReplacement(arrToReplaceFrom, arrToReplace, replaceArr, maxDepth))));
  }

  function replaceArrsWithAllPermutations(arrs, level) {
    return flattenOneLevel(arrs.map(arr => {
      const arrsToReplace = getArraysFromLevel(arr, level);
      // console.log("ARRS TO REPLACE", arrsToReplace)
      return arrsToReplace.reduce((arrsToReplaceFrom, arrToReplace) => {
        // console.log(arrsToReplaceFrom, arrToReplace, getPermutations(arrToReplace));
        return replaceInAllArrays(arrsToReplaceFrom, arrToReplace, getPermutations(arrToReplace), level);
      }, [arr]);
    }));
  }

  /**
   * Get Array of all equivalent expressions obtainable by applying commutativity/associativity of operations
   * Preconditions: All binary operations are commutative/associative; unary operations have higher precedence;
   *                no parentheses
   * @param {Array.Array.<string|Object>} matchArrs Array of matches
   * @param {Array.<string>} tokenTypes Array of token types listed in order of increasing precedence
   * @returns {Array.Array.<string|Object>} list of equivalent expressions to a match array in matchArrs   
   */
  function getEquivalentCAMatches(matchArrs, tokenTypes) {
    const splitMatches = tokenTypes.reduce((currentCAMatches, tokenType, index) => {
      const split = applyMapToLevel(currentCAMatches, splitArrOnCond, index + 1, [(x) => x.token === tokenType]);
      return replaceArrsWithAllPermutations(split, index);
    }, matchArrs);

    return tokenTypes.slice().reduce(
      (currentCAMatches, _, index) => applyMapToLevel(currentCAMatches, joinArrs, tokenTypes.length-index, [tokenTypes[tokenTypes.length-1-index]]),
    splitMatches);
  }

  function joinArrs(arr, separator) {
    return arr.reduce((acc, x) => acc.concat([separator]).concat(x), []).slice(1);
  }

  const blockNames = ["cs1030_14_type_in_get_is_weekday",
  "cs1030_14_type_in_get_is_vacation", "cs1030_14_type_in_set_can_sleep_in", 
  "cs1030_14_type_in_display_can_sleep_in"];

  const blockTemplates = blockNames.map(blockName => (new TypeInCodeBlock(blockName, {collapseWhenFinished: true})));

  // const canSleepInBlock = new TypeInCodeBlock("cs1030_14_type_in_can_sleep_in", {collapseWhenFinished: true});
  const possibleLongMatches = getEquivalentCAMatches([[
   "isWeekday", {token: "and", type: "terminal"}, "isVacation", {token: "or", type: "terminal"},
   "isWeekday", {token: "and", type: "terminal"}, {token: "not", type: "terminal"}, "isVacation", {token: "or", type: "terminal"},
   {token: "not", type: "terminal"}, "isWeekday", {token: "and", type: "terminal"}, {token: "not", type: "terminal"}, "isVacation"]], ["or", "and"])
  const possibleShortMatches = 
    [
     [{token: "not", type: "terminal"}, "(", {token: "not", type: "terminal"}, "isVacation", {token: "and", type: "terminal"}, "isWeekday", ")"],
     [{token: "not", type: "terminal"}, "(", "isWeekday", {token: "and", type: "terminal"}, {token: "not", type: "terminal"}, "isVacation", ")"],
     [{token: "not", type: "terminal"}, "isWeekday", {token: "or", type: "terminal"}, "isVacation"],
     ["isVacation", {token: "or", type: "terminal"}, {token: "not", type: "terminal"}, "isWeekday"]
    ]

  let errorFeedbackArr = 
    [
      null, 
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ];

  possibleLongMatches.concat(possibleShortMatches).forEach(patternArr => canSleepInBlock.addPossibleMatch(patternArr, errorFeedbackArr.slice(0, patternArr.length)));

  canSleepInBlock.add

  levelGenerator.addRunTask(
    helpMsgManager, 
    citf, 
    () => {
      alert("In progress: ADAPTED FROM SLEEP IN (http://codingbat.com/prob/p173401): The parameter isWeekday is true if it is a weekday, and the parameter isVacation is true if we are on vacation. We can sleep in if it is not a weekday or we're on vacation. Print true exactly when we can sleep in.")
      alert("✔✔✔ Congratulations!  You just completed Mission 14!  In the next mission, we continue with more Boolean problems.  As in the last mission, if you want to save the blocks from this mission, use the XML.  Until next time, phir milenge (See you again)!");
    },
    d
  );

  return citf;
};