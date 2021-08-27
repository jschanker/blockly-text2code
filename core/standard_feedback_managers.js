import Match from './match.js';
import FeedbackManager from './feedback_manager.js';

T2C.FeedbackManagers = {};

T2C.FeedbackManagers['default'] = {
  errorFunctions: [
    {
    	selectType: 'expected',
    	expected: '(',
    	outputType: 'function',
    	showType: 'error',
    	msg: (matchItem, matchArr, options) => {
    		const index = matchArr.indexOf(matchItem);
  		  return T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_OPEN_PARENTHESIS
  		    .replace("%1", matchArr[Match.getTerminalIndexForSymbol(matchArr,
  		    index)].match);
    	}
  	},
  	{
    	selectType: 'expected',
    	expected: ')',
    	outputType: 'function',
    	showType: 'error',
    	msg: (matchItem, matchArr, options) => {
    		const index = matchArr.indexOf(matchItem);
  		  return T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_CLOSE_PARENTHESIS
  		    .replace("%1", matchArr[Match.getTerminalIndexForSymbol(matchArr,
  		    index)].match);
    	}
  	},
  	{
    	selectType: 'expected',
    	expected: item => item && item.source === /^[;]*$/.source,
    	outputType: 'function',
    	showType: 'error',
    	msg: (matchItem, matchArr, options) => {
    		const remainingStr = (matchItem.remaining != null) ?
    		    matchItem.remaining.toString() : '';
    		const leadingSemicolonLen = remainingStr.match(/^[;]*/)[0].length;
    		return T2C.MSG.currentLanguage.TYPEIN_ERROR_REMOVE_EXTRA_AT_END
  		      .replace("%1", typeof matchItem.remaining === 'string'
  		      && matchItem.remaining.substring(leadingSemicolonLen));
    	}
  	},
  	{
    	selectType: 'expected',
    	expected: (item, matchArr, options) => {
    		// console.error("::", item, Match.equalsTerminal(item), matchArr, options);
    		return Match.equalsTerminal(item)
    	},
    	outputType: 'function',
    	showType: 'error',
    	//msg: "{T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED}"
  		    //.replace("%1", T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] || terminal),
  		//msg: (terminal) => T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED
  		//    .replace("%1", T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] || terminal)
  		msg: (matchItem, matchArr, options) => {
    		const index = matchArr.indexOf(matchItem);
    		//console.error("MA", matchArr, index);
  		  return T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED
  		    .replace("%1", Match.getExpected(matchItem));
    	}
    }
    /*
  	this.standardErrorMessages = {
  		EXTRA_AT_END: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_REMOVE_EXTRA_AT_END
  		    .replace("%1", remaining),
  		MISTYPED_TERMINAL: (terminal, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED
  		    .replace("%1", T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] || terminal),
  		MISSING_OPEN_PARENTHESIS: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_OPEN_PARENTHESIS
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_OPEN_BRACKET: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_OPEN_BRACKET
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_CLOSE_PARENTHESIS: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_CLOSE_PARENTHESIS
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_CLOSE_BRACKET: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_CLOSE_BRACKET
  		    .replace("%1", matchResultArr[forIndex]),
  		MISSING_PERIOD_AFTER_VARIABLE: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_PERIOD_AFTER_VARIABLE
  		    .replace("%1", matchResultArr[forIndex]),
  		UNNECESSARY_OPEN_PARENTHESIS: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_WARNING_UNNECESSARY_OPEN_PARENTHESIS
  		    .replace("%1", matchResultArr[forIndex]),
  		UNKNOWN: (forIndex, matchResultArr, remaining) => 
  		  T2C.MSG.currentLanguage.TYPEIN_UNKNOWN_ERROR
  		    .replace("%1", matchResultArr[forIndex])
  	};
  	*/
  ]
}

T2C.FeedbackManagers['string_literal'] = {
  DEFAULT_MISSING_OPEN_SINGLE_QUOTE_MSG: 'The message to supply to the user ' +
      'should be surrounded by \' and \' because you want it to be displayed' +
      ' as is.',
  DEFAULT_MISSING_OPEN_DOUBLE_QUOTE_MSG: 'The message to supply to the user ' +
      'should be surrounded by " and " because you want it to be displayed ' + 
      'as is!',
  DEFAULT_WRONG_BLOCK_MSG: 'This is not the correct block to ' +
      'place here.',
  DEFAULT_MISSING_PHRASE_ERROR_MSG: 'The message to the user should contain ' +
      '{feedbackItem.expected.value}.',
  errorFunctions: [
    {
    	selectType: 'id',
    	id: 'string_literal_open_double',
    	outputType: 'function',
    	showType: 'error',
    	msg: 'stringLiteralMissingOpenDouble'
    },
    {
    	selectType: 'id',
    	id: 'string_literal_open_single',
    	outputType: 'function',
    	showType: 'error',
    	msg: 'stringLiteralMissingOpenSingle'
    },
    {
    	selectType: 'id',
    	id: 'string_literal_include_text_single',
    	outputType: 'function',
    	showType: 'error',
    	msg: 'stringLiteralMissingIncludeTextSingle'
    },
    {
    	selectType: 'id',
    	id: 'string_literal_include_text_double',
    	outputType: 'function',
    	showType: 'error',
    	msg: 'stringLiteralMissingIncludeTextDouble'
    },
    {
    	selectType: 'id',
    	id: 'string_literal_block',
    	outputType: 'function',
    	showType: 'error',
    	msg: 'stringLiteralWrongBlock'
    },
    {
    	selectType: 'id',
    	// id: 'string_literal_block_include_text',
    	id: 'string_literal_field',
    	outputType: 'function',
    	showType: 'error',
    	msg: 'stringLiteralMissingIncludeTextBlock'
    }
  ]
}

T2C.FeedbackManagers['prompt_store_input'] = {
	/*
	init: function(options) {
		this.variableName = 
	},
	variableMsg: 
	*/

	//DEFAULT_VAR_NAME_ERROR_MSG: "Be sure to name the variable you're declaring {feedbackItem.expected.value}.",
	DEFAULT_VAR_NAME_ERROR_MSG: 'Be sure to name the variable you\'re ' + 
	    'declaring {feedbackItem.expected.value}.',
	//DEFAULT_MISSING_PHRASE_ERROR_MSG: "The message to the user should contain {feedbackItem.expected.token.source}.",
  DEFAULT_MISSING_PHRASE_ERROR_MSG: 'The message to the user should contain ' +
      '{feedbackItem.expected.value}.',
  DEFAULT_VARIABLE_NAME: 'item',
  feedbackJsonText: [
       
  ],
  feedbackJsonBlock: [
    {selectType: "id", id: 0, showType: "error", outputType: "string", msg: "You'll want to store the result in a variable, which means you should use a {T2C.MSG.currentLanguage.TERMINAL_LET} variable block."},
    {selectType: "id", id: 2, showType: "error", outputType: "string", msg: "The variable should store what the user enters, which means you'll need to attach it to a {T2C.MSG.currentLanguage.TERMINAL_GETINPUTBYASKING} block."},
    //{selectType: "id", id: 4, showType: "error", outputType: "string", msg: 'This is not the correct block to place here.'},
    //{selectType: "id", id: 6, showType: "error", outputType: "string", msg: "{options.missing_phrase_error_msg}"},
    //{selectType: "id", id: 8, showType: "error", outputType: "string", msg: "{options.var_name_error_message}"}
    {
    	selectType: "id",
    	id: 6,
    	outputType: "function",
    	showType: "error",
    	msg: "missingPhraseFunction"
    },
    {
    	selectType: "id",
    	id: 8,
    	outputType: "function",
    	showType: "error",
    	msg: "wrongVariableFunction"
    },
    {
    	selectType: "id",
    	id: 11,
    	outputType: "function",
    	showType: "error",
    	msg: "wrongVariableFunction"
    },
    {
    	selectType: "id",
    	id: 12,
    	outputType: "function",
    	showType: "error",
    	msg: (matchItem, matchArr, options) => 'Remember to include an = after '
    	    + 'the variable ' + Match.getExpected(matchArr[matchArr.indexOf(
    	    matchItem)-1]).trim() + ' you\'re declaring to set it to the string '
    	    + 'the user enters.'
    },
    /*{
    	selectType: 'id',
    	id: 15,
    	outputType: 'function',
    	showType: 'error',
    	msg: 'missingPhraseFunction'
    },*/
    /*{
    	selectType: "id",
    	id: 10,
    	outputType: "function",
    	showType: "error",
    	//msg: "{T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED}"
  		    //.replace("%1", T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] || terminal),
  		msg: (terminal) => T2C.MSG.currentLanguage.TYPEIN_ERROR_TERMINAL_MISTYPED
  		    .replace("%1", T2C.MSG.currentLanguage["TERMINAL_" + terminal.toUpperCase()] || terminal)
    },*/
/*
      outputType: "string_condition",
      showType: "error",
      conditionArr: [
        {
        	type: "exact", 
        	value: '{T2C.FeedbackManagers["prompt_store_input"].DEFAULT_VARIABLE_NAME}',
        	msg: "You can change the variable name by clicking item and then selecting Rename variable..."
        },
        {
        	type: "else",
        	msg: "{options.var_name_error_message}"
        }
      ]
    }
    */
    //{selectType: "id", id: 8, showType: "error", outputType: "string", msg: "{options.var_name_error_message}"}
    /*{
    	selectType: 'expected',
    	expected: '(',
    	outputType: 'function',
    	showType: 'error',
    	msg: (matchItem, options, matchArr) => {
  		  T2C.MSG.currentLanguage.TYPEIN_ERROR_MISSING_OPEN_PARENTHESIS
  		    .replace("%1", matchResultArr[Match.getTerminalIndexForSymbol(matchArr, matchItem.index)])
    	}
  	}*/
  ].concat(T2C.FeedbackManagers['default'].errorFunctions)
   .concat(T2C.FeedbackManagers['string_literal'].errorFunctions)
};


T2C.FeedbackManagers["code_statement_hybrid"] = {
	DEFAULT_TEXT_MODE_FEEDBACK_MANAGER: (matchItem, matchArr, options) => {
		//console.error(matchItem, options, matchArr, options.options.wrongVariableFunction);
		//console.error(FeedbackManager.getFeedback(matchArr, 
		//    options.feedbackManager.feedbackJsonBlock, options.options));
		if(matchItem.id === -1) {
			//FeedbackManager.displayFeedback(matchArr, 
			//    options.feedbackManager.feedbackJsonBlock, options.options)
			return;
		}
		//    options.feedbackManager.feedbackJsonBlock, options.options)
		return FeedbackManager.getFeedback(matchArr,
		    options.feedbackManager.feedbackJsonBlock, options.options)
		    .map(feedbackArr => feedbackArr.msgArr.join("\n"))
			  .join("\n\n");
			  //T2C.FeedbackManagers[options.feedbackManager].feedbackJsonBlock, options.options);
	},
  feedbackJsonBlock: [
    {
  	  selectType: "id",
  	  id: 10000,
  	  outputType: "function",
  	  //showType: "error",
  	  msg: "textModeFeedbackManager"
  	  //msg: "Something went wrong."
    },
    {
  	  selectType: "id",
  	  id: -1,
  	  outputType: "component",
  	  //showType: "error",
  	  msg: "textModeFeedbackManager"
  	  //msg: "Something went wrong."
    },
    /*{
  	  selectType: "id",
  	  id: -1,
  	  outputType: "string",
  	  showType: "error",
  	  //msg: "wrongTextFunction"
  	  msg: "Something went wrong."
    }*/
  ]
}