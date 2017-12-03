module wee {
	export enum TokenType {
		IntegerLiteral = "IntegerLiteral",
		FloatLiteral = "FloatLiteral",
		StringLiteral = "StringLiteral",
		Identifier = "Identifier",
		Opcode = "Opcode",
		Keyword = "Keyword",
		Register = "Register",
		Colon = "Colon",
		Coma = "Coma",
		EndOfFile = "EndOfFile"
	}

	export class Token {
		constructor (public range: Range, public type: TokenType, public value: string | number = null) {}
	}

	class CharacterStream {
		index: number = 0;
		line: number = 1;
		column: number = 1;
		private range: Range;

		constructor (public source: string) {}

		peek() {
			return this.source.charAt(this.index);
		}

		next() {
			let char = this.source.charAt(this.index);
			this.index++;
			this.column++;
			if (char == "\n") {
				this.line++;
				this.column = 1;
			}
			console.log(this.line + ":" + this.column + ":" + char);
			return char;
		}

		startRange() {
			let range = new Range(this.source);
			range.start.line = this.line;
			range.start.column = this.column;
			range.start.index = this.index;
			this.range = range;
		}

		endRange() {
			let range = this.range;
			range.end.line = this.line;
			range.end.column = this.column;
			range.end.index = this.index;
			this.range = null;
			return range;
		}
	}

	var OPCODES = [
		"halt",
		"add", "sub", "mul", "div", "div_unsigned", "remainder", "remainder_unsigned", "add_float", "sub_float", "mul_float", "div_float", "cos_float", "sin_float", "atan2_float", "sqrt_float", "pow_float", "convert_int_float", "convert_float_int", "cmp", "cmp_unsigned", "fcmp",
		"not", "and", "or", "xor", "shift_left", "shift_right",
		"jump", "jump_equal", "jump_not_equal", "jump_less", "jump_greater", "jump_less_equal", "jump_greater_equal",
		"move", "load", "store", "load_byte", "store_byte", "load_short", "store_short",
		"push", "stackalloc", "pop", "call", "return",
		"port_write", "port_read"
	];

	var KEYWORDS = [
		"byte", "short", "integer", "float", "string"
	]

	var REGISTERS = [ "r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12", "r13", "pc", "sp" ];

	export class Tokenizer {
		private isDigit (char: string) {
			return char >= '0' && char <= '9';
		}

		private isHexDigit (char: string) {
			var lowerCase = char.toLowerCase();
			return this.isDigit(char) || lowerCase >= 'a' && lowerCase <= 'f';
		}

		private isBinaryDigit (char: string) {
			return char >= '0' && char <= '1';
		}

		private isAlpha (char: string) {
			var lowerCase = char.toLowerCase();
			return lowerCase >= 'a' && lowerCase <= 'z';
		}

		private isWhitespace (char: string) {
			return char == ' ' || char == '\n' || char == '\r' || char == '\t';
		}

		private getIdentifierType (identifier: string) {
			for (var i = 0; i < OPCODES.length; i++) {
				if (identifier == OPCODES[i])
					return TokenType.Opcode;
			}

			for (var i = 0; i < KEYWORDS.length; i++) {
				if (identifier == KEYWORDS[i])
					return TokenType.Keyword;
			}

			for (var i = 0; i < REGISTERS.length; i++) {
				if (identifier == REGISTERS[i])
					return TokenType.Register;
			}

			return TokenType.Identifier;
		}

		tokenize (source: string) {
			let tokens = new Array<Token>();
			let stream = new CharacterStream(source);

			while (true) {
				stream.startRange();
				var char = stream.next();

				// EOF
				if (char.length == 0) {
					tokens.push(new Token(stream.endRange(), TokenType.EndOfFile));
					break;
				}

				// whitespace
				if (this.isWhitespace(char)) {
					while (this.isWhitespace(stream.peek())) {
						stream.next();
					}
					stream.endRange();
					continue;
				}

				// colon
				if (char == ':') {
					tokens.push(new Token(stream.endRange(), TokenType.Colon, ":"));
					continue;
				}

				// coma
				if (char == ',') {
					tokens.push(new Token(stream.endRange(), TokenType.Coma, ","));
					continue;
				}

				// hex
				if (char == '0' && stream.peek() == 'x') {
					stream.next();
					var number = "";
					while (this.isHexDigit(stream.peek())) {
						number += stream.next();
					}
					if (number == "") {
						throw new Diagnostic(Severity.Error, stream.endRange(), "Expected a hex number (0xffa12)");
					}
					tokens.push(new Token(stream.endRange(), TokenType.IntegerLiteral, parseInt(number, 16)));
					continue;
				}

				// binary
				if (char == '0' && stream.peek() == 'b') {
					stream.next();
					var number = "";
					while (this.isBinaryDigit(stream.peek())) {
						number += stream.next();
					}
					if (number == "") {
						throw new Diagnostic(Severity.Error, stream.endRange(), "Expected a binary number (0b010111)");
					}
					tokens.push(new Token(stream.endRange(), TokenType.IntegerLiteral, parseInt(number, 2)));
					continue;
				}

				// number
				if (char == '-' || this.isDigit(char)) {
					var number = char;
					var isFloat = false;

					while (this.isDigit(stream.peek())) {
						number += stream.next();
					}

					if (stream.peek() == '.') {
						isFloat = true;
						number += stream.next();

						while (this.isDigit(stream.peek())) {
							number += stream.next();
						}
					}

					if (number == '-') {
						throw new Diagnostic(Severity.Error, stream.endRange(), "Expected a negative number (-1234)");
					}

					tokens.push(new Token(stream.endRange(), isFloat ? TokenType.FloatLiteral : TokenType.IntegerLiteral, number));
					continue;
				}

				// identifier or keyword
				if (char == '_' || this.isAlpha(char)) {
					var identifier = char;

					while (this.isAlpha(stream.peek()) || this.isDigit(stream.peek()) || stream.peek() == '_') {
						identifier += stream.next();
					}
					tokens.push(new Token(stream.endRange(), this.getIdentifierType(identifier), identifier));
					continue;
				}

				// string
				if (char == '"') {
					var string = char;
					while (true) {
						char = stream.next();
						if (char == '\\') {
							let special = stream.next();
							if (special == '\\') {
								string += special;
							} else if (special == "n") {
								string += "\n";
							} else if (special == "r") {
								string += "\r";
							} else if (special == "t") {
								string += "\t";
							} else if (special == "\"") {
								string += '"';
							} else {
								string += "\\" + special;
							}
						} else if (char == "\"") {
							break;
						} else if (char.length == 0) {
							throw new Diagnostic(Severity.Error, stream.endRange(), "Expected closing \" character for string")
						} else {
							string += char;
						}
					}
					tokens.push(new Token(stream.endRange(), TokenType.StringLiteral, string));
					continue;
				}

				// comment
				if (char == '#') {
					while (stream.peek() != '\n' && stream.peek().length > 0) {
						stream.next();
					}
					continue;
				}

				throw new Diagnostic(Severity.Error, stream.endRange(), `Expected a colon (:), coma (,), number (123.2), identifier (myLabel) or keyword (move, r1)! Got '${char}'`);
			}

			return tokens;
		}
	}

}