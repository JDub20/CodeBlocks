/**
 * Visual Blocks Editor
 *
 * Copyright 2011 Google Inc.
 * http://blockly.googlecode.com/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Core JavaScript library for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

// Top level object for Blockly.
goog.provide('Blockly');

// Closure dependencies.
goog.require('goog.dom');
goog.require('goog.color');
goog.require('goog.events');
goog.require('goog.string');
goog.require('goog.ui.ColorPicker');
goog.require('goog.ui.tree.TreeControl');
goog.require('goog.userAgent');

// Blockly core dependencies.
goog.require('Blockly.Block');
goog.require('Blockly.Connection');
goog.require('Blockly.Generator');
goog.require('Blockly.inject');
goog.require('Blockly.FieldCheckbox');
goog.require('Blockly.FieldColour');
goog.require('Blockly.FieldDropdown');
goog.require('Blockly.FieldImage');
goog.require('Blockly.FieldTextInput');
goog.require('Blockly.FieldVariable');
goog.require('Blockly.Procedures');
//goog.require('Blockly.Toolbox');
goog.require('Blockly.utils');
goog.require('Blockly.Workspace');


/**
 * Path to Blockly's directory.  Can be relative, absolute, or remote.
 * Used for loading additional resources.
 */
Blockly.pathToBlockly = './';

/**
 * Required name space for SVG elements.
 * @const
 */
Blockly.SVG_NS = 'http://www.w3.org/2000/svg';
/**
 * Required name space for HTML elements.
 * @const
 */
Blockly.HTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * The richness of block colours, regardless of the hue.
 * Must be in the range of 0 (inclusive) to 1 (exclusive).
 */
Blockly.HSV_SATURATION = 0.45;
/**
 * The intensity of block colours, regardless of the hue.
 * Must be in the range of 0 (inclusive) to 1 (exclusive).
 */
Blockly.HSV_VALUE = 0.65;

/**
 * Convert a hue (HSV model) into an RGB hex triplet.
 * @param {number} hue Hue on a colour wheel (0-360).
 * @return {string} RGB code, e.g. '#5ba65b'.
 */
Blockly.makeColour = function(hue) {
  return goog.color.hsvToHex(hue, Blockly.HSV_SATURATION,
      Blockly.HSV_VALUE * 256);
};

/**
 * ENUM for a right-facing value input.  E.g. 'test' or 'return'.
 * @const
 */
Blockly.INPUT_VALUE = 1;
/**
 * ENUM for a left-facing value output.  E.g. 'call random'.
 * @const
 */
Blockly.OUTPUT_VALUE = 2;
/**
 * ENUM for a down-facing block stack.  E.g. 'then-do' or 'else-do'.
 * @const
 */
Blockly.NEXT_STATEMENT = 3;
/**
 * ENUM for an up-facing block stack.  E.g. 'close screen'.
 * @const
 */
Blockly.PREVIOUS_STATEMENT = 4;
/**
 * ENUM for an dummy input.  Used to add title(s) with no input.
 * @const
 */
Blockly.DUMMY_INPUT = 5;

/**
 * ENUM for left alignment.
 * @const
 */
Blockly.ALIGN_LEFT = -1;
/**
 * ENUM for centre alignment.
 * @const
 */
Blockly.ALIGN_CENTRE = 0;
/**
 * ENUM for right alignment.
 * @const
 */
Blockly.ALIGN_RIGHT = 1;

/**
 * Lookup table for determining the opposite type of a connection.
 * @const
 */
Blockly.OPPOSITE_TYPE = [];
Blockly.OPPOSITE_TYPE[Blockly.INPUT_VALUE] = Blockly.OUTPUT_VALUE;
Blockly.OPPOSITE_TYPE[Blockly.OUTPUT_VALUE] = Blockly.INPUT_VALUE;
Blockly.OPPOSITE_TYPE[Blockly.NEXT_STATEMENT] = Blockly.PREVIOUS_STATEMENT;
Blockly.OPPOSITE_TYPE[Blockly.PREVIOUS_STATEMENT] = Blockly.NEXT_STATEMENT;

/**
 * Database of pre-loaded sounds.
 * @private
 * @const
 */
Blockly.SOUNDS_ = {};

/**
 * Currently selected block.
 * @type {Blockly.Block}
 */
Blockly.selected = null;

/**
 * In the future we might want to have display-only block views.
 * Until then, all blocks are considered editable.
 * Note that this property may only be set before init is called.
 * It can't be used to dynamically toggle editability on and off.
 */
Blockly.editable = true;

/**
 * Currently highlighted connection (during a drag).
 * @type {Blockly.Connection}
 * @private
 */
Blockly.highlightedConnection_ = null;

/**
 * Connection on dragged block that matches the highlighted connection.
 * @type {Blockly.Connection}
 * @private
 */
Blockly.localConnection_ = null;

/**
 * Number of pixels the mouse must move before a drag starts.
 * @const
 */
Blockly.DRAG_RADIUS = 5;

/**
 * Maximum misalignment between connections for them to snap together.
 * @const
 */
Blockly.SNAP_RADIUS = 12;

/**
 * Delay in ms between trigger and bumping unconnected block out of alignment.
 * @const
 */
Blockly.BUMP_DELAY = 250;

/**
 * The main workspace (defined by inject.js).
 * @type {Blockly.Workspace}
 */
Blockly.mainWorkspace = null;

/**
 * Contents of the local clipboard.
 * @type {Element}
 * @private
 */
Blockly.clipboard_ = null;

/**
 * Returns the dimensions of the current SVG image.
 * @return {!Object} Contains width, height, top and left properties.
 */
Blockly.svgSize = function() {
  return {width: Blockly.svg.cachedWidth_,
          height: Blockly.svg.cachedHeight_,
          top: Blockly.svg.cachedTop_,
          left: Blockly.svg.cachedLeft_};
};

/**
 * Size the SVG image to completely fill its container.  Record both
 * the height/width and the absolute position of the SVG image.
 */
Blockly.svgResize = function() {
  var svg = Blockly.svg;
  var div = svg.parentNode;
  var width = div.offsetWidth;
  var height = div.offsetHeight;
  if (svg.cachedWidth_ != width) {
    svg.setAttribute('width', width + 'px');
    svg.cachedWidth_ = width;
  }
  if (svg.cachedHeight_ != height) {
    svg.setAttribute('height', height + 'px');
    svg.cachedHeight_ = height;
  }
  // Can't use Blockly.svg.getBoundingClientRect() due to bugs in Firefox.
  // Can't use Blockly.svg.offsetLeft due to bugs in Firefox.
  svg.cachedLeft_ = 0;
  svg.cachedTop_ = 0;
  while (div) {
    svg.cachedLeft_ += div.offsetLeft;
    svg.cachedTop_ += div.offsetTop;
    div = div.offsetParent;
  }
};

/**
 * Handle a mouse-down on SVG drawing surface.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.onMouseDown_ = function(e) {
  Blockly.Block.terminateDrag_(); // In case mouse-up event was lost.
  Blockly.hideChaff();
  if(Blockly.Drawer && Blockly.Drawer.flyout_.autoClose) {
    Blockly.Drawer.hide()
  }
  var isTargetSvg = e.target && e.target.nodeName &&
      e.target.nodeName.toLowerCase() == 'svg';
  if (Blockly.selected && isTargetSvg) {
    // Clicking on the document clears the selection.
    Blockly.selected.unselect();
  }
  if (Blockly.isRightButton(e)) {
    // Right-click.
    if (Blockly.ContextMenu) {
      Blockly.showContextMenu_(e.clientX, e.clientY);
    }
  } else if ((!Blockly.editable || isTargetSvg) &&
             Blockly.mainWorkspace.scrollbar) {
    // If the workspace is editable, only allow dragging when gripping empty
    // space.  Otherwise, allow dragging when gripping anywhere.
    Blockly.mainWorkspace.dragMode = true;
    // Record the current mouse position.
    Blockly.mainWorkspace.startDragMouseX = e.clientX;
    Blockly.mainWorkspace.startDragMouseY = e.clientY;
    Blockly.mainWorkspace.startDragMetrics =
        Blockly.getMainWorkspaceMetrics();
    Blockly.mainWorkspace.startScrollX = Blockly.mainWorkspace.scrollX;
    Blockly.mainWorkspace.startScrollY = Blockly.mainWorkspace.scrollY;
  }
};

/**
 * Handle a mouse-up on SVG drawing surface.
 * @param {!Event} e Mouse up event.
 * @private
 */
Blockly.onMouseUp_ = function(e) {
  Blockly.setCursorHand_(false);
  Blockly.mainWorkspace.dragMode = false;
};

/**
 * Handle a mouse-move on SVG drawing surface.
 * @param {!Event} e Mouse move event.
 * @private
 */
Blockly.onMouseMove_ = function(e) {
  if (Blockly.mainWorkspace.dragMode) {
    Blockly.removeAllRanges();
    var dx = e.clientX - Blockly.mainWorkspace.startDragMouseX;
    var dy = e.clientY - Blockly.mainWorkspace.startDragMouseY;
    var metrics = Blockly.mainWorkspace.startDragMetrics;
    var x = Blockly.mainWorkspace.startScrollX + dx;
    var y = Blockly.mainWorkspace.startScrollY + dy;
    x = Math.min(x, -metrics.contentLeft);
    y = Math.min(y, -metrics.contentTop);
    x = Math.max(x, metrics.viewWidth - metrics.contentLeft -
                 metrics.contentWidth);
    y = Math.max(y, metrics.viewHeight - metrics.contentTop -
                 metrics.contentHeight);

    // Move the scrollbars and the page will scroll automatically.
    Blockly.mainWorkspace.scrollbar.set(-x - metrics.contentLeft,
                                        -y - metrics.contentTop);
  }
};

/**
 * Handle a key-down on SVG drawing surface.
 * @param {!Event} e Key down event.
 * @private
 */
Blockly.onKeyDown_ = function(e) {
  if (Blockly.isTargetInput_(e)) {
    // When focused on an HTML text input widget, don't trap any keys.
    return;
  }
  // TODO: Add keyboard support for cursoring around the context menu.
  if (e.keyCode == 27) {
    // Pressing esc closes the context menu.
    Blockly.hideChaff();
  } else if (e.keyCode == 8 || e.keyCode == 46) {
    // Delete or backspace.
    if (Blockly.selected && Blockly.selected.deletable) {
      Blockly.hideChaff();
      Blockly.selected.dispose(true, true);
    }
    // Stop the browser from going back to the previous page.
    e.preventDefault();
  } else if (e.altKey || e.ctrlKey || e.metaKey) {
    if (Blockly.selected && Blockly.selected.deletable &&
        Blockly.selected.workspace == Blockly.mainWorkspace) {
      Blockly.hideChaff();
      if (e.keyCode == 67) {
        // 'c' for copy.
        Blockly.copy_(Blockly.selected);
      } else if (e.keyCode == 88) {
        // 'x' for cut.
        Blockly.copy_(Blockly.selected);
        Blockly.selected.dispose(true, true);
      }
    }
    if (e.keyCode == 86) {
      // 'v' for paste.
      if (Blockly.clipboard_) {
        Blockly.mainWorkspace.paste(Blockly.clipboard_);
      }
    }
  }
};

/**
 * Copy a block onto the local clipboard.
 * @param {!Blockly.Block} block Block to be copied.
 * @private
 */
Blockly.copy_ = function(block) {
  var xmlBlock = Blockly.Xml.blockToDom_(block);
  Blockly.Xml.deleteNext(xmlBlock);
  // Encode start position in XML.
  var xy = block.getRelativeToSurfaceXY();
  xmlBlock.setAttribute('x', Blockly.RTL ? -xy.x : xy.x);
  xmlBlock.setAttribute('y', xy.y);
  Blockly.clipboard_ = xmlBlock;
};

/**
 * Show the context menu for the workspace.
 * @param {number} x X-coordinate of mouse click.
 * @param {number} y Y-coordinate of mouse click.
 * @private
 */
Blockly.showContextMenu_ = function(x, y) {
  var options = [];

  // Option to get help.
  var helpOption = {enabled: false};
  helpOption.text = Blockly.MSG_HELP;
  helpOption.callback = function() {};
  options.push(helpOption);


  // Option to get python.
  function runit(text)
  {
      try {
          var info = Sk.importMainWithBody("<stdin>", false, text);
          var module = info["module"];
          var xml = info["xml"];
		  xmlStringToBlocks(xml);
          // xmlStringToWorkspace(xml);

      } catch (e) {
          alert(e);
      }
  }
  
  var xmlStringToBlocks = function(xmlString) {
	  var split = xmlString.split("</block><block");
	  var oParser = new DOMParser();
	  var length = split.length;
	  var dom;
	  for (var i = 0;i < split.length; i++) {
		  if (i + 1 < length) split[i] += "</block>";
		  if (i > 0) split[i] = "<block" + split[i];
		  split[i] = "<xml>" + split[i] + "</xml>";
		  dom = oParser.parseFromString(split[i], 'text/xml');
		  blockXmls = dom.firstChild.childNodes;
		  Blockly.Xml.domToBlock_(Blockly.mainWorkspace, blockXmls[0]);
	  }
      // 	  
      // 
      // 
      // 
      // for (var i = blockXmls.length - 1; i >= 0; i--) {
      //   
      // };
  }
	// var instancesToCode = function() {
	//   var code = '';
	//   var components = { 
	// 	  'Button1' : { 'typeName' : 'Button' }, 
	// 	  'Clock1' : { 'typeName' : 'Clock'},
	// 	  'TextBox1' : { 'typeName' : 'TextBox'},
	// 	  'Canvas1' : { 'typeName' : 'Canvas'}
	//   };
	//   for (var componentName in components) {
	// 	  code += componentName + ' = ' + 
	// 	  components[componentName].typeName + '()\n'
	//   }
	// 
	//   console.log("INSTANCES");
	//   console.log(code);
	// 
	//   return code;
	//   	}
	var CodeGenerator = function () {	  
	  	var codeForButtonComponent = function() {
	  	  var code = '';
	  	  var ret = '\t\treturn\n';
	  	  code += 'class Button:\n' + 
	  	  '\tdef __init__(self):\n' + 
	  	  '\t\tself.BackgroundColor = "clear"\n' +
	  	  '\tdef Click(self):\n' + 
	  	  ret +
	  	  '\tdef LongClick(self):\n' +
	  	  ret +
	  	  '\tdef GotFocus(self):\n' + 
	  	  ret +
	  	  '\tdef LostFocus(self):\n' +
	  	  ret;
  
	  	  return code;
	  	}
	
	  	var codeForTextBoxComponent = function() {
	  		var code = '';
	  		var t = '\t'
	  		var t2 = t + t;
	  		var n = '\n'
	  		var ret = t2 + 'return' + n;
	  		var atEvent = t + '@event' + n;
	  		var atProperty = t + '@property' + n;  
	  		var atNoReturn = t + '@no_return' + n;
	  		var init = t + 'def __init__(self):' + n;
	  		code += 'class TextBox(object):' + n +
	  		init +
	  		t2 + 'self.BackgrounColor = "clear"' + n +
	  		atEvent + 
	  		t + 'def GotFocus(self):' + n +
	  		ret +
	  		atEvent + 
	  		t + 'def LostFocus(self):' + n +
	  		ret + 
	  		atProperty + atNoReturn +
	  		t + 'def HideKeyboard(self):' + n +
	  		ret;
		
	  		return code;
	  	}
	
	  	var codeForClockComponent = function() {
	  		var code = '';
	  		var ret = '\t\treturn\n';
	  		code += 'class Clock(object):\n' +
	  		'\tdef __init__(self):\n' +
	  		'\t\tself.TimerAlwaysFires = True\n' +
	  		'\t@property\n' + 
	  		'\tdef AddDays(self, instant, days):\n' + 
	  		ret
	  		'\t@property\n' + 
	  		'\tdef AddHours(self, instant, hours):\n' + 
	  		ret
	  		'\t@property\n' + 
	  		'\tdef AddMinutes(self, instant, minutes):\n' + 
	  		ret
	  		'\t@property\n' + 
	  		'\tdef AddMonths(self, instant, months):\n' + 
	  		ret
	  		'\t@property\n' + 
	  		'\tdef AddSeconds(self, instant, seconds):\n' + 
	  		ret
	  		'\t@property\n' + 
	  		'\tdef AddWeeks(self, instant, weeks):\n' + 
	  		ret
	  		'\t@property\n' + 
	  		'\tdef AddYears(self, instant, years):\n' + 
	  		ret;
		
	  		return code;
	  	}
	
	  	var codeForCanvasComponent = function() {
	  		var code = '';
	  		var t = '\t';
	  		var t2 = t + t;
	  		var n = '\n'
	  		var ret = t2 + 'return' + n;
	  		var atEvent = t + '@event' + n;
	  		var atProperty = t + '@property' + n;  
	  		var atNoReturn = t + '@no_return' + n;
	  		var init = t + 'def __init__(self):' + n;
	  		var t = '\t'
	  		var n = '\n'
	  		code += 'class Canvas(object):\n' +
	  		init + 
	  		t2 + 'self.BackgroundColor = "clear"' + n + 
	  		atEvent + 
	  		t + 'def Dragged(self, startX, startY, prevX, prevY, currentX, currentY, draggedSprite):' + n +
	  		ret +
	  		atEvent + 
	  		t + 'def Flung(self, x, y, speed, heading, xvel, yvel, flungSprite):' + n +
	  		ret +
	  		atEvent + 
	  		t + 'def TouchDown(self, x, y):' + n +
	  		ret +
	  		atEvent + 
	  		t + 'def TouchUp(self, x, y):' + n +
	  		ret +
	  		atEvent + 
	  		t + 'def Touched(self, x, y):' + n +
	  		ret +
	  		atProperty + atNoReturn + 
	  		t + 'def Clear(self):' + n + 
	  		ret +
	  		atProperty + atNoReturn + 
	  		t + 'def DrawCircle(self, x, y, r):' + n + 
	  		ret + 
	  		atProperty + atNoReturn + 
	  		t + 'def DrawLine(self, x, y, r):' + n + 
	  		ret +
	  		atProperty + atNoReturn + 
	  		t + 'def DrawPoint(self, x, y):' + n + 
	  		ret +
	  		atProperty + atNoReturn + 
	  		t + 'def DrawText(self, text, x, y):' + n + 
	  		ret +
	  		atProperty + atNoReturn + 
	  		t + 'def DrawTextAtAngle(self, text, x, y, angle):' + n + 
	  		ret +
	  		atProperty + 
	  		t + 'def GetBackgroundPixelColor(self, x, y):' + n + 
	  		ret +
	  		atProperty + 
	  		t + 'def GetPixelColor(self, x, y):' + n + 
	  		ret +
	  		atProperty + 
	  		t + 'def Save(self):' + n + 
	  		ret +
	  		atProperty + 
	  		t + 'def SaveAs(self, fileName):' + n + 
	  		ret +
	  		atProperty + atNoReturn + 
	  		t + 'def SetBackgroundPixelColor(self, x, y, color):' + n + 
	  		ret;
		
	  		return code;
	  	}
		
		var codeForTypes = {};
		codeForTypes['Button'] = codeForButtonComponent();
		codeForTypes['Clock'] = codeForClockComponent();
		codeForTypes['TextBox'] = codeForTextBoxComponent();
		codeForTypes['Canvas'] = codeForCanvasComponent();

		var instancesToCode = function() {
			  var code = '';
			  for (var componentName in Blockly.ComponentInstances) {
				  if (codeForTypes.hasOwnProperty(Blockly.ComponentInstances[componentName].typeName)) {
					  code += componentName + ' = ' + 
					  Blockly.ComponentInstances[componentName].typeName + '()\n';
				  }
			  }
  
			  console.log("INSTANCES");
			  console.log(code);
  
			  return code;
		}
	  //   
	  var classesToCode = function() {
	  	  var code = '';
		  var testCode;
	  	  for (var type in Blockly.ComponentTypes) {
			  if (codeForTypes.hasOwnProperty(type)) { code += codeForTypes[type]; }
	  	  }
  	  
	  	  console.log("CLASSES");
	  	  console.log(code);
  	  
	  	  return code;
	  }	

	    this.generate = function() {
	    	  var code = '';	  
	    	  code += classesToCode();
	    	  code += instancesToCode();
  	  
	    	  console.log("HISTORY");
	    	  console.log(code);
  	  
	    	  return code;
	    }
	}
	
  
	
  // 

  // 
  // var codeForButtonComponent = function() {
  // 	  var code = '';
  // 	  var ret = '\t\treturn\n';
  // 	  code += 'class Button:\n' + 
  // 	  '\tdef __init__(self):\n' + 
  // 	  '\t\tself.BackgroundColor = "clear"\n' +
  // 	  '\tdef Click(self):\n' + 
  // 	  ret +
  // 	  '\tdef LongClick(self):\n' +
  // 	  ret +
  // 	  '\tdef GotFocus(self):\n' + 
  // 	  ret +
  // 	  '\tdef LostFocus(self):\n' +
  // 	  ret;
  // 	  
  // 	  return code;
  // }
  // 
  
	//   var button = 
	//   	'class Button:
	//    		def __init__(self):
	//         	self.BackgroundColor = "clear"
	//     
	//     	def Click(self):
	//         	return
	//         
	//     	def LongClick(self):
	//         	return
	//     
	//     	def GotFocus(self):
	//         	return
	//     
	//     	def LostFocus(self):
	//         	return
	// '
	var generator = new CodeGenerator();
  
  $( "#dialog-modal" ).dialog({
    width: 600,
    height: 400,
    autoOpen: false,
    resizable: false,
    modal: true,
    title: "Python Code",
    buttons: [{
      text: "To Block",
      click: function() { 
        $(this).dialog("close");
        console.log($(this).find("textarea").val());
		console.log("DIALOG");
		// console.log(getCodeHistory());
		var code = generator.generate();
		console.log("I hope this works");
		console.log(code);
        runit(code + $(this).find("textarea").val());
      
      }
    }],
    open: function(event, ui) {
      var textarea = $('<textarea style="height: 100%; width: 100%"; resize: none; >');
      $(this).html(textarea);
    }
  });

  var xmlStringToWorkspace = function (xmlString) {
    if (xmlString != null) {
      xmlStringMod = "<xml>" + xmlString + "</xml>";
      var oParser = new DOMParser();
      var dom = oParser.parseFromString(xmlStringMod, 'text/xml');
      blockXmls = dom.firstChild.childNodes;
      for (var i = blockXmls.length - 1; i >= 0; i--) {
        Blockly.Xml.domToBlock_(Blockly.mainWorkspace, blockXmls[i]);
      };
    }
  }

  var pythonOption = {enabled: true };
  pythonOption.text = "Python Code to Block";
  pythonOption.callback = function() {
    $( "#dialog-modal" ).dialog("open");
  };
  options.push(pythonOption);

  // Option to get xml to block
  var xmlOption = {enabled: true};
  xmlOption.text = "Xml String to Block";


  xmlOption.callback = function() {
    var xmlString = prompt("Please enter code Here",
      '<block type="lists_create_with" inline="false"><mutation items="2"></mutation><value name="ADD0"><block type="text"><title name="TEXT">sdfsdf</title></block></value><value name="ADD1"><block type="math_number"><title name="NUM">0</title></block></value></block>'
      );
    xmlStringToBlocks(xmlString);

  };

  options.push(xmlOption);

  Blockly.ContextMenu.show(x, y, options);
};

/**
 * Cancel the native context menu, unless the focus is on an HTML input widget.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.onContextMenu_ = function(e) {
  if (!Blockly.isTargetInput_(e) && Blockly.ContextMenu) {
    // When focused on an HTML text input widget, don't cancel the context menu.
    e.preventDefault();
  }
};

/**
 * Close tooltips, context menus, dropdown selections, etc.
 * @param {boolean=} opt_allowToolbox If true, don't close the toolbox.
 */
Blockly.hideChaff = function(opt_allowToolbox) {
  Blockly.Tooltip && Blockly.Tooltip.hide();
  Blockly.ContextMenu && Blockly.ContextMenu.hide();
  Blockly.FieldDropdown && Blockly.FieldDropdown.hide();
  Blockly.FieldColour && Blockly.FieldColour.hide();
  if (Blockly.Toolbox && !opt_allowToolbox &&
      Blockly.Toolbox.flyout_.autoClose) {
    Blockly.Toolbox.clearSelection();
  }
};

/**
 * Deselect any selections on the webpage.
 * Chrome will select text outside the SVG when double-clicking.
 * Deselect this text, so that it doesn't mess up any subsequent drag.
 */
Blockly.removeAllRanges = function() {
  if (window.getSelection) {  // W3
    var sel = window.getSelection();
    if (sel && sel.removeAllRanges) {
      sel.removeAllRanges();
      window.setTimeout(function() {
          window.getSelection().removeAllRanges();
        }, 0);
    }
  }
};

/**
 * Is this event targeting a text input widget?
 * @param {!Event} e An event.
 * @return {boolean} True if text input.
 * @private
 */
Blockly.isTargetInput_ = function(e) {
  return e.target.type == 'textarea' || e.target.type == 'text';
};

/**
 * Load an audio file.  Cache it, ready for instantaneous playing.
 * @param {string} filename Path and filename from Blockly's root.
 * @param {string} name Name of sound.
 * @private
 */
Blockly.loadAudio_ = function(filename, name) {
  if (!window.Audio) {
    // No browser support for Audio.
    return;
  }
  var sound = new window.Audio(Blockly.pathToBlockly + filename);
  // To force the browser to load the sound, play it, but at nearly zero volume.
  if (sound && sound.play) {
    sound.play();
    sound.volume = 0.01;
    Blockly.SOUNDS_[name] = sound;
  }
};

/**
 * Play an audio file at specified value.  If volume is not specified,
 * use full volume (1).
 * @param {string} name Name of sound.
 * @param {?number} opt_volume Volume of sound (0-1).
 */
Blockly.playAudio = function(name, opt_volume) {
  var sound = Blockly.SOUNDS_[name];
  if (sound) {
    var mySound = sound.cloneNode();
    mySound.volume = (opt_volume === undefined ? 1 : opt_volume);
    mySound.play();
  }
};

/**
 * Set the mouse cursor to be either a closed hand or the default.
 * @param {boolean} closed True for closed hand.
 * @private
 */
Blockly.setCursorHand_ = function(closed) {
  if (!Blockly.editable) {
    return;
  }
  /* Hotspot coordinates are baked into the CUR file, but they are still
     required due to a Chrome bug.
     http://code.google.com/p/chromium/issues/detail?id=1446 */
  var cursor = '';
  if (closed) {
    cursor = 'url(' + Blockly.pathToBlockly + 'media/handclosed.cur) 7 3, auto';
  }
  if (Blockly.selected) {
    Blockly.selected.getSvgRoot().style.cursor = cursor;
  }
  // Set cursor on the SVG surface as well as block so that rapid movements
  // don't result in cursor changing to an arrow momentarily.
  document.getElementsByTagName('svg')[0].style.cursor = cursor;
};

/**
 * Return an object with all the metrics required to size scrollbars for the
 * main workspace.  The following properties are computed:
 * .viewHeight: Height of the visible rectangle,
 * .viewWidth: Width of the visible rectangle,
 * .contentHeight: Height of the contents,
 * .contentWidth: Width of the content,
 * .viewTop: Offset of top edge of visible rectangle from parent,
 * .viewLeft: Offset of left edge of visible rectangle from parent,
 * .contentTop: Offset of the top-most content from the y=0 coordinate,
 * .contentLeft: Offset of the left-most content from the x=0 coordinate.
 * .absoluteTop: Top-edge of view.
 * .absoluteLeft: Left-edge of view.
 * @return {Object} Contains size and position metrics of main workspace.
 */
Blockly.getMainWorkspaceMetrics = function() {
  var hwView = Blockly.svgSize();
  if (Blockly.Toolbox) {
    hwView.width -= Blockly.Toolbox.width;
  }
  var viewWidth = hwView.width - Blockly.Scrollbar.scrollbarThickness;
  var viewHeight = hwView.height - Blockly.Scrollbar.scrollbarThickness;
  try {
    var blockBox = Blockly.mainWorkspace.getCanvas().getBBox();
  } catch (e) {
    // Firefox has trouble with hidden elements (Bug 528969).
    return null;
  }
  if (blockBox.width == -Infinity && blockBox.height == -Infinity) {
    // Opera has trouble with bounding boxes around empty objects.
    blockBox = {width: 0, height: 0, x: 0, y: 0};
  }
  // Add a border around the content that is at least half a screenful wide.
  var leftEdge = Math.min(blockBox.x - viewWidth / 2,
                          blockBox.x + blockBox.width - viewWidth);
  var rightEdge = Math.max(blockBox.x + blockBox.width + viewWidth / 2,
                           blockBox.x + viewWidth);
  var topEdge = Math.min(blockBox.y - viewHeight / 2,
                         blockBox.y + blockBox.height - viewHeight);
  var bottomEdge = Math.max(blockBox.y + blockBox.height + viewHeight / 2,
                            blockBox.y + viewHeight);
  var absoluteLeft = 0;
  if (Blockly.Toolbox && !Blockly.RTL) {
    absoluteLeft = Blockly.Toolbox.width;
  }
  return {
    viewHeight: hwView.height,
    viewWidth: hwView.width,
    contentHeight: bottomEdge - topEdge,
    contentWidth: rightEdge - leftEdge,
    viewTop: -Blockly.mainWorkspace.scrollY,
    viewLeft: -Blockly.mainWorkspace.scrollX,
    contentTop: topEdge,
    contentLeft: leftEdge,
    absoluteTop: 0,
    absoluteLeft: absoluteLeft
  };
};

/**
 * Sets the X/Y translations of the main workspace to match the scrollbars.
 * @param {!Object} xyRatio Contains an x and/or y property which is a float
 *     between 0 and 1 specifying the degree of scrolling.
 */
Blockly.setMainWorkspaceMetrics = function(xyRatio) {
  var metrics = Blockly.getMainWorkspaceMetrics();
  if (goog.isNumber(xyRatio.x)) {
    Blockly.mainWorkspace.scrollX = -metrics.contentWidth * xyRatio.x -
        metrics.contentLeft;
  }
  if (goog.isNumber(xyRatio.y)) {
    Blockly.mainWorkspace.scrollY = -metrics.contentHeight * xyRatio.y -
        metrics.contentTop;
  }
  var translation = 'translate(' +
      (Blockly.mainWorkspace.scrollX + metrics.absoluteLeft) + ',' +
      (Blockly.mainWorkspace.scrollY + metrics.absoluteTop) + ')';
  Blockly.mainWorkspace.getCanvas().setAttribute('transform', translation);
  Blockly.mainWorkspace.getBubbleCanvas().setAttribute('transform',
                                                       translation);
};

/**
 * When something in Blockly's workspace changes, call a function.
 * @param {!Function} func Function to call.
 * @return {!Array.<!Array>} Opaque data that can be passed to
 *     removeChangeListener.
 */
Blockly.addChangeListener = function(func) {
  return Blockly.bindEvent_(Blockly.mainWorkspace.getCanvas(),
                            'blocklyWorkspaceChange', null, func);
};

/**
 * Stop listening for Blockly's workspace changes.
 * @param {!Array.<!Array>} bindData Opaque data from addChangeListener.
 */
Blockly.removeChangeListener = function(bindData) {
  Blockly.unbindEvent_(bindData);
};
