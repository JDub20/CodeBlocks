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
 * @fileoverview Generating Python for variable blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

Blockly.Python = Blockly.Generator.get('Python');

Blockly.Python.variables_get = function() {
  // Variable getter.
  var code = Blockly.Python.variableDB_.getName(this.getTitleValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python.variables_set = function() {
  // Variable setter.
  var argument0 = Blockly.Python.valueToCode(this, 'VALUE',
      Blockly.Python.ORDER_NONE) || '0';
  var varName = Blockly.Python.variableDB_.getName(this.getTitleValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + '\n';
};

// Global variable definition block
Blockly.Python.global_declaration = function() {
  // var varName = this.getTitleValue('NAME');
  var varName = Blockly.Python.variableDB_.getName("global " + this.getTitleValue('NAME'),
      Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.Python.valueToCode(this, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  var code = varName + " = " + argument0;
  return code;
};


Blockly.Python.lexical_variable_get = function () {
  var name = this.getTitleValue('VAR');
  var pair = Blockly.unprefixName(name);
  var unprefixedName = pair[1];
  var code =  Blockly.Python.variableDB_.getName(name,
      Blockly.Variables.NAME_TYPE);
   return [ code, Blockly.Python.ORDER_ATOMIC ];
};

Blockly.Python.lexical_variable_set = function () {
  var name = this.getTitleValue('VAR');
  var pair = Blockly.unprefixName(name);
  var unprefixedName = pair[1];
  var pName = Blockly.Python.variableDB_.getName(name,
      Blockly.Variables.NAME_TYPE);

  var argument0 = Blockly.Python.valueToCode(this, 'VALUE', Blockly.Python.ORDER_NONE) || '0';

  var code =  pName + " = " + argument0;
  return code;
}

Blockly.Python.local_declaration_statement = function() {
  var code = "";
  for(var i=0;this.getTitleValue("VAR" + i);i++){
    var name = this.getTitleValue('VAR' + i);
    var pair = Blockly.unprefixName(name);
    var unprefixedName = pair[1];
    var pName = unprefixedName;
    var arg = Blockly.Python.valueToCode(this, 'DECL' + i, 
      Blockly.Python.ORDER_NONE) || '0';

    code += pName + " = " + arg + "\n";
  }

  code += Blockly.Python.statementToCode(this, 'STACK', Blockly.Python.ORDER_NONE).trim();

  return code;
}

Blockly.Python.local_declaration_expression = function() {
  var code = "";
  for (var i=0;this.getTitleValue("VAR" + i);i++) {
    var name = this.getTitleValue('VAR' + i);
    var pair = Blockly.unprefixName(name);
    var unprefixedName = pair[1];
    var pName = unprefixedName;
    var arg = Blockly.Python.valueToCode(this, 'DECL' + i, 
      Blockly.Python.ORDER_NONE) || '0';

    code += pName + " = " + arg + "\n";
   }
    
  if (this.getInputTargetBlock("RETURN")) {

    var value = Blockly.Python.valueToCode(this, 'RETURN', Blockly.Python.ORDER_NONE);
    if (value.indexOf("return") > -1) {
      code += Blockly.Python.valueToCode(this, 'RETURN', Blockly.Python.ORDER_NONE);
    } else {
      code += "  return " + Blockly.Python.valueToCode(this, 'RETURN', Blockly.Python.ORDER_NONE);
    }

  }

  return [ code, Blockly.Python.ORDER_ATOMIC ];
}




Blockly.Python.local_variable = function(block,isExpression) {
  var code = "";
  for(var i=0;block.getTitleValue("VAR" + i);i++){
    code += block.getTitleValue("VAR" + i);
    code += " = ";
    code += Blockly.Python.valueToCode(block, 'DECL' + i, Blockly.Python.ORDER_NONE) || '0';
    if (block.getTitleValue("VAR"+ (i + 1) )) {
      code += "\n";
    }
  }
  // [lyn, 01/15/2013] Added to fix bug in local declaration expressions:
  if(isExpression){
    if(block.getInputTargetBlock("RETURN")){
      //here, based on what is returned, I can insert the 'return' statement
      //or not
      code += "\nreturn " + Blockly.Python.valueToCode(block, 'RETURN', Blockly.Python.ORDER_NONE);
    }
  } else {
    code += Blockly.Python.statementToCode(block, 'STACK', Blockly.Python.ORDER_NONE);
  }

  if(!isExpression){
    return code;
  } else {
    return [ code, Blockly.Python.ORDER_ATOMIC ];
  }
};
