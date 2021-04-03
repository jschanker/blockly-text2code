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
      (currentCAMatches, _, index) => applyMapToLevel(currentCAMatches, joinArrs, tokenTypes.length-index, [{token: tokenTypes[tokenTypes.length-1-index], type: "terminal"}]),
    splitMatches);
  }

  function joinArrs(arr, separator) {
    return arr.reduce((acc, x) => acc.concat([separator]).concat(x), []).slice(1);
  }

  const blockNames = ["cs1030_16_type_in_is_mets_fan",
  "cs1030_16_type_in_is_yankees_fan", "cs1030_16_type_in_set_can_be_newyorker", 
  "cs1030_16_type_in_display_in_can_be_newyorker"];

  const varNames = ["isMetsFan", "isYankeesFan", "canBeNewYorker"];

  const blockTemplates = blockNames.map(blockName => (new TypeInCodeBlock(blockName, {collapseWhenFinished: true})));

  const possibleMatches0 = getEquivalentCAMatches([[
   varNames[0], {token: "and", type: "terminal"}, {token: "not", type: "terminal"}, varNames[1], {token: "or", type: "terminal"},
   {token: "not", type: "terminal"}, varNames[0], {token: "and", type: "terminal"}, varNames[1]]], ["or", "and"])
  // hack for parentheses, give or higher precedence than and since they're both in parentheses
  const possibleMatches1 = getEquivalentCAMatches([[
   varNames[0], {token: "or", type: "terminal"}, varNames[1], {token: "and", type: "terminal"},
   {token: "not", type: "terminal"}, varNames[0], {token: "or", type: "terminal"}, {token: "not", type: "terminal"}, varNames[1]]], ["and", "or"])
  .map(match => ["("].concat(match.slice(0,match.findIndex(x => x.token === "and"))).concat([")", {token: "and", type: "terminal"}, "("])
    .concat(match.slice(match.findIndex(x => x.token === "and")+1)).concat([")"]));

  const possibleMatches2 = possibleMatches1.map(possibleMatch => {
    const indexOfNot = possibleMatch.findIndex(matchPart => matchPart.token === "not");
    return possibleMatch.slice(0, indexOfNot-1)
      .concat([{token: "not", type: "terminal"}, "("])
      .concat(possibleMatch[indexOfNot+1])
      .concat([{token: "and", type: "terminal"}])
      .concat(possibleMatch.slice(indexOfNot+4));
  });

  const promptStrings = [
    "\"Are you a Mets fan? (true:OK or false:CANCEL)\"",
    "\"Are you a Yankees fan? (true:OK or false:CANCEL)\""
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
      null,
      null,
      null,
      null,
      null
    ];

  const canBeNewYorkerMatches = possibleMatches0.concat(possibleMatches1).concat(possibleMatches2).map(booleanExp => [{token: "let", type: "terminal"}, varNames[2], "="].concat(booleanExp).concat([{token: /^[;]*$/, type: "regexp"}]));
  canBeNewYorkerMatches.forEach(patternArr => blockTemplates[2].addPossibleMatch(patternArr, errorFeedbackArr.slice(0, patternArr.length)));

  console.log(possibleMatches0.length, possibleMatches1.length, possibleMatches2.length)
  canBeNewYorkerMatches.forEach(match => console.log(match));

  const patternArrs = [
    [{token: "let", type: "terminal"}, varNames[0], "=", {token: "confirm", type: "terminal"}, "(", {token: /^"[^"]*$|^'[^']*$|^"[^"]*"|^'[^']*'/, type: "regexp"}, ")",
     {token: /^[;]*$/, type: "regexp"}],//"Is it a weekday? (true:OK or false:Cancel)"
    [{token: "let", type: "terminal"}, varNames[1], "=", {token: "confirm", type: "terminal"}, "(", {token: /^"[^"]*$|^'[^']*$|^"[^"]*"|^'[^']*'/, type: "regexp"}, ")",
     {token: /^[;]*$/, type: "regexp"}],// "Is it a vacation? (true:OK or false:Cancel)"
     null,
    [{token: "display", type: "terminal"}, "(", varNames[2], ")", {token: /^[;]*$/, type: "regexp"}]
  ];

  patternArrs.forEach((patternArr, index) => index !== 2 && blockTemplates[index].addPossibleMatch(patternArr, errorFeedbackArr.slice(0, patternArr.length)));

  blockTemplates.forEach(blockTemplate => blockTemplate.addToBlocks());

  const levelGenerator = new LevelGenerator();
  const helpMsgManager = levelGenerator.createStandardHelpMessageManager();
  const citf = courseInstructionTaskFlow || new CourseInstructionTaskFlow();
  const workspace = ws || Blockly.getMainWorkspace();
  const toolboxManager = new ToolboxManager(workspace);
  workspace.clear();
  toolboxManager.clearToolbox();
  const d = levelGenerator.createPointer();
  document.body.appendChild(d);

  const codeBlocks = blockNames.map(blockName => newBlock(workspace, blockName));
  codeBlocks.slice(0, codeBlocks.length-1)
    .forEach((block, index) => setNextBlock(block, codeBlocks[index+1]));
  const useLanguageObj = (T2C.MSG.currentLanguage === T2C.MSG.PY) ? T2C.MSG.PY : T2C.MSG.JS;
  codeBlocks.forEach((block, index) => index !== 2 && block.setFieldValue(
    patternArrs[index].slice(0, patternArrs[index].length-1)
    .map(patternPart => patternPart.type === "terminal" ? useLanguageObj["TERMINAL_" + patternPart.token.toUpperCase()] : 
      (patternPart.type === "regexp" ? promptStrings[index] : patternPart)).join(""),
    "EXP")
  );

  workspace.setScale(1);
  workspace.getAllBlocks().forEach(block => block.setMovable(false));
  refreshWorkspace(workspace);

  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("In progress: NEW YORK BASEBALL FAN - NEW YORKER IS A METS FAN OR A YANKEES FAN (HYPOTHETICAL): A New Yorker must either be a Mets fan or a Yankees fan but cannot be both.  Write a line of code to set " + varNames[2] + " so that the computer displays true exactly when the person can be a New Yorker.")
        }
      }
    )
  );

  levelGenerator.addHelpMessageTask(
    citf,
    helpMsgManager,
    () => {
      return blockNames.every((blockName, index) => {
        const block = workspace.getAllBlocks().find(block => block.type === blockName);
        return blockTemplates[index].hasFullMatch(block.getFieldValue("EXP"), false);
      })
      return workspace.getAllBlocks()
        .every((block, index) => block.type === blockNames[index] && blockTemplates[index].hasFullMatch(block.getFieldValue("EXP"), false));
    },
    () => {
      return "Using the truth table, set " + varNames[2] + " to the appropriate Boolean expression in terms of " + varNames[0] + " and " + varNames[1] + ".";
    },
    () => {
      for(let lineNumber = 0; lineNumber < blockNames.length; lineNumber++) {
        const feedback = blockTemplates[lineNumber].getErrorFeedback();
        if(feedback) {
          return "Problem with block on line " + (lineNumber + 1) + ": " + feedback;
        }
      }

      return "";
    },
    null
  );

  levelGenerator.addRunTask(
    helpMsgManager, 
    citf, 
    () => {
      alert("✔✔✔ Congratulations!  You just completed Mission 16!  In the next mission, we continue with another Boolean problem.  (Are you a true baseball fan?)  As in the last mission, if you want to save the blocks from this mission, use the XML.  Until next time, phir milenge (See you again)!");
    },
    d
  );

  return citf;
};