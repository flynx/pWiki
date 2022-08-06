/**********************************************************************
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

var pwpath = require('./path')
var parser = require('./parser')
var filters = require('./filters/base')
var markdown = require('./filters/markdown')


//---------------------------------------------------------------------
// Page...

var relProxy = 
function(name){
	var func = function(path='.', ...args){
		return this.store[name](
			pwpath.relative(this.location, path), 
			...args) } 
	Object.defineProperty(func, 'name', {value: name})
	return func } 
var relMatchProxy = 
function(name){
	var func = function(path='.', strict=this.strict){
		if(path === true || path === false){
			strict = path
			path = '.' }
		return this.store[name](
			pwpath.relative(this.location, path), 
			strict) } 
	Object.defineProperty(func, 'name', {value: name})
	return func }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

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
					pwpath.relative(
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
		return pwpath.split(this.path).pop() },
	//set name(value){ },
	get dir(){
		return pwpath.relative(this.location, '..') },
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
		return this.store.delete(pwpath.relative(this.location, path)) },

	// page data...
	//
	strict: undefined,
	get data(){ return (async function(){
		var that = this
		// NOTE: we need to make sure each page gets the chance to handle 
		// 		its context....
		if(this.isPattern){
			return this
				.map(function(page){
					return page.data }) }
		// single page...
		var res = await this.store.get(this.location, !!this.strict)
		return typeof(res) == 'function' ?
			res.bind(this)
			: res }).call(this) },
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
	match: relMatchProxy('match'), 
	resolve: relMatchProxy('resolve'),
	delete: function(path='.'){
		this.__delete__() 
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
	find: function(path='.', strict=false){
		if(path === true || path === false){
			strict = path
			path = '.' }
		return this.store.find(
			pwpath.relative(this.location, path), strict) },

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
	each: async function*(path){
		var that = this
		// NOTE: we are trying to avoid resolving non-pattern paths unless 
		// 		we really have to...
		path = path ?
			pwpath.relative(this.path, path)
			: this.path
		var paths = path.includes('*') ?
			this.resolve(path)
			: path
		paths = paths instanceof Array ? 
				paths 
			: paths instanceof Promise ?
				await paths
			: [paths]

		for(var path of paths){
			yield that.get('/'+ path) } },

	map: async function(func){
		return this.each().map(func) },
	filter: async function(func){
		return this.each().filter(func) },
	reduce: async function(func, dfl){
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
		this.metadata = 
			{ order: await this.each()
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

// XXX should these be something more generic like Object.assign(..) ???

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

// XXX PATH_VARS need to handle path variables...
// XXX filters (and macros?) should be features for simpler plugin handlng (???)
// XXX STUB filters...
// XXX rename to pWikiPage???
var Page =
module.Page = 
object.Constructor('Page', BasePage, {
	__parser__: parser.parser,

	// Filter that will isolate the page/include/.. from parent filters...
	ISOLATED_FILTERS: 'isolated',

	// list of macros that will get raw text of their content...
	QUOTING_MACROS: ['quote'],

	// templates used to render a page via .text
	PAGE_TEMPLATE: '_text',

	// NOTE: comment this out to make the system fail when nothing is 
	// 		resolved, not even the System/NotFound page...
	// NOTE: we can't use any of the page actions here (like @source(./path)) 
	// 		as if we reach this it's likely all the bootstrap is either also
	// 		not present or broken.
	// NOTE: to force the system to fail set this to undefined.
	NOT_FOUND_ERROR: 'NotFoundError',

	RECURSION_ERROR: 'RecursionError',

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

		wikiword: filters.wikiWord,
		'quote-wikiword': filters.quoteWikiWord,

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
						this.parse(ast, state)
							.iter()
								.flat()
								.join('') 
					state.filters = outer_filters
					return { data: await res } } } },
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
					var [macro, args, body, state, key, handler] = arguments 
					key = key ?? 'included' }
				// positional args...
				var src = args.src
				var recursive = args.recursive || body
				var isolated = args.isolated 

				if(!src){
					return }
				// parse arg values...
				src = await this.parse(src, state)
				var base = this.get(src).path

				handler = handler 
					?? async function(src){
						return this.get(src)
							.parse(
								isolated ? 
									{seen: (state.seen ?? []).slice()} 
									: state) }

				// XXX this is really odd -- works OK for multiple pages 
				// 		and res turns into a string '[object Promise]' 
				// 		for a non-pattern page...
				return this.get(src)
					.each()
					.map(async function(page){
						var full = page.path

						// handle recursion...
						var parent_seen = 'seen' in state
						var seen = state.seen = 
							(state.seen
								?? []).slice()
						// recursion detected...
						//if(seen.includes(full) || full == base){
						if(seen.includes(full)){
							if(!recursive){
								return page.parse(page.get('./'+page.RECURSION_ERROR).raw) }
							// have the 'recursive' arg...
							return page.parse(recursive, state) }
						seen.push(full)

						// load the included page...
						var res = await handler.call(page, full)

						if(!parent_seen){
							delete state.seen }

						return res })
					.join('\n') }),
		// NOTE: the main difference between this and @include is that 
		// 		this renders the src in the context of current page while 
		// 		include is rendered in the context of its page but with
		// 		the same state...
		source: Macro(
			['src'],
			async function(args, body, state){
				return this.macros.include.call(this, 
					'source',
					args, body, state, 'sources', 
					async function(src){
						return this.parse(await this.get(src).raw, state) }) }),
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
					var pages = this.get(src, strict)
					pages = await pages.isArray ?
						// XXX should we wrap this in pages...
						(await pages.raw)
							.map(function(data){
								return that.virtual({text: data}) })
						: await pages.each()
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
					return pages
						.map(function(page, i){
							return [
								that.__parser__.expand(page, text, state),
								// weave in the join block...
								...((join_block && i < pages.length-1) ?
									[that.__parser__.expand(that, join_block, state)]
									: []),
							] })
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
	parse: async function(text, state){
		var that = this
		// .parser(<state>)
		if(arguments.length == 1 
				&& text instanceof Object
				&& !(text instanceof Array)){
			state = text
			text = null }
		state = state ?? {}
		return this.__parser__.parse(this, text, state) },

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
		var data = await this.data
		// no data...
		// NOTE: if we hit this it means that nothing was resolved, 
		// 		not even the System/NotFound page, i.e. something 
		// 		went really wrong...
		if(data == null){
			if(this.NOT_FOUND_ERROR){
				var msg = this.get('./'+ this.NOT_FOUND_ERROR)
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
				data
					.map(function(d){
						return typeof(d) == 'function'?
							d()
							: d.text })
					.flat()
   			: data.text )}).call(this) },
	set raw(value){
		this.__update__({text: value}) },
		//this.onTextUpdate(value) },

	// expanded page text...
	//
	// NOTE: this uses .PAGE_TEMPLATE to render the page.
	// NOTE: writing to .raw is the same as writing to .text...
	get text(){ return (async function(){
		var path = pwpath.split(this.path)
		path.at(-1)[0] == '_'
			|| path.push(this.PAGE_TEMPLATE)

		var tpl = pwpath.join(path)
		var tpl_name = path.pop()
		path = pwpath.join(path)

		// get the template relative to the top most pattern...
		tpl = await this.get(tpl).find(true)
		if(!tpl){
			throw new Error('UNKNOWN RENDER TEMPLATE: '+ tpl_name) }

		// render template in context of page...
		return this.get(path)
			.parse(await this.get(tpl).raw) }).call(this) },
		/*/
		var path = pwpath.split(this.path)
		return [path.at(-1)[0] == '_' ?
				await this.parse()
				: await this.get('./'+ this.PAGE_TEMPLATE).parse()]
			.flat()
			.join('\n') }).call(this) },
		//*/
	set text(value){
		this.__update__({text: value}) },
		//this.onTextUpdate(value) },
})



//---------------------------------------------------------------------

// XXX do we actually need this???
var DOMPage =
module.DOMPage = 
object.Constructor('DOMPage', Page, {
	dom: undefined,

	// XXX might be a good idea to move this up to Page and trigger when 
	// 		done updating...
	onLoad: types.event.Event('onLoad'),
})



//---------------------------------------------------------------------
// System pages/actions...

var System = 
module.System = {
	// base templates...
	//
	// These are used to control how a page is rendered. 
	//
	// pWiki has to have a template appended to any path, if one is not 
	// given then "_text" is used internally.
	//
	// A template is rendered in the context of the parent page, e.g. 
	// for /path/to/page, the actual rendered template is /path/to/page/_text
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
	_text: {
		text: '@include(.)' },
	_raw: {
		text: '@quote(.)' },


	// base system pages...
	//
	// NOTE: these are last resort pages, preferably overloaded in /Templates.
	RecursionError: {
		text: 'RECURSION ERROR: @quote(./path)' },
	NotFoundError: { 
		text: 'NOT FOUND ERROR: @quote(./path)' },


	// page actions...
	//

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





/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
