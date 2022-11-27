/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var flexsearch = require('flexsearch')

var object = require('ig-object')
var types = require('ig-types')

var pwpath = require('../path')
var index = require('../index')


//---------------------------------------------------------------------

// XXX EXPERIMENTAL...
// XXX this will not work on nodejs...
// 		...possible solutions would be: 
// 			LevelDB
// 			indexeddb (npm)
// XXX see bugs/issues...
// XXX not sure if we need this... 
var JournalDB = 
module.JournalDB =
object.Constructor('JournalDB', {
	id: undefined,
	__version__: 1,

	__promisify: async function(req){
		return new Promise(function(resolve, reject){
			req.onsuccess = function(){
				resolve(req.result) }
			req.onerror = function(evt){
				reject(evt.error) } }) },

	__db: undefined,
	get db(){
		if(this.__db){
			return this.__db }

		var that = this
		var id = this.id

		if(id == null){
			throw new Error('JournalDB(..): need an id.') }
		if(typeof(indexedDB) == 'undefined'){
			throw new Error('JournalDB(..): indexedDB not supported.') }

		return new Promise(function(resolve, reject){
			var req = indexedDB.open(id, this.__version__)
			// setup/upgrade...
			req.onupgradeneeded = function(evt){
				var old = evt.oldVersion
				if(old > this.__version__){
					throw new Error(`JournalDB(..): stored version (${old}) newer than expected: ${this.__version__}`) }
				// setup/update...
				var db = that.__db = req.result
				switch(old){
					// setup...
					case 0:
						console.log('JournalDB.db: create.')
						var journal = db.createObjectStore('journal', {keyPath: 'date'})
						journal.createIndex('path', 'path')
					// update...
					case 1:
						// update code...
				} 
				resolve(db) }
			req.onversionchange = function(evt){
				// XXX close connections and reload...
				// 		...this means that two+ versions of code opened the 
				// 		same db and we need to reload the older versions...
				// XXX
			}
			req.onerror = function(evt){
				reject(evt.error) }
			req.onsuccess = function(evt){
				that.__db = req.result } }) },

	// XXX should these be props???
	// XXX should these be cached???
	get length(){ return async function(){
		return this.__promisify(
			(await this.db)
				.transaction('journal', 'readonly')
				.objectStore('journal')
					.count()) }.call(this) },
	get paths(){ return async function(){
		return (await this.slice())
			.map(function(elem){ 
				return elem.path }) 
			.unique() }.call(this) },

	// get entries by time...
	slice: async function(from=0, to=Infinity){
		return this.__promisify(
			(await this.db)
				.transaction('journal', 'readonly')
				.objectStore('journal')
					.getAll(IDBKeyRange.bound(
						from ?? 0, 
						to ?? Infinity,
						true, true))) },
	// get entries by path...
	path: async function(path){
		return this.__promisify(
			(await this.db)
				.transaction('journal', 'readonly')
				.objectStore('journal')
				.index('path')
					.getAll(...arguments)) },
	
	//
	// 	<journal-db>.add(<path>, <action>, ...)
	// 		-> <promise>
	//
	add: async function(path, action, ...data){
		return this.__promisify(
			(await this.db)
				.transaction('journal', 'readwrite')
				.objectStore('journal')
					.add({
						// high-resolution date...
						date: Date.hires(),
						path,
						action,
						data,
					})) },

	// remove entries up to date...
	trim: async function(to){
		return this.__promisify(
			(await this.db)
				.transaction('journal', 'readwrite')
				.objectStore('journal')
					.delete(IDBKeyRange.upperBound(to ?? 0, true))) },
	// clear journal...
	// XXX BUG? for some reason .deleteDatabase(..) does not actually delete 
	// 		the database until a reload thus messing up the db creation 
	// 		process (as the .onversionchange event is not triggered)...
	clear: function(){
		indexedDB.deleteDatabase(this.id) 
		delete this.__db },

	//
	// 	JournalDB(<id>)
	// 		-> <journal-db>
	//
	__init__: function(id){
		var that = this
		this.id = id ?? this.id
		this.db },
})



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
// 			.paths
// 				-> <path-list>
// 			.names
// 				-> <name-index>
//
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
// 		- .paths
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


	// NOTE: .data is not part of the spec and can be implementation-specific,
	// 		only .__<name>__(..) use it internally... (XXX check this)
	__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data = {}) },
	set data(value){
		this.__data = value },

	__cache_path__: '.cache',
	// XXX not sure if it is better to set these here or use index.IndexManagerMixin(..)
	get index_attrs(){
		return [...index.iter(this)] },
	index: async function(action='get', ...args){
		return index.index(this, ...arguments) },

	//
	// Format:
	// 	[
	// 		<path>,
	// 		...
	// 	]
	//
	__paths__: async function(){
		return Object.keys(this.data) },
	__paths_merge__: async function(data){
		return (await data)
			.concat((this.next 
					&& 'paths' in this.next) ?
				await this.next.paths
				: []) 
			.unique() },
	__paths_isvalid__: function(t){
		var changed = 
			!!this.__paths_next_exists != !!this.next
				|| (!!this.next 
					&& this.next.__paths_modified > t)
		this.__paths_next_exists = !this.next
		return changed },
	__paths: index.makeIndex('paths', {
		update: async function(data, name, path){
			data = await data
			// XXX normalize???
			data.includes(path)
				|| data.push(path)
			return data }, 
		remove: async function(data, name, path){
			data = await data
			// XXX normalize???
			data.includes(path)
				&& data.splice(data.indexOf(path), 1)
			return data }, }),
	// XXX should this clone the data???
	// XXX should we use 'lazy'???
	get paths(){
		return this.__paths() },

	//
	// Format:
	// 	{
	// 		<name>: [
	// 			<path>,
	// 			...
	// 		],
	// 		...
	// 	}
	//
	__names_isvalid__: function(t){
		return this.__paths_isvalid__(t) },
	// NOTE: this is built from .paths so there is no need to define a 
	// 		way to merge...
	__names: index.makeIndex('names', 
		async function(){
			var update = this.__names.options.update
			var index = {}
			for(var path of (await this.paths)){
				index = update.call(this, index, 'names', path) }
			return index }, {
		update: async function(data, name, path){
			data = await data
			// XXX normalize???
			var n = pwpath.basename(path)
			if(!n.includes('*') 
					&& !(data[n] ?? []).includes(path)){
				(data[n] = data[n] ?? []).push(path) }
			return data },
		remove: async function(data, name, path){
			data = await data
			// XXX normalize???
			var n = pwpath.basename(path)
			if(!(n in data)){
				return data }
			data[n].includes(path)
				&& data[n].splice(data[n].indexOf(path), 1)
			data[n].length == 0
				&& (delete data[n])
			return data }, }),
	// XXX should this clone the data???
	// XXX should we use 'lazy'???
	get names(){
		return this.__names() },

	// XXX tags
	//
	// Format:
	// 	{
	// 		tags: {
	// 			<tag>: Set([
	// 				<path>,
	// 				...
	// 			]),
	// 			...
	// 		},
	// 		paths: {
	// 			<path>: Set([
	// 				<tag>,
	// 				...
	// 			]),
	// 			...
	// 		}
	// 	}
	//
	// XXX should this be here???
	parseTags: function(str){
		return str
			.split(/\s*(?:([a-zA-Z1-9_-]+)|"(.+)"|'(.+)')\s*/g)
			.filter(function(t){
				return t 
					&& t != '' 
					&& t != ',' }) },
	// XXX do we need these???
	// 		...the question is if we have .__tags__(..) how do we 
	// 		partially .__tags_merge__(..) things???
	//__tags__: function(){ },
	//__tags_merge__: function(data){ },
	__tags_isvalid__: function(t){
		return this.__paths_isvalid__(t) },
	__tags: index.makeIndex('tags', 
		async function(){
			// load index...
			var path = this.__cache_path__ +'/tags_index'
			if(this.__cache_path__ 
					&& await this.exists(path)){
				return this.__tags.options.load.call(this, null, 'tags')
			// generate...
			} else {
				var index = {tags: {}, paths: {}}
				var update = this.__tags.options.update
				for(var path of (await this.paths)){
					index = update.call(this, index, 'tags', path, await this.get(path)) }
				return index } }, {
		update: async function(data, name, path, update){
			/*/ XXX CACHE_INDEX...
			// do not index cache...
			if(this.__cache_path__ 
					&& path.startsWith(this.__cache_path__)){
				return data }
			//*/
			// remove obsolete tags...
			data = await this.__tags.options.remove.call(this, data, name, path)
			// add...
			var {tags, paths} = data
			paths[path] = new Set(update.tags)
			for(var tag of update.tags ?? []){
				;(tags[tag] = 
						tags[tag] ?? new Set([]))
					.add(path) }
			return data }, 
		remove: async function(data, name, path){
			data = await data
			if(!data){
				return data }
			var {tags, paths} = data
			for(var tag of paths[path] ?? []){
				tags[tag].delete(path) }
			return data }, 
		// XXX EXPERIMENTAL...
		save: async function(data, name){
			if(this.__cache_path__){
				this.update(
					this.__cache_path__ +'/'+ name+'_index',
					{index: data})}
			return data },
		load: async function(data, name){
			if(this.__cache_path__){
				var path = this.__cache_path__ +'/'+ name+'_index'
				var {index} = await this.get(path) ?? {}
				return index ?? data }
			return data }, 
		reset: function(_, name){
			this.__cache_path__
				&& this.delete(this.__cache_path__ +'/'+ name+'_index') }, }),
	get tags(){
		return this.__tags() },

	relatedTags: function*(...tags){
		var cur = new Set(tags)
		var {tags, paths} = this.tags 
		var seen = new Set()
		for(var tag of cur){
			for(var p of tags[tag] ?? []){
				for(var t of paths[p] ?? []){
					if(!seen.has(t) 
							&& !cur.has(t)){
						seen.add(t)
						yield t } } } } },


	// XXX text search index (???)
	// XXX do we index .data.text or .raw or .text
	// XXX should we have separate indexes for path, text and tags or 
	// 		cram the three together?
	// XXX need to store this...
	/* XXX
	__search_options: {
		preset: 'match',
		tokenize: 'full',
	},
	//*/
	__search: index.makeIndex('search',
		// XXX do a load if present...
		async function(){
			// load index...
			var path = this.__cache_path__ +'/search_index'
			if(this.__cache_path__ 
					&& await this.exists(path)){
				return this.__search.options.load.call(this, null, 'search')
			// generate...
			} else {
				var index = new flexsearch.Index(
					this.__search_options 
						?? {}) 
				var update = this.__search.options.update
				for(var path of (await this.paths)){
					update.call(this, index, 'search', path, await this.get(path)) }
				return index } }, {
		update: async function(data, name, path, update){
			/*/ XXX CACHE_INDEX...
			// do not index cache...
			if(this.__cache_path__ 
					&& path.startsWith(this.__cache_path__)){
				return data }
			//*/
			var {text, tags} = update
			text = [
				'',
				path,
				(text 
						&& typeof(text) != 'function') ?
					text
					: '',
				tags ?
					'#'+ tags.join(' #')
					: '',
			].join('\n\n')
			;(await data)
				.add(path, text) 
			// handle changes...
			//this.__search.options.__save_changes.call(this, name, 'update', path, update)
			return data },
		remove: async function(data, name, path){
			data = await data
			data 
				&& data.remove(path) 
			// handle changes...
			//this.__search.options.__save_changes.call(this, name, 'remove', path)
			return data }, 
		// XXX EXPERIMENTAL...
		// XXX for this to work need to figure out how to save a page 
		// 		without triggering an index update...
		// 		...and do it fast!!
		__save_changes: async function(name, action, path, ...args){
			if(this.__cache_path__ 
					&& !path.startsWith(this.__cache_path__)){
				var p = [this.__cache_path__, name+'_index', 'changes'].join('/')
				// XXX can we get/update in one op???
				var {changes} = await this.get(p) ?? {}
				changes = changes ?? []
				changes.push([Date.now(), action, path, ...args])
				// XXX this needs not to neither trigger handlers nor .index('update', ...)...
				return this.__update(p, {changes}, 'unindexed') } },
		save: async function(data, name){
			if(this.__cache_path__){
				var that = this
				var path = this.__cache_path__ +'/'+ name+'_index'
				//this.delete(path +'/changes')
				// XXX HACK this thing runs async but does not return a promise...
				// 		...this is quote ugly but I can't figure out a way to 
				// 		track when exporting is done...
				var index = {}
				data.export(
					function(key, value){
						index[key] = value
						return that.update(path, {index}) }) }
				/*/
				var index = {}
				data.export(
					function(key, value){
						index[key] = value })
				this.update(path, {index}) }
				//*/
			return data },
		load: async function(data, name){
			if(this.__cache_path__){
				var path = this.__cache_path__ +'/'+ name+'_index'
				var changes = path +'/changes'
				var {index} = await this.get(path) ?? {}
				var data = 
					new flexsearch.Index(
						this.__search_options 
							?? {}) 
				for(var [key, value] of Object.entries(index ?? {})){
					data.import(key, value) } }
			return data }, 
		reset: function(_, name){
			this.__cache_path__
				&& this.delete(this.__cache_path__ +'/'+ name+'_index') }, }),
	search: function(...args){
		var s = this.__search()
		return s instanceof Promise ?
			s.then(function(s){
				return s.search(...args)})
			: s.search(...args) },


	// XXX EXPERIMENTAL...
	// This keeps the changes between saves...
	//
	// XXX see issues with indexedDB...
	// XXX not sure if we need this...
	// XXX need a persistent fast store of changes...
	//__journal_id__: 'pWiki:test-journal',
	__journal_db: undefined,
	__journal: index.makeIndex('journal',
		function(){
			// XXX stub...
			var journal = this.__journal_db = 
				this.__journal_db 
					?? (this.__journal_id__ ?
						JournalDB(this.__journal_id__)
						: undefined)
			return journal ?
				journal.slice()
				: [] }, {

		'__call__': function(data, name, from, to){
			if(typeof(from) == 'object'){
				var {from, to} = from }
			var _get = function(data){
				return data
					.filter(function(elem){
						return (!from 
								|| elem[0] > from) 
							&& (!to 
								|| elem[0] <= to)}) }
			return data instanceof Promise ?
				data.then(_get)
				: _get(data) },

		// XXX these need to be persistent...
		update: async function(data, name, path, update){
			var date = this.__journal_db ?
				this.__journal_db.add(path, 'update', update)
				: Date.now()
			data = await data
			// XXX need to reuse the actual date...
			data.push([Date.now(), 'update', path, update])
			return data },
		remove: async function(data, name, path){
			var date = this.__journal_db ?
				this.__journal_db.add(path, 'update', update)
				: Date.now()
			data = await data
			// XXX need to reuse the actual date...
			data.push([Date.now(), 'remove', path])
			return data }, 

		save: async function(data, name){
			this.__journal_db
				&& this.__journal_db.clear()
			return [] },
		// XXX if .__journal_db is not empty then need to apply it to the index???
		load: async function(data, name){
			// XXX
			return data }, 

		reset: function(data, name){
			this.__journal_db
				&& this.__journal_db.clear()
			return [] }, }),
	journal: function(){
		return this.__journal('__call__', ...arguments)},
	//*/



	//
	// 	.exists(<path>)
	// 		-> <normalized-path>
	// 		-> false
	//
	// XXX INDEXED...
	exists: async function(path){
		var {path, args} = 
			pwpath.splitArgs(
				pwpath.sanitize(path, 'string'))
		//return new Set(await this.paths).has(path) ?
		//return (await this.paths).indexOf(path) != -1 ?
		return (await this.paths).includes(path) ?
			pwpath.joinArgs(path, args)
			: undefined },
	/*/
	__exists__: async function(path){
		return path in this.data
				&& path },
	// XXX might be a good idea to cache this...
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
	//*/
	
	// XXX EXPERIMENTAL...
	//
	//	.sort(<pattern>, <by>, ..)
	//	.sort([<path>, ..], <by>, ..)
	//		-> <paths>
	//		-> <promise(paths)>
	//
	//	<by> ::=
	//		'path'
	//		| 'location'
	//		| 'dir'
	//		| 'name'
	//		| 'title'
	//		| 'depth'
	//		| 'number'
	//		| <attr>
	//		| <cmp-func>
	//
	//
	// NOTE: to reverse search order prepend '-' to method name, e.g. cahnge 
	// 		'path' to '-path', etc.
	// NOTE: all path based <by> values are sync, not requireing a .gat(..) 
	// 		and thus faster than sorting via arbitrary <attr>...
	// NOTE: this performs a natural sort, i.e. numbers in strings are 
	// 		treated as numbers and not as strings of characters making
	// 		"page2" precede "page10".
	__sort_method__: {
		// NOTE: path/location are special cases as they do not transform 
		// 		the path -- they are hard-coded in .sort(..)...
		//path: function(p){ return p },
		//location: function(p){ return p },
		dir: pwpath.dirname.bind(pwpath),
		name: pwpath.basename.bind(pwpath),
		title: function(p){
			return pwpath.decodeElem(
				pwpath.basename(p)) },
		depth: function(p){
			return pwpath.split(p).length },
		// XXX not sure if this is needed...
		//number: function(p){
		//	return p
		//		.split(/[^\d]+/g)
		//		.join(' ') },
	},
	sort: function(paths, ...by){
		var that = this
		paths = 
			(paths.includes('*') 
					|| paths.includes('**')) ?
				this.match(paths).iter()
				: paths
		// natural compare arrays...
		var nsplit = function(e){
			return typeof(e) == 'string' ?
				e.split(/(\d+)/g)
					.map(function(e){
						var i = parseInt(e)
						return isNaN(i) ?
							e
							: i }) 
				: e }
		var ncmp = function(a, b){
			// skip the equal part...
			var i = 0
			while(a[i] != null 
					&& b[i] != null 
					&& a[i] == b[i]){ 
				i++ }
			return (a[i] == null 
						&& b[i] == null) ?
					0
				: (a[i] == null 
						|| a[i] < b[i]) ?
					-1
				: (b[i] == null
						|| a[i] > b[i]) ?
					1
				: 0 }
		var _async = false
		return paths
			// pre-fetch and prep all the needed data...
			// XXX we can try and make this lazy and only get the data 
			// 		we need when we need it (in sort)...
			// 		...not sure if this is worth it...
			.map(function(p, i){
				var d
				var res = []
				// NOTE: this is the first and only instance so far where 
				// 		using let is simpler than doing this below:
				// 			function(cmp){
				//				return (d = d ?? that.get(p))
				//					.then(function(data){
				//						return data[cmp] }) }.bind(this, cmp)
				//		..still not sure if this is worth the special case...
				for(let cmp of by){
					cmp = 
						// ignore '-'/reverse
						(typeof(cmp) == 'string' 
								&& cmp[0] == '-') ?
							cmp.slice(1)
							: cmp
					res.push(
						nsplit(
							(cmp == 'path' 
									|| cmp == 'location') ? 
								p
							: cmp in that.__sort_method__ ?
								that.__sort_method__[cmp].call(that, p)
							// async attr...
							: typeof(cmp) == 'string' ?
								// NOTE: we only get page data once per page...
								(d = d ?? that.get(p))
									.then(function(data){
										return data[cmp] })
							: null)) }
				_async = _async || !!d
				return d ?
					// wait for data to resolve...
					Promise.all([p, i, Promise.all(res)])
					: [p, i, res] })
			// NOTE: if one of the sort attrs is async we need to wrap the 
			// 		whole thing in a promise...
			.run(function(){
				return _async ?
					Promise.all(this).iter() 
					: this })
			.sort(function([a, ia, ca], [b, ib, cb]){
				for(var [i, cmp] of by.entries()){
					var res =
						typeof(cmp) == 'string' ?
							((ca[i] == null 
									&& cb[i] == null) ?
								0
							// natural cmp...
							: (ca[i] instanceof Array 
									&& cb[i] instanceof Array) ?
								ncmp(ca[i], cb[i])
							: ca[i] instanceof Array ?
								ncmp(ca[i], [cb[i]])
							: cb[i] instanceof Array ?
								ncmp([ca[i]], cb[i])
							// normal indexed cmp...
							: (cb[i] == null 
									|| ca[i] < cb[i]) ?
								-1
							: (ca[i] == null 
									|| ca[i] > cb[i]) ?
								1
							: 0)
						: typeof(cmp) == 'function' ?
							cmp(a, b)
						: 0
					// reverse...
					res = cmp[0] == '-' ?
						res * -1
						: res
					// got a non equal...
					if(res != 0){
						return res } }
				// keep positions if all comparisons are equal...
				return ia - ib }) 
			.map(function([p]){
				return p }) },

	// find the closest existing alternative path...
	find: async function(path, strict=false){
		var {path, args} = pwpath.splitArgs(path)
		args = pwpath.joinArgs('', args)
		// build list of existing page candidates...
		var names = await this.names
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
	// Handled path arguments:
	// 		all
	// 		sort=<methods>
	// 		sortnewlast (default)
	// 		sortnewfirst
	//
	__match_args__: {
		//
		//	<tag-name>: function(value, args){
		//		// setup state if needed and pre-check...
		//		// ...
		//		return no_check_needed ?
		//			false
		//			// path predicate...
		//			: function(path){
		//				if( path_matches ){
		//					return true } } },
		//
		// NOTE: handlers are run in order of definition.
		//
		tags: async function(tags){
			tags = typeof(tags) == 'string' ?
				this.parseTags(tags)
				: false
			tags && await this.tags
			return tags 
				&& function(path){
					// tags -> skip untagged pages...
					var t = this.tags.paths[path]
					if(!t){
						return false }
					for(var tag of tags){
						if(!t || !t.has(tag)){
							return false } } 
					return true } },
		search: async function(search){
			search = search 
				&& new Set(await this.search(search))
			return search instanceof Set
				&& function(path){
					// nothing found or not in match list...
					if(search.size == 0 
							|| !search.has(path)){
						return false } 
					return true } },
		// XXX EXPERIMENTAL...
		// XXX add page/page-size???
		offset: function(offset){
			offset = parseInt(offset)
			return !!offset
				&& function(path){
					offset--
					return !(offset >= 0) } },
		count: function(count){
			count = parseInt(count)
			return !!count
				&& function(path){
					count--
					return !!(count >= 0) } },
	},
	__match_args: async function(args){
		var that = this
		var predicates = []
		for(var [key, gen] of Object.entries(this.__match_args__ ?? {})){
			var p = await gen.call(this, args[key], args)
			p && predicates.push(p) }
		return predicates.length > 0 ?
			function(path){
				for(var p of predicates){
					if(!p.call(that, path)){
						return false } }
				return true }
			: undefined },
	match: async function(path, strict=false){
		var that = this
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var {path, args} = pwpath.splitArgs(path)
			path = pwpath.sanitize(path)

			var all = args.all
			var sort = args.sort
			var newlast = 
				args.sortnewlast 
					?? !(args.sortnewfirst 
						// default is sortnewlast...
						?? false)
			var test = await this.__match_args(args)
			args = pwpath.joinArgs('', args)

			var order = (await this.metadata(path) ?? {}).order || []

			// NOTE: we are matching full paths only here so leading and 
			// 		trainling '/' are optional...
			var pattern = new RegExp(`^\\/?`
				+RegExp.quoteRegExp(path)
					// pattern: **
					.replace(/\\\*\\\*/g, '(.*)')
					// pattern: *
					// NOTE: we are prepping the leading '.' of a pattern 
					// 		dir for hidden tests...
					.replace(/(^|\\\/+)(\\\.|)([^\/]*)\\\*/g, '$1$2($3[^\\/]*)')
				+'(?=[\\/]|$)', 'g')
			return [...(await this.paths)
					// NOTE: we are not using .filter(..) here as wee 
					// 		need to keep parts of the path only and not 
					// 		return the whole thing...
					.reduce(function(res, p){
						// skip metadata paths...
						if(p.includes('*')){
							return res }
						// check path: stage 1
						var m = [...p.matchAll(pattern)]
						var visible = m.length > 0
							&& (!all ?
								// test if we need to hide things....
								m.reduce(function(res, m){
									return res === false ?
										res
										: !/(^\.|[\\\/]\.)/.test(m[1])
								}, true)
								: true)
						// args...
						// NOTE: this needs to be between path checking 
						// 		stages as we need to skip paths depending 
						// 		on the all argument...
						if(visible 
								&& test 
								&& !test(p)){
							return res }
						// check path: stage 2
						visible
							&& (m = m[0])
							&& (!strict 
								|| m[0] == p) 
							&& res.add(
								// normalize the path elements...
								m[0][0] == '/' ? 
									m[0].slice(1) 
									: m[0])
						return res }, new Set())]
				// handle live sort...
				.run(function(){
					return (sort && sort !== true) ?
						that
							.sort(this, ...sort.split(/\s*[,\s]+/g))
						:this
							.sortAs(order, 
								newlast ? 
									'head' 
									: 'tail') })
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
	resolve: async function(path, strict){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var p = pwpath.splitArgs(path)
			var args = pwpath.joinArgs('', p.args)
			p = pwpath.split(p.path)
			var tail = []
			while(!p.at(-1).includes('*')){
				tail.unshift(p.pop()) }
			tail = tail.join('/')
			if(tail.length > 0){
				return (await this.match(
						p.join('/') + args, 
						strict))
					.map(function(p){
						var {path, args} = pwpath.splitArgs(p)
						return pwpath.joinArgs(pwpath.join(path, tail), args) }) } }
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
	__get__: function(key){
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
				?? ((this.next || {}).get 
					&& this.next.get(path, strict))) },

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
	//
	//	Unindexed update...
	//	.__update(<path>, <data>, 'unindexed')
	//	.__update(<path>, <data>, 'unindexed', <mode>)
	//		-> <data>
	//
	__update: async function(path, data, mode='update'){
		// handle unindexed mode...
		var index = true
		if(mode == 'unindexed'){
			index = false
			mode = arguments[3] 
				?? 'update' }
		// read-only...
		if(this.__update__ == null){
			return data }
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
		index
			&& this.index('update', path, data, mode)
		return data },
	// XXX can we do a blanket .index('update', ...) here??
	// 		...currently this will mess up caches between .next/.substores 
	// 		and the top level store to an inconsistent state...
	// 		...this could be a sign of problems with index -- needs more 
	// 		tought...
	update: types.event.Event('update', 
		async function(handler, path, data, mode='update'){
			handler(false)
			var res = await this.__update(...[...arguments].slice(1)) 
			handler()
			return this }),

	__delete__: async function(path){
		delete this.data[path] },
	__delete: async function(path, mode='normal'){
		// read-only...
		if(this.__delete__ == null){
			return this }
		path = pwpath.splitArgs(path).path
		path = await this.exists(path)
		if(typeof(path) == 'string'){
			await this.__delete__(path)
			this.index('remove', path) }
		return this },
	delete: types.event.Event('delete', 
		async function(handler, path){
			handler(false)
			var res = await this.__delete(path) 
			handler()
			return res }),

	// XXX NEXT might be a good idea to have an API to move pages from 
	// 		current store up the chain...

	// load/json protocol...
	//
	// The .load(..) / .json(..) methods have two levels of implementation:
	// 	- generic
	// 		uses .update(..) and .paths/.get(..) and is usable as-is
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
				//this.__update(path, value) } }
		return this },
	// NOTE: this will not serialize functions...
	//__batch_json__: function(){
	//	// ...
	//	return json },
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
			for(var path of await this.paths){
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

	// XXX INDEX...
	__paths_merge__: async function(data){
		var that = this
		var stores = await Promise.iter(
				Object.entries(this.substores ?? {})
					.map(function([path, store]){
						return store.paths
								.iter()
								.map(function(s){
									return pwpath.join(path, s) }) }))
			.flat()
		return object.parentCall(MetaStore.__paths_merge__, this, ...arguments)
			.iter()
			.concat(stores) },
	__paths_isvalid__: function(t){
		if(this.substores){
			// match substore list...
			var cur = Object.keys(this.substores ?? {})
			var prev = this.__paths_substores ?? cur ?? []
			if(prev.length != cur.length
					|| (new Set([...cur, ...prev])).size != cur.length){
				return false }
			// check timestamps...
			for(var {__paths_modified} of Object.values(this.substores ?? {})){
				if(__paths_modified > t){
					return false } } }
		return object.parentCall(MetaStore.__paths_isvalid__, this, ...arguments) },

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
	__update: async function(path, data, mode='update'){
		data = data instanceof Promise ?
			await data
			: data
		// add substore...
		if(object.childOf(data, BaseStore)){
			path = pwpath.sanitize(path, 'string')
			//data.index('clear')
			;(this.substores = this.substores ?? {})[path] = data
			return data }
		// add to substore...
		var p = this.substore(path)
		if(p){
			// XXX should this call .__update(..) ???
			// 		...if yes, how do we trigger the substore event, if no
			// 		then how do we nut trigger the event if needed???
			return this.substores[p].__update(
				// trim path...
				path.slice(path.indexOf(p)+p.length),
				...[...arguments].slice(1))
			return data }
		// add local...
		return object.parentCall(MetaStore.__update, this, ...arguments) },
	// NOTE: this fully overloads the .update(..) events and duplicates 
	// 		it's functionality because we need to handle the .__update(..)
	// 		call differently for .substores here and in .__update(..)...
	update: types.event.Event('update', 
		async function(handler, path, data, mode='update'){
			handler(false)
			// add to substore...
			var p = this.substore(path)
			if(p){
				var res = await this.substores[p].update(
					// trim path...
					path.slice(path.indexOf(p)+p.length),
					...[...arguments].slice(2))
			// local...
			} else {
				var res = await this.__update(...[...arguments].slice(1)) }
			handler()
			return this }),
	// XXX Q: how do we delete a substore???
	// XXX need to call .__cache_remove(..) here if we did not super-call...
	__delete: metaProxy('__delete'), 
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
	__update: async function(path, data){
		var that = this
		delete this.cache[path]
		var res = object.parentCall(CachedStore.__update, this, ...arguments) 
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
	__delete: async function(path){
		delete this.cache[path]
		return object.parentCall(CachedStore.__delete, this, ...arguments) },
}



//---------------------------------------------------------------------

var Store =
module.Store =
	MetaStore
	//CachedStore



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
