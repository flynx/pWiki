/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var types = require('ig-types')



//---------------------------------------------------------------------
// Parser...

// XXX should we warn about stuff like <macro src=/moo/> -- currently 
// 		this will simply be ignored, i.e. passed trough the parser 
// 		without change...
// XXX might be a good idea to both think of a good async parse and
// 		create tools for sync parsing (get links etc.)...

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
	MACRO_ARGS: ['(\\s*(',[
				// arg='val' | arg="val" | arg=val
				'(?<PREFIXArgName>[a-z:-_]+)\\s*=\\s*(?<PREFIXArgValue>'+([
					// XXX CHROME/NODE BUG: this does not work yet...
					//'\\s+(?<quote>[\'"])[^\\k<quote>]*\\k<quote>',
					'"(?<PREFIXDoubleQuotedValue>(\\"|[^"])*?)"',
					"'(?<PREFIXSingleQuotedValue>(\\'|[^'])*?)'",
					'(?<PREFIXValue>[^\\sSTOP\'"]+)',
				].join('|'))+')',
				// "arg" | 'arg'
				// XXX CHROME/NODE BUG: this does not work yet...
				//'\\s+(?<quote>[\'"])[^\\k<quote>]*\\k<quote>',
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
	// XXX should this be here or on page???
	callMacro: function(page, name, args, body, state, ...rest){
		var macro = page.macros[name] 
		return macro.call(page, 
				this.parseArgs(
					macro.arg_spec 
						?? [], 
					args),
				body, 
				state, 
				...rest) },


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
	// 				...
	// 			}
	// 			match: <string>,
	// 		}
	//
	//
	// NOTE: this internally uses page.macros' keys to generate the 
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
			?? this.buildMacroPattern(Object.deepKeys(page.macros))
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
	// NOTE: this internaly uses page.macros to check for propper nesting
	//group: function*(page, lex, to=false){
	group: function*(page, lex, to=false, parent){
		// XXX we can't get .raw from the page without going async...
		//lex = lex
		//	?? this.lex(page) 
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
			if(page.macros[value.name] instanceof Array
					&& !page.macros[value.name].includes(to)
					// do not complain about closing nestable tags...
					&& !(value.name == to 
						&& value.type == 'closing')){
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
			// close block...
			} else if(value.type == 'closing'){
				if(value.name != to){
					throw new Error('Unexpected </'+ value.name +'>') }
				// NOTE: we are intentionally not yielding the value here...
				return } 
			// normal value...
			yield value } }, 

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
					if(typeof(page.macros[name]) != 'function'){
						return {...value, skip: true} }
					// macro call...
					return Promise.awaitOrRun(
						that.callMacro(page, name, args, body, state),
						function(res){
							res = res ?? ''
							// result...
							if(res instanceof Array 
									|| page.macros[name] instanceof types.Generator){
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
	resolve: function(page, ast, state={}){
		var that = this
		ast = ast 
			?? this.expand(page, null, state)
		ast = typeof(ast) != 'object' ?
			this.expand(page, ast, state)
			: ast
		// XXX .awaitOrRun(..) will check inside the array for promises, do 
		// 		we need to do this???
		ast = Promise.awaitOrRun(
			ast,
			function(ast){
				return ast
					// XXX in case of @filter(..) can be a function that 
					// 		returns a promise...
					// 		...on a sync action this promise does not get a 
					// 		chance to resolve, and thus its value is lost...
					// 		...should this be fixed here or in filter??? 
					// 			fixing it here -- mark and wrap ast in 
					// 			Promise's .all(..), .iter(..) or .seqiter(..)
					// 		...I'm leaning to fixing this in @filter(..)
					.map(function(e){
						// expand delayed sections...
						e = typeof(e) == 'function' ?
							e.call(page, state)
							: e
						// expand arrays...
						if(e instanceof Array 
								|| e instanceof types.Generator){
							return that.resolve(page, e, state)
						// data -- unwrap content...
						} else if(e instanceof Object && 'data' in e){
							return Promise.awaitOrRun(
								that.resolve(page, e.data, state),
								function(e){
									return { data: e } })
						// skipped items...
						} else if(e instanceof Object && e.skip){
							return []
						} else {
							return [e] } })
					.flat() })
		return ast instanceof Promise ?
			// keep the API consistently array-like...
			ast.iter()
			: ast },

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
}

var parser =
module.parser = {
	__proto__: BaseParser,
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
