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
        instructionToLabel: IndexedMap<Label>;
        diagnostics: Array<Diagnostic>;
        constructor(instructions: Array<Instruction>, labels: StringMap<Label>, instructionToLabel: IndexedMap<Label>, diagnostics: Array<Diagnostic>);
    }
    class Assembler {
        assemble(source: string): Uint8Array;
        parse(tokens: Array<Token>): ParserResult;
        emit(instructions: Array<Instruction>, diagnostics: Array<Diagnostic>): Uint8Array;
    }
    class Label {
        token: Token;
        index: number;
        constructor(token: Token, index: number);
    }
    interface Instruction {
    }
    class Data implements Instruction {
        type: Token;
        value: Token;
        constructor(type: Token, value: Token);
    }
    class Halt implements Instruction {
        token: Token;
        constructor(token: Token);
    }
    class ArithmeticInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        operand2: Token;
        operand3: Token;
        constructor(operation: Token, operand1: Token, operand2: Token, operand3: Token);
    }
    class BitwiseInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        operand2: Token;
        operand3: Token;
        constructor(operation: Token, operand1: Token, operand2: Token, operand3: Token);
    }
    class JumpInstruction implements Instruction {
        branchType: Token;
        operand2: Token;
        constructor(branchType: Token, operand1: Token, operand2: Token);
    }
    class MemoryInstruction implements Instruction {
        operation: Token;
        operand2: Token;
        operand3: Token;
        constructor(operation: Token, operand1: Token, operand2: Token, operand3: Token);
    }
    class StackOrCallInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        constructor(operation: Token, operand1: Token);
    }
    class PortInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        operand2: Token;
        constructor(operation: Token, operand1: Token, operand2: Token);
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
        Debug = "Debug",
        Info = "Info",
        Warning = "Warning",
        Error = "Error",
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
        IntegerLiteral = "IntegerLiteral",
        FloatLiteral = "FloatLiteral",
        StringLiteral = "StringLiteral",
        Identifier = "Identifier",
        Opcode = "Opcode",
        Keyword = "Keyword",
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
        memory: Uint32Array;
    }
}
