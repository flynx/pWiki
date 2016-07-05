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
	'TemplatePages/DefaultPage': {
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
	__default_page__: 'DefaultPage',
	__templates__: 'TemplatePages',


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
		value = normalizePath(value)

		this.__wiki_data[value] = this.__wiki_data[l] || {}
		this.location = value
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
	// NOTE: if this page has not text, this will get the DefaultPage...
	// XXX should this get the DefaultPage or the EmptyPage???
	get text(){
		return (this.__wiki_data[this.location] || {}).text
			|| (this.acquire(this.__default_page__) || {}).text
			|| '' 
	},
	set text(value){
		var l = this.location
		this.__wiki_data[l] = this.__wiki_data[l] || {}
		this.__wiki_data[l].text = value
	},

	// XXX
	get links(){
	},
	set links(value){
	},


	// XXX
	get list(){
	},
	set list(value){
	},


	exists: function(path){
		return normalizePath(path) in this.__wiki_data },
	// get title from dir and then go up the tree...
	acquire: function(title){
		title = title || this.__default_page__
		var templates = this.__templates__
		var data = this.__wiki_data
		var that = this

		var path = path2lst(this.dir)

		var _res = function(p){
			return {
				dir: normalizePath(p.slice(0, -1)),
				title: title,
				text: that.__wiki_data[normalizePath(p)].text
			}
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
}


/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
