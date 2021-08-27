import Match from '../core/match.js';
import FeedbackManager from '../core/feedback_manager.js';

'use strict';

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
 * @fileoverview Class to handle creation of feedback blocks 
 * @author Jason Schanker
 */

/**
 * Class to handle creation of feedback blocks
 */
class FeedbackBlockFactory {
  static createBlock(name, matchBlueprint, feedbackManagerText,
  	  feedbackManagerBlock, options={}) {
    const block = {};
    const blockTemplate = Blockly.Blocks['code_statement_hybrid'];
    Object.keys(blockTemplate).forEach(key => {
      block[key] = blockTemplate[key]; 
    });

    block.init = function() {
  	  blockTemplate.init.call(this);
      const blockTemplateOnChange = this.onchange;
  	  this.setMatchBlueprint(matchBlueprint);
      if (feedbackManagerText) {
        this.setTextFeedbackManager(feedbackManagerText);
      }
      if (feedbackManagerBlock) {
        this.setBlockFeedbackManager(feedbackManagerBlock);
      }
      /*
      this.onchange = function() {
        blockTemplateOnChange.apply(this, arguments);
        if (matchBlueprint) {
          const match = Match.getMatchResult(this, matchBlueprint);
          if (this.getFieldValue('MODE') === 'TEXT' && feedbackManagerText) {
            FeedbackManager.displayFeedback(match,
                T2C.FeedbackManagers['code_statement_hybrid']
                .feedbackJsonBlock, feedbackManagerText);
          } else if (this.getFieldValue('MODE') === 'BLOCK' &&
              feedbackManagerBlock) {
            FeedbackManager.displayFeedback(match,
                T2C.FeedbackManagers['code_statement_hybrid']
                .feedbackJsonBlock, feedbackManagerBlock);
          }
        }
      }
      */
    }

  	return (Blockly.Blocks[name] = block);
  }
}

export default FeedbackBlockFactory;