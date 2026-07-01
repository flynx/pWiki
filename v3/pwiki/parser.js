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
	lex: function*(page, str){
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
	//group: function*(page, lex, to=false){
	group: function*(page, lex, to=false, parent, context){
		lex = typeof(lex) != 'object' ?
			this.lex(page, lex)
			: lex

		var quoting = to 
			&& (page.QUOTING_MACROS ?? []).includes(to)
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
				//value.body = [...this.group(page, lex, value.name)]
				value.body = [...this.group(page, lex, value.name, value)]
				value.type = 'block'

				// unify .body, .args.body and .args.text into .body...
				// (first non-empty takes precedance, the rest are removed)
				if(value.body.length == 0 
						&& (value.args.body 
							?? value.args.text)){
					value.body = 
						[...this.group(
							page,
							value.args.body
								?? value.args.text,
							false,
							parent,
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
	//		wait: <promise> | null,
	//	}
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
	expand: function(page, ast, state={}){
		var that = this
		ast = typeof(ast) != 'object' ?
				this.group(page, ast)
			: ast instanceof types.Generator ?
				ast
			: ast.iter()

		var wait = new Set()
		state.wait instanceof Promise 
			&& wait.add(state.wait)
		var resolve, reject
		state.wait = new Promise(
			function(){
				;[resolve, reject] = arguments })

		var elems = []
		for(let elem of ast){
			// text block...
			if(typeof(elem) == 'string'){
				elems.push(elem)
				continue }
			// do not re-expand expanded elements...
			if('value' in elem
					&& !state.forceReExpand){
				elems.push(serialize.partialDeepCopy(elem))
				continue }

			// cleanup...
			//elem = {...elem}
			elem = serialize.partialDeepCopy(elem)
			delete elem.error
			delete elem.value
			//delete elem.resolving

			var {name, args, body} = elem

			// nested macro -- skip...
			if(that.macros[name] instanceof Array){
				elems.push(elem)
				continue }
			// drop non-macros/aliases...
			if(typeof(that.macros[name]) != 'function' 
					&& typeof(that.macros[name]) != 'string'){
				continue }

			// expand down...
			body 
				&& !that.macros[name].lazy
				&& (body = this.expand(page, body, state))

			// call macro...
			var res = that.callMacro(page, name, args, body, state)
			// async...
			if(res instanceof Promise){
				elem.resolving = res
				wait.add(res)
				state.waitAll = res
				// XXX do we need to wait till the last .waitNested is 
				// 		resolved?
				// 		...should it's handlers complete??
				// XXX can this be controlled by the macro???
				// 		...one way to do in is to ger pass a resolve(..) 
				// 		func to the macro...
				// 		...do we need this?
				if(!res.isolated){
					state.waitNested = res }
				res.then(
					function(value){
						wait.delete(res)
						if(state.waitAll === res){
							delete state.waitAll }
						if(state.waitNested === res){
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

		// handle wait for isolated macros to resolve...
		var done = function(){
			resolve(state)
			delete state.wait }
		if(wait.size > 0){
			Promise.all(wait)
				.then(
					done,
					function(err){
						reject(err) }) 
		// done...
		} else {
			done() }

		return elems },

	// resolve stage II macros and merge results...
	//
	resolve: function(page, ast, state={}){
		var that = this
		ast = typeof(ast) != 'object' ?
				this.expand(page, ast, state)
			: ast instanceof types.Generator ?
				ast
			: ast.iter()

		// merge resolved elements into the last item of elems...
		var  elems = []
		var merge = function(...args){
			var prev = ''
			while(args.length > 0){
				while(args.length > 0 
						&& typeof(args[0]) != 'object'
						&& typeof(args[0]) != 'function'){
					prev += args.shift() }
				// merged section...
				if(prev.length > 0){
					if(elems.length > 0 
							&& typeof(elems.at(-1)) == 'string'){
						elems[elems.length-1] += prev
					} else {
						elems.push(prev) }
					prev = '' }
				if(args.length > 0){
					elems.push(args.shift()) } } }

		for(var elem of ast){
			// nesting...
			while(elem && elem.value){
				elem = elem.value 
				// exec stage II macros...
				if(typeof(elem) == 'function'){
					elem = elem(state) } }
			if(elem == null){
				continue }
			// atomic values...
			if(typeof(elem) != 'object'){
				merge(elem) 
				continue }
			// value is resolved but "empty" -> skip...
			if('value' in elem 
					&& (elem.value == null 
						|| elem.value == '')){
				continue }
			// expand ast...
			if(elem instanceof Array){
				//merge(...this.resolve(page, elem, state)) 
				merge(...this.resolve(page, elem, state)) 
				continue }
			// expand .body attribute...
			if((elem.attrs ?? {}).body instanceof Array){
				elem.attrs.body = this.resolve(page, elem.attrs.body, state) }
			// nested macro with no value set -- skip...
			if(this.macros[elem.name] instanceof Array){
				continue }
			// unresolved...
			merge(elem) }

		return elems },

	// XXX render api...
	// XXX how should this play with filters???
	// 		...should filters be client-side only??
	render: function*(page, ast, callback, state={}){
		ast = this.resolve(page, ast, state)
		for(var elem of ast){
			yield Promise.awaitOrRun(
				elem,
				callback) } },

	// XXX
	_parse: function(page, ast, state={}){
		return Promise.awaitOrRun(
			this.resolve(page, ast, state),
			function(ast){
				// XXX
				if(ast.length > 1){
					throw new Error('!!!!')
				}
				return ast[0] 
					?? '' }) },
	// XXX
	// XXX how should this play with filters???
	// 		...should filters be client-side only??
	parseNested: function(page, ast, state={}){
		return Promise.awaitOrRun(
			state.waitNested,
			this._parse(page, ast, state),
			function(_, ast){
				return ast }) },

	// XXX this can't be used from within macros -- will deadlock the results...
	// XXX how should this play with filters???
	// 		...should filters be client-side only??
	parse: function(page, ast, state={}){
		return Promise.awaitOrRun(
			state.wait,
			this._parse(page, ast, state),
			function(_, ast){
				return ast }) },



	// Expand macros...
	//
	//	<ast> ::= [ <item>, .. ]
	// 	<item> ::=
	// 		<func>
	// 		| <promise>
	// 		| <string>
	// 		| { skip: true, ... }
	// 		| { data: <ast> }
	// 		| <ast>
	//
	// XXX macros: we are mixing up ast state and parse state...
	// 		one should only be used for parsing and be forgotten after 
	// 		the ast is constructed the other should be part of the ast...
	// XXX DOC inconsistent await behavior...
	//		in var macro, as an example, there are two paths: the assign and 
	//		the get, the assign calls .parse(..) and awaits for the result 
	//		while the get path is "sync", this results in the first exec path
	//		getting pushed to the next execution frame while the second is run
	//		in sync with the caller, here is a simplified demo:
	//			console.log(1)
	//			// note that we are NOTE await'ing for the function here...
	//			(async function f(){ 
	//				console.log(2)})()
	//			console.log(3)
	//				-> prints 1, 2, 3
	//		and:
	//			console.log(1)
	//			(async function f(){ 
	//				// note the await -- this is the only difference...
	//				console.log(await 2)})()
	//			console.log(3)
	//				-> prints 1, 3, 2
	//		this could both be a bug or a feature depending on how you look
	//		at it, but it makes promise sequencing very unpredictable...
	//		...another problem here is that in the var macro, simply adding
	//		an await of something does not fix the issue, we need to await 
	//		for something significant -- await this.parse('') works, while
	//		await vars[name] does not -- to the contrary of the above example...
	/* XXX
	expand: function(page, ast, state={}){
		var that = this
		ast = ast == null ?
				Promise.awaitOrRun(
					page.raw,
					function(raw){
						return that.group(page, raw ?? '') })
			: typeof(ast) != 'object' ?
				this.group(page, ast)
			: ast instanceof types.Generator ?
				ast
			: ast.iter()

		// NOTE this must execute sequentially for things that depend on 
		// 		lexical scope not to get lost in the mess...
		return Promise.seqiter(ast, 
				function(value){
					// text block...
					if(typeof(value) == 'string'){
						return value }
					// macro...
					var {name, args, body} = value
					// nested macro -- skip...
					if(typeof(that.macros[name]) != 'function'){
						return {...value, skip: true} }
					// macro call...
					return Promise.awaitOrRun(
						that.callMacro(page, name, args, body, state),
						function(res){
							res = res ?? ''
							// result...
							if(res instanceof Array 
									|| that.macros[name] instanceof types.Generator){
								return res
							} else {
								return [res] } }) },
				function(err){
					console.error(err)
					return [page.parse(
						// XXX add line number and page path...
						'@include("./ParseError'
							+':path='
								// XXX use pwpath.encodeElem(..) ???
								+ page.path 
							+':msg='
								+ err.message 
									// quote html stuff...
									.replace(/&/g, '&amp;')
									.replace(/</g, '&lt;')
									.replace(/>/g, '&gt;')
									// quote argument syntax...
									.replace(/["']/g, function(c){
										return '%'+ c.charCodeAt().toString(16) })
									.replace(/:/g, '&colon;')
									.replace(/=/g, '&equals;')
							+'")')] })
				.sync() },
	//*/


	// recursively resolve and enumerate the ast...
	//
	//	<ast> ::= [ <item>, .. ]
	// 	<item> ::=
	// 		<string>
	// 		| { data: <ast> }
	// 		| <func>
	//
	// 	<func>(state)
	// 		-> <ast>
	//
	//
	// NOTE: <func>(..) is called in the context of page...
	//
	// XXX should this also resolve e.data???
	/* XXX 
	resolve: function(page, ast, state={}){
		var that = this
		ast = ast 
			?? this.expand(page, null, state)
		ast = typeof(ast) != 'object' ?
			this.expand(page, ast, state)
			: ast
		// XXX .awaitOrRun(..) will check inside the input array for promises, do 
		// 		we need to do this???
		ast = Promise.awaitOrRun(
			ast,
			function(ast){
				var async_content = false
				return ast
					.map(function(e){
						// expand delayed sections...
						e = typeof(e) == 'function' ?
							e.call(page, state)
							: e
						// promise...
						if(e instanceof Promise){
							async_content = true
							return e
						// expand arrays...
						} else if(e instanceof Array 
								|| e instanceof types.Generator){
							return that.resolve(page, e, state)
						// data -- unwrap content...
						} else if(e instanceof Object && 'data' in e){
							var res = Promise.awaitOrRun(
								that.resolve(page, e.data, state),
								function(e){
									return { data: e } })
							res instanceof Promise
								&& (async_content = true)
							return res
						// skipped items...
						} else if(e instanceof Object && e.skip){
							return []
						} else {
							return [e] } })
					// NOTE: if we still have promises in the ast, wrap the 
					// 		whole thing in a promise...
					.run(function(){
						return async_content ?
								Promise.iter(this)
								: this })
					.flat() })
		return ast instanceof Promise ?
			// keep the API consistently array-like...
			ast.iter()
			: ast },
	//*/

	// Fully parse a page...
	//
	// This runs in two stages:
	// 	- resolve the page
	// 		- lex the page -- .lex(..)
	// 		- group block elements -- .group(..)
	// 		- expand macros -- .expand(..)
	// 		- resolve ast -- .resolve(..)
	// 	- apply filters
	//
	// NOTE: this has to synchronize everything between stage 1 (up to 
	// 		and including expand) and stage 2 (post-handlers, filters, ...)
	// 		because the former need a fully loaded and expanded page if 
	// 		we want to do this in 2 stages and not 3...
	// 		XXX might be fun to try a load-and-tweak approach the first 
	// 			version used -- i.e. setting placeholders and replacing 
	// 			them on demand rather than on encounter (as is now), e.g.
	// 			a slot when loaded will replace the prior occurrences...
	//
	// XXX add a special filter to clear pending filters... (???)
	/* XXX
	parse: function(page, ast, state={}){
		var that = this
		return this.resolve(page, ast, state)
			// filters...
			.map(function(section){
				// normalize types...
				section = 
					typeof(section) == 'number' ?
						section + ''
					: section == null ?
						''
					: section
				return (
					// expand section...
					typeof(section) != 'string' ?
						section.data
					// global filters... 
					: state.filters ?
						that.normalizeFilters(state.filters)
							.reduce(function(res, filter){
								// unknown filter...
								// NOTE: we try not to break on user errors
								// 		if we can help it...
								if(page.filters[filter] == null){
									console.warn(
										'.parse(..): unsupported filter: '+ filter) 
									return res }
								// NOTE: if a filter returns falsy then it 
								// 		will have no effect on the result...
								return page.filters[filter].call(page, res) 
									?? res }, section)
					// no global filters...
					: section ) })
			.flat()
			.join('') },
	//*/
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

var lazy =
module.lazy =
function(macro){
	macro.lazy = true
	return macro }


// XXX RENAME...
// 		...this is more of an expander/executer...
// 		...might be a good idea to also do a check without executing...
var parser =
module.parser = {
	__proto__: BaseParser,

	// list of macros that will get raw text of their content...
	QUOTING_MACROS: ['quote'],

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
							that.expand(page, body ?? [], state)
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
		// XXX do not like this name...
		content: ['slot'],


		//
		// 	@include(<path>)
		//
		// 	@include(<path> isolated recursive=<text>)
		// 	@include(src=<path> isolated recursive=<text>)
		//
		// 	<include src=<path> .. >
		// 		<text>
		// 	</include>
		//
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
		// XXX add path recursion test to data -- fail if two paths resolve 
		// 		to the same context...
		// XXX need a way to make encode option transparent...
		// XXX need a way to wrap the included page...
		// 		- template page...
		// 		- prefix/sufix...
		// XXX store a page cache in state...
		// XXX do we want to load a specific slot/block???
		// XXX UPDATE...
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
			function(page, args, body, state, key='included', handler){
				var that = this

				var recursive = 
				state.recursive = 
					args.recursive 
						?? body
						?? state.recursive

				var base = page.basepath
				// XXX we do this before or after we parse???
				var src = page.resolvePathVars(args.src)

				return Promise.awaitOrRun(
					this.parseNested(page, src, state),
					function(src){
						var cache = state.cache ??= {}
						if(cache[src]){
							return cache[src] }

						// XXX should this be a tree??
						// 		...need to at least split direct and 
						// 		indirect dependencies...
						// XXX would be nice to separate direct (in-page) 
						// 		depenedencies nad nested...
						// XXX do we need the same for real paths???
						// 		no, because actual paths are meaningless 
						// 		out of context...
						var depends = ((state.depends ??= {})[src] ??= {})

						// check for recursion...
						// XXX do we do this for pattern paths???
						// XXX this does not catch the /A/A/A/... recursion...
						var stack = state.include_stack ??= []
						// XXX is this the right separator???
						// 		...need something that can't be in a path...
						var base_src = base +'|'+ src
						if(stack.includes(base_src)){
							if(recursive){
								return recursive }
							throw new Error('Recursion:\n\t'+ 
								[...stack, base_src].join('\n\t\t-> ')) }
						stack.push(base_src)

						// content handler...
						handler ??= 
							function(page, text, state){
								return this._parse(page, text, state) }

						var pageHandler =
							function(text, i, l){
								return [
									handler.call(that, 
										page, 
										text, 
										// isolated up -- will see all 
										// the state but can have no 
										// side-effects...
										args.isolated == 'partial' ?
												serialize.partialDeepCopy(state)
											// fully isolated...
											: args.isolated ?
												{}
											: state),
									// join...
									(args.join 
											&& i < l.length - 1) ?
										that._parse(page, args.join, state)
										: []
								].flat() }
						var resultHandler =
							function(pages){
								// XXX not sure if this can happen or why...
								if(state.include_stack.at(-1) != base_src){
									throw new Error('Include stack error') }
								state.include_stack.pop()
								// cleanup...
								if(state.include_stack.length == 0){
									delete state.include_stack
									delete state.recursive }
								// cache the final result...
								// XXX wrap??
								cache[src] = pages
						   		return pages }

						// get and run things...
						return Promise.awaitOrRun(
							page.get(src).raw,
							function(pages){
								pages = pages instanceof Array ?
									pages
									: [pages]
								return Promise.awaitOrRun(
									// handle pages...
									Promise
										.iter(pages
											.map( pageHandler ))
										.flat()
										.sync(),
									resultHandler ) }) }) })),

		_include: Macro(
			['src', 'recursive', 'join', 
				['s', 'strict', 'isolated']],
			async function*(parser, args, body, state, key='included', handler){
				var macro = 'include'
				if(typeof(args) == 'string'){
					var [macro, args, body, state, key, handler] = arguments 
					key = key ?? 'included' }
				var base = this.get(this.path.split(/\*/).shift())
				var src = args.src
					&& this.resolvePathVars(
						await base.parse(args.src, state))
				if(!src){
					return }
				// XXX INHERIT_ARGS special-case: inherit args by default...
				// XXX should this be done when isolated???
				if(this.actions_inherit_args 
						&& this.actions_inherit_args.has(pwpath.basename(src))
						&& this.get(pwpath.dirname(src)).path == this.path){
					src += ':$ARGS' }
				var recursive = args.recursive ?? body
				var isolated = args.isolated 
				var strict = args.strict
				var strquotes = args.s
				var join = args.join 
					&& await base.parse(args.join, state)

				var depends = state.depends = 
					state.depends 
						?? new Set()
				// XXX DEPENDS_PATTERN
				depends.add(src)

				handler = handler 
					?? async function(src, state){
						return isolated ?
							//{data: await this.get(src)
							{data: await this
								.parse({
									seen: state.seen, 
									depends,
									renderer: state.renderer,
								})}
							//: this.get(src)
							: this
								.parse(state) }

				var first = true
				for await (var page of this.get(src).asPages(strict)){
					if(join && !first){
						yield join }
					first = false

					//var full = page.path
					var full = page.location

					// handle recursion...
					var parent_seen = 'seen' in state
					var seen = state.seen = 
						new Set(state.seen ?? [])
					if(seen.has(full)
							// nesting path recursion...
							|| (full.length % (this.NESTING_RECURSION_TEST_THRESHOLD || 50) == 0
								&& (pwpath.split(full).length > 3
									&& new Set([
											await page.find(),
											await page.get('..').find(),
											await page.get('../..').find(),
										]).size == 1
									// XXX HACK???
									|| pwpath.split(full).length > (this.NESTING_DEPTH_LIMIT || 20)))){
						if(recursive == null){
							console.warn(
								`@${key}(..): ${
									seen.has(full) ?
										'direct'
										: 'depth-limit'
								} recursion detected:`, full, seen)
							yield page.get(page.RECURSION_ERROR).parse() 
							continue }
						// have the 'recursive' arg...
						yield base.parse(recursive, state) 
						continue }
					seen.add(full)

					// load the included page...
					var res = await handler.call(page, full, state)
					depends.add(full)
					res = strquotes ?
						res
							.replace(/["']/g, function(c){
								return '%'+ c.charCodeAt().toString(16) })
						: res

					// NOTE: we only track recursion down and not sideways...
					seen.delete(full)
					if(!parent_seen){
						delete state.seen }

					yield res } }),
		// NOTE: the main difference between this and @include is that 
		// 		this renders the src in the context of current page while 
		// 		include is rendered in the context of its page but with
		// 		the same state...
		// 		i.e. for @include(PATH) the paths within the included page 
		// 		are resolved relative to PATH while for @source(PATH) 
		// 		relative to the page containing the @source(..) statement...
		// XXX UPDATE...
		source: Macro(
			// XXX should this have the same args as include???
			['src', 'recursive', 'join', 
				['s', 'strict']],
			//['src'],
			async function*(args, body, state){
				var that = this
				yield* this.__parser__.macros.include.call(this, 
					'source',
					args, body, state, 'sources', 
					async function(src, state){
						//return that.parse(that.get(src).raw, state) }) }),
						return that.parse(this.raw, state) }) }),

		// Load macro and slot definitions but ignore the page text...
		//
		// NOTE: this is essentially the same as @source(..) but returns ''.
		// XXX revise name...
		// XXX UPDATE...
		load: Macro(
			['src', ['strict']],
			async function*(args, body, state){
				var that = this
				yield* this.__parser__.macros.include.call(this, 
					'load',
					args, body, state, 'sources', 
					async function(src, state){
						await that.parse(this.raw, state) 
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
		//
		// NOTE: src ant text arguments are mutually exclusive, src takes 
		// 		priority.
		// NOTE: the filter argument has the same semantics as the filter 
		// 		macro with one exception, when used in quote, the body is 
		// 		not expanded...
		// NOTE: the filter argument uses the same filters as @filter(..)
		// NOTE: else argument implies strict mode...
		// XXX need a way to escape macros -- i.e. include </quote> in a quoted text...
		// XXX should join/else be sub-tags???
		// XXX UPDATE...
		quote: Macro(
			['src', 'filter', 'text', 'join', 'else',
				['s', 'expandactions', 'strict']],
			async function*(args, body, state){
				var src = args.src //|| args[0]
				var base = this.get(this.path.split(/\*/).shift())
				var text = args.text 
					?? body 
					?? []
				var strict = !!(args.strict 
					?? args['else'] 
					?? false)
				// parse arg values...
				src = src ? 
					await base.parse(src, state)
					: src
				// XXX INHERIT_ARGS special-case: inherit args by default...
				if(this.actions_inherit_args 
						&& this.actions_inherit_args.has(pwpath.basename(src))
						&& this.get(pwpath.dirname(src)).path == this.path){
					src += ':$ARGS' }
				var expandactions = 
					args.expandactions
						?? true
				// XXX EXPERIMENTAL
				var strquotes = args.s

				var depends = state.depends = 
					state.depends 
						?? new Set()
				// XXX DEPENDS_PATTERN
				depends.add(src)

				var pages = src ?
						(!expandactions 
								&& await this.get(src).type == 'action' ?
							base.get(this.QUOTE_ACTION_PAGE)
							: await this.get(src).asPages(strict))
					: text instanceof Array ?
						[text.join('')]
					: typeof(text) == 'string' ?
						[text]
					: text
				// else...
				pages = ((!pages
				   			|| pages.length == 0)	
						&& args['else']) ?
					[await base.parse(args['else'], state)]
					: pages
				// empty...
				if(!pages || pages.length == 0){
					return }

				var join = args.join 
					&& await base.parse(args.join, state)
				var first = true
				for await (var page of pages){
					if(join && !first){
						yield join }
					first = false

					text = typeof(page) == 'string' ?
							page
						: (!expandactions 
								&& await page.type == 'action') ?
							base.get(this.QUOTE_ACTION_PAGE).raw
						: await page.raw
					text = strquotes ?
						text
							.replace(/["']/g, function(c){
								return '%'+ c.charCodeAt().toString(16) })
						: text

					page.path
						&& depends.add(page.path)

					var filters = 
						args.filter 
							&& args.filter
								.trim()
								.split(/\s+/g)

					// NOTE: we are delaying .quote_filters handling here to 
					// 		make their semantics the same as general filters...
					// 		...and since we are internally calling .filter(..)
					// 		macro we need to dance around it's architecture too...
					// NOTE: since the body of quote(..) only has filters applied 
					// 		to it doing the first stage of .filter(..) as late 
					// 		as the second stage here will have no ill effect...
					// NOTE: this uses the same filters as @filter(..)
					// NOTE: the function wrapper here isolates text in 
					// 		a closure per function...
					yield (function(text){
						return async function(state){
							// add global quote-filters...
							filters =
								(state.quote_filters 
										&& !(filters ?? []).includes(this.ISOLATED_FILTERS)) ?
									[...state.quote_filters, ...(filters ?? [])]
									: filters
							return filters ?
								await this.__parser__.callMacro(
										this, 'filter', filters, text, state, false)
									.call(this, state)
								: text } })(text) } }),
		// very similar to @filter(..) but will affect @quote(..) filters...
		'quote-filter': function(args, body, state){
			var filters = state.quote_filters = 
				state.quote_filters ?? []
			filters.splice(filters.length, 0, ...Object.keys(args)) },

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
		// XXX UPDATE...
		macro: Macro(
			['name', 'src', 'sort', 'text', 'join', 'else',
				['strict', 'isolated', 'inheritmacros', 'inheritvars']],
			async function*(args, body, state){
				var that = this

				// helpers...
				var _getBlock = function(name){
					var block = args[name] ?
						[{
							args: {},
							body: args[name],
						}]
						: (text ?? [])
							.filter(function(e){ 
								return typeof(e) != 'string' 
									&& e.name == name })
					if(block.length == 0){
						return }
					// NOTE: when multiple blocks are present the 
					// 		last one is used...
					block = block.pop()
					block = 
						block.args.text 
							?? block.body
					return block }

				var base = this.get(this.path.split(/\*/).shift())
				var macros = state.macros = 
					state.macros 
						?? {}
				var vars = state.vars = 
					state.vars 
						?? {}
				var depends = state.depends = 
					state.depends 
						?? new Set()

				// uninheritable args...
				// NOTE: arg handling is split in two, to make things simpler 
				// 		to process for retrieved named macros...
				var src = args.src
				var text = args.text 
					?? body 
					?? []
				text = typeof(text) == 'string' ?
					[...this.__parser__.group(this, text+'</macro>', 'macro')]
					: text
				var join, itext
				var iargs = {}

				// stored macros...
				if(args.name){
					var name = await base.parse(args.name, state)
					// define new named macro...
					if(text.length != 0){
						// NOTE: we do not need to worry about saving 
						// 		stateful text here because it is only 
						// 		grouped and not expanded...
						macros[name] = 
							[ text, 
								_getBlock('join'), 
								JSON.parse(JSON.stringify(args)), ]
					// use existing macro...
					} else if(macros 
							&& name in macros){
						;[itext, join, iargs] = macros[name] } }

				// inheritable args...
				// XXX is there a point in overloading text???
				text = text.length > 0 ? 
					text 
					: itext ?? text
				var sort = (args.sort 
						?? iargs.sort 
						?? '')
					.split(/\s+/g)
					.filter(function(e){ 
						return e != '' })
				var strict = 
					('strict' in args ?
							args.strict 
							: iargs.strict)
						//?? true
						?? false
				var isolated = 
					('isolated' in args ?
							args.isolated
							: iargs.isolated)
						?? true
				var inheritmacros = 
					('inheritmacros' in args ?
							args.inheritmacros
							: iargs.inheritmacros)
						?? true
				var inheritvars = 
					('inheritvars' in args ?
							args.inheritvars
							: iargs.inheritvars)
						?? true

				if(src){
					src = await base.parse(src, state)
					// XXX INHERIT_ARGS special-case: inherit args by default...
					if(this.actions_inherit_args 
							&& this.actions_inherit_args.has(pwpath.basename(src))
							&& this.get(pwpath.dirname(src)).path == this.path){
						src += ':$ARGS' }
					// XXX DEPENDS_PATTERN
					depends.add(src)

					join = _getBlock('join') 
						?? join 
					join = join
						&& await base.parse(join, state)

					//var match = this.get(await base.parse(src, state))
					//var match = this.get(src, strict)
					var match = this.get(src)

					// NOTE: thie does not introduce a dependency on each 
					// 		of the iterated pages, that is handled by the 
					// 		respective include/source/.. macros, this however
					// 		only depends on page count...
					depends.add(match.path)

					// populate macrovars...
					var macrovars = {}
					for(var [key, value] 
							of Object.entries(
								Object.assign(
									args,
									iargs,
									{
										strict,
										isolated,
										inheritmacros,
										inheritvars,
									}))){
						macrovars['macro:'+ key] = 
							value === true ?
								'yes'
							: value === false ?
								'no'
							: value }

					// handle count...
					// NOTE: this duplicates <store>.match(..)'s functionality
					// 		because we need to account for arbitrary macro 
					// 		nesting that .match(..) does not know about...
					// XXX revise var naming...
					// XXX these can be overriden in nested macros...
					var count = match.args.count
					if(count){
						var c =
							count == 'inherit' ?
								(!('macro:count' in vars) ?
									this.args.count
									: undefined)
								: count 
						if(c !== undefined){
							vars['macro:count'] = 
								isNaN(parseInt(c)) ?
									c
									: parseInt(c) 
							vars['macro:index'] = 0 } }
						
					// expand matches...
					var first = true
					for await(var page of match.asPages(strict)){
						// handle count...
						if('macro:count' in vars){
							if(vars['macro:count'] <= vars['macro:index']){
								break }
							object.sources(vars, 'macro:index')
								.shift()['macro:index']++ }
						// output join between elements....
						if(join && !first){
							yield join }
						first = false 
						if(isolated){
							var _state = {
								seen: state.seen, 
								depends,
								renderer: state.renderer,
								macros: inheritmacros ?
									{__proto__: macros}
									: {},
								vars: inheritvars ?
									{__proto__: vars, 
										...macrovars}
									: {...macrovars},
							}
							yield this.__parser__.parse(page, 
								this.__parser__.expand(page, 
									text, _state), _state)
						} else {
							yield this.__parser__.expand(page, text, state) } }
					// cleanup...
					delete vars['macro:count']
					delete vars['macro:index']
					// else...
					if(first
							&& (text || args['else'])){
						var else_block = _getBlock('else')
						if(else_block){
							yield this.__parser__.expand(this, else_block, state) } } } }),

		// nesting rules...
		'else': ['macro'],
		'join': ['macro'],
	},

}



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
