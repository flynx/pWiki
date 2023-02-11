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

// XXX this should be optional...
// XXX is this a good idea???
//var dateparser = require('any-date-parser')

var pwpath = require('./path')
var parser = require('./parser')
var filters = require('./filters/base')
var markdown = require('./filters/markdown')


//---------------------------------------------------------------------
// Page...

var relProxy = 
function(name){
	var func = function(path='.:$ARGS', ...args){
		path = this.resolvePathVars(path)
		return this.store[name](
			pwpath.relative(this.path, path), 
			...args) } 
	Object.defineProperty(func, 'name', {value: name})
	return func } 
var relMatchProxy = 
function(name){
	var func = function(path='.:$ARGS', strict=this.strict){
		if(path === true || path === false){
			strict = path
			path = '.:$ARGS' }
		path = this.resolvePathVars(path)
		return this.store[name](
			pwpath.relative(this.path, path), 
			strict) } 
	Object.defineProperty(func, 'name', {value: name})
	return func }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var BasePage =
module.BasePage = 
object.Constructor('BasePage', {
	// root page used to clone new instances via the .clone(..) method...
	//root: undefined,

	// a base page to be used as a base for cloning if root is of a 
	// different "class"...
	//__clone_proto__: undefined,

	//
	// Format:
	// 	{
	// 		<name>: true,
	// 		<name>: <alias>,
	// 	}
	//
	actions: { 
		location: true,
		referrer: true,
		path: true,
		name: true,
		dir: true,
		// alias...
		args: 'argstr',
		title: true,
		resolved: true,
		rootpath: true,
		length: true,
		type: true,
		ctime: true,
		mtime: true,
		// XXX
		//tags: true,
	},
	// These actions will be default get :$ARGS appended if no args are 
	// explicitly given...
	// XXX INHERIT_ARGS
	actions_inherit_args: new Set([
		'location',
		'args',
	]),

	
	// NOTE: this can be inherited...
	//store: undefined,
	//__store: undefined,
	get store(){
		return this.__store 
			?? (this.root ?? {}).__store },
	set store(value){
		this.__store = value },
	
	// Path variables...
	//
	// XXX PATH_VARS should these be here???
	// 		other places path variables can be resolved:
	// 			- navigation (below)
	// 			- macro expansion...
	path_vars: {
		NOW: function(){
			return Date.timeStamp() },
		PATH: function(){
			return this.path },
		NAME: function(){
			return this.name },
		DIR: function(){
			return this.dir },
		ARGS: function(){
			return pwpath.obj2args(this.args) },
		TITLE: function(){
			return this.title },

		/*/ XXX this needs:
		// 		- macro context...
		// 		- sort order...
		INDEX: function(context){
			return context.index },
		//*/
	},
	resolvePathVars: function(path='', context={}){
		var that = this
		return path == '.' ?
			path
			: pwpath.normalize(
				Object.entries(this.path_vars)
					.reduce(function(res, [key, func]){
						return res
							.replace(
								new RegExp('(\\${'+key+'}|\\$'+key+')', 'g'), 
								func.call(that, context))
					}, path)) },

	// page location...
	//
	// NOTE: path variables are resolved relative to the page BEFORE 
	// 		navigation...
	// NOTE: the actual work is done by the .navigate(..) method...
	__location: undefined,
	get location(){
		return this.__location ?? '/' },
	set location(path){
		// trigger the event...
		this.navigate(path) },
	// referrer -- a previous page location...
	referrer: undefined,

	// events...
	//
	//__beforenavigate__: function(location){ .. },
	//
	//__navigate__: function(){ .. },
	//
	// XXX revise naming...
	// XXX should this be able to prevent navigation???
	onBeforeNavigate: types.event.PureEvent('beforeNavigate',
		function(_, location){
			'__beforenavigate__' in this
				&& this.__beforenavigate__(location) }),
	navigate: types.event.Event('navigate',
		function(handle, location){
			var {path, args} = pwpath.splitArgs(location)
			this.trigger("onBeforeNavigate", location)
			this.referrer = this.location
			var cur = this.__location = 
				this.resolvePathVars(
					// NOTE: this is done instead of simply assigning 
					// 		location as-is to normalize the paths and 
					// 		arguments...
					pwpath.joinArgs(
						pwpath.relative(
								this.path, 
								path) 
							// keep root path predictable...
							|| '/',
						pwpath.obj2args(args)))
			// trigger handlers...
			'__navigate__' in this
				&& this.__navigate__()
			handle() }),

	get path(){
		return pwpath.splitArgs(this.location).path },
	set path(value){
		this.location = value },

	get args(){
		return pwpath.splitArgs(this.location).args },
	set args(args){
		args = pwpath.obj2args(args) ?? ''
		this.location = 
			args == '' ? 
				'.'
				: '.:'+ args },
	// helper...
	get argstr(){
		return pwpath.obj2args(this.args) },
	set argstr(value){
		this.args = value },

	// NOTE: these are mostly here as helpers to be accessed via page 
	// 		actions...
	// XXX should these be here or in Page???
	// XXX should this call .match(..) or .resolve(..)???
	get resolved(){
		return this.resolve() },
	get rootpath(){
		return this.root ? 
			this.root.path 
			: this.path },

	// XXX should this encode/decode??? 
	get name(){
		return pwpath.basename(this.path) },
	set name(value){
		if(pwpath.normalize(value) == ''){
			return }
		this.move(
			/^[\\\/]/.test(value) ?
				value
				: '../'+value) },
	get dir(){
		return pwpath.dirname(this.path) },
	set dir(value){ 
		var to = pwpath.join(value, this.name)
		this.move(
			/^[\\\/]/.test(to) ?
				to
				: '../'+to) },

	get title(){
		return pwpath.decodeElem(this.name) },
	set title(value){
		this.name = pwpath.encodeElem(value) },

	get isPattern(){
		return this.path.includes('*') },

	get ctime(){ return async function(){
		var t = ((await this.data) ?? {}).ctime
		return t ?
			new Date(t).getTimeStamp()
			: t }.call(this) },
	get mtime(){ return async function(){
		var t = ((await this.data) ?? {}).mtime
		return t ?
			new Date(t).getTimeStamp()
			: t }.call(this) },
	
	// store interface...
	//
	// XXX we are only doing modifiers here...
	// 		...these ar mainly used to disable writing in .ro(..)
	__update__: function(data){
		return this.store.update(this.path, data) },
	__delete__: function(path='.'){
		return this.store.delete(pwpath.relative(this.path, path)) },

	__energetic: undefined,
	//* XXX EXPERIMENTAL
	get energetic(){
		return this.__energetic === true
			|| ((this.actions 
				&& this.actions[this.name]
				&& !!this[
					this.actions[this.name] === true ?
						this.name
						: this.actions[this.name] ].energetic)
			|| Promise.awaitOrRun(
				this.store.isEnergetic(this.path),
		   		function(res){
					return !!res })) },
	/*/ // XXX ASYNC
	get energetic(){ return async function(){
		return this.__energetic === true
			|| ((this.actions 
				&& this.actions[this.name]
				&& !!this[
					this.actions[this.name] === true ?
						this.name
						: this.actions[this.name] ].energetic)
			|| !!await this.store.isEnergetic(this.path)) }.call(this) },
	//*/
	set energetic(value){
		this.__energetic = value },

	// page data...
	//
	strict: undefined,
	//* XXX EXPERIMENTAL
	get data(){
		var that = this
		// direct actions...
		if(this.actions 
				&& this.actions[this.name]){
			var name = 
				this.actions[this.name] === true ?
					this.name
					: this.actions[this.name]
			var args = this.args
			var page = this.get('..', {args})
			return Promise.awaitOrRun(
				(this.isPattern 
						&& !this.__energetic
						&& !page[name].energetic) ?
					page
						.map(function(page){
							var res = page[name] 
							return typeof(res) == 'function' ?
								res.bind(page.get(name, {args}))
								: function(){ 
									return res } })
					: page[name],
				function(res){
					return typeof(res) == 'function' ?
							res.bind(that)
						: res instanceof Array ?
							res
						: function(){ 
							return res } },
				// NOTE: we are passing null into the error handler to 
				// 		prevent the actual data (function) from being 
				// 		consumed...
				null) }
		// store data...
		return Promise.awaitOrRun(
			this.energetic,
			function(energetic){
				// pattern...
				// NOTE: we need to make sure each page gets the chance to handle 
				// 		its context (i.e. bind action to page)....
				if(that.isPattern
						&& !energetic){
					return that
						.map(function(page){
							return page.data }) }
				// single page...
				return Promise.awaitOrRun(
					that.store.get(that.path, !!that.strict, !!energetic),
					function(res){
						return typeof(res) == 'function' ?
							res.bind(that)
							: res }) }) },
	/*/ // XXX ASYNC
	get data(){ return (async function(){
		// direct actions...
		if(this.actions 
				&& this.actions[this.name]){
			var name = 
				this.actions[this.name] === true ?
					this.name
					: this.actions[this.name]
			var args = this.args
			var page = this.get('..', {args})
			var res = (this.isPattern 
					&& !this.__energetic
					&& !page[name].energetic) ?
				await page
					.map(function(page){
						var res = page[name] 
						return typeof(res) == 'function' ?
							res.bind(page.get(name, {args}))
							: function(){ 
								return res } })
				: await page[name] 
			return typeof(res) == 'function' ?
					res.bind(this)
				: res instanceof Array ?
					res
				: function(){ 
					return res } }

		var that = this
		// NOTE: we need to make sure each page gets the chance to handle 
		// 		its context (i.e. bind action to page)....
		if(this.isPattern 
				// XXX ENERGETIC...
				&& !await this.energetic){
			return this
				.map(function(page){
					return page.data }) }
		// single page...
		// XXX ENERGETIC...
		var res = await this.store.get(this.path, !!this.strict, !!await this.energetic)
		return typeof(res) == 'function' ?
			res.bind(this)
			: res }).call(this) },
	//*/
	set data(value){
		if(this.actions 
				&& this.actions[this.name]){
			var name = 
				this.actions[this.name] === true ?
					this.name
					: this.actions[this.name]
			var page = this.get('..')
			// NOTE: this can return a promise, as we'll need to assign 
			// 		we do not care about it as long as it's not a function...
			// 		XXX not sure if this is a good idea...
			var res = page[name]
			// set...
			typeof(res) == 'function' ?
				page[name](value.text ?? value)
			: (page[name] = value.text ?? value)

		// normal update...
		} else {
			this.__update__(value) } },

	// tags...
	//
	/*
	get tags(){ return async function(){
		return (await this.data).tags ?? [] }.call(this) },
	/*/
	get tags(){
		var tags = this.store.tags
		var path = pwpath.sanitize(this.path)
		return tags instanceof Promise ?
			tags.then(function(tags){
				return tags.paths[path] ?? [] })
			: this.store.tags.paths[path] ?? [] },
	//*/
	set tags(value){ return async function(){
		this.data = {
			...(await this.data),
			tags: [...value],
		} }.call(this) },
	tag: async function(...tags){
		this.tags = [...new Set([
			...(await this.tags), 
			...tags,
		])]
		return this },
	untag: async function(...tags){
		this.tags = (await this.tags)
			.filter(function(tag){
				return !tags.includes(tag) })
		return this },
	toggleTags: async function(...tags){
		var t = new Set(await this.tags)
		for(var tag of tags){
			t.has(tag) ?
				t.delete(tag)
				: t.add(tag) }
		this.tags = t
		return this },

	// metadata...
	//
	// NOTE: in the general case this is the same as .data but in also allows
	// 		storing of data (metadata) for pattern paths...
	get metadata(){
		return this.store.metadata(this.path) },
	set metadata(value){
		// clear...
		if(arguments.length > 0 
				&& value == null){
			return this.__delete__() }
		// set...
		this.__update__(value) },

	// XXX ASYNC???
	get type(){ return async function(){
		return this.store.isStore(this.path) ?
				'store'
			: typeof(await this.data) == 'function' ? 
				'action' 
			: 'page' }.bind(this)() },

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
	match: relMatchProxy('match'), 
	match: async function(path='.', strict=false){
		if(path === true || path === false){
			strict = path
			path = '.' }
		path = pwpath.relative(this.path, path)
		var res = await this.store.match(path, strict) 
		return res.length == 0 ?
			// XXX are we going outside of match semantics here???
			this.store.find(path) 
			: res },
	//*/
	resolve: relMatchProxy('resolve'),

	delete: types.event.Event('delete', 
		async function(handle, path='.', base=true){
			handle(false)
			if(path === true || path === false){
				base = path
				path = '.'	}
			var page = this.get(path)
			if(page.isPattern){
				base
					&& this.__delete__(this.path.split('*')[0])
				for(var p of await this.get('path').raw){
					this.__delete__(p) }
			} else {
				this.__delete__(path) }
			handle()
			return this }),
	// XXX should these be implemented here or proxy to .store???
	// XXX do we sanity check to no not contain '*'???
	copy: async function(to, base=true){
		if(this.get(to).path == this.path){
			return this }
		// copy children...
		if(this.isPattern){
			var base = this.path.split('*')[0]
			// copy the base...
			base 
				&& (this.get(to).data = await this.get(base).data)
			for(var from of await this.get('path').raw){ 
				this.get(pwpath.join(to, from.slice(base.length))).data = 
					await this.get(from).data }
		// copy self...
		} else {
			this.get(to).data = await this.data }
		// change location...
		this.path = to
		return this },
	move: async function(to, base=true){
		var from = this.path
		if(this.get(to).path == this.path){
			return this }
		await this.copy(to, base)
		this.delete(from, base)
		return this },


	//
	// 	Find current path (non-strict)
	// 	.find()
	// 	.find(false)
	// 	.find('.')
	// 	.find('.', false)
	// 		-> path
	// 		-> undefined
	//
	// 	Find current path in strict/non-strict mode...
	// 	.find(true)
	// 	.find(false)
	// 		-> path
	// 		-> undefined
	//
	// 	Find path relative to current page (strict/non-strict)
	// 	.find(<path>[, <strict>])
	// 		-> path
	// 		-> undefined
	//
	// XXX ARGS preserve args...
	find: function(path='.', strict=false){
		if(path === true || path === false){
			strict = path
			path = '.' }
		return this.store.find(
			pwpath.relative(this.path, path), strict) },

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
					//?? this.path,
					?? this.referrer,
				strict,
			}) },

	// XXX should this be an iterator???
	each: async function*(path){
		// NOTE: we are trying to avoid resolving non-pattern paths unless 
		// 		we really have to...
		path = path ?
			pwpath.relative(this.path, path)
			: this.location
		var paths = path.includes('*') 
				// XXX ENERGETIC...
				&& !(await this.energetic
					// XXX test if energetic action...
					|| await this.store.isEnergetic(path)) ?
			this.resolve(path)
			: path
		paths = paths instanceof Array ? 
				paths 
			: paths instanceof Promise ?
				await paths
			: [paths]
		for(var path of paths){
			yield this.get('/'+ path) } },
	[Symbol.asyncIterator]: async function*(){
		yield* this.each() },

	map: async function(func){
		return this.each().map(func) },
	filter: async function(func){
		return this.each().filter(func) },
	reduce: async function(func, dfl){
		return this.each().reduce(func, dfl) },

	// sorting...
	//
	// XXX revise how we sore order...
	sort: async function(...cmp){
		// normalize to path...
		this.metadata = 
			{ order: await this.store.sort(this.path, ...cmp) }
		return this },
	//	.sortAs(<name>)
	//	.sortAs([<path>, .. ])
	sortAs: async function(order){
		this.metadata = 
			order instanceof Array ?
				{ order: order
					.map(function(p){ 
						return pwpath.sanitize(p) }) }
				: { order: (await this.metadata)['order_'+ order] }
		return this },
	//	.saveSortAs(<name>)
	//	.saveSortAs(<name>, [<path>, .. ])
	saveSortAs: async function(name, order=null){
		order = order 
			?? (await this.metadata).order
		this.metadata = {['order_'+ name]: order}
		return this },
	reverse: async function(){
		// not sorting single pages...
		if(this.length <= 1){
			return this }
		this.sort('reverse')
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
		var src = this.__clone_proto__ 
			?? (this.root || {}).__clone_proto__
			?? this.root
			?? this
		return Object.assign(
			full ?
				// full copy...
				// XXX src or this???
				//this.constructor(this.path, this.referrer, this.store)
				src.constructor(this.path, this.referrer, this.store)
				// NOTE: this will restrict all the clones to the first 
				// 		generation maintaining the original (.root) page as 
				// 		the common root...
				// 		this will make all the non-shadowed attrs set on the
				// 		root visible to all sub-pages.
				: Object.create(src),
			// XXX
			//{...this},
			{
				root: this.root ?? this,
				location: this.location, 
				referrer: this.referrer,
			},
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
	update: types.event.Event('update',
		function(_, ...data){
			return Object.assign(this, ...data) }),

	// XXX should this take an options/dict argument????
	__init__: function(path, referrer, store){
		if(referrer && typeof(referrer) != 'string'){
			store = referrer
			referrer = undefined }
		// NOTE: this will allow inheriting .store from the prototype
		if(store){
			this.store = store }
		this.location = path
		this.referrer = referrer },
})

// pepper in event functionality...
types.event.EventMixin(BasePage.prototype)



//---------------------------------------------------------------------

// XXX do we need anything else like .doc, attrs???
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
	// XXX do we need anything else like .doc, attrs???
	return func }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var Page =
module.Page = 
object.Constructor('Page', BasePage, {
	__parser__: parser.parser,

	NESTING_DEPTH_LIMIT: 20,
	NESTING_RECURSION_TEST_THRESHOLD: 50,

	// Filter that will isolate the page/include/.. from parent filters...
	ISOLATED_FILTERS: 'isolated',

	// list of macros that will get raw text of their content...
	QUOTING_MACROS: ['quote'],

	// templates used to render a page via .text
	PAGE_TEMPLATE: '_view',

	// NOTE: comment this out to make the system fail when nothing is 
	// 		resolved, not even the System/NotFound page...
	// NOTE: we can't use any of the page actions here (like @source(./path)) 
	// 		as if we reach this it's likely all the bootstrap is either also
	// 		not present or broken.
	// NOTE: to force the system to fail set this to undefined.
	NOT_FOUND_ERROR: 'NotFoundError',
	RECURSION_ERROR: 'RecursionError',
	NOT_FOUND_TEMPLATE_ERROR: 'NotFoundTemplateError',
	QUOTE_ACTION_PAGE: 'QuoteActionPage',

	// Format:
	// 	{
	// 		<path>: Set([<path>, ...]),
	// 	}
	//
	// NOTE: this is stored in .root...
	//__dependencies: undefined,
	get dependencies(){
		return (this.root ?? this).__dependencies ?? {} },
	set dependencies(value){
		((this.root ?? this).__dependencies) = value },

	// NOTE: for this to populate .text must be done at least once...
	get depends(){
		return (this.dependencies ?? {})[this.path] },
	set depends(value){
		if(value == null){
			delete (this.dependencies ?? {})[this.path]
		} else {
			;(this.dependencies = this.dependencies ?? {})[this.path] = value } },

	// The page that started the current render...
	//
	// This is set by .text and maintained by .clone(..).
	//
	// NOTE: for manual rendering (.parse(..), ... etc.) this has to be 
	// 		setup manually.
	//renderer: undefined,
	get renderer(){
		return this.__render_root ?? this },
	set renderer(value){
		this.__render_root = value },

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

		'quote-tags': function(source){
			return source
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;') },

		// XXX one way to do this in a stable manner is to wrap the source 
		// 		in something like <span wikiwords=yes> .. </span> and only 
		// 		process those removing the wrapper in dom...
		// 		...not sure how to handle -wikiword filter calls -- now 
		// 		this is entirely handled by the parser without calling this...
		wikiword: function(){}, 
		'quote-wikiword': function(){},

		markdown: markdown.markdown,
		'quote-markdown': markdown.quoteMarkdown,

		text: function(source){
			return `<pre>${source}</pre>` },
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
	// XXX do we need to make .macro.__proto__ module level object???
	// XXX ASYNC make these support async page getters...
	macros: { __proto__: {
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
		arg: Macro(
			['name', 'else', ['local']],
			function(args){
				var v = this.args[args.name] 
					|| (!args.local 
						&& (this.renderer
							&& this.renderer.args[args.name])
						|| (this.root
							&& this.root.args[args.name]))
				v = v === true ?
					args.name
					: v
				return v
					|| (args['else']
						&& this.parse(args['else'])) }),
		'': Macro(
			['name', 'else', ['local']],
			function(args){
				return this.macros.arg.call(this, args) }),
		args: function(){
			return pwpath.obj2args(this.args) },
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
		// XXX REVISE...
		filter: function(args, body, state, expand=true){
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
				&& this.macros['quote-filter']
					.call(this, Object.fromEntries(Object.entries(quote)), null, state)

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

				return async function(state){
					// XXX can we lose stuff from state this way???
					// 		...at this stage it should more or less be static -- check!
					var res = 
						await this.__parser__.parse(this, ast, {
							...state,
							filters: local.includes(this.ISOLATED_FILTERS) ?
								local
								: [...outer, ...local],
						})
					return {data: res} }

			// global filters...
			} else {
				state.filters = [...outer, ...local] } },
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
		// XXX need a way to make encode option transparent...
		include: Macro(
			['src', 'recursive', 'join', 
				['s', 'strict', 'isolated']],
			async function*(args, body, state, key='included', handler){
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
		source: Macro(
			// XXX should this have the same args as include???
			['src', 'recursive', 'join', 
				['s', 'strict']],
			//['src'],
			async function*(args, body, state){
				var that = this
				yield* this.macros.include.call(this, 
					'source',
					args, body, state, 'sources', 
					async function(src, state){
						//return that.parse(that.get(src).raw, state) }) }),
						return that.parse(this.raw, state) }) }),

		// Load macro and slot definitions but ignore the page text...
		//
		// NOTE: this is essentially the same as @source(..) but returns ''.
		// XXX revise name...
		load: Macro(
			['src', ['strict']],
			async function*(args, body, state){
				var that = this
				yield* this.macros.include.call(this, 
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
		//
		// XXX need a way to escape macros -- i.e. include </quote> in a quoted text...
		quote: Macro(
			['src', 'filter', 'text', 'join', 
				['s', 'expandactions']],
			async function*(args, body, state){
				var src = args.src //|| args[0]
				var base = this.get(this.path.split(/\*/).shift())
				var text = args.text 
					?? body 
					?? []
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
							: this.get(src).asPages())
					: text instanceof Array ?
						[text.join('')]
					: typeof(text) == 'string' ?
						[text]
					: text
				// empty...
				if(!pages){
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
		//	Insert previous slot content...
		//	<content/>
		//
		//
		// NOTE: by default only the first slot with <name> is visible, 
		// 		all other slots with <name> will replace its content, unless
		// 		explicit shown/hidden arguments are given.
		// NOTE: hidden has precedence over shown if both are given.
		// NOTE: slots are handled in order of occurrence of opening tags 
		// 		in text and not by hierarchy, i.e. the later slot overrides
		// 		the former and the most nested overrides the parent.
		// 		This also works for cases where slots override slots they 
		// 		are contained in, this will not lead to recursion.
		//
		// XXX revise the use of hidden/shown use mechanic and if it's 
		// 		needed...
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

				// set slot value...
				var stack = []
				slots[name]
					&& stack.push(slots[name])
				delete slots[name]
				var slot = await this.__parser__.expand(this, text, state)
				var original = slot
				slots[name]
					&& stack.unshift(slot)
				slot = slots[name] = 
					slots[name] 
						?? slot
				// handle <content/>...
				for(prev of stack){
					// get the first <content/>
					for(var i in slot){
						if(typeof(slot[i]) != 'string'
								&& slot[i].name == 'content'){
							break } 
						i = null }
					i != null
						&& slot.splice(i, 1, 
							...prev
								// remove nested slot handlers...
								.filter(function(e){
									return typeof(e) != 'function'
											|| e.slot != name }) ) }
				return hidden ?
					''
					: Object.assign(
						function(state){
							return (state.slots || {})[name] ?? original },
						{slot: name}) }), 
		'content': ['slot'],

		// XXX EXPERIMENTAL...
		//
		// NOTE: var value is parsed only on assignment and not on dereferencing...
		//
		// XXX should alpha/Alpha be 0 (current) or 1 based???
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
			async function(args, body, state){
				var name = args.name
				if(!name){
					return '' }
				name = await this.parse(name, state)
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

				var vars = state.vars = 
					state.vars 
						?? {}
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
					text = vars[name] = 
						await this.parse(text, state)
					return show ?? false ?
						text
						: ''
				// get...
				} else {
					return handleFormat(vars[name] ?? '') } }),
		vars: async function(args, body, state){
			var vars = state.vars = 
				state.vars 
					?? {}
			for(var [name, value] of Object.entries(args)){
				vars[await this.parse(name, state)] =
					await this.parse(value, state) }
			return '' },

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
		// XXX should macro:index be 0 or 1 (current) based???
		// XXX SORT sorting not implemented yet...
		macro: Macro(
			['name', 'src', 'sort', 'text', 'join', 'else',
				['strict', 'isolated', 'inheritmacros', 'inheritvars' ]],
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
	} },

	// XXX EXPERIMENTAL...
	//
	// 	Define a global macro...
	// 	.defmacro(<name>, <func>)
	// 	.defmacro(<name>, <args>, <func>)
	// 		-> this
	//
	// XXX do we need this???
	defmacro: function(name, args, func){
		this.macros[name] = 
			arguments.length == 2 ?
				arguments[1]
				: Macro(args, func)
		return this },


	// direct actions...
	//
	// These are evaluated directly without the need to go through the 
	// whole page acquisition process...
	//
	// NOTE: these can not be overloaded. 
	// 		(XXX should this be so?)
	// XXX should this be an object???
	actions: {
		...module.BasePage.prototype.actions,

		'!': true,
		// XXX EXPERIMENTAL...
		quote: true,
	},

	// XXX should this be .raw or .parse()???
	'!': Object.assign(
		function(){
			return this.get('..:$ARGS', {energetic: true}).raw },
		{energetic: true}),
	// XXX EXPERIMENTAL...
	// XXX this is html/web specific, should it be here???
	// 		...
	// XXX should this be .raw or .parse()???
	// XXX ASYNC???
	quote: async function(energetic=false){
		return Promise.awaitOrRun(
			this.get('..:$ARGS', {energetic: await this.energetic}).raw,
			function(res){
				return res instanceof Array ?
					res.map(pwpath.quoteHTML)
					: pwpath.quoteHTML(res) }) },


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
	// NOTE: .__debug_last_render_state is mainly exposed for introspection 
	// 		and debugging, set comment it out to disable...
	//__debug_last_render_state: undefined,
	// XXX should this handle pattern paths???
	//* XXX EXPERIMENTAL
	parse: function(text, state){
		var that = this
		return Promise.awaitOrRun(
			text,
			function(text){
				// .parser(<state>)
				if(arguments.length == 1 
						&& text instanceof Object
						&& !(text instanceof Array)){
					state = text
					text = null }
				state = state ?? {}
				state.renderer = state.renderer ?? that
				// this is here for debugging and introspection...
				'__debug_last_render_state' in that
					&& (that.__debug_last_render_state = state)
				// parse...
				return that.__parser__.parse(
					that.get('.', {
						renderer: state.renderer,
						args: that.args, 
					}), 
					text, 
					state) }) },
	/*/ // XXX ASYNC
	parse: async function(text, state){
		var that = this
		text = await text
		// .parser(<state>)
		if(arguments.length == 1 
				&& text instanceof Object
				&& !(text instanceof Array)){
			state = text
			text = null }
		state = state ?? {}
		state.renderer = state.renderer ?? this
		// this is here for debugging and introspection...
		'__debug_last_render_state' in this
			&& (this.__debug_last_render_state = state)
		// parse...
		return this.__parser__.parse(
			this.get('.', {
				renderer: state.renderer,
				args: this.args, 
			}), 
			text, 
			state) },
	//*/

	// raw page text...
	//
	// NOTE: writing to .raw is the same as writing to .text...
	// NOTE: when matching multiple pages this will return a list...
	//
	// XXX revise how we handle .strict mode...
	// XXX EXPERIMENTAL
	get raw(){
		var that = this
		return Promise.awaitOrRun(
			this.data,
			function(data){
				// no data...
				// NOTE: if we hit this it means that nothing was resolved, 
				// 		not even the System/NotFound page, i.e. something 
				// 		went really wrong...
				// NOTE: in .strict mode this will explicitly fail and not try 
				// 		to recover...
				if(data == null){
					if(!this.strict 
							&& this.NOT_FOUND_ERROR){
						var msg = this.get(this.NOT_FOUND_ERROR)
						return Promise.awaitOrRun(
							msg.match(),
							function(msg){
								return msg.raw }) }
					// last resort...
					throw new Error('NOT FOUND ERROR: '+ this.path) }
				// get the data...
				return (
					// action...
					typeof(data) == 'function' ?
						data()
					// multiple matches...
					: data instanceof Array ?
						// XXX
						Promise.all(data
							.map(function(d){
								return typeof(d) == 'function'?
									d()
									: d.text })
							.flat())
					: data.text ) }, 
			null) },
	/*/ // XXX ASYNC
	get raw(){ return (async function(){
		var data = await this.data
		// no data...
		// NOTE: if we hit this it means that nothing was resolved, 
		// 		not even the System/NotFound page, i.e. something 
		// 		went really wrong...
		// NOTE: in .strict mode this will explicitly fail and not try 
		// 		to recover...
		if(data == null){
			if(!this.strict 
					&& this.NOT_FOUND_ERROR){
				var msg = this.get(this.NOT_FOUND_ERROR)
				if(await msg.match()){
					return msg.raw } }
			// last resort...
			throw new Error('NOT FOUND ERROR: '+ this.path) }
		// get the data...
		return (
			// action...
			typeof(data) == 'function' ?
				data()
			// multiple matches...
			: data instanceof Array ?
				Promise.all(data
					.map(function(d){
						return typeof(d) == 'function'?
							d()
							: d.text })
					.flat())
   			: data.text )}).call(this) },
	//*/
	set raw(value){
		this.data = {text: value} },
		//this.onTextUpdate(value) },

	// iterate matches or content list as pages...
	//
	// 	.asPages()
	// 	.asPages(<path>[, <options>])
	// 	.asPages(<strict>[, <options>])
	// 	.asPages(<path>, <strict>[, <options>])
	// 	.asPages(<options>)
	// 		-> <iter>
	//
	// NOTE: this will get .raw for non-pattern pages this it can trigger 
	// 		actions...
	//
	// XXX revise name...
	asPages: async function*(path='.:$ARGS', strict=false){
		// options...
		var args = [...arguments]
		var opts = typeof(args.at(-1)) == 'object' ?
			args.pop()
			: {}
		var {path, strict} = {
			...opts,
			path: typeof(args[0]) == 'string' ?
				args.shift()
				: '.:$ARGS',
			strict: args.shift() 
				?? false,
		}

		var page = this.get(path, strict)
		// each...
		if(page.isPattern){
			yield* page
		// handle lists in pages (actions, ... etc.)...
		} else {
			var data = await page.data
			data = 
				data instanceof types.Generator ?
					await data()
				: typeof(data) == 'function' ?
					data
				: data && 'text' in data ?
					data.text
				: null
			if(data instanceof Array
					|| data instanceof types.Generator){
				yield* data
					.map(function(p){
						return page.virtual({text: p}) })
				return }
			// do not iterate pages/actions that are undefined...
			if(data == null){
				return }

			yield page } },

	// expanded page text...
	//
	// NOTE: this uses .PAGE_TEMPLATE to render the page.
	// NOTE: writing to .raw is the same as writing to .text...
	//
	// XXX should render templates (_view and the like) be a special case
	// 		or render as any other page???
	// 		...currently they are rendered in the context of the page and
	// 		not in their own context...
	/*/ XXX revise how we handle strict mode...
	get text(){
		// strict mode -- break on non-existing pages...
		if(this.strict 
				// XXX
				&& !await this.resolve(true)){
			throw new Error('NOT FOUND ERROR: '+ this.location) }

		var path = pwpath.split(this.path)
		;(path.at(-1) ?? '')[0] == '_'
			|| path.push(this.PAGE_TEMPLATE)
		var tpl = pwpath.join(path)
		var tpl_name = path.pop()
		//var tpl_name = path.at(-1)

		// get the template relative to the top most pattern...
		return Promise.awaitOrRun(
			this.get(tpl).find(true),
			function(tpl){
				if(!tpl){
					console.warn('UNKNOWN RENDER TEMPLATE: '+ tpl_name) 
					return this.get(this.NOT_FOUND_TEMPLATE_ERROR).parse() }

				var depends = this.depends = new Set([tpl])
				// do the parse...
				// NOTE: we render the template in context of page...
				return that
					// NOTE: this.path can both contain a template and not, this
					// 		normalizes it to the path up to the template path...
					.get(path, {args: this.args})
					.parse(
						this.get(
							'/'+tpl, 
							{args: this.args}).raw, 
						{
							depends, 
							renderer: this,
						}) }.bind(this)) },
	/*/ // XXX ASYNC
	get text(){ return (async function(){
		// strict mode -- break on non-existing pages...
		if(this.strict 
				&& !await this.resolve(true)){
			throw new Error('NOT FOUND ERROR: '+ this.location) }

		var path = pwpath.split(this.path)
		;(path.at(-1) ?? '')[0] == '_'
			|| path.push(this.PAGE_TEMPLATE)
		var tpl = pwpath.join(path)
		var tpl_name = path.pop()
		//var tpl_name = path.at(-1)

		// get the template relative to the top most pattern...
		tpl = await this.get(tpl).find(true)
		if(!tpl){
			console.warn('UNKNOWN RENDER TEMPLATE: '+ tpl_name) 
			return this.get(this.NOT_FOUND_TEMPLATE_ERROR).parse() }

		var depends = this.depends = new Set([tpl])
		// do the parse...
		// NOTE: we render the template in context of page...
		return this
			// NOTE: this.path can both contain a template and not, this
			// 		normalizes it to the path up to the template path...
			.get(path, {args: this.args})
			.parse(
				this.get(
					'/'+tpl, 
					{args: this.args}).raw, 
				{
					depends, 
					renderer: this,
				}) }).call(this) },
	//*/
	set text(value){
		this.data = {text: value} },
		//this.onTextUpdate(value) },

	// pass on .renderer to clones...
	clone: function(data={}, ...args){
		this.renderer
			&& (data = {renderer: this.renderer, ...data})
		return object.parentCall(Page.prototype.clone, this, data, ...args) },
})



//---------------------------------------------------------------------
// Markdown renderer...
// XXX EXPERIMENTAL...

var showdown = require('showdown')

var MarkdownPage =
module.MarkdownPage =
object.Constructor('MarkdownPage', Page, {
	actions: {
		...module.Page.prototype.actions,

		html: true,
	},

	markdown: new showdown.Converter(),

	get html(){ return async function(){
		return this.markdown.makeHtml(await this.raw) }.call(this) },
	set html(value){
		this.raw = this.markdown.makeMarkdown(value) },
})

// XXX HACK...
var Page = MarkdownPage


//---------------------------------------------------------------------
// Cached .text page...

var getCachedProp = 
function(obj, name){
	var that = obj
	var value = obj.cache ?
		obj.cache[name]
		: object.parentProperty(CachedPage.prototype, name).get.call(obj)
	value instanceof Promise
		&& value.then(function(value){
			that.cache = {[name]: value} })
	return value }
var setCachedProp = 
function(obj, name, value){
	return object.parentProperty(CachedPage.prototype, name).set.call(obj, value) }

// XXX this is good enough on the front-side to think about making the 
// 		cache persistent with a very large timeout (if set at all), but
// 		we are not tracking changes on the store-side...
var CachedPage =
module.CachedPage =
object.Constructor('CachedPage', Page, {
	// Sets what to use for cache id...
	//
	// Can be:
	// 		'location' (default)
	// 		'path'
	cache_id: 'location',

	// NOTE: set this to null/undefined/0 to disable...
	cache_timeout: '20m',


	// keep all the cache in one place -- .root
	//__cachestore: undefined,
	get cachestore(){
		return (this.root ?? this).__cachestore },
	set cachestore(value){
		;(this.root ?? this).__cachestore = value },
	
	get cache(){
		this.checkCache(this[this.cache_id])
		return ((this.cachestore ?? {})[this[this.cache_id]] ?? {}).value },
	// XXX check * paths for matches...
	set cache(value){
		if(this.cachestore === false 
				|| this.cache == value){
			return }
		var id = this[this.cache_id ?? 'location']
		// clear...
		if(value == null){
			delete (this.cachestore ?? {})[id]
		// set...
		} else {
			var prev = ((this.cachestore = this.cachestore ?? {})[id] ?? {}).value ?? {}
			;(this.cachestore = this.cachestore ?? {})[id] = {
				created: Date.now(),
				// XXX
				valid: undefined,
				value: {
					...prev, 
					...value,
				},
			} } 
		// clear depended pages from cache...
		for(var [key, deps] of Object.entries(this.dependencies)){
			// XXX also check pattern paths...
			// 		...the problem here is that it's getting probabilistic, 
			// 		i.e. if we match * as a single path item then we might 
			// 		miss creating a subtree (ex: /tree), while matching 
			// 		/* to anything will give us lots of false positives...
			if(key != id && deps.has(id)){
				delete this.cachestore[key] } } },

	checkCache: function(...paths){
		if(!this.cache_timeout || !this.cachestore){
			return this }
		paths = paths.length == 0 ?
			Object.keys(this.cachestore)
			: paths
		for(var path of paths){
			var {created, valid, value} = this.cachestore[path] ?? {}
			if(value){
				var now = Date.now()
				valid = valid 
					?? Date.str2ms(this.cache_timeout)
				// drop cache...
				if(now > created + valid){
					//console.log('CACHE: DROP:', this.path)
					delete this.cachestore[path] } } }
		return this },
	clearCache: function(...paths){
		if(this.cachestore){
			if(arguments.length == 0){
				this.cachestore = null 
			} else {
				for(var path of paths){
					delete this.cachestore[path] } } }
		return this },


	__update__: function(){
		this.cache = null
		return object.parentCall(CachedPage.prototype.__update__, this, ...arguments) },
	__delete__: function(){
		this.cache = null
		return object.parentCall(CachedPage.prototype.__delete__, this, ...arguments) },

	/* XXX do we need to cache .raw???
	//		...yes this makes things marginally faster but essentially 
	//		copies the db into memory...
	get raw(){
		return getCachedProp(this, 'raw') },
	set raw(value){
		return setCachedProp(this, 'raw', value) },
	//*/

	get text(){
		return getCachedProp(this, 'text') },
	set text(value){
		return setCachedProp(this, 'text', value) },
})


//---------------------------------------------------------------------

var toc = require('./dom/toc')
var wikiword = require('./dom/wikiword')
//var textarea = require('./dom/textarea')

var pWikiPageElement =
module.pWikiPageElement = 
// XXX CACHE...
object.Constructor('pWikiPageElement', CachedPage, {
/*/
object.Constructor('pWikiPageElement', Page, {
//*/
	dom: undefined,


	domFilters: {
		toc: toc.makeToc,
		// XXX see Page.filters.wikiword for notes...
		wikiword: wikiword.wikiWordText,
		//textarea: textarea.setupTextarea,
	},

	// XXX CACHE
	__clone_constructor__: CachedPage,
	/*/
	__clone_constructor__: Page,
	//*/

	__clone_proto: undefined,
	get __clone_proto__(){
		return (this.__clone_proto = this.__clone_proto 
			?? this.__clone_constructor__('/', '/', this.store)) },
	set __clone_proto__(value){
		this.__clone_proto = value },
	
	actions: {
		...CachedPage.prototype.actions,

		hash: true,
	},


	// NOTE: setting location will reset .hash set it directly via either
	// 		one of:
	// 			.location = [path, hash]
	// 			.location = 'path#hash'
	hash: undefined,
	// NOTE: getting .location will not return the hash, so as not to force
	// 		the user to parse it out each time.
	get location(){
		return object.parentProperty(pWikiPageElement.prototype, 'location')
			.get.call(this) },
	set location(value){
		var [value, hash] = 
			// .location = [path, hash]
			value instanceof Array ?
				value
			// .location = '<path>#<hash>'
			: value.includes('#') ?
				value.split('#')
			// no hash is given...
			: [value, undefined]
		this.hash = hash
		object.parentProperty(pWikiPageElement.prototype, 'location')
			.set.call(this, value) },

	// events...
	//
	__pWikiLoadedDOMEvent: new Event('pwikiloaded'),
	onLoad: types.event.PureEvent('onLoad', function(){
		this.dom.dispatchEvent(this.__pWikiLoadedDOMEvent) }),

	// XXX CACHE...
	__last_refresh_location: undefined,
	refresh: types.event.Event('refresh', 
		async function(full=false){
			// drop cache if re-refreshing or when full refresh requested...
			// XXX CACHE...
			;(full
					|| this.__last_refresh_location == this.location)	
				&& this.cache 
				&& (this.cache = null)
			this.__last_refresh_location = this.location
			var dom = this.dom
			dom.innerHTML = await this.text 
			for(var filter of Object.values(this.domFilters)){
				filter
					&& filter.call(this, dom) }
			this.trigger('onLoad')
			return this }),

	// handle dom as first argument...
	__init__: function(dom, ...args){
		if(typeof(Element) != 'undefined'){
			if(dom instanceof Element){
				this.dom = dom
			} else {
				args.unshift(dom) } }
		return object.parentCall(pWikiPageElement.prototype.__init__, this, ...args) },
})



//---------------------------------------------------------------------
// System pages/actions...
// XXX move this to a more appropriate module...

var System = 
module.System = {
	// base templates...
	//
	// These are used to control how a page is rendered. 
	//
	// pWiki has to have a template appended to any path, if one is not 
	// given then "_view" is used internally.
	//
	// A template is rendered in the context of the parent page, e.g. 
	// for /path/to/page, the actual rendered template is /path/to/page/_view
	// and it is rendered from /path/to/page.
	//
	// A template is any page named starting with an underscore ("_") 
	// thus it is not recommended to use underscores to start page names.
	//
	// The actual default template is controlled via <page>.PAGE_TEMPLATE
	//
	// Example:
	// 		_list: {
	//			text: '<macro src="." join="\n">- @source(.)</macro>' },
	//
	// XXX might be a good idea to add a history stack to the API (macros?)
	// XXX all of these should support pattern pages...
	_text: {
		text: '@include(.:$ARGS isolated join="@source(file-separator)")' },
	_view: {
		text: object.doc`
			<style>@include(./Style)</style>

			<slot pre/>

			<slot header>
				<a href="#/list">&#9776</a>
				<!--
				<a href="javascript:history.back()">&#5130;</a>
				<a href="javascript:history.foreward()">&#5125;</a>
				<a href="#<slot parent>../:@arg(all)</slot>">&#5123;</a>
				-->
				<a href="javascript:history.back()">&#129120;</a>
				<a href="javascript:history.foreward()">&#129122;</a>
				<a href="#<slot parent>../:@arg(all)</slot>">&#129121;</a>
				<!-- use css for spacing... -->
				&nbsp;&nbsp;
				<!-- XXX make this editable + inherit args... -->
				[<slot location>@source(./location/quote/!)</slot>]
				<!-- use css for spacing... -->
				&nbsp;&nbsp;
				<a href="javascript:refresh()">&#10227;</a>
				<slot edit>
					<a href="#@source(s ./path/!)/edit">&#9998;</a>
				</slot>
			</slot>
			<hr>
			<slot content/>
			<hr>
			<slot footer/>
			
			<!-- NOTE: this is not included directly to enable client code to 
					set slots that are defined after the content... -->
			<slot content>
				<h1><slot title>@source(./title/quote/!)</slot></h1>
				@include(.:$ARGS join="@source(file-separator)" recursive="")
			</slot>` },
	// XXX add join...
	_raw: {
		text: '@quote(.)' },

	// XXX not sure if this is the right way to go...
	_code: {
		text: 
			'<macro src="." join="@source(file-separator)">'
				+'<pre wikiwords="no"><quote filter="quote-tags" src="."/></pre>' 
			+'</macro>'},
	/* XXX can we reuse _view here???
	_edit: {
		text: 
			'@include(PageTemplate)'
			+'<slot header>@source(./path)</slot>'
			+'<slot content>'
				+'<macro src="." join="@source(file-separator)">'
					+'<pre class="editor" '
							+'wikiwords="no" '
							+'contenteditable '
							+'oninput="saveLiveContent(\'@source(./path)\', this.innerText)">'
						+'<quote filter="quote-tags" src="."/>'
					+'</pre>' 
				+'</macro>'
			+'</slot>'},
	/*/
	_edit: {
		text: 
			'@source(./path/quote/!)'
			+'<hr>'
			+'<macro src="." join="@source(file-separator)">'
				+'<h1 '
						+'wikiwords="no" '
						+'contenteditable '
						// XXX need to make this savable...
						+'oninput="saveContent(\'@source(s ./path)/name\', this.innerText)">' 
					+'@source(./title/quote)'
				+'</h1>'
				+'<pre class="editor" '
						+'wikiwords="no" '
						+'contenteditable '
						+'oninput="saveLiveContent(\'@source(s ./path)\', this.innerText)">'
					+'<quote filter="quote-tags" src="."/>'
				+'</pre>' 
			+'</macro>'},
	edit: {
		// XXX not sure if we should use .title or .name here...
		text: object.doc`
			<macro titleeditor>
				<h1>
					<span class="title-editor"
							wikiwords="no"
							contenteditable 
							oninput="saveContent(\'@source(s ./path)/title\', this.innerText)">
						@source(./title/quote)
					</span>
				</h1>
			</macro>
			<macro texteditor>
				<pre class="editor"
						wikiwords="no"
						contenteditable
						oninput="saveLiveContent(\'@source(s ./path)\', this.innerText)"
					><quote filter="quote-tags" src="."/></pre> 
			</macro>
			<macro editor join="@source(file-separator)">
				@macro(titleeditor .)
				@macro(texteditor .)
			</macro>
			
			<slot pre>
				<title>@source(../title) (edit)</title>
			</slot>
			<slot parent>../..</slot>
			<slot location>@source(../location/quote/!)</slot>
			<slot edit/>
			<slot content>
				<macro editor src=".."/>
			</slot>`},
	// XXX EXPERIMENTAL...
	ed: {
		text: object.doc` @source(../ed-visual) `},
	'ed-visual': {
		text: object.doc`
			@load(./edit)

			<macro texteditor>
				<toc></toc>
				<div class="editor"
						wikiwords="no"
						contenteditable
						class="native-editor"
						oninput="saveLiveContent('@source(s ./path)/html', this.innerHTML)">
					@quote(./html)
				</div>
			</macro>

			<!-- NOTE: we need to redefine this to make the overloaded 
					texteditor macro visible... -->
			<slot content>
				<macro editor src=".."/>
			</slot>
			<slot footer>
				<div style="text-align:right">
					<b>visual</b> 
					| <a href="#../ed-text">text</a> 
				</div>
			</slot> `},
	'ed-text': {
		text: object.doc`
			@load(./edit)

			<macro texteditor>
				<pre class="editor"
						wikiwords="no"
						contenteditable
						class="native-editor"
						oninput="saveLiveContent('@source(s ./path)', this.innerText)"
					><quote filter="quote-tags" src="."/></pre> 
			</macro>

			<!-- NOTE: we need to redefine this to make the overloaded 
					texteditor macro visible... -->
			<slot content>
				<macro editor src=".."/>
			</slot>
			<slot footer>
				<div style="text-align:right">
					<a href="#../ed-visual">visual</a> 
					| <b>text</b> 
				</div>
			</slot> `},

	// XXX debug...
	_path: {text: '@source(./path/! join=" ")'},
	_location: {text: '@source(./location/! join=" ")'},


	list: {
		text: object.doc`
			<slot header>
				<a href="#/list">&#9776</a>
				<a href="javascript:history.back()">&#129120;</a>
				<a href="javascript:history.foreward()">&#129122;</a>
				<a href="#<slot parent>../:@arg(all)</slot>">&#129121;</a>
				<!--
				<a href="javascript:history.back()">&#5130;</a>
				<a href="javascript:history.foreward()">&#5125;</a>
				<a href="#@source(s ../../path)/list">&#5123;</a>
				-->
				&nbsp;&nbsp;
				@source(../path)
			</slot>
			<macro src="../*:$ARGS" join="@source(line-separator)">
				@var(path "@source(s ./path)")
				<a href="#@var(path)">@source(./name/quote)</a>
				<sup>
					<macro src="./isAction">
						a
						<else>
							<macro src="./isStore">s</macro>
						</else>
					</macro>
				</sup>
				(<a href="#@var(path)/list">@include(./*/length/!)</a>)
				&nbsp;
				<a href="#@var(path)/delete">&times;</a>
			</macro>` },
	// XXX this is really slow...
	// XXX need to handle count/offset arguments correctly...
	// 		...for this we'll need to be able to either:
	// 			- count our own pages or 
	// 			- keep a global count
	// 		...with offset the issue is not solvable because we will not 
	// 		see/count the children of skipped nodes -- the only way to 
	// 		solve this is to completely handle offset in macro...
	tree: {
		text: object.doc`
			<slot title/>
			<!--@var(count "@(count)")-->

			<macro tree src="../*:$ARGS">
				@var(path "@source(s ./path)")
				<div>
					<div class="item">
						<a class="tree-page-title" href="#@var(path):@arg(all)">@source(./title/quote)</a>
						<a class="show-on-hover" href="#@var(path)/info">&#128712;</a>
						<a class="show-on-hover" 
							href="javascript:pwiki.delete('@var(path)')"
							>&times;</a>
					</div>
					<div style="padding-left: 30px">
						@macro(tree "./*:$ARGS:count=inherit")
					</div>
				</div>
			</macro>` },
	/* XXX @var(..) vs. multiple @source(..) calls are not that different...
	tree2: {
		text: object.doc`
			<slot title/>

			<i>This is a comparison with [../tree] -- \\@var(..) vs direct macro call...</i><br><br>

			<macro tree src="../*:$ARGS">
				<div>
					<div class="item">
						<a class="tree-page-title" href="#@source(s ./path)">@source(./title)</a>
						<a class="show-on-hover" href="#@source(s ./path)/info">&#128712;</a>
						<a class="show-on-hover" 
							href="javascript:pwiki.delete('@source(s ./path)')"
							>&times;</a>
					</div>
					<div style="padding-left: 30px">
						@macro(tree "./*:$ARGS")
					</div>
				</div>
			</macro>` },
	//*/
	all: {
		text: `@include("../**/path:$ARGS" join="@source(line-separator)")`},
	info: {
		text: object.doc`
			<slot pre>
				<title>@source(../title/quote) (info)</title>
			</slot>
			<slot title>
				<h1><a href="#..">@source(../title/quote)</a></h1>
			</slot>

			Path: [@source(../path/quote)]
				(<a href="#../edit">edit</a>)<br>
			Resolved path: [/@source(../resolved/quote)]<br>
			Referrer: [@source(../referrer/quote)]<br>
			Args: <args/><br>

			type: @source(../type)<br>

			tags: 
				<macro name="list-tags" src="../tags">
					<a href="#/**/path:tags=@source(.)">@source(.)</a>
				</macro><br>
			related tags: 
				<macro name="list-tags" src="../relatedTags"/><br>

			ctime: @source(../ctime)<br>
			mtime: @source(../mtime)<br>

			<hr>
			<pre wikiwords="no"><quote filter="quote-tags" src=".."/></pre> ` },

	// XXX need to also be able to list things about each store...
	stores: function(){
		return Object.keys(this.store.substores ?? {}) },

	// tags...
	//
	// XXX should these be actions???
	// 		...actions do not yet support lists/generators...
	tags: async function*(){
		yield* this.get('..').tags },
	allTags: async function*(){
		yield* Object.keys((await this.store.tags).tags) },
	relatedTags: async function*(){
		yield* this.store.relatedTags(
			...((await this.args.tags)
				?? this.get('..').tags
				?? [])) },

	// page parts...
	//
	'line-separator': { text: '<br>' },
	'file-separator': { text: '<hr>' },

	// base system pages...
	//
	// NOTE: these are last resort pages, preferably overloaded in /Templates.
	//
	ParseError: {
		text: object.doc`
			<slot title/>
			<div class="error">
				<div class="msg" wikiwords="no">ParseError: @(msg "no message")</div>
				Page: [@(path "@source(./path/quote)")]
			</div> `,},
	RecursionError: {
		text: 'RECURSION ERROR: @source(../path/quote)' },
	NotFoundError: {
		//text: 'NOT FOUND ERROR: @source(./path)' },
		text: object.doc`
			<slot title/>

			<p>NOT FOUND ERROR: @source(./path)</p>

			<slot nested>
				<div>
					<b>Nested pages:</b><br>
					<div style="padding-left: 30px">
						<macro src="./*:$ARGS" join="<br>" else="@slot(nested)">
							<a href="#@source(s ./path)">@source(./title/quote)</a>
						</macro>
					</div>
				</div>
			</slot>` },
	NotFoundTemplateError: {
		text: 'NOT FOUND TEMPLATE ERROR: @source(../path/quote)' },

	DeletingPage: {
		text: 'Deleting: @source(../path/quote)' },

	PageTemplate: {
		text: object.doc`
			<slot header>@source(./path/quote)/edit</slot>
			<hr>
			<slot content></slot>
			<hr>
			<slot footer></slot> ` },
	QuoteActionPage: {
		text: '[ native code ]' },

	Style: {
		text: object.doc`
		` },

	// page actions...
	//
	
	// XXX this does not work as energetic...
	time: async function(){
		var t = Date.now()
		var text = await this.get('../_text:$ARGS').text
		var time = Date.now() - t
		console.log('RENDER TIME:', time)
		return object.doc`
			<slot title/>
			Time to render: ${time}ms <br>
			<hr>
			${text}`},

	// XXX EXPERIMENTAL -- page types...
	isAction: async function(){
		return await this.get('..').type == 'action' ?
			'action'
			: undefined },
	isStore: async function(){
		return await this.get('..').type == 'store' ?
			'store'
			: undefined },


	/* XXX need a stable way to redirect after the action...
	//		...not sure if these are needed vs. pwiki.delete(..) and friends...
	// actions...
	//
	// XXX should ** be the default here...
	delete: function(){
		var target = this.get('..')

		console.log('DELETE:', target.path)

		target.isPattern ?
			target.delete()
			: target.delete('**')

		// XXX
		if(this.referrer == this.path){
			this.renderer.path = '..'
			return '' }

		// redirect...
		this.renderer
			&& (this.renderer.location = this.referrer)
			// XXX this should not be needed...
			&& this.renderer.refresh()
		// XXX returning undefined will stop the redirect...
		return '' },
	// NOTE: this moves relative to the basedir and not relative to the 
	// 		page...
	move: async function(){
		var from = this.get('..')
		// XXX this is ugly...
		// 		...need to standardize how we get arguments when rendering....
		var to = this.args.to 
			|| (this.renderer || {args:{}}).args.to

		console.log('MOVE:', from.path, to)

		to
			&& await (from.isPattern ?
					from
					: from.get('**'))
				.move(
					/^[\\\/]/.test(to[0]) ?
						to
						: pwpath.join('..', to))

		// redirect...
		this.renderer
			&& to
			//&& (this.renderer.location = this.referrer)
			&& (this.renderer.location = from.path)
			// XXX this should not be needed...
			&& this.renderer.refresh()
		// XXX if we return undefined here this will not fully redirect, 
		// 		keeping the move page open but setting the url to the 
		// 		redirected page...
		return '' },
	// XXX copy/...
	//*/

	// XXX System/sort
	// XXX System/reverse
}

var Templates = 
module.Templates = {
	// XXX should this be in templates???
	// XXX for some reason this does not list files...
	FlatNotes: {
		text: object.doc`
		<slot title/>
		<slot header><content/><a href="#./$NOW/edit">&#128462;</a></slot>
		<macro src="*:$ARGS">
			@var(path "@source(s ./path)")
			<div class="item">
				<a href="#@var(path)/edit">@source(./title/quote)</a>
				<a class="show-on-hover" href="#@var(path)/info">&#128712;</a>
				<a class="show-on-hover" 
					href="javascript:pwiki.delete('@var(path)')"
					>&times;</a>
			</div>
		</macro>` },
	// XXX this is not resolved...
	'FlatNotes/.templates/EmptyPage': {text: ' '},
}

var Test =
module.Test = {
	// XXX do we support this???
	//'list/action': function(){
	//	return [...'abcdef'] },
	'list/generator': function*(){
		yield* [...'abcdef'] },
	'list/static': {
		text: [...'abcdef'] },

	// this is shown by most listers by adding an :all argument to the url...
	'.hidden': {
		text: 'Hidden page...' },
	'.hidden/subpage': {
		text: 'visible subpage...' },
	'.hidden/.hidden': {
		text: 'hidden subpage...' },

	slots: {
		text: object.doc`
			Sequential:
			<slot name="sequential">unfilled</slot>
			<slot name="sequential">filled</slot>
			<slot name="sequential">refilled</slot> 
			<br><br>
			Nested:
			<slot name="nested">
				unfilled
				<slot name="nested">
					filled
					<slot name="nested">
						refilled
					</slot>
				</slot>
			</slot> 
			<br><br>
			Content: A B C:
			<slot name="slot-content">A</slot>
			<slot name="slot-content"><content/> B</slot>
			<slot name="slot-conten"><content/> C</slot>
			<br><br>
			Nested content: A B C:
			<slot name="nested-slot-content">
				A
				<slot name="nested-slot-content">
					<content/> B
					<slot name="nested-slot-content">
						<content/> C
					</slot>
				</slot>
			</slot>
			<br><br>
			Mixed content: X A B C Z:
			<slot name="mixed-slot-content">
				X
			</slot>
			<slot name="mixed-slot-content">
				<content/> A
				<slot name="mixed-slot-content">
					<content/> B
				</slot>
				<slot name="mixed-slot-content">
					<content/> C
				</slot>
			</slot> 
			<slot name="mixed-slot-content">
				<content/> Z
			</slot> ` },
	macros: {
		text: object.doc`
			<macro name="list" join="<br>">
				- @include(./path)
			</macro>

			<macro name="list" src="/Test/*"/>
			<br><br>
			<macro name="list" src="/Test/*" join=",<br>"/>
		`},

	Subtree: {
		text: object.doc`
			This is here to test the performance of macros:<br>
				./list <br>
				./tree <br>
				./**/path <br> ` },
}
// Generate pages...
PAGES=100
for(var i=0; i<PAGES; i++){
	Test['Subtree/Page'+i] = {text: 'page: '+i} }

var Config =
module.Config = {
	Export: {
		text: '<button onclick="exportData()">Export</button>' },
	// XXX
	Config: {
		text: object.doc`{
		}` },
	Style: {
		text: object.doc`
		` },
}



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
