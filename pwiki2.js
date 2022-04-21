/**********************************************************************
* 
*
* XXX might be a good idea to try signature based security:
* 		- sign changes
* 		- sign sync session
* 		- refuse changes with wrong signatures
* 		- public keys available on client and on server
* 			- check signatures localy
* 			- check signatures remotely
* 		- private key available only with author
* 		- keep both the last signed and superceding unsigned version
* 		- on sync ask to overwrite unsigned with signed
* 		- check if we can use the same mechanics as ssh...
* 		- in this view a user in the system is simply a set of keys and 
* 			a signature (a page =))
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

// XXX
//var object = require('lib/object')
var object = require('ig-object')



/*********************************************************************/


// XXX might be a good idea to make this compatible with node's path API...
var path = 
module.path = {

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
			.reduce(function(res, e, i, L){
				// special case: leading '..' / '.'
				if(res.length == 0 
						&& e == '..'){
					return [e] }
				;(e == '.' 
						// keep explicit '/' only at start/end of path...
						|| (e == '' 
							&& i != 0 
							&& i != L.length-1)) ?
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
		path = module.path.normalize(path, 'string')
		return path in this
   			|| (path[0] == '/' ?
   				path.slice(1) in this
				: ('/'+ path) in this) },

	paths: function(){
		return Object.keys(this) },
	pages: function(){
		var that = this
		return this.paths()
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
			// NOTE: we are matching full paths only here so leading and 
			// 		trainling '/' are optional...
			var pattern = new RegExp(`^\\/?${
				module.path.normalize(path, 'string')
					.replace(/^\/|\/$/g, '')
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
		for(var p of module.path.paths(path)){
			if(p in this){
				return p }
			// NOTE: all paths at this point and in store are absolute, 
			// 		so we check both with the leading '/' and without 
			// 		it to make things a bit more relaxed and return the 
			// 		actual matching path...
			if(p[0] == '/' 
					&& p.slice(1) in this){
				return p.slice(1) }
			if(p[0] != '/'
					&& ('/'+p) in this){
				return '/'+p } } },
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
	// XXX should this return a map for pattern matches???
	get: function(path, strict=false){
		var that = this
		path = this.match(path, strict)
		return path instanceof Array ?
			// XXX should we return matched paths???
   			path.map(function(p){
				// NOTE: p can match a non existing page at this point, 
				// 		this can be the result of matching a/* in a a/b/c
				// 		and returning a a/b which can be undefined...
				return that[p] 
					?? that[that.match(p)] })
			: this[path] },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	//
	// XXX should these return this or the data???
	update: function(path, data, mode='update'){
		path = module.path.normalize('/'+ path, 'string')
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
		path = module.path.normalize(path, 'string')
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
	'System/raw': function(page, path){
		return { text: this.get(path +'/..') } },
	// XXX ...
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var relProxy = 
function(name){
	return function(path='.', ...args){
		return this.store[name](
			module.path.relative(this.path, path), 
			...args) } } 

// XXX do we need history management??? 
var BasePage =
module.BasePage = 
object.Constructor('BasePage', {
	// NOTE: this can be inherited...
	//store: undefined,
	
	// root page used to clone new instances via the .clone(..) method...
	//root: undefined,

	// page location...
	//
	__location: undefined,
	get location(){
		return this.__location ?? '/' },
	set location(path){
		this.referrer = this.location
		var cur = this.__location = 
			module.path.relative(
				this.location, 
				path)
		//* XXX HISTORY...
		if(this.history !== false){
			this.history.includes(this.__location)
				&& this.history.splice(
					this.history.indexOf(this.__location)+1, 
					this.history.length)
			this.history.push(cur) } },
	// referrer -- a previous page location...
	referrer: undefined,

	//* XXX HISTORY...
	// NOTE: set this to false to disable history...
	__history: undefined,
	get history(){
		if(this.__history === false){
			return false }
		if(!this.hasOwnProperty('__history')){
			//this.__history = [] }
			this.__history = (this.__history ?? []).slice() }
		return this.__history },
	back: function(offset=1){
		var h = this.history
		if(h === false 
				|| h.length <= 1){
			return this }
		// get position in history...
		var p = h.indexOf(this.location)
		// if outside of history go to last element...
		p = p < 0 ? 
			h.length
			: p
		p = Math.max(
			Math.min(
				h.length-1 
					- p 
					+ offset,
				h.length-1), 
			0)
		this.referrer = this.location
		this.__location = h[h.length-1 - p]
		return this },
	forward: function(offset=1){
		return this.back(-offset) },
	//*/
	
	// page data...
	//
	// XXX handle functions as pages...
	get data(){
		return this.store.get(this.location) },
	// XXX need to support pattern pages...
	set data(value){
		this.store.update(this.location, value) },
	// shorthands...
	// XXX need to support pattern pages...
	get text(){
		return this.data.text },
	// XXX need to support pattern pages...
	set text(value){
		this.store.update(this.location, {text: value}) },

	// relative proxies to store...
	exists: relProxy('exists'), 
	match: relProxy('match'), 
	delete: relProxy('delete'),

	get: function(path, referrer){
		return this.clone({
				location: path, 
				referrer: referrer 
					?? this.location,
			}) },

	// XXX should this be an iterator???
	each: function(path){
		var that = this
		var paths = this.match(path)
		paths = paths instanceof Array ? 
			paths 
			: [paths]
		return paths
			.map(function(path){
				return that.get(path) }) },

	map: function(func){
		return this.each().map(func) },
	filter: function(func){
		return this.each().filter(func) },
	reduce: function(func, dfl){
		return this.each().reduce(func, dfl) },

	//
	// 	Clone a page optionally asigning data into it...
	// 	.clone()
	// 	.clone({ .. })
	// 		-> <page>
	//
	// 	Fully clone a page optionally asigning data into it...
	// 	.clone(true)
	// 	.clone(true, { .. })
	// 		-> <page>
	//
	//
	// Normal cloning will inherit all the "clones" from the original 
	// page overloading .location and .referrer
	//
	clone: function(data={}){
		var full = data === true
		data = full ? 
			arguments[1] ?? {} 
			: data
		return Object.assign(
			full ?
				// full copy...
				this.constructor(this.path, this.referrer, this.store)
				// NOTE: this will restrict all the clones to the first 
				// 		generation maintaining the original (.root) page as 
				// 		the common root...
				// 		this will make all the non-shadowed attrs set on the
				// 		root visible to all sub-pages.
				: Object.create(this.root ?? this),
			{
				root: this.root ?? this,
				location: this.location, 
				referrer: this.referrer,
			},
			data) },

	__init__: function(path, referrer, store){
		// NOTE: this will allow inheriting .store from the prototype
		if(store){
			this.store = store }
		this.location = path
		this.referrer = referrer },
})



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
// XXX feels a bit ugly...
var lex =
module.lex = 
function*(str, macros){
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
// 			body: [
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
// XXX normalize lex to be a generator (???)
var group = 
module.group =
function*(lex, to=false, macros){
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
function*(str, macros){
	yield* group(
		lex(str, macros), 
		macros) }


// XXX need context -- page/store...
// XXX need to make this recursive....
// 		...might even be a good idea to make the above grouo(..) and friends
// 		recursive too...
// XXX closure: macros
var expand =
module.expand =
function*(page, ast, state={}){
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
		// XXX PAGE...
		var res = 
			// XXX need to hav eaccess to expand(..) in the macro to be 
			// 		able to uniformly parse the body...
			page.macros[name].call(page, args, body, state)
				?? ''
		// XXX test if iterable...
		if(res instanceof Array){
			// XXX recursively expand this...
			yield* res
		} else {
			yield res } } }


// XXX macros and filters should be features for simpler plugin handlng (???)
var Page =
module.Page = 
object.Constructor('Page', BasePage, {
	filters: {
	},
	macros: {
		// XXX STUB
		now: function(){
			return [''+ Date.now()] },
		filter: function(){},
		include: function(){},
		source: function(){},
		quote: function(){},
		macro: function(){},
		slot: function(){},

		// nesting rules...
		'else': ['macro'],
	},

	expand: function(state={}){
		return expand(this, parse(this.text), state)
			.join('') },
})



//---------------------------------------------------------------------

var WIKIWORD_PATTERN =
	RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g')



//---------------------------------------------------------------------





/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
