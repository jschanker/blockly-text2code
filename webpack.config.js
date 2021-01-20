module.exports = {
	mode: 'production',
	entry: {
		text2code_core: './core/index.js',
		text2code_core_mobile: './core/mobile.js',
		text2code_blocks: './blockly/blocks/blocks.js',
		text2code_blocks_mobile: './blockly/blocks/blocks_mobile.js',
		text2code_generators: './blockly/generators/javascript/generators.js',
		csc1030_problems: './csc1030/problems.js'
	}
}