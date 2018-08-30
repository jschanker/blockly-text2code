/**
 * Copyright 2018 The Text2Code Authors.
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
 * @fileoverview Reads JSON data files for grammar and evaluator
 * and creates a JavaScript file with variable declarations and assignments
 * to stringified Objects with the derivation rules, tokens, and associations
 * between the symbols of the language and the corresponding blocks and 
 * properties.  This allows Text2Code to be run locally without needing
 * to read/write to files.
 *
 * Entering node build.js in the directory with this script will generate the 
 * JavaScript in the appropriate location to be accessed.
 * @author Jason Schanker
 */

"use strict";

const {readFileSync, writeFileSync, readdirSync} = require("fs");

let rules = {rules:{}, terminals:[]};
let tokens;
let interpretations = {};

readdirSync("grammar").forEach(file => {
  if(file.toLowerCase().endsWith(".json") && !file.toLowerCase().startsWith("tokens")) {
    let rulesFile = JSON.parse(readFileSync("grammar/" + file, "utf8"));
    Object.keys(rulesFile.rules).forEach(lhs => rules.rules[lhs] = rulesFile.rules[lhs]);
    rules.terminals.push(...rulesFile.terminals);
  }
  else if(file.toLowerCase() === "tokens.json") {
    tokens = JSON.parse(readFileSync("grammar/tokens.json", "utf8"));
  }
});

readdirSync("block-interpretation").forEach(file => {
  if(file.toLowerCase().endsWith(".json")) {
    let interpretationFile = JSON.parse(readFileSync("block-interpretation/" + file, "utf8"));
    Object.keys(interpretationFile).forEach(lhs => interpretations[lhs] = interpretationFile[lhs]);
  }
});

try {
	//writeFileSync("grammar.js", "export let rules = " + JSON.stringify(rules) + ";\nexport let tokens = " + JSON.stringify(tokens) + ";");
	//appendFileSync
	const escapeChars = s => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
	let escapedRules = 
	writeFileSync("grammar.js", "let rules = JSON.parse('" + escapeChars(JSON.stringify(rules)) + "');\nlet tokens = JSON.parse('" + escapeChars(JSON.stringify(tokens)) + "');");
	writeFileSync("block-interpretations.js", "let interpretations = JSON.parse('" + escapeChars(JSON.stringify(interpretations)) + "');");
} catch(err) {
	console.log(err);
}