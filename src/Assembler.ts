module wee {
	export interface StringMap<V> {
		[key: string] : V;
	}

	export interface IndexedMap<V> {
		[key: number] : V;
	}

	class TokenStream {
		private index = 0;

		constructor(private tokens: Array<Token>) { };

		next () {
			return this.tokens[this.index++];
		}

		peek () {
			return this.tokens[this.index];
		}

		lookAhead(types: TokenType | Array<TokenType>) {
			if  (types instanceof Array) {
				if (this.tokens.length - this.index < types.length) return false;
				for (var i = this.index, j = 0; i < this.index + types.length; i++, j++) {
					let type = types[j] as TokenType;
					if (!(this.tokens[i].type == type)) return false;
				}
				return true;
			} else {
				if (this.index == this.tokens.length) return false;
				return this.tokens[this.index].type == types;
			}
		}

		hasLeft (tokens: number) {
			return tokens <= this.tokens.length - this.index;
		}
	}

	export class ParserResult {
		constructor (public instructions: Array<Instruction>, public labels: StringMap<Label>, public instructionToLabel: IndexedMap<Label>, public diagnostics: Array<Diagnostic>) {};
	}

	export class Assembler {
		assemble (source: string) {
			let tokens = new Tokenizer().tokenize(source);
			let parserResult = this.parse(tokens);
			let code = this.emit(parserResult.instructions, parserResult.diagnostics);
			return code;
		}

		parse (tokens: Array<Token>): ParserResult {
			let instructions = new Array<Instruction>();
			let diagnostics = new Array<Diagnostic>();
			let stream = new TokenStream(tokens);
			var labels: StringMap<Label> = {};
			var instructionToLabel: IndexedMap<Label> = {};

			while (true) {
				var token = stream.next();

				if (token.type == TokenType.EndOfFile) {
					break;
				}

				// Label
				if (token.type == TokenType.Identifier) {
					if (!stream.lookAhead(TokenType.Colon)) {
						let otherToken = stream.next();
						diagnostics.push(new Diagnostic(Severity.Error, otherToken.range, `Expected a colon (:) after the label ${token.value}, got ${otherToken.value}`));
						break;
					}
					stream.next();
					let label = new Label(token, instructions.length);
					if (labels[token.value]) {
						let otherLabel = labels[token.value] as Label;
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Label '${token.value} already defined on line ${otherLabel.token.range.start.line}.`));
						break;
					} else {
						labels[token.value] = label;
					}
					instructionToLabel[label.index] = label;
					continue;
				}

				// data
				if (token.value == "byte" || token.value == "short" || token.value == "integer" || token.value == "float" || token.value == "string") {
					if (!stream.hasLeft(1)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Data definition is missing a value.`));
						break;
					}
					let literal = stream.next();
					if ((token.value == "byte" || token.value == "short" || token.value == "integer") && literal.type != TokenType.IntegerLiteral) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Defining ${token.value} data requires an integer value (123, 0xff, 0b1101), got ${literal.value}.`));
						break;
					}
					if (token.value == "float" && literal.type != TokenType.FloatLiteral) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Defining ${token.value} data requires a float value (123.456), got ${literal.value}.`));
						break;
					}
					if (token.value == "string" && literal.type != TokenType.StringLiteral) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Defining ${token.value} data requires a string value ("Hello world"), got ${literal.value}.`));
						break;
					}
					instructions.push(new Data(token, literal));
					continue;
				}

				// halt
				if (token.value == "halt") {
					instructions.push(new Halt(token));
					continue;
				}

				// arithmetic operations, 2 operands
				if (token.value == "cos_float" || token.value == "sin_float" ||
					token.value == "sqrt_float" || token.value == "pow_float" ||
					token.value == "convert_float_int" || token.value == "convert_int_float") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Arithmetic instruction ${token.value} requires 2 register operands.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					instructions.push(new ArithmeticInstruction(token, op1, op2, null));
					continue;
				}

				// arithmetic operations, 3 operands
				if (token.value == "add" || token.value == "sub" || token.value == "mul" || token.value == "div" || token.value == "div_unsigned" ||
					token.value == "remainder" || token.value == "remainder_unsigned" ||
					token.value == "add_float" || token.value == "sub_float" || token.value == "mul_float" || token.value == "div_float" ||
					token.value == "atan2_float" ||
					token.value == "cmp" || token.value == "cmp_unsigned" || token.value == "fcmp") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register, TokenType.Coma, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Arithmetic instruction ${token.value} requires 3 register operands.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					stream.next();
					let op3 = stream.next();
					instructions.push(new ArithmeticInstruction(token, op1, op2, op3));
					continue;
				}

				// bit-wise operations, 2 operands
				if (token.value == "not") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Bit-wise instruction ${token.value} requires 2 register operands.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					instructions.push(new BitwiseInstruction(token, op1, op2, null));
					continue;
				}

				// bit-wise operations, 3 operands
				if (token.value == "and" || token.value == "or" || token.value == "xor" ||
					token.value == "shift_left" || token.value == "shift_right") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register, TokenType.Coma, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Bit-wise instruction ${token.value} requires 2 register operands.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					stream.next();
					let op3 = stream.next();
					instructions.push(new BitwiseInstruction(token, op1, op2, op3));
					continue;
				}

				// Jumps and branching, 1 operand
				if (token.value == "jump") {
					if (!(stream.lookAhead(TokenType.IntegerLiteral) || stream.lookAhead(TokenType.Identifier))) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Jump/branch instruction ${token.value} requires an address as operand, e.g. 0xa000 or LABEL.`));
						break;
					}
					instructions.push(new JumpInstruction(token, stream.next(), null));
					continue;
				}

				// Jumps and branching, 2 operands
				if (token.value == "jump_equal" || token.value == "jump_not_equal" || token.value == "jump_less" || token.value == "jump_greater" || token.value == "jump_less_equal" || token.value == "jump_greater_equal") {
					if (!(stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.IntegerLiteral]) || stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Identifier]))) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Jump/branch instruction ${token.value} requires one register operand holding the result of a comparison and an as address as the second operand, e.g. 0xa000 or LABEL.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					instructions.push(new JumpInstruction(token, op1, op2));
					continue;
				}

				// Memory operations, 2 operands
				if (token.value == "move") {
					if (!(
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register]) ||
						stream.lookAhead([TokenType.IntegerLiteral, TokenType.Coma, TokenType.Register]) ||
						stream.lookAhead([TokenType.FloatLiteral, TokenType.Coma, TokenType.Register]) ||
						stream.lookAhead([TokenType.Identifier, TokenType.Coma, TokenType.Register])
					)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Memory instruction ${token.value} requires two register operands, or an int/float literal and a register operand, or a label and a register operand.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					instructions.push(new MemoryInstruction(token, op1, op2, null));
					continue;
				}

				// Memory operations, 3 operand loads
				if (token.value == "load" || token.value == "load_byte" || token.value == "load_short") {
					if (!(
						stream.lookAhead([TokenType.IntegerLiteral, TokenType.Coma, TokenType.IntegerLiteral, TokenType.Coma, TokenType.Register]) ||
						stream.lookAhead([TokenType.Identifier, TokenType.Coma, TokenType.IntegerLiteral, TokenType.Coma, TokenType.Register]) ||
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.IntegerLiteral, TokenType.Coma, TokenType.Register])
					)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Memory instruction ${token.value} requires and address as an int literal, label or register, an offset as an int literal, and a register.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					stream.next();
					let op3 = stream.next();
					instructions.push(new MemoryInstruction(token, op1, op2, op3));
					continue;
				}

				// Memory operations, 3 operand stores
				if (token.value == "store" || token.value == "store_byte" || token.value == "store_short") {
					if (!(
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.IntegerLiteral, TokenType.Coma, TokenType.IntegerLiteral]) ||
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Identifier, TokenType.Coma, TokenType.IntegerLiteral]) ||
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register, TokenType.Coma, TokenType.IntegerLiteral])
					)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Memory instruction ${token.value} requires a register, an address as an int literal, label or register, and an offset as an int literal.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					stream.next();
					let op3 = stream.next();
					instructions.push(new MemoryInstruction(token, op1, op2, op3));
					continue;
				}

				// Stack & call operations, 1 register or literal operand
				if (token.value == "push" || token.value == "call") {
					if (!(stream.lookAhead(TokenType.Register) || stream.lookAhead(TokenType.IntegerLiteral) || stream.lookAhead(TokenType.FloatLiteral) || stream.lookAhead(TokenType.Identifier))) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Stack/call operation ${token.value} requires a register, integer or float literal or label as operand`));
						break;
					}
					instructions.push(new StackOrCallInstruction(token, stream.next()));
					continue;
				}

				// Stack & call operation, 1 integer literal or register operand
				if (token.value == "pop") {
					if (!(stream.lookAhead(TokenType.Register) || stream.lookAhead(TokenType.IntegerLiteral))) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Stack/call operation ${token.value} requires a register or integer literal as operand`));
						break;
					}
					instructions.push(new StackOrCallInstruction(token, stream.next()));
					continue;
				}

				// Stack & call operations, 1 integer literal operand
				if (token.value == "stackalloc" || token.value == "return") {
					if (!stream.lookAhead(TokenType.IntegerLiteral)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Stack/call operation ${token.value} requires an integer literal as operand`));
						break;
					}
					instructions.push(new StackOrCallInstruction(token, stream.next()));
					continue;
				}

				// Port operation, write
				if (token.value == "port_write") {
					if (!(
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.IntegerLiteral]) ||
						stream.lookAhead([TokenType.IntegerLiteral, TokenType.Coma, TokenType.IntegerLiteral]) ||
						stream.lookAhead([TokenType.FloatLiteral, TokenType.Coma, TokenType.IntegerLiteral]) ||
						stream.lookAhead([TokenType.Identifier, TokenType.Coma, TokenType.IntegerLiteral])
					)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Port operation ${token.value} requires an integer or float literal or a label or a register as the first operand and an integer literal as the second operand.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					instructions.push(new PortInstruction(token, op1, op2));
					continue;
				}

				// Port operation, read
				if (token.value == "port_read") {
					if (!stream.lookAhead([TokenType.IntegerLiteral, TokenType.Coma, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Port operation ${token.value} requires an integer literal as the first operand, and a register as the second operand.`));
						break;
					}
					let op1 = stream.next();
					stream.next();
					let op2 = stream.next();
					instructions.push(new PortInstruction(token, op1, op2));
					continue;
				}

				diagnostics.push(new Diagnostic(Severity.Error, token.range, `Expected a label, data definition or instruction, got ${token.value}`));
				break;
			}

			return new ParserResult(instructions, labels, instructionToLabel, diagnostics);
		}

		emit (instructions: Array<Instruction>, diagnostics: Array<Diagnostic>): Uint8Array {
			return null;
		}
	}

	export class Label {
		constructor(public token: Token, public index: number) {};
	}

	export interface Instruction {};

	export class Data implements Instruction {
		constructor (public type: Token, public value: Token) {};
	}

	export class Halt implements Instruction {
		constructor (public token: Token) {};
	}

	export class ArithmeticInstruction implements Instruction {
		constructor (public operation: Token, public operand1: Token, public operand2: Token, public operand3: Token) {};
	}

	export class BitwiseInstruction implements Instruction {
		constructor (public operation: Token, public operand1: Token, public operand2: Token, public operand3: Token) {};
	}

	export class JumpInstruction implements Instruction {
		constructor (public branchType: Token, operand1: Token, public operand2: Token) {};
	}

	export class MemoryInstruction implements Instruction {
		constructor (public operation: Token, operand1: Token, public operand2: Token, public operand3: Token) {};
	}

	export class StackOrCallInstruction implements Instruction {
		constructor (public operation: Token, public operand1: Token) {};
	}

	export class PortInstruction implements Instruction {
		constructor (public operation: Token, public operand1: Token, public operand2: Token) {};
	}
}