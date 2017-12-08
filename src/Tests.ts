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
}