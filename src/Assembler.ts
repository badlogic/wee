module wee {
	export class Assembler {
		assemble (source: string) {
			let tokens = new Tokenizer().tokenize(source);
		}

		parse (tokens: Array<Token>): Array<Instruction> {
			let instructions = new Array<Instruction>();

			return instructions;
		}
	}

	export class Instruction {

	}
}