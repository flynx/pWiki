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

var BaseData = 
module.BaseData = {
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
	'System/html': function(){ return { text: this.get('..').html() } },

	// list all path elements on a level, including empty path sections...
	// XXX update these to the new format -- must return an object...
	// XXX move this to Wiki.children + rename...
	// XXX
	'System/list': function(){
		return 'NoImplemented'

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
	// XXX this is done, though we cant use this until we solve .html(..)
	// 		macro recursion issues...
	// XXX cache the result + need a strategy to drop parts of cache when
	// 		irrelevant -- when path/text changes...
	// XXX might be a good idea to move this to the store, at least the
	// 		management, part...
	'System/links': function(){
		return 'NoImplemented'
		var that = this
		var p = this.path()

		var res = []

		this.wiki.match('**')
			.forEach(function(p){
				var pa = that.acquire(p)

				that.get(p)
					// XXX this will render the page which might not be 
					// 		the best idea in some cases...
					.links()
						.forEach(function(l){
							var la = that.acquire(l)
							if(l == p || la == p || la == pa){
								res.push([l, p])
							}
						})
			})

		// cache the result...
		// XXX
		this.attr('rev-links', res)

		return res
			//.map(function(e){ return '['+ e[0] +'] <i>from page: ['+ e[1] +']</i>' })
			.map(function(e){ return '['+ e[1] +'] <i>-&gt; ['+ e[0] +']</i>' })
			.sort()
			.join('<br>')
	},

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
	search: function(query, sort){
	},

	// Get a list of matching paths...
	//
	// XXX sort path API...
	// 		...should we be able to spec sort in path???
	// XXX should we account for order here???
	match: function(path, sort, count, from){
		var data = this.__data || {}
		from = from || 0

		// XXX normalize this to account for '*'
		//var order = (data[path] || {}).order || []

		if(path == null){
			return []
		}

		// strict path...
		if(path.indexOf('*') < 0){
			return path in data ? [ path ] : []
		}

		sort = sort || (data[path] || {}).sort || ['order']
		sort = sort instanceof Array ? sort : [sort]

		var order = (data[path] || {}).order || []


		var pattern = path2re(path)

		return Object.keys(data)
				// XXX is this correct???
				.concat(Object.keys(data.__proto__)
					// do not repeat overloaded stuff...
					.filter(function(e){ return !data.hasOwnProperty(e) }))
			.filter(function(p){ return pattern.test(p) })

			// page...
			.slice(from, count ? from + count : undefined)

			// prepare to sort...
			.map(function(p, i){ 
				return sort
					.map(function(method){
						// explicit order...
						if(method instanceof Array){
							i = method.indexOf(p)
							i = i < 0 ? method.indexOf('*') : i
							i = i < 0 ? method.length : i
							return i
						}

						// drop the reversal marker...
						method = method[0] == '-' ? method.slice(1) : method

						// stored order...
						if(method == 'order'){
							i = order.indexOf(p)
							i = i < 0 ? order.indexOf('*') : i
							i = i < 0 ? order.length : i
							return i
						}

						return method == 'path' ? p.toLowerCase()
							: method == 'Path' ? p
							: method == 'title' ? path2list(p).pop().toLowerCase()
							: method == 'Title' ? path2list(p).pop() 

							// special case...
							: method == 'checked' ? (data[p][method] ? 1 : 0)

							// attr...
							: data[p][method]
					})
					.concat([i, p])
			})
			// sort...
			.sort(function(a, b){ 
				for(var i=0; i < sort.length+1; i++){
					var reverse = (sort[i] || '')[0] == '-' ? -1 : 1
					if(a[i] == b[i]){
						continue
					} 
					return (a[i] > b[i] ? 1 : -1) * reverse
				}
				return 0
			})
			// cleanup...
			.map(function(e){ return e.pop() })
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


	// Location and path API...


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

				// NOTE: we are returning here without a refresh to avoid
				// 		recursion...
				// NOTE: a refresh will get called when the location value
				// 		is accessed for the first time...
				// XXX should we clear .match here???
				return
			}

			this.refresh(true)
		}],
	exists: ['Page/Check if path explicitly exists.', 
		function(path){
			var at = path ? 0 : this.at()
			path = path || this.path()

			return this.wiki.match(this.get(path).location().path)[at] !== undefined
		}],

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


	// Object API...
	
	// NOTE: a clone references the same data and .config, no copying 
	// 		is done.
	clone: ['Page/Get page clone (new reference)', 
		function(){
			var o = Object.create(this)
				.location(JSON.parse(JSON.stringify(this.location())))

			o.__parent_context = this

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

	get length(){
		// special case -- non-pattern path...
		if(this.location().path.indexOf('*') < 0){
			return 1
		}

		this.refresh()

		return this.location().match.length 
	},

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
	// NOTE: the actual sorting/ordering is done in .wiki.match(..)
	//
	// XXX should we also cache the saved sort and order???
	// XXX (LEAK?) not sure if the current location where order is stored
	// 		is the right way to go -- would be really hard to clean out...
	// 		...might be a good idea to clear pattern paths that match no 
	// 		pages from data...
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
					return location.match.slice()
				}

				// XXX should we check if this returns a function???
				var parent = this.wiki.data(path) || {}

				var sort = (location.sort || parent.sort || ['order']).slice()

				var i = sort.indexOf('order')
				location.order && i >= 0 && sort.splice(i, 1, location.order)

				var order = this.wiki.match(path, sort)
					// filter out paths containing '*'
					.filter(function(p){ return p.indexOf('*') < 0 })

				// save cache...
				location.match = order
				location.at = page ? order.indexOf(page) : 0
				this.location(location)

				return order.slice()

			// get saved order...
			} else if(order == 'saved'){
				return location.order 
					// XXX should we check if this returns a function???
					|| (this.wiki.data(path) || {}).order
					|| []

			// clear order...
			// XXX should this:
			// 		- clear all always
			// 		- explicitly clear only local or persistent
			// 		- progressively clear local then persistent (current)
			} else if(order == 'clear' || order == 'clear-all'){
				var local = !!location.order

				// local order...
				delete location.order

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

			// save order...
			} else if(order == 'save') {
				// XXX should we check if this returns a function???
				var parent = this.wiki.data(path) || {}

				var order = parent.order = location.order || this.order()

				this.wiki.data(path, parent)
				delete location.order

			// set order...
			} else {
				location.order = order
			}

			// save cache...
			this.location(location)
			this.order(true)
		}],

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
	//	.sort([method1, method2, ...])
	//		-> page
	//		NOTE: the next method is used iff the previous concludes the
	//			values equal...
	//
	// To reverse a specific method, prepend it's name with "-", e.g. 
	// "title" will do the default ascending sort while "-title" will do
	// a descending sort.
	//
	// Supported methods:
	// 	path			- compare paths (case-insensitive)
	// 	Path			- compare paths (case-sensitive)
	// 	title			- compare titles (case-insensitive)
	// 	Title			- compare titles (case-sensitive)
	// 	checked			- checked state
	// 	order			- the set manual order (see .order(..))
	// 	<attribute>		- compare data attributes
	//
	//
	// NOTE: the sort is local to the returned object.
	// NOTE: the sorted object may loose sync form the actual wiki as the
	// 		list of siblings is cached.
	// 		...the resulting object is not to be stored for long.
	// NOTE: the actual sorting is done by the store...
	//
	// XXX add 'save' and 'saved' actions...
	sort: ['Page/', 
		function(methods){
			var that = this
			var res = this.clone()
			var location = this.location()

			methods = methods instanceof Array ?  methods : [].slice.call(arguments)

			location.sort = methods.length == 0 ?
					(this.config['default-sort-methods'] || ['path'])
				: methods
			res.location(location)

			res.order(true)

			return res
		}],
	// XXX should this be persistent???
	// 		...e.g. survive .order('force') or .order('clear')
	reverse: ['Page/',
		function(){
			var location = this.location()

			// reverse the match...
			location.match && location.match.reverse()

			// reverse order...
			location.order = this.order().reverse()

			// reverse sort...
			if(location.sort){
				location.sort = location.sort
					.map(function(m){ return m[0] == '-' ? m.slice(1) : '-'+m })
			}

			this.location(location)
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

	html: ['Page/',
		function(value){
			// get...
			return arguments.length == 0 ? 
				(this.title() == 'raw' ?
					// special case -- if title is 'raw' then return text as-is...
					(this.raw() || '')
					// parse macros...
					: (this.__macro_parser__ || pWikiMacros.__macro_parser__)
						.parse(this, this.raw()))

				// set...
				: this
					// clear cached stuff related to text...
					.attr('links', undefined)
					// set the value...
					.raw(value) }],
	code: ['Page/',
		function(value){
			return arguments.length == 0 ? 
				this.html().text()
				// XXX should we un-encode here???
				: this.html(value) }],
	links: ['Page/List links from page',
		function(force){
			// get and cache links...
			if(force || this.attr('links') == null){
				var text = this.html()
				var links = typeof(text) == typeof('str') ? []
					: text.find('[href]')
						.map(function(){ 
							var url = $(this).attr('href') 
							return url[0] == '#' ? url.slice(1) : null
						})
						.toArray()
				this.attr('links', links)
				return links
			}
			// get cached links...
			return this.attr('links')
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

// XXX should this extend pWiki or encapsulate (current)???
var pWikiUIActions = actions.Actions({
	config: {
		'special-paths': {
			//'History/back': 'historyBack',
			//'History/forward': 'historyForward',
		},
	},

	dom: null,
	page: null,

	// XXX might be a good idea to add actions to setup/clear a filter...
	__dom_filters__: {
		// sortable elements...
		// TODO: make elements movable from/to nested lists...
		'.sortable': function(elems){
			var wiki = this.page
			elems
				.sortable({
					handle: '.sort-handle',
					placeholder: 'sort-placeholder',
					forcePlaceholderSize: true,
					axis: 'y',

					// event handlers...
					update: function(evt, ui){
						// get item list...
						var order = ui.item
							.parent().children('macro[src]')
								.map(function(){ return $(this).attr('src') })
								.toArray()

						// save the order...
						wiki
							.get(order[0] + '/../*')
								.order(['*'].concat(order))
								.order('save')
					},
				})
				// NOTE: we are only adding touch to the active elements
				// 		to avoid the side-effect of it canceling the default
				// 		behaviour (i.e. scrolling)...
				.find('.sort-handle')
					.addTouch()
		},
		// title editor...
		'.title': function(elems){
			var client = this
			var wiki = this.page

			elems
				.focus(function(){
					var to = $(this).attr('saveto') || '.'
					$(this).text(wiki.get(to).title())
				})
				.blur(function(){ 
					var to = $(this).attr('saveto') || '.'
					var text = $(this).text().trim()
					var page = wiki.get(to)

					if(text[0] == '/'){
						page.path(text)

					} else {
						page.title(text)
					}

					// XXX need to account for changed path sufixes...
					wiki.path(page.path)

					client.reload()
				})

			/* XXX this messes up history for some reason...
			$('title').text(elems.first().text())
			//*/
		},
		// raw text editor...
		'.raw': function(elems){
			var client = this
			var wiki = this.page

			elems
				.focus(function(){
					var to = $(this).attr('saveto') || '.'
					console.log('EDITING:', wiki.get(to).path())
				})
				.on('keyup', function(){ 
					var to = wiki.get($(this).attr('saveto') || '.').path()
					console.log('SAVING:', to)
					//Wiki.get(to).raw($(this).text())
					wiki.get(to).raw($(this)[0].innerText)
				})
				// XXX do this live, but on a timeout after user input...
				// XXX need to place the cursor in the same position...
				.blur(function(){ 
					client.reload() 
				})
		},
		// checkbox handlers...
		'input[type="checkbox"].state': function(elems){
			var client = this
			var wiki = this.page

			elems
				// initial state...
				.each(function(){
					var path = $(this).attr('saveto')
					var value = !!wiki.get(path).checked()

					$(this)
						.prop('checked', value)
						.parents('.item').first()
							[value ? 'addClass' : 'removeClass']('checked')
				})
				// handle clicks...
				.click(function(){
					var path = $(this).attr('saveto')
					var value = $(this).prop('checked')

					wiki.get(path).checked(value)

					$(this)
						.parents('.item').first()
							[value ? 'addClass' : 'removeClass']('checked')

					// XXX
					//client.save()
				})
		},
	},

	// XXX add support for anchors -- #Wiki/Path#anchor...
	// 		...not working yet...
	location: ['', 
		function(path){
			var page = this.page

			if(arguments.length == 0){
				// XXX is this correct???
				return page.path()
			}

			path = path.trim().split('#')
			var hash = path[1]
			path = path[0]

			// special paths...
			if(path in this.config['special-paths']){
				this[this.config['special-paths'][path]]()
			}

			var orig = this.location()

			page.location(path)

			this.reload()

			// reset scroll location...
			orig != this.location()
				&& this.dom
					.scrollParent()
						.scrollLeft(0)
						.scrollTop(0)

			// focus hash..
			// XXX not working yet...
			hash != null && hash != ''
				&& this.dom
					.scrollParent()
						.scrollLeft(0)
						.scrollTop(
							(this.dom
							 	.find('#'+hash+', a[name="'+hash+'"]').first()
									.offset() || {}).top || 0)
				&& console.log('HASH:', hash)

		}],
	reload: ['', 
		function(){
			var that = this
			var page = this.page

			this.dom
				.attr('wiki-active', 'no')
				.empty()
				// update path and render page...
				// XXX revise the default view approach...
				.append(page.title()[0] == '_' ? 
					page.html() 
					: page.get('./_view').html())
				// activate page controls...
				.ready(function(){
					that.updateDom()
				})
		}],
	// XXX might be a good idea to add actions to setup/clear a filter...
	updateDom: ['', 
		function(dom){
			var that = this
			dom = dom || this.dom

			if(dom.attr('wiki-active') == 'yes'){
				return
			}

			dom.attr('wiki-active', 'yes')

			var filters = this.__dom_filters__ 
				|| pWikiUIActions.__dom_filters__

			// apply dom filters...
			Object.keys(filters)
				.forEach(function(pattern){
					// XXX for some reason this works but has no effect...
					filters[pattern].call(that, dom.find(pattern)) })
		}],

	// shorthand...
	get: ['', 
		function(){ return this.page.get.apply(this.page, arguments) }]

	/*
	// XXX url?
	// 		- couch url
	// 		- 'local'
	load: ['', 
		function(){
		}],

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
	//*/
})

var pWikiUI = pWikiFeatures.Feature({
	title: '',
	tag: 'ui',
})


// XXX STUB: not sure if this is the right way...
var pWikiClient =
module.pWikiClient = object.makeConstructor('pWikiClient', 
	actions.mix(
		actions.MetaActions,
		pWikiUIActions))



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
