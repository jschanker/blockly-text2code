// The blocks in which code is typed in should generate no code
// Once valid code is entered into these blocks, they'll be disposed of

Blockly.Python['code_statement'] = Blockly.JavaScript['code_statement'] = function(block) {
  return "";
}

Blockly.Python['code_expression'] = Blockly.JavaScript['code_expression'] = function(block) {
  return "";
}