// The blocks in which code is typed in should generate no code
// Once valid code is entered into these blocks, they'll be disposed of
// EDIT: Later exercises may use only type-in-code block generators

Blockly.JavaScript['code_statement'] = function(block) {
	const exp = block.getFieldValue("EXP");
  return (exp.endsWith(";") ? exp : exp + ";") + "\n";
}

Blockly.Python['code_statement'] = function(block) {
  return block.getFieldValue("EXP") + "\n";
}

Blockly.JavaScript['code_expression'] = function(block) {
  return [block.getFieldValue("EXP"), Blockly.JavaScript.ORDER_NONE];
}

Blockly.Python['code_expression'] = function(block) {
  //return [block.isCollapsed() ? block.getFieldValue("EXP") : "", Blockly.Python.ORDER_NONE];
  return [block.getFieldValue("EXP"), Blockly.Python.ORDER_NONE];
}