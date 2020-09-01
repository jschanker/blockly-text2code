import {getParseTree, handleParseTreeToBlocks} from "../core/mobile.js";
import {refreshWorkspace} from "../core/block_utility_functions.js";
import CourseInstructionTask from "../core/course_instruction_task.js";
import GlideAnimation from "../core/glide_animation.js";
import BlinkAnimation from "../core/blink_animation.js";
import HelpMessageDirection from "../core/help_message_direction.js";
import SeriesAnimations from "../core/series_animations.js";
import CourseInstructionTaskFlow from "../core/course_instruction_task_flow.js";
//Blockly.Python['code_statement'] = Blockly.JavaScript['code_statement'] =
Blockly.Python['type_in_display_string_literal'] = Blockly.JavaScript['type_in_display_string_literal'] = Blockly.JavaScript['code_statement'];
Blockly.Blocks['type_in_display_string_literal'] = {
  validate: (exp) => {
    const langDisplays = Object.values(T2C.MSG)
      .map(langObj => langObj["TERMINAL_DISPLAY"])
      .filter(text => typeof text === "string");
    const val = langDisplays.find(text => 
      text.startsWith(exp) || exp.startsWith(text));
    const afterText = val && val.length <= exp.length && 
      exp.substring(val.length).trim();
    const afterOpenParenthesis = afterText && 
      afterText.substring(1).trim();
    if(exp) {
      // props.editing = true;
      // console.warn("something");
      // this.setColour("#f00");                 
    }
    if(!val) {
      alert("Check the spelling, case, and punctuation of what you're entering; it should identically match with " + T2C.MSG.currentLanguage["TERMINAL_DISPLAY"]);
      return null;
    }
    else if(afterText && afterText.length && !afterText.startsWith("(")) {
      alert("You're missing an opening parenthesis after " + val);
      return val;
    }
    else if(afterOpenParenthesis && !afterOpenParenthesis.startsWith('"') && !afterOpenParenthesis.startsWith("'")) {
      alert("Make sure the text you want to display is between \" and \" so the computer just displays it without trying to figure out what you mean!");
      return val + "(";
    } else {
      return exp;
    }
  },
  init: function() {
    this.appendDummyInput("STRING")
        .appendField(new Blockly.FieldTextInput("", this.validate), "EXP");
    this.setInputsInline(false);
    this.setOutput(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
    this.setTooltip(T2C.MSG.currentLanguage.TYPEIN_STATEMENT_TOOLTIP);
    this.onchange = e => {
      if(this.getFieldValue("EXP").endsWith("\r") || 
        this.getFieldValue("EXP").endsWith("\n") || (this.getFieldValue("EXP").length > 0 && e.element === "workspaceClick")) {
        if(!this.validate(this.getFieldValue("EXP"))) return;
        else {
          const parseTree = getParseTree(this.getFieldValue("EXP"));
          if(parseTree) {
            handleParseTreeToBlocks(parseTree, this);
          } else {
            alert("Try checking what you entered again for mistakes.");
          }
        }
      }
    };
    //this.onchange = parseAndConvertToBlocks.bind(this, props);
  },
  /*validate: function(colourHex) {
    console.warn("something");
    this.setColour("#f00");
  }*/
};

function getToolboxBlock(index) {
  return Array.from(document.querySelectorAll("rect"))
    .filter(x => x.getAttribute("fill-opacity"))[index]
}

window.addEventListener('DOMContentLoaded', () => {
  const workspace = Blockly.getMainWorkspace(); 
  workspace.clear();
  //workspace.options.horizontalLayout = true;
  workspace.options.maxInstances = {text_print: 1, text: 1, type_in_display_string_literal: 1};
  //workspace.options.maxBlocks = 2;
  //workspace.updateToolbox(document.getElementById("toolbox"));
  workspace.setScale(1);
  refreshWorkspace(workspace);

  const toolboxBlocks = Array.from(document.querySelectorAll("rect"))
    .filter(x => x.getAttribute("fill-opacity"))  
  const displayBlock = toolboxBlocks[0];
  const textBlock = toolboxBlocks[1];
  console.warn("TEXT", textBlock);
  const d = document.createElement("div");

  d.innerText = "👆";
  //d.id = "ptr";
  d.style.fontSize = "x-large";
  d.style.position = "absolute";
  d.style.zIndex = "40";
  document.getElementById("blockly-div").appendChild(d);

  const citf = new CourseInstructionTaskFlow();
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text_print" && Blockly.selected !== x),
      new GlideAnimation(d, {
        totalSteps: 50,
        startPosition: {
          x: displayBlock.x.baseVal.value + displayBlock.width.baseVal.value/2, 
          y: document.getElementById("top-header").offsetHeight + 
            displayBlock.y.baseVal.value + displayBlock.height.baseVal.value/2
        },
        velocity: {x: 0, y: 2}
      })
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text" && x.getParent() && x.getParent().type === "text_print"),
      new GlideAnimation(d, {
        totalSteps: 50,
        startPosition: {
          x: textBlock.x.baseVal.value + textBlock.width.baseVal.value/2,
          y: document.getElementById("top-header").offsetHeight + 
            textBlock.y.baseVal.value + displayBlock.height.baseVal.value/2 
        },
        endPosition: () => {
          const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text_print");
          const coords = textBlockWs.getBoundingRectangle();
          return {       
            x: coords.left + textBlockWs.width/2 + d.offsetWidth/4,
            y: document.getElementById("top-header").offsetHeight + 
              coords.top + 
              Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2 - d.offsetHeight/4
          }
        }
      })
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text" && x.getFieldValue("TEXT")),
      new SeriesAnimations([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.TYPE_SOMETHING, {
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text");
            const coords = textBlockWs.getBoundingRectangle();
            return {       
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 + d.offsetWidth,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2 + d.offsetHeight
            }
          }
        }),
        new BlinkAnimation(d, {
        totalSteps: 100,
        toggleSteps: 25,
        startPosition: () => {
          const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text");
          const coords = textBlockWs.getBoundingRectangle();
          return {       
            x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 - d.offsetWidth/4,
            y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2
          }
        }
      })])
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => document.getElementById("output-container").classList.contains("show-container"),
      new SeriesAnimations([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_RUN_CODE, {
          startPosition: {
            x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth,
            y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth/2,
            y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight/2
          }
        })
      ])
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("✔ Congratulations! You just created and ran your first program!");
          // SHOULD CALL EVENT LISTENER INSTEAD FOR NEXT 2 LINES
          document.getElementById("output-container").classList.remove("show-container");
          document.getElementById("output-container").classList.add("hide-container");
          const typeBlock = document.createElement("block");
          typeBlock.setAttribute("type", "type_in_display_string_literal");
          document.getElementById("toolbox").prepend(typeBlock);
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text_print" && 
        x.getNextBlock() && x.getNextBlock().type === "type_in_display_string_literal"),
      new GlideAnimation(d, {
        totalSteps: 150,
        startPosition: () => {
          const typeInDisplayStringLiteralBlock = getToolboxBlock(0);
          console.warn(typeInDisplayStringLiteralBlock)
          return {
            x: typeInDisplayStringLiteralBlock.x.baseVal.value + 
              typeInDisplayStringLiteralBlock.width.baseVal.value/2, 
            y: document.getElementById("top-header").offsetHeight + 
              displayBlock.y.baseVal.value + displayBlock.height.baseVal.value/2
          }
        },
        endPosition: () => {
          const textBlockWs = workspace.getAllBlocks().find(x => x.type === "text_print");
          const coords = textBlockWs.getBoundingRectangle();
          return {       
            x: coords.left + d.offsetWidth/4,
            y: document.getElementById("top-header").offsetHeight + 
              coords.top + 
              Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height
          }
        }
      })
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => workspace.getAllBlocks().find(x => x.type === "text_print" && x.getNextBlock() && 
        x.getNextBlock().type === "text_print" && x.getNextBlock().getInputTargetBlock("TEXT")
        && x.getNextBlock().getInputTargetBlock("TEXT").type === "text"),
      new SeriesAnimations([
        new HelpMessageDirection(() => "Type in code matching above block but with different text to display.  I.e., MATCH " + 
          T2C.MSG.currentLanguage["TEXT_PRINT_TITLE"].replace("%1", "\"your new message\"") + " exactly with parentheses, quotation marks, etc.", {
          startPosition: () => {
            const textBlockWs = workspace.getAllBlocks().find(x => x.type === "type_in_display_string_literal");
            const coords = textBlockWs.getBoundingRectangle();
            return {
              x: textBlockWs.getBoundingRectangle().left + textBlockWs.width/2 + d.offsetWidth,
              y: document.getElementById("top-header").offsetHeight + textBlockWs.getBoundingRectangle().top + Blockly.getMainWorkspace().getMetrics().flyoutHeight + textBlockWs.height/2 + d.offsetHeight
            }
          }
        }),
      new BlinkAnimation(d, {
        totalSteps: 200,
        toggleSteps: 50,
        startPosition: () => {
          const typeInBlock1 = workspace.getAllBlocks().find(x => x.type === "type_in_display_string_literal");
          const coords = typeInBlock1.getBoundingRectangle();
          return {       
            x: typeInBlock1.getBoundingRectangle().left,
            y: document.getElementById("top-header").offsetHeight + typeInBlock1.getBoundingRectangle().bottom + 
              Blockly.getMainWorkspace().getMetrics().flyoutHeight
          }
        }
      })])
    )
  );

  citf.addTask(
    new CourseInstructionTask(
      () => document.getElementById("output-container").classList.contains("show-container"),
      new SeriesAnimations([
        new HelpMessageDirection(() => T2C.MSG.currentLanguage.BUTTON_RUN_CODE, {
          startPosition: {
            x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth,
            y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight
          }
        }),
        new BlinkAnimation(d, {
          totalSteps: 100,
          toggleSteps: 25,
          startPosition: {
            x: document.getElementById("run-code-button").offsetLeft + document.getElementById("run-code-button").offsetWidth/2,
            y: document.getElementById("run-code-button").offsetTop + document.getElementById("run-code-button").offsetHeight/2
          }
        })
      ])
    )
  );
  citf.addTask(
    new CourseInstructionTask(
      () => true,
      {
        start: () => true,
        isComplete: () => true,
        animate: () => true,
        finish: () => {
          alert("✔ Awesome! You just typed code for and ran your first program!");
          // SHOULD CALL EVENT LISTENER INSTEAD FOR NEXT 2 LINES
          document.getElementById("output-container").classList.remove("show-container");
          document.getElementById("output-container").classList.add("hide-container");
          ["variables_get", "variables_set"].forEach(blockType => {
            const typeBlock = document.createElement("block");
            typeBlock.setAttribute("type", blockType);
            document.getElementById("toolbox").prepend(typeBlock);
          });
          workspace.updateToolbox(document.getElementById("toolbox"));
        }
      }
    )
  );

  citf.runTasks();
});