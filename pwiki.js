/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('lib/object')
var actions = require('lib/actions')
var features = require('lib/features')



/*********************************************************************/

var path2list = function(path){ 
	return (path instanceof Array ?  path : path.split(/[\\\/]+/g))
		// handle '..' (lookahead) and trim path elements...
		// NOTE: this will not touch the leading '.' or '..'
		.map(function(p, i, l){
			return (i > 0 && (p.trim() == '..' || p.trim() == '.')
					|| (l[i+1] || '').trim() == '..') ? 
				null 
				: p.trim() })
		// cleanup and clear '.'...
		.filter(function(p){ 
			return p != null && p != '' })}

var normalizePath = function(path){ return path2list(path).join('/') }



/*********************************************************************/

// base pWiki object...
var pWiki = object.makeConstructor('pWiki', actions.MetaActions)

// pWiki featureset...
var pWikiFeatures = new features.FeatureSet() 

// base instance constructor...
pWikiFeatures.__actions__ = 
	function(){ return actions.Actions(pWiki()) }



/*********************************************************************/

// XXX should this be art of the main API or a separate entity???
// XXX should we combine page and wiki api???
// 		- pWikiData is wiki api
// 		- pWiki is page api
var pWikiData = {
	__data: null,

	// get a list of matching paths...
	// XXX sort API???
	// 		...results shoulde be sorted via the saved order if available...
	// 		.....or should this be done at a later stage as in gen1???
	match: function(path){
		// path patterns -- "*"
		if(path.indexOf('*') >= 0){
			return [ path ]
		}

		// get the tail...
		var tail = path.split(/\*/g).pop()
		tail = tail == path ? '' : tail

		var pattern = RegExp('^'
			+normalizePath(path)
				// quote regexp chars...
				.replace(/([\.\\\/\(\)\[\]\$\+\-\{\}\@\^\&\?\<\>])/g, '\\$1')

				// convert '*' and '**' to regexp...
				.replace(/\*\*/g, '.*')
				.replace(/^\*|([^.])\*/g, '$1[^\\/]*')
			+'$')

		var data = this.__data || {}
		return Object.keys(data)
				// XXX is this correct???
				.concat(Object.keys(data.__proto__)
					// do not repeat overloaded stuff...
					.filter(function(e){ return !data.hasOwnProperty(e) }))
			// XXX sort???
			.map(function(p){ return tail != '' ? 
				normalizePath(p +'/'+ tail) 
				: p })
			.filter(function(p){ return pattern.test(p) })
	},
	// get/set data at path...
	// XXX should this overwrite or expand???
	// XXX should from be pattern compatible???
	data: function(path, value){
		if(value == null){
			return this.__data ? this.__data[path] : null

		} else {
			this.__data = this.__data || {}
			this.__data[path] = value
			return this
		}
	},
	// move data from path to path...
	// XXX should from be pattern compatible???
	move: function(from, to){
		if(this.__data == null){
			return
		}
		var d = this.__data[from]
		this.clear(from)
		this.__data[to] = d
		return this
	},
	// clear data at path...
	clear: function(path){
		if(this.__data == null){
			return this
		}
		var that = this
		this.match(path).forEach(function(p){
			delete that.__data[p]
		})
		return this
	},

	// XXX
	json: function(data){
	},
}



/*********************************************************************/

// XXX need a startup sequence...
var pWikiPageActions = actions.Actions({
	config: {
		'home-page': 'WikiHome',
		'default-page': 'EmptyPage',

		'system-path': 'System',

		'acquesition-order': [
			'Templates',
		],
		'post-acquesition-order': [],

		'order-unsorted-first': false,
	},

	// pWikiData...
	wiki: null,


	// XXX should this be loca/dump???
	json: ['', function(){ }],


	get length(){
		return this.wiki.match(this.location().path).length },

	resolve: ['Path/Resolve relative path and expand path variables',
		function(path){
			path = normalizePath(path)

			// path variables...
			// XXX make this more modular...
			path
				.replace(/\$NOW|\$\{NOW\}/g, Date.now())
				.replace(/\$TITLE|\$\{TITLE\}/g, this.title())
				.replace(/\$BASE|\$\{BASE\}/g, this.base())
				.replace(/\$INDEX|\$\{INDEX\}/g, this.at())

			// relative paths -- "." and ".."
			if(path.indexOf('.') >= 0){
				path = 
					// '.' or './*'
					path == '.' || /^\.\//.test(path) ? 
						path.replace(/^\./, this.base)
					// '..' or '../*'
					: path == '..' || /^\.\.\//.test(path) ? 
						path.replace(/^\.\./, this.base)
					: path
			}

			return path
		}],
	// XXX should this get a page???
	acquire: ['Path/Acquire the page path that the given path resolves to',
		function(path, no_default){
			var that = this

			// handle paths and relative paths...
			var p = this.get(path)
			var title = p.title()
			path = path2list(p.base())

			var acquire_from = this.config['acquesition-order'] || []
			var post_acquire_from = this.config['post-acquesition-order'] || []

			var _get = function(path, title, lst){
				lst = (lst == null || lst.length == 0) ? [''] : lst
				for(var i=0; i < lst.length; i++){
					var p = path.concat([lst[i], title])
					if(that.exists(p)){
						p = normalizePath(p)
						return that.wiki.data(p) && p
					}
				}
			}

			while(true){
				// get title from path...
				var p = _get(path, title)
					// get title from special paths in path...
					|| _get(path, title, acquire_from)

				if(p != null){
					return p
				}

				if(path.length == 0){
					break
				}

				path.pop()
			}

			// default paths...
			var p = _get(path, title, post_acquire_from)
				// system path...
				|| this.config['system-path']
					&& _get([this.config['system-path']], title)

			// NOTE: this may be null...
			return p 
				|| ((!no_default && title != this.config['default-page']) ? 
					this.acquire('./'+this.config['default-page']) 
					: null)
		}],

	location: ['Page/Get or set location',
		function(value){
			if(value == null){
				return
			}

			// XXX should we set/return a default empty value here???
			this.__location = this.__location || {}

			// get location...
			if(arguments.length == 0){
				return this.__location || this.config['home-page']
			}

			// set location index...
			if(typeof(value) == typeof(123)){
				this.__location.at = value

			// set location path...
			} else if(typeof(value) == typeof('str')){
				this.__location.path = this.resolve(value)
				this.__location.at = 0

			// object...
			} else {
				this.__location = value
			}
		}],
	path: ['Page/Get or set path', 
		function(value){
			// get explcit path from location (acounting for 'at')...
			if(arguments.length == 0){
				var location = this.location()
				return this.order(true)[location.at]
				//return this.wiki.match(location.path)[location.at]

			// move page to path...
			} else if(value != null) {
				this.wiki.move(this.path(), this.resolve(value))
			}
		}],
	title: ['Page/Get or set title',
		function(value){
			if(arguments.length == 0){
				return path2list(this.path()).pop()

			} else if(value != null){
				this.path(this.base() +'/'+ value)
			}
		}]
	base: ['Page/Get or set directory',
		function(base){
			if(arguments.length == 0){
				return path2list(this.path()).slice(0, -1).join('/')

			} else if(base != null){
				this.path(base +'/'+ this.title())
			}
		}]

	attr: ['Page/Get or set attribute',
		function(name, value){
			var d = this.data()
			// get...
			if(arguments.length == 1){
				return d[name]

			// clear...
			} else if(value === undefined){
				delete d[name]

			// set...
			} else {
				d[name] = value
			}
			// XXX is it good to write the whole thing???
			this.data(d)
		}],

	// content shorthands...
	// XXX raw/text/checked/...

	exists: ['Page/Check if path explicitly exists.', 
		function(path){
			path = path || this.path()
			var location = this.location()
			return this.wiki.match(location.path)[location.at] !== undefined
		}],
	// Format:
	//	{
	//		'order': [ <title>, .. ] | undefined,
	//		'order-unsorted-first': <bool>,
	//
	//		// XXX not yet used...
	//		'text': <string>,
	//		'links': [ .. ],
	// 	}
	//
	// XXX cache the data???
	data: ['Page/Get or set data', 
		function(value){
			// get -> acquire page and get it's data...
			if(arguments.length == 0){
				return this.wiki.data(this.acquire())

			// set -> get explicit path and set data to it...
			} else if(value != null) {
				this.wiki.data(this.path(), value || '')
			}
		}],
	clear: ['Page/Clear page', 
		function(){ this.wiki.clear(this.path()) }],

	// NOTE: a clone references the same data, no copying is done.
	clone: ['Page/Get page clone (new reference)', 
		function(){
			//var o = (new this.constructor())
			var o = Object.create(this)
				.location(this.location())

			o.__parent_context = this
			if(this.__order){
				o.__order = this.__order.slice()
			}

			return o
		}],
	end: ['Page/Get parent context of clone', 
		function(){ return this.__parent_context || this }],
	// XXX should this return false on empty path???
	copy: ['Page/Copy page to path', 
		function(path){
			return path != null 
				&& this
					.get(path)
					// NOTE: this is here mainly to maintain the context stack...
					.clone()
						.data(this.data()) }],

	get: ['Page/Get page by path', 
		function(path){
			return this
				.clone()
				.location(path) }],

	at: ['Page/Get index or page at given index', 
		function(n){
			// get current index...
			if(n == null){
				return this.location().at || 0
			}

			// get page at index...

			var l = this.length

			// out of bounds...
			if(n >= l || n < -l){
				return null
			}

			var res = this.clone()

			n = n < 0 ? l - n : n
			// XXX do we min/max n???
			n = Math.max(n, 0)
			n = Math.min(l-1, n)

			res.location(n)

			return res
		}],
	prev: ['Page/Get previous page', 
		function(){
			var i = this.at() - 1
			// NOTE: need to guard against overflows...
			return i >= 0 ? this.at(i) : null }],
	next: ['Page/Get next page', 
		function(){ return this.at(this.at() + 1) }],

	map: ['Page/', 
		function(func){
			var res = []
			for(var i=0; i < this.length; i++){
				var page = this.at(i)
				res.push(func.call(page, page, i))
			}
			return res
		}],
	// XXX add path (str) filters...
	filter: ['Page/', 
		function(func){
			var res = []
			for(var i=0; i < this.length; i++){
				var page = this.at(i)
				func.call(page, page, i) && res.push(page)
			}
			return res
		}],
	each: ['Page/', 
		function(func){ this.map(func) }],
	// XXX reduce???

	// Get/set sibling order...
	//
	//	Get order (title)...
	//	.order()
	//	.order(false)
	//		-> order
	//
	//	Get order (full paths)...
	//	.order(true)
	//		-> order
	//
	//	Save local order (.__order)...
	//	.order('local')
	//		-> order
	//
	//	Save current order...
	//	.order('current')
	//		-> order
	//		NOTE: this is a shorthand for p.order(p.order())
	//
	//	Save list of titles as order...
	//	.order([<title>, .. ])
	//		-> order
	//
	// NOTE: saving order to data is supported ONLY for paths that contain
	// 		one and only one pattern and in the last path segment...
	//
	// XXX test... 
	order: ['Page/Get or set sibling pages order', 
		function(order){
			var parent = this.get('..')
			var path = this.location().path
			var full_paths = false

			// get full paths...
			if(order === true || order === false){
				full_paths = order
				order = null

			// save local order...
			// XXX is this correct???
			} else if(order == 'local'){
				order = this.__order

			// save current order...
			} else if(order == 'current'){
				return this.order(this.order())
			}

			// get order...
			if(order == null){
				//var pages = this.wiki.match(parent.path() + '/*')
				var pages = this.wiki.match(path)
				var order = (this.__order || parent.attr('order') || [])
					// clear all paths that are not currently visible...
					// NOTE: paths may not be visible because they are 
					// 		fitered out by .location().path pattern...
					.filter(function(p){ 
						return pages.indexOf(p) >= 0 })

				// keep the titles only...
				if(!full_paths){
					pages = pages
							.map(function(p){ 
								return path2list(p).pop() })

				// expand titles to full paths...
				} else {
					var base = this.base()
					order = order
						.map(function(t){
							return normalizePath(base +'/'+ t)})
				}

				// sorted...
				if(order.length > 0){
					// get unsorted_first config: 
					// 		page || config || false
					var unsorted_first = parent.attr('order-unsorted-first')
					unsorted_first = unsorted_first == null ? 
						 this.config['order-unsorted-first']
						 : unsorted_first
					unsorted_first = unsorted_first == null ? 
						false 
						: unsorted_first
					// get pages not in order...
					pages = pages
						.filter(function(p){ 
							return order.indexOf(p) < 0 }))
					// build the list... 
					return unsorted_first ?
						pages.concat(order)
						: order.concat(pages)

				// unsorted...
				} else {
					return pages 
				}

			// set global manual order...
			// XXX ugly -- revise... 
			// check if we have a pattern...
			} else if(path2list(path).pop().indexOf('*') >= 0 
					// check if no patterns are in path other than the last elem...
					&& path2list(path).slice(0, -1).join('/').match(/\*/g) == null) {
				parent.attr('order', order)
				delete this.__order

			// set local manual order...
			} else {
				this.__order = order
			}
		}],

	__default_sort_methods__: ['path'],
	__sort_methods__: {
		title: function(a, b){
			return a.page.title() < b.page.title() ? -1
				: a.page.title() > b.page.title() ? 1
				: 0
		},
		path: function(a, b){
			return a.page.path() < b.page.path() ? -1
				: a.page.path() > b.page.path() ? 1
				: 0
		},
		// XXX
		/*
		checked: function(a, b){
			// XXX chech if with similar states the order is kept....
			return a.page.checked() == b.page.checked() ? 0
				: a.page.checked() ? 1
				: -1
		},
		*/
		// XXX date, ...

		// XXX use manual order and palce new items (not in order) at 
		// 		top/bottom (option)...
		// XXX store the order in .__wiki_data
		manual: function(a, b){
			// XXX
			return 0
		},
	},

	// Sort siblings...
	//
	//	Sort pages via default method
	//	.sort()
	//		-> page
	//
	//	Sort pages via method
	//	.sort(method)
	//		-> page
	//
	//	Sort pages via method1, then method2, ...
	//	.sort(method1, method2, ...)
	//		-> page
	//		NOTE: the next method is used iff the previous returns 0, 
	//			i.e. the items are equal.
	//
	// To reverse a specific method, prepend it's name with "-", e.g. 
	// "title" will do the default ascending sort while "-title" will do
	// a descending sort.
	// This is different from the "reverse" method which will simply 
	// reverse the result.
	//
	// NOTE: the sort is local to the returned object.
	// NOTE: the sorted object may loose sync form the actual wiki as the
	// 		list of siblings is cached.
	// 		...the resulting object is not to be stored for long.
	// XXX
	sort: ['Page/', 
		function(){
			var that = this
			var res = this.clone()
			var path = res.path

			var methods = arguments[0] instanceof Array ? 
				arguments[0] 
				: [].slice.call(arguments)

			res.__order_by = methods = methods.length == 0 ?
					(this.__default_sort_methods__ 
					 	|| pWikiPage.__default_sort_methods__)
				: methods

			res.update()

			return res
		}],
	// XXX
	reverse: ['Page/', 
		function(){
			var res = this.clone()

			res.__order_by = (this.__order_by || []).slice()

			var i = res.__order_by.indexOf('reverse')

			i >= 0 ? 
				res.__order_by.splice(i, 1) 
				: res.__order_by.push('reverse')

			res.update()

			return res
		}],
	// XXX not sure if this is the right way to go...
	// XXX
	update: ['Page/', 
		function(){
			var that = this

			if(this.__order || this.__order_by){
				var path = this.path
				var reverse = false

				var sort_methods = this.__sort_methods__ 
					|| pWikiPage.__sort_methods__

				var methods = (this.__order_by 
						|| this.__default_sort_methods__
						|| pWikiPage.__default_sort_methods__)
					.map(function(m){
						var reversed = m[0] == '-'
						m = reversed ? m.slice(1) : m

						if(m == 'reverse'){
							reverse = !reverse
							return null
						}
						m = typeof(m) == typeof('str') ? sort_methods[m]
							: m instanceof Function ? m
							: null

						return m != null ?
							(reversed ? 
								function(){ return -m.apply(this, arguments) } 
								: m) 
							: m
					})
					.filter(function(m){ return !!m })

				// XXX
				//this.__order = this.resolveStarPath(this.location)
				this.__order = this.order()

				if(methods.length > 0){
					var method = function(a, b){
							for(var i=0; i < methods.length; i++){
								var res = methods[i].call(that, a, b)

								if(res != 0){
									return res
								}
							}
							// keep order if nothing else works...
							return a.i - b.i
					}

					this.__order = this.__order
						.map(function(t, i){ return {
							i: i, 
							page: that.get(t),
						} })
						.sort(method)
						.map(function(t){ return t.page.path })
				}

				reverse 
					&& this.__order.reverse()

				this.__location_at = this.__order.indexOf(path)
			}
		}],
})

var pWikiPage = pWikiFeatures.Featre({
	title: '',
	tag: 'page',

	actions: pWikiPageActions,
})



/*********************************************************************/

var pWikiLocalStorage = pWikiFeatures.Featre({
	title: '',
	tag: 'localstorage-store',

	config: {
		'localstorage-key': 'pwiki-gen2-data',
	},

	actions: actions.Actions({
		// XXX do not use .__data
		save: ['',
			function(){ 
				localstorage[this.config['localstorage-key']] = 
					JSON.stringify(this.wiki.__data) }],
	}),

	handlers: [
		// XXX add lifecicle load handler...
		// XXX
		
		[[
			'update', 
			'clear',
		],
			function(){ this.save() }],

		[[
			'path',
			'data',
		], 
			function(){ arguments.length > 1 && this.save() }],
	],
})



var pWikiPouchDBStore = pWikiFeatures.Featre({
	title: '',
	tag: 'pouchdb-store',
})



var pWikiPeerJSSync = pWikiFeatures.Featre({
	title: '',
	tag: 'peerjs-sync',
})



/*********************************************************************/

// XXX should this extend pWiki or encapsulate???
var pWikiUIActions = actions.Actions({
	config: {
	},

	// XXX url?
	// 		- couch url
	// 		- 'local'
	load: ['', function(){}],

	reload: ['', function(){}],

	// XXX navigation...
	// 		...these in addition to default scrolling should focus elements
	up: ['', function(){}],
	down: ['', function(){}],
	left: ['', function(){}],
	right: ['', function(){}],

	togglePages: ['', function(){}],
	toggleWikis: ['', function(){}],

	// should this be in the editor feature???
	toggleEdit: ['', function(){}],
})

var pWikiUI = pWikiFeatures.Featre({
	title: '',
	tag: 'ui',
})



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
