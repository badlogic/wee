module wee.tests {
	export function runTests () {
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
}