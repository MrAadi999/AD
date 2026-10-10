import { AgentToolHandler, ToolExecutionContext, ToolExecutionResult } from './base';

/**
 * Safe Arithmetic Expression Evaluator
 * Uses Recursive Descent parsing. Strictly rejects any non-math tokens.
 * Zero use of eval(), Function(), or code generation.
 */
export function safeEvaluateMath(expression: string): number {
  const clean = (expression || '').trim();
  if (!clean) {
    throw new Error('Expression cannot be empty.');
  }

  // 1. Strict Character Whitelist Check
  // Allowed: 0-9, ., +, -, *, /, %, ^, (, ), whitespace
  if (!/^[0-9\.\+\-\*\/\%\^\(\)\s]+$/.test(clean)) {
    throw new Error(
      'Invalid expression: Only numbers and mathematical operators (+, -, *, /, %, ^) are permitted. Functions and code execution are strictly blocked.'
    );
  }

  // 2. Tokenize
  const tokens: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9\.]/.test(ch)) {
      let numStr = '';
      while (i < clean.length && /[0-9\.]/.test(clean[i])) {
        numStr += clean[i];
        i++;
      }
      if ((numStr.match(/\./g) || []).length > 1) {
        throw new Error(`Malformed number "${numStr}" with multiple decimal points.`);
      }
      tokens.push(numStr);
      continue;
    }

    if (['+', '-', '*', '/', '%', '^', '(', ')'].includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }

    throw new Error(`Unexpected character: "${ch}"`);
  }

  if (tokens.length === 0) {
    throw new Error('No valid mathematical tokens found.');
  }

  // 3. Parser State
  let pos = 0;

  function peek(): string | undefined {
    return tokens[pos];
  }

  function consume(expected?: string): string {
    const token = tokens[pos];
    if (expected && token !== expected) {
      throw new Error(`Syntax error: Expected "${expected}", found "${token || 'EOF'}"`);
    }
    pos++;
    return token;
  }

  // Grammar:
  // Expr   -> Term (('+' | '-') Term)*
  // Term   -> Factor (('*' | '/' | '%') Factor)*
  // Factor -> Power
  // Power  -> Primary ('^' Primary)*
  // Primary-> ('+' | '-') Primary | Number | '(' Expr ')'

  function parseExpression(): number {
    let result = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const nextTerm = parseTerm();
      if (op === '+') result += nextTerm;
      else result -= nextTerm;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const nextFactor = parseFactor();
      if (op === '*') {
        result *= nextFactor;
      } else if (op === '/') {
        if (nextFactor === 0) {
          throw new Error('Division by zero is undefined.');
        }
        result /= nextFactor;
      } else if (op === '%') {
        if (nextFactor === 0) {
          throw new Error('Modulo by zero is undefined.');
        }
        result %= nextFactor;
      }
    }
    return result;
  }

  function parseFactor(): number {
    let base = parsePrimary();
    while (peek() === '^') {
      consume('^');
      const exp = parsePrimary();
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parsePrimary(): number {
    const token = peek();

    if (!token) {
      throw new Error('Syntax error: Unexpected end of expression.');
    }

    // Unary plus or minus
    if (token === '+') {
      consume('+');
      return parsePrimary();
    }
    if (token === '-') {
      consume('-');
      return -parsePrimary();
    }

    // Parentheses
    if (token === '(') {
      consume('(');
      const val = parseExpression();
      consume(')');
      return val;
    }

    // Number
    if (/^[0-9]/.test(token)) {
      consume();
      const num = parseFloat(token);
      if (isNaN(num)) {
        throw new Error(`Invalid number: "${token}"`);
      }
      return num;
    }

    throw new Error(`Unexpected token "${token}"`);
  }

  const finalValue = parseExpression();

  if (pos < tokens.length) {
    throw new Error(`Unexpected extra tokens after valid expression: "${tokens.slice(pos).join(' ')}"`);
  }

  return Number(finalValue.toFixed(8));
}

export const CalculatorTool: AgentToolHandler = {
  type: 'calculator',
  name: 'calculator',
  description:
    'Perform precise mathematical computations, percentages, discounts, GST, and arithmetic without hallucinations.',
  input_schema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g. "12500 * 0.18", "(50000 - 3500) * 1.05")',
      },
    },
    required: ['expression'],
  },
  async execute(
    input: Record<string, any>,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    try {
      const expr = String(input.expression || '');
      const result = safeEvaluateMath(expr);

      return {
        success: true,
        data: {
          expression: expr,
          result: result,
          formatted: result.toLocaleString('en-IN'),
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Calculator evaluation failed.',
        latency_ms: Date.now() - startTime,
      };
    }
  },
};
