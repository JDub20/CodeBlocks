/**
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * http://code.google.com/p/blockly/
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
 * @fileoverview Generating Python for list blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

Blockly.Python = Blockly.Generator.get('Python');

Blockly.Python.lists_create_empty = function() {
  // Create an empty list.
  return ['[]', Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python.emptyListCode = Blockly.Python.lists_create_empty[0];

Blockly.Python.lists_create_with = function() {
  // Create a list with any number of elements of any type.
  var code = new Array(this.itemCount_);
  for (var n = 0; n < this.itemCount_; n++) {
    code[n] = Blockly.Python.valueToCode(this, 'ADD' + n,
        Blockly.Python.ORDER_NONE) || 'None';
  }
  code = '[' + code.join(', ') + ']';
  return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python.lists_repeat = function() {
  // Create a list with one element repeated.
  var argument0 = Blockly.Python.valueToCode(this, 'ITEM',
      Blockly.Python.ORDER_NONE) || 'None';
  var argument1 = Blockly.Python.valueToCode(this, 'NUM',
      Blockly.Python.ORDER_MULTIPLICATIVE) || '0';
  var code = '[' + argument0 + '] * ' + argument1;
  return [code, Blockly.Python.ORDER_MULTIPLICATIVE];
};

Blockly.Python.lists_length = function() {
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  code = "len(" + argument0 + ")";
  return [ code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python.lists_is_empty = function() {
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  code = " not len(" + argument0 + ")";
  return [ code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python.lists_indexOf = function() {
  // Searching a list for a value is NOT the same as search for a substring.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST',
      Blockly.Python.ORDER_NONE) || '[]';
  var argument1 = Blockly.Python.valueToCode(this, 'ITEM',
      Blockly.Python.ORDER_MEMBER) || '\'\'';
  var code;
  if (this.getTitleValue('END') == 'FIRST') {
    if (!Blockly.Python.definitions_['first_index']) {
      var functionName = Blockly.Python.variableDB_.getDistinctName(
          'first_index', Blockly.Generator.NAME_TYPE);
      Blockly.Python.lists_indexOf.first_index = functionName;
      var func = [];
      func.push('def ' + functionName + '(myList, elem):');
      func.push('  try: theIndex = myList.index(elem) + 1');
      func.push('  except: theIndex = 0');
      func.push('  return theIndex');
      Blockly.Python.definitions_['first_index'] = func.join('\n');
    }
    code = Blockly.Python.lists_indexOf.first_index + '(' +
        argument1 + ', ' + argument0 + ')';
    return [code, Blockly.Python.ORDER_MEMBER];
  }
  else {
    if (!Blockly.Python.definitions_['last_index']) {
      var functionName = Blockly.Python.variableDB_.getDistinctName(
          'last_index', Blockly.Generator.NAME_TYPE);
      Blockly.Python.lists_indexOf.last_index = functionName;
      var func = [];
      func.push('def ' + functionName + '(myList, elem):');
      func.push('  try: theIndex = len(myList) - myList[::-1].index(elem)');
      func.push('  except: theIndex = 0');
      func.push('  return theIndex');
      Blockly.Python.definitions_['last_index'] = func.join('\n');
    }
    code = Blockly.Python.lists_indexOf.last_index + '(' +
        argument1 + ', ' + argument0 + ')'; 
    return [code, Blockly.Python.ORDER_MEMBER];
  }
};

Blockly.Python.lists_position_in = function() {
   return Blockly.Python.lists_indexOf.call(this);

};

Blockly.Python.lists_getIndex = function() {
  // Indexing into a list is the same as indexing into a string.
  return Blockly.Python.text_charAt.call(this);
};

Blockly.Python.lists_setIndex = function() {
  // Set element at index.
  var argument0 = Blockly.Python.valueToCode(this, 'AT',
      Blockly.Python.ORDER_NONE) || '1';
  var argument1 = Blockly.Python.valueToCode(this, 'LIST',
      Blockly.Python.ORDER_MEMBER) || '[]';
  var argument2 = Blockly.Python.valueToCode(this, 'TO',
      Blockly.Python.ORDER_NONE) || 'None';
  // Blockly uses one-based indicies.
  if (argument0.match(/^-?\d+$/)) {
    // If the index is a naked number, decrement it right now.
    argument0 = parseInt(argument0, 10) - 1;
  } else {
    // If the index is dynamic, decrement it in code.
    argument0 += ' - 1';
  }
  var code = argument1 + '[' + argument0 + '] = ' + argument2 + '\n';
  return code;
};



Blockly.Python.lists_add_items = function() {
  // Add items to list.
  // TODO: (Andrew) Make this handle multiple items.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var argument1 = Blockly.Python.valueToCode(this, 'ITEM', Blockly.Python.ORDER_NONE) || 1;
  var code = argument0 + ".append("

  if (this.itemCount_ == 1) {
    code +=  Blockly.Python.valueToCode(this, 'ITEM0', Blockly.Python.ORDER_NONE) || "None";
    code += ")";
    return code;
  }

  else {
    code += "["

    for(var i=0;i<this.itemCount_;i++) {
      var argument = Blockly.Python.valueToCode(this, 'ITEM' + i, Blockly.Python.ORDER_NONE) || Blockly.Python.YAIL_FALSE;
      code += argument;

      //no the last item
      if (i < this.itemCount_ - 1) {
        code += ", ";
      }
    }

    code +="]";

    return code;
  }


};

Blockly.Python.lists_is_in = function() {
  // Is in list?.
  var argument0 = Blockly.Python.valueToCode(this, 'ITEM', Blockly.Python.ORDER_NONE) || "NONE";
  var argument1 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  code = argument0 + " in " + argument1;
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};


Blockly.Python.lists_pick_random_item = function() {
  // Pick random item
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  Blockly.Python.definitions_['import_random'] = 'import random';
  code = 'random.choice(' + argument0 + ')';
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.lists_select_item = function() {
  // Select from list an item.

  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var argument1 = Blockly.Python.valueToCode(this, 'NUM', Blockly.Python.ORDER_NONE) || 1;

  var code = argument0 + "[" + argument1 + "]"; 
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.lists_insert_item = function() {
  // Insert Item in list.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var argument1 = Blockly.Python.valueToCode(this, 'INDEX', Blockly.Python.ORDER_NONE) || 1;
  var argument2 = Blockly.Python.valueToCode(this, 'ITEM', Blockly.Python.ORDER_NONE) || Blockly.Python.YAIL_FALSE;
  var code = argument0 +".insert(" + argument1 + ", " + argument2 + ")";
  return code;
};

Blockly.Python.lists_replace_item = function() {
  // Replace Item in list.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var argument1 = Blockly.Python.valueToCode(this, 'NUM', Blockly.Python.ORDER_NONE) || 1;
  var argument2 = Blockly.Python.valueToCode(this, 'ITEM', Blockly.Python.ORDER_NONE) || Blockly.Python.YAIL_FALSE;
  var code = argument0 + "[" + argument1 + "] = " + argument2; 
  return code;
};

Blockly.Python.lists_remove_item = function() {
  // Remove Item in list.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var argument1 = Blockly.Python.valueToCode(this, 'INDEX', Blockly.Python.ORDER_NONE) || 1;
  var code =  argument0 + ".pop(" + argument1 +")"

  return code;
};

Blockly.Python.lists_append_list = function() {
  // Append to list.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST0', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var argument1 = Blockly.Python.valueToCode(this, 'LIST1', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var code = argument0 +".extend(" + argument1 + ")"
  return code;
};

Blockly.Python.lists_copy = function() {
  // Make a copy of list.
  var argument0 = Blockly.Python.valueToCode(this, 'LIST', Blockly.Python.ORDER_NONE) || Blockly.Python.emptyListCode;
  var code = "list(" + argument0 + ")";
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};


Blockly.Python.lists_is_list = function() {
  // Create an empty list.
  // TODO:(Andrew) test whether thing is var or text or number etc...
  var argument0 = Blockly.Python.valueToCode(this, 'ITEM', Blockly.Python.ORDER_NONE) || "False";
  var code = "type(" + argument0 + ") == list" 
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};