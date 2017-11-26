declare module wee {
    class Assembler {
        assemble(source: string): void;
        parse(tokens: Array<Token>): Array<Instruction>;
    }
    class Instruction {
    }
}
declare module wee {
    class Position {
        line: number;
        column: number;
        index: number;
        constructor(line?: number, column?: number, index?: number);
    }
    class Range {
        source: string;
        start: Position;
        end: Position;
        constructor(source: string);
        length(): number;
    }
    enum Severity {
        Debug = 0,
        Info = 1,
        Warning = 2,
        Error = 3,
    }
    class Diagnostic {
        severity: Severity;
        range: Range;
        message: string;
        constructor(severity: Severity, range: Range, message: string);
    }
}
declare module wee {
    enum TokenType {
        IntegerLiteral = "IntegerLiteral",
        FloatLiteral = "FloatLiteral",
        StringLiteral = "StringLiteral",
        Identifier = "Identifier",
        Opcode = "Opcode",
        Register = "Register",
        Colon = "Colon",
        Coma = "Coma",
        EndOfFile = "EndOfFile",
    }
    class Token {
        range: Range;
        type: TokenType;
        value: string | number;
        constructor(range: Range, type: TokenType, value?: string | number);
    }
    class Tokenizer {
        private isDigit(char);
        private isAlpha(char);
        private isWhitespace(char);
        private getIdentifierType(identifier);
        tokenize(source: string): Token[];
    }
}
declare module wee.tests {
    function runTests(): void;
}
declare module wee {
    class VirtualMachine {
        memory: Uint32Array;
    }
}
