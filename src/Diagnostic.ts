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
		Debug = "Debug",
		Info = "Info",
		Warning = "Warning",
		Error = "Error"
	}

	/**
	 *
	 */
	export class Diagnostic {
		constructor (public severity: Severity, public range: Range, public message: string) {};

		toString () {
			let lines = this.range.source.split(/\r?\n/);
			let result = `${this.severity} (${this.range.start.line}):${this.range.start.column}: ${this.message}\n\n    `;
			let line = lines[this.range.start.line - 1];
			result += line + "\n    ";
			let startColumn = this.range.start.column;
			let endColumn = this.range.start.line != this.range.end.line ? line.length : this.range.end.column;
			for (var i = 1; i <= line.length; i++) {
				if (i >= startColumn && i < endColumn) {
					result += "~";
				} else {
					result += line.charAt(i - 1) == '\t' ? '\t' : ' ';
				}
			}
			result += "\n";
			return result;
		}
	}
}