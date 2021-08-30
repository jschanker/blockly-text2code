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
import {convertTextBlocksToJSBlocks, convertJSToTextBlocks} from "./block-converters/javascript/text_exact.js";
import {newBlock, refreshWorkspace, setNextBlock, setFieldValue, getLastBlock, 
  replaceWithBlock, fitBlocksInWorkspace} from "./block_utility_functions.js";

Blockly.COLLAPSE_CHARS = 200;
const isMobile = Blockly.utils.userAgent.MOBILE ||
                 Blockly.utils.userAgent.ANDROID ||
                 Blockly.utils.userAgent.IPAD;

export const getParseTree = function(text) {
  console.warn("Attempting to parse", text);
  // quick fix to handle Python's non-use of semicolons
  const strToParse = (T2C.MSG && T2C.MSG.currentLanguage === T2C.MSG.PY) ?
    text.replace(/[\r\n]+/g, ";") : text; 
  const parseTree = shared.parser.parseBottomUpCYK(strToParse, 
    shared.parseTreeBlockConnector)[0];
  if(parseTree) console.log("Parse Tree:", parseTree);
  return parseTree;
};

export const handleParseTreeToBlocks = function(parseTree, blockToReplace, refreshWorkspace=true, workspace=null) {
  workspace = workspace || shared.workspace;
  const evaluation = shared.evaluator.evaluate(parseTree);
  console.log("Evaluation: ", evaluation, blockToReplace);
  blockToReplace = blockToReplace || newBlock(workspace); // pass e.g., "math_number" if not replaced
  const replacingBlock = createBlocks(evaluation, blockToReplace, refreshWorkspace);
  console.log(replacingBlock);
  return replacingBlock;
};

// for type-in-code blocks
export const parseAndConvertToBlocks = function(props, e) {
  console.warn(e.type, e);
  if(this.isCollapsed()) {
    return;
  }

  if(props.updateAutocomplete) {
    props.updateAutocomplete(this.getFieldValue("EXP"), props.OPTIONS, props.shownOPTIONS, s => {
      console.warn("Parsing Partial", s);
      return shared.parser.parseBottomUpCYK(s, shared.parseTreeBlockConnector).length > 0;
    });
  }

  if(this.getFieldValue("AUTOCPLT")) {
    setFieldValue(this, this.getFieldValue("AUTOCPLT") + "\n", "EXP");
  }

  if(props.editing && (this.getFieldValue("EXP").endsWith("\r") || this.getFieldValue("EXP").endsWith("\n"))
     || props.editing && e.element === "workspaceClick") {
    const parseTree = getParseTree(this.getFieldValue("EXP"));

    if(parseTree) {
      props.editing = false;
      const replacingBlock = handleParseTreeToBlocks(parseTree, this, false);

      // remove all orphan type-in-code blocks from workspace
      shared.workspace.getAllBlocks()
        .filter(block => !block.getParent() && 
          (block.type === "code_expression" 
          || block.type === "code_statement"))
        .forEach(block => block.dispose())

      let typeInCodeBlock = shared.workspace.getAllBlocks()
        .find(block => block.type === "code_expression" 
          || block.type === "code_statement");

      if(typeInCodeBlock) {
        fitBlocksInWorkspace(shared.workspace);
        typeInCodeBlock = shared.workspace.getAllBlocks()
          .find(block => block.type === "code_expression" 
            || block.type === "code_statement");
        if(!isMobile) typeInCodeBlock.getField("EXP").showEditor_();
      } else {
        console.warn("Replacing block", replacingBlock)
        //const lastBlock = replacingBlock.lastConnectionInStack() || 
        //  (replacingBlock.getSurroundParent() && 
        //    replacingBlock.getSurroundParent().lastConnectionInStack());
        let lastBlock = getLastBlock(replacingBlock);

        let newTypeInCodeBlock = newBlock(shared.workspace, "code_statement");

        if(lastBlock.nextConnection) setNextBlock(lastBlock, newTypeInCodeBlock);
        refreshWorkspace(shared.workspace);
        fitBlocksInWorkspace(shared.workspace);
        newTypeInCodeBlock = shared.workspace.getAllBlocks()
          .find(block => block.type === "code_statement");
        if(!isMobile) newTypeInCodeBlock.getField("EXP").showEditor_();
      }
    }
    else if(props.editing && e.element === "workspaceClick") {
      alert("There seems to be a problem with the code you entered.  Check that your spelling is correct, that you use lowercase and capital letters as required, that every open parenthesis ( has a matching closed one ), that you use quotation marks as needed, and other potential issues with syntax.");
    }
  }
  /*
  if(props.editing && e.element === "workspaceClick") {
    props.editing = false;
    const parseTree = getParseTree(this.getFieldValue("EXP"));
    if(parseTree) {
      handleParseTreeToBlocks(parseTree, this);
      fitBlocksInWorkspace(shared.workspace);
      // console.log(createBlocks(evaluation, this, shared.workspace).toString());
    }
    else alert("There seems to be a problem with the code you entered.  Check that your spelling is correct, that you use lowercase and capital letters as required, that every open parenthesis ( has a matching closed one ), that you use quotation marks as needed, and other potential issues with syntax.");
    //console.log = displayLog; // restore
  }*/
};

/**** factor into new module languages.js? ****/

function varsToLets(code) {
  // var variableDeclarationStart = code.indexOf("var")+4;
  // starting location is used to make sure that you're not inside a comment
  var start = code.search(/^\s*var|[\r\n]\s*var/);
  var variableDeclarationStart = code.indexOf('var', start) + 4;
  var variableDeclarationEnd   = code.indexOf(";", variableDeclarationStart);
  var variableNames = [];
  var newCode = code;
  
  if (start !== -1) { // has variable declaration
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

export const workspaceToLanguageCode = function(workspace, language) {
  //var code = Blockly.JavaScript.workspaceToCode(shared.workspace || Blockly.getMainWorkspace());
  // Quick fix: Change built-in variables set language block to take language-specific
  //             text and adjust languages files accordingly
  //const codeGen = document.getElementById("language").value.toUpperCase() === "PY" ? 
  const codeGen = language === T2C.MSG.PY ?
    "Python" : "JavaScript";
  const convertVarsToLets = (codeGen === "JavaScript");
  // temporary fix to remove Python variable declarations
  Blockly.Python.tempFinish = Blockly.Python.finish;
  Blockly.Python.finish = code => code;

  // remove comments before generating code
  const blocks = workspace.getAllBlocks()
  const comments = blocks.map(block => block.getCommentText());
  blocks.forEach(block => block.setCommentText(null));

  const code = Blockly[codeGen].workspaceToCode(workspace || Blockly.getMainWorkspace()); 
  Blockly.Python.finish = Blockly.Python.tempFinish;

  // restore comments
  blocks.forEach((block, index) => block.setCommentText(comments[index]));

  return codeGen === "Python" ?
    code : varsToLets(code);
};

export const workspaceToXML = function(workspace) {
  const xmlDom = Blockly.Xml.workspaceToDom(workspace || Blockly.getMainWorkspace());
  const xmlText = Blockly.Xml.domToPrettyText(xmlDom);//alert(xmlText);
  return xmlText;
  //var domParser = new DOMParser();
  //var xmlDoc = domParser.parseFromString(xmlText, "text/xml");
  //return xmlDoc;
};

/**** END proposed languages module ****/

const shared = (function() {
  // hack to get textarea on mobile instead of prompt
  // https://github.com/google/blockly/blob/develop/core/field_textinput.js#L279
  // Blockly.Blocks['code_statement'].getField("EXP").showEditor_ 
  //  = Blockly.FieldTextInput.prototype.showInlineEditor_;
  
// Inline editor not working on mobile; deselects immediately when keyboard pops up as per comment from
// https://github.com/google/blockly/blob/4ac4332f5e78d9894a831ecd1288517798cc659d/core/field_textinput.js#L303
//  Blockly.FieldTextInput.prototype.showEditor_ = function(_opt_e,
//    opt_quietInput) {
//    this.workspace_ =
//      (/** @type {!Blockly.BlockSvg} */ (this.sourceBlock_)).workspace;
//    var quietInput = opt_quietInput || false;
//    this.showInlineEditor_(quietInput);
//  };

  const init = () => {
    window.addEventListener('DOMContentLoaded', (event) => {
      // hack to deal with incorrect module import conversion done by having multiple
      // entry points with webpack; avoids duplication
      if(document.getElementById("blockly-div").getAttribute("hasWorkspace")) return;
      document.getElementById("blockly-div").setAttribute("hasWorkspace", true);
      shared.toolbox = document.getElementById("toolbox");
//      const isMobile = Blockly.utils.userAgent.MOBILE ||
//                       Blockly.utils.userAgent.ANDROID ||
//                       Blockly.utils.userAgent.IPAD;
      const options = { 
        toolbox : toolbox, 
        collapse : true, 
        comments : false, 
        disable : false, 
        maxBlocks : Infinity, 
        trashcan : true, 
        //horizontalLayout : isMobile || window.innerHeight > window.innerWidth, 
        horizontalLayout: true,
        toolboxPosition : 'start', 
        css : true, 
        media : 'https://blockly-demo.appspot.com/static/media/', 
        rtl : false, 
        scrollbars : true, 
        sounds : true, 
        oneBasedIndex : true,
        zoom: {controls:true, startScale: Math.min(window.innerWidth/800, 1), 
          minScale: Math.min(window.innerWidth/800, 0.3)}
      };

      shared.workspace = Blockly.inject("blockly-div", options);
            console.warn(shared.workspace.getWidth());
      // hack to get textarea on mobile instead of prompt
      // https://github.com/google/blockly/blob/develop/core/field_textinput.js#L279
      newBlock(shared.workspace, "code_statement");
      refreshWorkspace(shared.workspace);
      const startBlock = shared.workspace.getAllBlocks()
          .find(block => block.type === "code_statement");
      if(!isMobile) startBlock.getField("EXP").showEditor_();

      const setLanguage = function() {
        const langCode = document.getElementById("language").value;
        T2C.MSG.currentLanguage = T2C.MSG[langCode.toUpperCase()];
        updateToolbox(T2C.MSG.currentLanguage);
        // Quick fix: Change built-in variables set language block to take language-specific
        //             text and adjust languages files accordingly
        Blockly.Msg["VARIABLES_SET"] = T2C.MSG.currentLanguage === T2C.MSG.PY ? 
          "%1 = %2" : "let %1 = %2;";
        updateTexts();
        refreshWorkspace(shared.workspace || Blockly.getMainWorkspace());
        document.getElementById("outputAppearsBelow").innerText = T2C.MSG.currentLanguage.HEADING_OUTPUT_APPEARS_BELOW;
        if(document.getElementById("bottomText")) document.getElementById("bottomText").innerText = T2C.MSG.currentLanguage.HEADING_BOTTOM_TEXT;
      };

      if(window.location && typeof window.location.href === "string") {
        const startLangLocation = window.location.href.indexOf("lang=")+5;
        const language = window.location.href.substring(startLangLocation, startLangLocation+2);
        if(startLangLocation !== 4) {
          document.getElementById("language").value = language;
          setLanguage();
        }
      }


      window.addEventListener("resize", function() {
        document.getElementById("top-header").style.height = 
          Math.max(0.1*window.innerHeight, 50) + 'px';
        document.getElementById("all-content").style.height = 
          Math.min(0.9*window.innerHeight, window.innerHeight-50) + 'px';        
        Blockly.svgResize(shared.workspace);
        /*
        if(window.innerHeight > window.innerWidth) {

        } else {

        }
        */
      });

      document.getElementById("language").addEventListener("change", function() {
          setLanguage();
          const workspace = shared.workspace || Blockly.getMainWorkspace();
          workspace.getAllBlocks().forEach(convertJSToTextBlocks);
          refreshWorkspace(workspace);
      });

      // REMOVE IF AFTER CONSOLIDATING MOBILE/DESKTOP VERSIONS
      if(document.getElementById("run-code-button")) {
        document.getElementById("run-code-button").addEventListener("click", function() {
          document.getElementById("output-container").classList.remove("hide-container");
          document.getElementById("output-container").classList.add("show-container");
          if(document.getElementById("consoleDisplay")) document.getElementById("consoleDisplay").textContent = "";
          if(T2C.MSG.currentLanguage === T2C.MSG.PY) {
            T2C.MSG.currentLanguage = T2C.MSG.JS; // reset for running purposes
          }
          document.getElementById("textCodeBox").value = runCode();
          T2C.MSG.currentLanguage = T2C.MSG[document.getElementById("language").value.toUpperCase()]; // restore language
          document.getElementById("xmlData").value = generateXML();
        });
        document.getElementById("save-code-button").addEventListener("click", function() {
          document.getElementById("text-code-container").classList.remove("hide-container");
          document.getElementById("text-code-container").classList.add("show-container");
          document.getElementById("textCodeBox").value = generateCode();
          document.getElementById("xmlData").value = generateXML();
          document.getElementById("load-save-text-code").textContent = T2C.MSG.currentLanguage["BUTTON_SAVE_TEXT_CODE"];
          document.getElementById("load-save-xml").textContent = T2C.MSG.currentLanguage["BUTTON_SAVE_XML"];
        });
        document.getElementById("load-code-button").addEventListener("click", function() {
          document.getElementById("text-code-container").classList.remove("hide-container");
          document.getElementById("text-code-container").classList.add("show-container");
          document.getElementById("textCodeBox").value = "";
          document.getElementById("xmlData").value = "";
          document.getElementById("load-save-text-code").textContent = T2C.MSG.currentLanguage["BUTTON_LOAD_TEXT_CODE"];
          document.getElementById("load-save-xml").textContent = T2C.MSG.currentLanguage["BUTTON_LOAD_XML"];
        });
        document.getElementById("load-save-text-code").addEventListener("click", function() {
          if(document.getElementById("load-save-text-code").textContent === T2C.MSG.currentLanguage["BUTTON_LOAD_TEXT_CODE"]) {
            const confirmConvertTextToBlocks = T2C.MSG.currentLanguage.CONFIRM_CONVERT_TEXT_TO_BLOCKS;
            const parseTree = getParseTree(document.getElementById("textCodeBox").value);

            if(parseTree && confirm(confirmConvertTextToBlocks)) {
              shared.workspace.clear();
              handleParseTreeToBlocks(parseTree);
              //shared.workspace.zoomToFit();
            }
            else if(!parseTree) {
              alert("There seems to be a problem with the code you entered.  Check that your spelling is correct, that you use lowercase and capital letters as required, that every open parenthesis ( has a matching closed one ), that you use quotation marks as needed, and other potential issues with syntax.");
            }
          } else {
            const codeToCopy = document.getElementById("textCodeBox").value;
            navigator.clipboard.writeText(codeToCopy).then(function() {
              alert("Code successfully copied to clipboard");
            }, function() {
              document.getElementById("textCodeBox").select();
              alert("Code unable to be copied to clipboard.  Please do this manually.");
            });
          }
        });
        document.getElementById("load-save-xml").addEventListener("click", function() {
          if(document.getElementById("load-save-xml").textContent === T2C.MSG.currentLanguage["BUTTON_LOAD_XML"]) {
            generateBlocksFromXML();
            //shared.workspace.zoomToFit();
          } else {
            const codeToCopy = document.getElementById("xmlData").value;
            navigator.clipboard.writeText(codeToCopy).then(function() {
              alert("XML successfully copied to clipboard");
            }, function() {
              document.getElementById("xmlData").select();
              alert("XML unable to be copied to clipboard.  Please do this manually.");
            });            
          }
        })
        document.getElementById("output-container").addEventListener("click", function(e) {
          // factor out repetition and class name should be something like "close"
          if(e.target.className === "table-cell") {
            document.getElementById("output-container").classList.remove("show-container");
            document.getElementById("output-container").classList.add("hide-container");
          }
        });
        document.getElementById("text-code-container").addEventListener("click", function(e) {
          if(e.target.className === "table-cell") {
            document.getElementById("text-code-container").classList.remove("show-container");
            document.getElementById("text-code-container").classList.add("hide-container");
          }
        });
      }
      
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
    return workspaceToLanguageCode(shared.workspace, T2C.MSG.currentLanguage);
    //var code = Blockly.JavaScript.workspaceToCode(shared.workspace || Blockly.getMainWorkspace());
    // Quick fix: Change built-in variables set language block to take language-specific
    //             text and adjust languages files accordingly
    //const codeGen = document.getElementById("language").value.toUpperCase() === "PY" ?
    /*
    const codeGen = T2C.MSG.currentLanguage === T2C.MSG.PY ?
      "Python" : "JavaScript";
    const convertVarsToLets = (codeGen === "JavaScript");
    // temporary fix to remove Python variable declarations
    Blockly.Python.tempFinish = Blockly.Python.finish;
    Blockly.Python.finish = code => code;
    const code = Blockly[codeGen].workspaceToCode(shared.workspace || Blockly.getMainWorkspace()); 
    Blockly.Python.finish = Blockly.Python.tempFinish;
    return codeGen === "Python" ?
      code : varsToLets(code);
    */
  }

  function generateXML() {
    return workspaceToXML(shared.workspace);
    /*
    const xmlDom = Blockly.Xml.workspaceToDom(shared.workspace);
    const xmlText = Blockly.Xml.domToPrettyText(xmlDom);//alert(xmlText);
    return xmlText;
    */
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
    const code = generateCode();
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
    // TODO : Maybe only show blocks appearing on autcomplete menu based on what user already typed in
    shared.workspace.updateToolbox(shared.toolbox);
  }

  function updateTexts() {
    const container = document.getElementById("text-code-container")
    container.querySelectorAll("textarea")
      .forEach(textarea => {
        textarea.placeholder = T2C.MSG.currentLanguage[textarea.name];
      });
  }
  
  return shared;
})();
