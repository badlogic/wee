module wee.tests {
	export function runTests () {
		let tokenizer = new wee.Tokenizer();
		console.log(tokenizer.tokenize(`
			STRING: "This is a test.\\nWith a new line."
			INTEGER: 234234
			NEGATIVEINTEGER: -234234
			FLOAT: 2.3423
			NEGATIVEFLOAT: -324.3242

			# This is a comment
			load LABEL, r0
			move 123,
			# eol comment
			_41546546`
		));
	}
}