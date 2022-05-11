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
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

// XXX
//var object = require('lib/object')
var object = require('ig-object')
var types = require('ig-types')



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

	split: function(path){
		return this.normalize(path, 'array') },
	join: function(...parts){
		return this.normalize(
			(parts[0] instanceof Array ?
					parts[0]
					: parts)
				.join('/'), 
			'string') },
}



//---------------------------------------------------------------------

//
// To create a store adapter:
// 		- inherit from BaseStore
// 		- overload:
// 			.__paths__()
// 				-> <keys>
// 			.__exists__(..)
// 				-> false
// 				-> <path>
// 			.__get__(..)
// 				-> <data>
// 		- optionally (for writable stores)
// 			.__update__(..)
// 			.__delete__(..)
// 			.load(..)
//
//
// NOTE: store keys must be normalized...
//
// XXX BUG: mixing up '/' and '' paths...
// XXX LEADING_SLASH should this be strict about leading '/' in paths???
// 		...this may lead to duplicate paths created -- '/a/b' and 'a/b'
// XXX would be nice to be able to create sub-stores, i.e. an object that
// 		would store multiple sub-pages for things like todo docs... (???)
// 		...the question is how to separate the two from the wiki side...
// XXX path macros???
// XXX should we support page symlinking???
var BaseStore = 
module.BaseStore = {

	// XXX NEXT need to think about this...
	next: undefined,

	// XXX should this be a prop???
	// 		...if yes then remove unnecessary "this.data ?? {}" checks...
	__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data = {}) },
	set data(value){
		this.__data = value },


	__paths__: function(){
		return Object.keys(this.data) },
	paths: function(local=false){
		return this.__paths__() 
			// XXX NEXT
			.concat((!local && (this.next || {}).paths) ? 
				this.next.paths() 
				: []) },

	//
	// 	.exists(<path>)
	// 		-> <normalized-path>
	// 		-> false
	//
	// XXX might be a good idea to cache this...
	__exists__: function(path){
		return path in this.data
				&& path },
	exists: function(path){
		path = module.path.normalize(path, 'string')
		return this.__exists__(path, 'string') 
			// NOTE: all paths at this point and in store are 
			// 		absolute, so we check both with the leading 
			// 		'/' and without it to make things a bit more 
			// 		relaxed and return the actual matching path...
			|| this.__exists__(
				path[0] == '/' ? 
					path.slice(1) 
					: ('/'+ path))
			// XXX NEXT
			// delegate to .next...
			|| ((this.next || {}).__exists__
				&& (this.next.__exists__(path)
					|| this.next.__exists__(
						path[0] == '/' ?
							path.slice(1)
							: ('/'+ path)))) 
			// normalize the output...
			|| false },

	/*/ XXX do we actually need this???
	// 		...this is the same as .get('**')
	// XXX NEXT not sure how to implement .next protocol here...
	pages: function(){
		var that = this
		return this.paths()
			.map(function(p){
				return [p, that.data[p]] }) },
	//*/

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
			p = this.exists(p)
			if(p){
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
	// XXX should this return a map for pattern matches???
	__get__: function(key){
		return this.data[key] },
	get: function(path, strict=false){
		var that = this
		path = this.match(path, strict)
		return path instanceof Array ?
			// XXX should we return matched paths???
   			path.map(function(p){
				// NOTE: p can match a non existing page at this point, 
				// 		this can be the result of matching a/* in a a/b/c
				// 		and returning a a/b which can be undefined...
				return that.get(p) })
			: (this.__get__(path) 
				// XXX NEXT
				?? ((this.next || {}).__get__ 
					&& this.next.__get__(path))) },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	// NOTE: edit methods are local-only...
	//
	// XXX do we copy the data here or modify it????
	// XXX BUG: for path '/' this adds an entry at '', but when getting 
	// 		'/', the later is not found...
	__update__: function(key, data, mode='update'){
		this.data[key] = data 
		return this },
	update: function(path, data, mode='update'){
		var exists = this.exists(path) 
		path = exists
			|| module.path.normalize(path, 'string')
		data = 
			data instanceof Function ?
				data
				: Object.assign(
					{
						__proto__: data.__proto__,
						ctime: Date.now(),
					},
					(mode == 'update' && exists) ?
						this.get(path)
						: {},
					data,
					{mtime: Date.now()})
		this.__update__(path, data, mode)
		return this },
	__delete__: function(path){
		delete this.data[path] 
		return this },
	delete: function(path){
		path = this.exists(path)
		path
			&& this.__delete__(path)
		return this },


	// XXX NEXT might be a good idea to have an API to move pages from 
	// 		current store up the chain...


	// XXX do we need this???
	load: function(...data){
		this.data = Object.assign(this.data, ...data)
		return this },

	// XXX NEXT EXPERIMENTAL...
	nest: function(base){
		return {
			__proto__: base 
				?? module.BaseStore,
			next: this,
			data: {}
		} },

}



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
//
// XXX stores to experiment with:
// 		- cache
// 		- fs
// 		- PouchDB
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
// Meta-Store
//
// Extends BaseStore to handle other stores as pages. i.e. sub-paths can 
// be handled by nested stores.
//

// XXX might be a good idea to normalize args...
var metaProxy = 
function(meth, drop_cache=false, post){
	var target = meth.replace(/__/g, '')
	if(drop_cache instanceof Function){
		post = drop_cache
		drop_cache = false }
	return function(path, ...args){
		var store = this.substore(path)

		var res = store == null ?
			object.parentCall(MetaStore, meth, this, path, ...args)
			//: this.data[store][meth](path.slice(store.length), ...args) 
			: this.data[store][target](path.slice(store.length), ...args) 

		//console.log('---', path, target, '(', store, ...args, ') ->', res)
		if(drop_cache){
			delete this.__substores }
		post 
			&& (res = post.call(this, res, store, path, ...args))
		return res} }


// XXX not sure about the name...
// XXX should this be a mixin???
// XXX TEST...
var MetaStore =
module.MetaStore = {
	__proto__: BaseStore,

	//data: undefined,

	__substores: undefined,
	get substores(){
		return this.__substores 
			?? (this.__substores = Object.entries(this.data)
				.filter(function([path, value]){
					return object.childOf(value, module.BaseStore) })
				.map(function([path, _]){
					return path })) },
	substore: function(path){
		path = module.path.normalize(path, 'string')
		var store = this.substores
			.filter(function(p){
				return path.startsWith(p) })
			.sort(function(a, b){
				return a.length - b.length })
			.pop() 
		return store == path ?
			// the actual store is not stored within itself...
			undefined
			: store },
	
	__paths__: function(){
		var that = this
		var data = this.data
		return Object.keys(data)
			.map(function(path){
				return object.childOf(data[path], module.BaseStore) ?
					data[path]
						.paths()
						.map(function(s){
							return module.path.join(path, s) })
				: path })
			.flat() },
	// XXX revise...
	__exists__: metaProxy('__exists__', 
		function(res, store, path){
			return store ?
				// XXX which way should we go???
				//module.path.join(store, res)
				path
	   			: res }),
	__get__: metaProxy('__get__'),
	__delete__: metaProxy('__delete__', true),
	__update__: metaProxy('__update__', true),
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX EXPERIMENTAL, needs testing in browser...
var localStorageStore =
module.localStorageStore = {
	__proto__: BaseStore,
	__prefix__: '--pwiki:',

	// XXX add caching of unserialized data???
	data:
		typeof(localStorage) != 'undefined' ?
			localStorage
			: undefined,
	
	__paths__: function(){
		var that = this
		return Object.keys(this.data)
			.map(function(k){ 
				return k.startsWith(that.__prefix__) ?
					k.slice((that.__prefix__ ?? '').length) 
					: [] }) 
			.flat() },
	__exists__: function(path){
		return ((this.__prefix__ ?? '')+ path) in this.data 
			&& path },
	__get__: function(path){
		path = (this.__prefix__ ?? '')+ path
		return path in this.data ?
			JSON.parse(this.data[path]) 
			: undefined },
	__update__: function(path, data={}){
		this.data[(this.__prefix__ ?? '')+ path] = 
			JSON.stringify(data)
		return this },
	__delete__: function(path){
		delete this.data[(this.__prefix__ ?? '')+ path]
		return this },

	// XXX 
	load: function(){
	},
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var localStorageNestedStore =
module.localStorageNestedStore = {
	__proto__: BaseStore,
	__data__: '__pwiki_data__',
	__cache__: '__pwiki_cache__',

	__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data =
				Object.assign(
					{ __proto__: JSON.parse(localStorage[this.__data__] || '{}') },
					JSON.parse(localStorage[this.__cache__] || '{}') )) },

	// XXX do partials saves -> cache + write cache...
	// XXX on full save merge cache and save...
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var FileStore =
module.FileStore = {
	__proto__: BaseStore,
	__path__: '',

	// XXX
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var PouchDBStore =
module.PouchDBStore = {
	__proto__: BaseStore,

	// XXX
}


//---------------------------------------------------------------------

var relProxy = 
function(name){
	return function(path='.', ...args){
		return this.store[name](
			module.path.relative(this.location, path), 
			...args) } } 

// XXX HISTORY do we need history management??? 
// XXX FUNC need to handle functions in store...
// XXX EVENT add event triggers/handlers...
// 		...event handlers must be local and not propogate to the root page.
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
	// XXX EVENT need to be able to trigger a callback/event on this...
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

	// .path is a proxy to .location
	// XXX do we need this???
	get path(){
		return this.location },
	set path(value){
		this.location = value },

	get name(){
		return module.path.split(this.path).pop() },
	// XXX should this rename or change path???
	//set name(value){ },
	get dir(){
		return module.path.relative(this.location, '..') },
	// XXX should writing to this move the page???
	//set dir(value){ },

	//* XXX HISTORY...
	// NOTE: set this to false to disable history...
	__history: undefined,
	get history(){
		if(this.__history === false){
			return false }
		if(!this.hasOwnProperty('__history')){
			this.__history = [] }
			//this.__history = (this.__history ?? []).slice() }
		return this.__history },
	// XXX EVENT trigger location change event..,
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
	// XXX FUNC handle functions as pages...
	// XXX need to support pattern pages...
	get data(){
		return this.store.get(this.location) },
	set data(value){
		this.store.update(this.location, value) },

	// number of matching pages...
	get length(){
		var p = this.match(this.location)
		return p instanceof Array ?
			p.length
			: 1 },

	// relative proxies to store...
	exists: relProxy('exists'), 
	match: relProxy('match'), 
	delete: function(path='.'){
		this.store.delete(module.path.relative(this.location, path))
		return this },

	// XXX how should this handle functions as values???
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
				return that.get('/'+ path) }) },

	map: function(func){
		return this.each().map(func) },
	filter: function(func){
		return this.each().filter(func) },
	reduce: function(func, dfl){
		return this.each().reduce(func, dfl) },

	//
	// 	Clone a page optionally asigning data into it...
	// 	.clone()
	// 	.clone({ .. }[, <clone-history>])
	// 		-> <page>
	//
	// 	Fully clone a page optionally asigning data into it...
	// 	.clone(true[, <clone-history>])
	// 	.clone(true, { .. }[, <clone-history>])
	// 		-> <page>
	//
	//
	// Normal cloning will inherit all the "clones" from the original 
	// page overloading .location and .referrer
	//
	// NOTE: <clone-history> by default is false unless fully cloning
	//
	// XXX revise...
	// XXX HISTORY should we clear history by default...
	clone: function(data={}, history=false){
		var [data, ...args] = [...arguments]
		var full = data === true
		history = 
			typeof(args[args.length-1]) == 'boolean' ? 
				args.pop() 
				: full
		data = full ? 
			args[0] ?? {} 
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
			// XXX HISTORY...
			this.__history !== false ?
				{ __history: 
					history ?
						(this.__history ?? []).slice() 
						: [] }
				:{},
			//*/
			data) },

	update: function(...data){
		return Object.assign(this, ...data) },

	__init__: function(path, referrer, store){
		// NOTE: this will allow inheriting .store from the prototype
		if(store){
			this.store = store }
		this.location = path
		this.referrer = referrer },
})



//---------------------------------------------------------------------
// Parser...

// XXX should we warn about stuff like <macro src=/moo/> -- currently 
// 		this will simply be ignored, i.e. passed trough the parser 
// 		without change...

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
	// XXX BUG: @now(a) is not matched....
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
			'<!--\\[pwiki\\[(?<uncomment>.*)\\]\\]-->',

			// <pwiki-comment> .. </pwiki-comment>
			'<\\s*pwiki-comment[^>]*>.*<\\/\\s*pwiki-comment\\s*>',
			// <pwiki-comment .. />
			'<\\s*pwiki-comment[^\\/>]*\\/>',
		].join('|') +')', 'smig'),


	// helpers...
	//
	getPositional: function(args){
		return Object.entries(args)
			.reduce(function(res, [key, value]){
				/^[0-9]+$/.test(key)
					&& (res[key*1] = value)
				return res }, []) },
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
	// NOTE: this internally uses macros' keys to generate the lexing pattern.
	lex: function*(page, str){
		str = str 
			?? page.raw
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
	// NOTE: this internaly uses macros to check for propper nesting
	//group: function*(page, lex, to=false){
	group: function*(page, lex, to=false, parent){
		lex = lex
			?? this.lex(page) 
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
	// 			filters: [
	// 				'<filter>'
	// 					| '-<filter>',
	// 				...
	// 			],
	// 			data: [ <item>, .. ],
	// 		}
	//
	expand: function*(page, ast, state={}){
		ast = ast == null ?
				this.group(page)
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
			if(!(page.macros[name] instanceof Function)){
				continue }
			var res = 
				page.macros[name].call(page, args, body, state, value)
					?? ''
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
	// XXX add a special filter to clear pending filters... (???)
	parse: function(page, ast, state={}){
		var that = this
		// XXX should we handle strings as input???
		ast = ast 
			?? this.expand(page, null, state)
		ast = typeof(ast) == 'string' ?
			this.expand(page, ast, state)
			: ast

		return [...ast]
			// post handlers...
			.map(function(section){
				return section instanceof Function ? 
					section.call(page, state)
					: section })
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
								if(page.filters[filter] == null){
									throw new Error(
										'.parse(..): unsupported filter: '+ filter) }
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


// -  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX revise...
var Filter = 
module.Filter =
function(...args){
	var func = args.pop()
	args.length > 0
		&& Object.assign(func, args.pop())
	return func }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX PATH_VARS need to handle path variables...
// XXX macros and filters should be features for simpler plugin handlng (???)
var Page =
module.Page = 
object.Constructor('Page', BasePage, {
	// Filter that will isolate the page/include/.. from parent filters...
	ISOLATED_FILTERS: 'isolated',

	// list of macros that will get raw text of their content...
	QUOTING_MACROS: ['quote'],

	//
	// 	<filter>(<source>)
	// 		-> <result>
	// 		-> undefined
	//
	// XXX might be a good idea to fix filter order...
	filters: {
		// placeholders...
		nofilters: function(){},
		isolated: function(){},

		// XXX TESTING...
		dummy: function(){},
		test: function(source){
			return source 
				.replace(/test/g, 'TEST') },

		wikiword: Filter(
			{quote: 'quote-wikiword'},
			function(source){
				// XXX
				return source }),
		'quote-wikiword': function(source){
			// XXX
			return source },

		markdown: Filter(
			{quote: 'quote-markdown'},
			function(source){
				return source }),
		'quote-markdown': function(source){
			// XXX
			return source },
	},

	//
	// 	<macro>(<args>, <body>, <state>){ .. }
	// 		-> undefined
	// 		-> <text>
	// 		-> <array>
	// 		-> <iterator>
	// 		-> <func>(<state>)
	// 			-> ...
	//
	// XXX need a good way to get the first positional arg without 
	// 		mixing it up with other args -- see src/name args below...
	macros: {
		// XXX move to docs...
		test: function*(args, body, state){
			if(body){
				state.testBlock = (state.testBlock ?? 0) + 1

				yield '\n<test>\n\n'
				yield* this.expand(body) 
				yield '\n\n</test>\n'

				--state.testBlock == 0
					&& (delete state.testBlock)
			} else {
				yield '<test/>' } },

		now: function(){
			return ''+ Date.now() },
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
		filter: function(args, body, state, expand=true){
			var that = this
			var filters = state.filters = 
				state.filters ?? []
			// separate local filters...
			if(body){
				var outer_filters = filters
				filters = state.filters =
					[outer_filters] }

			// merge in new filters...
			var local = Object.values(args)
			filters.splice(filters.length, 0, ...local)

			// trigger quote-filter...
			var quote = local
				.map(function(filter){
					return (that.filters[filter] ?? {})['quote'] ?? [] })
				.flat()
			quote.length > 0
				&& this.macros['quote-filter']
					.call(this, Object.fromEntries(Object.entries(quote)), null, state)

			// local filters...
			if(body){
				// isolate from parent...
				state.filters.includes(this.ISOLATED_FILTERS)
					&& state.filters[0] instanceof Array
					&& state.filters.shift()

				// expand the body...
				var ast = expand ?
						[...this.__parser__.expand(this, body, state)]
					: body instanceof Array ?
						body
					// NOTE: wrapping the body in an array effectively 
					// 		escapes it from parsing...
					: [body]
				filters = state.filters

				state.filters = outer_filters

				// parse the body after we are done expanding...
				return function(state){
					var outer_filters = state.filters
					state.filters = this.__parser__.normalizeFilters(filters)
					var res =
						[...this.__parser__.parse(this, ast, state)]
							.flat()
							.join('') 
					state.filters = outer_filters
					return { data: res } } } },
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
		// XXX 'text' argument is changed to 'recursive'...
		// XXX should we track recursion via the resolved (current) path 
		// 		or the given path???
		// XXX should this be lazy???
		include: function(args, body, state, key='included', handler){
			// positional args...
			var src = args.src //|| args[0]
			var recursive = args.recursive || body
			var isolated = this.__parser__.getPositional(args).includes('isolated')

			if(!src){
				return '' }

			handler = handler 
				?? function(){
					return this.get(src)
						.parse(
							isolated ? 
								{[key]: state[key]} 
								: state) }

			// handle recursion...
			var parent_seen = state[key]
			var seen = state[key] = 
				(state[key] ?? [this.location]).slice()
			var target = this.match(src)
			target = target instanceof Array ?
				target.join(',')
				: target
			// recursion detected...
			if(this.match() == this.match(src)
					|| seen.includes(target)){
				if(!recursive){
					throw new Error(
						'include: include recursion detected: '
							+ seen.concat([target]).join(' -> ')) }
				// have the 'recursive' arg...
				return this.__parser__.parse(this, recursive, state) }
			seen.push(target)

			// load the included page...
			var res = handler.call(this)

			// restore previous include chain...
			if(parent_seen){
				state[key] = parent_seen
			} else {
				delete state[key] }

			return res },
		source: function(args, body, state){
			var src = args.src //|| args[0]
			return this.macros.include.call(this, 
				args, body, state, 'sources', 
				function(){
					return this.__parser__.parse(this, this.get(src).raw +'', state) }) },
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
		//
		// XXX need a way to escape macros -- i.e. include </quote> in a quoted text...
		quote: function(args, body, state){
			var src = args.src //|| args[0]
			var text = args.text 
				?? body 
				?? []
			text = src ?
					// source page...
					this.get(src).raw
				: text instanceof Array ?
					text.join('')
				: text

			// empty...
			if(!text){
				return }

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
			return function(state){
				// add global quote-filters...
				filters =
					(state.quote_filters 
							&& !(filters ?? []).includes(this.ISOLATED_FILTERS)) ?
						[...state.quote_filters, ...(filters ?? [])]
						: filters
				if(filters){
					filters = Object.fromEntries(Object.entries(filters))
					return this.macros.filter
						.call(this, filters, text, state, false)
						.call(this, state) }
				return text } },
		// very similar to @filter(..) but will affect @quote(..) filters...
		'quote-filter': function(args, body, state){
			var filters = state.quote_filters = 
				state.quote_filters ?? []
			filters.splice(filters.length, 0, ...Object.values(args)) },
		//
		//	<slot name=<name>/>
		//
		//	<slot name=<name> text=<text>/>
		//
		//	<slot name=<name>>
		//		...
		//	</slot>
		//
		//	Force show a slot...
		//	<slot shown ... />
		//
		//	Force hide a slot...
		//	<slot hidden ... />
		//
		//
		// NOTE: by default only the first slot with <name> is visible, 
		// 		all other slot with <name> will replace its content, unless
		// 		explicit shown/hidden arguments are given.
		// NOTE: hidden has precedence over shown if both are given.
		//
		// XXX how do we handle a slot defined within a slot????
		// 		...seems that we'll fall into recursion on definition...
		slot: function(args, body, state){
			var name = args.name
			var text = args.text 
				?? body 
				// NOTE: this can't be undefined for .expand(..) to work 
				// 		correctly...
				?? []

			var slots = state.slots = 
				state.slots 
					?? {}

			//var hidden = name in slots
			// XXX EXPERIMENTAL
			var pos = this.__parser__.getPositional(args)
			var hidden = 
				// 'hidden' has priority... 
				(pos.includes('hidden') || args.hidden)
					// explicitly show... ()
					|| ((pos.includes('shown') || args.shown) ?
						false
						// show first instance...
						: name in slots)

			slots[name] = [...this.__parser__.expand(this, text, state)]

			return hidden ?
				''
				: function(state){
					return state.slots[name] } }, 

		// XXX sorting not implemented yet....
		macro: function(args, body, state){
			var that = this
			var name = args.name //?? args[0]
			var src = args.src
			var sort = (args.sort ?? '')
				.split(/\s+/g)
				.filter(function(e){ 
					return e != '' })
			var text = args.text 
				?? body 
				?? []

			if(name){
				// define new named macro...
				if(text){
					;(state.macros = state.macros ?? {})[name] = text
				// use existing macro...
				} else if(state.macros 
						&& name in state.macros){
					text = state.macros[name] } }

			if(src){
				var pages = this.get(src).each()
				// no matching pages -> get the else block...
				if(pages.length == 0 && text){
					var else_block = 
						(text ?? [])
							.filter(function(e){ 
								return typeof(e) != 'string' 
									&& e.name == 'else' }) 
					if(else_block.length == 0){
						return }
					// XXX do we take the first or the last (now) block???
					else_block = else_block.pop()
					else_block = 
						else_block.args.text 
							?? else_block.body
					return else_block ?
						[...this.__parser__.expand(this, else_block, state)]
						: undefined }

				// sort pages...
				if(sort.length > 0){
					// XXX
					throw new Error('macro sort: not implemented')
				}

				// apply macro text...
				// XXX not sure we should expand the whole thing directly here...
				return pages
					.map(function(page){
						return [...that.__parser__.expand(page, text, state)] })
					.flat()
			} },

		// nesting rules...
		'else': ['macro'],
	},

	// page parser...
	//
	__parser__: module.parser,
	parse: function(state={}){
		// NOTE: we do not need to pass this.raw here but it is still 
		// 		here for illustration...
		return this.__parser__.parse(this, this.raw, state) },


	// raw page text...
	//
	// NOTE: writing to .raw is the same as writing to .text...
	// XXX FUNC handle functions as pages...
	// XXX need to support pattern pages...
	get raw(){
		var data = this.data
		return data instanceof Function ?
			// XXX FUNC not sure about this...
			data.call(this)
   			: data.text	},
	set raw(value){
		this.store.update(this.location, {text: value}) },

	// expanded page text...
	//
	// NOTE: writing to .raw is the same as writing to .text...
	// XXX FUNC handle functions as pages...
	// XXX need to support pattern pages...
	get text(){
		return this.parse() },
	set text(value){
		this.store.update(this.location, {text: value}) },


})



//---------------------------------------------------------------------

var WIKIWORD_PATTERN =
	RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g')



//---------------------------------------------------------------------
// Basic setup...
//
//
// Store topology:
// 		
// 		root (BaseStore) ---next--- main (MetaStore)
// 										|
// 										+-- System/... (BaseStore)
//
// Alternative store topology:
//
// 		root (BaseStore) ---next--- main (MetaStore)
// 			System/... (static)
//
//

var store = 
module.store = 
	//BaseStore.nest()
	BaseStore.nest(MetaStore)


var System = {
	// metadata...
	//
	path: function(){
		return this.get('..').path },
	location: function(){
		return this.get('..').path },
	resolved: function(){
		return this.get('..').match() },
	dir: function(){
		return this.get('..').dir },
	name: function(){
		return this.get('..').name },
	ctime: function(){
		return this.get('..').data.ctime },
	mtime: function(){
		return this.get('..').data.mtime },

	title: function(){
		var p = this.get('..')
		return p.title 
			?? p.name },


	// utils...
	//
	// XXX System/subpaths


	// actions...
	//
	delete: function(){
		this.location = '..'
		this.delete()
		return this.text },
	// XXX System/back
	// XXX System/forward
	// XXX System/sort
	// XXX System/reverse
}


// XXX note sure how to organize the system actions -- there can be two 
// 		options:
// 			- a root ram store with all the static stuff and nest the rest
// 			- a nested store (as is the case here)
// XXX nested system store...
store.update('System', Object.create(BaseStore).load(System))
/*/ // XXX chained system store...
store.next.load(
	// Create a new system action-set with paths starting with 'System/'
	Object.entries(System)
		.reduce(function(res, [key, func]){
			res[module.path.join('System', key)] = func
			return res }, {}))
//*/


// NOTE: in general the root wiki api is simply a page instance.
// XXX not yet sure how to organize the actual client -- UI, hooks, .. etc
var pwiki =
module.pwiki = 
Page('/', '/', store)



//---------------------------------------------------------------------
// XXX experiments and testing...

store.load(require('./bootstrap'))


// XXX TEST...
// XXX add filter tests...
console.log('loading test page...')
pwiki
	.update({
		location: '/page',
		text: 'PAGE\n'
			+'\n'
			// XXX BUG this is parsed incorrectly -- macro pattern...
			//+'@include(/test recursive="Recursion type 2 (<now/>)")\n',
			+'@include(/test recursive="Recursion type 2 <now/>")\n'
			+'\n'
			+'@slot(name=b text="filled slot")\n',
	})
	.update({
		location: '/other',
		text: 'OTHER',
	})
	.update({
		location: '/test',
		text: 'TEST\n'
			+'\n'
			+'globally filtered test text...\n'
			+'\n'
			+'<filter -test>...unfiltered test text</filter>\n'
			+'\n'
			//+'<filter test>locally filtered test text</filter>\n'
			+'\n'
			+'@slot(name=a text="non-filled slot")\n'
			+'\n'
			+'@slot(name=b text="non-filled slot")\n'
			+'\n'
			+'Including /other #1: @include(/other)\n'
			+'Including /other #2: @include(/other)\n'
			+'\n'
			// XXX BUG this is parsed incorrectly -- macro pattern...
			//+'Including /test: @include(/test recursive="Recursion type 1 (<now/>)")\n'
			+'Including /test: @include(/test recursive="Recursion type 1 <now/>")\n'
			+'\n'
			+'Including /page: @include(/page)\n'
			+'\n'
			+'Including /: \\@include(/)\n'
			+'\n'
			+'@filter(test)',
	})
//*/





/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
