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
 * @fileoverview Generating Python for text blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

Blockly.Python = Blockly.Generator.get('Python');

Blockly.Python.text = function() {
  // Text value.
  var code = Blockly.Python.quote_(this.getTitleValue('TEXT'));
  return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python.text_join = function() {
  // Create a string made up of any number of elements of any type.
  //Should we allow joining by '-' or ',' or any other characters?
  var code;
  if (this.itemCount_ == 0) {
    return ['\'\'', Blockly.Python.ORDER_ATOMIC];
  } else if (this.itemCount_ == 1) {
    var argument0 = Blockly.Python.valueToCode(this, 'ADD0',
        Blockly.Python.ORDER_NONE) || '\'\'';
    code = 'str(' + argument0 + ')';
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  } else if (this.itemCount_ == 2) {
    var argument0 = Blockly.Python.valueToCode(this, 'ADD0',
        Blockly.Python.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.Python.valueToCode(this, 'ADD1',
        Blockly.Python.ORDER_NONE) || '\'\'';
    var code = 'str(' + argument0 + ') + str(' + argument1 + ')';
    return [code, Blockly.Python.ORDER_UNARY_SIGN];
  } else {
    var code = [];
    for (var n = 0; n < this.itemCount_; n++) {
      code[n] = Blockly.Python.valueToCode(this, 'ADD' + n,
          Blockly.Python.ORDER_NONE) || '\'\'';
    }
    var tempVar = Blockly.Python.variableDB_.getDistinctName('temp_value',
        Blockly.Variables.NAME_TYPE);
    code = '\'\'.join([str(' + tempVar + ') for ' + tempVar + ' in [' +
        code.join(', ') + ']])';
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  }
};

Blockly.Python.text_append = function() {
  // Append to a variable in place.
  var varName = Blockly.Python.variableDB_.getName(this.getTitleValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT',
      Blockly.Python.ORDER_NONE) || '\'\'';
  return varName + ' = str(' + varName + ') + str(' + argument0 + ')\n';
};

Blockly.Python.text_length = function() {
  // String length.
  var argument0 = Blockly.Python.valueToCode(this, 'VALUE',
      Blockly.Python.ORDER_NONE) || '\'\'';
  return ['len(' + argument0 + ')', Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python.text_isEmpty = function() {
  // Is the string null?
  var argument0 = Blockly.Python.valueToCode(this, 'VALUE',
      Blockly.Python.ORDER_NONE) || '\'\'';
  var code = 'not len(' + argument0 + ')';
  return [code, Blockly.Python.ORDER_LOGICAL_NOT];
};

Blockly.Python.text_endString = function() {
  // Return a leading or trailing substring.
  // Do we need to prevent 'List index out of range' ERROR by checking if
  // argument 0 > len(argument1)? Or will ALL error be handled systematically?
  var first = this.getTitleValue('END') == 'FIRST';
  var argument0 = Blockly.Python.valueToCode(this, 'NUM',
      Blockly.Python.ORDER_NONE) || '1';
  var argument1 = Blockly.Python.valueToCode(this, 'TEXT',
      Blockly.Python.ORDER_MEMBER) || '\'\'';
  var code = argument1 + '[' +
      (first ? ':' + argument0 : '-' + argument0 + ':') + ']';
  return [code, Blockly.Python.ORDER_MEMBER];
};

Blockly.Python.text_indexOf = function() {
  // Search the text for a substring.
  // Should we allow for non-case sensitive???
  var operator = this.getTitleValue('END') == 'FIRST' ? 'find' : 'rfind';
  var argument0 = Blockly.Python.valueToCode(this, 'FIND',
      Blockly.Python.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.Python.valueToCode(this, 'VALUE',
      Blockly.Python.ORDER_MEMBER) || '\'\'';
  var code = argument1 + '.' + operator + '(' + argument0 + ') + 1';
  return [code, Blockly.Python.ORDER_MEMBER];
};

Blockly.Python.text_starts_at = function() {
  // String starts at
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT', Blockly.Python.ORDER_NONE) || "\"\"";
  var argument1 = Blockly.Python.valueToCode(this, 'PIECE', Blockly.Python.ORDER_NONE) || "\"\"";
  var code = argument0 + ".find(" + argument1 + ")"
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.text_charAt = function() {
  // Get letter at index.
  var argument0 = Blockly.Python.valueToCode(this, 'AT',
      Blockly.Python.ORDER_NONE) || '1';
  var argument1 = Blockly.Python.valueToCode(this, 'VALUE',
      Blockly.Python.ORDER_MEMBER) || '\'\'';
  // Blockly uses one-based indicies.
  if (argument0.match(/^-?\d+$/)) {
    // If the index is a naked number, decrement it right now.
    argument0 = parseInt(argument0, 10) - 1;
  } else {
    // If the index is dynamic, decrement it in code.
    argument0 += ' - 1';
  }
  var code = argument1 + '[' + argument0 + ']';
  return [code, Blockly.Python.ORDER_MEMBER];
};

Blockly.Python.text_changeCase = function() {
  // Change capitalization.
  var mode = this.getTitleValue('OP');
  var operator = Blockly.Python.text_changeCase.OPERATORS[mode];
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT',
      Blockly.Python.ORDER_MEMBER) || '\'\'';
  var code = argument0 + operator;
  return [code, Blockly.Python.ORDER_MEMBER];
};

Blockly.Python.text_changeCase.OPERATORS = {
  UPCASE: '.upper()',
  DOWNCASE: '.lower()'
};

// Blockly.Python.text_trim = function() {
//   // Trim spaces.
//   var mode = this.getTitleValue('OP');
//   var operator = Blockly.Python.text_trim.OPERATORS[mode];
//   var argument0 = Blockly.Python.valueToCode(this, 'TEXT',
//       Blockly.Python.ORDER_MEMBER) || '\'\'';
//   var code = argument0 + operator;
//   return [code, Blockly.Python.ORDER_MEMBER];
// };

// Blockly.Python.text_trim.OPERATORS = {
//   LEFT: '.lstrip()',
//   RIGHT: '.rstrip()',
//   BOTH: '.strip()'
// };

Blockly.Python.text_print = function() {
  // Print statement.
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT',
      Blockly.Python.ORDER_NONE) || '\'\'';
  return 'print(' + argument0 + ')\n';
};

Blockly.Python.text_prompt = function() {
  // Prompt function.
  if (!Blockly.Python.definitions_['text_prompt']) {
    var functionName = Blockly.Python.variableDB_.getDistinctName(
        'text_prompt', Blockly.Generator.NAME_TYPE);
    Blockly.Python.text_prompt.text_prompt = functionName;
    var func = [];
    func.push('def ' + functionName + '(msg):');
    func.push('  try:');
    func.push('    return raw_input(msg)');
    func.push('  except NameError:');
    func.push('    return input(msg)');
    Blockly.Python.definitions_['text_prompt'] = func.join('\n');
  }
  var msg = Blockly.Python.quote_(this.getTitleValue('TEXT'));
  var code = Blockly.Python.text_prompt.text_prompt + '(' + msg + ')';
  var toNumber = this.getTitleValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'float(' + code + ')';
  }
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};


Blockly.Python.text_compare = function() {
  // Basic compare operators
  var mode = this.getTitleValue('OP');
  var prim = Blockly.Python.text_compare.OPERATORS[mode];
  var operator = prim[0];
  var order = prim[1];
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT1', order) || "\"\"";
  var argument1 = Blockly.Python.valueToCode(this, 'TEXT2', order) || "\"\"";
  var code = argument0 + operator + argument1
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.text_compare.OPERATORS = {
  LT: ['<', Blockly.Python.ORDER_NONE],
  GT: ['>', Blockly.Python.ORDER_NONE],
  EQUAL: ['==', Blockly.Python.ORDER_NONE]
}


Blockly.Python.text_trim = function() {
  // String trim
  var argument = Blockly.Python.valueToCode(this, 'TEXT', Blockly.Python.ORDER_NONE) || "\"\"";
  var code = argument + ".strip()"
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.text_contains = function() {
  // String contains.
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT', Blockly.Python.ORDER_NONE) || "\"\"";
  var argument1 = Blockly.Python.valueToCode(this, 'PIECE', Blockly.Python.ORDER_NONE) || "\"\"";
  var code = argument0 +" in " + argument1;
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.text_split_at_spaces = function() {
  // split at spaces
  var argument = Blockly.Python.valueToCode(this, 'TEXT', Blockly.Python.ORDER_NONE) || "\"\"";
  var code = argument + ".split()";
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.text_segment = function() {
  // Create string segment
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT', Blockly.Python.ORDER_NONE) || "\"\"";
  var argument1 = Blockly.Python.valueToCode(this, 'START', Blockly.Python.ORDER_NONE) || 1;
  var argument2 = Blockly.Python.valueToCode(this, 'LENGTH', Blockly.Python.ORDER_NONE) || 1;
  var code = argument0 +"[" + argument1 + ":" + argument2 + "]"
  return [ code, Blockly.Python.ORDER_ATOMIC ]; 
};

Blockly.Python.text_replace_all = function() {
  // String replace with segment
  var argument0 = Blockly.Python.valueToCode(this, 'TEXT', Blockly.Python.ORDER_NONE) || "\"\"";
  var argument1 = Blockly.Python.valueToCode(this, 'SEGMENT', Blockly.Python.ORDER_NONE) || "\"\"";
  var argument2 = Blockly.Python.valueToCode(this, 'REPLACEMENT', Blockly.Python.ORDER_NONE) || "\"\"";
  var code = argument0 + ".replace(" + argument1 + ", " + argument2 + ")"
  return [ code, Blockly.Python.ORDER_ATOMIC ];
};