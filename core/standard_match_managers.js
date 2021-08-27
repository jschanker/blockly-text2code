import Match from "./match.js";

T2C.MatchManagers = {};

T2C.MatchManagers['string_literal'] = {
  getMatchResult: (item, options) => {
    const includeText = options.includeText || '';
    const exactTextToken = {id: 20, type: 'exact', value: options.exactText,
        partial: true}; 
    const textTokenSingleQuotes = typeof options.exactText !== 'undefined' ?
        exactTextToken :
        {id: 'string_literal_include_text_single', type: 'regexp',
        postfix: true, tokenPartial: /^[^']*$/,
        token: new RegExp("^[^']*" + includeText + "[^']*", 'i')};
    const textTokenDoubleQuotes = typeof options.exactText !== 'undefined' ?
        exactTextToken :
        {id: 'string_literal_include_text_double', type: 'regexp',
        postfix: true, tokenPartial: /^[^"]*$/,
        token: new RegExp('^[^"]*' + includeText + '[^"]*', 'i')};

    if (options.textMode) {
      const match = Match.getMatchResult(
          item,
          {
            id: 18,
            type: 'or',
            value: [
              {
                type: 'Array',
                value: [
                  {id: 'string_literal_open_double', type: 'exact', value: '"',
                      postfix: true},
                  textTokenDoubleQuotes,
                  {id: 'string_literal_close_double', type: 'exact',
                      value: '"', postfix: true},
                ]
              },
              {
                type: 'Array',
                value: [
                  {id: 'string_literal_open_single', type: 'exact', value: "'",
                      postfix: true},
                  textTokenSingleQuotes,
                  {id: 'string_literal_close_single', type: 'exact',
                      value: "'", postfix: true},
                ]
              }
            ]
          }
        );
      // console.error("STRING LITERAL MATCH", match);
      return match;
    } else {
      const match = Match.getMatchResult(
          item,
          {
            id: 'string_literal_block',
            type: 'block',
            value: {
              id: 'string_literal_block_value',
              type: 'text',
              inputs: [],
              fields: [
                {
                  id: 'string_literal_field',
                  type: 'field',
                  name: 'TEXT',
                  value: {
                    id: 'string_literal_block_include_text',
                    type: 'includes',
                    value: includeText
                  }
                }
              ]
            }
          });
          /*
          {
            id: 18,
            type: 'or',
            value: [
              textTokenSingleQuotes,
              textTokenDoubleQuotes
            ]
          }
          
        );*/
      // console.error("STRING LITERAL MATCH", match);
      return match;
    }
  }
};

T2C.MatchManagers['prompt_store_input'] = {
  getMatchResult: (item, options) => {
  	const includeText = options.promptText || '';
    const variableName = options.varName || 'item';
    const promptTokenText = 
        {id: 15, tokenPartial: /^"[^"]*$|^'[^']*$/, token: new RegExp('^"[^"]*'
        + includeText + '[^"]*"|^\'[^\']*' + includeText + '[^\']*\'', 'i'),
        type: "regexp"};
    const promptTokenBlock = 
        {token: new RegExp('[\s\S]*' + includeText + '[\s\S]*', 'i'),
        type: 'regexp'};
    const promptTerminal = options.promptLanguage 
        ? {id: 13, type: 'exact', value: T2C.MSG[options.promptLanguage]
        .TERMINAL_GETINPUTBYASKING, partial: true, postfix: true}
        : {id: 13, type: 'terminal', token: 'getInputByAsking'};
    // const variableNameToken = {token: new RegExp("^" + includeText + "$"),
    //    type: "regexp"};

    if (options.textMode) {
    	const match = Match.getMatchResult(
    		  item,
    	    {
    		  	type: "Array",
    		    value: [
              //{id: 10, type: "exact", value: T2C.MSG.currentLanguage
              //    .TERMINAL_LET, partial: true, postfix: true},
              {id: 10, type: "terminal", token: "let"},
              {id: 11, type: "exact", value: variableName, partial: true,
                  postfix: true},
              {id: 12, type: "exact", value: '=', partial: true,
                  postfix: true},
              // {id: 13, type: "exact", value: T2C.MSG.currentLanguage
              //     .TERMINAL_GETINPUTBYASKING, partial: true, postfix: true},
              promptTerminal,
              {id: 14, type: "exact", value: '(', postfix: true},
              //promptTokenText,
              {id: 15, type: 'component', name: 'string_literal',
                  value: {includeText, textMode: true}, postfix: true},
              {id: 16, type: "exact", value: ')', postfix: true},
              {id: 17, token: /^[;]*$/, type: "regexp"}
            ]
          }
      );
      // console.error('MATCH', match);
      return match;
    } else {
    	// block mode
    	return Match.getMatchResult(
    		item,
    	  {
          id: 0,
    	  	type: 'block',
    	  	value: {
    	  		type: 'variables_set',
    	  		inputs: [
    	  		  {
                id: 1,
    	  		  	type: 'input',
    	  		  	name: 'VALUE',
    	  		  	value: {
                  id: 2,
    	  		  		type: 'block',
    	  		  		value: {
    	  		  			types: ['text_input', 'js_text_input'],
    	  		  			inputs: [
    	  		  			  {
                        id: 3,
    	  		  			  	type: 'input',
    	  		  			  	name: 'TEXT',
                        value: {
                          type: 'component',
                          name: 'string_literal',
                          value: {
                            includeText,
                            textMode: false
                          }
                        }
                        /*
    	  		  			  	value: {
                          id: 4,
    	  		  			  		type: 'block',
    	  		  			  		value: {
                            id: 5,
    	  		  			  			type: 'text',
    	  		  			  			inputs: [],
    	  		  			  			fields: [
    	  		  			  			  {
                                id: 6,
    	  		  			  			  	type: 'field',
    	  		  			  			  	name: 'TEXT',
    	  		  			  			  	value: {
                                  id: 7,
                                  type: 'includes',
                                  value: includeText
                                }
    	  		  			  			  }
    	  		  			  			]
    	  		  			  		}
    	  		  			  	}*/
    	  		  			  }
    	  		  			],
    	  		  			fields: []
    	  		  		}
    	  		  	}
    	  		  }
    	  		],
    	  		fields: [
    	  		  {
                id: 8,
    	  		  	type: 'field', // instead of value
    	  		  	useText: true,
    	  		  	name: 'VAR',
    	  		  	value: {
                  id: 9,
    	  		  		type: 'exact',
    	  		  		value: variableName
    	  		  	}
    	  		  }
    	  		]
    	  	}
    	  }
    	)
    }
  }
};

T2C.MatchManagers['code_statement_hybrid'] = {
  getMatchResult: (item, options) => {
    const matchManagerType = options.matchManagerType;
    const value = options.value;
    // console.error("ITEM", item.type, item.getFieldValue('MODE'));
    //if(item.type === 'text_block_code_hybrid') {
    // if(item.type === 'code_statement_hybrid') {
      const textMode = item.getFieldValue('MODE') === 'TEXT';
      value.textMode = textMode;
      //if(item.getFieldValue('MODE') === 'BLOCK') {
      /*
      return Match.getMatchResult(
          textMode ? item.getFieldValue('EXP')
          : item.getInputTargetBlock('EXP_STATEMENT'),
          {
            id: -1,
            type: "component",
            name: matchManagerType,
            value//: {
            //  textMode: item.getFieldValue('MODE') === 'TEXT'
            //} 
          }
      )
      */
      if(textMode) {
        return Match.getMatchResult(
            item.getField('EXP'),
            {
              id: 10000,
              type: "field",
              name: "EXP",
              value: {
                type: 'component',
                name: matchManagerType,
                value
              }
            }
        )
      } else {
        return Match.getMatchResult(
            item.getInputTargetBlock('EXP_STATEMENT'),
            {
              id: -1,
              type: 'component',
              name: matchManagerType,
              value//: {
              //  textMode: item.getFieldValue('MODE') === 'TEXT'
              //} 
            }
        )        
      }
    }
  // }
};
// export default T2C.MatchManagers;