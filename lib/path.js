/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var types = require('ig-types')


//---------------------------------------------------------------------
// Path...

module = {

	// Page returned when listing a path ending with '/'...
	//
	// If set to false treat dirs the same as pages (default)
	//INDEX_PAGE: 'index',
	INDEX_PAGE: false,

	// The page returned when getting the '/' path...
	//
	// NOTE: this is the same as .INDEX_PAGE but only for '/'
	ROOT_PAGE: 'WikiHome',

	ALTERNATIVE_PAGES: [
		'EmptyPage',
		'NotFoundError',
	],

	// Default alternate search locations...
	//
	// NOTE: if a path here is relative it is also searched relative to 
	// 		the target path.
	SEARCH_PATHS: [
		//'./Theme/CLI',
		'./Templates',
		'/System',
	],

	// Path utils...
	//
	// Path can be in one of two formats:
	// 	string
	// 	array
	//
	// NOTE: trailing/leading '/' are represented by '' at end/start of 
	// 		path list...
	normalize: function(path='.', format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		var root = path[0] == '' 
			|| path[0] == '/'
		path = (path instanceof Array ?
				path
				// NOTE: this will also trim the path elements...
				: path.split(/\s*[\\\/]+\s*/))
			.reduce(function(res, e, i, L){
				// special case: leading '..' / '.'
				if(res.length == 0 
						&& e == '..'){
					return [e] }
				;(e == '.' 
						// keep explicit '/' only at start/end of path...
						|| (e == '' 
							&& i != 0 
							&& i != L.length-1)) ?
					undefined
				: e == '..' 
						|| res[res.length-1] == '>>' ?
					((res.length > 1 
							|| res[0] != '')
						&& res.pop())
				// NOTE: the last '>>' will be retained...
				: res.push(e)
				return res }, []) 
		return format == 'string' ?
			// special case: root -> keep '/'
			((root 
					&& path.length == 1 
					&& path[0] == '') ?
				('/'+ path.join('/'))
				: path.join('/'))
			: path },
	split: function(path){
		return this.normalize(path, 'array') },
	join: function(...parts){
		return this.normalize(
			(parts[0] instanceof Array ?
					parts[0]
					: parts)
				.join('/'), 
			'string') },
	basename: function(path){
		return this.split(path).pop() },
	dirname: function(path){
		return this.relative(path, '..', 'string') },

	relative: function(parent, path, format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		// root path...
		if(path[0] == '' || path[0] == '/'){
			return this.normalize(path, format) }
		// unify parent/path types...
		parent = parent instanceof Array ?
			parent
			: parent.split(/\s*[\\\/]+\s*/)
		path = path instanceof Array ?
			path
			: path.split(/\s*[\\\/]+\s*/)
		return this.normalize([...parent, ...path], format) },

	// Build alternative paths for page acquisition...
	//
	// NOTE: if seen is given (when called recursively) this will not 
	// 		search for .ALTERNATIVE_PAGES...
	// XXX should we search for each path element or just the last one (current)??? 
	// XXX should we keep the trailing '/'???
	paths: function*(path='/', seen){
		var alt_pages = !seen
		seen = seen 
			?? new Set()
		path = this.normalize(path, 'string')
		// special case: root...
		if(path == '/' || path == ''){
			// normalize...
			path = '/'
			// as-is...
			seen.add(path)
			yield path
			// special case: root page...
			if(this.ROOT_PAGE){
				yield* this.paths(this.normalize('/'+ this.ROOT_PAGE, 'string'), seen) }}
		// NOTE: since path is already normalized we can trust the delimiter...
		path = path.split(/\//g)
		// normalize relative paths to root...
		path[0] != ''
			&& path.unshift('')
		// paths ending in '/'...
		if(path[path.length-1] == ''){
			path.pop()
			this.INDEX_PAGE
				&& path.push(this.INDEX_PAGE) }
		// search for page...
		var page = path.pop()
		for(var tpl of ['.', ...this.SEARCH_PATHS]){
			// search for page up the path...
			var p = path.slice()
			while(p.length > 0){
				var cur = this.relative(p, tpl +'/'+ page, 'string')
				if(!seen.has(cur)){
					seen.add(cur)
					yield cur }
				// special case: non-relative template/page path...
				if(tpl[0] == '/'){
					break }
				p.pop() } }
		// alternative pages...
		if(alt_pages){
			for(var page of [...this.ALTERNATIVE_PAGES]){
				yield* this.paths(path.concat(page), seen) }} },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
