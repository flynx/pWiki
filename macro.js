/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/


var setWikiWords = function(text, show_brackets, skip){
	skip = skip || []
	skip = skip instanceof Array ? skip : [skip]
	return text 
		// set new...
		.replace(
			macro.__wiki_link__,
			function(l){
				// check if WikiWord is escaped...
				if(l[0] == '\\'){
					return l.slice(1) }

				var path = l[0] == '[' ? 
					l.slice(1, -1) 
					: l
				var i = [].slice.call(arguments).slice(-2)[0]

				// XXX HACK check if we are inside a tag...
				var rest = text.slice(i+1)
				if(rest.indexOf('>') < rest.indexOf('<')){
					return l }

				return skip.indexOf(l) < 0 ? 
					('<a '
						+'class="wikiword" '
						+'href="#'+ path +'" '
						+'bracketed="'+ (show_brackets && l[0] == '[' ? 'yes' : 'no') +'" '
						//+'onclick="event.preventDefault(); go($(this).attr(\'href\').slice(1))" '
						+'>'
							+ (!!show_brackets ? path : l) 
						+'</a>')
					: l })}



/*********************************************************************/

function Macro(doc, args, func){
	func.doc = doc
	func.macro_args = args
	return func }



// XXX should inline macros support named args???
var macro =
module = {

	__include_marker__: '{{{INCLUDE-MARKER}}}',

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
			'\\\\?@([a-zA-Z-_]+)\\(([^)]*)\\)'
		].join('|'), 'mg'],

	// default filters...
	//
	// NOTE: these are added AFTER the user defined filters...
	__filters__: [
		'wikiword',
		'noscript',
	],
	__post_filters__: [
		//'noscript',
		'title',
		'editor',
	],

	// XXX should this be here???
	__wiki_link__: RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g'),



	// Macros...
	//
	// XXX add support for sort and reverse attrs in all relavant macros
	// 		(see: macro for details)
	macro: {
		"pwiki-comment": Macro('hide in pWiki',
			[],
			function(context, elem, state){ 
				return '' }),
		now: Macro('Create a now id',
			[],
			function(context, elem, state){ 
				return ''+Date.now() }),
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

				return '' }),

		// include page/slot...
		//
		// NOTE: this will render the page in the caller's context.
		// NOTE: included pages are rendered completely independently 
		// 		from the including page.
		include: Macro('Include page',
			['src', 'isolated', 'text'],
			function(context, elem, state){
				var path = $(elem).attr('src')

				// get and prepare the included page...
				state.include
					.push([elem, context.get(path)])

				// return the marker...
				return this.__include_marker__ }),

		// NOTE: this is similar to include, the difference is that this
		// 		includes the page source to the current context while 
		// 		include works in an isolated context
		source: Macro('Include page source (without parsing)',
			['src'], 
			function(context, elem, state){
				var path = $(elem).attr('src')

				return context.get(path)
					.map(function(page){ return page.raw() })
					.join('\n') }),

		quote: Macro('Include quoted page source (without parsing)',
			['src'], 
			function(context, elem, state){
				elem = $(elem)
				var path = elem.attr('src')

				return $(context.get(path)
					.map(function(page){
						return elem
							.clone()
							.attr('src', page.path())
							.text(page.raw())[0] })) }),

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
					return '' } }),
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

				return elem }),

		// XXX revise macro definition rules -- see inside...
		// XXX do we need macro namespaces or context isolation (for inculdes)???
		macro: Macro('Define/fill macro',
			['name', 'src', 'sort'],
			function(context, elem, state, parse){
				elem = $(elem)
				var name = elem.attr('name')
				var path = elem.attr('src')
				var sort = elem.attr('sort')

				state.templates = state.templates || {}

				// get named macro...
				if(name){
					// XXX not sure which definition rules to use for macros...
					// 		- first define -- implemented now
					// 		- last define -- as in slots
					// 		- first contenr -- original
					//if(elem.html().trim() != ''){
					if(elem.html().trim() != '' 
							// do not redefine...
							&& state.templates[name] == null){
						state.templates[name] = elem.clone()

					} else if(name in state.templates) {
						elem = state.templates[name] } }

				// fill macro...
				if(path){
					var pages = context.get(path)

					// no matching pages -- show the else block or nothing...
					if(pages.length == 0){
						var e = elem
							.find('else').first().clone()
								.attr('src', path)
						parse(e, context)
						return e } 

					// see if we need to overload attrs...
					sort = sort == null ? 
						(elem.attr('sort') || '') 
						: sort
					sort = sort
							.split(/\s+/g)
							.filter(function(e){ return e && e != '' })

					// do the sorting...
					pages = sort.length > 0 ? 
						pages.sort(sort) 
						: pages

					// fill with pages...
					elem = elem.clone()
						.find('else')
							.remove()
						.end()
					return $(pages
						.map(function(page){
							var e = elem.clone()
								.attr('src', page.path())
							parse(e, page)
							return e[0] })) }

				return '' })
	},
	
	// Post macros... 
	//
	// XXX this is disabled for now, see end of .parse(..)
	post_macro: {
		'*': Macro('cleanup...',
			[],
			function(context, elem, state, parse, match){
				if(match != null){
					return match[0] == '\\' ? 
						match.slice(1) 
						: match }
				return elem }),
		/*
		_slot: Macro('',
			['name'],
			function(context, elem, state){
				var name = $(elem).attr('name')

				if(state.slots[name] == null){
					return $(elem).html()

				} else if(name in state.slots){
					return state.slots[name] } }),
		//*/

		/*
		// XXX rename to post-include and post-quote
		'page-text': Macro('',
			['src'],
			function(context, elem, state){
				elem = $(elem)

				return elem.html(context.get(elem.attr('src')).text) }),
		'page-raw': Macro('',
			['src'],
			function(context, elem, state){
				elem = $(elem)

				return elem.text(context.get(elem.attr('src')).text) }),
		//*/
	},

	// Filters...
	//
	// Signature:
	// 	filter(text) -> html
	//
	filter: {
		default: 'html',

		html: function(context, elem){ 
			return $(elem) },
		text: function(context, elem){ 
			return $('<span>')
				.append($('<pre>')
					.html($(elem).html())) },
		// XXX expperimental...
		json: function(context, elem){ return $('<span>')
			.html($(elem).text()
				// remove JS comments...
				.replace(/\s*\/\/.*$|\s*\/\*(.|[\n\r])*?\*\/\s*/mg, '')) },

		// XXX
		nl2br: function(context, elem){ 
			return $('<div>')
				.html($(elem)
					.html()
					.replace(/\n/g, '<br>\n')) },

		wikiword: function(context, elem){ 
			return $('<span>')
				.html(setWikiWords($(elem).html(), true, this.__include_marker__)) },
		// XXX need to remove all on* event handlers...
		noscript: function(context, elem){ 
			return $(elem)
				// remove script tags...
				.find('script')
					.remove()
					.end()
				// remove js links...
				.find('[href]')
					.filter(function(i, e){ return /javascript:/i.test($(e).attr('href')) })
						.attr('href', '#')
						.end()
					.end()
				// remove event handlers...
				// XXX .off() will not work here as we need to remove on* handlers...
		},

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
					.end() },
	},


	// Post-filters...
	//
	// These are run on the final page.
	//
	// The main goal is to setup editors and other active stuff that the
	// user should not have direct access to, but that should be 
	// configurable per instance...
	//
	// for tech and other details see .filter
	//
	post_filter: {
		noscript: function(context, elem){
			// XXX
			return elem },

		// Setup the page title and .title element...
		//
		// Use the text from:
		// 	1) set it H1 if it is the first tag in .text
		// 	2) set it to .location
		//
		// NOTE: we do not set the title tag here because this will be 
		// 		done for every included page... 
		title: function(context, elem){
			elem = $(elem)
			var title = elem.find('.text h1').first()

			// show first H1 as title...
			if(elem.find('.text').text().trim().indexOf(title.text().trim()) == 0){
				title.detach()
				elem.find('.title').html(title.html()) }

			return elem },
		// XXX this needs save/reload...
		editor: function(context, elem){
			// XXX title
			// 		- on focus set it to .title
			// XXX text
			// XXX raw
			// XXX checkbox

			return elem },
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
	// XXX include recursion is detected but path recursion is not at 
	// 		this point...
	// 		e.g. the folowing paths resolve to the same page:
	// 			/SomePage
	// 			/SomePage/SomePage
	// 			or any path matching:
	// 				/\/(SomePage\/)+/
	// XXX slow when lots of pages need to be included...
	parse: function(context, text, state, skip_post, pattern){
		var that = this

		state = state || {}
		state.filters = state.filters || []
		//state.slots = state.slots || {}
		state.include = state.include || []
		state.seen = state.seen || []

		//pattern = pattern || RegExp('@([a-zA-Z-_]+)\\(([^)]*)\\)', 'mg')
		pattern = pattern
			|| RegExp.apply(null, this.__macro__pattern__)

		// XXX need to quote regexp chars...
		var include_marker = RegExp(this.__include_marker__, 'g')

		var parsed = typeof(text) == typeof('str') ? 
			$('<span>').html(text) 
			: text

		var _parseText = function(context, text, macro){
			return text.replace(pattern, function(match){
				// quoted macro...
				if(match[0] == '\\' && macro['*'] == null){
					return match.slice(1) }
					//return match }

				// XXX parse match...
				var d = match.match(/@([a-zA-Z-_:]*)\(([^)]*)\)/)

				var name = d[1]

				if(name in macro || '*' in macro){
					var elem = $('<'+name+'/>')

					name = name in macro ? 
						name 
						: '*'

					// format positional args....
					var a = d[2]
						.split(/((['"]).*?\2)|\s+/g)
						// cleanup...
						.filter(function(e){ 
							return e 
								&& e != '' 
								&& !/^['"]$/.test(e)})
						// remove quotes...
						.map(function(e){ 
							return /^(['"]).*\1$/.test(e) ? 
								e.slice(1, -1) 
								: e })

					// add the attrs to the element...
					name != '*' 
						&& a.forEach(function(e, i){
							var k = ((macro[name] || {}).macro_args || [])[i]
							k 
								&& elem.attr(k, e) })

					// call macro...
					var res = macro[name]
						.call(that, context, elem, state,
							function(elem, c){ 
								return _parse(c || context, elem, macro) },
							match)

					return res instanceof jQuery ? 
							// merge html of the returned set of elements...
							res.map(function(i, e){ return e.outerHTML })
								.toArray()
								.join('\n')
						: typeof(res) != typeof('str') ? 
							res.outerHTML
						: res }

				return match }) }
		// NOTE: this modifies parsed in-place...
		var _parse = function(context, parsed, macro){
			$(parsed).contents().each(function(_, e){
				// #text / comment node -> parse the @... macros...
				if(e.nodeType == e.TEXT_NODE 
						|| e.nodeType == e.COMMENT_NODE){
					// get actual element content...
					// NOTE: we need to do this like this to avoid 
					// 		unparsing special characters...
					var text = $('<div>').append($(e).clone()).html()

					// conditional comment...
					if(e.nodeType == e.COMMENT_NODE 
							&& /^<!--\s*\[pWiki\[(.|\n)*\]\]\s*-->$/.test(text)){
						text = text
							.replace(/^<!--\s*\[pWiki\[/, '')
							.replace(/\]\]\s*-->$/, '') }

					$(e).replaceWith(_parseText(context, text, macro))

				// node -> html-style + attrs...
				} else {
					var name = e.nodeName.toLowerCase()

					// parse attr values...
					for(var i=0; i < e.attributes.length; i++){
						var attr = e.attributes[i]

						attr.value = _parseText(context, attr.value, macro) }

					// macro match -> call macro...
					if(name in  macro){
						$(e).replaceWith(macro[name]
							.call(that, context, e, state, 
								function(elem, c){ 
									return _parse(c || context, elem, macro) }))

					// normal tag -> sub-tree...
					} else {
						_parse(context, e, macro) } } })

			return parsed }
		var _filter = function(lst, filters){
			lst
				// unique -- leave last occurance..
				.filter(function(k, i, lst){ 
					return k[0] != '-'
						// filter dupplicates... 
						&& lst.slice(i+1).indexOf(k) == -1 
							// filter disabled...
						&& lst.slice(0, i).indexOf('-' + k) == -1 })
				// unique -- leave first occurance..
				//.filter(function(k, i, lst){ return lst.slice(0, i).indexOf(k) == -1 })
				// apply the filters...
				.forEach(function(f){
					var k = f
					// get filter aliases...
					var seen = []
					while(typeof(k) == typeof('str') && seen.indexOf(k) == -1){
						seen.push(k)
						k = filters[k] }
					// could not find the filter...
					if(!k){
						//console.warn('Unknown filter:', f)
						return }
					// use the filter...
					parsed = k.call(that, context, parsed) }) }

		// macro stage...
		_parse(context, parsed, this.macro)

		// filter stage...
		_filter(state.filters.concat(this.__filters__), this.filter)

		// XXX DEBUG...
		var t = Date.now()
		console.log('>>>', context.path())

		// merge includes...
		parsed
			.html(parsed.html()
				.replace(include_marker, function(){
					var page = state.include.shift()
					var elem = $(page.shift())
					page = page.pop()
					var isolated = elem.attr('isolated') == 'true'

					var seen = state.seen.slice()
					if(seen.indexOf(page.path()) >= 0){
						return elem.html() }
					seen.push(page.path())

					return page.map(function(page){
						return $('<div>')
							.append(elem
								.clone()
								.attr('src', page.path())
								.append(that
									.parse(page,
										page.raw(), 
										{ 
											//slots: !isolated ? state.slots : {},
											templates: state.templates,
											seen: seen,
										}, 
										!isolated)))
										//true)))
							.html()
					}).join('\n') }))

		// XXX DEBUG...
		//console.log('<<<', context.path(),'TIME:', Date.now() - t)

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

					// XXX not sure about this...
					// 		...check if it prevents correct slot parsing
					// 		within an isolated include...
					if(e.parents('[isolated="true"]').length > 0){
						return }

					var n = e.attr('name')

					n in slots 
						&& e.detach()

					slots[n] = e })
			// place slots...
			parsed.find('slot')
				.each(function(i, e){
					e = $(e)

					// XXX not sure about this...
					// 		...check if it prevents correct slot parsing
					// 		within an isolated include...
					if(e.parents('[isolated="true"]').length > 0){
						return }

					var n = e.attr('name')

					e.replaceWith(slots[n]) })

			// post-macro...
			// XXX for some odd reason this clears the backslash from 
			// 		quoted macros in raw fields...
			//this.post_macro 
			//	&& _parse(context, parsed, this.post_macro)
		}

		// post-filter stage...
		// XXX get list from context.config...
		_filter(this.__post_filters__, this.post_filter)

		// XXX shuld we get rid of the root span???
		return parsed.contents() },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
