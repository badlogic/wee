/*
MIT License

Copyright (c) 2017 Mario Zechner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

module wee {
	/**
	 * Describes a position within a source text as line/column (both starting at one) and absolute
	 * character index (starting at 0).
	 */
	export class Position {
		constructor (public line: number = 0, public column: number = 0, public index: number = 0) { }
	}

	/**
	 * Describes the location of a segment within a source text.
	 */
	export class Range {
		start = new Position();
		end = new Position();

		constructor (public source: string) {};

		length () {
			return this.end.index - this.start.index;
		}
	}

	/**
	 * Severity of a Diagnostic.
	 */
	export enum Severity {
		Debug,
		Info,
		Warning,
		Error
	}

	/**
	 *
	 */
	export class Diagnostic {
		constructor (public severity: Severity, public range: Range, public message: string) {};
	}
}