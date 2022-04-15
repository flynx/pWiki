/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/



/*********************************************************************/


// XXX might be a good idea to make this compatible with node's path API...
var pWikiPath = 
module.pWikiPath = {

	// The page returned when getting the '/' path...
	ROOT_PAGE: 'WikiHome',

	// The page returned when listing a path ending with '/'...
	//
	// If set to false treat dirs the same as pages (default)
	// XXX revise...
	//DEFAULT_DIR: 'pages',
	DEFAULT_DIR: false,

	ALTERNATIVE_PAGES: [
		'EmptyPage',
		'NotFound',
	],

	SEARCH_PATHS: [
		'./Templates',
		'/System',
	],

	// NOTE: trailing/leading '/' are represented by '' at end/start of 
	// 		path list...
	normalize: function(path='.', format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		path = (path instanceof Array ?
				path
				// NOTE: this will also trim the path elements...
				: path.split(/\s*[\\\/]+\s*/))
			.reduce(function(res, e){
				// special case: leading '..' / '.'
				if(res.length == 0 
						&& e == '..'){
					return [e] }
				e == '.' ?
					undefined
				: e == '..' 
						|| res[res.length-1] == '>>' ?
					res.pop()
				// NOTE: the last '>>' will be retained...
				: res.push(e)
				return res }, []) 
		return format == 'string' ?
			path.join('/') 
			: path },
	relative: function(parent, path, format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		path = this.normalize(path, 'array')
		// root path...
		if(path[0] == ''){
			return format == 'string' ? 
				path.join('/')
				: path }
		parent = this.normalize(parent, 'array')
		return this.normalize(parent.concat(path), format) },

	//paths: function*(path='/', leading_slash=true){
	paths: function*(path='/'){
		path = this.normalize(path, 'array')
		// handle '', '.', and '/' paths...
		if(path.length == 0 
				|| (path.length == 1 && path[0] == '')
				|| (path.length == 2 && path[0] == '' && path[1] == '')){
			path = [this.ROOT_PAGE] }
		// normalize relative paths to root...
		path[0] != ''
			&& path.unshift('')
		// paths ending in '/' -- dir lister...
		if(path[path.length-1] == ''){
			path.pop()
			this.DEFAULT_DIR
				&& path.push(this.DEFAULT_DIR) }
		// generate path candidates...
		for(var page of [path.pop(), ...this.ALTERNATIVE_PAGES]){
			for(var tpl of ['.', ...this.SEARCH_PATHS]){
				// search for page up the path...
				var p = path.slice()
				while(p.length > 0){
					yield this.relative(p, tpl +'/'+ page, 'string')
					//yield leading_slash ? 
					//	this.relative(p, tpl +'/'+ page, 'string')
					//	: this.relative(p, tpl +'/'+ page, 'string').slice(1)
					// special case: non-relative template/page path...
					if(tpl[0] == '/'){
						break }
					p.pop() } } } },
}



//---------------------------------------------------------------------

// NOTE: store keys must be normalized...
//
// XXX LEADING_SLASH should this be strict about leading '/' in paths???
// 		...this may lead to duplicate paths created -- '/a/b' and 'a/b'
// XXX must support store stacks...
// XXX path macros???
// XXX should we support page symlinking???
var store = 
module.store = {
	exists: function(path){
		return pWikiPath.normalize(path, 'string') in this },

	// NOTE: a path is any attribute that contains '/'...
	paths: function(){
		return Object.keys(this)
			.filter(function(p){
				// XXX LEADING_SLASH
				//return p[0] == '/'  }) },
				return p.includes('/')  }) },
	pages: function(){
		var that = this
		this.paths()
			.map(function(p){
				return [p, that[p]] }) },

	// 
	// 	Resolve page for path
	// 	.match(<path>)
	// 		-> <path>
	//
	// 	Match paths (non-strict mode)
	// 	.match(<pattern>)
	// 	.match(<pattern>, false)
	// 		-> [<path>, ...]
	//
	// 	Match pages (paths in strict mode)
	// 	.match(<pattern>, true)
	// 		-> [<path>, ...]
	//
	// In strict mode the trailing star in the pattern will only match 
	// actual existing pages, while in non-strict mode the pattern will 
	// match all sub-paths.
	//
	match: function(path, strict=false){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var pattern = new RegExp(`^\\/?${
				pWikiPath.normalize(path, 'string')
					.replace(/\/$/g, '')
					.replace(/\//g, '\\/')
					.replace(/\*\*/g, '.+')
					.replace(/\*/g, '[^\\/]+') }`)
			return [...this.paths()
				.reduce(function(res, p){
					var m = p.match(pattern)
					m
						&& (!strict 
							|| m[0] == p) 
						&& res.add(m[0])
					return res }, new Set())] }
		// search...
		for(var p of pWikiPath.paths(path)){
			if(p in this 
					// NOTE: all paths at this point and in store are 
					// 		absolute, so we check both with the leading '/' 
					// 		and without it to make things a bit more 
					// 		relaxed...
					|| (p[0] == '/' ?
						p.slice(1) in this
						: ('/'+ p) in store)){
				return p } } },
	// 
	// 	Resolve page
	// 	.get(<path>)
	// 		-> <value>
	//
	// 	Resolve pages (non-strict mode)
	// 	.get(<pattern>)
	// 	.get(<pattern>, false)
	// 		-> [<value>, .. ]
	//
	// 	Get pages (strict mode)
	// 	.get(<pattern>, true)
	// 		-> [<value>, .. ]
	//
	// In strict mode this will not try to resolve pages and will not 
	// return pages at paths that do not explicitly exist.
	//
	// XXX should this call actions???
	get: function(path, strict=false){
		var that = this
		path = this.match(path, strict)
		return path instanceof Array ?
   			path.map(function(p){
				return that[p] 
					?? that[that.match(p)] })
			: this[path] },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	//
	// XXX should these return this or the data???
	update: function(path, data, mode='update'){
		path = pWikiPath.normalize('/'+ path, 'string')
		path = path[path.length-1] == '/' ?
			path.slice(0, -1)
			: path
		this[path] = 
			mode == 'update' ?
				Object.assign(
					this[path] ?? {}, 
					data)
				: data
		return this },
	// XXX revise...
	delete: function(path){
		path = pWikiPath.normalize(path, 'string')
		path = path[path.length-1] == '/' ?
			path.slice(0, -1)
			: path
		// XXX revise...
		delete this[path] 
		delete this['/'+ path] 
		return this },
}


// XXX need to specify page format....
// XXX need a way to set the page path...
var actions = 
module.actions = {
	__proto__: store,

	// base actions (virtual pages)...
	'/System/raw': function(page, path){
		return { text: this.get(path +'/..') } },
	// XXX ...
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var relProxy = 
function(name){
	return function(path='.', ...args){
		return this.store[name](
			pWikiPath.relative(this.path, path), 
			...args) } } 

// page interface...
var page =
module.page = {
	store: undefined,

	path: undefined,
	referrer: undefined,

	text: undefined,

	// relative proxies to store...
	exists: relProxy('exists'), 
	match: relProxy('match'), 
	// XXX should this return page objects???
	get: relProxy('get'), 
	update: function(path='.', data, mode){
		if(arguments.length == 1){
			data = path
			path = '.' }
		return this.store.update(pWikiPath.relative(this.path, path), data, mode) },
	delete: relProxy('delete'),

	// XXX
	clear: function(){
	},
}



//---------------------------------------------------------------------

// XXX add escaping...
var MACRO_PATTERN_STR =
	[[
		// @macro(arg ..)
		// XXX add support for '\)' in args...
		'\\\\?@(?<nameInline>MACROS)\\((?<argsInline>([^)])*)\\)',
		// <macro ..> | <macro ../>
		// XXX revise escaped > and />
		'<\\s*(?<nameOpen>MACROS)(?<argsOpen>\\s+([^>/])*)?/?>',
		// </macro>
		'</\\s*(?<nameClose>MACROS)\\s*>',
	].join('|'), 'smig']
var MACRO_PATTERN
var MACRO_PATTERN_GROUPS = 
	'<MACROS>'.split(new RegExp(`(${ MACRO_PATTERN_STR })`)).length-2
// XXX still buggy...
var MACRO_ARGS_PATTERN = 
	RegExp('('+[
		// named args...
		'(?<nameQuoted>[a-zA-Z-_]+)\\s*=([\'"])(?<valueQuoted>([^\\3]|\\\\3)*)\\3\\s*',
		'(?<nameUnquoted>[a-zA-Z-_]+)\\s*=(?<valueUnquoted>[^\\s]*)',
		// positional args...
		'([\'"])(?<argQuoted>([^\\8]|\\\\8)*)\\8',
		'(?<arg>[^\\s]+)',
	].join('|') +')', 'smig')
// XXX do we need basic inline and block commets a-la lisp???
var COMMENT_PATTERN = 
	RegExp('('+[
		// <!--[pwiki[ .. ]]-->
		'<!--\\[pwiki\\[(?<uncomment>.*)\\]\\]-->',

		// <pwiki-comment> .. </pwiki-comment>
		'<\\s*pwiki-comment[^>]*>.*<\\/\\s*pwiki-comment\\s*>',
		// <pwiki-comment .. />
		'<\\s*pwiki-comment[^\\/>]*\\/>',
	].join('|') +')', 'smig')



var clearComments = 
module.clearComments =
function(str){
	return str
		.replace(COMMENT_PATTERN, 
			function(...a){
				return a.pop().uncomment 
					|| '' }) }


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
// NOTE: this internally uses macros' keys to generate the lexing pattern.
//
// XXX closure: macros
// XXX feels a bit ugly...
var lex =
module.lex = 
function*(str){
	// NOTE: we are doing a separate pass for comments to completely 
	// 		decouple them from the base macro syntax, making them fully 
	// 		transparent...
	str = clearComments(str)

	var lst = str.split(
		module.MACRO_PATTERN 
			?? (MACRO_PATTERN = module.MACRO_PATTERN = 
				new RegExp(
					'('+ MACRO_PATTERN_STR[0]
						.replace(/MACROS/g, 
							Object.keys(macros).join('|')) +')',
					MACRO_PATTERN_STR[1])))

	var macro = false
	while(lst.length > 0){
		if(macro){
			var match = lst.splice(0, MACRO_PATTERN_GROUPS)[0]
			// NOTE: we essentially are parsing the detected macro a 
			// 		second time here, this gives us access to named groups
			// 		avoiding maintaining match indexes with the .split(..) 
			// 		output...
			// XXX for some reason .match(..) here returns a list with a string...
			var cur = [...match.matchAll(MACRO_PATTERN)][0].groups
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
						.matchAll(MACRO_ARGS_PATTERN)){
				i++
				args[groups.nameQuoted ?? groups.nameUnquoted ?? i] =
					groups.valueQuoted 
					?? groups.valueUnquoted 
					?? groups.argQuoted 
					?? groups.arg }
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
			macro = true } } }


//
// 	<item> ::=
// 		<string>
// 		| {
// 			type: 'inline'
// 				| 'element'
// 				| 'block',
// 			block: [
// 				<item>,
// 				...
// 			],
//
//			// rest of items are the same as for lex(..)
// 			...
// 		}
//
//
// NOTE: this internaly uses macros to check for propper nesting
//
// XXX closure: macros
// XXX normalize lex to be a generator (???)
var group = 
module.group =
function*(lex, to=false){
	// NOTE: we are not using for .. of .. here as it depletes the 
	// 		generator even if the end is not reached...
	while(true){
		var {value, done} = lex.next()
		// check if unclosed blocks remaining...
		if(done){
			if(to){
				throw new Error(
					'Premature end of unpit: Expected closing "'+ to +'"') }
			return }
		// assert nesting rules...
		if(macros[value.name] instanceof Array
				&& macros[value.name].includes(to)){
			throw new Error(
				'Unexpected "'+ value.name +'" macro' 
					+(to ? 
						' in "'+to+'"' 
						: '')) }
		// open block...
		if(value.type == 'opening'){
			value.body = [...group(lex, value.name)]
			value.type = 'block'
			yield value
			continue
		// close block...
		} else if(value.type == 'closing'){
			if(value.name != to){
				throw new Error('Unexpected closing "'+ value.name +'"') }
			// NOTE: we are intentionally not yielding the value here...
			return } 
		yield value } } 


var parse = 
module.parse =
function*(str){
	yield* group(lex(str)) }


// XXX
var expandPage = 
module.expandPage =
function(page){
}



//---------------------------------------------------------------------

var WIKIWORD_PATTERN =
	RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g')



//---------------------------------------------------------------------

var filters = {
}
var macros = {
	now: function(){},
	filter: function(){},
	include: function(){},
	source: function(){},
	quote: function(){},
	macro: function(){},
	slot: function(){},

	// nesting rules...
	'else': ['macro'],
}





/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
