module wee.tests {
	export function runTests () {
		testLexer();
		testParser();		
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
			console.log(assembler.parse(new wee.Tokenizer().tokenize(`
				helloWorld: string "Hello world"
				move 10, r0
				loop:
					move r1, 1
					sub r0, r1, r0
					cmp r0, 0
					jump_not_equal loop
				# end loop
				halt
			`)));
		} catch (e) {
			console.log(e);
		}
	}
}