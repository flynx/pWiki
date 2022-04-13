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
					// special case: non-relative template/page path...
					if(tpl[0] == '/'){
						break }
					p.pop() } } } },
}



//---------------------------------------------------------------------

// NOTE: store keys must be normalized...
//
// XXX must support store stacks...
// XXX path macros???
// XXX should we support page symlinking???
var store = 
module.store = {
	exists: function(path){
		return pWikiPath.normalize(path, 'string') in this },

	paths: function(){
		return Object.keys(this)
			.filter(function(p){
				return p[0] == '/'  }) },
	pages: function(){
		var that = this
		this.paths()
			.map(function(p){
				return [p, that[p]] }) },

	// XXX BUG: '/a*/' does not match '/a/b/...' -- need to replace 
	// 		pattern + with * for partial patterns...
	match: function(path){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var pattern = new RegExp(`^\/?${
				pWikiPath.normalize(path, 'string')
					.replace(/\//, '\\/')
					.replace(/\*\*/, '.+')
					.replace(/\*/, '[^\\/]+') }`)
			return this.paths()
				.filter(function(p){
					return pattern.test(p)}) }
		// search...
		for(var p of pWikiPath.paths(path)){
			if(p in this){
				return p } } },
	// XXX should this call actions???
	get: function(path){
		var that = this
		path = this.match(path)
		return path instanceof Array ?
   			path.map(function(p){
				return that[p] })	
			: this[path] },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	// XXX should these return this or the data???
	update: function(path, data, mode='update'){
		path = pWikiPath.normalize(path, 'string')
		path = path[path.length-1] == '/' ?
			path.slice(0, -1)
			: path
		data = mode == 'update' ?
			Object.assign(this[path] || {}, data)
			: data
		this[path] = data 
		return this },
	delete: function(path){
		path = pWikiPath.normalize(path, 'string')
		path = path[path.length-1] == '/' ?
			path.slice(0, -1)
			: path
		delete this[path] 
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
	text: undefined,

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
	expand: function(){
	},
}



//---------------------------------------------------------------------

// XXX add escaping...
var _MACRO_PATTERN =
	[[
		// @macro(arg ..)
		// XXX add support for '\)' in args...
		'\\\\?@(?<nameInline>$MACROS)\\((?<argsInline>([^)])*)\\)',
		// <macro ..> | <macro ../>
		// XXX revise escaped > and />
		'<\\s*(?<nameOpen>$MACROS)(?<argsOpen>\\s+([^>/])*)?/?>',
		// </macro>
		'</\\s*(?<nameClose>$MACROS)\\s*>',
	].join('|'), 'smig']
var MACRO_PATTERN_GROUPS = 8
// XXX still buggy...
var MACRO_ARGS_PATTERN = 
	RegExp('('+[
		// named args...
		'(?<nameQuoted>[a-zA-Z-_]+)\\s*=([\'"])(?<valueQupted>([^\\3]|\\\\3)*)\\3\\s*',
		'(?<nameUnquoted>[a-zA-Z-_]+)\\s*=(?<valueUnquoted>[^\\s]*)',
		// positional args...
		'([\'"])(?<argQuoted>([^\\8]|\\\\8)*)\\8',
		'(?<arg>[^\\s]+)',
	].join('|') +')', 'smig')
//var MACRO_ARGS_PATTERN_GROUPS = 10
var MACRO_ARGS_PATTERN_GROUPS = 12
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
		.replace(COMMENT_PATTERN, function(...a){
			var groups = a.pop()
			return groups.uncomment ? 
				groups.uncomment
				: ''}) }


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
// XXX need m and a to be calculated automatically rather than hardcoded...
// 		...can we use .replace(..) for its access to named groups???
// XXX feels a bit ugly...
// XXX closure: macros...
var lex =
module.lex = 
function*(str){
	// NOTE: we are doing a separate pass for comments to completely 
	// 		decouple them from the base macro syntax, making them fully 
	// 		transparent...
	str = clearComments(str)

	var lst = str.split(
		// XXX cache this???
		new RegExp(
			'('+ _MACRO_PATTERN[0]
				.replace(/\$MACROS/g, Object.keys(macros).join('|')) +')',
			_MACRO_PATTERN[1]))

	var macro = false
	while(lst.length > 0){
		if(macro){
			var cur = lst.splice(0, MACRO_PATTERN_GROUPS)
			var match = cur[0]
			// special case: quoted inline macro -> text...
			if(match.startsWith('\\@')){
				yield match
				macro = false 
				continue }
			// group args...
			
			console.log('--- args:', cur[2] || cur[5] || '')
			//var _args = (cur[2] || cur[4] || '')
			var _args = (cur[2] || cur[5] || '')
				.split(MACRO_ARGS_PATTERN)
			var args = {}
			var i = -1
			while(_args.length > 1){
				i++
				var arg = _args.splice(0, MACRO_ARGS_PATTERN_GROUPS)
				console.log('  -', arg)
				// NOTE: for positional args we use order (i) as key...
				//args[ arg[2] || arg[5] || i ] = 
				//	arg[4] || arg[6] || arg[8] || arg[9] }
				args[ arg[2] || arg[6] || i ] = 
					arg[4] || arg[7] || arg[9] || arg[11] }
			// macro-spec...
			yield {
				//name: (cur[1] || cur[3] || cur[5]).toLowerCase(),
				name: (cur[1] || cur[4] || cur[7]).toLowerCase(),
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
// 			block: [ .. ],
//
//			// rest of items are the same as for lex(..)
// 			...
// 		}
//
// XXX normalize lex to be a generator???
var group = 
module.group =
function*(lex, to=false){
	// NOTE: we are not using for .. of .. here as it depletes the 
	// 		generator even if the end is not reached...
	while(true){
		var {value, done} = lex.next()
		if(done){
			if(to){
				throw new Error('Premature end of unpit: Expected closing "'+ to +'"') }
			return }
		if(value.type == 'opening'){
			value.body = [...group(lex, value.name)]
			value.type = 'block'
			yield value
			continue
		} else if(value.type == 'closing'){
			if(value.name != to){
				throw new Error('Unexpected closing "'+ value.name +'"') }
			// NOTE: we are intentionally not yielding the value here...
			return } 
		yield value } } 


var parse = 
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

var macros = {
	now: function(){},
	filter: function(){},
	include: function(){},
	source: function(){},
	quote: function(){},
	macro: function(){},
	slot: function(){},
}





/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
