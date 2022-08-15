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
	// XXX quote escaping???
	// 		/(?<quote>['"])(\\\k<quote>|[^\1])*\k<quote>/
	// 		...this will work but we'll also need to remove the \ in the 
	// 		final string...
	MACRO_ARGS: ['(\\s*(',[
				// arg='val' | arg="val" | arg=val
				'(?<PREFIXArgName>[a-z-]+)\\s*=\\s*(?<PREFIXArgValue>'+([
					// XXX CHROME/NODE BUG: this does not work yet...
					//'\\s+(?<quote>[\'"])[^\\k<quote>]*\\k<quote>',
					"'(?<PREFIXSingleQuotedValue>[^']*)'",
					'"(?<PREFIXDoubleQuotedValue>[^"]*)"',
					'(?<PREFIXValue>[^\\sSTOP\'"]+)',
				].join('|'))+')',
				// "arg" | 'arg'
				// XXX CHROME/NODE BUG: this does not work yet...
				//'\\s+(?<quote>[\'"])[^\\k<quote>]*\\k<quote>',
				'"(?<PREFIXDoubleQuotedArg>[^"]*)"',
				"'(?<PREFIXSingleQuotedArg>[^']*)'",
				// arg
				// NOTE: this is last because it could eat up parts of the above 
				// 		alternatives...
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
	// 	INLINE_ARGS -- MACRO_ARGS.replace(/STOP/, ')') 
	// 	ARGS -- MACRO_ARGS.replace(/STOP/, '\\/>') 
	//
	// XXX BUG: this fails to match inline macros with non-empty args @moo(a)
	// 		...the problem seems to be with the lack of whitespace 
	// 		between ( and the first arg -- @moo( a) is matched fine...
	MACRO: '('+([
			// @macro(arg ..)
			'\\\\?@(?<nameInline>MACROS)\\((?<argsInline>INLINE_ARGS)\\)',
			// <macro ..> | <macro ../>
			'<\\s*(?<nameOpen>MACROS)(?<argsOpen>ARGS)?\\s*/?>',
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
			.replace(/MACROS/g, macros.join('|'))
			.replace(/INLINE_ARGS/g,
				this.buildArgsPattern('inline', ')', false) +'*')
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
		return page.macros[name].call(page, 
				this.parseArgs(
					page.macros[name].arg_spec 
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

	// Lexically split the string...
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
		// XXX we can't get .raw from the page without going async...
		//str = str 
		//	?? page.raw
		// NOTE: we are doing a separate pass for comments to completely 
		// 		decouple them from the base macro syntax, making them fully 
		// 		transparent...
		str = this.stripComments(str)

		// XXX should this be cached???
		var macro_pattern = this.MACRO_PATTERN 
			?? this.buildMacroPattern(Object.keys(page.macros))
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
						of (cur.argsInline ?? cur.argsOpen ?? '')
							.matchAll(macro_args_pattern)){
					i++
					args[groups.elemArgName 
							?? groups.inlineArgName 
							?? i] =
						groups.elemSingleQuotedValue 
							?? groups.inlineSingleQuotedValue
							?? groups.elemDoubleQuotedValue
							?? groups.inlineDoubleQuotedValue
							?? groups.elemValue
							?? groups.inlineValue
							?? groups.elemSingleQuotedArg
							?? groups.inlineSingleQuotedArg
							?? groups.elemDoubleQuotedArg
							?? groups.inlineDoubleQuotedArg
							?? groups.elemArg
							?? groups.inlineArg }

				// macro-spec...
				yield {
					name: (cur.nameInline 
							?? cur.nameOpen 
							?? cur.nameClose)
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

	// Group block elements...
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
		lex = typeof(lex) == 'string' ?
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
						'Premature end of input: Expected closing "'+ to +'"') }
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
					'Unexpected "'+ value.name +'" macro' 
						+(to ? 
							' in "'+to+'"' 
							: '')) }
			// open block...
			if(value.type == 'opening'){
				//value.body = [...this.group(page, lex, value.name)]
				value.body = [...this.group(page, lex, value.name, value)]
				value.type = 'block'
			// close block...
			} else if(value.type == 'closing'){
				if(value.name != to){
					throw new Error('Unexpected closing "'+ value.name +'"') }
				// NOTE: we are intentionally not yielding the value here...
				return } 
			// normal value...
			yield value } }, 

	// Expand macros...
	//
	// 	<item> ::=
	// 		<string>
	// 		// returned by .macros.filter(..)
	// 		| {
	// 			// XXX is this still relevant...
	// 			filters: [
	// 				'<filter>'
	// 					| '-<filter>',
	// 				...
	// 			],
	// 			data: [ <item>, .. ],
	// 		}
	//
	// XXX macros: we are mixing up ast state and parse state...
	// 		one should only be used for parsing and be forgotten after 
	// 		the ast is constructed the other should be part of the ast...
	expand: async function*(page, ast, state={}){
		ast = ast == null ?
				//this.group(page)
				this.group(page, await page.raw)
			: typeof(ast) == 'string' ?
				this.group(page, ast)
			: ast instanceof types.Generator ?
				ast
			: ast.iter()

		while(true){
			var {value, done} = ast.next()
			if(done){
				return }

			// text block...
			if(typeof(value) == 'string'){
				yield value 
				continue }

			// macro...
			var {name, args, body} = value
			// nested macro -- skip...
			if(typeof(page.macros[name]) != 'function'){
				continue }

			var res = 
				await this.callMacro(page, name, args, body, state) 
					?? ''

			// result...
			if(res instanceof Array 
					|| page.macros[name] instanceof types.Generator){
				yield* res
			} else {
				yield res } } },

	// Fully parse a page...
	//
	// This runs in two stages:
	// 	- expand the page
	// 		- lex the page -- .lex(..)
	// 		- group block elements -- .group(..)
	// 		- expand macros -- .expand(..)
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
	// XXX this should be recursive....
	// XXX add a special filter to clear pending filters... (???)
	parse: async function(page, ast, state={}){
		var that = this
		ast = ast 
			?? this.expand(page, null, state)
		ast = typeof(ast) == 'string' ?
			this.expand(page, ast, state)
			: ast

		// NOTE: we need to await for ast here as we need stage 2 of 
		// 		parsing to happen AFTER everything else completes...
		return await Promise.iter((await ast)
				.flat()
				// post handlers...
				.map(function(section){
					return typeof(section) == 'function' ? 
						// NOTE: this can produce promises...
						section.call(page, state)
						: section }))
			.flat()
			// filters...
			.map(function(section){
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
