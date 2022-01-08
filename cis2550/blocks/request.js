Blockly.Blocks["cis_2550_1_get_request"] = {
  init: function () {
    this.jsonInit({
      type: "cis_2550_1_get_request",
      //message0: "get data from URL: %1 %2 then on response with data %3 %4",
      message0: "get data from URL: %1 then on response with data %2 %3",
      args0: [
        {
          type: "input_value",
          name: "URL",
          check: "String"
        },
        {
          type: "field_variable",
          name: "DATA_VAR",
          variable: "data",
          //variableTypes: ["String"]
        },
        {
          type: "input_statement",
          name: "THEN"
        }
      ],
      previousStatement: null,
      colour: 160,
      tooltip: "Makes request for data from URL and processes response",
      helpUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"
    });
  }
};

Blockly.Blocks["cis_2550_1_post_request"] = {
  init: function () {
    this.jsonInit({
      type: "cis_2550_1_post_request",
      //message0: "get data from URL: %1 %2 then on response with data %3 %4",
      message0: "send data %1 to URL: %2 then on response with data %3 %4",
      args0: [
        {
          type: "input_value",
          name: "PAYLOAD",
          check: "String"
        },
        {
          type: "input_value",
          name: "URL",
          check: "String"
        },
        {
          type: "field_variable",
          name: "DATA_VAR",
          variable: "data",
          //variableTypes: ["String"]
        },
        {
          type: "input_statement",
          name: "THEN"
        }
      ],
      previousStatement: null,
      colour: 160,
      tooltip: "Makes request for data from URL and processes response",
      helpUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"
    });
  }
};

Blockly.Blocks['cis_2550_1_forEach_line'] = {
  init: function () {
    this.jsonInit({
      type: 'cis_2550_1_forEach_line',
      //message0: "get data from URL: %1 %2 then on response with data %3 %4",
      message0: 'for each line %1 in %2 from %3 to %4 %5 do %6',
      args0: [
        {
          type: 'field_variable',
          name: 'VAR',
          variable: 'item'
        },
        {
          type: 'input_value',
          name: 'STR',
          check: 'String'
        },
        {
          type: 'field_number',
          name: 'START',
          min: 1,
          value: 1
        },
        {
          type: 'field_number',
          name: 'END',
          min: 1,
          value: 1000
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'input_statement',
          name: 'DO'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      inputsInline: true,
      tooltip: 'For each line in a string, set the variable to the line and ' + 
          ' then do some statements',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['cis_2550_1_includes'] = {
  init: function () {
    this.jsonInit({
      type: 'cis_2550_1_includes',
      //message0: "get data from URL: %1 %2 then on response with data %3 %4",
      message0: '%1 contains text %2',
      args0: [
        {
          type: 'input_value',
          name: 'VALUE',
          check: ['String', 'Array']
        },
        {
          type: 'input_value',
          name: 'FIND'
        }
      ],
      output: 'Boolean',
      inputsInline: true,
      colour: 260,
      tooltip: 'True if the first value contains the text in the second.' +
          'This is case-sensitive so CARS contains CAR but not car.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['cis_2550_1_break'] = {
  init: function () {
    this.jsonInit({
      type: 'cis_2550_1_break',
      //message0: "get data from URL: %1 %2 then on response with data %3 %4",
      message0: 'break from loop',
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: 'Breaks from loop.',
      helpUrl: ''
    });
  }
};