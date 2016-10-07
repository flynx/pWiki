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

var macro = require('macro')



/*********************************************************************/

// Split path into a list and handle special path elements...
//
// The path is split via '/' or '\', no difference is made between the 
// two styles, e.g. 'a/b' is the same as 'a\b'.
//
// Consecutive '/' or '\' are treated as one, e.g. 'a///b' and 'a/b' 
// are the same.
//
// Special path items supported:
// 	"."		- Current position indicator
// 			  this is simply removed from positions other than 0
// 				a/./b/c		-> a/b/c
// 				./b/c		-> ./b/c
//  ".."	- Consumes path item above (pop) / up one level
// 				a/../b/c	-> b/c
// 				../b/c		-> ../b/c
//	">>"	- Consumes path item below (shift)
// 				a/>>/b/c	-> a/c
// 				a/b/c/>>	-> a/b/c	(XXX ???)
//
// NOTE: the path is handled out of context, this leading '.' and '..' 
// 		are left as-is.
// NOTE: '>>' has no effect when at last position (XXX ???)
var path2list =
module.path2list = function(path){ 
	return (path instanceof Array ?  path : path.split(/[\\\/]+/g))
		// handle '..' (lookahead) and trim path elements...
		// NOTE: this will not touch the leading '.' or '..'
		.map(function(p, i, l){
			// remove '..' and '.' out at positions > 0...
			return (i > 0 && (p.trim() == '..' || p.trim() == '.')
					// remove items followed by '..'...
					|| (l[i+1] || '').trim() == '..'
					// remove items preceded by '>>'...
					|| (l[i-1] || '').trim() == '>>') ? 
				null 
				: p.trim() })
		// cleanup and clear '>>'...
		.filter(function(p){ 
			return p != null 
				&& p != '' 
				&& p != '>>' })}

// Normalize path...
//
// This is the same as path2list(..) but also joins the path with '/'
var normalizePath =
module.normalizePath = function(path){ return path2list(path).join('/') }


var path2re = 
module.path2re = function(path){
	return RegExp('^'
		+normalizePath(path)
			// quote regexp chars...
			.replace(/([\.\\\/\(\)\[\]\$\+\-\{\}\@\^\&\?\<\>])/g, '\\$1')

			// convert '*' and '**' to regexp...
			.replace(/\*\*/g, '.*')
			.replace(/^\*|([^.])\*/g, '$1[^\\/]*')
		+'$')}



/*********************************************************************/

// pWiki featureset...
var pWikiFeatures = 
module.pWikiFeatures = new features.FeatureSet() 

/*
// base pWiki object...
var pWiki = 
module.pWiki = object.makeConstructor('pWiki', actions.MetaActions)

// base instance constructor...
pWikiFeatures.__actions__ = 
	function(){ return actions.Actions(pWiki()) }
//*/



/*********************************************************************/

var BaseData = {
	// Macro acces to standard page attributes (paths)...
	'System/title': function(){ return { text: this.get('..').title() } },
	'System/path': function(){ return { text: this.base() } },
	'System/dir': function(){ return { text: this.get('..').base() } },
	'System/location': function(){ return { text: this.base() } },
	'System/resolved': function(){ return { text: this.get('..').acquire() } },

	// page data...
	//
	// NOTE: special case: ./raw is treated a differently when getting .text
	// 		i.e:
	// 			.get('./raw').text
	// 		is the same as:
	// 			.get('.').raw
	'System/raw': function(){ return { text: this.get('..').raw() } },
	'System/text': function(){ return { text: this.get('..').text() } },

	// XXX update these to the new format -- must return an object...
	/*
	// XXX move this to Wiki.children + rename...
	'System/list': function(){
		var p = this.dir

		return Object.keys(this.__wiki_data)
			.map(function(k){
				if(k.indexOf(p) == 0){
					return path2lst(k.slice(p.length)).shift()
				}
				return null
			})
			.filter(function(e){ return e != null })
			.sort()
			.map(function(e){ return '['+ e +']' })
			.join('<br>')
	},
	// list links to this page...
	'System/links': function(){
		var that = this
		var p = this.dir

		var res = []

		var wiki = this.__wiki_data
		Object.keys(wiki).forEach(function(k){
			(wiki[k].links || []).forEach(function(l){
				(l == p || that.get(path2lst(l).slice(0, -1)).acquire('./'+path2lst(l).pop()) == p)
					&& res.push([l, k])
			})
		})

		return res
			//.map(function(e){ return '['+ e[0] +'] <i>from page: ['+ e[1] +']</i>' })
			.map(function(e){ return '['+ e[1] +'] <i>-&gt; ['+ e[0] +']</i>' })
			.sort()
			.join('<br>')
	},
	//*/

	// Page modifiers/actions...
	// XXX these needs redirecting...
	//'System/sort': function(){ return this.get('..').sort() },
	//'System/reverse': function(){ return this.get('..').reverse() },
	/*
	'System/delete': function(){
		var p = this.dir
		delete this.__wiki_data[p]
		return this.get('..') 
	},
	//*/
}



/*********************************************************************/

// XXX should this be art of the main API or a separate entity???
// XXX should we combine page and wiki api???
// 		- pWikiData is wiki api
// 		- pWiki is page api
var pWikiData =
module.pWikiData = {
	__data: null,

	// XXX
	search: function(query){
	},

	// Get a list of matching paths...
	//
	// XXX sort API???
	// 		...results shoulde be sorted via the saved order if available...
	// 		.....or should this be done at a later stage as in gen1???
	match: function(path){
		var data = this.__data || {}

		if(path == null){
			return []
		}

		// strict path...
		if(path.indexOf('*') < 0){
			return path in data ? [ path ] : []
		}

		var pattern = path2re(path)

		return Object.keys(data)
				// XXX is this correct???
				.concat(Object.keys(data.__proto__)
					// do not repeat overloaded stuff...
					.filter(function(e){ return !data.hasOwnProperty(e) }))
			// XXX sort???
			// XXX
			.filter(function(p){ return pattern.test(p) })
	},

	// Get/set data at path...
	//
	// XXX should this overwrite or expand???
	// XXX should from be pattern compatible???
	data: function(path, value){
		// get the data...
		if(value == null){
			if(this.__data == null){
				return null
			}

			var data = this.__data[path]

			return data == null ? null
				: data instanceof Function ? data
				: JSON.parse(JSON.stringify(data)) 

		// set the data...
		} else {
			this.__data = this.__data || {}
			this.__data[path] = JSON.parse(JSON.stringify(value))
			return this
		}
	},

	// Move data from path to path...
	//
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

	// Clear a path...
	//
	clear: function(path){
		if(this.__data == null){
			return this
		}
		this.remove(this.match(path))
		return this
	},

	// explicitly remove path...
	//
	// NOTE: this is similar to .clear(..) but will not expand patterns, 
	// 		thus only one page is is removed per path.
	remove: function(path){
		path = arguments.length > 1 ? [].slice.call(arguments) 
			: path instanceof Array ? path 
			: [path]
		var data = this.__data

		path.forEach(function(p){
			delete data[p]
		})

		return this
	},

	// XXX
	json: function(data){
		if(arguments.length == 0){
			return JSON.parse(JSON.stringify(this.__data))

		} else {
			this.__data = data
		}
	},
}




/*********************************************************************/

// Base pWiki page API...
//
// Page data format:
//	{
//		'order': [ <title>, .. ] | undefined,
//		'order-unsorted-first': <bool>,
//
//		'text': <string>,
//
//		// XXX not yet used...
//		'links': [ .. ],
// 	}
//
var pWikiBase =
module.pWikiBase = actions.Actions({
	config: {
		'home-page': 'WikiHome',
		'default-page': 'EmptyPage',
		'no-match-page': 'NoMatch',

		'system-path': 'System',

		'acquesition-order': [
			'Templates',
		],
		'post-acquesition-order': [],

		'order-unsorted-first': false,

		// sorting...
		'default-sort-methods': [
			'path',
		],
	},

	// pWikiData...
	wiki: null,


	// XXX should this be local/dump???
	json: ['', function(){ }],


	// Refresh path cache...
	//
	refresh: ['', 
		function(force){
			// get/set location and base fields...
			var location = this.__location = this.__location || {}
			var path = location.path = location.path 
				|| this.config['home-path']
				|| 'WikiHome'
			var at = location.at || 0

			// get location cache...
			var match = location.match

			// refresh the cache...
			if(match == null || force){
				this.order(force)
			}
		}],


	get length(){
		// special case -- non-pattern path...
		if(this.location().path.indexOf('*') < 0){
			return 1
		}

		this.refresh()

		return this.location().match.length 
	},


	// Location and path API...

	// Resolve path statically...
	//
	// This will:
	// 	- expand variables
	// 	- resolve relative paths ('.', '..', and '>>')
	//
	// Supported variables:
	// 	$NOW		- resolves to current date (same as Date.now())
	//
	// 	$PATH		- resolves to page path (same as .path())
	// 	$BASE		- resolves to page base path (same as .base())
	// 	$TITLE		- resolves to page title (same as .title())
	//
	// 	$INDEX		- resolves to page index (same as .at())
	//
	// NOTE: all variables are resolved relative to the page from which 
	// 		.resolve(..) was called, e.g. the following two are equivalent:
	// 			<page>.resolve('$PATH')
	// 			<page>.path()
	// NOTE: this will not resolve path patterns ('*' and '**')
	resolve: ['Path/Resolve relative path and expand path variables',
		function(path){
			path = path || this.path()
			// path variables...
			// XXX make this more modular...
			path = path
				// NOTE: these are equivalent to '..' and '.' but not 
				// 		identical -- the variables are useful for things
				// 		like moving a page to:
				// 			"Trash/$PATH"
				// 		...to move the above page out of trash move it to:
				// 			">>/$PATH"
				.replace(/\$PATH|\$\{PATH\}/g, this.path())
				.replace(/\$BASE|\$\{BASE\}/g, this.base())

				.replace(/\$TITLE|\$\{TITLE\}/g, this.title())
				.replace(/\$INDEX|\$\{INDEX\}/g, this.at())

				.replace(/\$NOW|\$\{NOW\}/g, Date.now())
				
			path = normalizePath(path)

			// relative paths -- "." and ".."
			if(path.indexOf('.') >= 0){
				path = 
					// '.' or './*'
					path == '.' || /^\.\//.test(path) ? 
						normalizePath(path.replace(/^\./, this.path()))
					// '..' or '../*'
					: path == '..' || /^\.\.\//.test(path) ? 
						normalizePath(path.replace(/^\.\./, this.base()))
					: path
			}

			return path
		}],
	// XXX should this get a page???
	acquire: ['Path/Acquire the page path that the given path resolves to',
		function(path, no_default){
			var that = this

			// handle paths and relative paths...
			var p = this.get(path || this.path())
			var title = p.title()
			path = path2list(p.base())

			var acquire_from = this.config['acquesition-order'] || []
			var post_acquire_from = this.config['post-acquesition-order'] || []

			var _get = function(path, title, lst){
				lst = (lst == null || lst.length == 0) ? [''] : lst
				for(var i=0; i < lst.length; i++){
					var p = normalizePath(path.concat([lst[i], title]))
					if(that.exists(p)){
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
			if(value === null){
				return
			}

			var location = this.__location || this.refresh().location()

			// get location...
			if(arguments.length == 0){
				return location
			}

			// set location index...
			if(typeof(value) == typeof(123)){
				location.at = value

			// set location path...
			} else if(typeof(value) == typeof('str')){
				this.__location = {
					path: this.resolve(value),
					at: 0,
				}

			// object...
			} else {
				this.__location = value

				return
			}

			this.refresh(true)
		}],
	// XXX pattern does not match anything needs to be handled correctly...
	// XXX do we need to normalize 'at'???
	path: ['Page/Get or set path', 
		function(value){
			// get explcit path from location (acounting for 'at')...
			if(arguments.length == 0){
				var location = this.location()
				return location.match[location.at]
					|| this.config['no-match-page']
					|| ''

			// move page to path...
			} else if(value != null) {
				this.wiki.move(this.path(), this.resolve(value))
				this.location(value)
			}
		}],
	title: ['Page/Get or set title',
		function(value){
			if(arguments.length == 0){
				return path2list(this.path()).pop() || ''

			} else if(value != null){
				this.path(this.base() +'/'+ value)
			}
		}],
	base: ['Page/Get or set directory',
		function(base){
			if(arguments.length == 0){
				return path2list(this.path()).slice(0, -1).join('/')

			} else if(base != null){
				this.path(base +'/'+ this.title())
			}
		}],

	exists: ['Page/Check if path explicitly exists.', 
		function(path){
			var at = path ? 0 : this.at()
			path = path || this.path()

			return this.wiki.match(this.get(path).location().path)[at] !== undefined
		}],

	// NOTE: a clone references the same data and .config, no copying 
	// 		is done.
	clone: ['Page/Get page clone (new reference)', 
		function(){
			var o = Object.create(this)
				.location(JSON.parse(JSON.stringify(this.location())))

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


	// Order and iteration API...

	at: ['Page/Get index or page at given index', 
		function(n){
			// get current index...
			if(n == null){
				return this.location().at || 0
			}

			// get page at index...

			var l = this.length

			// self...
			if(n == this.at()){
				return this

			// out of bounds...
			} else if(n >= l || n < -l){
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
	// NOTE: a filter can take a function or a string path pattern...
	// NOTE: only absolute path patterns are supported...
	filter: ['Page/', 
		function(func){
			// we got a sting pattern...
			if(typeof(func) == typeof('str')){
				var pattern = path2re(func)
				func = function(page){ 
					return pattern.test(page.path()) }
			}

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
	//	Get order...
	//	.order()
	//		-> order
	//
	//	Force get order...
	//	.order(true)
	//	.order('force')
	//		-> order
	//		NOTE: this will overwrite cache.
	//
	//	Get saved order...
	//	.order('saved')
	//		-> order
	//
	//	Save list of paths as order explicitly...
	//	.order([<title>, .. ])
	//		-> page
	//
	//	Save order persistently...
	//	.order('save')
	//		-> page
	//
	//	Remove set order, local if available else persistent...
	//	.order('clear')
	//		-> page
	//
	//	Remove all ordering...
	//	.order('clear-all')
	//		-> page
	//
	//
	// List of paths passed to .order(..) can contain a '*' to indicate
	// the pages not specified by the list.
	// By default all unspecified pages will get appended to the resulting
	// list, same as appending a '*' to the tail of the list passed to 
	// .order(..)
	//
	//
	// NOTE: saving order to data is supported ONLY for paths that contain
	// 		one and only one pattern and in the last path segment...
	// NOTE: clearing persistent ordering will remove a page (parent) from 
	// 		data if it contains nothing but the order...
	// NOTE: this will also maintain page position within order (.at())
	//
	// XXX (LEAK?) not sure if the current location where order is stored
	// 		is the right way to go -- would be really hard to clean out...
	// 		...might be a good idea to clear pattern paths that match no 
	// 		pages from data...
	// XXX should we split order persistence into two?
	// 			- local .__order
	// 			- global
	// 		...and how should we move from one to the other???
	order: ['Page/Get or set sibling pages order', 
		function(order){
			var location = this.location()
			var path = location.path || ''
			var page = (location.match || [])[location.at || 0]

			// get order...
			if(order == null || order == 'force' || order === true){
				// no patterns in path -> no ordering...
				if(path.indexOf('*') < 0){
					if(!location.match){
						location.match = [ path ]
						this.location(location)
					}
					return [ path ]
				}

				// get cached order if not forced...
				if(location.match != null && order == null){
					return location.match
				}

				// XXX should we check if this returns a function???
				var parent = this.wiki.data(path) || {}
				var pages = this.wiki.match(path)
					// filter out paths containing '*'
					.filter(function(p){ return p.indexOf('*') < 0 })
				var order = (this.__order || parent.order || [])
					// clear all paths that are not currently visible...
					// NOTE: paths may not be visible because they are 
					// 		filtered out by .location().path pattern...
					.filter(function(p){ 
						return pages.indexOf(p) >= 0 || p == '*' })

				// order present...
				if(order.length > 0){
					// get the spot where to place pages not in order...
					// NOTE: if '*' is not in order, then unsorted pages
					// 		will get appended to the end...
					// NOTE: only one '*' is supported...
					var i = order.indexOf('*')
					i = i == -1 ? order.length : i

					// get pages not in order...
					pages = pages
						.filter(function(p){ 
							return order.indexOf(p) < 0 })

					// build the list... 
					order.splice.apply(order, [i, 1].concat(pages))

				// unsorted -- simply list the pages...
				} else {
					order = pages 
				}

				// save cache...
				location.match = order
				location.at = page ? order.indexOf(page) : 0
				this.location(location)

				return order.slice()

			// get saved order...
			} else if(order == 'saved'){
				return this.__order 
					// XXX should we check if this returns a function???
					|| (this.wiki.data(path) || {}).order
					|| []

			// clear order...
			// XXX should this:
			// 		- clear all always
			// 		- explicitly clear only local or persistent
			// 		- progressively clear local then persistent (current)
			} else if(order == 'clear' || order == 'clear-all'){
				var local = !!this.__order

				// local order...
				delete this.__order

				// clear persistent order...
				if(!local || order == 'clear-all'){
					// XXX should we check if this returns a function???
					var parent = this.wiki.data(path)

					// persistent order...
					if(parent && parent.order){
						delete parent.order

						// remove if empty...
						if(Object.keys(parent).length == 0){
							this.wiki.remove(path)		

						// save...
						} else {
							this.wiki.data(path, parent)
						}
					}
				}

			} else if(order == 'save') {
				// XXX should we check if this returns a function???
				var parent = this.wiki.data(path) || {}

				var order = parent.order = this.__order || this.order()

				this.wiki.data(path, parent)
				delete this.__order

			// set order...
			} else {
				this.__order = order
			}

			// save cache...
			this.order(true)
		}],

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
					(this.config['default-sort-methods'] || ['path'])
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
					|| pWikiBase.__sort_methods__

				var methods = (this.__order_by 
						|| this.config['default-sort-methods'] 
						|| ['path'])
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


	// Data API...

	data: ['Page/Get or set data', 
		function(value){
			// get -> acquire page and get it's data...
			if(arguments.length == 0){
				var d = this.wiki.data(this.acquire()) || {}
				return d instanceof Function ? d.call(this) : d

			// set -> get explicit path and set data to it...
			} else if(value != null) {
				this.wiki.data(this.path(), value || {})
			}
		}],
	clear: ['Page/Clear page', 
		function(){ this.wiki.clear(this.path()) }],
	attr: ['Page/Get or set attribute',
		function(name, value){
			var d = this.data()
			// get...
			if(arguments.length == 1){
				return d[name] === undefined ? 
					// force returning undefined...
					actions.UNDEFINED 
					: d[name]

			// clear...
			} else if(value === undefined){
				delete d[name]

			// set...
			} else {
				d[name] = value
			}

			// write the data...
			// XXX is it good to write the whole thing???
			this.data(d)
		}],

	// shorthands...
	raw: ['Page/',
		function(value){
			return arguments.length == 0 ? 
				(this.attr('text') || '') 
				: this.attr('text', value) }],
	checked: ['Page/', 
		function(value){
			return arguments.length == 0 ? 
				!!this.attr('checked') 
				: this.attr('checked', value || undefined) }],


	// Init... 
	//
	// Special config attrs:
	// 	wiki		- wiki object
	//
	// NOTE: the input object may get modified... (XXX)
	__init__: [function(config){
		config = config || {}

		if('wiki' in config){
			this.wiki = config.wiki
			// XXX don't like modifying the input...
			delete config.wiki
		}

		var cfg = this.config = Object.create(this.config)
		return function(){
			// copy the given config...
			Object.keys(config).forEach(function(k){ 
				cfg[k] = JSON.parse(JSON.stringify(config[k]))
			})
		}
	}]
})


// Data processing and macros...
//
var pWikiMacros =
module.pWikiMacros = actions.Actions(pWikiBase, {
	__macro_parser__: macro,

	config: {
	},

	text: ['Page/',
		function(value){
			return arguments.length == 0 ? 
				(this.title() == 'raw' ?
					(this.raw() || '')
					: (this.__macro_parser__ || pWikiMacros.__macro_parser__)
						.parse(this, this.raw()))
				: this.raw(value) }],
	code: ['Page/',
		function(value){
			return arguments.length == 0 ? 
				this.text().text()
				// XXX should we un-encode here???
				: this.text(value) }],

	// XXX
	links: ['Page/',
		function(){
			// XXX
		}],


	// Init...
	//
	// Special config attrs:
	// 	macro		- macro processor (optional)
	//
	__init__: [function(config){
		if('macro' in config){
			this.__macro_parser__ = config.macro
			// XXX don't like modifying the input...
			delete config.macro
		}
	}],
})


// pWiki Page...
//
// NOTE: looks like multiple inheritance, feels like multiple inheritance
// 		but sadly is not multiple inheritance...
// 		...though, functionally, this is 90% there, about as far as we 
// 		can get using native JS lookup mechanisms, or at least the 
// 		farthest I've pushed it so far...
var pWikiPage =
module.pWikiPage = object.makeConstructor('pWikiPage', 
	actions.mix(
		// XXX not sure if we need this here...
		//actions.MetaActions,
		pWikiBase, 
		pWikiMacros))



/*********************************************************************/


// Experiment with hidden promises...
var hiddenPromise = 
module.hiddenPromise = {
	__promise: null,

	then: function(func){
		var that = this

		// trigger lazy functions if present...
		if(this.__lazy != null){
			var lazy = this.__lazy
			delete this.__lazy

			var res = this
				.then(lazy)
				.then(func)

			// clear any lazy stuff queued by the above to avoid any 
			// side-effects...
			//
			// XXX should this be done here (sunc) or in  a .then(..)???
			delete this.__lazy

			return res
		}

		// no promise...
		if(this.__promise == null){
			this.__promise = new Promise(function(resolve, reject){
				resolve(func.call(that))
			})

		// existing promise...
		} else {
			this.__promise = this.__promise.then(function(){
				return func.apply(that, [].slice.call(arguments))
			})
		}
		return this
	},
	// NOTE: this ignores the function if there is no promise...
	// 		XXX not sure if this is correct...
	catch: function(func){
		if(this.__promise != null){
			this.__promise = this.__promise.catch(func)
		}
		return this
	},

	// Like then, but the function will get called only if a .then(..) is
	// called right after...
	//
	// NOTE: only the last lazy function is stored, the rest are discarded.
	lazy: function(func){
		this.__lazy = func
		return this
	},
	clearLazy: function(){
		delete this.__lazy
		return this
	},

	// example method (sync)...
	//
	// Protocol:
	// 	.data()			- "get" data value...
	// 	.data('new value')
	// 					- set data value...
	//
	// In both cases the method will return the object (this)
	//
	// In both cases the internal promise when resolved will get passed
	// the value, in both cases the old value...
	//
	// A more full example:
	// 	hiddenPromise
	// 		// get and print the value (undefined)...
	// 		.data()
	// 			.then(function(value){ console.log(value) })
	// 		// set a new value...
	// 		.data('new value')
	// 		// get and print the new value...
	// 		.data()
	// 			.then(function(value){ console.log(value) })
	//
	sdata: function(d){
		this.clearLazy()

		// get...
		if(arguments.length == 0){
			this.lazy(function(){ return this.__data })

		// set...
		} else {
			this.then(function(){ 
				var res = this.__data
				this.__data = d 
				return res 
			})
		}
		return this
	},

	// async data...
	//
	// NOTE: this is the same as above but will do it's work async (after
	// 		a second)...
	data: function(d){
		var that = this
		this.clearLazy()

		// get...
		if(arguments.length == 0){
			//this.then(function(){
			this.lazy(function(){
				return new Promise(function(r){
					setTimeout(function(){ r(that.__data) }, 1000) 
				})
			})

		// set...
		} else {
			this.then(function(){
				return new Promise(function(r){
					setTimeout(
						function(){ 
							var res = that.__data
							that.__data = d 
							r(res)
						},
						1000) 
				})
			})
		}
		return this
	},
}




/*********************************************************************/

var pWikiLocalStorage = pWikiFeatures.Feature({
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



var pWikiPouchDBStore = pWikiFeatures.Feature({
	title: '',
	tag: 'pouchdb-store',
})



var pWikiPeerJSSync = pWikiFeatures.Feature({
	title: '',
	tag: 'peerjs-sync',
})



//---------------------------------------------------------------------

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

var pWikiUI = pWikiFeatures.Feature({
	title: '',
	tag: 'ui',
})



/*********************************************************************/

module._test_data = {
	'System/EmptyPage': {
		text: '[@source(./path)] is empty...'
	},
	'WikiMain': {},
	'folder/page1': {},
	'folder/page2': {},
	'folder/page3': {},
}
// XXX not sure if this is a good way to do this -- needs to be reusable
// 		for different stores...
module._test_data.__proto__ = BaseData

module._test = function(){
	var wiki = Object.create(pWikiData)
	wiki.__data = Object.create(module._test_data)

	var page = new pWikiPage({
		wiki: wiki,
	})

	// XXX do some testing...
	// XXX

	return page
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
