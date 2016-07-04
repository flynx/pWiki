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
	'dir/page': {
		text: 'some text...'
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

	// current location...
	get location(){
		return this.__location || '/' },
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
	get text(){
		return (this.__wiki_data[this.location] || {}).text || ''
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



	// serialization...
	get json(){
		return {
			path: this.path,
			text: this.text,
		}
	},
	set json(value){
		if(value.title){
			this.title = value.title
		}
		if(value.text){
			this.text = value.text
		}
	},
}


/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
