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

// XXX PATH_VARS
// XXX FUNC need to handle functions in store...
var BasePage =
module.BasePage = 
object.Constructor('BasePage', {
	// root page used to clone new instances via the .clone(..) method...
	//root: undefined,

	// a base page to be used as a base for cloning if root is of a 
	// different "class"...
	//__clone_proto__: undefined,
	
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
			this.onBeforeNavigate(path)
			this.referrer = this.location
			var cur = this.__location = 
				this.resolvePathVars(
					pwpath.relative(
						this.location, 
						path))
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
		return pwpath.basename(this.location) },
	//set name(value){ },
	get dir(){
		return pwpath.dirname(this.location) },
	//set dir(value){ },
	get isPattern(){
		return this.location.includes('*') },
	
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
	//* XXX MATCH
	match: relMatchProxy('match'), 
	/*/
	match: async function(path='.', strict=false){
		if(path === true || path === false){
			strict = path
			path = '.' }
		path = pwpath.relative(this.location, path)
		var res = await this.store.match(path, strict) 
		return res.length == 0 ?
			// XXX are we going outside of match semantics here???
			this.store.find(path) 
			: res },
	//*/
	resolve: relMatchProxy('resolve'),
	delete: function(path='.'){
		this.__delete__(path) 
		return this },

	// XXX should these be implemented here or proxy to .store???
	copy: async function(to){
		this.get(to).data = await this.data
		this.path = to
		return this },
	move: async function(to){
		var from = this.path
		await this.copy(to)
		this.delete(from)
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
					//?? this.location,
					?? this.referrer,
				strict,
			}) },

	// XXX should this be an iterator???
	each: async function*(path){
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
		/*/ XXX MATCH
		paths = paths.length == 0 ?
			[await this.find(path)]
			: paths
		//*/

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
	update: function(...data){
		return Object.assign(this, ...data) },

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

	NESTING_RECURSION_THRESHOLD: 10,

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

	// The page that started the current render...
	//
	// This is set by .text and maintained by .clone(..).
	//
	// NOTE: for manual rendering (.parse(..), ... etc.) this has to be 
	// 		setup manually.
	render_root: undefined,

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
			if(body){
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
		include: Macro(
			['src', 'recursive', 'join', ['strict', 'nonstrict', 'isolated']],
			async function*(args, body, state, key='included', handler){
				var macro = 'include'
				if(typeof(args) == 'string'){
					var [macro, args, body, state, key, handler] = arguments 
					key = key ?? 'included' }
				var base = this.get(this.path.split(/\*/).shift())
				var src = args.src
					&& await base.parse(args.src, state)
				if(!src){
					return }
				var recursive = args.recursive ?? body
				var isolated = args.isolated 
				var strict = args.strict
					&& !args.nonstrict
				var join = args.join 
					&& await base.parse(args.join, state)

				handler = handler 
					?? async function(src){
						return isolated ?
							{data: await this.get(src)
								//.parse({seen: new Set(state.seen ?? [])})}
								.parse({seen: state.seen})}
							: this.get(src)
								.parse(state) }

				var first = true
				for await (var page of this.get(src).asPages(strict)){
					if(join && !first){
						yield join }
					first = false

					var full = page.path

					// handle recursion...
					var parent_seen = 'seen' in state
					var seen = state.seen = 
						new Set(state.seen ?? [])
					// recursion detected...
					if(seen.has(full)
							// nesting path recursion...
							// XXX a more general way to check would be to see if the
							// 		path resolves to the same source (done below) and
							// 		check if the context has changed -- i.e. if the paths
							// 		actually contain anything...
							|| (seen.size % (this.NESTING_RECURSION_THRESHOLD || 10) == 0
								&& new Set([...seen]
									.map(function(p){
										return page.get(p).match()[0] }))
									.size < seen.size)){
						if(recursive == null){
							yield page.get(page.RECURSION_ERROR).parse(state) 
							continue }
						// have the 'recursive' arg...
						yield base.parse(recursive, state) 
						continue }
					seen.add(full)

					// load the included page...
					var res = await handler.call(page, full)

					// NOTE: we only track recursion down and not sideways...
					seen.delete(full)
					if(!parent_seen){
						delete state.seen }

					yield res } }),
		// NOTE: the main difference between this and @include is that 
		// 		this renders the src in the context of current page while 
		// 		include is rendered in the context of its page but with
		// 		the same state...
		source: Macro(
			['src'],
			async function*(args, body, state){
				yield* this.macros.include.call(this, 
					'source',
					args, body, state, 'sources', 
					async function(src){
						return this.parse(this.get(src).raw, state) }) }),
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
			['src', 'filter', 'text', 'join'],
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

				var pages = src ?
						this.get(src).asPages()
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
						: await page.raw

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
							return state.slots[name] },
						{slot: name}) }), 
		'content': ['slot'],

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
		//
		// XXX SORT sorting not implemented yet....
		macro: Macro(
			['name', 'src', 'sort', 'text', 'join', 'else', ['strict', 'nonstrict']],
			// XXX GENERATOR...
			async function*(args, body, state){
			/*/
			async function(args, body, state){
			//*/
				var that = this
				var name = args.name //?? args[0]
				var src = args.src
				var base = this.get(this.path.split(/\*/).shift())
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
					name = await base.parse(name, state)
					// define new named macro...
					if(text){
						;(state.macros = state.macros ?? {})[name] = text
					// use existing macro...
					} else if(state.macros 
							&& name in state.macros){
						text = state.macros[name] } }

				if(src){
					src = await base.parse(src, state)

					var join = _getBlock('join') 

					// expand matches...
					var first = true
					for await(var page of this.get(src).asPages(strict)){
						if(join && !first){
							yield join }
						first = false 
						yield this.__parser__.expand(page, text, state) }
					// else...
					if(first
							&& (text || args['else'])){
						var else_block = _getBlock('else')
						if(else_block){
							yield this.__parser__.expand(this, else_block, state) } } } }),

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
		text = await text
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
	set raw(value){
		this.__update__({text: value}) },
		//this.onTextUpdate(value) },

	// iterate matches or content list as pages...
	//
	// XXX revise name...
	asPages: async function*(path='.', strict=false){
		if(path === true 
				|| path === false){
			strict = path
			path = '.' }
		var page = this.get(path, strict)
		// handle lists in pages (actions, ... etc.)...
		if(!page.isPattern){
			var raw = await page.raw
			yield* raw instanceof Array ?
				raw
					.map(function(p){
						return page.virtual({text: p}) })
				: [page] 
		// each...
		} else {
			yield* page } },

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
			console.warn('UNKNOWN RENDER TEMPLATE: '+ tpl_name) 
			return this.get(this.NOT_FOUND_TEMPLATE_ERROR).parse() }

		// render template in context of page...
		var data = { render_root: this }
		return this.get(path, data)
			.parse(this.get(tpl, data).raw) }).call(this) },
	set text(value){
		this.__update__({text: value}) },
		//this.onTextUpdate(value) },

	// pass on .render_root to clones...
	clone: function(data={}, ...args){
		this.render_root
			&& (data = {render_root: this.render_root, ...data})
		return object.parentCall(Page.prototype.clone, this, data, ...args) },
})



//---------------------------------------------------------------------

var wikiword = require('./dom/wikiword')

var pWikiPageElement =
module.pWikiPageElement = 
object.Constructor('pWikiPageElement', Page, {
	dom: undefined,


	domFilters: {
		// XXX see Page.filters.wikiword for notes...
		wikiword: wikiword.wikiWordText,
	},

	__clone_constructor__: Page,

	__clone_proto: undefined,
	get __clone_proto__(){
		return (this.__clone_proto = this.__clone_proto 
			?? this.__clone_constructor__('/', '/', this.store)) },
	set __clone_proto__(value){
		this.__clone_proto = value },
	
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

	// XXX this is not persistent, is this what we want???
	get title(){
		return this.dom.getAttribute('title')
			|| (this.dom.querySelector('h1') || {}).innerText
			|| this.path },
	set title(value){
		this.dom.setAttribute('title', value) },

	// events...
	//
	__pWikiLoadedDOMEvent: new Event('pwikiloaded'),
	onLoad: types.event.Event('onLoad', function(){
		this.dom.dispatchEvent(this.__pWikiLoadedDOMEvent) }),

	refresh: async function(){
		var dom = this.dom
		dom.innerHTML = await this.text 
		for(var filter of Object.values(this.domFilters)){
			filter
				&& filter.call(this, dom) }
		this.onLoad()
		return this },

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
	// XXX all of these should support pattern pages...
	_text: {
		text: '@include(. isolated join="@source(file-separator)")' },
	_view: {
		text: object.doc`
			<slot name="header">/list @source(./path)/_edit</slot>
			<hr>
			<slot name="content"></slot>
			<hr>
			<slot name="footer"></slot>

			<slot name="content" hidden>
				@include(. join="@source(file-separator)" recursive="")
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
			+'<slot name="header">@source(./path)</slot>'
			+'<slot name="content">'
				+'<macro src="." join="@source(file-separator)">'
					+'<pre class="editor" '
							+'wikiwords="no" '
							+'contenteditable '
							+'oninput="saveContent(\'@source(./path)\', this.innerText)">'
						+'<quote filter="quote-tags" src="."/>'
					+'</pre>' 
				+'</macro>'
			+'</slot>'},
	/*/
	_edit: {
		text: 
			'@source(./path)'
			+'<hr>'
			+'<macro src="." join="@source(file-separator)">'
				+'<pre class="editor" '
						+'wikiwords="no" '
						+'contenteditable '
						+'oninput="saveContent(\'@source(./path)\', this.innerText)">'
					+'<quote filter="quote-tags" src="."/>'
				+'</pre>' 
			+'</macro>'},
	//*/
	edit: {
		text: 
			//'@include(PageTemplate)'
			'@include(_view)'
			+'<slot name="header">@source(../path)</slot>'
			+'<slot name="content">'
				// XXX for some reason this is not called...
				+'<macro src=".." join="@source(file-separator)">'
					+'<pre class="editor" '
							+'wikiwords="no" '
							+'contenteditable '
							+'oninput="saveContent(\'@source(./path)\', this.innerText)">'
						+'<quote filter="quote-tags" src="."/>'
					+'</pre>' 
				+'</macro>'
			+'</slot>'},

	// XXX this does not yet work...
	// XXX "_test" breaks differently than "test"
	//_test: {
	test: {
		text: object.doc`
			@source(_view)
			<slot name="header">HEADER</slot>
			<slot name="content">CONTENT</slot>
			<slot name="footer">FOOTER</slot> `},


	// XXX debug...
	_path: {text: '@source(./path join=" ")'},


	list: {
		text: object.doc`
			<slot name="header">
				/list
				<a href="#@source(../../path)/list">&#x21D1;</a>
				@source(../path)
			</slot>
			<macro src="../*" join="@source(line-separator)">
				<a href="#@source(./path)/list">&#x21B3;</a>
				<a href="#@source(./path)">@source(./name)</a>
				<a href="#@source(./path)/delete">&times;</a>
			</macro>` },
	// XXX this is really slow...
	tree: {
		text: object.doc`
			<macro src="../*">
				<div>
					<a href="#@source(./path)">@source(./name)</a>
					<a href="#@source(./path)/delete">&times;</a>
					<div style="padding-left: 30px">
						@source(./tree)
					</div>
				</div>
			</macro>` },
	all: {
		text: `@include(../**/path join="<br>")`},
	info: {
		text: object.doc`
			Path: @source(../path)<br>
			Resolved path: @source(../resolved)<br>
			Referrer: @source(../referrer)<br>
			Renderer: @source(../renderer)<br>
			ctime: @source(../ctime)<br>
			mtime: @source(../mtime)<br>
			<hr>
			<pre wikiwords="no"><quote filter="quote-tags" src=".."/></pre> ` },

	// page parts...
	//
	'line-separator': { text: '<br>' },
	'file-separator': { text: '<hr>' },

	// base system pages...
	//
	// NOTE: these are last resort pages, preferably overloaded in /Templates.
	RecursionError: {
		text: 'RECURSION ERROR: @quote(../path)' },
	NotFoundError: { 
		text: 'NOT FOUND ERROR: @quote(./path)' },
	NotFoundTemplateError: {
		text: 'NOT FOUND TEMPLATE ERROR: @quote(../path)' },

	DeletingPage: {
		text: 'Deleting: @source(../path)' },

	PageTemplate: {
		text: object.doc`
			<slot name="header">@source(./path)/_edit</slot>
			<hr>
			<slot name="content"></slot>
			<hr>
			<slot name="footer"></slot> ` },


	// page actions...
	//

	// metadata...
	//
	renderer: function(){
		return (this.render_root || {}).path },
	referrer: function(){
		return this.referrer || this.path },
	path: function(){
		return this.get('..').path },
	location: function(){
		return this.get('..').path },
	// XXX this can be a list for pattern paths...
	resolved: async function(){
		return this.get('..').resolve() },
	dir: function(){
		return this.get('..').dir },
	name: function(){
		return this.get('..').name },
	title: function(){
		var p = this.get('..')
		return p.title 
			?? p.name },
	ctime: function(){
		return this.get('..').data.ctime ?? '' },
	mtime: function(){
		return this.get('..').data.mtime ?? '' },


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
		var target = this.get('..')

		target.delete()

		// redirect...
		this.render_root
			&& (this.render_root.location = this.referrer)
		// show info about the delete operation...
		return target.get('DeletingPage').text },

	// XXX System/back
	// XXX System/forward
	// XXX System/sort
	// XXX System/reverse
	

	// XXX broken...
	test_list: function(){
		return 'abcdef'.split('') },
	test_slots: {
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
}

var Settings =
module.Settings = {
	Export: {
		text: '<button onclick="exportData()">Export</button>' },
	// XXX
	Config: {
		text: '{}' },
}





/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
