/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/



/*********************************************************************/


// XXX might be a good idea to make this compatible with node's path API...
var pWikiPath = 
module.pWikiPath = {

	// The page returned when getting the '/' path...
	ROOT_PAGE: 'WikiHome',

	// The page returned when listing a path ending with '/'...
	//
	// If set to false treat dirs the same as pages (default)
	// XXX revise...
	//DEFAULT_DIR: 'pages',
	DEFAULT_DIR: false,

	ALTERNATIVE_PAGES: [
		'EmptyPage',
		'NotFound',
	],

	SEARCH_PATHS: [
		'./Templates',
		'/System',
	],

	// NOTE: trailing/leading '/' are represented by '' at end/start of 
	// 		path list...
	normalize: function(path='.', format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		path = (path instanceof Array ?
				path
				// NOTE: this will also trim the path elements...
				: path.split(/\s*[\\\/]+\s*/))
			.reduce(function(res, e){
				// special case: leading '..' / '.'
				if(res.length == 0 
						&& e == '..'){
					return [e] }
				e == '.' ?
					undefined
				: e == '..' 
						|| res[res.length-1] == '>>' ?
					res.pop()
				// NOTE: the last '>>' will be retained...
				: res.push(e)
				return res }, []) 
		return format == 'string' ?
			path.join('/') 
			: path },
	relative: function(parent, path, format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		path = this.normalize(path, 'array')
		// root path...
		if(path[0] == ''){
			return format == 'string' ? 
				path.join('/')
				: path }
		parent = this.normalize(parent, 'array')
		return this.normalize(parent.concat(path), format) },

	paths: function*(path='/'){
		path = this.normalize(path, 'array')
		// handle '', '.', and '/' paths...
		if(path.length == 0 
				|| (path.length == 1 && path[0] == '')
				|| (path.length == 2 && path[0] == '' && path[1] == '')){
			path = [this.ROOT_PAGE] }
		// normalize relative paths to root...
		path[0] != ''
			&& path.unshift('')
		// paths ending in '/' -- dir lister...
		if(path[path.length-1] == ''){
			path.pop()
			this.DEFAULT_DIR
				&& path.push(this.DEFAULT_DIR) }
		// generate path candidates...
		for(var page of [path.pop(), ...this.ALTERNATIVE_PAGES]){
			for(var tpl of ['.', ...this.SEARCH_PATHS]){
				// search for page up the path...
				var p = path.slice()
				while(p.length > 0){
					yield this.relative(p, tpl +'/'+ page, 'string')
					// special case: non-relative template/page path...
					if(tpl[0] == '/'){
						break }
					p.pop() } } } },
}



//---------------------------------------------------------------------

// NOTE: store keys must be normalized...
//
// XXX must support store stacks...
// XXX path macros???
// XXX should we support page symlinking???
var store = 
module.store = {
	exists: function(path){
		return pWikiPath.normalize(path, 'string') in this },

	paths: function(){
		return Object.keys(this)
			.filter(function(p){
				return p[0] == '/'  }) },
	pages: function(){
		var that = this
		this.paths()
			.map(function(p){
				return [p, that[p]] }) },

	// XXX BUG: '/a*/' does not match '/a/b/...' -- need to replace 
	// 		pattern + with * for partial patterns...
	match: function(path){
		// pattern match * / **
		if(path.includes('*') 
				|| path.includes('**')){
			var pattern = new RegExp(`^\/?${
				pWikiPath.normalize(path, 'string')
					.replace(/\//, '\\/')
					.replace(/\*\*/, '.+')
					.replace(/\*/, '[^\\/]+') }`)
			return this.paths()
				.filter(function(p){
					return pattern.test(p)}) }
		// search...
		for(var p of pWikiPath.paths(path)){
			if(p in this){
				return p } } },
	// XXX should this call actions???
	get: function(path){
		var that = this
		path = this.match(path)
		return path instanceof Array ?
   			path.map(function(p){
				return that[p] })	
			: this[path] },

	// NOTE: deleting and updating only applies to explicit matching 
	// 		paths -- no page acquisition is performed...
	// XXX should these return this or the data???
	update: function(path, data, mode='update'){
		path = pWikiPath.normalize(path, 'string')
		path = path[path.length-1] == '/' ?
			path.slice(0, -1)
			: path
		data = mode == 'update' ?
			Object.assign(this[path] || {}, data)
			: data
		this[path] = data 
		return this },
	delete: function(path){
		path = pWikiPath.normalize(path, 'string')
		path = path[path.length-1] == '/' ?
			path.slice(0, -1)
			: path
		delete this[path] 
		return this },
}


// XXX need to specify page format....
// XXX need a way to set the page path...
var actions = 
module.actions = {
	__proto__: store,

	// base actions (virtual pages)...
	'/System/raw': function(page, path){
		return { text: this.get(path +'/..') } },
	// XXX ...
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var relProxy = 
function(name){
	return function(path='.', ...args){
		return this.store[name](
			pWikiPath.relative(this.path, path), 
			...args) } } 

// page interface...
var page =
module.page = {
	store: undefined,
	path: undefined,
	text: undefined,

	exists: relProxy('exists'), 
	match: relProxy('match'), 
	// XXX should this return page objects???
	get: relProxy('get'), 

	update: function(path='.', data, mode){
		if(arguments.length == 1){
			data = path
			path = '.' }
		return this.store.update(pWikiPath.relative(this.path, path), data, mode) },
	delete: relProxy('delete'),

	// XXX
	clear: function(){
	},
	expand: function(){
	},
}



//---------------------------------------------------------------------

// Abstract macro syntax:
// 	Inline macro:
// 		@macro(arg ..)
//
// 	HTML-like:
// 		<macro arg=value ../>
//
// 	HTML-like with body:
// 		<macro arg=value ..>
// 			..text..
// 		</macro>
//
// XXX should inline macros support named args???
var MACRO_PATTERN =
	[[
		// @macro(arg ..)
		'\\\\?@([a-zA-Z-_]+)\\(([^)]*)\\)',

		// <macro ..> | <macro ../>
		'<\\s*($MACROS)(\\s+[^>]*)?/?>',
		// </macro>
		'</\\s*($MACROS)\\s*>',
	].join('|'), 'mg'],

var WIKIWORD_PATTERN =
	RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g'),

var macros = {
	now: function(){},
	macro: function(){},
}
var expandPage = function(page){
}



//---------------------------------------------------------------------



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
