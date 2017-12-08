# Wee
Wee is a tiny educational programming environment. Wee is composed of:

1. An instruction set architecture (ISA) with a corresponding virtual machine (**Wee Machine**).
2. An assembly language plus assembler (**Wee Assembly**)
3. A higher level language (**Wee Lang**) that is an extension of the assembly language
   making common tasks, like defining types, functions, locals, etc., more comfortable.
4. A browser-based development environment with code editing, compilation and debugging tools (**Wee DE**).

## Wee Machine
The Wee Machine resembles the architecture of real-world 32-bit machines like x86 and ARM. The Wee Machine is composed of the following components:

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
	7. Random number generator
	8. High precision timer
5. A **Basic Input/Output System (BIOS)**

Wee Machine implements the Von Neumann architecture: code & data are stored to and read from the same memory. This allows self-modifying code. Wee Machine uses little endian, the word size is 32-bit.

### Instruction Set
Instructions are 32-bit in size, with 0-3 operands encoded in the instruction. Memory access instructions allow the specification of byte-offsets. The opcode of an instruction is always encoded in the first 6 bits. Some instruction may be made up of an additional 32-bit value encoding data or an address.

#### Register encoding
Wee Machine has 16 registers, `r0-r13`, `pc` and `sp`. When encoding a register in an instruction, the register is referred to by an index. Registers `r0` to `r13` are indexed from 0 to 13. Register `pc` has index 14, and register `sp` has index 15.

#### Halting
Wee Machine can be halted via the instruction `0x00000000` or `halt` in assembly.

#### Arithmetic Operations
Wee Machine supports 32-bit integer and floating point arithmetic. All arithmetic instructions operate only on registers and have the following format:

| bits 0-5 | bits 6-9 | bits 10-12 | bits 14-17 | bits 18-31 |
| -------- | -------- | --------  | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2)  | Register (op3)  | Unused     |

These instructions are supported:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x01   | `add op1, op2, op3` | Adds the 32-bit integers in `op1` and `op2` and stores the result in `op3`. |
| 0x02   | `sub op1, op2, op3` | Subtracts the 32-bit integers in `op1` and `op2` and stores the result in `op3`. |
| 0x03   | `mul op1, op2, op3` | Multiplies the 32-bit integers in `op1` and `op2` and stores the result in `op3`. |
| 0x04   | `div op1, op2, op3` | Divides the 32-bit signed integer in `op1` by `op2` and stores the result in `op3`. |
| 0x05   | `div_unsigned op1, op2, op3` | Divides the 32-bit unsigned integer in `op1` by `op2` and stores the result in `op3`. |
| 0x06   | `remainder op1, op2, op3` | Divides the 32-bit signed integer in `op1` by `op2` and stores the remainder in `op3`. The remainder has the sign of the dividend `op1` |
| 0x07   | `remainder_unsigned op1, op2, op3` | Divides the 32-bit unsigned integer in `op1` by `op2` and stores the remainder in `op3`. The remainder has the sign of the dividend `op1` |
| 0x08   | `add_float op1, op2, op3` | Adds the 32-bit floats in `op1` and `op2` and stores the result in `op3`. |
| 0x09   | `sub_float op1, op2, op3` | Subtracts the 32-bit floats in `op1` and `op2` and stores the result in `op3`. |
| 0x0a   | `mul_float op1, op2, op3` | Multiplies the 32-bit floats in `op1` and `op2` and stores the result in `op3`. |
| 0x0b   | `div_float op1, op2, op3` | Divides the 32-bit float in `op1` by `op2` and stores the result in `op3`. |
| 0x0c   | `cos_float op1, op2` | Calculates the cosine of the angle given in radians in `op1` and stores the result in `op2` |
| 0x0d   | `sin_float op1, op2` | Calculates the sine of the angle given in radians in `op1` and stores the result in `op2` |
| 0x0e   | `atan2_float op1, op2, op2` | Calculates the angle of the vector (x, y) stored in `op1`, `op2` relative to the x-axis and stores the result in `op3` |
| 0x0f   | `sqrt_float op1, op2` | Calculates the square root of the float in `op1` and stores the result in `op2` |
| 0x10   | `pow_float op1, op2` | Calculates the value of `op1` raised by the exponent in `op2` and stores the result in r3 |
| 0x11   | `convert_int_float op1, op2` | Converts the 32-bit signed integer in `op1` to float and stores the result in `op2` |
| 0x12   | `convert_float_int op1, op2` | Converts the 32-bit float in `op1` to a 32-bit signed integer, truncating the decimal portion, and stores the result in `op2` |
| 0x13   | `cmp op1, op2, op3` | Compares the 32-bit signed integer in `op1` to `op2` and stores the result in `op3`. The result will be 0 if `op1` == `op2`, 1 if `op1` > `op2` and -1 (`0xffffffff`) if `op1` < `op2`. The result can be used with the jump instructions. |
| 0x14   | `cmp_unsigned op1, op2, op3` | Compares the 32-bit unsigned integer in `op1` to `op2` and stores the result in `op3`. The result will be 0 if `op1` == `op2`, 1 if `op1` > `op2` and -1 (`0xffffffff`) if `op1` < `op2`. The result can be used with the jump instructions. |
| 0x15   | `fcmp op1, op2, op3` | Compares the 32-bit float in `op1` to `op2` and stores the result in `op3`. The result will be 0 if `op1` == `op2`, 1 if `op1` > `op2` and -1 (`0xffffffff`) if `op1` < `op2`. The result can be used with the jump instructions. |


*Note*: Underflow, overflow and division by zero are not reported. Floating point operations should follow the IEEE 754 standard. Conversions between float and int may result in undefined values if the precision is exceeded. All the nastiness of `NaN`s and infinities apply. Rounding modes TBD.

#### Bit-wise Operations
Wee Machine supports a standard set of bit-wise operations. All bit-wise operation instructions operate only on registers and have the following format:

| bits 0-5 | bits 6-9 | bits 10-12 | bits 14-17 | bits 18-31 |
| -------- | -------- | --------  | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2)  | Register (op3)  | Unused     |

The following instructions are supported:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x16   | `not op1, op2` | Inverts the bits in `op1` and stores the result in `op2` |
| 0x17   | `and op1, op2, op3` | Performs a bit-wise and of `op1` and `op2` and stores the result in `op3` |
| 0x18   | `or op1, op2, op3` | Performs a bit-wise or of `op1` and `op2` and stores the result in `op3` |
| 0x19   | `xor op1, op2, op3` | Performs a bit-wise exclusive or of `op1` and `op2` and stores the result in `op3` |
| 0x1a   | `shift_left op1, op2, op3` | Shifts the bits in `op1` to the left by the number of bits specified in `op2` and stores the result in `op3` |
| 0x1b   | `shift_right op1, op2, op3` | Shifts the bits in `op1` to the right by number of bits specified in `op2` and stores the result in `op3` |

#### Jumps & Branching
Wee Machine supports a variety of jumps, either directly or based on the result of a `cmp` or `fcmp`
instruction. All jump target addresses, except for `jmp`, are relative to the jump instruction's address, and are encoded in the instruction. Jump instructions have the following format:

| bits 0-5 | bits 6-9 | bits 10-31 | bits 32-64 |
| -------- | -------- | --------  | -------- |
| Opcode   | Register (op1) | Target address | word2

The following instructions are supported:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x1c   | `jump word2` | Jumps to the specified address in `word2` |
| 0x1d   | `jump_equal op1, <target address>` | Jumps to the specified address if the operands of the comparison, the result of which is stored in `op1`, were equal |
| 0x1e   | `jump_not_equal op1, <target address>` | Jumps to the specified address if the operands of the comparison, the result of which is stored in `op1`, were not equal |
| 0x1f   | `jump_less op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result of which is stored in `op1`, was less than the second operand |
| 0x20   | `jump_greater op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result of which is stored in `op1`, was greater than the second operand |
| 0x21   | `jump_less_equal op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result of which is stored in `op1`, was less or equal to the second operand |
| 0x22   | `jump_greater_equal op1, <target address>` | Jumps to the specified address if the first operand of the comparison, the result of which is stored in `op1`, was greater or equal to the second operand |

#### Memory operations
Wee Machine has 16 megabytes of byte-addressable memory in which both code and data are stored, plus 16 registers that can hold data and addresses. Wee Machine provides instructions to load and store data from and to registers and memory.

Memory operations can be 1 or 2 words wide. 2-word memory operations encode a 32-bit value in the second word, which can represent data or an address. The format of the first word is as follows

| bits 0-5 | bits 6-9 | bits 10-13 | bits 14-31 | bits 32-63 |
| -------- | -------- | --------  | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2) | Offset in bytes (offset) | Value (word2)

The following memory operations are available:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x23   | `move op1, op2` | Copies the value in `op1` to `op2` |
| 0x24   | `move word, op2` | Copies the 32-bit value in `word2` to `op2` |
| 0x25   | `load word2, offset, op1` | Reads the 32-bit value at address `word2` + `offset` from memory and stores it in `op1` |
| 0x26   | `load op1, offset, op1` | Reads the 32-bit value at address `op1` + `offset` from memory and stores it in `op2` |
| 0x27   | `store op1, word2, offset` | Writes the 32-bit value in `op1` to memory at address `word2` + `offset` |
| 0x28   | `store op1, op2, offset` | Writes the 32-bit value in `op1` to memory at address `op2` + `offset` |
| 0x29   | `load_byte word2, offset, op1` | Reads the 8-bit value at address `word2` + `offset` from memory and stores it in `op1` |
| 0x2a   | `load_byte op1, offset, op1` | Reads the 8-bit value at address `op1` + `offset` from memory and stores it in `op2` |
| 0x2b   | `store_byte op1, word2, offset` | Writes the lowest 8 bits in `op1` to memory at address `word2` + `offset` |
| 0x2c   | `store_byte op1, op2, offset` | Writes the lowest 8 bits in `op1` to memory at address `op2` + `offset` |
| 0x2d   | `load_short word2, offset, op1` | Reads the 16-bit value at address `word2` + `offset` from memory and stores it in `op1` |
| 0x2e   | `load_short op1, offset, op1` | Reads the 16-bit value at address `op1` + `offset` from memory and stores it in `op2` |
| 0x2f   | `store_short op1, word2, offset` | Writes the lowest 16 bits in `op1` to memory at address `word2` + `offset` |
| 0x30   | `store_short op1, op2, offset` | Writes the lowest 16 bits in `op1` to memory at address `op2` + `offset` |

#### Stack & Call Operations
Wee Machine has a stack at the end of the available memory `0xffffff` which grows "downwards". The register `sp` keeps track of the top of the stack in memory. Wee Machine provides instructions to make working with
the stack easier, e.g. pushing and popping values.

The stack plays a pivotal role when implementing and calling functions in Wee Machine. A function can use the
stack to store "local" values temporarily while the function is being executed. When calling another function,
the parameters are passed to the function via the stack. Finally, the stack is also used to save the contents
of registers, either because the function can not fit all local data into registers, or because another function is called that will itself modify registers.

Wee Machine's calling convention works as follows:

1. The calling function (caller) saves all registers it uses to the stack, e.g. via `push`
2. The caller pushes all arguments it wants to pass to the called function (callee) to the stack. The
arguments are pushed to the stack in such an order, that the last argument becomes the top of the stack. All arguments are word sized.
3. The caller calls the callee, via `call`, which will push the return address (the address of the the next instruction after `call`) onto the stack.
4. The callee executes its instructions and eventually uses `return <words to pop>`, which will pop the specified number of words from the stack so the stack pointer points at the return address, then pops the return address of the stack, writes it to `pc` and resumes execution.
5. The caller resumes at the instruction after `call`, with the stack pointer `sp` pointing to the location it pointed to after all arguments were pushed onto the stack. The caller pops the arguments from the stack. The callee may have returned a value in register `r0`.

Memory operations can be 1 or 2 words wide. 2-word memory operations encode a 32-bit value in the second word, which can represent data or an address. The format of the first word is as follows:

| bits 0-5 | bits 6-9 | bits 10-31 | bits 32-63 |
| -------- | -------- | -------- | ---------- |
| Opcode   | Register (op1) | Number of words | Value (word2)

The following stack & call operations are available:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x31   | `push word2` | Decrease `sp` by 4, then write the 32-bit value `word2` to the stack at address `sp` |
| 0x32   | `push op1` | decrease `sp` by 4, then write the 32-bit value in `op1` to the stack at address `sp` |
| 0x33   | `stackalloc <number of words> ` | Decrease `sp` by `4 * <number of words>` |
| 0x34  | `pop op1` | Reads the 32-bit value at address `sp`, stores it in `op1`, then increases `sp` by 4 |
| 0x35  | `pop <number of words>` | Pops the number of words from the stack by increasing `sp` by `4 * <words to pop>`. |
| 0x36  | `call word1` | Pushes the address of the next instruction on the stack, sets `pc` to `word1` which holds the address of the first instruction of the function, and resumes execution |
| 0x37  | `call op1` | Pushes the address of the next instruction on the stack, Sets `pc` to `op1` which holds the address of the first instruction of the function, and resumes execution |
| 0x38  | `return <number of words>` | Decreases `sp` by `4 * <number of words>`, sets `pc` to the value at address `sp`, pops one more word from the stack, and finally resumes execution |

#### Ports
Wee Machine supports peripherals like keyboard, mouse or graphics card. The processor communicate with these peripherals via ports. Each peripheral is assigned a port number through which the processor can read or write from and to the peripheral. Each peripheral has its own protocol through which it communicates with the processor.

Port operations are 1 or 2-words wide and have the following format:

| bits 0-5 | bits 6-9 | bits 10-13 | bits 14-31 | bits 32-63 |
| -------- | -------- | ---------- | ---------- | ---------- |
| Opcode   | Register (op1) | Register (op2) | Port number | Value (word2) |

The following port operations are available:

| Opcode | Assembly | Semantics |
| ------ | -------- | --------- |
| 0x39   | `port_write op1, <port number>` | Write the 32-bit value in `op1` to port `<port number>` |
| 0x3a   | `port_write word2, <port number>` | Write the 32-bit value `word2` to port `<port number>` |
| 0x3b   | `port_write op2, op2` | Write the 32-bit value in `op1` to port `op2` |
| 0x3c   | `port_read <port number>, op1` | Read the 32-bit value from port `<port number>` and store it in `op1`. The operation may block until the peripheral has completed its work. |
| 0x3d   | `port_read op1, op2` | Read the 32-bit value from port `op1` and store it in `op2`. The operation may block until the peripheral has completed its work. |

### Peripherals
Wee Machine simulates a system with a keyboard, mouse, graphics card, sound card and networking card. These peripherals are heavily simplified to make working with them simple enough for beginners. The following sections describe the peripheral capabilities and their respective port protocols.

#### Keyboard
TBD
#### Mouse
TBD
#### Graphics Card
TBD
#### Sound Card
TBD
#### Networking Card
TBD
#### Random number generator
TBD
#### High precision timer
TBD

### BIOS
Wee Machine comes with a minimal BIOS that makes interacting with peripherals easier. The BIOS is composed of functions that are co-located in memory with the user code. The assembler knows the addresses of each BIOS function so a programmer can directly reference the function labels in their assembly program. The following sections describe the functions provided by the BIOS.

TBD

### Bootup & Memory Layout
When Wee Machine boots up, it reserves the memory area `0xff0000` to `0xffffff` for the stack, the area `0xfb1800` to `0xfeffff` for the memory mapped video memory (320x200 pixels, 32-bit RGBA), and the area `(0xfb1800 - BIOS code size)` to `0xfb17ff` for the BIOS code. Next, the program is loaded into memory at `0x000000` and executed. The BIOS can manage the unused memory between the program code & data and the BIOS code and provides functions to allocate and deallocate memory in this memory area. Programmers can choose to manage that memory themselves.
