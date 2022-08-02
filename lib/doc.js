/**********************************************************************
* 
* doc.js
*
* Basic JavaScript self-documentation utils
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

module.TAB_SIZE = 4

module.LEADING_TABS = 1


// Normalize code indent...
//
// 	normalizeIndent(text)
// 		-> text
//
//
// This will remove common indent from each line of text, this is useful 
// for printing function code of functions that were defined at deep 
// levels of indent.
//
// This will ignore the indent of the first line.
//
// If the last line is indented higher or equal to the rest of the text 
// we will use leading_tabs (defaults to LEADING_TABS) to indent the 
// rest of the text.
// This will indent the following styles correctnly:
//
// 		|function(a, b){				|function(a, b){
// 		|	return a + b }				|	return a + b
// 		|								|}
//
//
// NOTE: this will trim out both leading and trailing white-space.
// NOTE: this is generally code-agnostic with one sigificant 
// 		exception -- normalizeIndent(..)  will break code written 
// 		in Whitespace.
//
// XXX BUG?
// 			`a					`a						`a
// 			|    b			->	|b			expected?	|    b
// 			|        c`			|    c`					|        c`
// 		while:
// 			`a					`a
// 			|    b			->	|    b		as expected.
// 			|    c`				|    c`
// 		this leads to functions like the following to get messed up:
// 			|function(a){
// 			|	return a
// 			|		|| 'moo' }
//
// XXX is this the right place for this???
// 		...when moving take care that ImageGrid's core.doc uses this...
var normalizeIndent =
module.normalizeIndent =
function(text, {tab_size=module.TAB_SIZE, leading_tabs=module.LEADING_TABS, pad_tabs=0}={}){
	leading_tabs *= tab_size
	var padding = ' '.repeat(pad_tabs*tab_size)
	// prepare text...
	var tab = ' '.repeat(tab_size || 0)
	text = tab != '' ?
		text.replace(/\t/g, tab)
		: text
	// trim the tail and remove leading blank lines...	
	var lines = text.trimEnd().split(/\n/)
	while(lines.length > 0 
			&& lines[0].trim() == ''){
		// XXX we have two options here:
		// 			- indent everyline including the first non-blank
		// 			- do not indent anything (current)
		// 		...not sure which is best...
		leading_tabs = 0
		lines.shift() }
	// count common indent...
	var l = lines 
		.reduce(function(l, e, i){
			var indent = e.length - e.trimLeft().length
			return e.trim().length == 0 
						// ignore 0 indent of first line...
						|| (i == 0 && indent == 0) ?
					l
				// last line...
				: i == lines.length-1
						&& indent >= l ? 
					// XXX feels a bit overcomplicated...
					(l < 0 ?
						// last of two with 0 indent on first -> indent...
						Math.max(indent - leading_tabs, 0)
						// ignore leading_tabs if lower indent...
						: Math.min(l, Math.max(indent - leading_tabs, 0)))
				// initial state...
				: l < 0 ? 
					indent 
				// min...
				: Math.min(l, indent) }, -1) || 0
	// normalize...
	return padding 
		+lines
			.map(function(line, i){
				return i == 0 ? 
					line
					: line.slice(l) })
			.join('\n'+ padding)
			.trim() }


// shorthand more suted for text...
var normalizeTextIndent =
module.normalizeTextIndent =
function(text, opts={leading_tabs: 0}){
	return module.normalizeIndent(text, opts) }


// template string tag versions of the above...
var doc =
module.doc =
function(strings, ...values){
	return normalizeIndent(strings
		.map(function(s, i){ return s + (values[i] || '') })
		.join('')) }

var text =
module.text =
function(strings, ...values){
	return normalizeTextIndent(strings
		.map(function(s, i){ return s + (values[i] || '') })
		.join('')) }



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
