/**
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *            &
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
 * @fileoverview
 * Initializes workspace, parser, and block evaluator;
 * Attaches click handlers to buttons that call appropriate code/block generating
 * functions (Blocks => JS & XML => Blocks); includes var to let code conversion
 * but this should be encompassed in variable generators
 * @author (Modified version of generateBlocksFromXML) fraser@google.com (Neil Fraser)
 * https://github.com/google/blockly/blob/b88a3bf41a15f2d92853cb7806effc53ef048882/demos/code/code.js
 *         (varsToLets) Jason Schanker
 */

import {tokens, rules} from "./grammar.js";
import Tokenizer from "./tokenizer.js";
import Parser from "./parser.js";
import ParseTreeBlockConnector from "./parse_tree_block_connector.js";
import {interpretations} from "./block_interpretations.js";
import BlockEvaluator from "./block_evaluator.js";
import createBlocks from "./block_generator.js";
import {convertTextBlocksToJSBlocks} from "./block-converters/javascript/text_exact.js";
import {newBlock, refreshWorkspace} from "./block_utility_functions.js";

// for type-in-code blocks
export const parseAndConvertToBlocks = function(props, e) {
  if(props.editing && e.type !== Blockly.Events.CHANGE) {
    props.editing = false;
    //const displayLog = console.log;
    //console.log = console.realLog; // temporarily reset for debugging
    console.log("Parsing", this.getFieldValue("EXP"));
    //let parseTree = parseTopDown(this.getFieldValue("EXP"))[0];
    const parseTree = shared.parser.parseBottomUpCYK(this.getFieldValue("EXP"), 
      shared.parseTreeBlockConnector)[0];
    //if(parseTree) console.log(createBlocks(evaluation, thisBlock).toString());
    if(parseTree) {
      const evaluation = shared.evaluator.evaluate(parseTree);
      console.log("Parse Tree:", parseTree);
      console.log("Evaluation: ", evaluation, this);
      console.log(createBlocks(evaluation, this, shared.workspace));
      // console.log(createBlocks(evaluation, this, shared.workspace).toString());
    }
    else alert("There seems to be a problem with the code you entered.  Check that your spelling is correct, that you use lowercase and capital letters as required, that every open parenthesis ( has a matching closed one ), that you use quotation marks as needed, and other potential issues with syntax.");
    //console.log = displayLog; // restore
  }
};

const shared = (function() {
  const init = () => {
    window.addEventListener('DOMContentLoaded', (event) => {
      // hack to deal with incorrect module import conversion done by having multiple
      // entry points with webpack; avoids duplication
      if(document.getElementById("blockly-div").getAttribute("hasWorkspace")) return;
      document.getElementById("blockly-div").setAttribute("hasWorkspace", true);
      shared.toolbox = document.getElementById("toolbox");
      const options = { 
        toolbox : toolbox, 
        collapse : false, 
        comments : false, 
        disable : false, 
        maxBlocks : Infinity, 
        trashcan : true, 
        horizontalLayout : window.innerHeight > window.innerWidth, 
        toolboxPosition : 'start', 
        css : true, 
        media : 'https://blockly-demo.appspot.com/static/media/', 
        rtl : false, 
        scrollbars : true, 
        sounds : true, 
        oneBasedIndex : true
      };

      shared.workspace = Blockly.inject("blockly-div", options);
      if(window.location && typeof window.location.href === "string") {
        const startLangLocation = window.location.href.indexOf("lang=")+5;
        const language = window.location.href.substring(startLangLocation, startLangLocation+2);
        if(startLangLocation !== 4) {
          document.getElementById("language").value = language;
          updateToolbox(language);
          updateWords()
          updateTexts()
          document.getElementById("outputAppearsBelow").innerText = T2C.MSG.currentLanguage.HEADING_OUTPUT_APPEARS_BELOW;
          document.getElementById("bottomText").innerText = T2C.MSG.currentLanguage.HEADING_BOTTOM_TEXT;
        }
      }

/*
      window.addEventListener("resize", function() {
        if(window.innerHeight > window.innerWidth) {

        } else {

        }
      });
*/
      document.getElementById("language").addEventListener("change", function() {
        updateToolbox(document.getElementById("language").value);
        updateWords()
        updateTexts()
        document.getElementById("outputAppearsBelow").innerText = T2C.MSG.currentLanguage.HEADING_OUTPUT_APPEARS_BELOW;
        document.getElementById("bottomText").innerText = T2C.MSG.currentLanguage.HEADING_BOTTOM_TEXT;
      });
      document.getElementById("convertToJSText2CodeButton").addEventListener("click", function() {
        if(document.getElementById("consoleDisplay")) document.getElementById("consoleDisplay").textContent = "";
        document.getElementById("textCodeBox").value = runCode();
        document.getElementById("xmlData").value = generateXML();
      });
      document.getElementById("convertXMLToBlocksButton").addEventListener("click", function() {
        generateBlocksFromXML();
      });
      document.getElementById("convertTextToBlocksButton").addEventListener("click", function() {
        //const displayLog = console.log;
        //console.log = console.realLog; // temporarily reset for debugging
        console.log("Parsing", document.getElementById("textCodeBox").value);
        const confirmConvertTextToBlocks = T2C.MSG.currentLanguage.CONFIRM_CONVERT_TEXT_TO_BLOCKS;
        //const parseTree = shared.parser.parseTopDown(document.getElementById("textCodeBox").value)[0];
        const parseTree = shared.parser.parseBottomUpCYK(document.getElementById("textCodeBox").value, 
          shared.parseTreeBlockConnector)[0];

        if(parseTree && confirm(confirmConvertTextToBlocks)) {
          shared.workspace.clear();
          const evaluation = shared.evaluator.evaluate(parseTree);
          const tempBlock = newBlock(shared.workspace); // pass e.g., "math_number" if not replaced
          tempBlock.moveBy(50, 50); // shared.workspace.getWidth()/2
          console.log("Parse Tree:", parseTree);
          console.log("Evaluation: ", evaluation);
          console.log(createBlocks(evaluation, tempBlock));
        }
        else if(!parseTree) {
          alert("There seems to be a problem with the code you entered.  Check that your spelling is correct, that you use lowercase and capital letters as required, that every open parenthesis ( has a matching closed one ), that you use quotation marks as needed, and other potential issues with syntax.");
        }
        //console.log = displayLog; // restore
      });
      document.getElementById("convertToJSButton").addEventListener("click", function() {
        var workspace = shared.workspace || Blockly.getMainWorkspace();
        workspace.getAllBlocks().forEach(convertTextBlocksToJSBlocks);
        refreshWorkspace(workspace);
      });
      /*
      if(document.getElementById("consoleDisplay")) {
        document.getElementById("consoleDisplay").textContent = ""; // clear display console
        if(!console) console = {};
        console.realLog = console.log; // keep reference to actual log for debugging purposes
        console.log = function() {
          document.getElementById("consoleDisplay").appendChild(
            document.createTextNode(Array.prototype.join.call(arguments, " ") + "\n"));
        };
      }
      */
    });
    const lexer = new Tokenizer(tokens);
    const parser = new Parser(lexer, rules, Object.keys(interpretations).concat("statement"));
    const parseTreeBlockConnector = new ParseTreeBlockConnector();
    const evaluator = new BlockEvaluator(interpretations);
    return {lexer, parser, parseTreeBlockConnector, evaluator};
  };

  const shared = init();

  function varsToLets(code) {
    var variableDeclarationStart = code.indexOf("var")+4;
    var variableDeclarationEnd   = code.indexOf(";", variableDeclarationStart);
    var variableNames = [];
    var newCode = code;
    
    if(variableDeclarationStart > 3) { // has variable declaration
      var firstLine = code.substring(variableDeclarationStart, variableDeclarationEnd);
      variableNames = firstLine.split(", ");
      newCode = code.substring(0, variableDeclarationStart-4) + code.substring(variableDeclarationEnd+1);
    }
    
    variableNames.forEach(function(variableName) {
      //console.log(variableName);
      newCode = newCode.replace("\n" + variableName + " = ", "\nlet " + variableName + " = ");
    });

    return newCode.trim();
  }

  function generateCode() {
    var code = Blockly.JavaScript.workspaceToCode(shared.workspace || Blockly.getMainWorkspace());
    return varsToLets(code);    
  }

  function generateXML() {
    var xmlDom = Blockly.Xml.workspaceToDom(shared.workspace);
    var xmlText = Blockly.Xml.domToPrettyText(xmlDom);//alert(xmlText);
    return xmlText;
    //var domParser = new DOMParser();
    //var xmlDoc = domParser.parseFromString(xmlText, "text/xml");
    //return xmlDoc;
  }

  function generateBlocksFromXML() {
    var workspace = shared.workspace || Blockly.getMainWorkspace();
    var xmlText = document.getElementById('xmlData').value;
    var xmlDom = null;
    try {
      xmlDom = Blockly.Xml.textToDom(xmlText);
    } catch (e) {
      // Message XML - add constant for message for bad XML
      // T2C.MSG.currentLanguage['badXml'].replace('%1', e)
      var q =
        window.confirm(e);
      if (!q) {
        return;
      }
    }
    if (xmlDom) {
      workspace.clear();
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
    }

    Blockly.svgResize(workspace);
  }

  function runCode() {
    var code = generateCode();
    console.realLog = console.log; // keep reference to actual log for debugging purposes
    try {
      document.getElementById("consoleDisplay").textContent = ""; // clear display console
      console.log = function() {
        document.getElementById("consoleDisplay").appendChild(
          document.createTextNode(Array.prototype.join.call(arguments, " ") + "\n"));
      };
      eval(code);
    } catch(e) {
      if(e.toString().indexOf("Reference") != -1) {
        alert(e.toString() + "\nMake sure variables are defined before they're used.  This means the variable definition let ____ = ____ needs to appear ABOVE.");
      } else {
        alert(e.toString());
      }
    }
    console.log = console.realLog; // restore
    return code;
  }

  function updateToolbox(langCode) {
    shared.toolbox.querySelectorAll("category")
      .forEach(category => {
        category.setAttribute("name", 
          T2C.MSG[langCode.toUpperCase()][category.dataset.name]);
    });

    shared.workspace.updateToolbox(shared.toolbox);
    T2C.MSG.currentLanguage = T2C.MSG[langCode.toUpperCase()];
  }

  function updateWords() {
    document.getElementById("changeButtons").querySelectorAll("button")
    .forEach(button => {
      button.textContent = T2C.MSG.currentLanguage[button.name];
    });
  }

  function updateTexts() {
    document.getElementById("text-code").querySelectorAll("textarea")
    .forEach(textarea => {
      textarea.placeholder = T2C.MSG.currentLanguage[textarea.name];
    });
  }
  
  return shared;
})();
