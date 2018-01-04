declare module wee {
    interface StringMap<V> {
        [key: string]: V;
    }
    interface IndexedMap<V> {
        [key: number]: V;
    }
    class ParserResult {
        instructions: Array<Instruction>;
        labels: StringMap<Label>;
        diagnostics: Array<Diagnostic>;
        constructor(instructions: Array<Instruction>, labels: StringMap<Label>, diagnostics: Array<Diagnostic>);
    }
    class AssemblerResult {
        code: Uint8Array;
        instructions: Array<Instruction>;
        labels: StringMap<Label>;
        patches: Array<Patch>;
        diagnostics: Array<Diagnostic>;
        constructor(code: Uint8Array, instructions: Array<Instruction>, labels: StringMap<Label>, patches: Array<Patch>, diagnostics: Array<Diagnostic>);
    }
    class Assembler {
        assemble(source: string): AssemblerResult;
        parse(tokens: Array<Token>): ParserResult;
        emit(instructions: Array<Instruction>, labels: StringMap<Label>, diagnostics: Array<Diagnostic>): AssemblerResult;
        static getRegisterIndex(reg: Token): number;
        static encodeOpRegRegReg(op: number, reg1: number, reg2: number, reg3: number): number;
        static encodeOpRegNum(op: number, reg: number, num: number): number;
        static encodeOpRegRegNum(op: number, reg1: number, reg2: number, num: number): number;
    }
    class Patch {
        address: number;
        label: Token;
        constructor(address: number, label: Token);
    }
    class Label {
        token: Token;
        instructionIndex: number;
        constructor(token: Token, instructionIndex: number);
    }
    interface Instruction {
        address: number;
        emit(view: DataView, address: number, patches: Array<Patch>, diagnostics: Array<Diagnostic>): number;
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
        Debug,
        Info,
        Warning,
        Error,
    }
    class Diagnostic {
        severity: Severity;
        range: Range;
        message: string;
        constructor(severity: Severity, range: Range, message: string);
        toString(): string;
    }
}
declare module wee {
    enum TokenType {
        IntegerLiteral,
        FloatLiteral,
        StringLiteral,
        Identifier,
        Opcode,
        Keyword,
        Register,
        Colon,
        Coma,
        EndOfFile,
    }
    class Token {
        range: Range;
        type: TokenType;
        value: string | number;
        constructor(range: Range, type: TokenType, value?: string | number);
    }
    class Tokenizer {
        private isDigit(char);
        private isHexDigit(char);
        private isBinaryDigit(char);
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
    }
}
