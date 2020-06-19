/* TODO: Change toolbox XML ID if necessary. Can export toolbox XML from Workspace Factory. */
var toolbox = document.getElementById("toolbox");

var options = { 
	toolbox : toolbox, 
	collapse : false, 
	comments : false, 
	disable : false, 
	maxBlocks : Infinity, 
	trashcan : true, 
	horizontalLayout : false, 
	toolboxPosition : 'start', 
	css : true, 
	media : 'https://blockly-demo.appspot.com/static/media/', 
	rtl : false, 
	scrollbars : true, 
	sounds : true, 
	oneBasedIndex : true
};

/* Inject your workspace */ 
var workspace = Blockly.inject("blockly-div", options);
function init() {
  const lexer = new Tokenizer(tokens);
  const parser = new Parser(lexer, rules, Object.keys(interpretations).concat("statement"));
  const parseTreeBlockConnector = new ParseTreeBlockConnector();
  const evaluator = new BlockEvaluator(interpretations);
  return {lexer, parser, parseTreeBlockConnector, evaluator};
}

const shared = init();

/* Load Workspace Blocks from XML to workspace. Remove all code below if no blocks to load */

/* TODO: Change workspace blocks XML ID if necessary. Can export workspace blocks XML from Workspace Factory. */
//var workspaceBlocks = document.getElementById("workspaceBlocks"); 

/* Load blocks to workspace. */
//Blockly.Xml.domToWorkspace(workspace, workspaceBlocks);