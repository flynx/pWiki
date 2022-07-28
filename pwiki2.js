/**********************************************************************
* 
*
*
* Architecture:
* 	store
* 	page
* 	renderer
*
*
* XXX weaknesses to review:
* 		- <store>.paths() as an index...
* 			+ decouples the search logic from the store backend
* 			- requires the whole list of pages to be in memory
* 				...need to be independent of the number of pages if at 
* 				all possible -- otherwise this will hinder long-term use...
* 		- 
*
*
* TODO:
* 	- async parser does not work...
* 	- .load(..) / .json(..) -- for most stores...
* 		might be a good idea to keep a unified format...
* 	- <page>.then() -- resolve when all pending write operations done ???
* 	- an async REPL???
*
*
*
***********************************************************************
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
* XXX split this into modules (???)
*
* XXX add action to reset overloaded (bootstrap) pages...
* 		- per page
* 		- global
*
* XXX need to think about search -- page function argument syntax???
*
* XXX might need to get all the links (macro-level) from a page...
* 		...would be useful for caching...
*
* XXX .__paths__(..) may be a bottleneck...
* 		need to either think of a way around it or cache the path index
* 		in a sync way...
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


//---------------------------------------------------------------------
// Path...

var path = 
module.path = {

	// Page returned when listing a path ending with '/'...
	//
	// If set to false treat dirs the same as pages (default)
	//INDEX_PAGE: 'index',
	INDEX_PAGE: false,

	// The page returned when getting the '/' path...
	//
	// NOTE: this is the same as .INDEX_PAGE but only for '/'
	ROOT_PAGE: 'WikiHome',

	ALTERNATIVE_PAGES: [
		'EmptyPage',
		'NotFound',
	],

	// Default alternate search locations...
	//
	// NOTE: if a path here is relative it is also searched relative to 
	// 		the target path.
	SEARCH_PATHS: [
		//'./Theme/CLI',
		'./Templates',
		'/System',
	],

	// Path utils...
	//
	// Path can be in one of two formats:
	// 	string
	// 	array
	//
	// NOTE: trailing/leading '/' are represented by '' at end/start of 
	// 		path list...
	normalize: function(path='.', format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		var root = path[0] == '' 
			|| path[0] == '/'
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
					((res.length > 1 
							|| res[0] != '')
						&& res.pop())
				// NOTE: the last '>>' will be retained...
				: res.push(e)
				return res }, []) 
		return format == 'string' ?
			// special case: root -> keep '/'
			((root 
					&& path.length == 1 
					&& path[0] == '') ?
				('/'+ path.join('/'))
				: path.join('/'))
			: path },
	split: function(path){
		return this.normalize(path, 'array') },
	join: function(...parts){
		return this.normalize(
			(parts[0] instanceof Array ?
					parts[0]
					: parts)
				.join('/'), 
			'string') },
	basename: function(path){
		return this.split(path).pop() },
	dirname: function(path){
		return this.relative(path, '..', 'string') },

	relative: function(parent, path, format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		// root path...
		if(path[0] == '' || path[0] == '/'){
			return this.normalize(path, format) }
		// unify parent/path types...
		parent = parent instanceof Array ?
			parent
			: parent.split(/\s*[\\\/]+\s*/)
		path = path instanceof Array ?
			path
			: path.split(/\s*[\\\/]+\s*/)
		return this.normalize([...parent, ...path], format) },

	// Build alternative paths for page acquisition...
	//
	// NOTE: if seen is given (when called recursively) this will not 
	// 		search for .ALTERNATIVE_PAGES...
	// XXX should we search for each path element or just the last one (current)??? 
	// XXX should we keep the trailing '/'???
	paths: function*(path='/', seen){
		var alt_pages = !seen
		seen = seen 
			?? new Set()
		path = this.normalize(path, 'string')
		// special case: root...
		if(path == '/' || path == ''){
			// normalize...
			path = '/'
			// as-is...
			seen.add(path)
			yield path
			// special case: root page...
			if(this.ROOT_PAGE){
				yield* this.paths(this.normalize('/'+ this.ROOT_PAGE, 'string'), seen) }}
		// NOTE: since path is already normalized we can trust the delimiter...
		path = path.split(/\//g)
		// normalize relative paths to root...
		path[0] != ''
			&& path.unshift('')
		// paths ending in '/'...
		if(path[path.length-1] == ''){
			path.pop()
			this.INDEX_PAGE
				&& path.push(this.INDEX_PAGE) }
		// search for page...
		var page = path.pop()
		for(var tpl of ['.', ...this.SEARCH_PATHS]){
			// search for page up the path...
			var p = path.slice()
			while(p.length > 0){
				var cur = this.relative(p, tpl +'/'+ page, 'string')
				if(!seen.has(cur)){
					seen.add(cur)
					yield cur }
				// special case: non-relative template/page path...
				if(tpl[0] == '/'){
					break }
				p.pop() } }
		// alternative pages...
		if(alt_pages){
			for(var page of [...this.ALTERNATIVE_PAGES]){
				yield* this.paths(path.concat(page), seen) }} },
}



//---------------------------------------------------------------------
// Store...

//
// To create a store adapter:
// 		- inherit from BaseStore
// 		- overload:
// 			.__paths__()
// 				-> <keys>
// 			.__exists__(..)
// 				-> <path>
// 				-> false
// 			.__get__(..)
// 				-> <data>
// 		- optionally (for writable stores)
// 			.__update__(..)
// 			.__delete__(..)
// 			.load(..)
//
//
// NOTE: store keys must be normalized to avoid conditions where two
// 		forms of the same path exist at the same time...
//
//
// XXX potential architectural problems:
// 		- .paths()
// 			external index -- is this good???
// 			bottleneck??
// 			cache/index???
// 			...can we avoid this??
//
// XXX LEADING_SLASH should this be strict about leading '/' in paths???
// 		...this may lead to duplicate paths created -- '/a/b' and 'a/b'
// XXX should we support page symlinking???
// XXX async: not sure if we need to return this from async methods...
var BaseStore = 
module.BaseStore = {

	// XXX NEXT revise naming...
	next: undefined,

	// NOTE: .data is not part of the spec and can be implementation-specific,
	// 		only .__<name>__(..) use it internally... (XXX check this)
	__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data = {}) },
	set data(value){
		this.__data = value },


	// XXX might be a good idea to cache this...
	__paths__: async function(){
		return Object.keys(this.data) },
	paths: async function(local=false){
		return this.__paths__()
			.iter()
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
	__exists__: async function(path){
		return path in this.data
				&& path },
	exists: async function(path){
		path = module.path.normalize(path, 'string')
		return (await this.__exists__(path, 'string'))
			// NOTE: all paths at this point and in store are 
			// 		absolute, so we check both with the leading 
			// 		'/' and without it to make things a bit more 
			// 		relaxed and return the actual matching path...
			|| (await this.__exists__(
				path[0] == '/' ? 
					path.slice(1) 
					: ('/'+ path)))
			// XXX NEXT
			// delegate to .next...
			|| ((this.next || {}).__exists__
				&& (await this.next.__exists__(path)
					|| await this.next.__exists__(
						path[0] == '/' ?
							path.slice(1)
							: ('/'+ path)))) 
			// normalize the output...
			|| false },
	// find the closest existing alternative path...
	find: async function(path){
		for(var p of await module.path.paths(path)){
			p = await this.exists(p)
			if(p){
				return p } } },
	// 
	// 	Resolve page for path
	// 	.match(<path>)
	// 		-> <path>
	//
	// 	Match paths (non-strict mode)
	// 	.match(<pattern>)
	// 	.match(<pattern>, false)
	// 		-> [<path>, ...]
	// 		-> []
	//
	// 	Match pages (paths in strict mode)
	// 	.match(<pattern>, true)
	// 		-> [<path>, ...]
	// 		-> []
	//
	// In strict mode the trailing star in the pattern will only match 
	// actual existing pages, while in non-strict mode the pattern will 
	// match all sub-paths.
	//
	match: async function(path, strict=false){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var order = (this.metadata(path) ?? {}).order || []
			// NOTE: we are matching full paths only here so leading and 
			// 		trainling '/' are optional...
			// NOTE: we ensure that we match full names and always split 
			// 		at '/' only...
			var pattern = new RegExp(`^\\/?${
					module.path.normalize(path, 'string')
						.replace(/^\/|\/$/g, '')
						.replace(/\//g, '\\/')
						.replace(/\*\*/g, '.+')
						.replace(/\*/g, '[^\\/]+') 
				}(?=[\\\\\/]|$)`)
			return [...(await this.paths())
					// NOTE: we are not using .filter(..) here as wee 
					// 		need to keep parts of the path only and not 
					// 		return the whole thing...
					.reduce(function(res, p){
						// skip metadata paths...
						if(p.includes('*')){
							return res }
						var m = p.match(pattern)
						m
							&& (!strict 
								|| m[0] == p) 
							&& res.add(m[0])
						return res }, new Set())]
			   .sortAs(order) }
		// direct search...
		return this.find(path) },
	//
	// 	.resolve(<path>)
	// 		-> <path>
	//
	// 	.resolve(<pattern>)
	// 		-> [<path>, ...]
	// 		-> []
	//
	// This is like .match(..) for non-pattern paths and paths ending 
	// with '/'; When patterns end with a non-pattern then match the 
	// basedir and add the basename to each resulting path...
	//
	// XXX should this be used by .get(..) instead of .match(..)???
	// XXX EXPERIMENTAL 
	resolve: async function(path, strict){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			path = module.path.split(path)
			// match basedir and addon basename to the result...
			var name = path[path.length-1]
			if(name 
					&& name != '' 
					&& !name.includes('*')){
				path.pop()
				path.push('')
				return (await this.match(path.join('/'), strict))
					.map(function(p){
						return module.path.join(p, name) }) } }
		// direct...
		return this.match(path, strict) },
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
	__get__: async function(key){
		return this.data[key] },
	get: async function(path, strict=false){
		var that = this
		//path = this.match(path, strict)
		path = await this.resolve(path, strict)
		return path instanceof Array ?
			// XXX should we return matched paths???
   			Promise.iter(path)
				.map(function(p){
					// NOTE: p can match a non existing page at this point, 
					// 		this can be the result of matching a/* in a a/b/c
					// 		and returning a a/b which can be undefined...
					return that.get(p) })
			: (await this.__get__(path) 
				// XXX NEXT
				?? ((this.next || {}).__get__ 
					&& this.next.__get__(path))) },

	//
	// 	Get metadata...
	// 	.metadata(<path>)
	// 		-> <metadata>
	// 		-> undefined 
	//
	//	Set metadata...
	//	.metadata(<path>, <data>[, <mode>])
	//	.update(<path>, <data>[, <mode>])
	//
	//	Delete metadata...
	//	.delete(<path>)
	//
	// NOTE: .metadata(..) is the same as .data but supports pattern paths 
	// 		and does not try to acquire a target page.
	// NOTE: setting/removing metadata is done via .update(..) / .delete(..)
	// NOTE: this uses .__get__(..) internally...
	metadata: async function(path, ...args){
		// set...
		if(args.length > 0){
			return this.update(path, ...args) }
		// get...
		path = await this.exists(path)
		return path 
			&& await this.__get__(path) 
			|| undefined },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	// NOTE: edit methods are local-only...
	//
	// XXX do we copy the data here or modify it????
	__update__: async function(key, data, mode='update'){
		this.data[key] = data },
	update: async function(path, data, mode='update'){
		var exists = await this.exists(path) 
		path = exists
			|| module.path.normalize(path, 'string')
		data = data instanceof Promise ?
			await data
			: data
		data = 
			typeof(data) == 'function' ?
				data
				: Object.assign(
					{
						__proto__: data.__proto__,
						ctime: Date.now(),
					},
					(mode == 'update' && exists) ?
						await this.get(path)
						: {},
					data,
					{mtime: Date.now()})
		await this.__update__(path, data, mode)
		return this },
	__delete__: async function(path){
		delete this.data[path] },
	delete: async function(path){
		path = await this.exists(path)
		path
			&& await this.__delete__(path)
		return this },


	// XXX NEXT might be a good idea to have an API to move pages from 
	// 		current store up the chain...


	// XXX do we need this???
	load: async function(...data){
		this.data = Object.assign(this.data, ...data)
		return this },
	json: function(asstring=false){
		// XXX
	},

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
	if(typeof(drop_cache) == 'function'){
		post = drop_cache
		drop_cache = false }
	return async function(path, ...args){
		var store = this.substore(path)

		var res = store == null ?
			object.parentCall(MetaStore, meth, this, path, ...args)
			//: this.data[store][meth](path.slice(store.length), ...args) 
			: this.data[store][target](path.slice(store.length), ...args) 

		if(drop_cache){
			delete this.__substores }
		post 
			&& (res = post.call(this, await res, store, path, ...args))
		return res} }


// XXX not sure about the name...
// XXX should this be a mixin???
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
	
	// XXX this depends on .data having keys...
	__paths__: async function(){
		var that = this
		var data = this.data
		//return Object.keys(data)
		return Promise.iter(Object.keys(data)
			.map(function(path){
				return object.childOf(data[path], module.BaseStore) ?
					data[path].paths()
						.iter()
						.map(function(s){
							return module.path.join(path, s) })
				: path }))
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

	json: function(asstring=false){
		// XXX
	},
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
			JSON.stringify(data) },
	__delete__: function(path){
		delete this.data[(this.__prefix__ ?? '')+ path] },

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

var fs = require('fs')
var glob = require('glob')

// XXX add monitor API...
// XXX backup files on write/delete...
// XXX do a r/o version...
var FileStore =
module.FileStore = {
	__proto__: BaseStore,

	// XXX
	__path__: 'store/fs',

	// XXX do we remove the extension???
	// XXX cache???
	__paths__: async function(){
		var that = this
		return new Promise(function(resolve, reject){
			glob(module.path.join(that.__path__, '/**/*'))
				.on('end', function(paths){
					resolve(paths
						.map(function(path){ 
							// XXX need better .__path__ removal...
							return path
								.slice(that.__path__.length) })) }) }) },
	__exists__: async function(path){
		return !!fs.existsSync(module.path.join(this.__path__, path)) ?
			path
			: false },
	__get__: async function(path){
		var p = module.path.join(this.__path__, path)
		var {atimeMs, mtimeMs, ctimeMs, birthtimeMs} = await fs.promises.stat(p)
		return {
			atime: atimeMs,
			mtime: mtimeMs,
			ctime: ctimeMs,
			text: fs.readFileSync(p).toString(),
		} },
	// XXX do we write all the data or only the .text???
	__update__: async function(path, data, mode='update'){
		var p = module.path.join(this.__path__, path)
		var f = await fs.promises.open(p, 'w')
		var size = await f.writeFile(data.text)
		f.close()
		// XXX check size...
		// XXX
	},
    __delete__: async function(path){
		var p = module.path.join(this.__path__, path)
		// XXX
	},
	load: function(data){
		// XXX
	},
	json: function(asstring=false){
		// XXX
	},
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 


// XXX 
module.PouchDB = undefined

var PouchDBStore =
module.PouchDBStore = {
	__proto__: BaseStore,

	__name__: 'pWiki-test-store',
	__key_prefix__: 'pwiki:',

	__data: undefined,
	get data(){
		if(!this.__data){
			var PouchDB = 
			module.PouchDB = 
				require('PouchDB')
			return (this.__data = new PouchDB(this.__name__)) }
		return this.__data },
	set data(value){
		this.__data = value },

	// XXX cache???
	__paths__: async function(){
		var that = this
		// XXX not sure if this is a good idea...
		return (await this.data.allDocs()).rows
			.map(function(e){ 
				return e.id.slice(that.__key_prefix__.length) }) },
	// XXX use an index...
	__exists__: async function(key){
		return !! await this.__get__(key) },
	__get__: async function(key){
		try{
			return await this.data.get(this.__key_prefix__ + key) 
		}catch(err){
			return undefined } },
	__update__: async function(key, data, mode='update'){
		var {_id, _rev, ...rest} = await this.__get__(key) ?? {}
		await this.data.put({
			// original data...
			...( (mode == 'update') ?
				rest
				: {}),
			// new data...
			...data,
			// system...
			_id: _id 
				?? (this.__key_prefix__ + key),
			...(_rev ? 
				{_rev} 
				: {}),
		})
		return this },
    __delete__: async function(key){
		var doc = await this.__get__(key)
		doc 
			&& (await this.data.remove(doc))
		return this },

// XXX overload...
//    .load(..)
}


//---------------------------------------------------------------------
// Page...

var relProxy = 
function(name){
	return function(path='.', ...args){
		return this.store[name](
			module.path.relative(this.location, path), 
			...args) } } 
var relMatchProxy = 
function(name){
	return function(path='.', strict=this.strict){
		if(path === true || path === false){
			strict = path
			path = '.' }
		return this.store[name](
			module.path.relative(this.location, path), 
			strict) } }

var __HANDLE_NAVIGATE =
module.__HANDLE_NAVIGATE = 
	types.event.EventCommand('HANDLE_NAVIGATE')

// XXX PATH_VARS
// XXX HISTORY do we need history management??? 
// XXX FUNC need to handle functions in store...
var BasePage =
module.BasePage = 
object.Constructor('BasePage', {
	// NOTE: this can be inherited...
	//store: undefined,
	
	// root page used to clone new instances via the .clone(..) method...
	//root: undefined,
	
	// Path variables...
	//
	// XXX PATH_VARS should these be here???
	// 		other places path variables can be resolved:
	// 			- navigation (below)
	// 			- macro expansion...
	// XXX EXPERIMENTAL...
	path_vars: {
		NOW: function(){
			return Date.now() },
		PATH: function(){
			return this.path },
		NAME: function(){
			return this.name },
		DIR: function(){
			return this.dir },
		//TITLE: function(){
		//	return this.title },

		/*/ XXX this needs:
		// 		- macro context...
		// 		- sort order...
		INDEX: function(context){
			return context.index },
		//*/
	},

	resolvePathVars: function(path, context={}){
		var that = this
		return Object.entries(this.path_vars)
			.reduce(function(res, [key, func]){
				return res
					.replace(
						new RegExp('(\\${'+key+'}|\\$'+key+')', 'g'), 
						func.call(that, context))
			}, path) },

	// page location...
	//
	// NOTE: path variables are resolved relative to the page BEFORE 
	// 		navigation...
	// NOTE: the actual work is done by the .onNavigate(..) method...
	__location: undefined,
	get location(){
		return this.__location ?? '/' },
	set location(path){
		// trigger the event...
		this.onNavigate(path) },
	// referrer -- a previous page location...
	referrer: undefined,

	// events...
	//
	// XXX revise naming...
	// XXX should this be able to prevent navigation???
	onBeforeNavigate: types.event.Event('beforeNavigate'),
	onNavigate: types.event.Event('navigate',
		function(handle, path){
			// special case: we are triggering handlers only...
			// NOTE: this usually means that we are setting .__location 
			// 		externally...
			// XXX HISTORY this is only used for history at this point...
			if(path === module.__HANDLE_NAVIGATE){
				handle()
				return }
			this.onBeforeNavigate(path)
			this.referrer = this.location
			var cur = this.__location = 
				this.resolvePathVars(
					module.path.relative(
						this.location, 
						path))
			//* XXX HISTORY...
			if(this.history !== false){
				this.history.includes(this.__location)
					&& this.history.splice(
						this.history.indexOf(this.__location)+1, 
						this.history.length)
				this.history.push(cur) } 
			// trigger handlers...
			handle() }),

	// .path is a proxy to .location
	// XXX do we need this???
	get path(){
		return this.location },
	set path(value){
		this.location = value },

	// XXX do we need this...
	get resolvedPath(){
		return this.match() },

	// XXX should these be writable???
	get name(){
		return module.path.split(this.path).pop() },
	//set name(value){ },
	get dir(){
		return module.path.relative(this.location, '..') },
	//set dir(value){ },
	get isPattern(){
		return this.location.includes('*') },

	// history...
	//
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
		this.onBeforeNavigate(this.path)
		this.referrer = this.location
		var path = this.__location = h[h.length-1 - p]
		this.onNavigate(module.__HANDLE_NAVIGATE, path)
		return this },
	forward: function(offset=1){
		return this.back(-offset) },
	//*/
	
	// store interface...
	//
	// XXX we are only doing modifiers here...
	// 		...these ar mainly used to disable writing in .ro(..)
	__update__: function(data){
		return this.store.update(this.location, data) },
	__delete__: function(path='.'){
		return this.store.delete(module.path.relative(this.location, path)) },

	// page data...
	//
	strict: undefined,
	get data(){
		// NOTE: we need to make sure each page gets the chance to handle 
		// 		its context....
		if(this.isPattern){
			return this
				.map(function(page){
					return page.data }) }
		// single page...
		var res = this.store.get(this.location, !!this.strict)
		return typeof(res) == 'function' ?
			res.bind(this)
			: res },
		//return this.store.get(this.location, !!this.strict) },
	set data(value){
		this.__update__(value) },

	// metadata...
	//
	// NOTE: in the general case this is the same as .data but in also allows
	// 		storing of data (metadata) for pattern paths...
	get metadata(){
		return this.store.metadata(this.location) },
	set metadata(value){
		this.__update__(value) },

	// number of matching pages...
	// NOTE: this can be both sync and async...
	get length(){
		var p = this.resolve(this.location)
		return p instanceof Array ?
				p.length
			: p instanceof Promise ?
				p.then(function(res){
					return res instanceof Array ?
						res.length
						: 1 })
			: 1 },

	// relative proxies to store...
	exists: relProxy('exists'), 
	find: relProxy('find'), 
	match: relMatchProxy('match'), 
	resolve: relMatchProxy('resolve'),
	delete: function(path='.'){
		return this.__delete__() },

	//
	// 	.get(<path>[, <data>])
	// 	.get(<path>, <strict>[, <data>])
	// 		-> <page>
	//
	get: function(path, strict, data={}){
		if(strict instanceof Object){
			data = strict
			strict = undefined }
		return this.clone({
				location: path, 
				...data,
				referrer: data.referrer 
					?? this.location,
				strict,
			}) },

	// XXX should this be an iterator???
	each: function(path){
		var that = this
		// NOTE: we are trying to avoid resolving non-pattern paths unless 
		// 		we really have to...
		path = path ?
			module.path.relative(this.path, path)
			: this.path
		//var paths = this.match(path)
		var paths = path.includes('*') ?
			this.resolve(path)
			: path
		paths = paths instanceof Array ? 
				paths 
			: paths instanceof Promise ?
				paths.iter()
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

	// sorting...
	//
	// XXX should this be page-level (current) store level???
	// XXX when this is async, should this return a promise????
	sort: async function(cmp){
		// not sorting single pages...
		if(this.length <= 1){
			return this }
		// sort...
		this.metadata = { order: await this.each()
			.sort(...arguments)
			.map(function(p){
				return p.path }) }
		return this },
	reverse: async function(){
		// not sorting single pages...
		if(this.length <= 1){
			return this }
		this.metadata = { order: (await this.match()).reverse() }
		return this },

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

	// Create a read-only page...
	//
	// NOTE: all pages that are created via a read-only page are also 
	// 		read-only.
	// XXX EXPERIMENTAL...
	ro: function(data={}){
		return Object.assign({
			__proto__: this,
			__update__: function(){ return this },
			__delete__: function(){ return this },
		},
		data) },

	// Create a virtual page at current path...
	//
	// Virtual pages do not affect store data in any way but behave like 
	// normal pages.
	//
	// NOTE: .get(..) / .clone(..) will return normal non-virtual pages
	// 		unless the target path is the same as the virtual page .path...
	// NOTE: changing .path/.location is not supported.
	// XXX EXPERIMENTAL...
	virtual: function(data={}){
		var that = this
		return {
			__proto__: this,
			// make the location read-only...
			get location(){
				// NOTE: since we are not providing this as a basis for 
				// 		inheritance we do not need to properly access 
				// 		the parent prop...
				// 		...otherwise use:
				// 			object.parentProperty(..)
				return this.__proto__.location },
			__update__: function(data){ 
				Object.assign(this.data, data)
				return this },
			__delete__: function(){ return this },
			// NOTE: we need to proxy .clone(..) back to parent so as to 
			// 		avoid overloading .data in the children too...
			// NOTE: we are also keeping all first level queries resolving 
			// 		to current path also virtual...
			clone: function(...args){
				var res = that.clone(...args) 
				return res.path == this.path ?
					that.virtual(this.data)
					: res },
			data: Object.assign(
				{
					ctime: Date.now(),
					mtime: Date.now(),
				},
				data),
		} },

	// XXX should this be update or assign???
	// XXX how should this work on multiple pages...
	// 		...right now this will write what-ever is given, even if it
	// 		will never be explicitly be accessible...
	// XXX sync/async???
	update: function(...data){
		return Object.assign(this, ...data) },

	__init__: function(path, referrer, store){
		// NOTE: this will allow inheriting .store from the prototype
		if(store){
			this.store = store }
		this.location = path
		this.referrer = referrer },
})

// pepper in event functionality...
types.event.EventMixin(BasePage.prototype)



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
			'<!--\\[pwiki\\[(?<uncomment>.*)\\]\\]-->',

			// <pwiki-comment> .. </pwiki-comment>
			'<\\s*pwiki-comment[^>]*>.*<\\/\\s*pwiki-comment\\s*>',
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
	parseArgs: function(spec, args, state){
		var that = this
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
	// NOTE: this internaly uses macros to check for propper nesting
	//group: function*(page, lex, to=false){
	group: function*(page, lex, to=false, parent){
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
	// 			filters: [
	// 				'<filter>'
	// 					| '-<filter>',
	// 				...
	// 			],
	// 			data: [ <item>, .. ],
	// 		}
	//
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
			// args...
			args = this.parseArgs.call(page,
				page.macros[name].arg_spec 
					?? [], 
				args,
				state)
			// call...
			var res = 
				await page.macros[name].call(page, args, body, state, value)
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
	// XXX add a special filter to clear pending filters... (???)
	parse: async function(page, ast, state={}){
		var that = this
		// XXX should we handle strings as input???
		ast = ast 
			?? this.expand(page, null, state)
		ast = typeof(ast) == 'string' ?
			this.expand(page, ast, state)
			: ast

		return ast
			// post handlers...
			.map(function(section){
				return typeof(section) == 'function' ? 
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
									/* XXX
									throw new Error(
										'.parse(..): unsupported filter: '+ filter) }
									/*/
									console.warn(
										'.parse(..): unsupported filter: '+ filter) 
									return res }
									//*/
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
// XXX should these be something more generic like Object.assign(..) ???

// XXX revise...
var Filter = 
module.Filter =
function(...args){
	var func = args.pop()
	args.length > 0
		&& Object.assign(func, args.pop())
	return func }

// XXX do we need anything else like .doc, attrs???
var Macro =
module.Macro = 
function(spec, func){
	var args = [...arguments]
	// function...
	func = args.pop()
	// arg sepc...
	;(args.length > 0 && args[args.length-1] instanceof Array)
		&& (func.arg_spec = args.pop())
	// XXX do we need anything else like .doc, attrs???
	return func }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

module.PAGE_NOT_FOUND = '404: PAGE NOT FOUND: $PATH'

// XXX PATH_VARS need to handle path variables...
// XXX filters (and macros?) should be features for simpler plugin handlng (???)
// XXX STUB filters...
var Page =
module.Page = 
object.Constructor('Page', BasePage, {
	// Filter that will isolate the page/include/.. from parent filters...
	ISOLATED_FILTERS: 'isolated',

	// list of macros that will get raw text of their content...
	QUOTING_MACROS: ['quote'],

	// templates used to render a page via .text
	PAGE_TPL: '_text',

	// NOTE: comment this out to make the system fail when nothing is 
	// 		resolved, not even the System/NotFound page...
	// NOTE: we can't use any of the page actions here (like @source(./path)) 
	// 		as if we reach this it's likely all the bootstrap is either also
	// 		not present or broken.
	// NOTE: to force the system to fail set this to undefined.
	PAGE_NOT_FOUND: module.PAGE_NOT_FOUND,

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
				// XXX
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
	// XXX ASYNC make these support async page getters...
	macros: {
		// 
		// 	<now/>
		//
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
			var local = Object.keys(args)
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
						// XXX async...
						//[...this.__parser__.expand(this, body, state)]
						this.__parser__.expand(this, body, state)
					: body instanceof Array ?
						body
					// NOTE: wrapping the body in an array effectively 
					// 		escapes it from parsing...
					: [body]
				filters = state.filters

				state.filters = outer_filters

				// parse the body after we are done expanding...
				return async function(state){
					var outer_filters = state.filters
					state.filters = this.__parser__.normalizeFilters(filters)
					var res =
						[...await this.parse(ast, state)]
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
		// XXX RECURSION recursion detection is still a bit off...
		// XXX 'text' argument is changed to 'recursive'...
		// XXX revise recursion checks.... 
		// XXX should this be lazy???
		include: Macro(
			['src', 'recursive', ['isolated']],
			async function(args, body, state, key='included', handler){
				var macro = 'include'
				if(typeof(args) == 'string'){
					var [macro, args, body, state, key="included", handler] = arguments }
				// positional args...
				var src = args.src
				var recursive = args.recursive || body
				var isolated = args.isolated 

				if(!src){
					return }
				// parse arg values...
				src = await this.parse(src, state)

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
				// recursion detected...
				// XXX RECURSION revise this...
				if(seen.includes(src)){
					if(!recursive){
						throw new Error(
							macro +': recursion detected: '
								+ seen.concat([src]).join(' -> ')) }
					// have the 'recursive' arg...
					return this.parse(recursive, state) }
				seen.push(src)

				// load the included page...
				var res = await handler.call(this)

				// restore previous include chain...
				if(parent_seen){
					state[key] = parent_seen
				} else {
					delete state[key] }

				return res }),
		source: Macro(
			['src'],
			async function(args, body, state){
				var src = args.src
				// parse arg values...
				src = src ? 
					await this.parse(src, state) 
					: src
				return this.macros.include.call(this, 
					'source',
					args, body, state, 'sources', 
					async function(){
						return await this.parse(await this.get(src).raw +'', state) }) }),
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
		quote: Macro(
			['src', 'filter', 'text'],
			async function(args, body, state){
				var src = args.src //|| args[0]
				var text = args.text 
					?? body 
					?? []
				// parse arg values...
				src = src ? 
					await this.parse(src, state)
					: src
				text = src ?
						// source page...
						await this.get(src).raw
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
					return text } }),
		// very similar to @filter(..) but will affect @quote(..) filters...
		'quote-filter': function(args, body, state){
			var filters = state.quote_filters = 
				state.quote_filters ?? []
			filters.splice(filters.length, 0, ...Object.keys(args)) },
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
		slot: Macro(
			['name', 'text', ['shown', 'hidden']],
			async function(args, body, state){
				var name = args.name
				var text = args.text 
					?? body 
					// NOTE: this can't be undefined for .expand(..) to work 
					// 		correctly...
					?? []

				var slots = state.slots = 
					state.slots 
						?? {}

				// parse arg values...
				name = name ?
					await this.parse(name, state)
					: name

				//var hidden = name in slots
				// XXX EXPERIMENTAL
				var hidden = 
					// 'hidden' has priority... 
					args.hidden
						// explicitly show... ()
						|| (args.shown ?
							false
							// show first instance...
							: name in slots)

				slots[name] = [...await this.__parser__.expand(this, text, state)]

				return hidden ?
					''
					: function(state){
						return state.slots[name] } }), 

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
		// NOTE: if both strict and nonstrict are given the later takes 
		// 		precedence.
		// XXX ELSE_PRIO should else attr take priority over the <else> tag???
		// 		...currently as with text=... the attr takes priority...
		// XXX SORT sorting not implemented yet....
		// XXX should support arrays...
		// 		e.g. 
		// 			<macro src="/test/*/resolved"> ... </macro>
		// 		...does not work yet...
		macro: Macro(
			['name', 'src', 'sort', 'text', 'join', 'else', ['strict', 'nonstrict']],
			async function(args, body, state){
				var that = this
				var name = args.name //?? args[0]
				var src = args.src
				var sort = (args.sort ?? '')
					.split(/\s+/g)
					.filter(function(e){ 
						return e != '' })
				// NOTE: args.text will need parsing...
				var text = args.text 
					?? body 
					?? []
				text = typeof(text) == 'string' ?
					[...this.__parser__.group(this, text+'</macro>', 'macro')]
					: text
				var strict = args.strict
					&& !args.nonstrict

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

				if(name){
					name = await this.parse(name, state)
					// define new named macro...
					if(text){
						;(state.macros = state.macros ?? {})[name] = text
					// use existing macro...
					} else if(state.macros 
							&& name in state.macros){
						text = state.macros[name] } }

				if(src){
					src = await this.parse(src, state)
					/* XXX ARRAY page...
					var pages = this.get(src, strict).each()
					/*/
					var pages = this.get(src, strict)
					pages = await pages.isArray ?
						// XXX should we wrap this in pages...
						(await pages.raw)
							.map(function(data){
								return that.virtual({text: data}) })
						: await pages.each()
					//*/
					// no matching pages -> get the else block...
					if(pages.length == 0 
							&& (text || args['else'])){
						var else_block = _getBlock('else')
						return else_block ?
							[...await this.__parser__.expand(this, else_block, state)]
							: undefined }

					// sort pages...
					// XXX SORT
					if(sort.length > 0){
						console.log('XXX: macro sort: not implemented')
					}

					var join_block = _getBlock('join') 
					// apply macro text...
					return Promise.iter(pages)
						.map(async function(page, i){
							//* XXX really ugly...
							var res = []
							for await (var c of that.__parser__.expand(page, text, state)){
								res.push(c) }
							if(join_block && i < pages.length-1){
								for await (var c of that.__parser__.expand(page, join_block, state)){
									res.push(c) } }
							return res
							/*/
							return [
								...await that.__parser__.expand(page, text, state),
								...((join_block && i < pages.length-1) ?
									await that.__parser__.expand(page, join_block, state)
									: []),
							] 
							//*/
						})
						.flat() } }),

		// nesting rules...
		'else': ['macro'],
		'join': ['macro'],
	},

	// events...
	//
	// NOTE: textUpdate event will not get triggered if text is updated 
	// 		directly via .data or .__update__(..)
	/*/ XXX EVENTS do we need this???
	onTextUpdate: types.event.Event('textUpdate',
		function(handle, text){
			this.__update__({text}) }),
	// XXX EVENTS not sure where to trigger this???
	// 		...on .parse(..) is a bit too granular, something like .text??
	// XXX not triggered yet...
	//onParse: types.event.Event('parse'),
	//*/

	// page parser...
	//
	__parser__: module.parser,
	parse: async function(text, state){
		var that = this
		// .parser(<state>)
		if(arguments.length == 1 
				&& text instanceof Object
				&& !(text instanceof Array)){
			state = text
			text = null }
		state = state ?? {}
		text = text 
			?? await this.raw
		return text instanceof Array ?
			Promise.iter(text)
				.map(function(text){
					return that.__parser__.parse(that, text, state) })
			: this.__parser__.parse(this, text, state) },

	// true if page has an array value but is not a pattern page...
	//
	// XXX the split into pattern and array pages feels a bit overcomplicated...
	// 		...can we merge the two and simplify things???
	// XXX EXPERIMENTAL
	get isArray(){ return (async function(){
		return !this.isPattern 
			// NOTE: we can't only use .data here as it can be a function 
			// 		that will return an array...
			&& await this.raw instanceof Array }).call(this) },

	// raw page text...
	//
	// NOTE: writing to .raw is the same as writing to .text...
	// NOTE: when matching multiple pages this will return a list...
	get raw(){ return (async function(){
		var that = this
		var data = await this.data
		// no data...
		// NOTE: if we hit this it means that nothing was resolved, 
		// 		not even the System/NotFound page, i.e. something 
		// 		went really wrong...
		if(data == null){
			var msg = (this.PAGE_NOT_FOUND 
					|| module.PAGE_NOT_FOUND)
				.replace(/\$PATH/, this.path)
			if(this.PAGE_NOT_FOUND){
				return msg }
			throw new Error(msg) }
		// get the data...
		return (
			// action...
			typeof(data) == 'function' ?
				data.call(this)
			// multiple matches...
			: data instanceof Array ?
				data
					.map(function(d){
						return typeof(d) == 'function'?
							d.call(that)
							: d.text })
					.flat()
   			: data.text )}).call(this) },
	set raw(value){
		this.__update__({text: value}) },
		//this.onTextUpdate(value) },

	// expanded page text...
	//
	// NOTE: this uses .PAGE_TPL to render the page.
	// NOTE: writing to .raw is the same as writing to .text...
	get text(){ return (async function(){
		var tpl = '/'+ await this.find('./'+ this.PAGE_TPL)
		return [await this.parse(
				tpl.endsWith(this.PAGE_TPL.split(/[\\\/]/).pop()) ?
					[await this.get(tpl).raw]
					: [] )]
			.flat()
			.join('\n') }).call(this) }, 
	set text(value){
		this.__update__({text: value}) },
		//this.onTextUpdate(value) },
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


var System = 
module.System = {
	// base templates...
	//
	_text: { 
		text: '<macro src="." join="\n">@source(.)</macro>' },
	NotFound: { 
		text: module.PAGE_NOT_FOUND
			.replace('$PATH', '@source(./path)') },

	// XXX tests...
	test_list: function(){
		return 'abcdef'.split('') },

	// metadata...
	//
	path: function(){
		return this.get('..').path },
	location: function(){
		return this.get('..').path },
	dir: function(){
		return this.get('..').dir },
	name: function(){
		return this.get('..').name },
	ctime: function(){
		return this.get('..').data.ctime },
	mtime: function(){
		return this.get('..').data.mtime },

	// XXX this can be a list for pattern paths...
	resolved: function(){
		return this.get('..').resolve() },

	title: function(){
		var p = this.get('..')
		return p.title 
			?? p.name },


	// utils...
	//
	// XXX System/subpaths
	// XXX
	links: function(){
		// XXX
		return '' },
	// XXX links to pages...
	to: function(){
		return (this.get('..').data || {}).to ?? [] },
	// XXX pages linking to us...
	'from': function(){
		return (this.get('..').data || {})['from'] ?? [] },


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
store.update('System', 
	Object.create(BaseStore).load(System))
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

// XXX for persistent stores test if the data is already loaded here...
store.load(require('./bootstrap'))


// XXX TEST...
// XXX add filter tests...
console.log('loading test page...')
pwiki
	.update({
		location: '/test/a',
		text: 'a',
	})
	.update({
		location: '/test/b',
		text: 'b',
	})
	.update({
		location: '/test/c',
		text: 'c',
	})
	.update({
		location: '/test/c/x',
		text: 'x',
	})
	.update({
		location: '/test/c/y',
		text: 'y',
	})
	.update({
		location: '/test/d/z',
		text: 'z',
	})
	.update({
		location: '/page',
		text: 'PAGE\n'
			+'\n'
			+'@include(/test recursive="Recursion type 2 (<now/>)")\n'
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
			+'Including /test: @include(/test recursive="Recursion type 1 (<now/>)")\n'
			+'\n'
			+'Including /page: @include(/page recursive="...")\n'
			+'\n'
			+'Including /: \\@include(/)\n'
			+'\n'
			+'@filter(test)',
	})
//*/





/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
