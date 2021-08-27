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
 * @fileoverview Class to get feedback for a given block/field based on matches
 * @author Jason Schanker
 */

"use strict";
// import Match from "./match.js";

/**
 * Class to get feedback for a given block/field based on matches
 */
class FeedbackManager {
	static interpolateMsg_(msg, feedbackItem, options={}) {
		let newMsg = msg;
		let i = 0;
		const maxDepth = 5;

		while(/{[^}]+}/.test(newMsg) && i < maxDepth) {
		  newMsg = newMsg.replace(/{[^}]+}/g, match => {
        // don't include { and }
				const propertyNameStr = match.substring(1,match.length-1);
				const propertyHierarchy = propertyNameStr.split(".");
				const objNames = {
					"T2C": T2C,
					"options": options,
					"feedbackItem": feedbackItem
				};

				const topLevelObj = objNames[propertyHierarchy[0]];

				if (topLevelObj) {
					return propertyHierarchy.slice(1)
					    .reduce((currentProp, prop) => currentProp[prop], topLevelObj);
				}	else {
				  return options[propertyNameStr] != null ?
				      options[propertyNameStr] : feedbackItem[propertyNameStr];
				}
			});
			i++;
		}
		return newMsg;
	}
	static getFeedback(matchArr, feedbackBlueprint, options) {

		const typesMap = {
			block: Blockly.Block,
			field: Blockly.Field
		};

    // create Array to hold all feedback messages for each match item
		const feedbackArr = matchArr.map(matchItem => ({msgArr: []}));
		
		feedbackBlueprint.forEach(feedbackItem => {
      // index-match item pairs of all match items selected by this feedback
      //     item
			let itemIndexPairs = [];
			if (feedbackItem.selectType === 'id') {
        // select by id
				const index = matchArr.findIndex(item => item.id === feedbackItem.id);
				if (index !== -1) {
					itemIndexPairs.push({index, item: matchArr[index]});
				}
			} else if (feedbackItem.selectType === 'expected') {
        // feedbackItem can be primitive type for direct comparison or
        //    Boolean function that takes match's expected item as input
				matchArr.forEach((item, index) => {
          // replace item.expected with Match.getExpected(item) for now?
          //     Should eventually be replaced with getter for expected from 
          //     MatchResult class later so this will be fine then.
					if (item.expected === feedbackItem.expected 
              || typeof feedbackItem.expected === 'function' 
              && feedbackItem.expected(item.expected)) {
						itemIndexPairs.push({index, item: matchArr[index]});
					}
				})
		  } else if (Object.keys(typesMap).includes(feedbackItem.selectType)) {
        // select all block/field/(other type to be added later) from matches
        //     NOT CURRENTLY USED
				const classType = typesMap[feedbackItem.selectType];
				matchArr.forEach((item, index) => {
					if(item.match instanceof classType && item.match.type) {
						itemIndexPairs.push({index, item: matchArr[index]});
					}
				})
				// items.push(...matchArr.filter(item =>
        //     item.match instanceof typesMap[feedbackItem.selectType]));
			}

      // Filter potential match items by showType: e.g., feedback item is only
      //     to be shown in case of error for this match item or only to be 
      //     shown in case it's correct
			if (feedbackItem.showType === 'error') {
				itemIndexPairs = itemIndexPairs.filter(itemIndexPair =>
				    itemIndexPair.item.hasError);
			} else if(feedbackItem.showType === 'correct') {
				itemIndexPairs = itemIndexPairs.filter(itemIndexPair =>
					  !itemIndexPair.item.hasError);
			}

      // Add message from this feedback item to list of messages for
      //     appropriate match item
			if (feedbackItem.outputType === 'string') {
				itemIndexPairs.forEach(itemIndexPair => 
				    feedbackArr[itemIndexPair.index].msgArr.push(
				    FeedbackManager.interpolateMsg_(feedbackItem.msg
				    , matchArr[itemIndexPair.index], options)))
			} else if (feedbackItem.outputType === 'function') {
				const feedbackFunc = options[feedbackItem.msg] || feedbackItem.msg;
				if (typeof feedbackFunc === 'function') {
          // generate feedback from this item using function
				  itemIndexPairs.forEach(itemIndexPair => 
				      feedbackArr[itemIndexPair.index].msgArr.push(
				      feedbackFunc(matchArr[itemIndexPair.index], matchArr, options)));
				}
			}

			/*else if(feedbackItem.outputType === "string_condition") {
				itemIndexPairs.forEach(itemIndexPair => 
				    feedbackArr[itemIndexPair.index].msgArr.push(
				    FeedbackManager.interpolateMsg_(feedbackItem.msg,
            matchArr[itemIndexPair.index], options)));
			}*/
		});
    // console.error("Feedback Array:", feedbackArr);
		return feedbackArr;
	}

	static displayFeedback(matchArr, feedbackBlueprint, options) {
    // console.error("Match Array", matchArr);
    // const typesWithFeedback = [Blockly.Block, Blockly.Field];
    // feedbackArr[index].msgArr contains all feedback for matchArr[index].
		const feedbackArr = FeedbackManager.getFeedback(matchArr,
        feedbackBlueprint, options);

    // IF block, blocksArr[i] is block to add feedback to for match item i
    const blocksArr = matchArr.map(matchItem => matchItem.match ||
        matchItem.remaining)
        .map(item => (item instanceof Blockly.Block || !item) ?
            item : item.getSourceBlock && item.getSourceBlock());
    const uniqueBlocksArr = [];

    const blocksWithFeedbackArr = [];

    blocksArr.forEach((item, index) => {
      if(item instanceof Blockly.Block) {
        const blockIndex = uniqueBlocksArr.indexOf(item);
        if(blockIndex !== -1) {
          blocksWithFeedbackArr[blockIndex].indexArr.push(index);
          blocksWithFeedbackArr[blockIndex].feedbackMsgArr
              .push(feedbackArr[index].msgArr);
          blocksWithFeedbackArr[blockIndex].hasCorrectItem =
              blocksWithFeedbackArr[blockIndex].hasCorrectItem ||
              !matchArr[index].hasError;
          blocksWithFeedbackArr[blockIndex].hasErrorItem =
              blocksWithFeedbackArr[blockIndex].hasErrorItem ||
              matchArr[index].hasError;
          blocksWithFeedbackArr[blockIndex].isMatchComplete =
              blocksWithFeedbackArr[blockIndex].isMatchComplete &&
              matchArr[index].isMatchComplete;
        } else {
          uniqueBlocksArr.push(item);
          blocksWithFeedbackArr.push({
            block: item,
            indexArr: [index],
            feedbackMsgArr: [feedbackArr[index].msgArr],
            hasCorrectItem: !matchArr[index].hasError,
            hasErrorItem: matchArr[index].hasError,
            isMatchComplete: matchArr[index].isMatchComplete
          });
        }
      }
    });

    FeedbackManager.addFeedbackToBlocks(
        //blocksWithFeedbackArr.map(blockWFeedback => blockWFeedback.block),
        uniqueBlocksArr,
        blocksWithFeedbackArr.map(blockWFeedback => blockWFeedback
        .feedbackMsgArr));

    blocksWithFeedbackArr.forEach(blockWFeedback => {
      const block = blockWFeedback.block;
      if (blockWFeedback.hasErrorItem && !blockWFeedback.hasCorrectItem) {
        FeedbackManager.setBlockFeedbackColour(block, false);
      } else if (!blockWFeedback.hasErrorItem && blockWFeedback
          .hasCorrectItem) {
        FeedbackManager.setBlockFeedbackColour(block, true,
            blockWFeedback.isMatchComplete);
      } else {
        FeedbackManager.restoreBlockFeedbackColour(block);
      }
    });
	}

	static addFeedbackToBlocks(blocksWithFeedback, blockFeedbackMsgArrs) {
		if(blocksWithFeedback.length > 0) {
			// remove comments from all blocks without feedback
      // console.error("BLOCKS W/FEEDBACK", blocksWithFeedback,
      //    blockFeedbackMsgArrs);
			const workspace = blocksWithFeedback[0].workspace;
			workspace.getAllBlocks().forEach(block => {
				if(!blocksWithFeedback.includes(block)) {
					block.setCommentText('');
					block.setCommentText(null);
					if(block.startColour != null) {
						block.setColour(block.startColour);
					}
				}
			})
		}
		blocksWithFeedback.forEach((block, index) => {
			const feedback = blockFeedbackMsgArrs[index]
			    .map(feedbackArr => feedbackArr.join('\n'))
			    .join('\n\n'); // ---
			if (feedback.trim() !== '') {
				// console.error("BLOCK", block.type, feedback);
			  block.setCommentText(feedback.trim());
			  //block.getCommentIcon().setVisible(true);
			  let {width, height} = block.getCommentIcon().getBubbleSize();
			  height = Math.max(height, Math.ceil(1.5*20*feedback.trim()
            .length*8/width));
			  block.getCommentIcon().setBubbleSize(width, height);
			} else {
				//block.getCommentIcon() && block.getCommentIcon().setVisible(false);
				block.setCommentText('');
        // Handle removal of question mark icon after alignment bug is fixed
        // if (!block.isSelected()) {
				//  block.setCommentText(null); // hide feedback error
        // }
			}
		})
	}

  static restoreBlockFeedbackColour(block) {
    if (block.startColour != null) {
      block.setColour(block.startColour);
    }
  }

	// static setBlockFeedbackColour(block, feedbackArr, isCorrect) {
  static setBlockFeedbackColour(block, isCorrect, colourIfNoFeedback=false) {
		if (block instanceof Blockly.Block) {
			//if(feedbackArr.join('\n') !== '') {
      const hasCommentText = block.getCommentText() && block.getCommentText()
          .trim();
			if (hasCommentText || colourIfNoFeedback) {
        // colour hasn't been changed yet, set block's default colour to 
        //     revert to when there's no feedback
				if (block.startColour == null) {
					block.startColour = block.getColour();
				}
				if (isCorrect) {
					block.setColour('#080');
				} else {
					block.setColour('#800');
				}
		  } else {
        // no feedback, revert to default starting colour
				FeedbackManager.restoreBlockFeedbackColour(block);
			}
		}
	}
}

export default FeedbackManager;