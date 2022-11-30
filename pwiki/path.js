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

var makeEncoder = function(name, chars){
	var pattern_attr = '__'+name+'_pattern'
	return function(str){
		var pattern = this[pattern_attr] = 
			this[pattern_attr] 
				?? RegExp(`[${
					this[chars]
						.replace(/\\/g, '\\\\') }]`, 'g')
		return str
			.replace(pattern,
				function(s){ 
					return ('%'+s.charCodeAt().toString(16)).toUpperCase() }) } }
var makeDecoder = function(name, encode, chars){
	var pattern_attr = '__'+name+'_pattern'
	return function(str){
		var pattern = this[pattern_attr] = 
			this[pattern_attr] 
				?? RegExp(`%(${
					this[encode](this[chars])
						.slice(1)
						.replace(/%/g, '|') })`, 'gi')
		return str
			.replace(pattern, function(_, c){
				return String.fromCharCode('0x'+c) }) } }



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
		'.templates',
	],
	
	// System path...
	//
	// This acts the same as elements in .SEARCH_PATHS but should contain 
	// all the default and fallback templates.
	//
	// NOTE: we can't use .pwiki here as it will be in conflict with the
	// 		fs store's directory structure.
	// 		XXX or can we?
	SYSTEM_PATH: '/.system',

	// XXX EXPERIMENTAL
	
	ENCODED_PATH: '#:*%',
	encode: makeEncoder('encode', 'ENCODED_PATH'),
	decode: makeDecoder('decode', 'encode', 'ENCODED_PATH'),

	ENCODED_ELEM: '#:*%\\/',
	encodeElem: makeEncoder('encode_elem', 'ENCODED_ELEM'),
	decodeElem: makeDecoder('decode_elem', 'encodeElem', 'ENCODED_ELEM'),

	// chars we keep in path as-is -- decode on normalize...
	//
	UNENCODED_PATH: '\'"',
	quote: makeEncoder('quote', 'UNENCODED_PATH'),
	unquote: makeDecoder('unquote', 'quote', 'UNENCODED_PATH'),

	quoteHTML: function(str){
		return str
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;')
			.replace(/</g, '&lt;') },
	unquoteHTML: function(str){
		return str
			.replace(/&amp;/g, '&')
			.replace(/&gt;/g, '>')
			.replace(/&lt;/g, '<') },


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
		path = this.unquote(
				path instanceof Array ?
					path.join('/')
					: path)
			// NOTE: this will also trim the path elements...
			.split(/\s*[\\\/]+\s*/)
			.reduce(function(res, e, i, L){
				// special case: leading '..' / '.'
				if(res.length == 0 
						&& e == '..'){
					return [e] }
				// multiple leading '..'...
				;(e == '..' 
						&& res.at(-1) == '..' ?
					res.push(e)
				: e == '.' 
						// keep explicit '/' only at start/end of path...
						|| (e == '' 
							&& i != 0 
							&& i != L.length-1)) ?
					undefined
				: e == '..' 
						|| res.at(-1) == '>>' ?
					((res.length > 1 
							|| res[0] != '')
						&& res.pop())
				// NOTE: the last '>>' will be retained...
				: res.push(e)
				return res }, []) 
		// clear the trailing '/'...
		path.at(-1) == ''
			&& path.pop()
		// trim trailing ':'...
		path.at(-1) 
			&& path.at(-1).endsWith(':')
			&& (path.push(
				path.pop()
					.replace(/:*$/, '')))
		return format == 'string' ?
			// special case: root -> keep '/'
			((root 
					&& path.length == 1 
					&& path[0] == '') ?
				('/'+ path.join('/'))
				: path.join('/'))
			: path },
	sanitize: function(path, format='auto'){
		format = format == 'auto' ?
			(path instanceof Array ?
				'array'
				: 'string')
			: format
		path = this.split(path)
		// leading: '/', '.' and '..'...
		while(path[0] == ''
				|| path[0] == '.'
				|| path[0] == '..'){
			path.shift() }
		//trailing '/'
		path.at(-1) == ''
			&& path.pop()
		return format == 'string' ?
			path.join('/')
			: path },
	split: function(path){
		return this.normalize(path, 'array') },
	join: function(...parts){
		return this.normalize(
			(parts[0] instanceof Array ?
					parts[0]
					: parts), 
			'string') },
	basename: function(path){
		path = this.split(path)
		return path.length == 0 ?
				''
			: path.length == 1 ?
				path[0]	
			: (path.at(-1) == '' ?
				path.at(-2)
				: path.at(-1)) },
	dirname: function(path){
		path = this.split(path)
		path = path.length == 1 ?
				'/'
			: path.length == 2 ?
				path[0]
			: (path.at(-1) == '' ?
					path.slice(0, -2)
					: path.slice(0, -1))
				.join('/') 
		return path == '' ?
			'/'
			: path },

	// XXX BUG? which is more correct??
	// 			.relative('a/b/c', 'x') 
	// 				-> 'a/b/c/x' (current)
	// 		or:
	// 			.relative('a/b/c', 'x') 
	// 				-> 'a/b/x' 
	// 		...not sure about this yet...
	// 		XXX REVISE...
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
		// NOTE: relative paths are siblings and not children unless the 
		// 		parent is explicitly a directory (i.e. ends in '/')...
		/* XXX RELATIVE -- leading @ in path is the same as a trailing / in parent...
		path[0] == '@' ?
			path.shift()
			: parent.pop()
		//*/
		return this.normalize([...parent, ...path], format) },

	// Build alternative paths for page acquisition...
	//
	// NOTE: if seen is given (when called recursively) this will not 
	// 		search for .ALTERNATIVE_PAGES...
	// NOTE: this will search for basename and each subpath, e.g:
	// 			a/b/c	
	// 				-> a/b/c/d
	// 				-> a/c/d
	// 				-> c/d
	// 				-> d
	// 				// now search for 'c/d'...
	// 				-> a/c/d
	// 				-> ...
	// XXX should we keep the trailing '/'???
	paths: function*(path='/', strict=false){
		if(path === true || path === false){
			strict = path
			path = '/' }
		var alt_pages = !strict
		var seen = strict instanceof Set ?
			strict
			: new Set()
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
		for(var tpl of ['.', ...this.SEARCH_PATHS, this.SYSTEM_PATH]){
			// search for page up the path...
			var pg = page
			var base = path.slice()
			while(base.length > 0){
				var p = base.slice()
				while(p.length > 0){
					// NOTE: we are adding '' to path here to get things 
					// 		relative to it and not relative to basedir...
					var cur = this.relative([...p, ''], tpl +'/'+ pg, 'string')
					if(!seen.has(cur)){
						seen.add(cur)
						yield cur }
					// special case: non-relative template/page path...
					if(tpl[0] == '/'){
						break }
					p.pop() } 
				// next search for tail sub-path...
				// 		for a/b/c
				// 			c in a/b -> b/c in a
				pg = base.pop() +'/'+ pg } }
		// alternative pages...
		if(alt_pages){
			for(var page of [...this.ALTERNATIVE_PAGES]){
				yield* this.paths(path.concat(page), seen) }} },

	names: function(path='/'){
		path = path == '' ?
			'/'
			: path
		path = this.normalize(path, 'string')
		var name = path == '/' ?
			['', this.ROOT_PAGE]
			: [this.basename(path)]
		return name == '' ?
			this.ALTERNATIVE_PAGES.slice()
			: [...name, ...this.ALTERNATIVE_PAGES] },


	//
	//	.splitArgs(<path>)
	//		-> <spec>
	//
	// Format:
	// 	{
	// 		path: <path>
	// 		args: {
	// 			<name>:<value>,
	// 			...
	// 		}
	// 	}
	//
	// Syntax:
	// 		<path> ::= <path>:<args>
	// 		<args> ::=
	// 			<arg> | <arg>:<args>
	// 		<arg> ::=
	// 			<value>
	// 			| <name>=<value>
	//
	// XXX the problem here is that we could legitimately create path 
	// 		items containing ":" -- it either needs to be a reserved char
	// 		or this scheme will not work...
	splitArgs: function(path){
		path = this.normalize(path, 'string')
		var [path, ...args] = path.split(/(?<!\\):/g)
		return {
			path,
			args: args.reduce(function(res, arg){
				var [name, value] = arg.split(/=(.*)/)
				res[name.trim()] = value ?? true
				return res }, {}),
		} },
	obj2args: function(args){
		return args instanceof Object ?
			Object.entries(args)
				.map(function([key, value]){
					return value === true ?
							key
						: key +'='+ ((value + '').replace(/:/g, '\\:')) })
				.join(':') 
			: args },
	joinArgs: function(path, args={}){
		path = this.join(path)
		args = this.obj2args(args)
		return args == '' ?
			path
			: path +':'+ args },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
