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

var pwpath = require('../path')


//---------------------------------------------------------------------
//
// - define (name, generate, merge)
// 		inline
// 		online
// - undefine (online)
// - enumerate/list
// - group operations:
// 		- update item
// 		- remove item
// 		- reset (cache)
//
//


//
//	makeIndexed(<name>, <generate>[, <options>])
//		-> <index-handler> 
//
//	Get merged data (cached)
//	<index-handler>()
//	<index-handler>('get')
//		-> <data>
//
//	Get local data (uncached)...
//	<index-handler>('local')
//		-> <data>
//
//	Clear cache...
//	<index-handler>('clear')
//		-> <data>
//
//	Reset cache (clear then get)...
//	<index-handler>('reset')
//		-> <data>
//
//	Run custom action...
//	<index-handler>(<action-name>), ...)
//		-> <data>
//
//
//
// Special methods:
//
// 	Special method to generate local <data>...
// 	.__<name>__()
// 		-> <data>
//
// 	Merge local data with other sources...
// 	.__<name>_merge__(<data>)
// 		-> <data>
//
// 	Handle custom action...
// 	.__<name>_<action-name>__(<data>. ...)
// 		-> <data>
//
//
//
// Special attributes:
//
// 	Cached data...
// 	.__<name>_cache / .<name>
//
//
var makeIndexed = 
function(name, generate, options={}){
	// XXX revise default...
	var cache = !!options.attr ?
		name
		: `__${name}_cache`
	var merge = `__${name}_merge__`
	var special = `__${name}__`

	// make local cache...
	var _make = function(){
		return this[special] != null ?
			this[special]()
			: generate.call(this) }
	// unwrap a promised value into cache...
	var _await = function(obj, val){
		if(val instanceof Promise){
			val.then(function(value){
				obj[cache] = value }) }
		return val }

	var meth
	return (meth = Object.assign(
		function(action='get', ...args){
			var that = this
			// clear/reset...
			if(action == 'clear' 
					|| action == 'reset'){
				delete this[cache] }
			// clear...
			if(action == 'clear'){
				return }
			// other actions...
			if(action != 'get' 
					&& action != 'reset'){
				var action_meth = `__${name}_${action}__`
				// generate cache if not available...
				var cur = cache in this ?
					this[cache]
					: meth.call(this, 'reset')
				return _await(this, this[cache] = 
					// NOTE: this[action_meth] will fully shadow options[action]...
					action_meth in this ?
						this[action_meth](cur, ...args)
					: (action in options 
							&& typeof(options[action]) == 'function') ?
						options[action].call(this, cur, ...args)
					: cur) }
			// get...
			return _await(this,
				// NOTE: this is intentionally not cached...
				action == 'local' ?
					_make.call(this)
				// get...
				: (this[cache] =
					// cached...
					this[cache] != null ?
						this[cache] 
					// generate + merge...
					: this[merge] != null ?
						this[merge](_make.call(this))
					// generate...
					: _make.call(this)) ) },
		{
			attr: name,
			indexed: true,
			options,
		})) }


var indexTest = 
module.indexTest =
{
	// XXX rename???
	get indexi(){
		var that = this
		return object.deepKeys(this)
			.filter(function(key){
				var d = object.values(that, key, true).next().value.value
				return typeof(d) == 'function' 
						&& d.indexed }) },
	
	index: async function(action='get', ...args){
		var that = this
		return Object.fromEntries(
			await Promise.all(
				this.indexi
					.map(async function(name){
						return [
							that[name].attr, 
							await that[name](action, ...args),
						] }))) },

	// tests...
	//
	moo: makeIndexed('moo', () => 123),

	foo_index: makeIndexed('foo', () => 123, {
		attr: true,
		add: function(cur, val){
			return cur + val },
	}),

	__boo_add__: function(cur, val){
		return cur + val },
	boo: makeIndexed('boo', () => 123),

	__soo_add__: async function(cur, val){
		return await cur + val },
	__soo: makeIndexed('soo', async () => 123),
	get soo(){
		return this.__soo() }

	// XXX need a way to link indexes...
	// 		Ex:
	// 			sum -> soo + boo + foo + moo
	// 			...changing any of the summed values should drop cache of sum
}




//---------------------------------------------------------------------


//
// 	cached(<name>, <update>[, ...<args>])
// 	cached(<name>, <get>, <update>[, ...<args>])
// 		-> <func>
//
// NOTE: in the first case (no <get>) the first <args> item can not be 
// 		a function...
//
// XXX better introspection???
var cached = 
module.cached =
function(name, get, update, ...args){
	name = `__${name}_cache`
	if(typeof(update) != 'function'){
		args.unshift(update)
		update = get
		get = null }
	return update instanceof types.AsyncFunction ?
		async function(){
			var cache = this[name] = 
				this[name] 
					?? await update.call(this)
			return get ?
				get.call(this, cache, ...arguments)
			: cache }
		: function(){
			var cache = this[name] = 
				this[name] 
					?? update.call(this)
			return get ?
				get.call(this, cache, ...arguments)
			: cache } }



//---------------------------------------------------------------------
// Store...

//
// API levels:
// 	Level 1 -- implementation API
// 		This level is the base API, this is used by all other Levels.
// 		This is the only level that needs to be fully overloaded by store 
// 		implementations (no super calls necessary).
// 		The base methods that need to be overloaded for the store to work:
// 			.__paths__()
// 				-> <keys>
// 			.__exists__(path, ..)
// 				-> <path>
// 				-> false
// 			.__get__(path, ..)
// 				-> <data>
// 		Optional for r/w stores:
// 			.__update__(path, ..)
// 			.__delete__(path, ..)
// 	Level 2 -- feature API
// 		This can use Level 1 and Level 2 internally.
// 		When overloading it is needed to to call the super method to 
// 		retain base functionality.
// 		All overloading here is optional.
// 			.paths()
// 				-> <path-list>
// 			.names()
// 				-> <name-index>
// 			.exists(<path>)
// 				-> <real-path>
// 				-> false
// 			.get(<path>)
// 				-> <data>
// 				-> undefined
// 			.metadata(<path>[, <data>])
// 				-> <store> -- on write
// 				-> <data>
// 				-> undefined
// 			.update(<path>, <data>)
// 				-> <store>
// 			.delete(<path>)
// 				-> <store>
// 			.load(..)
// 				-> <store>
// 			.json(..)
// 				-> <json>
// 	Level 3
// 		...
//
//
// To create a store adapter:
// 		- inherit from BaseStore
// 		- overload:
// 			.__paths__()
// 				-> <keys>
// 			.__exists__(path, ..)
// 				-> <path>
// 				-> false
// 			.__get__(path, ..)
// 				-> <data>
// 		- optionally (for writable stores)
// 			.__update__(path, ..)
// 			.__delete__(path, ..)
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
// XXX might be a good idea to split this into a generic store and a MemStore...
// XXX LEADING_SLASH should this be strict about leading '/' in paths???
// 		...this may lead to duplicate paths created -- '/a/b' and 'a/b'
// XXX should we support page symlinking???
// XXX async: not sure if we need to return this from async methods...
var BaseStore = 
module.BaseStore = {

	// XXX revise naming...
	next: undefined,

	onUpdate: types.event.Event('update'),
	onDelete: types.event.Event('delete'),

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

	// local paths...
	__paths: cached('paths', async function(){
		return this.__paths__() }),
	// NOTE: this produces an unsorted list...
	// XXX should this also be cached???
	paths: async function(local=false){
		return this.__paths()
			.iter()
			.concat((!local && (this.next || {}).paths) ? 
				this.next.paths() 
				: []) },
	// XXX BUG: after caching this will ignore the local argument....
	names: cached('names', async function(local=false){
		return this.paths(local)
			.iter()
			.reduce(function(res, path){
				var n = pwpath.basename(path)
				if(!n.includes('*')){
					(res[n] = res[n] ?? []).push(path) }
				return res }, {}) }),

	// XXX sort paths based on search order into three groups:
	// 		- non-system
	// 			...sorted by length?
	// 		- system 
	// 			...sort based on system search order?
	__sort_names: function(){},

	__cache_add: function(path){
		if(this.__paths_cache){
			this.__paths_cache.includes(path) 
				|| this.__paths_cache.push(path) }
		if(this.__names_cache){
			var name = pwpath.basename(path)
			var names = (this.__names_cache[name] = 
				this.__names_cache[name] 
					?? [])
			names.includes(path)
				|| names.push(path) }
		return this },
	__cache_remove: function(path){
		if(this.__paths_cache){
			var paths = this.__paths_cache
			paths.splice(
				paths.indexOf(
					paths.includes(path) ? 
						path
					: path[0] == '/' ?
						path.slice(1)
					: '/'+path),
				1) }
		if(this.__names_cache){
			var name = pwpath.basename(path)
			var names = (this.__names_cache[name] = 
				this.__names_cache[name] 
					?? [])
			var i = names.indexOf(path)
			i >= 0
				&& names.splice(i, 1)
			if(names.length == 0){
				delete this.__names_cache[name] } }
		return this },

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
		var {path, args} = 
			pwpath.splitArgs(
				pwpath.sanitize(path, 'string'))

		// NOTE: all paths at this point and in store are 
		// 		absolute, so we check both with the leading 
		// 		'/' and without it to make things a bit more 
		// 		relaxed and return the actual matching path...
		var res = await this.__exists__(path)
		// NOTE: res can be '' and thus we can't simply chain via || here...
		typeof(res) != 'string'
			&& (res = await this.__exists__('/'+ path))

		// delegate to .next...
		typeof(res) != 'string'
			&& (this.next || {}).__exists__
			&& (res = await this.next.__exists__(path))
		typeof(res) != 'string'
			&& (this.next || {}).__exists__
			&& (res = await this.next.__exists__('/'+path))

		if(typeof(res) != 'string'){
			return false }
		return pwpath.joinArgs(res, args) },
	// find the closest existing alternative path...
	// XXX CACHED....
	find: async function(path, strict=false){
		var {path, args} = pwpath.splitArgs(path)
		args = pwpath.joinArgs('', args)
		// build list of existing page candidates...
		var names = await this.names()
		var pages = new Set(
			pwpath.names(path)
				.map(function(name){
					return names[name] ?? [] })
				.flat())
		// select accessible candidate...
		for(var p of pwpath.paths(path, !!strict)){
			if(pages.has(p)){
				return p+args }
			p = p[0] == '/' ? 
				p.slice(1) 
				: '/'+p
			if(pages.has(p)){
				return p+args } } },
	/*/
	find: async function(path, strict=false){
		for(var p of pwpath.paths(path, !!strict)){
			if(p = await this.exists(p)){
				return p } } },
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
		var that = this
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var order = (this.metadata(path) ?? {}).order || []
			var {path, args} = pwpath.splitArgs(path)
			var all = args.all
			args = pwpath.joinArgs('', args)
			// NOTE: we are matching full paths only here so leading and 
			// 		trainling '/' are optional...
			var pattern = new RegExp(`^\\/?`
				+RegExp.quoteRegExp(
					// remove leading/trailing '/'
					path.replace(/^\/|\/$/g, ''))
					// pattern: **
					.replace(/\\\*\\\*/g, '(.*)')
					// pattern: *
					// NOTE: we are prepping the leading '.' of a pattern 
					// 		dir for hidden tests...
					.replace(/(^|\\\/+)(\\\.|)([^\/]*)\\\*/g, '$1$2($3[^\\/]*)')
				+'(?=[\\/]|$)', 'g')
			/*/ XXX CACHED....
			var name = pwpath.basename(path)
			return [...(name.includes('*') ?
						await this.paths()
						: await (this.names())[name])
			/*/
			return [...(await this.paths())
			//*/
					// NOTE: we are not using .filter(..) here as wee 
					// 		need to keep parts of the path only and not 
					// 		return the whole thing...
					.reduce(function(res, p){
						// skip metadata paths...
						if(p.includes('*')){
							return res }
						var m = [...p.matchAll(pattern)]
						m.length > 0
							&& (!all ?
								// test if we need to hide things....
								m.reduce(function(res, m){
									return res === false ?
										res
										: !/(^\.|[\\\/]\.)/.test(m[1])
								}, true)
								: true)
							&& (m = m[0])
							&& (!strict 
								|| m[0] == p) 
							&& res.add(
								// normalize the path elements...
								m[0][0] == '/' ? 
									m[0].slice(1) 
									: m[0])
						return res }, new Set())]
				.sortAs(order)
				.map(function(p){
					return p+args })}
		// direct search...
		return this.find(path, strict) },
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
	// basedir and add the basename to each resulting path, e.g.:
	// 		.match('/*/tree')
	// 			-> ['System/tree']
	// 		.resolve('/*/tree')
	// 			-> ['System/tree', 'Dir/tree', ...]
	//
	// XXX should this be used by .get(..) instead of .match(..)???
	// XXX EXPERIMENTAL 
	resolve: async function(path, strict){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var p = pwpath.splitArgs(path)
			var all = p.args.all
			var args = pwpath.joinArgs('', p.args)
			p = pwpath.split(p.path)
			var tail = []
			while(!p.at(-1).includes('*')){
				tail.unshift(p.pop()) }
			tail = tail.join('/')
			if(tail.length > 0){
				return (await this.match(
						p.join('/') + (all ? ':all' : ''), 
						strict))
					.map(function(p){
						all &&
							(p = p.replace(/:all/, ''))
						return pwpath.join(p, tail) + args }) } }
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
	get: async function(path, strict=false, energetic=false){
		var that = this
		path = pwpath.sanitize(path, 'string')
		var path = pwpath.splitArgs(path).path
		path = path.includes('*') 
			&& (energetic == true ?
				await this.find(path)
				: await this.isEnergetic(path))
			|| await this.resolve(path, strict)
		//*/
		return path instanceof Array ?
			// XXX should we return matched paths???
   			Promise.iter(path)
				.map(function(p){
					// NOTE: p can match a non existing page at this point, 
					// 		this can be the result of matching a/* in a a/b/c
					// 		and returning a a/b which can be undefined...
					return that.get(p, strict) })
			: (await this.__get__(path) 
				?? ((this.next || {}).__get__ 
					&& this.next.get(path, strict))) },

	// XXX EXPERIMENTAL...
	isEnergetic: async function(path){
		var p = await this.find(path)
		return !!(await this.get(p, true) ?? {}).energetic 
			&& p },

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
		path = pwpath.splitArgs(path).path
		// set...
		if(args.length > 0){
			return this.update(path, ...args) }
		// get...
		path = await this.exists(path)
		return path 
			&& (await this.__get__(path) 
				?? (this.next 
					&& await this.next.metadata(path)))
			|| undefined },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	// NOTE: edit methods are local-only...
	// NOTE: if .__update__ and .__delete__ are set to null/false this 
	// 		will quietly go into read-only mode...
	// XXX do we copy the data here or modify it????
	__update__: async function(key, data, mode='update'){
		this.data[key] = data },
	update: async function(path, data, mode='update'){
		// read-only...
		if(this.__update__ == null){
			return this }
		var exists = await this.exists(path) 
		path = exists
			|| pwpath.sanitize(path, 'string')
		path = pwpath.splitArgs(path).path
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
						await this.__get__(path)
						: {},
					data,
					{mtime: Date.now()})
		await this.__update__(path, data, mode)
		// XXX CACHED
		this.__cache_add(path)
		this.onUpdate(path)
		return this },
	__delete__: async function(path){
		delete this.data[path] },
	delete: async function(path){
		// read-only...
		if(this.__delete__ == null){
			return this }
		path = pwpath.splitArgs(path).path
		path = await this.exists(path)
		if(typeof(path) == 'string'){
			await this.__delete__(path)
			// XXX CACHED
			this.__cache_remove(path) 
			this.onDelete(path) }
		return this },

	// XXX NEXT might be a good idea to have an API to move pages from 
	// 		current store up the chain...

	// load/json protocol...
	//
	// The .load(..) / .json(..) methods have two levels of implementation:
	// 	- generic
	// 		uses .update(..) and .paths()/.get(..) and is usable as-is
	// 		in any store adapter implementing the base protocol.
	// 	- batch
	// 		implemented via .__batch_load__(..) and .__batch_json__(..) 
	// 		methods and can be adapter specific.
	//
	// NOTE: the generic level does not care about the nested stores 
	// 		and other details, as it uses the base API and will produce 
	// 		full and generic result regardless of actual store topology.
	// NOTE: implementations of the batch level need to handle nested 
	// 		stores correctly.
	// 		XXX not sure if we can avoid this at this stage...
	// NOTE: care must be taken with inheriting the batch protocol methods
	// 		as they take precedence over the generic protocol. It is 
	// 		recommended to either overload them or simply assign null or
	// 		undefined to them when inheriting from a non-base-store.
	//__batch_load__: function(data){
	//	// ...
	//	return this }, 
	load: async function(...data){
		var input = {}
		for(var e of data){
			input = {...input, ...e} }
		// batch loader (optional)...
		if(this.__batch_load__){
			this.__batch_load__(input)
		// one-by-one loader...
		} else {
			for(var [path, value] of Object.entries(input)){
				this.update(path, value) } }
		return this },
	// NOTE: this will not serialize functions...
	//__batch_json__: function(){
	//	// ...
	//	return json},
	json: async function(options={}){
		if(options === true){
			options = {stringify: true} }
		var {stringify, keep_funcs} = options
		// batch...
		if(this.__batch_json__){
			var res = this.__batch_json__(stringify)
		// generic...
		} else {
			var res = {}
			for(var path of await this.paths()){
				var page = await this.get(path) 
				if(keep_funcs 
						|| typeof(page) != 'function'){
					res[path] = page } } }
		return (stringify 
				&& typeof(res) != 'string') ?
			JSON.stringify(res, options.replacer, options.space)
			: res },
}



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
// Meta-Store
//
// Extends BaseStore to handle other stores as pages. i.e. sub-paths can 
// be handled by nested stores.
//

// XXX see inside...
var metaProxy = 
function(name, pre, post){
	var func = async function(path, ...args){
		path = pre ?
			await pre.call(this, path, ...args)
			: path

		var res
		var p = this.substore(path)
		if(p){
			// XXX can this be strict in all cases???
			var res = this.substores[p][name](
				path.slice(path.indexOf(p)+p.length),
				...args) }
		res = res 
			?? object.parentCall(MetaStore[name], this, ...arguments)

		return post ?
			post.call(this, await res, path, ...args)
			: res }
	Object.defineProperty(func, 'name', {value: name})
	return func }

// XXX not sure about the name...
// XXX should this be a mixin???
var MetaStore =
module.MetaStore = {
	__proto__: BaseStore,

	//
	// Format:
	// 	{
	// 		<path>: <store>,
	// 		...
	// 	}
	//
	substores: undefined,

	substore: function(path){
		path = pwpath.sanitize(path, 'string')
		if(path in (this.substores ?? {})){
			return path }
		var store = Object.keys(this.substores ?? {})
			// normalize store paths to the given path...
			.filter(function(p){
				return path.startsWith(p)
					// only keep whole path elements...
					// NOTE: this prevents matching 'a/b' with 'a/bbb', for example.
		   			&& (path[p.length] == null
						|| path[p.length] == '/'
						|| path[p.length] == '\\')})
			.sort(function(a, b){
				return a.length - b.length })
			.pop() 
		return store == path ?
			// the actual store is not stored within itself...
			undefined
			: store },
	getstore: function(path){
		return (this.substores ?? {})[this.substore(path)] },
	isStore: function(path){
		if(!this.substores){
			return false }
		path = pwpath.sanitize(path, 'string')
		// XXX do we need this???
		return !!this.substores[path]
			|| !!this.substores['/'+ path] },

	// NOTE: we are using level2 API here to enable mixing this with 
	// 		store adapters that can overload the level1 API to implement 
	// 		their own stuff...

	paths: async function(){
		var that = this
		var stores = await Promise.iter(
				Object.entries(this.substores ?? {})
					.map(function([path, store]){
						return store.paths()
								.iter()
								.map(function(s){
									return pwpath.join(path, s) }) }))
			.flat()
		return object.parentCall(MetaStore.paths, this, ...arguments)
			.iter()
			.concat(stores) },

	exists: metaProxy('exists',
		//async function(path){
		//	return this.resolve(path) },
		null,
		function(res, path){
			var s = this.substore(path)
			return typeof(res) != 'string' ?
					(this.next ?
						this.next.exists(path)
						: res)
					//res
				: s ?
					pwpath.join(s, res)
				: res }), 
	get: async function(path, strict=false){
		path = await this.resolve(path, strict) 
		if(path == undefined){
			return }
		var res
		var p = this.substore(path)
		if(p){
			res = await this.substores[p].get(
				path.slice(path.indexOf(p)+p.length),
				true) }
		return res 
			?? object.parentCall(MetaStore.get, this, ...arguments) },
	// XXX can't reach .next on get but will cheerfully mess things up 
	// 		on set (creating a local page)...
	// 		...should copy and merge...
	metadata: metaProxy('metadata'),
	// NOTE: we intentionally do not delegate to .next here...
	update: async function(path, data, mode='update'){
		data = data instanceof Promise ?
			await data
			: data
		// add substore...
		if(object.childOf(data, BaseStore)){
			path = pwpath.sanitize(path, 'string')
			;(this.substores = this.substores ?? {})[path] = data
			return this }
		// add to substore...
		var p = this.substore(path)
		if(p){
			this.substores[p].update(
				// trim path...
				path.slice(path.indexOf(p)+p.length),
				...[...arguments].slice(1))
			this.__cache_add(path)
			return this }
		// add local...
		return object.parentCall(MetaStore.update, this, ...arguments) },
	// XXX Q: how do we delete a substore???
	// XXX need to call .__cache_remove(..) here if we did not super-call...
	delete: metaProxy('delete'), 
}



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX not used...
var cacheProxy = function(name){
	var func = function(path, ...args){
		var cache = (this.root ?? this).cache
		return cache[path] 
			?? (cache[path] = 
				object.parentCall(CachedStore[name], this, ...arguments)) }
	Object.defineProperty(func, 'name', {value: name})
	return func }

// XXX should this be a level-1 or level-2???
// XXX make this a mixin...
// XXX add cache invalidation strategies...
// 		- timeout
// 		- count
// XXX BROKEN...
var CachedStore =
module.CachedStore = {
	__proto__: MetaStore,

	__cache: undefined,
	get cache(){
		return (this.__cache = this.__cache ?? {}) },
	set cache(value){
		this.__cache = value },

	clearCache: function(){
		this.cache = {} 
		return this },

	exists: async function(path){
		return (path in this.cache ?
				path
				: false)
			|| object.parentCall(CachedStore.exists, this, ...arguments) },
	// XXX this sometimes caches promises...
	get: async function(path){
		return this.cache[path] 
			?? (this.cache[path] = 
				await object.parentCall(CachedStore.get, this, ...arguments)) },
	update: async function(path, data){
		var that = this
		delete this.cache[path]
		var res = object.parentCall(CachedStore.update, this, ...arguments) 
		// re-cache in the background...
		res.then(async function(){
			that.cache[path] = await that.get(path) })
		return res },
	/* XXX
	metadata: async function(path, data){
		if(data){
			// XXX this is wrong -- get merged data...
			this.cache[path] = data
		 	return object.parentCall(CachedStore.metadata, this, ...arguments) 
		} else {
			return this.cache[path] 
				?? (this.cache[path] = 
					await object.parentCall(CachedStore.metadata, this, ...arguments)) } },
	//*/
	delete: async function(path){
		delete this.cache[path]
		return object.parentCall(CachedStore.delete, this, ...arguments) },
}



//---------------------------------------------------------------------

var Store =
module.Store =
	MetaStore
	//CachedStore



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
