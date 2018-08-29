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
 * @fileoverview Interprets parse tree and produces object with blueprint
 * data for corresponding blocks
 * @author Jason Schanker
 */

"use strict";

const evaluate = root => {
  if(!root) return {};
  else if(typeof root === "string") return root.replace(/\"/g, "'");
  else if(root.rhs instanceof Array) {
    let args = root.rhs.map(evaluate);
    let returnBlock = JSON.stringify(interpretations[root.lhs]);
    if(returnBlock) {
      return JSON.parse(returnBlock.replace(/"%(\d+)"/g, (match, argNum) => {
        return (typeof args[argNum-1] === "string" ? '"' + args[argNum-1] + '"' : JSON.stringify(args[argNum-1]));
      }));
    } else {
      return args[0];
    }
  }
  else throw new Error("Invalid Root Type", root);
};