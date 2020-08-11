/**
 * Copyright 2018-2020 The Text2Code Authors.
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
 * JavaScript in the appropriate locations to be accessed.
 * @author Jason Schanker
 */

const {src, dest, task, series, parallel} = require('gulp');
const babel = require('gulp-babel');
const {readFileSync, writeFileSync, readdirSync} = require("fs");
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const jsdoc = require('gulp-jsdoc3');
const jasmine = require('gulp-jasmine');
const webpack = require('webpack');
const wconfig = require('./webpack.config.js');

function generateGammarAndInterpretationVars(cb) {
  let grammarHeader;
  let blockInterpretationHeader;
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
    else if(file.toLowerCase() === "grammar-header.js") {
      grammarHeader = readFileSync("grammar/grammar-header.js", "utf8");
    }
  });

  readdirSync("block-interpretation").forEach(file => {
    if(file.toLowerCase().endsWith(".json")) {
      let interpretationFile = JSON.parse(readFileSync("block-interpretation/" + file, "utf8"));
      Object.keys(interpretationFile).forEach(lhs => interpretations[lhs] = interpretationFile[lhs]);
    }
    else if(file.toLowerCase() === "block-interpretation-header.js") {
      blockInterpretationHeader = readFileSync("block-interpretation/block-interpretation-header.js", "utf8");
    }
  });

  // add partial rules/interpretations
  // Issues: if %d is value of type, %d should not be replaced
  //       : if %d is part of expression, this won't work

  Object.keys(rules.rules).forEach(lhs => {
    if(lhs !== "statement" && typeof rules.rules[lhs] !== "string") { // object
      Object.keys(rules.rules[lhs]).forEach(subLHS => {
        const rhs = rules.rules[lhs][subLHS];
        if(Array.isArray(rhs)) {
          for(let i = 2; i < rhs.length; i++) {
            const key = "__" + i + "__" + subLHS;
            rules.rules[lhs][key] = rhs.slice(0,i);
            if(interpretations[subLHS]) {
              interpretations[key] = JSON.parse(JSON.stringify(interpretations[subLHS]).replace(/\"%(\d)+\"/g, 
                (match, num) => num <= i ? match : '{\"type\": \"code_expression\"}'));
            }
          }
        }
      });
    }
  });

  try {
    const escapeChars = s => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    let escapedRules = 
    writeFileSync("./core/grammar.js", grammarHeader + "\n" + "export const rules = JSON.parse('" + escapeChars(JSON.stringify(rules)) + "');\nexport const tokens = JSON.parse('" + escapeChars(JSON.stringify(tokens)) + "');");
    writeFileSync("./core/block_interpretations.js", blockInterpretationHeader + "\n" + "export const interpretations = JSON.parse('" + escapeChars(JSON.stringify(interpretations)) + "');");
  } catch(err) {
    console.log(err);
  }

  console.log("Grammar/block interpretation files generated!");
  cb();
}

function generateDocumentation(cb) {
  src('./core/*.js', {read: false})      
    .pipe(jsdoc(cb));
}

function runTests(cb) {  
  src("./tests/*.js")
    .pipe(jasmine());  
  cb();
}

function convertImportsAndExports(cb) {
  webpack(wconfig).run(cb);
}

function minifyJS(filePath, outputPath, cb) {  
    src(filePath, {base: './'})
    .pipe(babel({
      "presets": ["es2015"]
    }))
    .pipe(terser())
    .pipe(dest(outputPath || "./"));
  console.log("JS Files Babelified and compressed");
  cb();
}

series(generateGammarAndInterpretationVars, convertImportsAndExports,
  parallel(minifyJS.bind(null, './dist/text2code_core.js', null),
    minifyJS.bind(null, './dist/text2code_core_mobile.js', null),
    minifyJS.bind(null, './dist/text2code_blocks.js', null),
    minifyJS.bind(null, './dist/text2code_blocks_mobile.js', null),  
    minifyJS.bind(null, './dist/text2code_generators.js', null),
    generateDocumentation),
  runTests)();