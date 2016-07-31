/**********************************************************************
* 
*
*
**********************************************************************/


/*********************************************************************/
// Hepers...
//
var quoteRegExp =
RegExp.quoteRegExp =
function(str){
	return str.replace(/([\.\\\/\(\)\[\]\$\*\+\-\{\}\@\^\&\?\<\>])/g, '\\$1')
}

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
				var path = l[0] == '[' ? l.slice(1, -1) : l
				var i = [].slice.call(arguments).slice(-2)[0]

				// XXX HACK check if we are inside a tag...
				var rest = text.slice(i+1)
				if(rest.indexOf('>') < rest.indexOf('<')){
					return l
				}

				return skip.indexOf(l) < 0 ? 
					('<a '
						+'class="wikiword" '
						+'href="#'+ path +'" '
						+'bracketed="'+ (show_brackets && l[0] == '[' ? 'yes' : 'no') +'" '
						//+'onclick="event.preventDefault(); go($(this).attr(\'href\').slice(1))" '
						+'>'
							+ (!!show_brackets ? path : l) 
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
		[[
			// @macro(arg ..)
			'@([a-zA-Z-_]+)\\(([^)]*)\\)'
		].join('|'), 'mg'],

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
			function(context, elem, state){
				var filter = $(elem).attr('name')

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
			function(context, elem, state){
				var path = $(elem).attr('src')

				// get and prepare the included page...
				state.include
					.push([elem, context.get(path)])

				// return the marker...
				return this.__include_marker__
			}),

		// NOTE: this is similar to include, the difference is that this
		// 		includes the page source to the current context while 
		// 		include works in an isolated context
		source: Macro('Include page source (without parsing)',
			['src'], 
			function(context, elem, state){
				var path = $(elem).attr('src')

				return context.get(path)
					.map(function(page){ return page.raw })
					.join('\n')
			}),

		quote: Macro('Include quoted page source (without parsing)',
			['src'], 
			function(context, elem, state){
				elem = $(elem)
				var path = elem.attr('src')

				return $(context.get(path)
					.map(function(page){
						return elem
							.clone()
							.attr('src', page.path)
							.text(page.raw)[0]
					}))
			}),

		/*
		// fill/define slot (stage 1)...
		//
		// XXX which should have priority the arg text or the content???
		_slot: Macro('Define/fill slot',
			['name', 'text'],
			function(context, elem, state, parse){
				var name = $(elem).attr('name')

				// XXX
				text = $(elem).html()
				text = text == '' ? $(elem).attr('text') : text
				text = this.parse(context, text, state, true)
				//text = parse(elem)

				if(state.slots[name] == null){
					state.slots[name] = text
					// return a slot macro parsable by stage 2...
					//return '<_slot name="'+name+'">'+ text +'</slot>'
					return elem

				} else if(name in state.slots){
					state.slots[name] = text
					return ''
				}
			}),
		//*/
		// convert @ macro to html-like + parse content...
		slot: Macro('Define/fill slot',
			['name', 'text'],
			function(context, elem, state, parse){
				elem = $(elem)
				var name = elem.attr('name')

				// XXX
				text = elem.html()
				text = text.trim() == '' ? 
					elem.html(elem.attr('text') || '').html() 
					: text
				text = parse(elem)

				elem.attr('text', null)
				//elem.html(text)

				return elem
			}),

		macro: Macro('Define/fill slot',
			['name', 'src'],
			function(context, elem, state, parse){
				elem = $(elem)
				var name = elem.attr('name')
				var path = elem.attr('src')

				state.templates = state.templates || {}


				if(name){
					if(elem.html().trim() != ''){
						state.templates[name] = elem.clone()

					} else if(name in state.templates) {
						elem = state.templates[name]
					}
				}

				if(path){
					return $(context.get(path)
						.map(function(page){
							var e = elem.clone()
								.attr('src', page.path)
							parse(e, page)
							return e[0]
						}))
				}

				return ''
			})
	},
	
	// Post macros... 
	//
	post_macro: {
		/*
		_slot: Macro('',
			['name'],
			function(context, elem, state){
				var name = $(elem).attr('name')

				if(state.slots[name] == null){
					return $(elem).html()

				} else if(name in state.slots){
					return state.slots[name]
				}
			}),
		//*/

		/*
		// XXX rename to post-include and post-quote
		'page-text': Macro('',
			['src'],
			function(context, elem, state){
				elem = $(elem)

				return elem.html(context.get(elem.attr('src')).text)
			}),
		'page-raw': Macro('',
			['src'],
			function(context, elem, state){
				elem = $(elem)

				return elem.text(context.get(elem.attr('src')).text)
			}),
		//*/
	},

	// Filters...
	//
	// Signature:
	// 	filter(text) -> html
	//
	filter: {
		default: 'html',

		html: function(context, elem){ return $(elem) },

		text: function(context, elem){ return $('<span>')
			.append($('<pre>')
				.html($(elem).html())) },
		// XXX expperimental...
		json: function(context, elem){ return $('<span>')
			.html($(elem).text()
				// remove JS comments...
				.replace(/\s*\/\/.*$|\s*\/\*(.|[\n\r])*?\*\/\s*/mg, '')) },

		// XXX
		nl2br: function(context, elem){ 
			return $('<div>').html($(elem).html().replace(/\n/g, '<br>\n')) },

		wikiword: function(context, elem){ 
			return $('<span>')
				.html(setWikiWords($(elem).html(), true, this.__include_marker__)) },


		// XXX move this to a plugin...
		markdown: function(context, elem){
			var converter = new showdown.Converter({
				strikethrough: true,
				tables: true,
				tasklists: true,
			})

			return $('<span>')
				.html(converter.makeHtml($(elem).html()))
				// XXX add click handling to checkboxes...
				.find('[checked]')
					.parent()
						.addClass('checked')
						.end()
					.end()
		},
	},


	// Parsing:
	//  1) expand macros
	//  2) apply filters
	//  3) merge and parse included pages:
	//  	1) expand macros
	//  	2) apply filters
	//  4) fill slots
	//  5) expand post-macros
	//
	// NOTE: stage 4 parsing is executed on the final merged page only 
	// 		once. i.e. it is not performed on the included pages.
	// NOTE: included pages are parsed in their own context.
	// NOTE: slots are parsed in the context of their containing page 
	// 		and not in the location they are being placed.
	//
	// XXX support quoted text...
	// XXX need to quote regexp chars of .__include_marker__...
	parse: function(context, text, state, skip_post, pattern){
		var that = this

		state = state || {}
		state.filters = state.filters || []
		state.slots = state.slots || {}
		state.include = state.include || []

		//pattern = pattern || RegExp('@([a-zA-Z-_]+)\\(([^)]*)\\)', 'mg')
		pattern = pattern || RegExp.apply(null, this.__macro__pattern__)

		// XXX need to quote regexp chars...
		var include_marker = RegExp(this.__include_marker__, 'g')

		var parsed = typeof(text) == typeof('str') ? 
			$('<span>').html(text) 
			: text

		var _parseText = function(context, text, macro){
			return text.replace(pattern, function(match){
				// XXX parse match...
				var d = match.match(/@([a-zA-Z-_:]*)\(([^)]*)\)/)

				var name = d[1]

				if(name in macro){
					var elem = $('<'+name+'/>')

					// format positional args....
					var a = d[2]
						.split(/((['"]).*?\2)|\s+/g)
						// cleanup...
						.filter(function(e){ return e && e != '' && !/^['"]$/.test(e)})
						// remove quotes...
						.map(function(e){ return /^(['"]).*\1$/.test(e) ? e.slice(1, -1) : e })

					// add the attrs to the element...
					a.forEach(function(e, i){
						var k = ((macro[name] || {}).macro_args || [])[i]
						k && elem.attr(k, e)
					})

					// call macro...
					var res = macro[name]
						.call(that, context, elem, state,
							function(elem, c){ 
								return _parse(c || context, elem, macro) })

					return res instanceof jQuery ? 
							// merge html of the returned set of elements...
							res.map(function(i, e){ return e.outerHTML })
								.toArray()
								.join('\n')
						: typeof(res) != typeof('str') ? res.outerHTML
						: res
				}

				return match
			})
		}
		// NOTE: this modifies parsed in-place...
		var _parse = function(context, parsed, macro){
			$(parsed).contents().each(function(_, e){
				// #text / comment node -> parse the @... macros...
				if(e.nodeType == e.TEXT_NODE || e.nodeType == e.COMMENT_NODE){
					// get actual element content...
					var text = $('<div>').append($(e).clone()).html()

					$(e).replaceWith(_parseText(context, text, macro))

				// node -> html-style + attrs...
				} else {
					var name = e.nodeName.toLowerCase()

					// macro match -> call macro...
					if(name in  macro){
						$(e).replaceWith(macro[name]
							.call(that, context, e, state, 
								function(elem, c){ 
									return _parse(c || context, elem, macro) }))

					// normal tag -> attrs + sub-tree...
					} else {
						// parse attr values...
						for(var i=0; i < e.attributes.length; i++){
							var attr = e.attributes[i]

							attr.value = _parseText(context, attr.value, macro)
						}

						// parse sub-tree...
						_parse(context, e, macro)
					}
				}
			})

			return parsed
		}


		// macro stage...
		_parse(context, parsed, this.macro)

		// filter stage...
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
					//console.warn('Unknown filter:', f)
					return
				}
				// use the filter...
				parsed = k.call(that, context, parsed) 
			})

		// merge includes...
		parsed
			.html(parsed.html().replace(include_marker, function(){
				var page = state.include.shift()
				var elem = $(page.shift())
				page = page.pop()

				return page.map(function(page){
					return $('<div>')
						.append(elem
							.clone()
							.attr('src', page.path)
							.append(that
								.parse(page,
									page.raw, 
									{ slots: state.slots }, 
									true)))
						.html()
				}).join('\n')
			}))

		// post processing...
		if(!skip_post){
			// fill slots...
			// XXX need to prevent this from processing slots in editable
			// 		elements...
			slots = {}
			// get slots...
			parsed.find('slot')
				.each(function(i, e){
					e = $(e)
					var n = e.attr('name')

					n in slots && e.detach()

					slots[n] = e 
				})
			// place slots...
			parsed.find('slot')
				.each(function(i, e){
					e = $(e)
					var n = e.attr('name')

					e.replaceWith(slots[n])
				})

			// post-macro...
			this.post_macro 
				&& _parse(context, parsed, this.post_macro)
		}

		// XXX shuld we get rid of the rot span???
		return parsed
	},
}



/*********************************************************************/

// XXX not sure about these...
// XXX add docs...
var BaseData = {
	// Macro acces to standard page attributes (paths)...
	'System/title': function(){ return '['+ this.get('..').title +']' },
	'System/path': function(){ return '['+ this.dir +']' },
	'System/dir': function(){ return '['+ this.get('..').dir +']' },
	'System/location': function(){ return '['+ this.dir +']' },
	'System/resolved': function(){ return '['+ this.get('..').acquire() +']' },

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
		text: ''
			+'<!-- place filters here so as not to takup page space: ... -->\n'
			+'\n'
			+'Page @include(./path) is empty.' +'<br><br>\n'
			+'\n'
			+'Links to this page:' +'<br>\n'
			+'@include(./links)' +'<br><br>\n'
			+'\n',
	},

	'Templates/pages': {
		text: 
			'<macro src="../**"> @source(./path)<br> </macro>\n'
	},

	'Templates/_raw': {
		text: '@source(..)',
	},

	'Templates/_view': {
		text: '\n'
			+'\n'
			+'<div>\n'
				+'<a href="#tree">&#x2630;</a> \n'
				+'@include(../path)\n'
				+'\n'
				+'<slot name="toggle-edit-link">\n'
					+'(<a href="#./_edit">edit</a>)\n'
				+'</slot>\n'
			+'\n'
			+'</div>\n'
			+'<hr>\n'
			+'<h1 class="title" contenteditable tabindex="0">'
				+'<slot name="title">'
					+'@source(../title)'
				+'</slot>'
			+'\n'
			+'</h1>\n'
			+'<br>\n'
			+'\n'
			+'<slot name="page-content">\n'
				+'<include src=".." class="text" saveto=".." tabindex="0"/>\n'
			+'</slot>\n'
			+'\n'
			+'<hr>\n'
			+'<a href="#/">home</a>\n'
			+'\n',
	},
	'Templates/_edit': {
		text: '\n'
			+'<!-- @filter(-wikiword) -->\n'
			+'\n'
			+'<include src="../_view"/>\n'
			+'\n'
			+'<slot name="toggle-edit-link">'
				+'(<a href="#..">view</a>)'
			+'</slot>\n'
			+'\n'
			+'<slot name="page-content">\n'
				+'<code><pre>'
					+'<quote src="../raw" class="raw" saveto=".." contenteditable/>'
				+'</pre></code>\n'
			+'</slot>'
			+'',
	},
}
data.__proto__ = BaseData



/*********************************************************************/

// XXX add .json support...
var Wiki = {
	__wiki_data: data,

	__config_page__: 'System/Settings',

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

	__macro_parser__: macro,


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
	// Get list of paths resolving '*' and '**'
	//
	// XXX should we list parent pages???
	// XXX should this acquire stuff???
	resolveStarPath: function(path){
		// no pattern in path -> return as-is...
		if(path.indexOf('*') < 0){
			return [ path ]
		}

		// get the tail...
		var tail = path.split(/\*/g).pop()
		tail = tail == path ? '' : tail

		var pattern = RegExp('^'
			+normalizePath(path)
				// quote regexp chars...
				.replace(/([\.\\\/\(\)\[\]\$\+\-\{\}\@\^\&\?\<\>])/g, '\\$1')

				// convert '*' and '**' to regexp...
				.replace(/\*\*/g, '.*')
				.replace(/^\*|([^.])\*/g, '$1[^\\/]*')
			+'$')

		return Object.keys(this.__wiki_data)
			.map(function(p){ return tail != '' ? 
				normalizePath(p +'/'+ tail) 
				: p })
			.filter(function(p){ return pattern.test(p) })
	},


	// current location...
	get location(){
		return this.__location || this.__home_page__ },
	set location(value){
		this.__location = this.resolveDotPath(value) },


	get data(){
		return this.__wiki_data[this.acquire()] },

	// XXX experimental...
	get config(){
		try{
			return JSON.parse(this.get(this.__config_page__).code) || {}

		} catch(err){
			console.error('CONFIG:', err)
			return {}
		}
	},


	// XXX
	clone: function(){
		var o = Object.create(Wiki)
		o.location = this.location
		//o.__location_at = this.__location_at
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
		return this.resolveStarPath(this.location)[this.at()] },
	// XXX should link updating be part of this???
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
		return path2lst(this.path).slice(0, -1).join('/') },
	set dir(value){
		this.path = value +'/'+ this.title },

	// path parts: title...
	//
	// NOTE: see .path for details...
	get title(){ 
		return path2lst(this.path).pop() },
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


	get text(){
		//return this.parse() 
		// special case: if we are getting ./raw then do not parse text...
		return this.title == 'raw' ? this.raw 
			: this.__macro_parser__.parse(this, this.raw) },
	get code(){
		return this.text.html() },


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

	// NOTE: .get() is not the same as .clone() in that .get() will resolve
	// 		the path to a specific location while .clone() will keep 
	// 		everything as-is...
	//
	// XXX add prpper insyantiation ( .clone() )...
	get: function(path){
		//var o = Object.create(this)
		var o = this.clone() 
		// NOTE: this is here to resolve path patterns...
		o.location = this.path

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


	// iteration...
	get length(){
		return this.resolveStarPath(this.location).length },
	// get/srt postion in list of pages...
	// XXX do we need to min/max normalize n??
	at: function(n){
		// get position...
		if(n == null){
			return this.__location_at || 0
		}

		var l = this.length

		// end of list...
		if(n >= l || n < -l){
			return null
		}

		var res = this.clone()

		n = n < 0 ? l - n : n
		// XXX do we min/max n???
		n = Math.max(n, 0)
		n = Math.min(l-1, n)

		res.__location_at = n

		return res
	},
	prev: function(){ 
		var i = this.at() - 1
		// NOTE: need to guard against overflows...
		return i >= 0 ? this.at(i) : null },
	next: function(){ 
		return this.at(this.at() + 1) },

	map: function(func){
		var res = []
		for(var i=0; i < this.length; i++){
			var page = this.at(i)
			res.push(func.call(page, page, i))
		}
		return res
	},
	filter: function(func){
		var res = []
		for(var i=0; i < this.length; i++){
			var page = this.at(i)
			func.call(page, page, i) && res.push(page)
		}
		return res
	},
	forEach: function(func){
		this.map(func)
		return this
	},


	// serialization...
	// XXX need to account for '*' and '**' in path...
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
