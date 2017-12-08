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
						stream.lookAhead([TokenType.Identifier, TokenType.Coma, TokenType.IntegerLiteral]) ||
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register])
					)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Port operation ${token.value} requires an integer or float literal or a label or a register as the first operand and an integer literal or a register as the second operand.`));
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
					if (!(
						stream.lookAhead([TokenType.IntegerLiteral, TokenType.Coma, TokenType.Register]) ||
						stream.lookAhead([TokenType.Register, TokenType.Coma, TokenType.Register])
					)) {
						diagnostics.push(new Diagnostic(Severity.Error, token.range, `Port operation ${token.value} requires an integer literal or register as the first operand, and a register as the second operand.`));
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
			let buffer = new ArrayBuffer(16 * 1024 * 1024);
			let view = new DataView(buffer);
			let address = 0;

			for (var i = 0; i < instructions.length; i++) {
				let instruction = instructions[i];
				address = instruction.emit(view, address, diagnostics);
			}

			return new Uint8Array(buffer);
		}

		static getRegisterIndex(reg: Token) {
			if (reg.type != TokenType.Register) throw new Error(`Unexpected token type ${reg.type}!`);
			if (reg.value == "pc") return 14;
			if (reg.value == "sp") return 15;
			return parseInt((reg.value as string).substr(1));
		}

		static encodeOpRegRegReg(op: number, reg1: number, reg2: number, reg3: number) {
			return (op & 0x1f) |
				   ((reg1 & 0xf) << 6) |
				   ((reg2 & 0xf) << 10) |
				   ((reg3 & 0xf) << 14);
		}

		static encodeOpRegNum(op: number, reg: number, num: number) {
			return (op & 0x1f) |
				   ((reg & 0xf) << 6) |
				   ((num & 0x3fffff) << 10);
		}

		static encodeOpRegRegNum(op: number, reg1: number, reg2: number, num: number) {
			return (op & 0x1f) |
				   ((reg1 & 0xf) << 6) |
				   ((reg2 & 0xf) << 10) |
				   ((num & 0x3ffff) << 14)
		}
	}

	class Label {
		constructor(public token: Token, public index: number) {};
	}

	interface Instruction {
		address: number;

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
	};

	class Data implements Instruction {
		address: number;

		constructor (public type: Token, public value: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;

			if (this.type.value == "byte") {
				view.setUint8(address++, (this.value.value as number) & 0xff);
				return address;
			}

			if (this.type.value == "short") {
				view.setUint16(address, (this.value.value as number) & 0xffff);
				address += 2;
				return address;
			}

			if (this.type.value == "integer") {
				view.setUint32(address, (this.value.value as number) & 0xffffffff);
				address += 4;
				return address;
			}

			if (this.type.value == "float") {
				view.setFloat32(address, this.value.value as number);
				address += 4;
				return address;
			}

			if (this.type.value == "string") {
				let string = this.value.value as string;
				for (var i = 0; i < string.length; i++) {
					view.setUint8(address++, string.charCodeAt(i) & 0xff);
				}
				view.setUint8(address++, 0);
				return address;
			}

			diagnostics.push(new Diagnostic(Severity.Error, this.type.range, `Unknown data type ${this.type.value}.`));
		}
	}

	class Halt implements Instruction {
		address: number;

		constructor (public token: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;
			view.setUint32(address, 0);
			return address + 4;
		}
	}

	class ArithmeticInstruction implements Instruction {
		address: number;

		constructor (public operation: Token, public operand1: Token, public operand2: Token, public operand3: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;

			let op1 = Assembler.getRegisterIndex(this.operand1);
			let op2 = Assembler.getRegisterIndex(this.operand2);
			let op3 = this.operand3 ? Assembler.getRegisterIndex(this.operand3) : 0;
			let opcode = 0;

			if (this.operation.value == "add") opcode = 0x01;
			else if (this.operation.value == "sub") opcode = 0x02;
			else if (this.operation.value == "mul") opcode = 0x03;
			else if (this.operation.value == "div") opcode = 0x04;
			else if (this.operation.value == "div_unsigned") opcode = 0x05;
			else if (this.operation.value == "remainder") opcode = 0x06;
			else if (this.operation.value == "remainder_unsigned") opcode = 0x07;
			else if (this.operation.value == "add_float") opcode = 0x08;
			else if (this.operation.value == "sub_float") opcode = 0x09;
			else if (this.operation.value == "mul_float") opcode = 0x0a;
			else if (this.operation.value == "div_float") opcode = 0x0b;
			else if (this.operation.value == "cos_float") opcode = 0x0c;
			else if (this.operation.value == "sin_float") opcode = 0x0d;
			else if (this.operation.value == "atan2_float") opcode = 0x0e
			else if (this.operation.value == "sqrt_float") opcode = 0x0f;
			else if (this.operation.value == "pow_float") opcode = 0x10;
			else if (this.operation.value == "convert_int_float") opcode = 0x11;
			else if (this.operation.value == "convert_float_int") opcode = 0x12;
			else if (this.operation.value == "cmp") opcode = 0x13;
			else if (this.operation.value == "cmp_unsigned") opcode = 0x14;
			else if (this.operation.value == "fcmp") opcode = 0x15;
			else {
				diagnostics.push(new Diagnostic(Severity.Error, this.operation.range, `Unknown arithmetic instruction ${this.operation.value}`));
				return address;
			}
			view.setUint32(address, Assembler.encodeOpRegRegReg(opcode, op1, op2, op3));
			return address + 4;
		}
	}

	class BitwiseInstruction implements Instruction {
		address: number;

		constructor (public operation: Token, public operand1: Token, public operand2: Token, public operand3: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;

			let op1 = Assembler.getRegisterIndex(this.operand1);
			let op2 = Assembler.getRegisterIndex(this.operand2);
			let op3 = this.operand3 ? Assembler.getRegisterIndex(this.operand3) : 0;
			let opcode = 0;

			if (this.operation.value == "not") opcode = 0x16;
			else if (this.operation.value == "and") opcode = 0x17;
			else if (this.operation.value == "or") opcode = 0x18;
			else if (this.operation.value == "xor") opcode = 0x19;
			else if (this.operation.value == "shift_left") opcode = 0x1a;
			else if (this.operation.value == "shift_right") opcode = 0x1b;
			else {
				diagnostics.push(new Diagnostic(Severity.Error, this.operation.range, `Unknown bit-wise instruction ${this.operation.value}`));
				return address;
			}
			view.setUint32(address, Assembler.encodeOpRegRegReg(opcode, op1, op2, op3));
			return address + 4;
		}
	}

	class JumpInstruction implements Instruction {
		address: number;

		constructor (public branchType: Token, public operand1: Token, public operand2: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;

			if (this.branchType.value == "jump") {
				view.setUint32(address, 0x1c);
				address += 4;

				if (this.operand1.type == TokenType.IntegerLiteral) {
					view.setUint32(address, this.operand1.value as number);
				} else {
					// BOZO patch
					view.setUint32(address, 0xdeadbeaf);
				}
				return address + 4;
			} else {
				let op1 = Assembler.getRegisterIndex(this.operand1);
				let opcode = 0;
				let targetAddress = 0;
				if (this.operand2.type == TokenType.IntegerLiteral) {
					targetAddress = this.operand2.value as number;
				} else {
					// BOZO patch
					targetAddress = 0xdeadbeaf;
				}

				if (this.branchType.value == "jump_equal") opcode = 0x1d;
				else if (this.branchType.value == "jump_not_equal") opcode = 0x1e;
				else if (this.branchType.value == "jump_less") opcode = 0x1f;
				else if (this.branchType.value == "jump_greater") opcode = 0x20;
				else if (this.branchType.value == "jump_less_equal") opcode = 0x21;
				else if (this.branchType.value == "jump_greater_equal") opcode = 0x22;
				else {
					diagnostics.push(new Diagnostic(Severity.Error, this.branchType.range, `Unknown jump/branch instruction ${this.branchType.value}`));
					return address;
				}
				view.setUint32(address, Assembler.encodeOpRegNum(opcode, op1, targetAddress));
				return address + 4;
			}
		}
	}

	class MemoryInstruction implements Instruction {
		address: number;

		constructor (public operation: Token, operand1: Token, public operand2: Token, public operand3: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;
			return 0;
		}
	}

	class StackOrCallInstruction implements Instruction {
		address: number;

		constructor (public operation: Token, public operand1: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;
			return 0;
		}
	}

	class PortInstruction implements Instruction {
		address: number;

		constructor (public operation: Token, public operand1: Token, public operand2: Token) {};

		emit (view: DataView, address: number, diagnostics: Array<Diagnostic>): number {
			this.address = address;

			if (this.operation.value == "port_write") {
				if (this.operand2.type == TokenType.IntegerLiteral) {
					let portNumber = this.operand2.value as number;
					if (this.operand1.type == TokenType.Register) {
						let register = Assembler.getRegisterIndex(this.operand1);
						view.setUint32(address, Assembler.encodeOpRegRegNum(0x39, register, 0, portNumber));
					} else if (this.operand1.type == TokenType.IntegerLiteral) {
						view.setUint32(address, Assembler.encodeOpRegRegNum(0x3a, 0, 0, portNumber));
						address += 4;
						view.setUint32(address, this.operand2.value as number);
					} else if (this.operand1.type == TokenType.FloatLiteral) {
						view.setUint32(address, Assembler.encodeOpRegRegNum(0x3a, 0, 0, portNumber));
						address += 4;
						view.setFloat32(address, this.operand2.value as number);
					} else if (this.operand1.type == TokenType.Identifier) {
						// BOZO patch
						view.setUint32(address, Assembler.encodeOpRegRegNum(0x3a, 0, 0, portNumber));
						address += 4;
						view.setUint32(address, 0xdeadbeaf);
					}
				} else {
					let register1 = Assembler.getRegisterIndex(this.operand1);
					let register2 = Assembler.getRegisterIndex(this.operand2);
					view.setUint32(address, Assembler.encodeOpRegRegNum(0x3b, register1, register2, 0));
				}
				return address + 4;
			} else if (this.operation.value == "port_read") {
				if (this.operand1.type == TokenType.IntegerLiteral) {
					let portNumber = this.operand1.value as number;
					let register = Assembler.getRegisterIndex(this.operand2);
					view.setUint32(address, Assembler.encodeOpRegRegNum(0x3c, register, 0, portNumber));
				} else {
					let register1 = Assembler.getRegisterIndex(this.operand1);
					let register2 = Assembler.getRegisterIndex(this.operand2);
					view.setUint32(address, Assembler.encodeOpRegRegNum(0x3d, register1, register2, 0));
				}
				return address + 4;
			}
		}
	}
}