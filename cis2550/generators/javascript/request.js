// Delay using async/await: https://stackoverflow.com/a/47480429

Blockly.JavaScript['cis_2550_1_get_request'] = (block) => {
/*  const delay = 10;
  const delayFunc = Blockly.JavaScript.provideFunction_(
        'delay',
        ['const ' + Blockly.JavaScript.FUNCTION_NAME_PLACEHOLDER_ + ' = ' +
         'ms => new Promise(res => setTimeout(res, ms));']);*/
	const requestFunc = typeof axios !== 'undefined' ? 'axios' : 'fetch';
	//const url = block.getFieldValue('URL');
  const url = Blockly.JavaScript.valueToCode(block, 'URL',
      Blockly.JavaScript.ORDER_NONE) || '\'\'';
	const dataVariable = block.getField('DATA_VAR').getText()
      .replace(/\s/g, '_').replace(/$\d+/g, '');
	const bodyThen = Blockly.JavaScript.statementToCode(block, 'THEN');

	//return requestFunc + '(\'' + url + '\')\n    .then((response) => ' +
  //return 'await ' + delayFunc + '(' + delay + ');' + '\n' +
  return requestFunc + '(' + url + ')\n    .then((response) => ' +
      'response.text())\n    .then((' + dataVariable + ') => {\n' + bodyThen +
      '});\n';
};

Blockly.JavaScript['cis_2550_1_post_request'] = (block) => {
/*
  const delay = 10;
  const delayFunc = Blockly.JavaScript.provideFunction_(
        'delay',
        ['const ' + Blockly.JavaScript.FUNCTION_NAME_PLACEHOLDER_ + ' = ' +
         'ms => new Promise(res => setTimeout(res, ms));']);
*/
  const requestFunc = typeof axios !== 'undefined' ? 'axios' : 'fetch';
  //const url = block.getFieldValue('URL');
  const url = Blockly.JavaScript.valueToCode(block, 'URL',
      Blockly.JavaScript.ORDER_NONE) || '\'\'';
  const payload = Blockly.JavaScript.valueToCode(block, 'PAYLOAD',
      Blockly.JavaScript.ORDER_NONE) || '\'\''; 
  const config = '{\n  method: \'POST\',\n  headers: {\n    \'Content-Type\': ' + 
  '\'application/x-www-form-urlencoded\'\n  },\n  body: ' + payload + '\n}';
  const dataVariable = block.getField('DATA_VAR').getText()
      .replace(/\s/g, '_').replace(/$\d+/g, '');
  const bodyThen = Blockly.JavaScript.statementToCode(block, 'THEN');

  //return requestFunc + '(\'' + url + '\')\n    .then((response) => ' +
  //return 'await ' + delayFunc + '(' + delay + ');' + '\n' +
  return requestFunc + '(' + url + ', ' + config + ')\n    .then((response) => ' +
      'response.text())\n    .then((' + dataVariable + ') => {\n' + bodyThen +
      '});\n';
};

Blockly.JavaScript['cis_2550_1_forEach_number'] = (block) => {
  const iteratorVariable = block.getField('VAR').getText()
      .replace(/\s/g, '_').replace(/$\d+/g, '');
  const cb = Blockly.JavaScript.prefixLines(
      Blockly.JavaScript.statementToCode(block, 'DO'), 
      Blockly.JavaScript.INDENT);
  const start = block.getFieldValue('START');
  const end = block.getFieldValue('END');
  const delay = block.getFieldValue('DELAY');

  //return requestFunc + '(\'' + url + '\')\n    .then((response) => ' +
  return 'for(let ' + iteratorVariable + ' = ' + start + '; ' +
      iteratorVariable + ' <= ' + end + '; ' + iteratorVariable + '++) {\n' +
      '  setTimeout(() => {\n' + cb + '  }, ' + delay + '*' +
      iteratorVariable + ');\n}\n';
};

Blockly.JavaScript['cis_2550_1_forEach_line'] = (block) => {
  const iteratorVariable = block.getField('VAR').getText()
      .replace(/\s/g, '_').replace(/$\d+/g, '');
  const s = Blockly.JavaScript.valueToCode(block, 'STR',
      Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
  const cb = Blockly.JavaScript.prefixLines(
      Blockly.JavaScript.statementToCode(block, 'DO'), 
      Blockly.JavaScript.INDENT);
  const start = block.getFieldValue('START') - 1;
  const end = block.getFieldValue('END');
  const delay = block.getFieldValue('DELAY');

  //return requestFunc + '(\'' + url + '\')\n    .then((response) => ' +
  return s + '.slice(' + start + ', ' + end + ')' +
  '.split(/\\r?\\n/).forEach((' + iteratorVariable + ', index) => {\n' +
  '  setTimeout(() => {\n' + cb + '  }, ' + delay + '*index);\n});\n';
};

Blockly.JavaScript['cis_2550_1_includes'] = (block) => {
  const haystack = Blockly.JavaScript.valueToCode(block, 'VALUE',
      Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
  const needle = Blockly.JavaScript.valueToCode(block, 'FIND',
      Blockly.JavaScript.ORDER_NONE) || '\'\'';

  return [haystack + '.includes(' + needle + ')',
      Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript['cis_2550_1_break'] = (block) => {
  return 'break;\n';
};