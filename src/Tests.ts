module wee.tests {
	class Address {
		constructor (public address: number) {};

		nextInt() {
			let result = this.address;
			this.address += 4;
			return result;
		}

		nextByte() {
			let result = this.address;
			this.address += 1;
			return result;
		}

		nextShort() {
			let result = this.address;
			this.address += 2;
			return result;
		}
	}

	function assert (expression: boolean, errorMessage: string) {
		if (!expression) {
			console.log(errorMessage);
			throw errorMessage;
		}
	}

	export function runTests () {
		testLexer();
		testParser();
		testAssembler();
	}

	function testLexer () {
		try {
			let tokenizer = new wee.Tokenizer();
			console.log(tokenizer.tokenize(`
				STRING: "This is a test.\\nWith a new line."
				INTEGER: 234234
				NEGATIVEINTEGER: -234234
				FLOAT: 2.3423
				NEGATIVEFLOAT: -324.3242
				BINARY: 0b0110101
				HEX: 0xffeeff

				# This is a comment
				load LABEL, r0
				move 123,
				# eol comment
				_41546546`
			));
		} catch (e) {
			let diagnostic = e as Diagnostic;
			console.log(diagnostic.toString());
		}
	}

	function testParser () {
		try {
			let assembler = new wee.Assembler();
			let parserResult = assembler.parse(new wee.Tokenizer().tokenize(`
				helloWorld: string "Hello world"
				move 10, r0
				move 1, r1
				loop:
					sub r0, r1, r0
					move 0, r2
					cmp r0, r2, r2
					jump_not_equal r2, loop
				# end loop
				halt
			`));
			for (var i = 0; i < parserResult.diagnostics.length; i++) {
				console.log(parserResult.diagnostics[i].toString());
			}
		} catch (e) {
			console.log(e);
		}
	}

	function testAssembler () {
		let assembler = new Assembler();
		let result = assembler.assemble(`
			byte 0
			byte 1
			byte 2
			byte 3
			byte -123
			short 0xabcd
			short -1234
			integer 0xaabbccdd
			integer -123456
			float 3.299999952316284
			string "Hello world"

			halt

			add sp, pc, r7
			sub r0, r1, r2
			mul r0, r1, r2
			div r0, r1, r2
			div_unsigned r0, r1, r2
			remainder r0, r1, r2
			remainder_unsigned r0, r1, r2
			add_float r0, r1, r2
			sub_float r0, r1, r2
			mul_float r0, r1, r2
			div_float r0, r1, r2
			cos_float r0, r1
			sin_float r0, r1
			atan2_float r0, r1, r2
			sqrt_float r0, r1
			pow_float r0, r1
			convert_int_float r0, r1
			convert_float_int r0, r1
			cmp r0, r1, r2
			cmp_unsigned r0, r1, r2
			fcmp r0, r1, r2

			not r0, r1
			and r0, r1, r2
			or r0, r1, r2
			xor r0, r1, r2
			shift_left r0, r1, r2
			shift_right r0, r1, r2

			jump 0xffffffff
			jump -1
			TARGET_JMP: jump TARGET_JMP
			jump_equal r0, 1234
			TARGET_JMP_EQUAL: jump_equal r0, TARGET_JMP_EQUAL
			jump_not_equal r0, 1234
			TARGET_JMP_NOT_EQUAL: jump_not_equal r0, TARGET_JMP_NOT_EQUAL
			jump_less r0, 1234
			TARGET_JMP_LESS: jump_less r0, TARGET_JMP_LESS
			jump_greater r0, 1234
			TARGET_JMP_GREATER: jump_greater r0, TARGET_JMP_GREATER
			jump_less_equal r0, 1234
			TARGET_JMP_LESS_EQUAL: jump_less_equal r0, TARGET_JMP_LESS_EQUAL
			jump_greater_equal r0, 1234
			TARGET_JMP_GREATER_EQUAL: jump_greater_equal r0, TARGET_JMP_GREATER_EQUAL

			move r0, r1
			move -1234, r0
			move 1.234, r0
			TARGET_MOVE: move TARGET_MOVE, r0
			load r0, 15, r1
			load 1234, 15, r1
			TARGET_LOAD: load TARGET_LOAD, 15, r1
			store r0, r1, 15
			store r0, 1234, 15
			TARGET_STORE: store r0, TARGET_STORE, 15
			load_byte r0, 15, r1
			load_byte 1234, 15, r1
			TARGET_LOAD_BYTE: load_byte TARGET_LOAD_BYTE, 15, r1
			store_byte r0, r1, 15
			store_byte r0, 1234, 15
			TARGET_STORE_BYTE: store_byte r0, TARGET_STORE_BYTE, 15
			load_short r0, 15, r1
			load_short 1234, 15, r1
			TARGET_LOAD_SHORT: load_short TARGET_LOAD_SHORT, 15, r1
			store_short r0, r1, 15
			store_short r0, 1234, 15
			TARGET_STORE_SHORT: store_short r0, TARGET_STORE_SHORT, 15

			push 1234
			push 1.234
			TARGET_PUSH: push TARGET_PUSH
			push r0
			stackalloc 123
			pop r0
			pop 123
			call 1234
			TARGET_CALL: call TARGET_CALL
			call r2
			return 123

			port_write r2, 123
			port_write 1234, 123
			port_write 1.234, 123
			TARGET_PORT_WRITE: port_write TARGET_PORT_WRITE, 123
			port_write r2, r3
			port_read 123, r3
			port_read r2, r3
		`);

		let memory = result.code;
		if (result.diagnostics.length != 0) {
			for (var i = 0; i < result.diagnostics.length; i++)
				console.log(result.diagnostics[i].toString());
			assert(false, "Error assembling test.");
		}

		let view = new DataView(memory.buffer);
		let addr = new Address(0);

		// data
		assert(view.getInt8(addr.nextByte()) == 0, "Expected 0");
		assert(view.getInt8(addr.nextByte()) == 1, "Expected 1");
		assert(view.getInt8(addr.nextByte()) == 2, "Expected 2");
		assert(view.getInt8(addr.nextByte()) == 3, "Expected 3");
		assert(view.getInt8(addr.nextByte()) == -123, "Expected -123");
		assert(view.getUint16(addr.nextShort()) == 0xabcd, "Expected 0xabcd");
		assert(view.getInt16(addr.nextShort()) == -1234, "Expected -1234");
		assert(view.getUint32(addr.nextInt()) == 0xaabbccdd, "Expected 0xaabbccdd");
		assert(view.getInt32(addr.nextInt()) == -123456, "Expected 123456");
		assert(view.getFloat32(addr.nextInt()) == 3.299999952316284, "Expected 3.3");
		let string = "Hello world";
		for (var i = 0; i < string.length; i++) {
			assert(view.getUint8(addr.nextByte()) == string.charCodeAt(i), `Expected ${string.charAt(i)}`);
		}
		assert(view.getUint8(addr.nextByte()) == 0, "Expected 0");

		// halt
		assert(view.getUint32(addr.nextInt()) == 0, "Expected 0");

		// arithmetic operations
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x01, 15, 14, 7), "Invalid add");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x02, 0, 1, 2), "Invalid sub");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x03, 0, 1, 2), "Invalid mul");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x04, 0, 1, 2), "Invalid div");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x05, 0, 1, 2), "Invalid div_unsigned");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x06, 0, 1, 2), "Invalid remainder");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x07, 0, 1, 2), "Invalid remainder_unsigned");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x08, 0, 1, 2), "Invalid add_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x09, 0, 1, 2), "Invalid sub_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x0a, 0, 1, 2), "Invalid mul_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x0b, 0, 1, 2), "Invalid div_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x0c, 0, 1, 0), "Invalid cos_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x0d, 0, 1, 0), "Invalid sin_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x0e, 0, 1, 2), "Invalid atan2_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x0f, 0, 1, 0), "Invalid sqrt_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x10, 0, 1, 0), "Invalid pow_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x11, 0, 1, 0), "Invalid convert_int_float");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x12, 0, 1, 0), "Invalid convert_float_int");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x13, 0, 1, 2), "Invalid cmp");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x14, 0, 1, 2), "Invalid cmp_unsigned");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x15, 0, 1, 2), "Invalid fcmp");

		// bitwise operations
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x16, 0, 1, 0), "Invalid not");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x17, 0, 1, 2), "Invalid not");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x18, 0, 1, 2), "Invalid not");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x19, 0, 1, 2), "Invalid not");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1a, 0, 1, 2), "Invalid not");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1b, 0, 1, 2), "Invalid not");

		// jumps & branching operations
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1c, 0, 0, 0), "Invalid jmp");
		assert(view.getUint32(addr.nextInt()) == 0xffffffff, "Invalid jmp");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1c, 0, 0, 0), "Invalid jmp");
		assert(view.getInt32(addr.nextInt()) == -1, "Invalid jmp");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1c, 0, 0, 0), "Invalid jmp");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1d, 0, 0, 0), "Invalid jmp_equal");
		assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_equal");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1d, 0, 0, 0), "Invalid jmp_equal");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_equal");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1e, 0, 0, 0), "Invalid jmp_not_equal");
		assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_not_equal");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1e, 0, 0, 0), "Invalid jmp_not_equal");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_not_equal");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1f, 0, 0, 0), "Invalid jmp_less");
		assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_less");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x1f, 0, 0, 0), "Invalid jmp_less");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_less");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x20, 0, 0, 0), "Invalid jmp_greater");
		assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_greater");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x20, 0, 0, 0), "Invalid jmp_greater");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_greater");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x21, 0, 0, 0), "Invalid jmp_less_equal");
		assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_less_equal");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x21, 0, 0, 0), "Invalid jmp_less_equal");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_less_eqaul");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x22, 0, 0, 0), "Invalid jmp_greater_equal");
		assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_greater_equal");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegReg(0x22, 0, 0, 0), "Invalid jmp_greater_equal");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_greater_eqaul");

		// memory operations
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x23, 0, 1, 0), "Invalid move");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x24, 0, 0, 0), "Invalid move");
		assert(view.getInt32(addr.nextInt()) == -1234, "Invalid move");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x24, 0, 0, 0), "Invalid move");
		assert(view.getFloat32(addr.nextInt()) == 1.2339999675750732, "Invalid move");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x24, 0, 0, 0), "Invalid move");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid move");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x26, 0, 1, 15), "Invalid load");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x25, 0, 1, 15), "Invalid load");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid load");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x25, 0, 1, 15), "Invalid load");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid load");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x28, 0, 1, 15), "Invalid store");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x27, 0, 0, 15), "Invalid store");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid store");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x27, 0, 0, 15), "Invalid store");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid store");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2a, 0, 1, 15), "Invalid load_byte");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x29, 0, 1, 15), "Invalid load_byte");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid load_byte");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x29, 0, 1, 15), "Invalid load_byte");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid load_byte");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2c, 0, 1, 15), "Invalid store_byte");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2b, 0, 0, 15), "Invalid store_byte");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid store_byte");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2b, 0, 0, 15), "Invalid store_byte");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid store_byte");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2e, 0, 1, 15), "Invalid load_short");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2d, 0, 1, 15), "Invalid load_short");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid load_short");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2d, 0, 1, 15), "Invalid load_short");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid load_short");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x30, 0, 1, 15), "Invalid store_short");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2f, 0, 0, 15), "Invalid store_short");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid store_short");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x2f, 0, 0, 15), "Invalid store_short");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid store_short");

		// stack & call operations
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x31, 0, 0), "Invalid push");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid push");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x31, 0, 0), "Invalid push");
		assert(view.getFloat32(addr.nextInt()) == 1.2339999675750732, "Invalid push");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x31, 0, 0), "Invalid push");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid push");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x32, 0, 0), "Invalid push");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x33, 0, 123), "Invalid stackalloc");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x34, 0, 0), "Invalid pop");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x35, 0, 123), "Invalid pop");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x36, 0, 0), "Invalid call");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid call");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x36, 0, 0), "Invalid call");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid call");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x37, 2, 0), "Invalid call");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegNum(0x38, 0, 123), "Invalid call");

		// ports
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x39, 2, 0, 123), "Invalid port_write");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x3a, 0, 0, 123), "Invalid port_write");
		assert(view.getUint32(addr.nextInt()) == 1234, "Invalid port_write");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x3a, 0, 0, 123), "Invalid port_write");
		assert(view.getFloat32(addr.nextInt()) == 1.2339999675750732, "Invalid port_write");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x3a, 0, 0, 123), "Invalid port_write");
		assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid port_write");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x3b, 2, 3, 0), "Invalid port_write");

		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x3c, 3, 0, 123), "Invalid port_read");
		assert(view.getUint32(addr.nextInt()) == Assembler.encodeOpRegRegNum(0x3d, 2, 3, 0), "Invalid port_read");

		console.log(memory);
	}
}