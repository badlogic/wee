module wee.tests {
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
		let memory = assembler.assemble(`
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
		`);

		let view = new DataView(memory.buffer);
		assert(view.getInt8(0) == 0, "Expected 0");
		assert(view.getInt8(1) == 1, "Expected 1");
		assert(view.getInt8(2) == 2, "Expected 2");
		assert(view.getInt8(3) == 3, "Expected 3");
		assert(view.getInt8(4) == -123, "Expected -123");
		assert(view.getUint16(5) == 0xabcd, "Expected 0xabcd");
		assert(view.getInt16(7) == -1234, "Expected -1234");
		assert(view.getUint32(9) == 0xaabbccdd, "Expected 0xaabbccdd");
		assert(view.getInt32(13) == -123456, "Expected 123456");
		assert(view.getFloat32(17) == 3.299999952316284, "Expected 3.3");
		let string = "Hello world";
		for (var i = 21, j = 0; j < string.length; i++, j++) {
			assert(view.getUint8(i) == string.charCodeAt(j), `Expected ${string.charAt(j)}`);
		}
		assert(view.getUint8(32) == 0, "Expected 0");
		assert(view.getUint32(33) == 0, "Expected 0");

		console.log(memory);
	}
}