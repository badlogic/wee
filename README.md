# Wee

Wee is a tiny programming environment for teaching purposes. Wee is composed of:

1. An instruction set architecture (ISA) with a corresponding virtual machine (**Wee Machine**).
2. An assembly language plus assembler (**Wee Assembly**)
3. A higher level language (**Wee Lang**) that is an extension of the assembly language
   making common tasks, like defining types, functions, locals, etc., more comfortable.
4. A browser-based development environment with code editing, compilation and debugging tools (**Wee DE**).

## Wee Machine
The Wee Machine resembles the architecture of real-world 32-bit machines like x86 and ARM. The wee machine is composed of the following components:

1. The **processor** with
	1. 32-bit integer & float ALU
	2. 14 general purpose registers (r0-r13)
	3. A program counter register (pc)
	4. A stack pointer register (sp)
2. Byte-addressable **random access memory**
3. Memory mapped **video memory** (32-bit RGBA, 320x200)
4. **Ports** to communicate with peripherals like
	1. Keyboard
	2. Mouse
	3. Graphics card
	5. Sound card
	6. Networking card
5. A **Basic Input/Output System (BIOS)**

Wee Machine implements the Von Neumann architecture: code & data are stored and read from the same memory. This allows self-modifying code.

Wee Machine uses little endian, the word size is 32-bit.

### Instruction Set
Instructions are 32-bit in size, with 0-3 operands encoded in the instruction. Memory access instructions allow the specification of byte-offsets. The opcode of an instruction is always encoded in the first 6 bits.

#### Register encoding
Wee machine has 16 registers, `r0`-`r13`, `pc` and `sp`. When encoding a register in an instruction, the register is referred to by an index. Registers `r0` to `r13` are indexed from 0 to 13. Register `pc` has index 14, and register `sp` has index 15.

#### Arithmetic Operations
Wee machine supports 32-bit integer and floating point arithmetic. All arithmetic instructions operate only on registers and have the following format:

| bits 0-5 | bits 6-9 | bits 10-12 | bits 14-17 | bits 18-31 |
| -------- | -------- | --------  | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2)  | Register (op3)  | Unused     |

The following instructions are supported:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x01   | `add op1, op2, op3` | Adds the 32-bit integers in `op1` and `op2` and stores the result in `op3`. |
| 0x02   | `sub op1, op2, op3` | Subtracts the 32-bit integers in `op1` and `op2` and stores the result in `op3`. |
| 0x03   | `mul op1, op2, op3` | Multiplies the 32-bit signed integers in `op1` and `op2` and stores the result in `op3`. |
| 0x04   | `div op1, op2, op3` | Divides the 32-bit signed integer in `op1` by `op2` and stores the result in `op3`. |
| 0x05   | `add_float op1, op2, op3` | Adds the 32-bit floats in `op1` and `op2` and stores the result in `op3`. |
| 0x06   | `sub_float op1, op2, op3` | Subtracts the 32-bit floats in `op1` and `op2` and stores the result in `op3`. |
| 0x07   | `mul_float op1, op2, op3` | Multiplies the 32-bit floats in `op1` and `op2` and stores the result in `op3`. |
| 0x08   | `div_float op1, op2, op3` | Divides the 32-bit float in `op1` by `op2` and stores the result in `op3`. |
| 0x09   | `convert_int_float op1, op2` | Converts the 32-bit signed integer in `op1` to float and stores the result in `op2` |
| 0x0a   | `convert_float_int op1, op2` | Converts the 32-bit float in `op1` to a 32-bit signed integer, truncating the decimal portion, and stores the result in `op2` |
| 0x0b   | `cmp op1, op2, op3` | Compares the 32-bit signed integer in `op1` to `op2` and stores the result in `op3`. The result can be used with the jump instructions. |
| 0x0c   | `fcmp op1, op2, op3` | Compares the 32-bit float in `op1` to `op2` and stores the result in `op3`. The result can be used with the jump instructions. |


*Note*: For integer operations, underflow and overflow are not reported. Floating point operations should follow the IEEE 754 standard. Conversions between float and int may result in undefined values if the precision is exceeded.

#### Bit-wise Operations
Wee machine supports a standard set of bit-wise operations. All bit-wise operation instructions operate only on registers and have the following format:

| bits 0-5 | bits 6-9 | bits 10-12 | bits 14-17 | bits 18-31 |
| -------- | -------- | --------  | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2)  | Register (op3)  | Unused     |

The following instructions are supported:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x0d   | `not op1, op2` | Inverts the bits in `op1` and stores the result in `op2` |
| 0x0e   | `and op1, op2, op3` | Performs a bit-wise and of `op1` and `op2` and stores the result in `op3` |
| 0x0f   | `or op1, op2, op3` | Performs a bit-wise or of `op1` and `op2` and stores the result in `op3` |
| 0x10   | `xor op1, op2, op3` | Performs a bit-wise exclusive or of `op1` and `op2` and stores the result in `op3` |
| 0x11   | `shift_left op1, op2, op3` | Shifts the bits in `op1` to the left by the number of bits specified in `op2` and stores the result in `op3` |
| 0x12   | `shift_right op1, op2, op3` | Shifts the bits in `op1` to the right by number of bits specified in `op2` and stores the result in `op3` |

#### Jumps & Branching
Wee machine supports a variety of jumps, either directly or based on the result of a `cmp` or `fcmp`
instruction. All jump target addresses are relative to the jump instruction's address, and are encoded in the instruction. Jump instructions have the following format:

| bits 0-5 | bits 6-9 | bits 10-31 |
| -------- | -------- | --------  |
| Opcode   | Register (op1) | Target address |

The following instructions are supported:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x13   | `jump <target address>` | Jumps to the specified address. |
| 0x14   | `jump_equal op1, <target address>` | Jumps to the specified address if the operands of the comparison, the result of which is stored in `op1`, were equal |
| 0x15   | `jump_not_equal op1, <target address>` | Jumps to the specified address if the operands of the comparison, the result is stored in `op1`, were not equal |
| 0x16   | `jump_less op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result is stored in `op1`, was less than the second operand |
| 0x17   | `jump_greater op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result is stored in `op1`, was greater than the second operand |
| 0x18   | `jump_less_equal op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result is stored in `op1`, was less or equal to the second operand |
| 0x19   | `jump_greater_equal op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result is stored in `op1`, was greater or equal to the second operand |

#### Memory operations
Wee machine has 16 megabytes of byte-addressable memory in which both code and data are stored, plus 16 registers that can hold data and addresses. Wee machine provides instructions to load and store data from and to registers and memory.

Memory operations can be 1 or 2 words wide. 2-word memory operations encode a 32-bit value in the second word, which can represent data or an address. The format of the first word is as follows

| bits 0-5 | bits 6-9 | bits 10-13 | bits 14-31 | bits 32-63 |
| -------- | -------- | --------  | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2) | Offset in bytes (offset) | Value (word2)

The following memory operations are available:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x1a   | `move op1, op2` | Copies the value in `op1` to `op2` |
| 0x1b   | `move word, op2` | Copies the 32-bit value in `word2` to `op2` |
| 0x1c   | `load word2, offset, op1` | Reads the 32-bit value at address `word2` + `offset` from memory and stores it in `op1` |
| 0x1d   | `load op1, offset, op1` | Reads the 32-bit value at address `op1` + `offset` from memory and stores it in `op2` |
| 0x1e   | `store op1, word2, offset` | Writes the 32-bit value in `op1` to memory at address `word2` + `offset` |
| 0x1f   | `store op1, op2, offset` | Writes the 32-bit value in `op1` to memory at address `op2` + `offset` |
| 0x20   | `load_byte word2, offset, op1` | Reads the 8-bit value at address `word2` + `offset` from memory and stores it in `op1` |
| 0x21   | `load_byte op1, offset, op1` | Reads the 8-bit value at address `op1` + `offset` from memory and stores it in `op2` |
| 0x22   | `store_byte op1, word2, offset` | Writes the lowest 8 bits in `op1` to memory at address `word2` + `offset` |
| 0x23   | `store_byte op1, op2, offset` | Writes the lowest 8 bits in `op1` to memory at address `op2` + `offset` |

#### Stack & Call Operations
Wee Machine has a stack at the end of the available memory `0xffffff` which grows "downwards". The register `sp` keeps track of the top of the stack in memory. Wee machine provides instructions to make working with
the stack easier, e.g. pushing and popping values.

The stack plays a pivotal role when implementing and calling functions in Wee Machine. A function can use the
stack to store "local" values temporarily while the function is being executed. When calling another function,
the parameters are passed to the function via the stack. Finally, the stack is also used to save the contents
of registers, either because the function can not fit all local data into registers, or because another function is called that will itself modify registers.

Wee machine's calling convention works as follows:

1. The calling function (caller) saves all registers it uses to the stack, e.g. via `push`
2. The caller pushes all arguments it wants to pass to the called function (callee) to the stack. The
arguments are pushed to the stack in such an order, that the last argument becomes the top of the stack. All arguments are word sized.
3. The caller calls the callee, via `call`, which will push the return address (the address of the the next instruction after `call`) onto the stack.
4. The callee executes its instructions and eventually uses `return <words to pop>`, which will pop the specified number of words from the stack so the stack pointer points at the return address, then pops the return address of the stack, writes it to `pc` and resumes execution.
5. The caller resumes at the instruction after `call`, with the stack pointer `sp` pointing to the location it pointed to after all arguments were pushed onto the stack. The caller pops the arguments from the stack. The callee may have returned a value in register `r0`.

Memory operations can be 1 or 2 words wide. 2-word memory operations encode a 32-bit value in the second word, which can represent data or an address. The format of the first word is as follows:

| bits 0-5 | bits 6-9 | bits 10-31 | bits 32-63 |
| -------- | -------- | -------- | ---------- |
| Opcode   | Register (op1) | Words to pop | Value (word2)

The following stack & call operations are available:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x24   | `push word2` | Write the 32-bit value `word2` to the stack at address `sp`, then decrease `sp` by 4 |
| 0x25   | `push op1` | Write the 32-bit value in `op1` to the stack at address `sp`, then decrease `sp` by 4 |
| 0x26  | `pop op1` | Reads the 32-bit value at address `sp`, stores it in `op1`, then increases `sp` by 4 |
| 0x27  | `pop <words to pop>` | Pops the number of words from the stack by increasing `sp` by `4 * <words to pop>`. |
| 0x28  | `call word1` | Sets `pc` to `word1` which holds the address of the first instruction of the function, and resumes execution |
| 0x29  | `return <words to pop>` | Decreases `sp` by `4 * <words to pop>`, sets `pc` to the value at address `sp`, pops one more word from the stack, and finally resumes execution |

#### Ports
Wee machine supports peripherals like keyboard, mouse or graphics card. The processor communicate with these peripherals via ports. Each peripheral is assigned a port number through which the processor can read or write from and to the peripheral. Each peripheral has its own protocol through which it communicates with the processor.

Port operations are 1 or 2-words wide and have the following format:

| bits 0-5 | bits 6-9 | bits 10-31 | bits 32-63 |
| -------- | -------- | -------- | ---------- |
| Opcode   | Register (op1) | Port number | Value (word2) |

The following port operations are available:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x2a   | `port_write op1, <port number>` | Write the 32-bit value in `op1` to port `<port number>` |
| 0x2b   | `port_write word2, <port number>` | Write the 32-bit value `word2` to port `<port number>` |
| 0x2c   | `port_read <port number>, op1` | Read the 32-bit value from port `<port number>` and store it in `op1`. The operation may block until the peripheral has completed its work. |

#### Halting
Wee machine can be halted by a simple instruction with the instruction `0x00000000` or `halt` in assembly.

### Peripherals
Wee machine simulates a system with a keyboard, mouse, graphics card, sound card and networking card. These peripherals are heavily simplified to make working with them simple enough for beginners.

#### Keyboard
#### Mouse
#### Graphics Card
#### Sound Card
#### Networking Card

### BIOS
Wee Machine comes with a minimal BIOS that makes interacting with peripherals easier. The BIOS is composed of functions that are co-located in memory with the user code.

### Bootup & Memory Layout

When Wee machine boots up, it reserves the memory area `0xff0000` to `0xffffff` for the stack, the area `0xfb1800` to `0xfeffff` for the memory mapped video memory (320x200 pixels, 32-bit RGBA), and the area `(0xfb1800 - BIOS code size)` to `0xfb17ff` for the BIOS code. Next, the program is loaded into memory at `0x000000` and executed.
