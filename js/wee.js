var wee;
(function (wee) {
    var Assembler = (function () {
        function Assembler() {
        }
        Assembler.prototype.assemble = function (source) {
            var tokens = new wee.Tokenizer().tokenize(source);
        };
        Assembler.prototype.parse = function (tokens) {
            var instructions = new Array();
            return instructions;
        };
        return Assembler;
    }());
    wee.Assembler = Assembler;
    var Instruction = (function () {
        function Instruction() {
        }
        return Instruction;
    }());
    wee.Instruction = Instruction;
})(wee || (wee = {}));
var wee;
(function (wee) {
    var Position = (function () {
        function Position(line, column, index) {
            if (line === void 0) { line = 0; }
            if (column === void 0) { column = 0; }
            if (index === void 0) { index = 0; }
            this.line = line;
            this.column = column;
            this.index = index;
        }
        return Position;
    }());
    wee.Position = Position;
    var Range = (function () {
        function Range(source) {
            this.source = source;
            this.start = new Position();
            this.end = new Position();
        }
        ;
        Range.prototype.length = function () {
            return this.end.index - this.start.index;
        };
        return Range;
    }());
    wee.Range = Range;
    var Severity;
    (function (Severity) {
        Severity["Debug"] = "Debug";
        Severity["Info"] = "Info";
        Severity["Warning"] = "Warning";
        Severity["Error"] = "Error";
    })(Severity = wee.Severity || (wee.Severity = {}));
    var Diagnostic = (function () {
        function Diagnostic(severity, range, message) {
            this.severity = severity;
            this.range = range;
            this.message = message;
        }
        ;
        Diagnostic.prototype.toString = function () {
            var lines = this.range.source.split(/\r?\n/);
            var result = this.severity + " (" + this.range.start.line + "):" + this.range.start.column + ": " + this.message + "\n\n    ";
            var line = lines[this.range.start.line - 1];
            result += line + "\n    ";
            var startColumn = this.range.start.column;
            var endColumn = this.range.start.line != this.range.end.line ? line.length : this.range.end.column;
            for (var i = 1; i <= line.length; i++) {
                if (i >= startColumn && i < endColumn) {
                    result += "~";
                }
                else {
                    result += line.charAt(i - 1) == '\t' ? '\t' : ' ';
                }
            }
            result += "\n";
            return result;
        };
        return Diagnostic;
    }());
    wee.Diagnostic = Diagnostic;
})(wee || (wee = {}));
var wee;
(function (wee) {
    var TokenType;
    (function (TokenType) {
        TokenType["IntegerLiteral"] = "IntegerLiteral";
        TokenType["FloatLiteral"] = "FloatLiteral";
        TokenType["StringLiteral"] = "StringLiteral";
        TokenType["Identifier"] = "Identifier";
        TokenType["Opcode"] = "Opcode";
        TokenType["Keyword"] = "Keyword";
        TokenType["Register"] = "Register";
        TokenType["Colon"] = "Colon";
        TokenType["Coma"] = "Coma";
        TokenType["EndOfFile"] = "EndOfFile";
    })(TokenType = wee.TokenType || (wee.TokenType = {}));
    var Token = (function () {
        function Token(range, type, value) {
            if (value === void 0) { value = null; }
            this.range = range;
            this.type = type;
            this.value = value;
        }
        return Token;
    }());
    wee.Token = Token;
    var CharacterStream = (function () {
        function CharacterStream(source) {
            this.source = source;
            this.index = 0;
            this.line = 1;
            this.column = 1;
        }
        CharacterStream.prototype.peek = function () {
            return this.source.charAt(this.index);
        };
        CharacterStream.prototype.next = function () {
            var char = this.source.charAt(this.index);
            this.index++;
            this.column++;
            if (char == "\n") {
                this.line++;
                this.column = 1;
            }
            console.log(this.line + ":" + this.column + ":" + char);
            return char;
        };
        CharacterStream.prototype.startRange = function () {
            var range = new wee.Range(this.source);
            range.start.line = this.line;
            range.start.column = this.column;
            range.start.index = this.index;
            this.range = range;
        };
        CharacterStream.prototype.endRange = function () {
            var range = this.range;
            range.end.line = this.line;
            range.end.column = this.column;
            range.end.index = this.index;
            this.range = null;
            return range;
        };
        return CharacterStream;
    }());
    var OPCODES = [
        "halt",
        "add", "sub", "mul", "div", "div_unsigned", "remainder", "remainder_unsigned", "add_float", "sub_float", "mul_float", "div_float", "cos_float", "sin_float", "atan2_float", "sqrt_float", "pow_float", "convert_int_float", "convert_float_int", "cmp", "cmp_unsigned", "fcmp",
        "not", "and", "or", "xor", "shift_left", "shift_right",
        "jump", "jump_equal", "jump_not_equal", "jump_less", "jump_greater", "jump_less_equal", "jump_greater_equal",
        "move", "load", "store", "load_byte", "store_byte", "load_short", "store_short",
        "push", "stackalloc", "pop", "call", "return",
        "port_write", "port_read"
    ];
    var KEYWORDS = [
        "byte", "short", "integer", "float", "string"
    ];
    var REGISTERS = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12", "r13", "pc", "sp"];
    var Tokenizer = (function () {
        function Tokenizer() {
        }
        Tokenizer.prototype.isDigit = function (char) {
            return char >= '0' && char <= '9';
        };
        Tokenizer.prototype.isHexDigit = function (char) {
            var lowerCase = char.toLowerCase();
            return this.isDigit(char) || lowerCase >= 'a' && lowerCase <= 'f';
        };
        Tokenizer.prototype.isBinaryDigit = function (char) {
            return char >= '0' && char <= '1';
        };
        Tokenizer.prototype.isAlpha = function (char) {
            var lowerCase = char.toLowerCase();
            return lowerCase >= 'a' && lowerCase <= 'z';
        };
        Tokenizer.prototype.isWhitespace = function (char) {
            return char == ' ' || char == '\n' || char == '\r' || char == '\t';
        };
        Tokenizer.prototype.getIdentifierType = function (identifier) {
            for (var i = 0; i < OPCODES.length; i++) {
                if (identifier == OPCODES[i])
                    return TokenType.Opcode;
            }
            for (var i = 0; i < KEYWORDS.length; i++) {
                if (identifier == KEYWORDS[i])
                    return TokenType.Keyword;
            }
            for (var i = 0; i < REGISTERS.length; i++) {
                if (identifier == REGISTERS[i])
                    return TokenType.Register;
            }
            return TokenType.Identifier;
        };
        Tokenizer.prototype.tokenize = function (source) {
            var tokens = new Array();
            var stream = new CharacterStream(source);
            while (true) {
                stream.startRange();
                var char = stream.next();
                if (char.length == 0) {
                    tokens.push(new Token(stream.endRange(), TokenType.EndOfFile));
                    break;
                }
                if (this.isWhitespace(char)) {
                    while (this.isWhitespace(stream.peek())) {
                        stream.next();
                    }
                    stream.endRange();
                    continue;
                }
                if (char == ':') {
                    tokens.push(new Token(stream.endRange(), TokenType.Colon, ":"));
                    continue;
                }
                if (char == ',') {
                    tokens.push(new Token(stream.endRange(), TokenType.Coma, ","));
                    continue;
                }
                if (char == '0' && stream.peek() == 'x') {
                    stream.next();
                    var number = "";
                    while (this.isHexDigit(stream.peek())) {
                        number += stream.next();
                    }
                    if (number == "") {
                        throw new wee.Diagnostic(wee.Severity.Error, stream.endRange(), "Expected a hex number (0xffa12)");
                    }
                    tokens.push(new Token(stream.endRange(), TokenType.IntegerLiteral, parseInt(number, 16)));
                    continue;
                }
                if (char == '0' && stream.peek() == 'b') {
                    stream.next();
                    var number = "";
                    while (this.isBinaryDigit(stream.peek())) {
                        number += stream.next();
                    }
                    if (number == "") {
                        throw new wee.Diagnostic(wee.Severity.Error, stream.endRange(), "Expected a binary number (0b010111)");
                    }
                    tokens.push(new Token(stream.endRange(), TokenType.IntegerLiteral, parseInt(number, 2)));
                    continue;
                }
                if (char == '-' || this.isDigit(char)) {
                    var number = char;
                    var isFloat = false;
                    while (this.isDigit(stream.peek())) {
                        number += stream.next();
                    }
                    if (stream.peek() == '.') {
                        isFloat = true;
                        number += stream.next();
                        while (this.isDigit(stream.peek())) {
                            number += stream.next();
                        }
                    }
                    if (number == '-') {
                        throw new wee.Diagnostic(wee.Severity.Error, stream.endRange(), "Expected a negative number (-1234)");
                    }
                    tokens.push(new Token(stream.endRange(), isFloat ? TokenType.FloatLiteral : TokenType.IntegerLiteral, number));
                    continue;
                }
                if (char == '_' || this.isAlpha(char)) {
                    var identifier = char;
                    while (this.isAlpha(stream.peek()) || this.isDigit(stream.peek()) || stream.peek() == '_') {
                        identifier += stream.next();
                    }
                    tokens.push(new Token(stream.endRange(), this.getIdentifierType(identifier), identifier));
                    continue;
                }
                if (char == '"') {
                    var string = char;
                    while (true) {
                        char = stream.next();
                        if (char == '\\') {
                            var special = stream.next();
                            if (special == '\\') {
                                string += special;
                            }
                            else if (special == "n") {
                                string += "\n";
                            }
                            else if (special == "r") {
                                string += "\r";
                            }
                            else if (special == "t") {
                                string += "\t";
                            }
                            else if (special == "\"") {
                                string += '"';
                            }
                            else {
                                string += "\\" + special;
                            }
                        }
                        else if (char == "\"") {
                            break;
                        }
                        else if (char.length == 0) {
                            throw new wee.Diagnostic(wee.Severity.Error, stream.endRange(), "Expected closing \" character for string");
                        }
                        else {
                            string += char;
                        }
                    }
                    tokens.push(new Token(stream.endRange(), TokenType.StringLiteral, string));
                    continue;
                }
                if (char == '#') {
                    while (stream.peek() != '\n' && stream.peek().length > 0) {
                        stream.next();
                    }
                    continue;
                }
                throw new wee.Diagnostic(wee.Severity.Error, stream.endRange(), "Expected a colon (:), coma (,), number (123.2), identifier (myLabel) or keyword (move, r1)! Got '" + char + "'");
            }
            return tokens;
        };
        return Tokenizer;
    }());
    wee.Tokenizer = Tokenizer;
})(wee || (wee = {}));
var wee;
(function (wee) {
    var tests;
    (function (tests) {
        function runTests() {
            try {
                var tokenizer = new wee.Tokenizer();
                console.log(tokenizer.tokenize("\n\t\t\t\tSTRING: \"This is a test.\\nWith a new line.\"\n\t\t\t\tINTEGER: 234234\n\t\t\t\tNEGATIVEINTEGER: -234234\n\t\t\t\tFLOAT: 2.3423\n\t\t\t\tNEGATIVEFLOAT: -324.3242\n\t\t\t\tBINARY: 0b0110101\n\t\t\t\tHEX: 0xffeeff\n\n\t\t\t\t# This is a comment\n\t\t\t\tload LABEL, r0\n\t\t\t\tmove 123,\n\t\t\t\t# eol comment\n\t\t\t\t_41546546"));
            }
            catch (e) {
                var diagnostic = e;
                console.log(diagnostic.toString());
            }
        }
        tests.runTests = runTests;
    })(tests = wee.tests || (wee.tests = {}));
})(wee || (wee = {}));
var wee;
(function (wee) {
    var VirtualMachine = (function () {
        function VirtualMachine() {
            this.memory = new Uint32Array(1024 * 1024 * 16);
        }
        return VirtualMachine;
    }());
    wee.VirtualMachine = VirtualMachine;
})(wee || (wee = {}));
//# sourceMappingURL=wee.js.map