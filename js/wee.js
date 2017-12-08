var wee;
(function (wee) {
    var TokenStream = (function () {
        function TokenStream(tokens) {
            this.tokens = tokens;
            this.index = 0;
        }
        ;
        TokenStream.prototype.next = function () {
            return this.tokens[this.index++];
        };
        TokenStream.prototype.peek = function () {
            return this.tokens[this.index];
        };
        TokenStream.prototype.lookAhead = function (types) {
            if (types instanceof Array) {
                if (this.tokens.length - this.index < types.length)
                    return false;
                for (var i = this.index, j = 0; i < this.index + types.length; i++, j++) {
                    var type = types[j];
                    if (!(this.tokens[i].type == type))
                        return false;
                }
                return true;
            }
            else {
                if (this.index == this.tokens.length)
                    return false;
                return this.tokens[this.index].type == types;
            }
        };
        TokenStream.prototype.hasLeft = function (tokens) {
            return tokens <= this.tokens.length - this.index;
        };
        return TokenStream;
    }());
    var ParserResult = (function () {
        function ParserResult(instructions, labels, instructionToLabel, diagnostics) {
            this.instructions = instructions;
            this.labels = labels;
            this.instructionToLabel = instructionToLabel;
            this.diagnostics = diagnostics;
        }
        ;
        return ParserResult;
    }());
    wee.ParserResult = ParserResult;
    var Assembler = (function () {
        function Assembler() {
        }
        Assembler.prototype.assemble = function (source) {
            var tokens = new wee.Tokenizer().tokenize(source);
            var parserResult = this.parse(tokens);
            var code = this.emit(parserResult.instructions, parserResult.diagnostics);
            return code;
        };
        Assembler.prototype.parse = function (tokens) {
            var instructions = new Array();
            var diagnostics = new Array();
            var stream = new TokenStream(tokens);
            var labels = {};
            var instructionToLabel = {};
            while (true) {
                var token = stream.next();
                if (token.type == wee.TokenType.EndOfFile) {
                    break;
                }
                if (token.type == wee.TokenType.Identifier) {
                    if (!stream.lookAhead(wee.TokenType.Colon)) {
                        var otherToken = stream.next();
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, otherToken.range, "Expected a colon (:) after the label " + token.value + ", got " + otherToken.value));
                        break;
                    }
                    stream.next();
                    var label = new Label(token, instructions.length);
                    if (labels[token.value]) {
                        var otherLabel = labels[token.value];
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Label '" + token.value + " already defined on line " + otherLabel.token.range.start.line + "."));
                        break;
                    }
                    else {
                        labels[token.value] = label;
                    }
                    instructionToLabel[label.index] = label;
                    continue;
                }
                if (token.value == "byte" || token.value == "short" || token.value == "integer" || token.value == "float" || token.value == "string") {
                    if (!stream.hasLeft(1)) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Data definition is missing a value."));
                        break;
                    }
                    var literal = stream.next();
                    if ((token.value == "byte" || token.value == "short" || token.value == "integer") && literal.type != wee.TokenType.IntegerLiteral) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Defining " + token.value + " data requires an integer value (123, 0xff, 0b1101), got " + literal.value + "."));
                        break;
                    }
                    if (token.value == "float" && literal.type != wee.TokenType.FloatLiteral) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Defining " + token.value + " data requires a float value (123.456), got " + literal.value + "."));
                        break;
                    }
                    if (token.value == "string" && literal.type != wee.TokenType.StringLiteral) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Defining " + token.value + " data requires a string value (\"Hello world\"), got " + literal.value + "."));
                        break;
                    }
                    instructions.push(new Data(token, literal));
                    continue;
                }
                if (token.value == "halt") {
                    instructions.push(new Halt(token));
                    continue;
                }
                if (token.value == "cos_float" || token.value == "sin_float" ||
                    token.value == "sqrt_float" || token.value == "pow_float" ||
                    token.value == "convert_float_int" || token.value == "convert_int_float") {
                    if (!stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register])) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Arithmetic instruction " + token.value + " requires 2 register operands."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new ArithmeticInstruction(token, op1, op2, null));
                    continue;
                }
                if (token.value == "add" || token.value == "sub" || token.value == "mul" || token.value == "div" || token.value == "div_unsigned" ||
                    token.value == "remainder" || token.value == "remainder_unsigned" ||
                    token.value == "add_float" || token.value == "sub_float" || token.value == "mul_float" || token.value == "div_float" ||
                    token.value == "atan2_float" ||
                    token.value == "cmp" || token.value == "cmp_unsigned" || token.value == "fcmp") {
                    if (!stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register])) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Arithmetic instruction " + token.value + " requires 3 register operands."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    stream.next();
                    var op3 = stream.next();
                    instructions.push(new ArithmeticInstruction(token, op1, op2, op3));
                    continue;
                }
                if (token.value == "not") {
                    if (!stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register])) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Bit-wise instruction " + token.value + " requires 2 register operands."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new BitwiseInstruction(token, op1, op2, null));
                    continue;
                }
                if (token.value == "and" || token.value == "or" || token.value == "xor" ||
                    token.value == "shift_left" || token.value == "shift_right") {
                    if (!stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register])) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Bit-wise instruction " + token.value + " requires 2 register operands."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    stream.next();
                    var op3 = stream.next();
                    instructions.push(new BitwiseInstruction(token, op1, op2, op3));
                    continue;
                }
                if (token.value == "jump") {
                    if (!(stream.lookAhead(wee.TokenType.IntegerLiteral) || stream.lookAhead(wee.TokenType.Identifier))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Jump/branch instruction " + token.value + " requires an address as operand, e.g. 0xa000 or LABEL."));
                        break;
                    }
                    instructions.push(new JumpInstruction(token, stream.next(), null));
                    continue;
                }
                if (token.value == "jump_equal" || token.value == "jump_not_equal" || token.value == "jump_less" || token.value == "jump_greater" || token.value == "jump_less_equal" || token.value == "jump_greater_equal") {
                    if (!(stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) || stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Identifier]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Jump/branch instruction " + token.value + " requires one register operand holding the result of a comparison and an as address as the second operand, e.g. 0xa000 or LABEL."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new JumpInstruction(token, op1, op2));
                    continue;
                }
                if (token.value == "move") {
                    if (!(stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register]) ||
                        stream.lookAhead([wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.Register]) ||
                        stream.lookAhead([wee.TokenType.FloatLiteral, wee.TokenType.Coma, wee.TokenType.Register]) ||
                        stream.lookAhead([wee.TokenType.Identifier, wee.TokenType.Coma, wee.TokenType.Register]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Memory instruction " + token.value + " requires two register operands, or an int/float literal and a register operand, or a label and a register operand."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new MemoryInstruction(token, op1, op2, null));
                    continue;
                }
                if (token.value == "load" || token.value == "load_byte" || token.value == "load_short") {
                    if (!(stream.lookAhead([wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.Register]) ||
                        stream.lookAhead([wee.TokenType.Identifier, wee.TokenType.Coma, wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.Register]) ||
                        stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.Register]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Memory instruction " + token.value + " requires and address as an int literal, label or register, an offset as an int literal, and a register."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    stream.next();
                    var op3 = stream.next();
                    instructions.push(new MemoryInstruction(token, op1, op2, op3));
                    continue;
                }
                if (token.value == "store" || token.value == "store_byte" || token.value == "store_short") {
                    if (!(stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) ||
                        stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Identifier, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) ||
                        stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Memory instruction " + token.value + " requires a register, an address as an int literal, label or register, and an offset as an int literal."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    stream.next();
                    var op3 = stream.next();
                    instructions.push(new MemoryInstruction(token, op1, op2, op3));
                    continue;
                }
                if (token.value == "push" || token.value == "call") {
                    if (!(stream.lookAhead(wee.TokenType.Register) || stream.lookAhead(wee.TokenType.IntegerLiteral) || stream.lookAhead(wee.TokenType.FloatLiteral) || stream.lookAhead(wee.TokenType.Identifier))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Stack/call operation " + token.value + " requires a register, integer or float literal or label as operand"));
                        break;
                    }
                    instructions.push(new StackOrCallInstruction(token, stream.next()));
                    continue;
                }
                if (token.value == "pop") {
                    if (!(stream.lookAhead(wee.TokenType.Register) || stream.lookAhead(wee.TokenType.IntegerLiteral))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Stack/call operation " + token.value + " requires a register or integer literal as operand"));
                        break;
                    }
                    instructions.push(new StackOrCallInstruction(token, stream.next()));
                    continue;
                }
                if (token.value == "stackalloc" || token.value == "return") {
                    if (!stream.lookAhead(wee.TokenType.IntegerLiteral)) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Stack/call operation " + token.value + " requires an integer literal as operand"));
                        break;
                    }
                    instructions.push(new StackOrCallInstruction(token, stream.next()));
                    continue;
                }
                if (token.value == "port_write") {
                    if (!(stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) ||
                        stream.lookAhead([wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) ||
                        stream.lookAhead([wee.TokenType.FloatLiteral, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) ||
                        stream.lookAhead([wee.TokenType.Identifier, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Port operation " + token.value + " requires an integer or float literal or a label or a register as the first operand and an integer literal as the second operand."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new PortInstruction(token, op1, op2));
                    continue;
                }
                if (token.value == "port_read") {
                    if (!stream.lookAhead([wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.Register])) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Port operation " + token.value + " requires an integer literal as the first operand, and a register as the second operand."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new PortInstruction(token, op1, op2));
                    continue;
                }
                diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Expected a label, data definition or instruction, got " + token.value));
                break;
            }
            return new ParserResult(instructions, labels, instructionToLabel, diagnostics);
        };
        Assembler.prototype.emit = function (instructions, diagnostics) {
            return null;
        };
        return Assembler;
    }());
    wee.Assembler = Assembler;
    var Label = (function () {
        function Label(token, index) {
            this.token = token;
            this.index = index;
        }
        ;
        return Label;
    }());
    wee.Label = Label;
    ;
    var Data = (function () {
        function Data(type, value) {
            this.type = type;
            this.value = value;
        }
        ;
        return Data;
    }());
    wee.Data = Data;
    var Halt = (function () {
        function Halt(token) {
            this.token = token;
        }
        ;
        return Halt;
    }());
    wee.Halt = Halt;
    var ArithmeticInstruction = (function () {
        function ArithmeticInstruction(operation, operand1, operand2, operand3) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        ;
        return ArithmeticInstruction;
    }());
    wee.ArithmeticInstruction = ArithmeticInstruction;
    var BitwiseInstruction = (function () {
        function BitwiseInstruction(operation, operand1, operand2, operand3) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        ;
        return BitwiseInstruction;
    }());
    wee.BitwiseInstruction = BitwiseInstruction;
    var JumpInstruction = (function () {
        function JumpInstruction(branchType, operand1, operand2) {
            this.branchType = branchType;
            this.operand2 = operand2;
        }
        ;
        return JumpInstruction;
    }());
    wee.JumpInstruction = JumpInstruction;
    var MemoryInstruction = (function () {
        function MemoryInstruction(operation, operand1, operand2, operand3) {
            this.operation = operation;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        ;
        return MemoryInstruction;
    }());
    wee.MemoryInstruction = MemoryInstruction;
    var StackOrCallInstruction = (function () {
        function StackOrCallInstruction(operation, operand1) {
            this.operation = operation;
            this.operand1 = operand1;
        }
        ;
        return StackOrCallInstruction;
    }());
    wee.StackOrCallInstruction = StackOrCallInstruction;
    var PortInstruction = (function () {
        function PortInstruction(operation, operand1, operand2) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
        }
        ;
        return PortInstruction;
    }());
    wee.PortInstruction = PortInstruction;
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
            testLexer();
            testParser();
        }
        tests.runTests = runTests;
        function testLexer() {
            try {
                var tokenizer = new wee.Tokenizer();
                console.log(tokenizer.tokenize("\n\t\t\t\tSTRING: \"This is a test.\\nWith a new line.\"\n\t\t\t\tINTEGER: 234234\n\t\t\t\tNEGATIVEINTEGER: -234234\n\t\t\t\tFLOAT: 2.3423\n\t\t\t\tNEGATIVEFLOAT: -324.3242\n\t\t\t\tBINARY: 0b0110101\n\t\t\t\tHEX: 0xffeeff\n\n\t\t\t\t# This is a comment\n\t\t\t\tload LABEL, r0\n\t\t\t\tmove 123,\n\t\t\t\t# eol comment\n\t\t\t\t_41546546"));
            }
            catch (e) {
                var diagnostic = e;
                console.log(diagnostic.toString());
            }
        }
        function testParser() {
            try {
                var assembler = new wee.Assembler();
                var parserResult = assembler.parse(new wee.Tokenizer().tokenize("\n\t\t\t\thelloWorld: string \"Hello world\"\n\t\t\t\tmove 10, r0\n\t\t\t\tmove 1, r1\n\t\t\t\tloop:\n\t\t\t\t\tsub r0, r1, r0\n\t\t\t\t\tmove 0, r2\n\t\t\t\t\tcmp r0, r2, r2\n\t\t\t\t\tjump_not_equal r2, loop\n\t\t\t\t# end loop\n\t\t\t\thalt\n\t\t\t"));
                for (var i = 0; i < parserResult.diagnostics.length; i++) {
                    console.log(parserResult.diagnostics[i].toString());
                }
            }
            catch (e) {
                console.log(e);
            }
        }
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