/**********************************************************************
* 
*
*
**********************************************************************/

//var DEBUG = DEBUG != null ? DEBUG : true


/*********************************************************************/


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


var path2lst = path => 
	(path instanceof Array ? 
	 		path 
			: path.split(/[\\\/]+/g))
		.map(p => p.trim())
		.filter(p => 
			p != '' && p != '.')

var normalizePath = path => 
	path2lst(path).join('/')


var Wiki = {
	__wiki_data: data,

	__home_page__: 'WikiHome',
	__default_page__: 'EmptyPage',
	__templates__: 'Templates',

	__wiki_link__: RegExp('('+[
		'[A-Z][a-z0-9]+[A-Z\/][a-zA-Z0-9\/]*',
		'\\[[^\\]]+\\]',
	].join('|') +')', 'g'),


	// current location...
	get location(){
		return this.__location || this.__home_page__ },
	set location(value){
		this.__location = normalizePath(value) },

	// page path...
	//
	// Format:
	// 	<dir>/<title>
	//
	// NOTE: changing this will move the page to the new path and change
	// 		.location acordingly...
	// NOTE: same applies to path parts below...
	get path(){ 
		return this.location },
	set path(value){
		var l = this.location
		// old title...
		var ot = this.title
		value = normalizePath(value)

		if(this.exists(l)){
			this.__wiki_data[value] = this.__wiki_data[l]
		}
		this.location = value

		// new title...
		var nt = this.title

		// update all links...
		this.pages(function(page){
			page.location != l && page.links.forEach(lnk => {
				var p = path2lst(lnk)
				var t = p.pop()

				// 1:1 change
				(lnk == l
					// change all links that resolve to current page 
					// with same basename...
					|| (t == ot && page.acquire(p, t) == l)
					// XXX need to take changing paths into acount...
					|| true)
						&& console.log(lnk, '->', p +'/'+ nt)
						/*
						&& (page.text.match(this.__wiki_link__) || [])
							// get both types of links...
							.filter(e => e == l || e == '['+l+']')
							// unique...
							.filter((e, i, l) => l.slice(0, i).indexOf(e) == -1)
							// do the replacing...
							.forEach(e =>
								page.text = page.text.replace(
									// XXX BUG: this will change anything 
									// 		containing the pattern...
									RegExp(''
										// regexp-quote string...
										+e.replace(/[\[\]\(\)\$\^\{\}\?\|\*\.\+]/g, '\\$1')
										+ '', 'g'),
									value))	
						//*/
			})
		})

		// cleaup...
		delete this.__wiki_data[l]
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
	// 	- aquire default page (same order as above)
	//
	get text(){
		return (this.acquireData() || {}).text || '' },
	set text(value){
		var l = this.location
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

	// XXX
	get list(){
	},
	set list(value){
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
