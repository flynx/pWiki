/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true


/*********************************************************************/

// XXX not sure about these...
var BaseData = {
	'Templates/list': function(){
		var p = this.dir

		return Object.keys(this.__wiki_data)
			.map(function(k){
				if(k.indexOf(p) == 0){
					return path2lst(k.slice(p.length)).shift()
				}
				return null
			})
			.filter(e => e != null)
			.sort()
			.map(e => '['+ e +']')
			.join('<br>')
	},
	'Templates/tree': function(){
		var p = this.dir

		return Object.keys(this.__wiki_data)
			.map(function(k){
				if(k.indexOf(p) == 0){
					return k
				}
				return null
			})
			.filter(e => e != null)
			.sort()
			.map(e => '['+ e +']')
			.join('<br>')
	},
	'Templates/links': function(){
		var that = this
		var p = this.dir
		var rp = this.acquire(path2lst(p).slice(0, -1), path2lst(p).pop())

		var res = []

		var wiki = this.__wiki_data
		Object.keys(wiki).forEach(function(k){
			(wiki[k].links || []).forEach(function(l){
				that.acquire(path2lst(l).slice(0, -1), path2lst(l).pop()) == rp
					&& res.push([l, k])
			})
		})

		return res
			//.map(e => '['+ e[0] +'] <i>from page: ['+ e[1] +']</i>')
			.map(e => '['+ e[1] +'] <i>-&gt; ['+ e[0] +']</i>')
			.sort()
			.join('<br>')
	},

	// XXX this needs a redirect...
	'Templates/delete': function(){
		var p = this.dir
		delete this.__wiki_data[p]
	},
}


// data store...
// Format:
// 	{
// 		<path>: {
// 			text: <text>,
//
// 			links: [
// 				<offset>: <link>,
// 			],
// 		}
// 	}
var data = {
	'Templates/EmptyPage': {
		text: 'This page is empty.<br><br>WikiHome',
	},
}
data.__proto__ = BaseData



/*********************************************************************/

var path2lst = path => 
	(path instanceof Array ?  path : path.split(/[\\\/]+/g))
		// handle '..' (lookahead) and trim path elements...
		// NOTE: this will not touch the leading '.' or '..'
		.map((p, i, l) => 
			(i > 0 && (p.trim() == '..' || p.trim() == '.')
					|| (l[i+1] || '').trim() == '..') ? 
				null 
				: p.trim())
		// cleanup and clear '.'...
		.filter(p => 
			p != null && p != '')

var normalizePath = path => 
	path2lst(path).join('/')



/*********************************************************************/

var Wiki = {
	__wiki_data: data,

	__home_page__: 'WikiHome',
	__default_page__: 'EmptyPage',
	__templates__: 'Templates',
	//__redirect_template__: 'RedirectTemplate',

	__wiki_link__: RegExp('('+[
		'(\\./|\\.\\./|[A-Z][a-z0-9]+[A-Z/])[a-zA-Z0-9/]*',
		'\\[[^\\]]+\\]',
	].join('|') +')', 'g'),


	// Resolve '.' and '..' relative to current page...
	//
	// With the .path set to A/B/C, this will resolve the folowing to:
	// 	'.'			-> 'A/B' 
	// 	'..'		-> 'A'
	// 	'./X'		-> 'A/B/X'
	// 	'../X'		-> 'A/X'
	//
	// NOTE: this is here as it needs the context to resolve...
	resolveDotPath: function(path){
		path = normalizePath(path)
		// '.' or './*'
		return path == '.' || /^\.\//.test(path) ? 
				path.replace(/^\./, this.dir)
			// '..' or '../*'
			: path == '..' || /^\.\.\//.test(path) ? 
				path.replace(/^\.\./, 
					normalizePath(path2lst(this.dir).slice(0, -1)))
			: path
	},


	// current location...
	get location(){
		return this.__location || this.__home_page__ },
	set location(value){
		this.__location = this.resolveDotPath(value) },

	// page path...
	//
	// Format:
	// 	<dir>/<title>
	//
	// NOTE: changing this will move the page to the new path and change
	// 		.location acordingly...
	// NOTE: same applies to path parts below...
	//
	// XXX use a template for the redirect page...
	get path(){ 
		return this.location },
	set path(value){
		value = this.resolveDotPath(value)

		var l = this.location

		if(value == l){
			return
		}

		// old...
		var otitle = this.title
		var odir = this.dir

		if(this.exists(l)){
			this.__wiki_data[value] = this.__wiki_data[l]
		}
		this.location = value

		// new...
		var ntitle = this.title
		var ndir = this.dir

		var redirect = false

		// update links to this page...
		this.pages(function(page){
			// skip the old page...
			if(page.location == l){
				return
			}
			page.text = page.text.replace(page.__wiki_link__, function(lnk){
				var from = lnk[0] == '[' ? lnk.slice(1, -1) : lnk

				// get path/title...
				var p = path2lst(from)
				var t = p.pop()
				p = normalizePath(p)

				var target = page.acquire(p, t)
				// page target changed...
				// NOTE: this can happen either when a link was an orphan
				// 		or if the new page path shadowed the original 
				// 		target...
				// XXX should we report the exact condition here???
				if(target == value){
					console.log('Link target changed:', lnk, '->', value)
					return lnk

				// skip links that do not resolve to target...
				} else if(page.acquire(p, t) != l){
					return lnk
				}

				// format the new link...
				var to = p == '' ? ntitle : p +'/'+ ntitle
				to = lnk[0] == '[' ? '['+to+'}' : to

				// explicit link change -- replace...
				if(from == l){
					//console.log(lnk, '->', to)
					return to

				// path did not change -- change the title...
				} else if(ndir == odir){
					// conflict: the new link will not resolve to the 
					// 		target page...
					if(page.acquire(p, ntitle) != value){
						console.log('ERR:', lnk, '->', to,
							'is shadowed by:', page.acquire(p, ntitle))
						// XXX should we add a note to the link???
						redirect = true

					// replace title...
					} else {
						//console.log(lnk, '->', to)
						return to
					}

				// path changed -- keep link + add redirect page...
				} else {
					redirect = true
				}

				// no change...
				return lnk
			})
		})

		// redirect...
		//
		// XXX should we use a template here???
		// 		...might be a good idea to set a .redirect attr and either
		// 		do an internal/transparent redirect or show a redirect 
		// 		template
		// 		...might also be good to add an option to fix the link from
		// 		the redirect page...
		if(redirect){
			console.log('CREATING REDIRECT PAGE:', l, '->', value, '')
			this.__wiki_data[l].text = 'REDIRECT TO: ' + value
				+'<br>'
				+'<br><i>NOTE: This page was created when renaming the target '
					+'page that resulted new link being broken (i.e. resolved '
					+'to a different page from the target)</i>'
			this.__wiki_data[l].redirect = value

		// cleaup...
		} else {
			delete this.__wiki_data[l]
		}
	},

	// path parts: directory...
	//
	// NOTE: see .path for details...
	get dir(){
		return path2lst(this.location).slice(0, -1).join('/') },
	set dir(value){
		this.path = value +'/'+ this.title },

	// path parts: title...
	//
	// NOTE: see .path for details...
	get title(){ 
		return path2lst(this.location).pop() },
	set title(value){
		this.path = this.dir +'/'+ value },


	// page content...
	//
	// Test acquesition order:
	// 	- explicit path
	// 	- .title in path
	// 	- .title in templates
	// 	- aquire empty page (same order as above)
	//
	get text(){
		var data = this.acquireData()
		return data instanceof Function ? data.call(this, this)
			: typeof(data) == typeof('str') ? data
			: data != null ? data.text
			: ''
	},
	set text(value){
		var l = this.location

		// prevent overwriting actions...
		if(this.acquireData(l) instanceof Function){
			return
		}

		this.__wiki_data[l] = this.__wiki_data[l] || {}
		this.__wiki_data[l].text = value

		// cache links...
		delete this.__wiki_data[l].links
		this.__wiki_data[l].links = this.links
	},

	// NOTE: this is set by setting .text
	get links(){
		var data = this.acquireData() || {}
		var links = data.links = data.links
			|| (this.text.match(this.__wiki_link__) || [])
				// unwrap explicit links...
				.map(e => e[0] == '[' ? e.slice(1, -1) : e)
				// unique...
				.filter((e, i, l) => l.slice(0, i).indexOf(e) == -1)
		return links
	},

	// XXX list children/sub-pages...
	get list(){
	},


	exists: function(path){
		return normalizePath(path) in this.__wiki_data },
	// get title from dir and then go up the tree...
	_acquire: function(title){
		title = title || this.__default_page__
		var templates = this.__templates__
		var data = this.__wiki_data
		var that = this

		var path = path2lst(this.dir)

		var _res = function(p){
			p = normalizePath(p)
			return that.__wiki_data[p] && p
		}

		while(true){
			// get title from path...
			var p = path.concat([title])
			if(this.exists(p)){
				return _res(p)
			}

			// get title from templates in path...
			var p = path.concat([templates, title])
			if(this.exists(p)){
				return _res(p)
			}

			if(path.length == 0){
				return
			}

			path.pop()
		}
	},
	acquire: function(path, title){
		path = path && normalizePath(path) || this.path
		title = title || this.title
		var wiki = this.__wiki_data

		// get the page directly...
		return (this.exists(path +'/'+ title) && path +'/'+ title)
			// acquire the page from path...
			|| this._acquire(title)
			// acquire the default page...
			|| this._acquire(this.__default_page__)
			// nothing found...
			|| null
	},

	// shorthand...
	acquireData: function(path, title){
		var page = this.acquire(path, title)
		return page ? this.__wiki_data[page] : null
	},


	// serialization...
	json: function(path){
		return path == null ? JSON.parse(JSON.stringify(this.__wiki_data))
			: path == '.' ? {
					path: this.location,
					text: this.text,
				}
			: {
				path: path,
				text: (this.__wiki_data[path] || {}).text,
			}
	},
	// XXX should we inherit from the default???
	load: function(json){
		this.__wiki_data = json
	},


	// iteration...
	// XXX this is not page specific, might need refactoring...
	pages: function(callback){
		var that = this
		Object.keys(this.__wiki_data).forEach(function(location){
			// XXX not sure if this is the right way to go...
			var o = Object.create(that)
			o.location = location
			callback.call(o, o)
		})
		return this
	},
}


/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
