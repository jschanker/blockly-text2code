// The blocks in which code is typed in should generate no code
// Once valid code is entered into these blocks, they'll be disposed of
// EDIT: Later exercises may use only type-in-code block generators

Blockly.JavaScript['code_statement'] = function(block) {
  const exp = block.getFieldValue('EXP');
  return (exp.endsWith(';') ? exp : exp + ';') + '\n';
}

Blockly.Python['code_statement'] = function(block) {
  return block.getFieldValue('EXP') + '\n';
}

Blockly.JavaScript['code_expression'] = function(block) {
  return [block.getFieldValue('EXP'), Blockly.JavaScript.ORDER_NONE];
}

Blockly.Python['code_expression'] = function(block) {
  //return [block.isCollapsed() ? block.getFieldValue("EXP") : "", Blockly.Python.ORDER_NONE];
  return [block.getFieldValue('EXP'), Blockly.Python.ORDER_NONE];
}

function codeHybridForLanguage(languageName, isStatement) {
  return function(block) {
    const mode = block.getFieldValue('MODE');
    let blockCode;
    let statementBlock;

    if (mode === 'TEXT') {
      // hack to get code by switching to block mode, which causes attempt to
      //    parse text and convert to blocks, accordingly.
      block.setFieldValue('BLOCK', 'MODE');
    }

    statementBlock = block.getInputTargetBlock('EXP_STATEMENT');
    if (statementBlock) {
      // remove comments from all descendants to avoid polluting code
      statementBlock.getDescendants()
         .forEach(block => block.setCommentText(''));
      // temporary fix until problem of issue with variable code is fixed;
      //    this probably has something to do with hack-y removal of vars
      //    from code but unclear why comments are part of code after removed
      //    by above.
      try {
        blockCode = Blockly[languageName].blockToCode(statementBlock);
      } catch(e) {
        blockCode = '';
      }
      // blockCode = Blockly[languageName]
      //    .statementToCode(block, 'EXP_STATEMENT');
    } else {
      blockCode = '';
    }

    // revert mode if originally in TEXT MODE
    block.setFieldValue(mode, 'MODE');
    return blockCode;
  }
}

['Python', 'JavaScript'].forEach(language => Blockly[language]
    .code_statement_hybrid = codeHybridForLanguage(language, true));