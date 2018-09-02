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
 * @fileoverview Attaches
 * Attaches click handlers to buttons that call appropriate code/block generating
 * functions (Blocks => JS & XML => Blocks); includes var to let code conversion
 * but this should be encompassed in variable generators
 * @author (Modified version of generateBlocksFromXML) fraser@google.com (Neil Fraser)
 * https://github.com/google/blockly/blob/b88a3bf41a15f2d92853cb7806effc53ef048882/demos/code/code.js
 *         (varsToLets) Jason Schanker
 */

(function() {
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
    var code = Blockly.JavaScript.workspaceToCode(workspace || Blockly.getMainWorkspace());
    return varsToLets(code);    
  }
  function generateXML() {
    var xmlDom = Blockly.Xml.workspaceToDom(workspace);
    var xmlText = Blockly.Xml.domToPrettyText(xmlDom);//alert(xmlText);
    return xmlText;
    //var domParser = new DOMParser();
    //var xmlDoc = domParser.parseFromString(xmlText, "text/xml");
    //return xmlDoc;
  }
  function generateBlocksFromXML() {
    var workspace = workspace || Blockly.getMainWorkspace();
    var xmlText = document.getElementById('xmlData').value;
    var xmlDom = null;
    try {
      xmlDom = Blockly.Xml.textToDom(xmlText);
    } catch (e) {
      var q =
          window.confirm(MSG['badXml'].replace('%1', e));
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
    try {
      eval(code);
    } catch(e) {
      if(e.toString().indexOf("Reference") != -1) {
        alert(e.toString() + "\nMake sure variables are defined before they're used.  This means the variable definition let ____ = ____ needs to appear ABOVE.");
      } else {
        alert(e.toString());
      }
    }
    return code;
  }
  document.getElementById("convertToJSText2CodeButton").addEventListener("click", function() {
    if(document.getElementById("consoleDisplay")) document.getElementById("consoleDisplay").textContent = "";
    document.getElementById("textCodeBox").value = runCode();
    document.getElementById("xmlData").value = generateXML();
  });
  document.getElementById("convertXMLToBlocksButton").addEventListener("click", function() {
    generateBlocksFromXML();
  });
  document.getElementById("convertToJSButton").addEventListener("click", function() {
    var workspace = workspace || Blockly.getMainWorkspace();
        workspace.getAllBlocks().forEach(convertTextBlocksToJSBlocks);
    // THIS SNIPPET OF CODE FOR REFRESHING THE WORKSPACE
    // AFTER THE CODE BLOCK IS REPLACED CAME FROM 
    // (I THINK) @author fraser@google.com (Neil Fraser): 
    // https://github.com/google/blockly/blob/4e42a1b78ee7bce8f6c4ae8a6600bfc6dbcc3209/demos/code/code.js
    // IS THERE ANOTHER WAY?
    // THIS CODE IS DUPLICATED - SHOULD BE FACTORED IN FUNCTION
    var xmlDom = Blockly.Xml.workspaceToDom(workspace);
    if (xmlDom) {
      workspace.clear();
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
    }
  });
})();
