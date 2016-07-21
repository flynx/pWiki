/**********************************************************************
* 
*
*
**********************************************************************/


/*********************************************************************/
// Hepers...

var path2lst = function(path){ 
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

var normalizePath = function(path){
	return path2lst(path).join('/') }


var clearWikiWords = function(elem){
	// clear existing...
	elem.find('.wikiword').each(function(){
		$(this).attr('bracketed') == 'yes' ? 
			$(this).replaceWith(['['].concat(this.childNodes, [']']))
			: $(this).replaceWith(this.childNodes)
	})
	return elem } 

var setWikiWords = function(text, show_brackets, skip){
	skip = skip || []
	skip = skip instanceof Array ? skip : [skip]
	return text 
		// set new...
		.replace(
			Wiki.__wiki_link__,
			function(l){
				return skip.indexOf(l) < 0 ? 
					('<a '
						+'class="wikiword" '
						+'href="#" '
						+'bracketed="'+ (show_brackets && l[0] == '[' ? 'yes' : 'no') +'" '
						+'onclick="go($(this).text())" '
						+'>'
							+ (!!show_brackets && l[0] == '[' ? l.slice(1, -1) : l) 
						+'</a>')
					: l
			})}



/*********************************************************************/

function Macro(doc, args, func){
	func.doc = doc
	func.macro_args = args
	return func 
}


// XXX should inline macros support named args???
var macro = {

	__include_marker__: '__include_marker__',

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
	__macro__pattern__: 
		/<([a-zA-Z-_:]+)(.|[\n\r])*?(>(.|[\n\r])*?<\/\1>|\/>)|@([a-zA-Z-_]+)\(([^)]*)\)/mg,

	// default filters...
	//
	// NOTE: these are added AFTER the user defined filters...
	__filters__: [
		'wikiword',
	],

	// Macros...
	//
	macro: {
		// select filter to post-process text...
		filter: Macro('Filter to post-process text',
			['name'],
			function(context, args, text, state){
				var filter = args[0] || args.name

				filter[0] == '-' ?
					// disabled -- keep at head of list...
					state.filters.unshift(filter)
					// normal -- tail...
					: state.filters.push(filter)

				return ''
			}),

		// include page/slot...
		//
		// NOTE: this will render the page in the caller's context.
		// NOTE: included pages are rendered completely independently 
		// 		from the including page.
		//
		// XXX do we need to control the rendering of nested pages???
		// 		...currently I do not think so...
		// 		...if required this can be done via global and local 
		// 		filters... (now filters are only local)
		// XXX do we need to render just one slot??? (slot arg)
		// 		e.g. include PageX SlotY
		include: Macro('Include page',
			['src'],
			function(context, args, _, state){
				var path = args.src

				// get and prepare the included page...
				state.include
					.push(context.get(path))

				// return the marker...
				return this.__include_marker__
			}),

		// NOTE: this is similar to include, the difference is that this
		// 		includes the page source to the current context while 
		// 		include works in an isolated context
		source: Macro('Include page source (without parsing)',
			['src'], 
			function(context, args, _, state){
				var path = args.src

				return context.get(path).raw
			}),

		// fill/define slot (stage 1)...
		slot: Macro('Define/fill slot',
			['name'],
			function(context, args, text, state){
				var name = args.name

				text = this.parse(context, text, state, true)

				if(state.slots[name] == null){
					state.slots[name] = text
					// return a slot macro parsable by stage 2...
					return '<slot name="'+name+'">'+ text +'</slot>'

				} else if(name in state.slots){
					state.slots[name] = text
					return ''
				}
			}),
	},
	
	// Post macros... 
	//
	post_macro: {
		slot: Macro('',
			['name'],
			function(context, args, text, state){
				var name = args.name

				if(state.slots[name] == null){
					return text

				} else if(name in state.slots){
					return state.slots[name]
				}
			}),
	},

	// Filters...
	//
	// Signature:
	// 	filter(text) -> html
	//
	filter: {
		default: 'html',

		html: function(context, text){ return $('<div>').html(text).html() },

		json: 'text',
		text: function(context, text){ return $('<div>').text(text).html() },

		wikiword: function(context, text){ 
			return setWikiWords(text, true, this.__include_marker__) },
	},


	// Parsing:
	//  1) expand macros
	//  2) apply filters
	//  3) merge and parse included pages:
	//  	1) expand macros
	//  	2) apply filters
	//  4) expand post-macros
	//
	// NOTE: stage 4 parsing is executed on the final merged page only 
	// 		once. i.e. it is not performed on the included pages.
	// NOTE: included pages are parsed in their own context.
	// NOTE: slots are parsed in the context of their containing page 
	// 		and not in the location they are being placed.
	//
	parseElem: function(text, stage){
		var res = {}

		// @<name>(<args>)
		if(text[0] == '@'){
			var d = text.match(/@([a-zA-Z-_:]*)\(([^)]*)\)/)

			res.text = ''
			res.name = d[1]
			var args = res.args = {}

			var a = d[2].split(/\s+/g)
			a.forEach(function(e, i){
				args[((stage[res.name] || {}).macro_args || [])[i]] = e
			})

		// html-like...
		} else {
			var elem = res.elem = $('<div>').html(text).children().eq(0)
			res.name = elem.prop('tagName').toLowerCase()

			var args = res.args = {}
			var a = elem.prop('attributes')

			for(var i=0; i<a.length; i++){
				args[a[i].name] = a[i].value
			}

			res.text = elem.html()
		}

		return res
	},
	parse: function(context, text, state, skip_post){
		var that = this
		state = state || {}
		state.filters = state.filters || []
		state.slots = state.slots || {}
		state.include = state.include || []


		var _parse = function(context, text, macro){
			return text.replace(that.__macro__pattern__, function(match){
				var m = that.parseElem(match, macro)

				// found a macro...
				return m.name in macro ? 
						macro[m.name].call(that, context, m.args, m.text, state)
					// found a tag -> look inside...
					: m.elem && m.text != ''? 
						m.elem.html(_parse(context, m.text, macro))[0].outerHTML
					// else nothing changed...
					: match
			})
		}

		// macro...
		text = _parse(context, text, this.macro)

		// filter...
		state.filters
			.concat(this.__filters__)
			// unique -- leave last occurance..
			.filter(function(k, i, lst){ 
				return k[0] != '-'
					// filter dupplicates... 
					&& lst.slice(i+1).indexOf(k) == -1 
						// filter disabled...
					&& lst.slice(0, i).indexOf('-' + k) == -1
			})
			// unique -- leave first occurance..
			//.filter(function(k, i, lst){ return lst.slice(0, i).indexOf(k) == -1 })
			// apply the filters...
			.forEach(function(f){
				var k = f
				// get filter aliases...
				var seen = []
				while(typeof(k) == typeof('str') && seen.indexOf(k) == -1){
					seen.push(k)
					k = that.filter[k]
				}
				// could not find the filter...
				if(!k){
					console.warn('Unknown filter:', f)
					return
				}
				// use the filter...
				text = k.call(that, context, text) 
			})

		// merge includes...
		// XXX need to check for errors (includes list shorter/longer 
		// 		than number of markers)...
		text = text.replace(RegExp(this.__include_marker__, 'g'), function(){
			var page = state.include.shift()
			// NOTE: we are quoting html here, this is done to prevent 
			// 		included html from messing up the outer structure with
			// 		things like unclosed tags and stuff...
			// XXX can this be anything other than html?
			return $('<span>')
				.addClass('include')
				.attr('src', page.path)
				.html(page.parse({ slots: state.slots }, true))[0]
					.outerHTML
		})

		// post macro...
		if(!skip_post){
			text = _parse(context, text, this.post_macro)
		}

		return text
	},
}



/*********************************************************************/

// XXX not sure about these...
// XXX add docs...
var BaseData = {
	// Macro acces to standard page attributes...
	'System/title': function(){ return this.get('..').title },
	'System/path': function(){ return this.dir },
	'System/dir': function(){ return this.get('..').dir },
	'System/location': function(){ return this.dir },
	'System/resolved': function(){ return this.get('..').acquire() },

	// page data...
	//
	// NOTE: special case: ./raw is treated a differently when getting .text
	// 		i.e:
	// 			.get('./raw').text
	// 		is the same as:
	// 			.get('.').raw
	'System/raw': function(){ return this.get('..').raw },
	'System/text': function(){ return this.get('..').text },

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
	'System/tree': function(){
		var p = this.dir

		return Object.keys(this.__wiki_data)
			.map(function(k){
				if(k.indexOf(p) == 0){
					return k
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

	// XXX this needs a redirect...
	'System/delete': function(){
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
//
// XXX add .json support...
var data = {
	'Templates/EmptyPage': {
		text: 'Page [@include(./path)] is empty.' +'<br><br>'
			+'Links to this page:' +'<br>'
			+'@include(./links)' +'<br><br>'
			+'---' +'<br>'
			+'WikiHome',
	},

	'Templates/_view': {
		text: '\n'
			+'<div class="path">@include(../path) ([../_edit])</div>\n'
			+'<hr>\n'
			+'<h1 class="title" contenteditable tabindex="0">@include(../title)</h1>\n'
			+'<br>\n'
			+'<div class="text" tabindex="0">@include(..)</div>\n'
			+'<script>\n'
			+'    update_editor()\n'
			+'</script>\n'
			+'\n',
	},
	'Templates/_edit': {
		text: '\n'
			+'<div>/@include(../path) ([../_view])</div>\n'
			+'<hr>\n'
			+'<h1 contenteditable>@include(../title)</h1>\n'
			+'<br>\n'
			+'<div class="raw" contenteditable>@include(../raw)</div>\n'
			+'<script>\n'
			+'\t$(".raw").text($(".raw").html())\n'
			+'</script>\n'
			+'',
	},
}
data.__proto__ = BaseData



/*********************************************************************/

// XXX add .json support...
var Wiki = {
	__wiki_data: data,

	__home_page__: 'WikiHome',
	__default_page__: 'EmptyPage',
	// Special sub-paths to look in on each level...
	__acquesition_order__: [
		'Templates',
	],
	__post_acquesition_order__: [
	],
	// XXX should this be read only???
	__system__: 'System',
	//__redirect_template__: 'RedirectTemplate',

	__wiki_link__: RegExp('('+[
		'(\\./|\\.\\./|[A-Z][a-z0-9]+[A-Z/])[a-zA-Z0-9/]*',
		'\\[[^\\]]+\\]',
	].join('|') +')', 'g'),


	// Resolve '.' and '..' relative to current page...
	//
	// NOTE: '.' is relative to .path and not to .dir
	// NOTE: this is a method as it needs the context to resolve...
	resolveDotPath: function(path){
		path = normalizePath(path)
		// '.' or './*'
		return path == '.' || /^\.\//.test(path) ? 
				//path.replace(/^\./, this.dir)
				path.replace(/^\./, this.path)
			// '..' or '../*'
			: path == '..' || /^\.\.\//.test(path) ? 
				//path.replace(/^\.\./, 
				//	normalizePath(path2lst(this.dir).slice(0, -1)))
				path.replace(/^\.\./, this.dir)
			: path
	},


	// current location...
	get location(){
		return this.__location || this.__home_page__ },
	set location(value){
		this.__location = this.resolveDotPath(value) },


	get data(){
		return this.__wiki_data[this.acquire()] },


	// XXX
	clone: function(){
		var o = Object.create(Wiki)
		o.location = this.location
		return o
	},


	// page path...
	//
	// Format:
	// 	<dir>/<title>
	//
	// NOTE: changing this will move the page to the new path and change
	// 		.location acordingly...
	// NOTE: same applies to path parts below...
	// NOTE: changing path will update all the links to the moving page.
	// NOTE: if a link can't be updated without a conflit then it is left
	// 		unchanged, and a redirect page will be created.
	get path(){ 
		return this.location },
	// XXX should lik updating be part of this???
	// XXX use a template for the redirect page...
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
			page.raw = page.raw.replace(page.__wiki_link__, function(lnk){
				var from = lnk[0] == '[' ? lnk.slice(1, -1) : lnk

				// get path/title...
				var p = path2lst(from)
				var t = p.pop()
				p = normalizePath(p)

				var target = page.get(p).acquire('./'+t)
				// page target changed...
				// NOTE: this can happen either when a link was an orphan
				// 		or if the new page path shadowed the original 
				// 		target...
				// XXX should we report the exact condition here???
				if(target == value){
					console.log('Link target changed:', lnk, '->', value)
					return lnk

				// skip links that do not resolve to target...
				} else if(page.get(p).acquire('./'+t) != l){
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
					if(page.get(p).acquire('./'+ntitle) != value){
						console.log('ERR:', lnk, '->', to,
							'is shadowed by:', page.get(p).acquire('./'+ntitle))
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
			this.__wiki_data[l].raw = 'REDIRECT TO: ' + value
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
	get raw(){
		var data = this.data
		return data instanceof Function ? data.call(this, this)
			: typeof(data) == typeof('str') ? data
			: data != null ? data.text
			: ''
	},
	set raw(value){
		var l = this.location

		// prevent overwriting actions...
		if(this.data instanceof Function){
			return
		}

		this.__wiki_data[l] = this.__wiki_data[l] || {}
		this.__wiki_data[l].text = value

		// cache links...
		delete this.__wiki_data[l].links
		this.__wiki_data[l].links = this.links
	},


	parse: function(state, skip_post){
		// special case: if we are getting ./raw then do not parse text...
		return this.title == 'raw' ? this.raw 
			: macro.parse(this, this.raw, state, skip_post)
	},
	get text(){
		return this.parse() },


	// NOTE: this is set by setting .text
	get links(){
		var data = this.data || {}
		var links = data.links = data.links
			|| (this.raw.match(this.__wiki_link__) || [])
				// unwrap explicit links...
				.map(function(e){ return e[0] == '[' ? e.slice(1, -1) : e })
				// unique...
				.filter(function(e, i, l){ return l.slice(0, i).indexOf(e) == -1 })
		return links
	},


	// navigation...
	get parent(){
		return this.get('..') },
	// XXX list children/sub-pages...
	get children(){
	},

	// XXX add prpper insyantiation ( .clone() )...
	get: function(path){
		//var o = Object.create(this)
		var o = this.clone() 
		o.location = path || this.path
		return o
	},


	exists: function(path){
		return normalizePath(path || this.path) in this.__wiki_data },
	// get title from dir and then go up the tree...
	//
	// XXX should we also acquire each path part???
	acquire: function(path, no_default){
		var that = this

		// handle paths and relative paths...
		var p = this.get(path)
		var title = p.title
		path = path2lst(p.dir)

		var acquire_from = this.__acquesition_order__ || []
		var post_acquire_from = this.__post_acquesition_order__ || []
		var data = this.__wiki_data

		var _get = function(path, title, lst){
			lst = (lst == null || lst.length == 0) ? [''] : lst
			for(var i=0; i < lst.length; i++){
				var p = path.concat([lst[i], title])
				if(that.exists(p)){
					p = normalizePath(p)
					return that.__wiki_data[p] && p
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
			|| this.__system__ 
				&& _get([this.__system__], title)

		// NOTE: this may be null...
		return p 
			|| ((!no_default && title != this.__default_page__) ? 
				this.acquire('./'+this.__default_page__) 
				: null)
	},


	// serialization...
	// XXX
	json: function(path){
		return path == null ? JSON.parse(JSON.stringify(this.__wiki_data))
			: path == '.' ? {
					path: this.location,
					text: this.raw,
				}
			: {
				path: path,
				text: (this.__wiki_data[path] || {}).raw,
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
			//var o = Object.create(that)
			var o = that.clone() 
			o.location = location
			callback.call(o, o)
		})
		return this
	},
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
