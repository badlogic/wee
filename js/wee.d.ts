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
        static getRegisterIndex(reg: Token): number;
        static encodeOpRegRegReg(op: number, reg1: number, reg2: number, reg3: number): number;
        static encodeOpRegNum(op: number, reg: number, num: number): number;
        static encodeOpRegRegNum(op: number, reg1: number, reg2: number, num: number): number;
    }
    class Label {
        token: Token;
        index: number;
        constructor(token: Token, index: number);
    }
    interface Instruction {
        address: number;
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class Data implements Instruction {
        type: Token;
        value: Token;
        address: number;
        constructor(type: Token, value: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class Halt implements Instruction {
        token: Token;
        address: number;
        constructor(token: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class ArithmeticInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        operand2: Token;
        operand3: Token;
        address: number;
        constructor(operation: Token, operand1: Token, operand2: Token, operand3: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class BitwiseInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        operand2: Token;
        operand3: Token;
        address: number;
        constructor(operation: Token, operand1: Token, operand2: Token, operand3: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class JumpInstruction implements Instruction {
        branchType: Token;
        operand1: Token;
        operand2: Token;
        address: number;
        constructor(branchType: Token, operand1: Token, operand2: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class MemoryInstruction implements Instruction {
        operation: Token;
        operand2: Token;
        operand3: Token;
        address: number;
        constructor(operation: Token, operand1: Token, operand2: Token, operand3: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class StackOrCallInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        address: number;
        constructor(operation: Token, operand1: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
    }
    class PortInstruction implements Instruction {
        operation: Token;
        operand1: Token;
        operand2: Token;
        address: number;
        constructor(operation: Token, operand1: Token, operand2: Token);
        emit(view: DataView, address: number, diagnostics: Array<Diagnostic>): number;
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
    }
}
