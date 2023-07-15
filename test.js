function parseABNF(input) {
    const ruleDefinitions = {};
  
    function parseRule() {
      const ruleName = parseToken();
      parseChar('=');
      const ruleDefinition = parseElements();
      parseChar(';');
      ruleDefinitions[ruleName] = ruleDefinition;
    }
  
    function parseElements() {
      const elements = [];
      while (true) {
        const element = parseAlternation();
        elements.push(element);
        if (parseChar('/')) {
          continue;
        } else {
          break;
        }
      }
      return elements;
    }
  
    function parseAlternation() {
      const alternation = [];
      while (true) {
        const concatenation = parseConcatenation();
        alternation.push(concatenation);
        if (parseChar('|')) {
          continue;
        } else {
          break;
        }
      }
      return alternation;
    }
  
    function parseConcatenation() {
      const concatenation = [];
      while (true) {
        const repetition = parseRepetition();
        concatenation.push(repetition);
        if (repetition === null || repetition === ')' || repetition === ']') {
          break;
        }
      }
      return concatenation;
    }
  
    function parseRepetition() {
      const repetition = [];
      const element = parseElement();
      repetition.push(element);
      if (parseChar('*')) {
        repetition.push('*');
      } else if (parseChar('+')) {
        repetition.push('+');
      } else if (parseChar('?')) {
        repetition.push('?');
      }
      return repetition.length > 1 ? repetition : element;
    }
  
    function parseElement() {
      if (parseChar('"')) {
        const literal = parseLiteral();
        parseChar('"');
        return literal;
      } else if (parseChar('(')) {
        const alternation = parseAlternation();
        parseChar(')');
        return alternation;
      } else if (parseChar('[')) {
        const option = parseOption();
        parseChar(']');
        return option;
      } else {
        return parseToken();
      }
    }
  
    function parseOption() {
      const option = [];
      while (true) {
        const alternation = parseAlternation();
        option.push(alternation);
        if (alternation[0] === ')' || alternation[0] === ']') {
          break;
        }
      }
      return option;
    }
  
    function parseLiteral() {
      let literal = '';
      while (true) {
        const char = input[0];
        if (char === '"') {
          break;
        } else if (char === '\\') {
          literal += input[1];
          input = input.slice(2);
        } else {
          literal += char;
          input = input.slice(1);
        }
      }
      return literal;
    }
  
    function parseToken() {
      let token = '';
      while (true) {
        const char = input[0];
        if (char === ' ' || char === '\t' || char === '\n') {
          break;
        } else if (char === ':') {
          input = input.slice(1);
          break;
        } else {
          token += char;
          input = input.slice(1);
        }
      }
      return token;
    }
  
    function parseChar(expectedChar) {
      if (input[0] === expectedChar) {
        input = input.slice(1);
        return expectedChar;
      }
      return null;
    }
  
    // Remove leading and trailing whitespace
    input = input.trim();
  
    while (input.length > 0) {
      parseRule();
    }
  
    return ruleDefinitions;
  }
  
  // Example ABNF grammar
  const abnfGrammar = `
    DIGIT = "0" / "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8" / "9"
    ALPHA = %x41-5A / %x61-7A
    HEXDIG = DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
    OCTET = DIGIT / %x31-39 DIGIT / "1" 2DIGIT / "2" %x30-34 DIGIT / "25" %x30-35
    CIDR = DIGIT / %x31-32 DIGIT / "3" %x30-32
  `;
  
  // Parse the ABNF grammar
  const result = parseABNF(abnfGrammar);
  
  console.log('Parsing successful!');
  console.log('Result:', result);
  