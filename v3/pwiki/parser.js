/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')
var types = require('ig-types')
var serialize = require('ig-serialize')

var pwpath = require('./path')





//---------------------------------------------------------------------
// Parser...

// XXX TODO:
// 		callbacks on elements resolving...
// XXX ASAP move the macros here...
// XXX should we warn about stuff like <macro src=/moo/> -- currently 
// 		this will simply be ignored, i.e. passed trough the parser 
// 		without change...
// XXX might be a good idea to both think of a good async parse and
// 		create tools for sync parsing (get links etc.)...
// XXX need to correctly handle nested and escaped quotes...
// 		i.e.
// 			"aaa \"bbb \\"ccc\\" bbb\" aaa"

// XXX RENAME...
// 		...this handles the syntax and lexing...
var BaseParser =
module.BaseParser = {
	// patterns...
	//
	// The way the patterns are organized might seem a bit overcomplicated
	// and it has to be to be able to reuse the same pattern in different 
	// contexts, e.g. the arguments pattern...

	//
	// needs:
	// 	STOP -- '\\>' or ')'
	// 	PREFIX -- 'inline' or 'elem'
	//
	// XXX should we support unquoted macros as single arguments???
	// 		i.e. '@(aaa @(bbb ccc))' should collect '@(bbb ccc)' as an 
	// 		argument, currently this will be stplit at whitespace...
	// 		...this is logical but then we'll need to group all nested 
	// 		levels, not yet sure how to do this cleanly (one way is to 
	// 		write a dedicated parser)
	MACRO_ARGS: ['(\\s*(',[
				// arg='val' | arg="val" | arg=val
				'(?<PREFIXArgName>[a-z:-_]+)\\s*=\\s*(?<PREFIXArgValue>'+([
					'"(?<PREFIXDoubleQuotedValue>(\\"|[^"])*?)"',
					"'(?<PREFIXSingleQuotedValue>(\\'|[^'])*?)'",
					'(?<PREFIXValue>[^\\sSTOP\'"]+)',
				].join('|'))+')',
				// "arg" | 'arg'
				'"(?<PREFIXDoubleQuotedArg>(\\"|[^"])*?)"',
				"'(?<PREFIXSingleQuotedArg>(\\'|[^'])*?)'",
				// arg
				// NOTE: this is last because it could eat up parts of 
				// 		the above alternatives...
				//'|\\s+[^\\s\\/>\'"]+',
				'(?<PREFIXArg>[^\\sSTOP\'"]+)',
			].join('|'),
		'))'].join(''),
	MACRO_ARGS_PATTERN: undefined,
	//
	// 	.buildArgsPattern(<prefix>[, <stop>[, <flags>]])
	// 		-> <pattern>
	//
	// 	.buildArgsPattern(<prefix>[, <stop>[, false]])
	// 		-> <string>
	//
	buildArgsPattern: function(prefix='elem', stop='', regexp='smig'){
		var pattern = this.MACRO_ARGS
			.replace(/PREFIX/g, prefix)
			.replace(/STOP/g, stop)
		return regexp ?
			new RegExp(pattern, regexp) 
			: pattern },

	//
	// needs:
	// 	MACROS
	// 	INLINE_ARGS
	// 	UNNAMED_ARGS
	// 	ARGS
	//
	// XXX BUG?: this does not consume closing ')'...
	//	 		`A @(aaa @(bbb)) B` 
	// 				-> ['A', '@(aaa', '@(bbb', ')) B'] (simplified)
	// 		This works correctly:
	// 			`A @(aaa "@(bbb)") B` 
	MACRO: '('+([
			// @macro(arg ..)
			'\\\\?@(?<nameInline>MACROS)\\((?<argsInline>INLINE_ARGS)\\)',
			// @(arg ..)
			'\\\\?@\\((?<argsUnnamed>UNNAMED_ARGS)\\)',
			// <macro ..> | <macro ../>
			'<\\s*(?<nameOpen>MACROS)(?<argsOpen>\\sARGS)?\\s*/?>',
			// </macro>
			'</\\s*(?<nameClose>MACROS)\\s*>',
		].join('|'))+')',
	MACRO_PATTERN: undefined,
	MACRO_PATTERN_GROUPS: undefined,
	//
	// 	.buildMacroPattern(<macros>[, <flags>])
	// 		-> <pattern>
	//
	// 	.buildMacroPattern(<macros>[, false])
	// 		-> <string>
	//
	buildMacroPattern: function(macros=['MACROS'], regexp='smig'){
		var pattern = this.MACRO
			.replace(/MACROS/g, 
				macros
					.filter(function(m){ 
						return m.length > 0 })
					.join('|'))
			.replace(/INLINE_ARGS/g,
				this.buildArgsPattern('inline', ')', false) +'*')
			.replace(/UNNAMED_ARGS/g,
				this.buildArgsPattern('unnamed', ')', false) +'*')
			.replace(/ARGS/g, 
				this.buildArgsPattern('elem', '\\/>', false) +'*')
		return regexp ?
			new RegExp(pattern, regexp) 
			: pattern },
	countMacroPatternGroups: function(){
		// NOTE: the -2 here is to compensate for the leading and trailing ""'s...
		return '<MACROS>'.split(this.buildMacroPattern()).length - 2 },

	// XXX should this be closer to .stripComments(..)
	// XXX do we need basic inline and block commets a-la lisp???
	COMMENT_PATTERN: RegExp('('+[
			// <!--[pwiki[ .. ]]-->
			'<!--\\[pwiki\\[(?<uncomment>.*?)\\]\\]-->',

			// <pwiki-comment> .. </pwiki-comment>
			'<\\s*pwiki-comment[^>]*>.*?<\\/\\s*pwiki-comment\\s*>',
			// <pwiki-comment .. />
			'<\\s*pwiki-comment[^\\/>]*\\/>',

			// html comments...
			'<!--.*?-->',
		].join('|') +')', 'smig'),


	// helpers...
	//
	normalizeFilters: function(filters){
		var skip = new Set()
		return filters
			.flat()
			.tailUnique()
			.filter(function(filter){
				filter[0] == '-'
					&& skip.add(filter.slice(1))
				return filter[0] != '-' }) 
			.filter(function(filter){
				return !skip.has(filter) })},
	//
	// Spec format:
	// 	[<orderd>, ... [<keyword>, ...]]
	//
	// Keyword arguments if given without a value are true by default, 
	// explicitly setting a keyword argument to 'true' or 'yes' will set 
	// it to true, explicitly setting to 'false' or 'no' will set it to 
	// false, any other value will be set as-is...
	//
	// NOTE: the input to this is formatted by .lex(..)
	// NOTE: arg pre-parsing is dome by .lex(..) but at that stage we do not
	// 		yet touch the actual macros (we need them to get the .arg_spec)
	// 		so the actual parsing is done in .expand(..)
	parseArgs: function(spec, args){
		// spec...
		var order = spec.slice()
		var bools = new Set(
			order[order.length-1] instanceof Array ?
				order.pop()
				: [])
		order = order
			.filter(function(k){
				return !(k in args) })

		var res = {}
		var pos = Object.entries(args)
			// stage 1: populate res with explicit data and place the rest in pos...
			.reduce(function(pos, [key, value]){
				;/^[0-9]+$/.test(key) ?
					(bools.has(value) ?
						// bool...
						(res[value] = true)
						// positional...
						: (pos[key*1] = value))
					// keyword/bool default values...
					: bools.has(key) ?
						(res[key] = 
							// value escaping...
							value[0] == '\\' ?
								value.slice(1)
							: (value == 'true' || value == 'yes') ?
								true
							: (value == 'false' || value == 'no') ?
								false
							: value)
					// keyword...
					: (res[key] = value)
				return pos }, [])
			// stage 2: populate implicit values from pos...
			.forEach(function(e, i){
				order.length == 0 ?
					(res[e] = true)
					: (res[order.shift()] = e) })
		return res },
	// NOTE: this unifies the body, body argument and text argument (in 
	// 		order of priority) and passes the value in the body macro 
	// 		handler argument.
	// XXX should a macro be run in the context of the page or the parser???
	callMacro: function(page, macro, args, body, state, ...rest){
		do {
			macro = this.macros[macro] 
		} while(typeof(macro) == 'string')
		var args = 
			this.parseArgs(
				macro.arg_spec 
					?? [], 
				args)
		body = body == '' ?
			undefined
			: body
		if(args.body 
				|| args.text 
				|| body){
			body = 
			args.body = 
			args.text =
				body
					?? args.body 
					?? args.text }
		return macro.call(this, page, args, body, state, ...rest) },

	// place join block between block elements...
	joinBlocks: function(page, blocks, join, state){
		var that = this
		if(typeof(blocks) == 'string' 
				|| join == null){
			return blocks }
		// we do not need to rebuild the ast for each use...
		// XXX this can break things -- need to store the parse stage 
		// 		in the structure so as to determine where we left off...
		// 		...the problem is that we can't tell the difference 
		// 		between a parsed and expanded stages -- one way, re-running 
		// 		a stage is not an issue but the other way, skipping can 
		// 		break...
		//join = this.ast(page, join, state)
		return blocks
			.map(function(block, i, l){
				return [
					block,
					...(i < l.length-1 ?
						that.expand(page, join, state)
						: []),
				] })
			.flat() },
	filterBlocks: function(page, blocks, filter, state){
		if(filter == null){
			return blocks }

		// XXX

		return blocks },


	// Strip comments...
	//
	stripComments: function(str){
		return str
			.replace(this.COMMENT_PATTERN, 
				function(...a){
					return a.pop().uncomment 
						|| '' }) },

	// Lexically split the string (generator)...
	//
	// 	<item> ::=
	// 		<string>
	// 		| {
	// 			name: <string>,
	// 			type: 'inline'
	// 				| 'element'
	// 				| 'opening'
	// 				| 'closing',
	// 			args: {
	// 				<index>: <value>,
	// 				<key>: <value>,
	//
	// 				...
	//
	// 				// special case: .body argument's value is treated in
	// 				//		the same way as block body -- it is parsed.
	// 				body: <ast>,
	// 			}
	// 			match: <string>,
	// 		}
	//
	//
	// NOTE: this internally uses .macros' keys to generate the 
	// 		lexing pattern.
	lex: function*(str){
		str = typeof(str) != 'string' ?
			str+''
			: str
		// XXX we can't get .raw from the page without going async...
		//str = str 
		//	?? page.raw
		// NOTE: we are doing a separate pass for comments to completely 
		// 		decouple them from the base macro syntax, making them fully 
		// 		transparent...
		str = this.stripComments(str)

		// XXX should this be cached???
		var macro_pattern = this.MACRO_PATTERN 
			?? this.buildMacroPattern(Object.deepKeys(this.macros))
		var macro_pattern_groups = this.MACRO_PATTERN_GROUPS 
			?? this.countMacroPatternGroups()
		var macro_args_pattern = this.MACRO_ARGS_PATTERN 
			?? this.buildArgsPattern()

		var lst = str.split(macro_pattern)

		var macro = false
		while(lst.length > 0){
			if(macro){
				var match = lst.splice(0, macro_pattern_groups)[0]
				// NOTE: we essentially are parsing the detected macro a 
				// 		second time here, this gives us access to named groups
				// 		avoiding maintaining match indexes with the .split(..) 
				// 		output...
				// XXX for some reason .match(..) here returns a list with a string...
				var cur = [...match.matchAll(macro_pattern)][0].groups
				// special case: escaped inline macro -> keep as text...
				if(match.startsWith('\\@')){
					yield match
					macro = false 
					continue }
				// args...
				var args = {}
				var i = -1
				for(var {groups} 
						of (cur.argsInline 
								?? cur.argsUnnamed
								?? cur.argsOpen 
								?? '')
							.matchAll(macro_args_pattern)){
					i++
					args[groups.elemArgName 
							?? groups.inlineArgName 
							?? groups.unnamedArgName 
							?? i] =
						(groups.elemSingleQuotedValue 
								?? groups.inlineSingleQuotedValue
								?? groups.unnamedSingleQuotedValue
								?? groups.elemDoubleQuotedValue
								?? groups.inlineDoubleQuotedValue
								?? groups.unnamedDoubleQuotedValue
								?? groups.elemValue
								?? groups.inlineValue
								?? groups.unnamedValue
								?? groups.elemSingleQuotedArg
								?? groups.inlineSingleQuotedArg
								?? groups.unnamedSingleQuotedArg
								?? groups.elemDoubleQuotedArg
								?? groups.inlineDoubleQuotedArg
								?? groups.unnamedDoubleQuotedArg
								?? groups.elemArg
								?? groups.inlineArg
								?? groups.unnamedArg)
							.replace(/\\(["'])/g, '$1') }

				// macro-spec...
				yield {
					name: (cur.nameInline 
							?? cur.nameOpen 
							?? cur.nameClose
							?? '')
						.toLowerCase(),
					type: match[0] == '@' ?
							'inline'
						: match[1] == '/' ?
							'closing'
						: match[match.length-2] == '/' ?
							'element'
						: 'opening',
					args, 
					match,
				}
				macro = false
			// normal text...
			} else {
				var str = lst.shift()
				// skip empty strings from output...
				if(str != ''){
					yield str }
				macro = true } } },

	// NOTE: so as to avod cluterring the main parser flow the macros are
	// 		defined separtly below...
	macros: undefined,

	// Group block elements (generator)...
	//
	// 	<item> ::=
	// 		<string>
	// 		| {
	// 			type: 'inline'
	// 				| 'element'
	// 				| 'block',
	// 			body: [
	// 				<item>,
	// 				...
	// 			],
	//
	//			// rest of items are the same as for lex(..)
	// 			...
	// 		}
	//
	// Special arguments:
	// 	.args.body | .args.text
	// 		- if .body is given both arges are ignored and dropped
	// 		- if .body is empty and one of the args is present it's 
	// 			content will be set as .body and grouped while the rest 
	// 			is dropped
	// 		- priority order:
	// 			.body -> .args.body -> .args.text
	//
	// NOTE: this internaly uses .macros to check for propper nesting
	group: function*(lex, to=false, context){
		lex = typeof(lex) != 'object' ?
			this.lex(lex)
			: lex

		var quoting = to 
			&& !!this.macros[to].quoting
			&& []

		// NOTE: we are not using for .. of .. here as it depletes the 
		// 		generator even if the end is not reached...
		while(true){
			var {value, done} = lex.next()
			// check if unclosed blocks remaining...
			if(done){
				if(to){
					throw new Error(
						'Premature end of input: Expected </'+ to +'>') }
				return }

			// special case: quoting -> collect text...
			// NOTE: we do not care about nesting here...
			if(quoting !== false){
				if(value.name == to 
						&& value.type == 'closing'){
					yield quoting.join('')
					return
				} else {
					quoting.push(
						typeof(value) == 'string' ?
							value
							: value.match ) }
				continue }

			// assert nesting rules...
			// NOTE: we only check for direct nesting...
			// XXX might be a good idea to link nested block to the parent...
			if(this.macros[value.name] instanceof Array
					// stray nesting...
					&& (context 
						&& !this.macros[value.name].includes(context))
					// stray nesting/closing...
					&& !this.macros[value.name].includes(to)
					// do not complain about closing nestable tags...
						&& !(value.name == to 
							&& value.type == 'closing') ){
				throw new Error(
					'Unexpected <'+ value.name +'> macro' 
						+(to ? 
							' in <'+to+'>' 
							: '')) }

			// open block...
			if(value.type == 'opening'){
				//value.body = [...this.group(lex, value.name)]
				value.body = [...this.group(lex, value.name, value)]
				value.type = 'block'

				// unify .body, .args.body and .args.text into .body...
				// (first non-empty takes precedance, the rest are removed)
				if(value.body.length == 0 
						&& (value.args.body 
							?? value.args.text)){
					value.body = 
						[...this.group(
							value.args.body
								?? value.args.text,
							false,
							value.name)] }
				delete value.args.body
				delete value.args.text 

			// close block...
			} else if(value.type == 'closing'){
				if(value.name != to){
					throw new Error('Unexpected </'+ value.name +'>') }
				// NOTE: we are intentionally not yielding the value here...
				// 		...this supports the above scan use-case.
				return } 

			// normal value...
			yield value } }, 

	// NOTE: the output of this can be safely cached, it does not depend
	// 		on anything external and as long as the code stays the same 
	// 		this will not change.
	// XXX do we need a pre-parse stage???
	// 		- expand local macros
	// 		- collect links
	// 		- ...
	ast: function(...args){
		return [...this.group(...args)] },

	// Expand macros (stage I)...
	//
	// 	.expand(<page>, <ast>[, <state>])
	// 		-> <ast>
	//
	//
	//	<ast> ::= [ <item>, .. ]
	// 	<item> ::=
	// 		{
	// 			<group-data>
	// 			value: ...,
	// 		}
	// 		| <string>
	//
	// NOTE: the returned structure is re-expandable.
	//
	//
	//	<state> ::= {
	//		// wait for last non-isolated...
	//		waitNested: <promise> | null,
	//
	//		// wait for last isolated...
	//		waitAll: <promise> | null,
	//
	//		// wait for all...
	//		// NOTE: this is set just before .expand(..) returns and is 
	//		//		not available during the expansion process.
	//		wait: <promise> | null,
	//
	//		...
	//	}
	//
	// NOTE: .waitNested and .waitAll are "live", i.e. while expanding,
	//		at any given time they contain the promise of the last async
	//		element upto the point of read. .wait however is set at the 
	//		end of .expand(..), i.e. it has no meaning until .expand(..)
	//		finishes, and represents the last .waitAll but will return 
	//		the whole expanded ast.
	//
	//
	// XXX the parser is always sync
	// 			- macros always return sync but can be resolved or not resolved
	// 			- each level is always sequential
	// 			- isolated macros can be resolved in any order
	// 			- macros can wait on:
	// 				- nested
	// 					e.g. a @var needs all the previous @var's to resolve 
	// 					but does not care about isolated @include's
	// 				- full
	// 					a full include needs all nesteds to resolve, both 
	// 					isolated and not
	// 			- first nested item in one macro waits for last relevant 
	// 				nested item in previous macro -> i.e. for previous 
	// 				macro to resolve in a relevant way...
	// 			- everything returns an ast
	// 			- callbacks/events/handlers to trigger on specific macro 
	// 				resolution
	// XXX Remove async/await... (???)
	//			- for trivial stuff they are nice
	//			- infectios -- force all subsequent levels to use async/await
	//			- provide no alternatives
	//				...i.e. promises can be extended to indlude partial 
	//				states and the like, async/await can't...
	// XXX Q: do we need generators?
	// XXX Handle errors...
	fullAST: true,
	// XXX this needs a careful rewrite of the .macros.* for the new scheme:
	// 		- expand
	// 		- "merge"
	// 			a rendering API: a set ov events/callbacks allowing both 
	// 			sync (text) and async (DOM) rendering
	// 			in the simplest form: take the expanded AST and merge 
	// 			into a single string
	// XXX BUG: .wait can resolve before everything in the tree is resolved...
	// 		to reproduce:
	// 			@include(/async/recursive/SelfOther recursive="recursion found")
	expand: function(page, ast, state={}, nested_handlers={}){
		var that = this
		ast = typeof(ast) != 'object' ?
				this.group(ast)
			: ast instanceof types.Generator ?
				ast
			: ast.iter()

		var elems = []
		for(let elem of ast){

			// text block...
			if(typeof(elem) != 'object'){
				elems.push(elem)
				continue }
			// do not re-expand expanded elements...
			if('value' in elem
					&& !state.forceReExpand){
				elems.push(serialize.partialDeepCopy(elem))
				continue }

			// cleanup...
			elem = serialize.partialDeepCopy(elem)
			delete elem.error
			delete elem.value
			//delete elem.resolving

			var {name, args, body} = elem

			// nested macro...
			if(that.macros[name] instanceof Array){
				// call handler...
				if(nested_handlers[name]){
					elems.push(
						nested_handlers[name].call(that, elem))
				// skip...
				} else {
					elems.push(elem) }
				continue }
			// drop non-macros/aliases...
			if(typeof(that.macros[name]) != 'function' 
					&& typeof(that.macros[name]) != 'string'){
				continue }

			// expand down...
			// XXX cache this as an AST
			body 
				&& !that.macros[name].lazy
				&& (body = this.expand(page, body, state, nested_handlers))

			// call macro...
			var res = that.callMacro(page, name, args, body, state)
			// async...
			if(res instanceof Promise){
				let all, nested
				all = state.waitAll = 
					Promise.all([state.waitAll, res])
				elem.resolving = res
				// XXX do we need to wait till the last .waitNested is 
				// 		resolved?
				// 		...should it's handlers complete??
				// XXX can this be controlled by the macro???
				// 		...one way to do in is to ger pass a resolve(..) 
				// 		func to the macro...
				// 		...do we need this?
				if(!res.isolated){
					nested = state.waitNested = 
						Promise.all([state.waitNested, res]) }
				res.then(
					function(value){
						if(state.waitAll === all){
							delete state.waitAll }
						if(state.waitNested === nested){
							delete state.waitNested }
						delete elem.resolving
						elem.value = value 
						return value },
					function(err){
						state.errors ??= []
						state.errors.push(elem)
						delete elem.resolving
						elem.error = err })
			// sync...
			} else if('fullAST' in state ?
						state.fullAST
					: 'fullAST' in page ?
						page.fullAST
					: this.fullAST){
				elem.value = res
			} else {
				elem = res }
			elems.push(elem) }

		// cleanup...
		var wait
		var waitAll = state.waitAll
		state.waitAll
			&& state.waitAll
				.then(function(){
					// only cleanup our own mess =)
					waitAll === state.waitAll
						&& (delete state.waitAll) })
			&& (wait = state.wait = waitAll
				.then(function(){ 
					wait === state.wait
						&& (delete state.wait)
					return elems }))
		var waitNested = state.waitNested
		state.waitNested
			&& state.waitNested
				.then(function(){
					// only cleanup our own mess =)
					waitNested === state.waitNested
						&& (delete state.waitNested) })

		return elems },

	// resolve stage II macros and merge results...
	//
	//	<ast> ::= [ <item>, ... ]
	//	<item> ::=
	//		<basic-value>
	//		| <elem>
	//
	// <elem> is returned if its value is not resolved yet.
	//
	//
	// NOTE: to fully resolve the ast this may need to be called several 
	// 		times...
	//
	//
	// XXX these yeild different results:
	// 			r = parser.resolve(
	// 				tests.P, 
	// 				'<slot X>@include(/async/page)</slot> <slot X value>',
	// 				s = {})
	// 			s.wait.then(function(){
	// 				console.log(r) }) // -> ['Page '] (err)
	// 		and:
	// 			r = parser.expand(
	// 				tests.P, 
	// 				'<slot X>@include(/async/page)</slot> <slot X slot/>',
	// 				s = {})
	// 			s.wait.then(function(){
	// 				r = parser.resolve(test.P, r, s)
	// 				console.log(r) }) // -> ['slot '] (correct)
	// 		-> promises seem to not be sequenced correctly here...
	// 		XXX it looks like the first slot is resolved before the last 
	// 			slot has a chance to set the value as it is waiting for 
	// 			the first slot to finish...
	resolve: function(page, ast, state={}, nested_handlers={}){
		var that = this
		ast = typeof(ast) != 'object' ?
				this.expand(page, ast, state, nested_handlers)
			: ast instanceof types.Generator ?
				ast
			: ast.iter()

		// merge resolved elements into the last item of elems...
		// XXX can ast be a promise???
		// XXX elems can be unresolved -- need a merge strategy for them...
		var  elems = []
		for(var elem of ast){
			// nesting...
			while(elem && elem.value){
				// exec stage II macros...
				if(typeof(elem.value) == 'function'){
					let e = elem
					Promise.awaitOrRun(
						// if not everything is resolved, delay the stage II
						// callbacks till .wait is done...
						state.wait,
						function(){
							return elem = e.value = 
								e.value(state) }) 
					break } 
				elem = elem.value }
			if(elem == null){
				continue }
			// atomic values...
			if(typeof(elem) != 'object'){
				elems.push(elem) 
				continue }
			// value is resolved but "empty" -> skip...
			if('value' in elem 
					&& (elem.value == null 
						|| elem.value == '')){
				continue }
			// expand ast...
			if(elem instanceof Array){
				elems.push(...that.resolve(page, elem, state)) 
				continue }
			// nested macro with no value set -- skip...
			if(that.macros[elem.name] instanceof Array){
				continue }
			//* XXX unresolved...
			;(state.unresolved ??= [])
				.push(elem.resolving instanceof Promise ?
					elem.resolving
					: elem)
			//*/
			// NOTE: we do not need to expand .body attributes as these 
			// 		are the responsibility of the respective macros...
			elems.push(elem) }

		return elems },

	// XXX render api...
	// XXX how should this play with filters???
	// 		...should filters be client-side only??
	render: function*(page, ast, callback, state={}){
		// XXX
	},

	parse: function(page, ast, state={}, nested_handlers={}, wait='wait'){
		var that = this
		// XXX might be a good idea to limit recursion depth here...
		var merge = function(ast){
			return Promise.awaitOrRun(
				...state.unresolved,
				function(){
					delete state.unresolved
					// re-resolve...
					ast = that.resolve(page, ast, state, nested_handlers)

					return state.unresolved ?
						merge(ast)
						: (ast ?? '').join('') }) }

		return Promise.awaitOrRun(
			this.resolve(page, ast, state, nested_handlers),
			state[wait],
			function(ast){
				// NOTE: since we are waiting for state[wait], state.unresolved
				// 		might get cleaned out by this point so we need to check
				// 		manually...
				for(var e of ast){
					if(typeof(e) == 'object'){
						state.unresolved = []
						break } }
				return state.unresolved ?
					merge(ast)
					: (ast ?? '').join('') }) },


	// XXX how should this play with filters???
	// 		...should filters be client-side only??
	parseNested: function(page, ast, state={}, nested_handlers={}){
		return this.parse(page, ast, state, nested_handlers, 'waitNestedi') },
}


// XXX do we need anything else like .doc, attrs???
// XXX might be a good idea to offload arg value parsing to here...
// XXX should macros be lazy by default???
var Macro =
module.Macro = 
function(spec, func){
	var args = [...arguments]
	// function...
	func = args.pop()
	// arg sepc...
	;(args.length > 0 
			&& args[args.length-1] instanceof Array)
		&& (func.arg_spec = args.pop())
	return func }


var isolated =
module.isolated = 
function(macro){
	macro.isolated = true
	return macro }


// body: ast
var lazy =
module.lazy =
function(macro){
	macro.lazy = true
	return macro }

// body: as text
var quoting =
module.quoting =
function(macro){
	macro.quoting = true
	return macro }



// XXX RENAME...
// 		...this is more of an expander/executer...
// 		...might be a good idea to also do a check without executing...
var parser =
module.parser = {
	__proto__: BaseParser,

	//
	// 	<macro>(<args>, <body>, <state>){ .. }
	// 		-> undefined
	// 		-> <text>
	// 		-> <array>
	// 		-> <iterator>
	// 		-> <func>(<state>)
	// 			-> ...
	//
	// XXX do we need to make .macro.__proto__ module level object???
	// XXX ASYNC make these support async page getters...
	macros: {

		// Filter...
		//
		// 	@filter(<filter-spec>)
		// 	<filter <filter-spec>/>
		//
		// 	<filter <filter-spec>>
		// 		...
		// 	</filter>
		//
		// 	<filter-spec> ::=
		// 		<filter> <filter-spec>
		// 		| -<filter> <filter-spec>
		//
		// XXX BUG: this does not show any results:
		//			pwiki.parse('<filter test>moo test</filter>')
		//				-> ''
		//		while these do:
		//    		pwiki.parse('<filter test/>moo test')
		//				-> 'moo TEST'
		//			await pwiki.parse('<filter test>moo test</filter>@var()')
		//				-> 'moo TEST'
		//		for more info see:
		//			file:///L:/work/pWiki/pwiki2.html#/Editors/Results
		//		XXX do we fix this or revise how/when filters work???
		//			...including accounting for variables/expansions and the like...
		// XXX REVISE...
		// XXX UPDATE...
		filter: function(parser, args, body, state, expand=true){
			var that = this

			var outer = state.filters = 
				state.filters ?? []
			var local = Object.keys(args)

			// trigger quote-filter...
			var quote = local
				.map(function(filter){
					return (that.filters[filter] ?? {})['quote'] ?? [] })
				.flat()
			quote.length > 0
				&& parser.macros['quote-filter'].call(
					this, 
					parser, 
					Object.fromEntries(Object.entries(quote)), 
					null, 
					state)

			// local filters...
			if(body != null){
				// expand the body...
				var ast = expand ?
						this.__parser__.expand(this, body, state)
					: body instanceof Array ?
						body
					// NOTE: wrapping the body in an array effectively 
					// 		escapes it from parsing...
					: [body]

				return function(state){
					// XXX can we loose stuff from state this way???
					// 		...at this stage it should more or less be static -- check!
					return Promise.awaitOrRun(
						// XXX how do we resolve the await loop?
						parser.parseNested(this, ast, {
							...state,
							filters: local.includes(this.ISOLATED_FILTERS) ?
								local
								: [...outer, ...local],
						}),
						function(res){
							return {data: res} }) }
			// global filters...
			} else {
				state.filters = [...outer, ...local] } },


		// Args...
		//
		//	@(<name>[ <else>][ local])
		//	@(name=<name>[ else=<value>][ local])
		//
		//	@arg(<name>[ <else>][ local])
		//	@arg(name=<name>[ else=<value>][ local])
		//
		//	<arg <name>[ <else>][ local]/>
		//	<arg name=<name>[ else=<value>][ local]/>
		//
		// Resolution order:
		// 		- local
		// 		- .renderer
		// 		- .root
		//
		// NOTE: else (default) value is parsed when accessed...
		'': 'arg',
		arg: Macro(
			['name', 'else', ['local']],
			function(page, args, _, state){
				var v = (page.args ?? {})[args.name] 
					|| (!args.local 
						&& (page.renderer
							&& page.renderer.args[args.name])
						|| (page.root
							&& page.root.args[args.name]))
				v = v === true ?
					args.name
					: v
				return v
					|| (args['else']
						&& this.expand(this, args['else'], state)) }),
		args: function(page){
			return pwpath.obj2args(page.args) },

		// XXX EXPERIMENTAL...
		//
		// NOTE: var value is parsed only on assignment and not on dereferencing...
		//
		// XXX should alpha/Alpha be 0 (current) or 1 based???
		// XXX do we need a default attr???
		// 		...i.e. if not defined set to ..
		// XXX INC_DEC do we need inc/dec and parent???
		'var': Macro(
			['name', 'text', 
				// XXX INC_DEC
				['shown', 'hidden', 
					'parent', 
					'inc', 'dec', 
					'alpha', 'Alpha', 'roman', 'Roman']],
				/*/
				['shown', 'hidden']],
				//*/
			function(page, args, body, state){
				var that = this
				var name = args.name
				if(!name){
					return '' }

				return Promise.awaitOrRun(
					this.parseNested(page, name, state),
					function(name){
						// XXX INC_DEC
						var inc = args.inc
						var dec = args.dec
						//*/
						var text = args.text 
							?? body 
						// NOTE: .hidden has priority...
						var show = 
								('hidden' in args ?
									!args.hidden
									: undefined)
								?? args.shown 

						var vars = state.vars ??= {}
						// XXX INC_DEC
						if(args.parent && name in vars){
							while(!vars.hasOwnProperty(name)
									&& vars.__proto__ !== Object.prototype){
								vars = vars.__proto__ } }

						var handleFormat = function(value){
							// roman number...
							if(args.roman || args.Roman){
								var n = parseInt(value)
								return isNaN(n) ?
										''
									: args.Roman ?
										n.toRoman()
									: n.toRoman().toLowerCase() }
							// alpha number...
							if(args.alpha || args.Alpha){
								var n = parseInt(value)
								return isNaN(n) ?
										''
									: args.Alpha ?
										n.toAlpha().toUpperCase()
									: n.toAlpha() } 
							return value }

						// inc/dec...
						if(inc || dec){
							if(!(name in vars) 
									|| isNaN(parseInt(vars[name]))){
								return '' }
							var cur = parseInt(vars[name])
							cur += 
								inc === true ? 
									1 
								: !inc ?
									0
								: parseInt(inc)
							cur -= 
								dec === true ? 
									1 
								: !dec ?
									0
								: parseInt(dec)
							vars[name] = cur + ''

							// as-is...
							return show ?? true ?
								handleFormat(vars[name])
								: '' }
						//*/

						// set...
						if(text){
							return Promise.awaitOrRun(
								//state.waitNested,
								that.parseNested(page, text, state),
								function(value){
									text = vars[name] = value
									return show ?? false ?
										text
										: '' })
						// get...
						} else {
							return handleFormat(vars[name] ?? '') } }) }),
		vars: function(page, args, body, state){
			var that = this
			var lst = []
			for(var [name, value] of Object.entries(args)){
				lst.push(
					this.parseNested(page, name, state),
					this.parseNested(page, value, state)) }
			var vars = state.vars ??= {}
			return Promise.awaitOrRun(
				state.waitNested,
				...lst,
				function(_, ...lst){
					for(var i=0; i < lst.length; i+=2){
						vars[lst[i]] = lst[i+1] }
					return '' }) },

		// Slot...
		//
		//	<slot name=<name>/>
		//
		//	<slot name=<name> text=<text>/>
		//
		//	<slot name=<name>>
		//		...
		//	</slot>
		//
		//	Wrap previous value of slot
		//	<slot name=<name>>
		//		...
		//		<content/>
		//		...
		//	</slot>
		//
		//	Force show a slot...
		//	<slot shown ... />
		//
		//	Force hide a slot...
		//	<slot hidden ... />
		//
		// NOTE: slots are expanded in order of occurance not in order 
		// 		of topology, thus nested can override slots they are 
		// 		nested in, e.g.:
		// 			'<slot moo>[[ <slot moo "new value"> ]]</slot>'
		// 		will resolve to:
		// 			'new value'
		// NOTE: by default only the first slot with <name> is visible, 
		// 		all other slots with <name> will replace its content, unless
		// 		explicit shown/hidden arguments are given.
		// NOTE: hidden has precedence over shown if both are given.
		//
		// XXX can there be a situation where not all <content/> elements 
		// 		are cleared???
		// XXX revise the use of hidden/shown use mechanic and if it's 
		// 		needed...
		slot: Macro(
			['name', 'text', ['shown', 'hidden']],
			// NOTE: this is needed to be able to control the sequence of
			// 		overrides in nesteed slots...
			lazy(
			function(page, args, body, state){
				var that = this
				var name = args.name

				return Promise.awaitOrRun(
					this.parseNested(page, name, state),
					function(name){
						var slots = state.slots ??= {}

						//var hidden = name in slots
						var hidden = 
							// 'hidden' has priority... 
							args.hidden
								// explicitly show... ()
								|| (args.shown ?
									false
									// show first instance...
									: name in slots)

						// set slot value...
						//
						var slot = slots[name] ??= []
						// NOTE: the placeholder is a stand-in for our 
						// 		current value that is still to be generated...
						var placeholder = [...slot]
						slot.splice(0, slot.length, placeholder)
						// expand body...
						body = body ?
							// XXX can we pass content handler here???
							that.expand(page, body ?? [], state, {})
							: body
						// if slot not overriden, write our value...
						if(slot[0] === placeholder){
							slot.splice(0, slot.length, 
								...(body != null ?
									[body]
									: placeholder)) 
							// placeholder -> <content/>
							body = placeholder }
						// <content/> -- handle slot's original value... 
						slot[0] = 
							body.flat().length > 0 
									&& slot[0] instanceof Array ?
								slot[0]
									.map(function(e){
										if(e && e.name == 'content'){
											return body }
										return e })
								: slot[0]

						return hidden ?
							''
							: Object.assign(
								// stage II: place the latest slot value...
								function(st){
									return ((st ?? state).slots ?? {})[name] },
								{slot: name}) }) })), 


		//
		// 	@include(<path>)
		//
		// 	@include(<path> isolated recursive=<text>)
		// 	@include(src=<path> isolated recursive=<text>)
		//
		// 	<include src=<path> .. >
		// 		...
		// 		<concent/>
		// 		...
		// 	</include>
		//
		// NOTE: if body is not empty and <content/> is not present, the 
		// 		included page will not be placed.
		// NOTE: body is expanded in the context of the included page
		// NOTE: there can be two ways of recursion in pWiki:
		// 			- flat recursion
		// 				/A -> /A -> /A -> ..
		// 			- nested recursion 
		// 				/A -> /A/A -> /A/A/A -> ..
		// 		Both can be either direct (type I) or indirect (type II).
		// 		The former is trivial to check for while the later is 
		// 		not quite so, as we can have different contexts at 
		// 		different paths that would lead to different resulting 
		// 		renders.
		// 		At the moment nested recursion is checked in a fast but 
		// 		not 100% correct manner focusing on path depth and ignoring
		// 		the context, this potentially can lead to false positives.
		//
		// XXX do we need the <context/> nested macro???
		// XXX should this resolve join and/or body in the context of the 
		// 		included page or the outer page (current)???
		// XXX add path recursion test to data -- fail if two paths resolve 
		// 		to the same context...
		// XXX need a way to make encode option transparent...
		// XXX do we want to load a specific slot/block???
		// XXX REVISE...
		INCLUDE_LIMIT: 20,
		include: Macro(
			['src', 'recursive', 'join', 
				['s', 'strict', 'isolated']],
			// XXX thinking that reimplementing this is a bit less boring than
			// 		refactoring, and should be cleaner...
			// XXX if the src is empty return nothing...
			// XXX need a wrapper protocol -- is this the level for it???
			// XXX page API used:
			// 		.resolvePathVars(path)
			// 		.get(path)
			// 			is this a promise/value, iterable promise a generator
			// 			an async generator, ... or a combination/stack of the above???
			lazy(
			function(page, args, body, state, handler){
				var that = this

				var recursive = 
				state.recursive = 
					args.recursive 
						?? state.recursive
				// XXX get default...
				recursive ??= ''

				var base = page.basepath
				// XXX we do this before or after we parse???
				var src = page.resolvePathVars(args.src)

				return Promise.awaitOrRun(
					this.parseNested(page, src, state),
					function(src){
						// XXX should this be a tree??
						// 		...need to at least split direct and 
						// 		indirect dependencies...
						// XXX would be nice to separate direct (in-page) 
						// 		depenedencies nad nested...
						// XXX do we need the same for real paths???
						// 		no, because actual paths are meaningless 
						// 		out of context...
						var depends = ((state.depends ??= {})[src] ??= {})

						// content handler...
						handler ??= 
							function(page, body, path, text, state){
								// re-include limit...
								// XXX HACK???
								if( ++(state.included ??= {[path]: 0})[path] 
										> this.macros.INCLUDE_LIMIT ?? 20){
									// XXX BUG: for some reason for async recursion this
									// 		breaks returning [object Object] overriding
									// 		the actual return value
									if(!recursive){
										throw new Error(path +': include limit reached: '+ state.included[path]) }
									return that.expand(page, recursive, state) }
								// handle recursion...
								// XXX BUG: for some reason this does not work for async...
								// 		...and works quite differently in tests and 
								// 		in console -- returns [object Object] in the
								// 		former and hangs in the later...
 								var include_stack = state.include_stack ??= []
								if(include_stack.includes(path)){
									if(!recursive){
										throw new Error('Recursive macro: '+include_stack) }
									return that.expand(page, recursive, state) }
								include_stack.push(path)

								// XXX check cache???

								var nested
								var res = args.isolated ?
									this.resolve(
										page, 
										text, 
										nested = args.isolated == 'partial' ?
											serialize.partialDeepCopy(state)
											: {})
									: this.expand(page, text, state)

								// handle recursion...
								Promise.awaitOrRun(
									(nested ?? {}).waitAll,
									state.waitAll,
									function(){
										state.include_stack.at(-1) == src
											&& state.include_stack.pop()
										// cleanup...
										if(state.include_stack.length == 0){
											delete state.include_stack
											delete state.recursive } }) 

								return res }

						var pageHandler =
							function([path, text]){
								// handle nested promises...
								return Promise.awaitOrRun(
									text,
									function(text){
										return handler.call(that, page, body, path, text, state) }) }

						// get and run things...
						return Promise.awaitOrRun(
							page.get(src).matched,
							page.get(src).raw,
							function(paths, texts){
								texts = 
									// XXX how do we handle paths returning non-strings???
									// special case: list page...
									paths.length == 1
											&& texts instanceof Array ?
										[texts]
									: texts instanceof Array ?
										texts
									: [texts ?? '']
								return Promise.awaitOrRun(
									// handle pages...
									Promise
										.iter(
											that.joinBlocks(
												page,
												Array
													.zip(paths, texts)
													.map(pageHandler),
												args.join,
												state))
										.flat()
										.sync(),
									function(pages){
										/* XXX cache the final result...
										cache[src] = pages
										//*/
										return pages }) }) }) })),

		// NOTE: the main difference between this and @include is that 
		// 		this renders the src in the context of current page while 
		// 		include is rendered in the context of its page but with
		// 		the same state...
		// 		i.e. for @include(PATH) the paths within the included page 
		// 		are resolved relative to PATH while for @source(PATH) 
		// 		relative to the page containing the @source(..) statement...
		source: Macro(
			['src', 'recursive', 'join', 
				['s', 'strict']],
			//['src'],
			function(page, args, body, state){
				var that = this
				return this.macros['include'].call(this, 
					page, args, body, state,
					function(page, src, text, state){
						return that.expand(page, text, state) }) }),

		// Load macro and slot definitions but ignore the page text...
		//
		// NOTE: this is essentially the same as @source(..) but returns ''.
		load: Macro(
			['src'],
			function(page, args, body, state){
				var that = this
				return Promise.awaitOrRun(
					this.macros['include'].call(this, page, args, body, state),
					function(){
						return '' }) }),

		//
		// 	@quote(<src>)
		//
		// 	<quote src=<src>[ filter="<filter> ..."]/>
		//
		// 	<quote text=" .. "[ filter="<filter> ..."]/>
		//
		// 	<quote[ filter="<filter> ..."]>
		// 		..
		// 	</quote>
		//
		// This has two modes of operation, i.e. the body can be treated
		// in two destinct ways:
		// 	- if both src and body are given -- like @include(..) body is 
		// 	  used as a wrapper for the quoted page
		// 	- if only body is given -- body is inderted as is without 
		// 	  any processing.
		// XXX not sure I like this, this might change in the futore...
		// 		one way to split the two is to split this into two macros,
		// 		but I can't make the split logical/obvious...
		//
		// NOTE: src ant text arguments are mutually exclusive, src takes 
		// 		priority.
		// NOTE: the filter argument has the same semantics as the filter 
		// 		macro with one exception, when used in quote, the body is 
		// 		not expanded...
		// NOTE: the filter argument uses the same filters as @filter(..)
		// XXX might be a good idea to do an auto-filter that would be 
		// 		apropriately selected according to format -- md, html, ...
		// XXX filter...
		quote: Macro(
			['src', 'join', 'filter'],
			quoting(
			function(page, args, body, state){
				var that = this
				return Promise.awaitOrRun(
					args.src 
						&& this.parseNested(page, args.src, state),
					function(src){
						var text = 
							src ?
								page.get(src).raw
							: body ?
								body
							: []
						return Promise.awaitOrRun(
							text,
							function(text){
								// XXX not sure I like that this has two "modes"...
								text = src && body ?
									// XXX do we need to account for generators???
									(text instanceof Array ?
											text
											: [text])
										.map(function(text){
											return that.expand(
												page, 
												that.ast(body.join(''), false, 'quote'), 
												state, 
												{ content: function(){
													return text }, }) })
									: text
								return that.joinBlocks(
									page, 
									that.filterBlocks(
										page, 
										text, 
										args.filter, 
										state), 
									args.join, 
									state) }) }) })),

		/* XXX
		// very similar to @filter(..) but will affect @quote(..) filters...
		'quote-filter': function(args, body, state){
			var filters = state.quote_filters = 
				state.quote_filters ?? []
			filters.splice(filters.length, 0, ...Object.keys(args)) },
		//*/

		// expand the body in the context of a page...
		// 	
		// 	<macro src=<url>> .. </macro>
		//
		// 	<macro name=<name> src=<url> sort=<sort-spec>> .. </macro>
		//
		// 	<macro ...> ... </macro>
		// 	<macro ... text=<text>/>
		//
		// 	<macro ... else=<text>> ... </macro>
		// 	<macro ...>
		// 		...
		//
		//
		// 		<join>
		// 			...
		// 		</join>
		//
		// 		<else>
		// 			...
		// 		</else>
		// 	</macro>
		//
		// Macro variables:
		// 	macro:count
		// 	macro:index
		//
		// NOTE: this handles src count argument internally partially 
		// 		overriding <store>.match(..)'s implementation, this is done
		// 		because @macro(..) needs to account for arbitrary nesting 
		// 		that <store>.match(..) can not know about...
		// 		XXX should we do the same for offset???
		//
		// XXX BUG: strict does not seem to work:
		// 				@macro(src="./resolved-page" else="no" text="yes" strict)
		// 					-> yes
		// 			should be "no"
		// 			...this seems to effect non-pattern pages...
		// XXX should macro:index be 0 or 1 (current) based???
		// XXX SORT sorting not implemented yet...
		// XXX check macro recursion...
		macro: Macro(
			['name', 'src', 'sort', 'text', 'join', 'else',
				['strict', 'isolated', 'inheritmacros', 'inheritvars']],
			lazy(
			function(page, args, body, state){
				var that = this
				return Promise.awaitOrRun(
					this.parseNested(page, args.name, state),
					function(name){
						// set macro...
						if(name && body){
							;(state.macros ??= {})[name] = body
						// get macro...
						} else if(name){
							body = (state.macros ?? {})[name] }
						return args.src && body ?
							// run macro...
							that.macros.include.call(that, page, args, body, state,
								function(page, body, path, text, state){
									var that = this

									var handle = function(page, text, state){
										return args.isolated ?
											that.resolve(
												page, 
												text, 
												Object.assign(
													args.isolated == 'partial' ?
														serialize.partialDeepCopy(state)
														: {},
													{include_stack: state.include_stack ?? []}))
											: that.expand(page, text, state) }

									//var content_handled = false
									return body ?
										// handle body / <content/>...
										Promise.awaitOrRun(
											that.expand(page.get(path), body, state, 
												{ content: function(){
													content_handled = true
													return text = handle(page, text, state) } }),
											function(text){
												// if no <content/> present we still 
												// need to handle the included page...
												//content_handled 
												//	|| handle.call(that, page, text, state)
												return text })
										// place as-is...
										: handle(page, text, state) })
							: '' }) })),

		// nesting rules...
		'else': ['macro'],
		join: ['macro'],
		// XXX do not like this name...
		content: ['slot', 'include', 'quote', 'macro'],
	},

}



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
