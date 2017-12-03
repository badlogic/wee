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
				return this.tokens[i].type == types;
			}
		}

		hasLeft (tokens: number) {
			return tokens <= this.tokens.length - this.index;
		}
	}

	export class Assembler {
		assemble (source: string) {
			let tokens = new Tokenizer().tokenize(source);
			let instructions = this.parse(tokens);
			let code = this.emit(instructions);
			return code;
		}

		parse (tokens: Array<Token>): Array<Instruction> | Array<Diagnostic> {
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
					if (!stream.lookAhead([TokenType.Register, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Arithmetic instruction ${token.value} requires 2 register operands.`));
						break;
					}
					let op1 = stream.next();
					let op2 = stream.next();
					instructions.push(new ArithmeticInstruction(token, op1, op2, null));
				}

				// arithmetic operations, 3 operands
				if (token.value == "add" || token.value == "sub" || token.value == "mul" || token.value == "div" || token.value == "div_unsigned" ||
					token.value == "remainder" || token.value == "remainder_unsigned" ||
					token.value == "add_float" || token.value == "sub_float" || token.value == "mul_float" || token.value == "div_float" ||
					token.value == "atan2_float" ||
					token.value == "cmp" || token.value == "cmp_unsigned" || token.value == "fcmp") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Register, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Arithmetic instruction ${token.value} requires 3 register operands.`));
						break;
					}
					instructions.push(new ArithmeticInstruction(token, stream.next(), stream.next(), stream.next()));
				}

				// bit-wise operations, 2 operands
				if (token.value == "not") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Bit-wise instruction ${token.value} requires 2 register operands.`));
						break;
					}
					instructions.push(new BitwiseInstruction(token, stream.next(), stream.next(), null));
				}

				// bit-wise operations, 3 operands
				if (token.value == "and" || token.value == "or" || token.value == "xor" ||
					token.value == "shift_left" || token.value == "shift_right") {
					if (!stream.lookAhead([TokenType.Register, TokenType.Register, TokenType.Register])) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Bit-wise instruction ${token.value} requires 2 register operands.`));
						break;
					}
					instructions.push(new BitwiseInstruction(token, stream.next(), stream.next(), stream.next()));
				}

				diagnostics.push(new Diagnostic(Severity.Error, token.range, `Expected a label, data definition or instruction, got ${token.value}`));
			}

			return instructions;
		}

		emit (instructions: Array<Instruction>) {
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
}