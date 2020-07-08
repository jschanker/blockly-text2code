# Blockly Text2Code

<p>An educational tool for creating block-based and textual languages that enable programming novices to code in their native languages before transitioning to industry-standard ones such as JavaScript.</p>

<h2>Environment Features/Customizations</h2>

* Fully customizable block-based language: Refer to https://developers.google.com/blockly/guides/overview for more information about creating a block-based language and translations to executable JavaScript (and other industry-standard languages)   
* Convert blocks from pedagogical language to pure JavaScript blocks.
* Fully customizable text-based language that embeds in JavaScript allowing person to program using a combination of pedagogical code from their own native languages and pure JavaScript.  To do this, JavaScript is extended via a library.
* Parser/Evaluator to convert text-based language to block-based language.  Production rules of <a href = "https://en.wikipedia.org/wiki/Context-free_grammar">Context-free grammar</a> can be specified in grammar JSON files.  Interpretations are specified in block-interpretations.
* Multi-lingual support: Add language constants in msg files.

<h2>English/Hindi Demo</h2>

To test with string function blocks, open ```exact.html``` in the browser.  For a video with a brief survey of the features using the Hindi blocks, see: https://www.youtube.com/watch?v=i-xbMmjWlHE .  For introductory instructional videos with a few string problems in English, see: https://www.youtube.com/playlist?list=PLp2Y2vdJAgErWyk_kPlKDs9RjQ6YpzV9X .

More documentation about customization to be added in the future.  

<h2>Build</h2>

If you make changes, you can reduild with Node Package Manager using the command: ```npm run build```
