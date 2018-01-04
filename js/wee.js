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
        function ParserResult(instructions, labels, diagnostics) {
            this.instructions = instructions;
            this.labels = labels;
            this.diagnostics = diagnostics;
        }
        ;
        return ParserResult;
    }());
    wee.ParserResult = ParserResult;
    var AssemblerResult = (function () {
        function AssemblerResult(code, instructions, labels, patches, diagnostics) {
            this.code = code;
            this.instructions = instructions;
            this.labels = labels;
            this.patches = patches;
            this.diagnostics = diagnostics;
        }
        ;
        return AssemblerResult;
    }());
    wee.AssemblerResult = AssemblerResult;
    var Assembler = (function () {
        function Assembler() {
        }
        Assembler.prototype.assemble = function (source) {
            var tokens = new wee.Tokenizer().tokenize(source);
            var parserResult = this.parse(tokens);
            return this.emit(parserResult.instructions, parserResult.labels, parserResult.diagnostics);
        };
        Assembler.prototype.parse = function (tokens) {
            var instructions = new Array();
            var diagnostics = new Array();
            var stream = new TokenStream(tokens);
            var labels = {};
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
                        stream.lookAhead([wee.TokenType.Identifier, wee.TokenType.Coma, wee.TokenType.IntegerLiteral]) ||
                        stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Port operation " + token.value + " requires an integer or float literal or a label or a register as the first operand and an integer literal or a register as the second operand."));
                        break;
                    }
                    var op1 = stream.next();
                    stream.next();
                    var op2 = stream.next();
                    instructions.push(new PortInstruction(token, op1, op2));
                    continue;
                }
                if (token.value == "port_read") {
                    if (!(stream.lookAhead([wee.TokenType.IntegerLiteral, wee.TokenType.Coma, wee.TokenType.Register]) ||
                        stream.lookAhead([wee.TokenType.Register, wee.TokenType.Coma, wee.TokenType.Register]))) {
                        diagnostics.push(new wee.Diagnostic(wee.Severity.Error, token.range, "Port operation " + token.value + " requires an integer literal or register as the first operand, and a register as the second operand."));
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
            return new ParserResult(instructions, labels, diagnostics);
        };
        Assembler.prototype.emit = function (instructions, labels, diagnostics) {
            var buffer = new ArrayBuffer(16 * 1024 * 1024);
            var view = new DataView(buffer);
            var address = 0;
            var patches = new Array();
            for (var i = 0; i < instructions.length; i++) {
                var instruction = instructions[i];
                address = instruction.emit(view, address, patches, diagnostics);
            }
            for (var i = 0; i < patches.length; i++) {
                var patch = patches[i];
                var label = labels[patch.label.value];
                if (label) {
                    var address_1 = instructions[label.instructionIndex].address;
                    view.setUint32(patch.address, address_1);
                }
            }
            return new AssemblerResult(new Uint8Array(buffer), instructions, labels, patches, diagnostics);
        };
        Assembler.getRegisterIndex = function (reg) {
            if (reg.type != wee.TokenType.Register)
                throw new Error("Unexpected token type " + reg.type + "!");
            if (reg.value == "pc")
                return 14;
            if (reg.value == "sp")
                return 15;
            var index = parseInt(reg.value.substr(1));
            if (index < 0 || index > 15)
                throw new Error("Unknown register name " + reg.value);
            return index;
        };
        Assembler.encodeOpRegRegReg = function (op, reg1, reg2, reg3) {
            return (op & 0x1f) |
                ((reg1 & 0xf) << 6) |
                ((reg2 & 0xf) << 10) |
                ((reg3 & 0xf) << 14);
        };
        Assembler.encodeOpRegNum = function (op, reg, num) {
            return (op & 0x1f) |
                ((reg & 0xf) << 6) |
                ((num & 0x3fffff) << 10);
        };
        Assembler.encodeOpRegRegNum = function (op, reg1, reg2, num) {
            return (op & 0x1f) |
                ((reg1 & 0xf) << 6) |
                ((reg2 & 0xf) << 10) |
                ((num & 0x3ffff) << 14);
        };
        return Assembler;
    }());
    wee.Assembler = Assembler;
    var Patch = (function () {
        function Patch(address, label) {
            this.address = address;
            this.label = label;
        }
        ;
        return Patch;
    }());
    wee.Patch = Patch;
    var Label = (function () {
        function Label(token, instructionIndex) {
            this.token = token;
            this.instructionIndex = instructionIndex;
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
        Data.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            if (this.type.value == "byte") {
                view.setUint8(address++, this.value.value & 0xff);
                return address;
            }
            if (this.type.value == "short") {
                view.setUint16(address, this.value.value & 0xffff);
                address += 2;
                return address;
            }
            if (this.type.value == "integer") {
                view.setUint32(address, this.value.value & 0xffffffff);
                address += 4;
                return address;
            }
            if (this.type.value == "float") {
                view.setFloat32(address, this.value.value);
                address += 4;
                return address;
            }
            if (this.type.value == "string") {
                var string = this.value.value;
                for (var i = 0; i < string.length; i++) {
                    view.setUint8(address++, string.charCodeAt(i) & 0xff);
                }
                view.setUint8(address++, 0);
                return address;
            }
            diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.type.range, "Unknown data type " + this.type.value + "."));
        };
        return Data;
    }());
    var Halt = (function () {
        function Halt(token) {
            this.token = token;
        }
        ;
        Halt.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            view.setUint32(address, 0);
            return address + 4;
        };
        return Halt;
    }());
    var ArithmeticInstruction = (function () {
        function ArithmeticInstruction(operation, operand1, operand2, operand3) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        ;
        ArithmeticInstruction.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            var op1 = Assembler.getRegisterIndex(this.operand1);
            var op2 = Assembler.getRegisterIndex(this.operand2);
            var op3 = this.operand3 ? Assembler.getRegisterIndex(this.operand3) : 0;
            var opcode = 0;
            if (this.operation.value == "add")
                opcode = 0x01;
            else if (this.operation.value == "sub")
                opcode = 0x02;
            else if (this.operation.value == "mul")
                opcode = 0x03;
            else if (this.operation.value == "div")
                opcode = 0x04;
            else if (this.operation.value == "div_unsigned")
                opcode = 0x05;
            else if (this.operation.value == "remainder")
                opcode = 0x06;
            else if (this.operation.value == "remainder_unsigned")
                opcode = 0x07;
            else if (this.operation.value == "add_float")
                opcode = 0x08;
            else if (this.operation.value == "sub_float")
                opcode = 0x09;
            else if (this.operation.value == "mul_float")
                opcode = 0x0a;
            else if (this.operation.value == "div_float")
                opcode = 0x0b;
            else if (this.operation.value == "cos_float")
                opcode = 0x0c;
            else if (this.operation.value == "sin_float")
                opcode = 0x0d;
            else if (this.operation.value == "atan2_float")
                opcode = 0x0e;
            else if (this.operation.value == "sqrt_float")
                opcode = 0x0f;
            else if (this.operation.value == "pow_float")
                opcode = 0x10;
            else if (this.operation.value == "convert_int_float")
                opcode = 0x11;
            else if (this.operation.value == "convert_float_int")
                opcode = 0x12;
            else if (this.operation.value == "cmp")
                opcode = 0x13;
            else if (this.operation.value == "cmp_unsigned")
                opcode = 0x14;
            else if (this.operation.value == "fcmp")
                opcode = 0x15;
            else {
                diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Unknown arithmetic instruction " + this.operation.value));
                return address;
            }
            view.setUint32(address, Assembler.encodeOpRegRegReg(opcode, op1, op2, op3));
            return address + 4;
        };
        return ArithmeticInstruction;
    }());
    var BitwiseInstruction = (function () {
        function BitwiseInstruction(operation, operand1, operand2, operand3) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        ;
        BitwiseInstruction.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            var op1 = Assembler.getRegisterIndex(this.operand1);
            var op2 = Assembler.getRegisterIndex(this.operand2);
            var op3 = this.operand3 ? Assembler.getRegisterIndex(this.operand3) : 0;
            var opcode = 0;
            if (this.operation.value == "not")
                opcode = 0x16;
            else if (this.operation.value == "and")
                opcode = 0x17;
            else if (this.operation.value == "or")
                opcode = 0x18;
            else if (this.operation.value == "xor")
                opcode = 0x19;
            else if (this.operation.value == "shift_left")
                opcode = 0x1a;
            else if (this.operation.value == "shift_right")
                opcode = 0x1b;
            else {
                diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Unknown bit-wise instruction " + this.operation.value));
                return address;
            }
            view.setUint32(address, Assembler.encodeOpRegRegReg(opcode, op1, op2, op3));
            return address + 4;
        };
        return BitwiseInstruction;
    }());
    var JumpInstruction = (function () {
        function JumpInstruction(branchType, operand1, operand2) {
            this.branchType = branchType;
            this.operand1 = operand1;
            this.operand2 = operand2;
        }
        ;
        JumpInstruction.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            if (this.branchType.value == "jump") {
                view.setUint32(address, 0x1c);
                address += 4;
                if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                    view.setUint32(address, this.operand1.value);
                }
                else {
                    view.setUint32(address, 0xdeadbeaf);
                    patches.push(new Patch(address, this.operand1));
                }
                return address + 4;
            }
            else {
                var op1 = Assembler.getRegisterIndex(this.operand1);
                var opcode = 0;
                if (this.branchType.value == "jump_equal")
                    opcode = 0x1d;
                else if (this.branchType.value == "jump_not_equal")
                    opcode = 0x1e;
                else if (this.branchType.value == "jump_less")
                    opcode = 0x1f;
                else if (this.branchType.value == "jump_greater")
                    opcode = 0x20;
                else if (this.branchType.value == "jump_less_equal")
                    opcode = 0x21;
                else if (this.branchType.value == "jump_greater_equal")
                    opcode = 0x22;
                else {
                    diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.branchType.range, "Unknown jump/branch instruction " + this.branchType.value));
                    return address;
                }
                view.setUint32(address, Assembler.encodeOpRegNum(opcode, op1, 0));
                address += 4;
                if (this.operand2.type == wee.TokenType.IntegerLiteral) {
                    view.setUint32(address, this.operand2.value);
                }
                else {
                    view.setUint32(address, 0xdeadbeaf);
                    patches.push(new Patch(address, this.operand2));
                }
                return address + 4;
            }
        };
        return JumpInstruction;
    }());
    var MemoryInstruction = (function () {
        function MemoryInstruction(operation, operand1, operand2, operand3) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
            this.operand3 = operand3;
        }
        ;
        MemoryInstruction.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            if (this.operation.value == "move") {
                var op2 = Assembler.getRegisterIndex(this.operand2);
                if (this.operand1.type == wee.TokenType.Register) {
                    var op1 = Assembler.getRegisterIndex(this.operand1);
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x23, op1, op2, 0));
                }
                else if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                    var op1 = this.operand1.value;
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x24, 0, op2, 0));
                    address += 4;
                    view.setUint32(address, op1);
                }
                else if (this.operand1.type == wee.TokenType.FloatLiteral) {
                    var op1 = this.operand1.value;
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x24, 0, op2, 0));
                    address += 4;
                    view.setFloat32(address, op1);
                }
                else if (this.operand1.type == wee.TokenType.Identifier) {
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x24, 0, op2, 0));
                    address += 4;
                    view.setUint32(address, 0xdeadbeaf);
                    patches.push(new Patch(address, this.operand1));
                }
                else {
                    diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Memory instruction " + this.operation.value + " only operates on registers, float literals, integer litaterals or labels"));
                    return address;
                }
            }
            else if (this.operation.value == "load" || this.operation.value == "load_byte" || this.operation.value == "load_short") {
                var offset = this.operand2.value;
                var op2 = Assembler.getRegisterIndex(this.operand3);
                if (this.operand1.type == wee.TokenType.Register) {
                    var op1 = Assembler.getRegisterIndex(this.operand1);
                    var opcode = 0;
                    if (this.operation.value == "load")
                        opcode = 0x26;
                    else if (this.operation.value == "load_byte")
                        opcode = 0x2a;
                    else if (this.operation.value == "load_short")
                        opcode = 0x2e;
                    view.setUint32(address, Assembler.encodeOpRegRegNum(opcode, op1, op2, offset));
                }
                else if (this.operand1.type == wee.TokenType.IntegerLiteral || this.operand1.type == wee.TokenType.Identifier) {
                    var opcode = 0;
                    if (this.operation.value == "load")
                        opcode = 0x25;
                    else if (this.operation.value == "load_byte")
                        opcode = 0x29;
                    else if (this.operation.value == "load_short")
                        opcode = 0x2d;
                    view.setUint32(address, Assembler.encodeOpRegRegNum(opcode, 0, op2, offset));
                    address += 4;
                    if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                        var op1 = this.operand1.value;
                        view.setUint32(address, op1);
                    }
                    else {
                        view.setUint32(address, 0xdeadbeaf);
                        patches.push(new Patch(address, this.operand1));
                    }
                }
                else {
                    diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Memory instruction " + this.operation.value + " only operates on registers, integer litaterals or labels"));
                    return address;
                }
            }
            else if (this.operation.value == "store" || this.operation.value == "store_byte" || this.operation.value == "store_short") {
                var offset = this.operand3.value;
                var op1 = Assembler.getRegisterIndex(this.operand1);
                if (this.operand2.type == wee.TokenType.Register) {
                    var op2 = Assembler.getRegisterIndex(this.operand2);
                    var opcode = 0;
                    if (this.operation.value == "store")
                        opcode = 0x28;
                    else if (this.operation.value == "store_byte")
                        opcode = 0x2c;
                    else if (this.operation.value == "store_short")
                        opcode = 0x30;
                    view.setUint32(address, Assembler.encodeOpRegRegNum(opcode, op1, op2, offset));
                }
                else if (this.operand2.type == wee.TokenType.IntegerLiteral || this.operand2.type == wee.TokenType.Identifier) {
                    var opcode = 0;
                    if (this.operation.value == "store")
                        opcode = 0x27;
                    else if (this.operation.value == "store_byte")
                        opcode = 0x2b;
                    else if (this.operation.value == "store_short")
                        opcode = 0x2f;
                    view.setUint32(address, Assembler.encodeOpRegRegNum(opcode, op1, 0, offset));
                    address += 4;
                    if (this.operand2.type == wee.TokenType.IntegerLiteral) {
                        var op2 = this.operand2.value;
                        view.setUint32(address, op2);
                    }
                    else {
                        view.setUint32(address, 0xdeadbeaf);
                        patches.push(new Patch(address, this.operand2));
                    }
                }
                else {
                    diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Memory instruction " + this.operation.value + " only operates on registers, integer litaterals or labels"));
                    return address;
                }
            }
            else {
                diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Unknown memory instruction " + this.operation.value + "."));
                return address;
            }
            return address + 4;
        };
        return MemoryInstruction;
    }());
    var StackOrCallInstruction = (function () {
        function StackOrCallInstruction(operation, operand1) {
            this.operation = operation;
            this.operand1 = operand1;
        }
        ;
        StackOrCallInstruction.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            if (this.operation.value == "push") {
                if (this.operand1.type == wee.TokenType.Register) {
                    var register = Assembler.getRegisterIndex(this.operand1);
                    view.setUint32(address, Assembler.encodeOpRegNum(0x32, register, 0));
                }
                else if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x31, 0, 0));
                    address += 4;
                    view.setUint32(address, this.operand1.value);
                }
                else if (this.operand1.type == wee.TokenType.FloatLiteral) {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x31, 0, 0));
                    address += 4;
                    view.setFloat32(address, this.operand1.value);
                }
                else if (this.operand1.type == wee.TokenType.Identifier) {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x31, 0, 0));
                    address += 4;
                    view.setUint32(address, 0xdeadbeaf);
                    patches.push(new Patch(address, this.operand1));
                }
            }
            else if (this.operation.value == "stackalloc") {
                view.setUint32(address, Assembler.encodeOpRegNum(0x33, 0, this.operand1.value));
            }
            else if (this.operation.value == "pop") {
                if (this.operand1.type == wee.TokenType.Register) {
                    var register = Assembler.getRegisterIndex(this.operand1);
                    view.setUint32(address, Assembler.encodeOpRegNum(0x34, register, 0));
                }
                else {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x35, 0, this.operand1.value));
                }
            }
            else if (this.operation.value == "call") {
                if (this.operand1.type == wee.TokenType.Register) {
                    var register = Assembler.getRegisterIndex(this.operand1);
                    view.setUint32(address, Assembler.encodeOpRegNum(0x37, register, 0));
                }
                else if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x36, 0, 0));
                    address += 4;
                    view.setUint32(address, this.operand1.value);
                }
                else if (this.operand1.type == wee.TokenType.FloatLiteral) {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x36, 0, 0));
                    address += 4;
                    view.setFloat32(address, this.operand1.value);
                }
                else if (this.operand1.type == wee.TokenType.Identifier) {
                    view.setUint32(address, Assembler.encodeOpRegNum(0x36, 0, 0));
                    address += 4;
                    view.setUint32(address, 0xdeadbeaf);
                    patches.push(new Patch(address, this.operand1));
                }
            }
            else if (this.operation.value == "return") {
                view.setUint32(address, Assembler.encodeOpRegNum(0x38, 0, this.operand1.value));
            }
            else {
                diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Unknown stack/call instruction " + this.operation.value));
                return address;
            }
            return address + 4;
        };
        return StackOrCallInstruction;
    }());
    var PortInstruction = (function () {
        function PortInstruction(operation, operand1, operand2) {
            this.operation = operation;
            this.operand1 = operand1;
            this.operand2 = operand2;
        }
        ;
        PortInstruction.prototype.emit = function (view, address, patches, diagnostics) {
            this.address = address;
            if (this.operation.value == "port_write") {
                if (this.operand2.type == wee.TokenType.IntegerLiteral) {
                    var portNumber = this.operand2.value;
                    if (this.operand1.type == wee.TokenType.Register) {
                        var register = Assembler.getRegisterIndex(this.operand1);
                        view.setUint32(address, Assembler.encodeOpRegRegNum(0x39, register, 0, portNumber));
                    }
                    else if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                        view.setUint32(address, Assembler.encodeOpRegRegNum(0x3a, 0, 0, portNumber));
                        address += 4;
                        view.setUint32(address, this.operand1.value);
                    }
                    else if (this.operand1.type == wee.TokenType.FloatLiteral) {
                        view.setUint32(address, Assembler.encodeOpRegRegNum(0x3a, 0, 0, portNumber));
                        address += 4;
                        view.setFloat32(address, this.operand1.value);
                    }
                    else if (this.operand1.type == wee.TokenType.Identifier) {
                        view.setUint32(address, Assembler.encodeOpRegRegNum(0x3a, 0, 0, portNumber));
                        address += 4;
                        view.setUint32(address, 0xdeadbeaf);
                        patches.push(new Patch(address, this.operand1));
                    }
                }
                else {
                    var register1 = Assembler.getRegisterIndex(this.operand1);
                    var register2 = Assembler.getRegisterIndex(this.operand2);
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x3b, register1, register2, 0));
                }
            }
            else if (this.operation.value == "port_read") {
                if (this.operand1.type == wee.TokenType.IntegerLiteral) {
                    var portNumber = this.operand1.value;
                    var register = Assembler.getRegisterIndex(this.operand2);
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x3c, register, 0, portNumber));
                }
                else {
                    var register1 = Assembler.getRegisterIndex(this.operand1);
                    var register2 = Assembler.getRegisterIndex(this.operand2);
                    view.setUint32(address, Assembler.encodeOpRegRegNum(0x3d, register1, register2, 0));
                }
            }
            else {
                diagnostics.push(new wee.Diagnostic(wee.Severity.Error, this.operation.range, "Unknown port instruction " + this.operation.value));
                return address;
            }
            return address + 4;
        };
        return PortInstruction;
    }());
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
        Severity[Severity["Debug"] = "Debug"] = "Debug";
        Severity[Severity["Info"] = "Info"] = "Info";
        Severity[Severity["Warning"] = "Warning"] = "Warning";
        Severity[Severity["Error"] = "Error"] = "Error";
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
        TokenType[TokenType["IntegerLiteral"] = "IntegerLiteral"] = "IntegerLiteral";
        TokenType[TokenType["FloatLiteral"] = "FloatLiteral"] = "FloatLiteral";
        TokenType[TokenType["StringLiteral"] = "StringLiteral"] = "StringLiteral";
        TokenType[TokenType["Identifier"] = "Identifier"] = "Identifier";
        TokenType[TokenType["Opcode"] = "Opcode"] = "Opcode";
        TokenType[TokenType["Keyword"] = "Keyword"] = "Keyword";
        TokenType[TokenType["Register"] = "Register"] = "Register";
        TokenType[TokenType["Colon"] = "Colon"] = "Colon";
        TokenType[TokenType["Coma"] = "Coma"] = "Coma";
        TokenType[TokenType["EndOfFile"] = "EndOfFile"] = "EndOfFile";
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
                    var string = "";
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
        var Address = (function () {
            function Address(address) {
                this.address = address;
            }
            ;
            Address.prototype.nextInt = function () {
                var result = this.address;
                this.address += 4;
                return result;
            };
            Address.prototype.nextByte = function () {
                var result = this.address;
                this.address += 1;
                return result;
            };
            Address.prototype.nextShort = function () {
                var result = this.address;
                this.address += 2;
                return result;
            };
            return Address;
        }());
        function assert(expression, errorMessage) {
            if (!expression) {
                console.log(errorMessage);
                throw errorMessage;
            }
        }
        function runTests() {
            testLexer();
            testParser();
            testAssembler();
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
        function testAssembler() {
            var assembler = new wee.Assembler();
            var result = assembler.assemble("\n\t\t\tbyte 0\n\t\t\tbyte 1\n\t\t\tbyte 2\n\t\t\tbyte 3\n\t\t\tbyte -123\n\t\t\tshort 0xabcd\n\t\t\tshort -1234\n\t\t\tinteger 0xaabbccdd\n\t\t\tinteger -123456\n\t\t\tfloat 3.299999952316284\n\t\t\tstring \"Hello world\"\n\n\t\t\thalt\n\n\t\t\tadd sp, pc, r7\n\t\t\tsub r0, r1, r2\n\t\t\tmul r0, r1, r2\n\t\t\tdiv r0, r1, r2\n\t\t\tdiv_unsigned r0, r1, r2\n\t\t\tremainder r0, r1, r2\n\t\t\tremainder_unsigned r0, r1, r2\n\t\t\tadd_float r0, r1, r2\n\t\t\tsub_float r0, r1, r2\n\t\t\tmul_float r0, r1, r2\n\t\t\tdiv_float r0, r1, r2\n\t\t\tcos_float r0, r1\n\t\t\tsin_float r0, r1\n\t\t\tatan2_float r0, r1, r2\n\t\t\tsqrt_float r0, r1\n\t\t\tpow_float r0, r1\n\t\t\tconvert_int_float r0, r1\n\t\t\tconvert_float_int r0, r1\n\t\t\tcmp r0, r1, r2\n\t\t\tcmp_unsigned r0, r1, r2\n\t\t\tfcmp r0, r1, r2\n\n\t\t\tnot r0, r1\n\t\t\tand r0, r1, r2\n\t\t\tor r0, r1, r2\n\t\t\txor r0, r1, r2\n\t\t\tshift_left r0, r1, r2\n\t\t\tshift_right r0, r1, r2\n\n\t\t\tjump 0xffffffff\n\t\t\tjump -1\n\t\t\tTARGET_JMP: jump TARGET_JMP\n\t\t\tjump_equal r0, 1234\n\t\t\tTARGET_JMP_EQUAL: jump_equal r0, TARGET_JMP_EQUAL\n\t\t\tjump_not_equal r0, 1234\n\t\t\tTARGET_JMP_NOT_EQUAL: jump_not_equal r0, TARGET_JMP_NOT_EQUAL\n\t\t\tjump_less r0, 1234\n\t\t\tTARGET_JMP_LESS: jump_less r0, TARGET_JMP_LESS\n\t\t\tjump_greater r0, 1234\n\t\t\tTARGET_JMP_GREATER: jump_greater r0, TARGET_JMP_GREATER\n\t\t\tjump_less_equal r0, 1234\n\t\t\tTARGET_JMP_LESS_EQUAL: jump_less_equal r0, TARGET_JMP_LESS_EQUAL\n\t\t\tjump_greater_equal r0, 1234\n\t\t\tTARGET_JMP_GREATER_EQUAL: jump_greater_equal r0, TARGET_JMP_GREATER_EQUAL\n\n\t\t\tmove r0, r1\n\t\t\tmove -1234, r0\n\t\t\tmove 1.234, r0\n\t\t\tTARGET_MOVE: move TARGET_MOVE, r0\n\t\t\tload r0, 15, r1\n\t\t\tload 1234, 15, r1\n\t\t\tTARGET_LOAD: load TARGET_LOAD, 15, r1\n\t\t\tstore r0, r1, 15\n\t\t\tstore r0, 1234, 15\n\t\t\tTARGET_STORE: store r0, TARGET_STORE, 15\n\t\t\tload_byte r0, 15, r1\n\t\t\tload_byte 1234, 15, r1\n\t\t\tTARGET_LOAD_BYTE: load_byte TARGET_LOAD_BYTE, 15, r1\n\t\t\tstore_byte r0, r1, 15\n\t\t\tstore_byte r0, 1234, 15\n\t\t\tTARGET_STORE_BYTE: store_byte r0, TARGET_STORE_BYTE, 15\n\t\t\tload_short r0, 15, r1\n\t\t\tload_short 1234, 15, r1\n\t\t\tTARGET_LOAD_SHORT: load_short TARGET_LOAD_SHORT, 15, r1\n\t\t\tstore_short r0, r1, 15\n\t\t\tstore_short r0, 1234, 15\n\t\t\tTARGET_STORE_SHORT: store_short r0, TARGET_STORE_SHORT, 15\n\n\t\t\tpush 1234\n\t\t\tpush 1.234\n\t\t\tTARGET_PUSH: push TARGET_PUSH\n\t\t\tpush r0\n\t\t\tstackalloc 123\n\t\t\tpop r0\n\t\t\tpop 123\n\t\t\tcall 1234\n\t\t\tTARGET_CALL: call TARGET_CALL\n\t\t\tcall r2\n\t\t\treturn 123\n\n\t\t\tport_write r2, 123\n\t\t\tport_write 1234, 123\n\t\t\tport_write 1.234, 123\n\t\t\tTARGET_PORT_WRITE: port_write TARGET_PORT_WRITE, 123\n\t\t\tport_write r2, r3\n\t\t\tport_read 123, r3\n\t\t\tport_read r2, r3\n\t\t");
            var memory = result.code;
            if (result.diagnostics.length != 0) {
                for (var i = 0; i < result.diagnostics.length; i++)
                    console.log(result.diagnostics[i].toString());
                assert(false, "Error assembling test.");
            }
            var view = new DataView(memory.buffer);
            var addr = new Address(0);
            assert(view.getInt8(addr.nextByte()) == 0, "Expected 0");
            assert(view.getInt8(addr.nextByte()) == 1, "Expected 1");
            assert(view.getInt8(addr.nextByte()) == 2, "Expected 2");
            assert(view.getInt8(addr.nextByte()) == 3, "Expected 3");
            assert(view.getInt8(addr.nextByte()) == -123, "Expected -123");
            assert(view.getUint16(addr.nextShort()) == 0xabcd, "Expected 0xabcd");
            assert(view.getInt16(addr.nextShort()) == -1234, "Expected -1234");
            assert(view.getUint32(addr.nextInt()) == 0xaabbccdd, "Expected 0xaabbccdd");
            assert(view.getInt32(addr.nextInt()) == -123456, "Expected 123456");
            assert(view.getFloat32(addr.nextInt()) == 3.299999952316284, "Expected 3.3");
            var string = "Hello world";
            for (var i = 0; i < string.length; i++) {
                assert(view.getUint8(addr.nextByte()) == string.charCodeAt(i), "Expected " + string.charAt(i));
            }
            assert(view.getUint8(addr.nextByte()) == 0, "Expected 0");
            assert(view.getUint32(addr.nextInt()) == 0, "Expected 0");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x01, 15, 14, 7), "Invalid add");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x02, 0, 1, 2), "Invalid sub");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x03, 0, 1, 2), "Invalid mul");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x04, 0, 1, 2), "Invalid div");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x05, 0, 1, 2), "Invalid div_unsigned");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x06, 0, 1, 2), "Invalid remainder");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x07, 0, 1, 2), "Invalid remainder_unsigned");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x08, 0, 1, 2), "Invalid add_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x09, 0, 1, 2), "Invalid sub_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x0a, 0, 1, 2), "Invalid mul_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x0b, 0, 1, 2), "Invalid div_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x0c, 0, 1, 0), "Invalid cos_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x0d, 0, 1, 0), "Invalid sin_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x0e, 0, 1, 2), "Invalid atan2_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x0f, 0, 1, 0), "Invalid sqrt_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x10, 0, 1, 0), "Invalid pow_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x11, 0, 1, 0), "Invalid convert_int_float");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x12, 0, 1, 0), "Invalid convert_float_int");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x13, 0, 1, 2), "Invalid cmp");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x14, 0, 1, 2), "Invalid cmp_unsigned");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x15, 0, 1, 2), "Invalid fcmp");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x16, 0, 1, 0), "Invalid not");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x17, 0, 1, 2), "Invalid not");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x18, 0, 1, 2), "Invalid not");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x19, 0, 1, 2), "Invalid not");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1a, 0, 1, 2), "Invalid not");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1b, 0, 1, 2), "Invalid not");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1c, 0, 0, 0), "Invalid jmp");
            assert(view.getUint32(addr.nextInt()) == 0xffffffff, "Invalid jmp");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1c, 0, 0, 0), "Invalid jmp");
            assert(view.getInt32(addr.nextInt()) == -1, "Invalid jmp");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1c, 0, 0, 0), "Invalid jmp");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1d, 0, 0, 0), "Invalid jmp_equal");
            assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_equal");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1d, 0, 0, 0), "Invalid jmp_equal");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_equal");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1e, 0, 0, 0), "Invalid jmp_not_equal");
            assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_not_equal");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1e, 0, 0, 0), "Invalid jmp_not_equal");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_not_equal");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1f, 0, 0, 0), "Invalid jmp_less");
            assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_less");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x1f, 0, 0, 0), "Invalid jmp_less");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_less");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x20, 0, 0, 0), "Invalid jmp_greater");
            assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_greater");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x20, 0, 0, 0), "Invalid jmp_greater");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_greater");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x21, 0, 0, 0), "Invalid jmp_less_equal");
            assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_less_equal");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x21, 0, 0, 0), "Invalid jmp_less_equal");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_less_eqaul");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x22, 0, 0, 0), "Invalid jmp_greater_equal");
            assert(view.getInt32(addr.nextInt()) == 1234, "Invalid jmp_greater_equal");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegReg(0x22, 0, 0, 0), "Invalid jmp_greater_equal");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid jmp_greater_eqaul");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x23, 0, 1, 0), "Invalid move");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x24, 0, 0, 0), "Invalid move");
            assert(view.getInt32(addr.nextInt()) == -1234, "Invalid move");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x24, 0, 0, 0), "Invalid move");
            assert(view.getFloat32(addr.nextInt()) == 1.2339999675750732, "Invalid move");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x24, 0, 0, 0), "Invalid move");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid move");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x26, 0, 1, 15), "Invalid load");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x25, 0, 1, 15), "Invalid load");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid load");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x25, 0, 1, 15), "Invalid load");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid load");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x28, 0, 1, 15), "Invalid store");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x27, 0, 0, 15), "Invalid store");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid store");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x27, 0, 0, 15), "Invalid store");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid store");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2a, 0, 1, 15), "Invalid load_byte");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x29, 0, 1, 15), "Invalid load_byte");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid load_byte");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x29, 0, 1, 15), "Invalid load_byte");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid load_byte");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2c, 0, 1, 15), "Invalid store_byte");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2b, 0, 0, 15), "Invalid store_byte");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid store_byte");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2b, 0, 0, 15), "Invalid store_byte");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid store_byte");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2e, 0, 1, 15), "Invalid load_short");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2d, 0, 1, 15), "Invalid load_short");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid load_short");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2d, 0, 1, 15), "Invalid load_short");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid load_short");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x30, 0, 1, 15), "Invalid store_short");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2f, 0, 0, 15), "Invalid store_short");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid store_short");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x2f, 0, 0, 15), "Invalid store_short");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid store_short");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x31, 0, 0), "Invalid push");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid push");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x31, 0, 0), "Invalid push");
            assert(view.getFloat32(addr.nextInt()) == 1.2339999675750732, "Invalid push");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x31, 0, 0), "Invalid push");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid push");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x32, 0, 0), "Invalid push");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x33, 0, 123), "Invalid stackalloc");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x34, 0, 0), "Invalid pop");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x35, 0, 123), "Invalid pop");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x36, 0, 0), "Invalid call");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid call");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x36, 0, 0), "Invalid call");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid call");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x37, 2, 0), "Invalid call");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegNum(0x38, 0, 123), "Invalid call");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x39, 2, 0, 123), "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x3a, 0, 0, 123), "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == 1234, "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x3a, 0, 0, 123), "Invalid port_write");
            assert(view.getFloat32(addr.nextInt()) == 1.2339999675750732, "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x3a, 0, 0, 123), "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == addr.address - 8, "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x3b, 2, 3, 0), "Invalid port_write");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x3c, 3, 0, 123), "Invalid port_read");
            assert(view.getUint32(addr.nextInt()) == wee.Assembler.encodeOpRegRegNum(0x3d, 2, 3, 0), "Invalid port_read");
            console.log(memory);
        }
    })(tests = wee.tests || (wee.tests = {}));
})(wee || (wee = {}));
var wee;
(function (wee) {
    var VirtualMachine = (function () {
        function VirtualMachine() {
        }
        return VirtualMachine;
    }());
    wee.VirtualMachine = VirtualMachine;
})(wee || (wee = {}));
//# sourceMappingURL=wee.js.map