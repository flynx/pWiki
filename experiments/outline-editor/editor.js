/**********************************************************************
* 
*
* XXX need better general/arch docs...
*
**********************************************************************/



//---------------------------------------------------------------------
// Helpers...

/*
function clickPoint(x,y){
	document
		.elementFromPoint(x, y)
		.dispatchEvent(
			new MouseEvent( 'click', { 
				view: window,
				bubbles: true,
				cancelable: true,
				screenX: x, 
				screenY: y, 
			} )) }
//*/


// Get the character offset at coordinates...
//
// This is done by moving a range down the element until its bounding 
// box corresponds the to desired coordinates. This accounts for nested 
// elements.
//
// XXX do a binary search?? 
var getCharOffset = function(elem, x, y, data){
	data = data ?? {}
	var r = document.createRange()
	var elem_rect = data.elem_rect = 
		data.elem_rect 
			?? elem.getBoundingClientRect()
	for(var e of [...elem.childNodes]){
		var prev
		var c = data.c = 
			data.c 
				?? 0
		// text node...
		if(e instanceof Text){
			var rect, cursor_line, line_start, offset
			for(var i=0; i < e.length; i++){
				r.setStart(e, i)
				r.setEnd(e, i)
				prev = rect 
					?? data.prev
				rect = r.getBoundingClientRect()
				// line change...
				// NOTE: this is almost identical to .getTextOffsetAt(..) see
				// 		that for more docs...
				line_start = prev 
					&& prev.y != rect.y
				if(line_start){
					if(cursor_line){
						return offset 
							?? c + i - 2 } 
					offset = undefined }
				cursor_line = 
					rect.y <= y 
						&& rect.bottom >= y
				if(offset == null
						&& rect.x >= x){
					// get closest edge of element under cursor...
					var dp = Math.abs(
						((!prev || line_start) ? 
							elem_rect 
							: prev).x 
						- x) 
					var dx = Math.abs(rect.x - x)
					offset = dx <= dp ?
						c + i
						: c + i - 1
					if(cursor_line){
						return offset } } }
			data.c += i
			data.last = e.data[i-1]
		// html node...
		} else {
			prev = data.prev = 
				prev 
				?? data.prev
			// special case: line break between cursor line and next element...
			if(prev 
					// cursor line...
					&& prev.y <= y 
					&& prev.bottom >= y
					// line break...
					&& prev.y < e.getBoundingClientRect().y
					// no whitespace at end, no compensation needed... (XXX test)
					&& ' \t\n'.includes(data.last)){
				return data.c - 1 }

			// handle the node...
			data = getCharOffset(e, x, y, data)

			if(typeof(data) != 'object'){
				return data } } }
	return arguments.length > 3 ?
		data
		// root call...
		: data.c }


// Get offset in markdown relative to the resulting text...
//                     
//					    v <----- position
//		text:		'Hea|ding'
//					    |
//		                +-+ <--- offset in markdown
//		                  |
//		markdown:	'# Hea|ding'
//
// XXX should this be replaced with offsetAt(..)???
var getMarkdownOffset = function(markdown, text, i){
	i = i ?? text.length
	var m = 0
	// walk both strings skipping/counting non-matching stuff...
	for(var t=0; t <= i; t++, m++){
		var c = text[t]
		var p = m
		// walk to next match...
		while(c != markdown[m] && m < markdown.length){
			m++ } 
		// reached something unrepresentable directly in markdown (html 
		// entity, symbol, ...)
		if(m >= markdown.length){
			m = p } }
	return m - t }
var offsetAt = function(A, B, i){
    i ??= A.length-1
    var o = 0
    var p = 0
    for(var n=0; n <= i; n++){
        while(A[n] != B[n+o]){
            if(n+o >= B.length){
                o = p
                break }
            o++ }
        p = o }
    return o }


// Get element text content...
//
// NOTE: this is the same as .innerText but will not add extra "\n" after 
// 		each block element...
var getTexts = function(elem, res=[]){
    for(var n of elem.childNodes){
        n.nodeType == n.TEXT_NODE ?
            res.push(n.textContent)
            : getTexts(n, res) }
    return res }
var getText = function(elem){
	return getTexts(elem).join('') }



//---------------------------------------------------------------------
// Plugins...
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//
//	.__setup__(<editor>)
//		-> <this>
//
//
// 	.__parse_code__(<string>, <editor>, <elem>)
// 		-> <string>
//
//
// 	.__pre_parse__(<string>, <editor>, <elem>)
// 		-> <string>
//
// 	.__parse__(<string>, <editor>, <elem>)
// 		-> <string>
//
// 	.__post_parse__(<string>, <editor>, <elem>)
// 		-> <string>
//
//
//	.__parse_attrs__(<attrs>, <editor>, <elem>)
//		-> <attrs>
//
//	.__change__()
//
//	.__editedview__()
//	.__editedcode__()
//
//	.__click__()
//	.__focusin__()
//	.__focusout__()
//	.__keydown__()
//	.__keyup__()
//
//
// 	.encode(<str>)
// 		-> <str>
//
//
// NOTE: new extension methods can be defined/called in plugins via 
// 		the .runPlugins(..) method.
// XXX reference where (plugin) a method is defined if it is not system...
// 		...both hereand in the plugin itself.
// 		
//
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//

// general helpers and utils...
var plugin = {
	encode: function(text){
		return text
			.replace(/(?<!\\)&/g, '&amp;')
			.replace(/(?<!\\)</g, '&lt;')
			.replace(/(?<!\\)>/g, '&gt;')
			.replace(/\\(?!`)/g, '\\\\') },

	// XXX make this more generic...
	style: function(editor, elem, style, code=undefined){
		style = [style].flat()
		editor.__styles = [...new Set([
			...(editor.__styles ?? []),
			...style,
		])]
		return function(_, text){
			elem.style ??= []
			elem.style.push(...style)
			// handler...
			if(typeof(code) == 'function'){
				return code(...arguments) }
			// explicit code...
			if(code != null){
				return code }
			// get first non-empty group...
			var groups = [...arguments].slice(1, -2)
			while(groups.length > 0 
					&& groups[0] == null){
				groups.shift() }
			return groups[0] 
				?? '' } },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// Process attributes in code and update the attributes in element data...
//
// This does:
// 	- parse attributes
// 	- update element data (JSON)
// 	- filter attributes out (optionally)
//
var attributes = {
	__proto__: plugin,

	// XXX should attr settings be set here or in the Outline???
	// 		...this includes .__block_attrs__ and .__system_attrs__

	//
	//	Parse attrs...
	//	.parseBlockAttrs(<text>[, <elem>])
	//		-> [<elem>, <attrs>, <sys-attrs>]
	//
	parseBlockAttrs: function(editor, text, elem={}){
		var system = editor.__block_attrs__
		var attrs = ''
		var sysattrs = ''
		elem.text = text
			// XXX for some reason changing the first group into (?<= .. )
			// 		still eats up the whitespace...
			// 		...putting the same pattern in a normal group and 
			// 		returning it works fine...
			//.replace(/(?<=[\n\h]*)(?:(?:\n|^)\s*\w*\s*::\s*[^\n]*\s*)*$/, 
			.replace(/([\n\t ]*)(?:(?:\n|^)[\t ]*\w+[\t ]*::[\t ]*[^\n]+[\t ]*)+$/, 
				function(match, ws){
					match = match
						.trim()
						.split(/(?:[\t ]*::[\t ]*|[\t ]*\n[\t ]*)/g)
					while(match.length > 0){
						var [name, val] = match.splice(0, 2)
						// ignore non-settable attrs...
						if(editor.__system_attrs__.includes(name)){
							continue }
						elem[name] = 
							val == 'true' ?
				   				true
							: val == 'false' ?
								false
							: val }
					return ws })
		// build the attr strings...
		// NOTE: we are not doing this in the loop above to include all 
		// 		the attributes that are in the elem but not explicitly 
		// 		given in code...
		for(var name in elem){
			// ignore non-settable attrs...
			if(editor.__system_attrs__.includes(name)){
				continue }
			var val = elem[name]
			if(!(name in system)){
				attrs += `\n${name}::${val}`
			} else {
				sysattrs += `\n${name}::${val}` } }
		return [
			elem, 
			attrs, 
			sysattrs,
		] },

	// generate code...
	// 
	// this is controlled by the value of editor.__code_attrs__:
	// 	false / undefined	- strip attrs
	// 	true				- add attrs to code if available
	// 	'all'				- add attrs, including system attrs to 
	// 						  code if available,
	__parse_code__: function(code, editor, elem){
		var [elem, attrs, system] = this.parseBlockAttrs(editor, code, elem)
		return !editor.__code_attrs__ ?
				elem.text
			: editor.__code_attrs__ == 'all' ?
				elem.text 
					+ (attrs.length > 0 ? 
						'\n'+ attrs
						: '')
					+ (system.length > 0 ?
						'\n'+ system
						: '')
			: attrs.length > 0 ?
				elem.text +'\n'+ attrs 
			: elem.text },

	// generate view...
	//
	// this is controlled by the value of editor.__view_attrs__:
	// 	false / undefined	- strip attrs
	// 	true				- call the handler XXX
	__pre_parse__: function(text, editor, elem){
		// NOTE: we are intentionally neglecting system attrs here...
		var [elem, attrs, system] = this.parseBlockAttrs(editor, text, elem)
		if(editor.__view_attrs__ 
				&& attrs.length > 0){
			attrs = editor.threadPlugins('__parse_attrs__', attrs, editor, elem)
			if(attrs && attrs.length > 0){
				return text +'\n'+ attrs } }
		return elem.text },

	// XXX
	//__parse_attrs__: function(attrs, editor, elem){
	//	return attrs }
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX handle cursor marker...
// XXX do button naviigation a-la tasks...
var templates = {
	__proto__: plugin,

	__default_button_text__: 'New',

	nodeFromTemplate: function(){
	},

	__pre_parse__: function(text, editor, elem){
		if(!text.startsWith('TEMPLATE')){
			return text }

		text = text
			.replace(/^TEMPLATE/, '')
		var [header, ...lines] = text.split(/\n/g)

		// set direction...
		if(header[0] == '^'){
			header = header.slice(1) 
			elem.create_new = 'above' 
		} else {
			elem.create_new = 'below' }
		
		// nested button...
		var nested_button
		header = header
			.trim()
			.replace(/\[([^\]]*)\]/g, 
				function(_, text){
					nested_button = true
					return `<button class="template-action">${ 
							text.trim() 
						}</button>` })
		// whole text is a button...
		if(!nested_button){
			header = 
				`<button class="template-action">${
					header.trim() == '' ?
						this.__default_button_text__
						: header.trim()
				}</button>` }

		// body...
		// XXX only do this if we have nested elements...
		elem.collapsed = true

		elem.ignore = true

		// button...
		return header },
	// XXX focus button -- see todo...
	__focusin__: function(evt, editor, elem){
		//elem.classList.contains('block')
		//	&& elem.querySelector('button').focus() 
	},
	__click__: function(evt, editor, elem){
		e = evt.target
		// check if we are clicking a button...
		while(e.tagName != 'BUTTON' 
				&& e.parentElement != null){
			e = e.parentElement }
		if(!e.classList.contains('template-action')){
			return }
		if(e.tagName == 'BUTTON'){
			// get template data...
			var data = editor.data(elem)
			// subtree...
			if(data.children.length > 0){
				// get the corresponding template...
				var i = [...editor.get(elem).querySelectorAll('button')]
					.indexOf(e)
				data = data.children[i]
			// text -> trim off the TEMPLATE header...
			} else {
				data.text = data.text
					.split(/\n/)
					.slice(1)
					.join('\n') }

			// XXX handle cursor placement / selection markers...
			// XXX

			var direction = 
				editor.data(elem).create_new == 'above' ? 
					'prev' 
					: 'next'

			editor.focus(elem)
			editor.edit(
				// XXX BUG? currently this only creates a single node, 
				// 		should be recursive, i.e. subtree...
				editor.Block(data, direction)) } },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX revise headings...
var blocks = {
	__proto__: plugin,

	__pre_parse__: function(text, editor, elem){
		return text 
			// markdown...
			// style: headings...
			/* XXX chose either this or auto headings -- move docs...
			.replace(/^(?<!\\)######\s+([^]*)$/, this.style(editor, elem, ['heading', 'heading-6']))
			.replace(/^(?<!\\)#####\s+([^]*)$/, this.style(editor, elem, ['heading', 'heading-5']))
			.replace(/^(?<!\\)####\s+([^]*)$/, this.style(editor, elem, ['heading', 'heading-4']))
			.replace(/^(?<!\\)###\s+([^]*)$/, this.style(editor, elem, ['heading', 'heading-3']))
			.replace(/^(?<!\\)##\s+([^]*)$/, this.style(editor, elem, ['heading', 'heading-2']))
			.replace(/^(?<!\\)#\s+([^]*)$/, this.style(editor, elem, ['heading', 'heading-1']))
			// XXX EXPERIMENTAL
			.replace(/^(?<!\\)@+\s+([^]*)$/, this.style(editor, elem, ['heading', 'auto']))
			/*/ 
			// XXX EXPERIMENTAL
			// NOTE: '[^]' is the same as [\s\S] but is unique to JS...
			.replace(/^(?<!\\)#+\s+([^]*)$/, this.style(editor, elem, ['heading']))
			.replace(/^(?<!\\)@+\s+([^]*)$/, this.style(editor, elem, ['heading', 'no-toc']))
			//*/
			// style: list...
			//.replace(/^(?<!\\)[-\*]\s+([^]*)$/m, style('list-item'))
			.replace(/^\s*([^]*)(?<!\\):\s*$/, this.style(editor, elem, 'list'))
			.replace(/^\s*([^]*)(?<!\\)#\s*$/, this.style(editor, elem, 'numbered-list'))
			// style: misc...
			.replace(/^\s*(?<!\\)>\s+([^]*)$/, this.style(editor, elem, 'quote'))
			.replace(/^\s*(?<!\\)((\/\/|;)\s+[^]*)$/, this.style(editor, elem, 'comment'))
			.replace(/^\s*(?<!\\)NOTE:?\s*([^]*)$/, this.style(editor, elem, 'NOTE'))
			.replace(/^\s*(?<!\\)XXX\s+([^]*)$/, this.style(editor, elem, 'XXX'))
			.replace(/^([^]*)\s*(?<!\\)XXX\s*$/, this.style(editor, elem, 'XXX'))
			.replace(/^\s*---\+\s*$/, this.style(editor, elem, 'hr', '<hr>')) } ,
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX add actions...
var quoted = {
	__proto__: plugin,

	// can be used in:
	// 		<string>.replace(quoted.pattern, quoted.handler)
	quote_pattern: /(?<!\\)`(?=[^\s])(([^`]|\\`)*[^\s])(?<!\\)`/gm,
	quote: function(_, code){
		return `<code>${ this.encode(code) }</code>` },

	pre_pattern: /(?<!\\)```(.*\s*\n)((\n|.)*?)\h*(?<!\\)```[ \t]*(?:$|\n)/gm,
	preEncode: function(text){
		return this.encode(text)
			.replace(/`/, '\\`') },
	pre: function(_, language, code){
		language = language.trim()
		language = language ?
			'language-'+language
			: language
		return `<pre>`
				+`<code contenteditable="true" class="${language}">${ 
					this.preEncode(code)
				}</code>`
			+`</pre>` },

	map: function(text, func){
		return text.replace(this.pre_pattern, func) },
	replace: function(text, index, updated){
		return this.map(text, 
			function(match, language, code){
				return index-- != 0 ?
					match
					: ('```'+language
						+ (typeof(updated) == 'function' ?
							updated(code)
							: updated)
						+'```') }) },
	toHTML: function(text){
		return this.map(text, this.handler) },

	__pre_parse__: function(text, editor, elem){
		return text
			.replace(this.pre_pattern, this.pre.bind(this)) 
			.replace(this.quote_pattern, this.quote.bind(this)) },

	// XXX is this a good strategy???
	__state: undefined,
	__keydown__: function(evt, editor, elem){
		// code editing...
		if(elem.nodeName == 'CODE' 
				&& elem.getAttribute('contenteditable') == 'true'){
			// XXX can keydown and keyup be triggered from different elements???
			this.__state = elem.innerText
			// XXX move this to keyboard.js...
			if(evt.key == 'Escape'){
				editor.focus(elem) }
			// XXX not sure if the is needed with keyboard.js...
			return false } },
	// defined <plugin>.__editedview__(..) handler
	__keyup__: function(evt, editor, elem){
		var elem = evt.target
		if(elem.nodeName == 'CODE' 
				&& elem.getAttribute('contenteditable') == 'true'){
			// trigger if state actually changed..
			this.__state != elem.innerText
				&& editor.runPlugins('__editedview__', evt, editor, elem) } },
	__focusout__: function(){
		this.__state = undefined },
	__editedview__: function(evt, editor, elem){
		// editable code...
		var block = editor.get(elem)
		var code = block.querySelector('.code')

		var update = elem.innerText
		var i = [...block
				.querySelectorAll('.view code[contenteditable=true]')]
			.indexOf(elem)
		// update element content...
		code.value = quoted.replace(code.value, i, update)

		return this },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX add ability to skip subtree from status calculation...
var tasks = {
	__proto__: plugin,

	status: [
		'DONE',
		'REJECT',
		//'TODO',
	],
	// format:
	// 	[
	// 		<status>: <pattern>,
	// 		...
	// 	]
	__status_patterns: undefined,
	__status_pattern_tpl: `^(?:\\s*(?<!\\\\)$STATUS:?\\s+(.*)$|(.*)\\s+(?<!\\\\)$STATUS\\s*)$`,
	get status_patterns(){
		var that = this
		return (this.__status_patterns 
			??= this.status
				.reduce(function(res, status){
					res[status] = new RegExp(
						that.__status_pattern_tpl
							.replace(/\$STATUS/g, status), 'm') 
					return res }, {})) },

	// State...
	// NOTE: this will not count checkboxes under '[ignore]', this is 
	// 		useful for not ounting items withing templates and the like...
	updateStatus: function(editor, node){
		node = editor.get(node)
		if(node == null){
			return this }
		var state = node
			.querySelector('.view')
				.querySelector('.completion')
		if(state){
			var checkboxes = 
				node.querySelectorAll('input[type=checkbox]').length 
				// XXX should we check ignore value here???
				- node.querySelectorAll('[ignore] input[type=checkbox]').length
			var checkboxes_checked = 
				node.querySelectorAll('input[type=checkbox]:checked').length 
				// XXX should we check ignore value here???
				- node.querySelectorAll('[ignore] input[type=checkbox]:checked').length
			var c = 
				((checkboxes_checked / checkboxes) * 100)
				.toFixed(0)
			!isNaN(c)
				&& state.setAttribute('completion', c +'%') }
		return this },
	updateBranchStatus: function(editor, node){
		if(!node){
			return this }
		var outline = editor.outline
		var p = node
		while(p !== outline){
			this.updateStatus(editor, p)
			p = editor.get(p, 'parent') } 
		return this },
	updateAllStatus: function(editor){
		for(var e of [...editor.outline.querySelectorAll('.block>.view .completion')]){
			this.updateStatus(editor, e) }
		return this },
	// Checkboxes...
	getCheckbox: function(editor, elem, offset=0){
		elem = elem 
			?? editor.get()
		if(elem == null 
				|| (offset == 0
					&& elem.type == 'checkbox')){
			return elem }
		var node = editor.get(elem)
		var view = node.querySelector('.view')
		var cur = view.querySelector('input[type=checkbox].selected') 
			?? view.querySelector('input[type=checkbox]') 
		if(offset == 0 && cur == null){
			return}
		var checkboxes = [...editor.outline.querySelectorAll('.view input[type=checkbox]')]
		if(checkboxes.length == 0){
			return }
		// no checkbox in node -> get closest to cur in offset direction...
		if(cur == null){
			var nodes = [...editor.outline.querySelectorAll('.block')]
			var checkbox_nodes = checkboxes
				.map(function(e){ 
					return editor.get(e) })
			var i = nodes.indexOf(node)
			var p, n
			for(var c of checkbox_nodes){
				p = n
				var j = nodes.indexOf(c)
				if(j >= i){
					n = j
					break } }
			cur = offset < 0 ?
				nodes[p] 
				: nodes[n] }
		var elem = cur == null ?
			checkboxes.at(
				offset > 0 ? 
					offset -1 
					: offset)
			: checkboxes.at(
				(checkboxes.indexOf(cur) + offset) % checkboxes.length)
		return elem },
	updateCheckboxes: function(editor, elem){
		elem = this.getCheckbox(editor, elem)
		var node = editor.get(elem, false)
		var data = editor.data(node)
		var text = node.querySelector('.code')
		// get the checkbox order...
		var i = [...node.querySelectorAll('input[type=checkbox]')].indexOf(elem)
		var to = elem.checked ?
			'[X]'
			: '[_]'
		var toggle = function(m){
			return i-- == 0 ?
				to
				: m }
		text.value = text.value.replace(/\[[Xx_]\]/g, toggle) 
		// NOTE: status is updated via a timeout set in .__parse__(..)...
		editor.setUndo(
			editor.path(node),
			'update',
			[editor.path(node), 
				data])
		return elem },
	toggleCheckbox: function(editor, checkbox, offset){
		checkbox = this.getCheckbox(editor, checkbox, offset)
		if(checkbox){
			checkbox.checked = !checkbox.checked
			this.updateCheckboxes(editor, checkbox) 
			this.updateBranchStatus(editor, checkbox) }
		return checkbox },
	selectCheckbox: function(editor, checkbox, offset){
		checkbox = this.getCheckbox(editor, checkbox, offset)
		if(checkbox == null){
			return }
		var checkboxes = editor.get(checkbox)
			.querySelector('.view')
				.querySelectorAll('input[type=checkbox]')
		if(checkboxes.length == 0){
			return }
		for(var c of checkboxes){
			c.classList.remove('selected') }
		checkbox.classList.add('selected')
		editor.show(checkbox)
		return checkbox },
	nextCheckbox: function(editor, node='focused', offset=1){
		node = this.selectCheckbox(editor, node, offset)
		editor.focus(node)
		return node },
	prevCheckbox: function(editor, node='focused', offset=-1){
		return this.nextCheckbox(editor, node, offset) },
	// Status...
	toggleStatus: function(editor, elem, status='next', patterns=this.status_patterns){
		var node = editor.get(elem)
		if(node == null){
			return }
		var data = editor.data(elem, false)
		var text = node.querySelector('.code')
		var value = text.value
		var s = text.selectionStart
		var e = text.selectionEnd
		var l = text.value.length

		var p = Object.entries(patterns)
		for(var i=0; i<p.length; i++){
			var [name, pattern] = p[i]
			if(pattern.test(value)){
				value = value.replace(pattern, '$1')
				if(status != 'off'){
					break } } }
		if(status != 'off'){
			// toggle specific status...
			if(status != 'next'){
				if(i == p.length 
						|| name != status){
					value = status +' '+ value }
			// next...
			} else if(i != p.length-1){
				// set next...
				if(i+1 in p){
					value = p[i+1][0] +' '+ value 
				// set first...
				} else {
					value = p[0][0] +' '+ value } } }

		text.value = value
		text.selectionStart = s + (value.length - l)
		text.selectionEnd = e + (value.length - l)
		editor.update(node)
		editor.setUndo(
			editor.path(node),
			'update',
			[editor.path(node), 
				data])
		return node },
	toggleDone: function(editor, elem){
		return this.toggleStatus(editor, elem, 'DONE') },
	toggleReject: function(editor, elem){
		return this.toggleStatus(editor, elem, 'REJECT') },

	__setup__: function(editor){
		return this.updateAllStatus(editor) },
	__pre_parse__: function(text, editor, elem){
		// handle done..
		var done = this.style(editor, elem, 'DONE')
		var reject = this.style(editor, elem, 'REJECT')
		for(var [n, p] of Object.entries(this.status_patterns)){
			text = text
				.replace(p, 
					n == 'DONE' ?
						done
						: reject) }
		return text },
	__update_checkboxes_timeout: undefined,
	__parse__: function(text, editor, elem){
		var res = text
			// block checkboxes...
			// NOTE: these are separate as we need to align block text 
			// 		to leading chekbox...
			.replace(/^\s*(?<!\\)\[[_ ]\]\s*/m, 
				this.style(editor, elem, 'todo', '<input type="checkbox">'))
			.replace(/^\s*(?<!\\)\[[Xx]\]\s*/m, 
				this.style(editor, elem, 'todo', '<input type="checkbox" checked>'))
			// inline checkboxes...
			.replace(/\s*(?<!\\)\[[_ ]\]\s*/gm, 
				this.style(editor, elem, 'check', '<input type="checkbox">'))
			.replace(/\s*(?<!\\)\[[Xx]\]\s*/gm, 
				this.style(editor, elem, 'check', '<input type="checkbox" checked>'))
			// completion...
			// XXX add support for being like a todo checkbox...
			.replace(/(?<!\\)\[[%]\]/gm, '<span class="completion"></span>') 
		// need to update status...
		// XXX not sure if this is a good way to do this...
		if(res != text && this.__update_checkboxes_timeout == null){
			var that = this
			this.__update_checkboxes_timeout = setTimeout(function(){
				that.__update_checkboxes_timeout = undefined
				that.updateAllStatus(editor) }, 200) }
		return res },
	__focusin__: function(evt, editor, elem){
		elem.classList.contains('block')
			&& this.selectCheckbox(editor, elem) },
	__editedcode__: function(evt, editor, elem){
		this.updateBranchStatus(editor, elem) 
		this.selectCheckbox(editor, elem) },
	__click__: function(evt, editor, elem){
		// toggle checkbox...
		if(elem.type == 'checkbox'){
			var node = editor.get(elem)
			this.updateCheckboxes(editor, elem)
			this.updateBranchStatus(editor, node) 
			this.selectCheckbox(editor, elem) 
			node.focus() } 
		return this },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX do a better default id...
// XXX make this persistent -- add to code...
var toc = {
	__proto__: plugin,

	__skip_local_root__: true,

	update: function(editor, elem){
		var that = this
		var outline = editor.outline
		var TOCs = [...outline.querySelectorAll('.TOC .view')]
		var tocs = [...outline.querySelectorAll('.toc .view')]
		if(TOCs.length + tocs.length == 0){
			return }

		var level = function(node, root=outline){
			var depth = 0
			var parent = node
			while(parent !== root 
					&& parent != null){
				if(parent.classList.contains('block')
					&& parent.classList.contains('heading')){
					depth++ }
				parent = parent.parentElement }
			return depth }
		// XXX revise...
		var seen = new Set()
		var makeID = function(text){
			var id = encodeURI(
				text
					.trim()
					.replace(/[#?$%:;.,]/g, '')
					.replace(/\s+/g, '-'))
			if(seen.has(id)
					|| document.getElementById(id)){
				var i = 1
				var candidate = id +'-'+ i
				while(seen.has(candidate)
						|| document.getElementById(candidate)){
					candidate = id +'-'+ i++ }
				id = id +'-'+ i }
			seen.add(id)
			return id }
		var makeTOC = function(root=outline){
			var index = 0
			var lst = document.createElement('ul')
			var list = lst
			var depth = 1
			for(var e of [...root.querySelectorAll('.block.heading>.view')]){
				var block = editor.get(e)
				// skip the root element???
				if(block.classList.contains('no-toc')
						|| (!that.__skip_local_root__ 
							&& block === root)){
					continue }
				var d = level(e, root)
				// down...
				if(d > depth){
					var sub = document.createElement('ul')
					lst.append(sub)
					lst = sub
					depth++
				// up...
				} else while(d < depth && depth > 0){
					lst = lst.parentElement ?? lst
					depth-- }
				var elem = document.createElement('li')
				var id = block.id == '' ?
					// XXX do a better default...
					//'__'+ index++
					makeID(e.innerText)
					: block.id
				block.id = id
				elem.innerHTML = `<a href="#${id}">${e.innerHTML.trim()}</a>`
				lst.append(elem) } 
			return list }

		// global tocs...
		var list = makeTOC()
		for(var toc of TOCs){
			toc.innerHTML = ''
			toc.append(list.cloneNode(true)) } 
		// local tocs...
		for(var toc of tocs){
			toc.innerHTML = ''
			toc.append(
				makeTOC(
					editor.get(toc, 'parent'))) } },

	__setup__: function(editor){
		return this.update(editor) },
	__editedcode__: function(evt, editor, elem){
		return this.update(editor, elem) },

	__parse__: function(text, editor, elem){
		return text
			.replace(/^\s*toc\s*$/, 
				this.style(editor, elem, 'toc', '')) 
			.replace(/^\s*TOC\s*$/, 
				this.style(editor, elem, 'TOC', '')) },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX Hackish...
var syntax = {
	__proto__: plugin,

	update: function(){
		window.hljs
			&& hljs.highlightAll() 
		return this },

	__setup__: function(editor){
		return this.update() },
	// XXX make a local update...
	__editedcode__: function(evt, editor, elem){
		return this.update(elem) },
	__editedview__: function(evt, editor, elem){
		// XXX should we also clear the syntax???
		delete elem.dataset.highlighted
		return this },
	// XXX this removes highlighting, can we make it update live???
	__focusin__: function(evt, editor, elem){
		if(elem.nodeName == 'CODE' 
				&& elem.getAttribute('contenteditable') == 'true'){
			elem.classList.remove('hljs') } },
	__focusout__: function(evt, editor, elem){
		if(elem.nodeName == 'CODE' 
				&& elem.getAttribute('contenteditable') == 'true'){
			this.update(elem) }
		return this },	
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

var tables = {
	__proto__: plugin,

	// XXX EXPERIMENTAL
	__pre_parse__: function(text, editor, elem){
		return text
			.replace(/^(--table--)$/m, this.style(editor, elem, 'table-2')) },

	__parse__: function(text, editor, elem){
		return text
			.replace(/^\s*(?<!\\)\|\s*((.|\n)*)\s*\|\s*$/, 
				this.style(editor, elem, 
					'table',
					function(_, body){
						return `<table><tr><td>${
							body
								.trim()
								.replace(/\s*\|\s*\n\s*\|\s*/gm, '</td></tr>\n<tr><td>')
								.replace(/\s*\|\s*/gm, '</td><td>')
						}</td></td></table>` })) },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

var styling = {
	__proto__: plugin,

	__parse__: function(text, editor, elem){
		return text
			// markers...
			.replace(/(\s*)(?<!\\)(FEATURE[:?]|Q:|Question:|Note:)(\s*)/gm, 
				'$1<b class="$2">$2</b>$3')
			.replace(/(\s*)(?<!\\)(ASAP|TEST|BUG|FIX|HACK|STUB|WARNING|CAUTION)(\s*)/gm, 
				'$1<span class="highlight $2">$2</span>$3')
			// elements...
			.replace(/(\n|^)(?<!\\)---+[\t ]*(\n|$)/gm, '$1<hr>')
			// basic styling...
			.replace(/(?<!\\)\*(?=[^\s*])(([^*]|\\\*)*[^\s*])(?<!\\)\*/gm, '<b>$1</b>')
			.replace(/(?<!\\)~(?=[^\s~])(([^~]|\\~)*[^\s~])(?<!\\)~/gm, '<s>$1</s>')
			// XXX this can clash with '[_] .. [_]' checkboxes...
			.replace(/(?<!\\)_(?=[^\s_])(([^_]|\\_)*[^\s_])(?<!\\)_/gm, '<i>$1</i>') 
			// code/quoting...
			//.replace(/(?<!\\)`(?=[^\s])(([^`]|\\`)*[^\s])(?<!\\)`/gm, quote) 
			// XXX support "\==" in mark...
			.replace(/(?<!\\)==(?=[^\s])(.*[^\s])(?<!\\)==/gm, '<mark>$1</mark>') 
			// links...
			.replace(/(?<!\\)\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
			.replace(/((?:https?:|ftps?:)[^\s]*)(\s*)/g, '<a href="$1">$1</a>$2') },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX use ligatures for these???
var symbols = {
	__proto__: plugin,

	// XXX use a single regex with handler func to do these...
	symbols: {
		// XXX think these are better handled by ligatures...
		//'>>': '»', 
		//'<<': '«', 
		//'->': '→', 
		//'<-': '←', 
		//'=>': '⇒', 
		//'<=': '⇐', 
		'(i)': '🛈', 
		'(c)': '©', 
		'/!\\': '⚠', 
	},
	get symbols_pattern(){
		return (this.symbols != null 
				&& Object.keys(this.symbols).length > 0) ?
			new RegExp(`(?<!\\\\)(${ 
				Object.keys(this.symbols)
					.join('|') 
						.replace(/([\(\)\\\/])/g, '\\$1') })`, 'g') 
			: undefined },

	__parse__: function(text, editor, elem){
		var that = this
		var p = this.symbols_pattern
		text = p ?
			text.replace(p,
				function(m){
					return that.symbols[m] })
			: text
		return text
			.replace(/(?<!\\)---(?!-)/gm, '&mdash;') 
			.replace(/(?<!\\)--(?!-)/gm, '&ndash;') },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

var escaping = {
	__proto__: plugin,

	__post_parse__: function(text, editor, elem){
		return text
			// quoting...
			// NOTE: this must be last...
			.replace(/(?<!\\)\\(.)/gm, '$1') },
}



//---------------------------------------------------------------------

var JSONOutline = {

	__code_attrs__: false,
	__view_attrs__: false,
	__system_attrs__: [
		'text',
		'children',
	],
	__block_attrs__: {
		id: 'attr',
		collapsed: 'attr',
		ignore: 'attr',
		focused: 'cls',
	},


	// Plugins...
	//
	// The order of plugins can be significant in the following cases:
	// 	- parsing
	// 	- event dropping
	//
	// NOTE: this is split into three to make recomposition simpler for 
	// 		inheritance...
	// 		XXX do we need this structure???
	//
	// XXX should we movw this to plugin and use these as override???
	// XXX split out DOM-specific plugins into Outline.plugins...
	pre_plugins: [
		attributes,
        templates,
		blocks,
		quoted,
	],
	norm_plugins: [
		// NOTE: this needs to be before styling to prevent it from 
		// 		treating '[_] ... [_]' as italic...
		tasks,
		toc,
		styling,
		// XXX
		tables,
		symbols,
		//syntax,
	],
	post_plugins: [
		// keep this last...
		// XXX revise -- should this be external???
		escaping,
	],
	__plugins: undefined,
	get plugins(){
		return this.__plugins 
			?? (this.__plugins = [
				...this.pre_plugins,
				...this.norm_plugins,
				...this.post_plugins,
			]) },

	// NOTE: if a handler returns false it will break plugin execution...
	// 		XXX is this the right way to go???
	runPlugins: function(method, ...args){
		for(var plugin of this.plugins){
			if(method in plugin){
				if(plugin[method](...args) === false){
					return false } } } 
		return true },
	threadPlugins: function(method, value, ...args){
		for(var plugin of this.plugins){
			method in plugin
				&& (value = plugin[method](value, ...args)) }
		return value },

	// format:
	// 	{
	// 		<id>: <node>,
	// 		...
	// 	}
	__id_index: undefined,

	// format:
	// 	Map([
	// 		[<node>, <parent>],
	// 		...
	// 	])
	__nodes: undefined,

	__path: undefined,
	current: undefined,

	__iter: function*(node, path, mode){
		if(typeof(path) == 'string'){
			mode = path
			path = null }
		path ??= []
		yield [path, node]
		if(mode == 'visible' 
				&& node.collapsed){
			return }
		var i = 0
		for(var e of node.children ?? []){
			yield* this.__iter(e, [...path, i++], mode) } },
	// XXX revise...
	nodes: function*(node, mode){
		var i = 0
		// all nodes..
		if(node == null || node == 'all' || node == 'visible'){
			for(var e of this.json()){
				yield* this.__iter(e, [i++], node) } 
		// single node...
		} else {
			var args = [...arguments]
			// XXX revise...
			if(['all', 'visible'].includes(args.at(-1))){
				mode = args.pop() }
			yield* this.__iter(
				this.get(...args), 
				mode) } },
	[Symbol.iterator]: function*(mode='all'){
		for(var node of this.json()){
			for(var [_, n] of this.__iter(node, mode)){
				yield n } } },
	iter: function*(node, mode){
		for(var [_, n] of this.nodes(...arguments)){
			yield n } },

	// XXX
	path: function(){},
	get: function(node, offset){
	},
	focus: function(node, offset){
		return this.get(
			this.__path = this.path(...arguments)) },

	index: function(){},
	at: function(index){},

	indent: function(){},
	shift: function(){},
	show: function(){},
	toggleCollapse: function(){},
	remove: function(){},
	clear: function(){},

	crop: function(){},
	uncrop: function(){},

	// NOTE: this is auto-populated by plugin.style(..)...
	__styles: undefined,

	// block render...
	//
	// This will call plugins':
	//		.__pre_parse__(..)
	//		.__parse__(..)
	//		.__post_parse__(..)
	//
	// XXX PRE_POST_NEWLINE can we avoid explicitly patching for empty lines after pre???
	__code2html__: function(code, elem={}){
		var that = this

		// only whitespace -> keep element blank...
		elem.text = code
		if(code.trim() == ''){
			return elem }

		// helpers...
		var run = function(stage, text){
			var meth = {
				pre: '__pre_parse__',
				main: '__parse__',
				post: '__post_parse__',
			}[stage]
			return that.threadPlugins(meth, text, that, elem) }

		// stage: pre...
		var text = run('pre', 
			// pre-sanitize...
			code.replace(/\x00/g, ''))
		// split text into parsable and non-parsable sections...
		var sections = text
			// split format:
			// 	[ text <match> <type> <body>, ... ]
			.split(/(<(pre|code)(?:|\s[^>]*)>((?:\n|.)*)<\/\2>)/g)
		// sort out the sections...
		var parsable = [] 
		var quoted = []
		while(sections.length > 0){
			var [section, match] = sections.splice(0, 4)
			parsable.push(section)
			quoted.push(match) }
		// stage: main...
		text = run('main', 
				// parse only the parsable sections...
				parsable.join('\x00'))
			.split(/\x00/g)
			// merge the quoted sections back in...
			.map(function(section){
				return [section, quoted.shift() ?? '']	})
			.flat()
			.join('') 
		// stage: post...
		elem.text = run('post', text)
		// patch for showing trailing empty lines in dom...
		elem.text = 
			(elem.text == '' 
					// XXX PRE_POST_NEWLINE can we avoid this??
					//		...simply .replace(/\n$/, '\n ') does not solve
					// 		this -- doubles the single trailing empty line after pre...
					// 		...this will require a test for all block elements eventually (???)
					|| elem.text.trim().endsWith('</pre>')) ?
				elem.text 
				// NOTE: adding a space here is done to prevent the browser 
				// 		from hiding the last newline...
				: elem.text + ' '

		return elem },

	// output format...
	__code2text__: function(code){
		return code 
			.replace(/(\n\s*)-/g, '$1\\-') },
	__text2code__: function(text){
		text = text 
			.replace(/(\n\s*)\\-/g, '$1-') 
		return this.trim_block_text ?
			text.trim()
			: text },

	parse: function(text){
		var that = this
		text = text
			.replace(/^[ \t]*\n/, '')
		text = ('\n' + text)
			.split(/\n([ \t]*)(?:- |-\s*$)/gm)
			.slice(1)
		var tab = ' '.repeat(this.tab_size || 8)
		var level = function(lst, prev_sep=undefined, parent=[]){
			while(lst.length > 0){
				sep = lst[0].replace(/\t/gm, tab)
				// deindent...
				if(prev_sep != null 
						&& sep.length < prev_sep.length){
					break }
				prev_sep ??= sep
				// same level...
				if(sep.length == prev_sep.length){
					var [_, block] = lst.splice(0, 2)
					var attrs = {}
					attrs.text = that.__text2code__(
						that.threadPlugins('__parse_code__', block, that, attrs)
							// normalize indent...
							.split(new RegExp('\n'+sep+'  ', 'g'))
							.join('\n'))
					parent.push({ 
						collapsed: false,
						focused: false,
						...attrs,
						children: [],
					})
				// indent...
				} else {
					parent.at(-1).children = level(lst, sep) } }
			return parent }
		return level(text) },

	data: function(){},
	load: function(){},

	// Format:
	// 	<json> ::= [
	// 			{
	// 				text: <text>,
	// 				children: <json>,
	// 				...
	// 			},
	// 			...
	// 		]
	// XXX
	json: function(){},

	// XXX add plugin hooks...
	// XXX add option to customize indent size...
	text: function(node, indent, level){
		var that = this
		// .text(<indent>, <level>)
		if(typeof(node) == 'string'){
			;[node, indent='  ', level=''] = [undefined, ...arguments] }
		node ??= this.json(node)
		indent ??= '  '
		level ??= ''
		var text = []
		for(var elem of node){
			text.push( 
				level +'- '
					+ this.__code2text__(elem.text)
						.replace(/\n/g, '\n'+ level +'  ') 
					// attrs... 
					+ (Object.keys(elem)
						.reduce(function(res, attr){
							return that.__system_attrs__.includes(attr) ?
								res
								: res 
									+ (elem[attr] ?
										'\n'+level+'  ' + `${ attr }:: ${ elem[attr] }`
										: '') }, '')),
				(elem.children 
						&& elem.children.length > 0) ?
					this.text(elem.children || [], indent, level+indent) 
					: [] ) }
		return text
			.flat()
			.join('\n') },

	// XXX add read-only option...
	htmlBlock: function(data, options={}){
		var that = this

		var parsed = this.__code2html__(data.text, {...data}) 

		var cls = parsed.style ?? []
		delete parsed.style

		var attrs = []

		for(var [attr, value] of Object.entries({...data, ...parsed})){
			if(this.__system_attrs__.includes(attr)){
				continue }
			var i
			var type = this.__block_attrs__[attr]
			if(type == 'cls'){
				value ?
						cls.push(attr)
					: (i = cls.indexOf(attr)) >= 0 ?
						cls.splice(i, 1)
					: undefined
			} else if(type == 'attr' 
					|| type == undefined){
				// special case: dataset attrs...
				if(type == undefined){
					attr = 'data-'+ attr }
				typeof(value) == 'boolean'?
						(value ?
							attrs.push(attr)
							: (i = attrs.indexOf(attr)) >= 0 ?
								attrs.splice(i, 1)
							: undefined)
					: value != null ?
						attrs.push(`${attr}="${value}"`)
					: (i = attrs.indexOf(attr)) >= 0 ?
						attrs.splice(i, 1)
					: undefined } }

		var children = (data.children ?? [])
			.map(function(data){
				return that.htmlBlock(data) })
			.join('')
		// NOTE: the '\n' at the start of the textarea body below helps 
		// 		preserve whitespace when parsing HTML...
		return (
`<div class="block ${ cls.join(' ') }" tabindex="0" ${ attrs.join(' ') }>\
<textarea class="code text" value="${ data.text }">\n${ data.text }</textarea>\
<span class="view text">${ parsed.text }</span>\
<div class="children">${ children }</div>\
</div>`) },
	html: function(data, options=false){
		var that = this
		if(typeof(data) == 'boolean'){
			options = data
			data = undefined }
		data = data == null ?
				this.json()
			: typeof(data) == 'string' ?
				this.parse(data)
			: data instanceof Array ?
				data
			: [data]
		options = 
			typeof(options) == 'boolean' ?
				{full: options}
				: (options 
					?? {})

		var nodes = data
			.map(function(data){
				return that.htmlBlock(data) })
			.join('') 

		return !options.full ?
			nodes
			: (
`<div class="editor" autofocus>\
<div class="header"></div>\
<textarea class="code"></textarea>\
<div class="outline" tabindex="0">${ nodes }</div>\
</div>`) },
}



// XXX experiment with a concatinative model...
// 		.get(..) -> Outline (view)
var Outline = {
	__proto__: JSONOutline,

	dom: undefined,

	// config...
	//
	left_key_collapses: true,
	right_key_expands: true,
	change_interval: 1000,
	tab_size: 4,
	carot_jump_edge_then_block: false,
	// XXX not sure what should the default be...
	trim_block_text: false,

	pre_plugins: [
		...JSONOutline.pre_plugins,
	],
	norm_plugins: [
		...JSONOutline.norm_plugins,
	],
	post_plugins: [
		...JSONOutline.post_plugins,
	],


	get header(){
		return this.dom?.querySelector('.header') },
	get outline(){
		return this.dom?.querySelector('.outline') },
	get toolbar(){
		return this.dom?.querySelector('.toolbar') },

	get code(){
		return this.dom?.querySelector('.code')?.value },
	set code(value){
		if(value == null){
			return }
		var c = this.dom?.querySelector('.code')
		if(c){
			c.value = value } },


	path: function(node='focused', mode='index'){
		if(['index', 'text', 'node', 'data'].includes(node)){
			mode = node
			node = 'focused' }
		var outline = this.outline
		var path = []
		var node = this.get(node)
		while(node != outline){
			path.unshift(
				mode == 'index' ?
					this.get(node, 'siblings').indexOf(node)
				: mode == 'text' ?
					node.querySelector('.view').innerText
				: mode == 'data' ?
					this.data(node)
				: node)
			node = this.get(node, 'parent') }
		return path },

	//
	// 	.get(<index>)[, <offset>]
	// 	.get(<path>[, <offset>])
	// 	.get(<id>[, <offset>)
	// 		-> <node>
	//
	// 	.get('focused'[, <offset>])
	// 		-> <node>
	//
	// 	.get('edited'[, <offset>])
	// 		-> <node>
	//
	// 	.get('siblings')
	// 	.get('focused', 'siblings')
	// 		-> <nodes>
	//
	// 	.get('children')
	// 	.get('focused', 'children')
	// 		-> <nodes>
	//
	// 	.get('next')
	// 	.get('focused', 'next')
	// 		-> <node>
	//
	// 	.get('prev')
	// 	.get('focused', 'prev')
	// 		-> <node>
	//
	// 	.get('all')
	// 	.get('visible')
	// 	.get('editable')
	// 	.get('selected')
	// 	.get('viewport')
	// 	.get('top')
	// 		-> <nodes>
	//
	// XXX add support for node ID...
	// XXX need to be able to get the next elem on same level...
	get: function(node='focused', offset){
		var that = this
		offset =
			offset == 'next' ?
				1
			: offset == 'prev' ?
				-1
			: offset
		var outline = this.outline

		// id...
		if(typeof(node) == 'string' && node[0] == '#'){
			node = outline.querySelector(node) }

		// root nodes...
		if(node == 'top'){
			return [...outline.children] }
		// groups defaulting to .outline as base...
		if(['all', 'visible', 'editable', 'selected', 'viewport'].includes(node)){
			return this.get(outline, node) }
		// groups defaulting to .focused as base...
		if(['parent', 'next', 'prev', 'children', 'siblings'].includes(node)){
			return this.get('focused', node) }
		// helpers...
		var parent = function(node){
			return node === outline ?
					outline
				: node.parentElement === outline ?
					outline
				: node?.parentElement?.parentElement }
		var children = function(node){
			return node === outline ?
				[...node.children]
				: [...node?.lastChild?.children] }

		// single base node...
		var edited
		;[node, edited] = 
			typeof(node) == 'number' ?
				[this.get('visible').at(node), 
					edited]
			: node instanceof Array ?
				[node
						.reduce(function(res, i){
							return that.get(res, 'children')[i] }, outline),
					edited]
			: (node == 'outline' || node == 'root') ?
				[outline, edited]
			: node == 'focused' ?
				[outline.querySelector(`.block:focus`)
						|| outline.querySelector(`.code:focus`)
						|| outline.querySelector('.block.focused'), 
					edited]
			: node == 'edited' ?
				[outline.querySelector(`.code:focus`),
					outline.querySelector(`.code:focus`)]
			: [node , edited]

		// get the .block...
		if(node instanceof HTMLElement){
			while(node !== outline
					&& !node.classList.contains('block')){
				node = node.parentElement } }

		// no reference node...
		if(node == null 
				|| typeof(node) == 'string'){
			return undefined }

		// parent...
		if(offset == 'parent'){
			return edited ?
				parent(node).querySelector('.code')
				: parent(node) }

		// node groups...
		var nodes = 
			typeof(offset) == 'number' ?
				this.get('visible')
			: offset == 'all' ?
				[...node.querySelectorAll('.block')]
			: offset == 'visible' ?
				[...node.querySelectorAll('.block')] 
					.filter(function(e){
						//return e.querySelector('.view').offsetParent != null })
						return e.offsetParent != null })
			: offset == 'viewport' ?
				[...node.querySelectorAll('.block')] 
					.filter(function(e){
						//return e.querySelector('.view').offsetParent != null 
						//	&& e.querySelector('.code').visibleInViewport() })
						return e.offsetParent != null 
							&& e.visibleInViewport() })
			: offset == 'editable' ?
				[...node.querySelectorAll('.block>.code')] 
			: offset == 'selected' ?
				[...node.querySelectorAll('.block[selected]')] 
					.filter(function(e){
						//return e.querySelector('.view').offsetParent != null }) 
						return e.offsetParent != null }) 
			: offset == 'children' ?
				children(node)
			: offset == 'siblings' ?
				children(parent(node))
			: undefined

		// get node by offset...
		if(typeof(offset) == 'number'){
			node = nodes.at(nodes.indexOf(node) + offset) 
				?? nodes[0]
			edited = edited ?
				node.querySelector('.code')
				: edited
			nodes = undefined }

		return nodes !== undefined ?
				edited ?
					nodes
						.map(function(){
							return node.querySelector('.code') })
					: nodes
			: (edited 
				?? node) },
	at: function(index, nodes='visible'){
		return this.get(nodes).at(index) },
	focus: function(node='focused', offset){
		var elem = this.get(...arguments) 
			?? this.get(0)
		if(elem){
			var cur = this.get()
			var blocks = this.get('visible')
			elem.focus({preventScroll: true})
			;(elem.classList.contains('code') ?
					elem
					: elem.querySelector('.code'))
				.scrollIntoView({
					block: 'nearest', 
					// smooth for long jumps and instant for short jumps...
					behavior: (cur == null 
							|| Math.abs(blocks.indexOf(cur) - blocks.indexOf(elem)) > 2) ?
						'smooth'
						: 'instant'
				}) }
		return elem },
	edit: function(node='focused', offset){
		var elem = this.get(...arguments)
		if(!elem.classList.contains('code')){
			elem = elem.querySelector('.code') }
		elem?.focus()
		return elem },

	// This will prevent spamming the .sync() by limiting calls to one 
	// per .change_interval
	//
	// XXX should we call plugin's __change__ live or every second???
	__change_timeout: undefined,
	__change_requested: false,
	__change__: function(options={}){
		var that = this

		// handle undo...
		options.undo
			&& this.setUndo(...options.undo)

		// long changes...
		this.__change_requested = true
		if(this.__change_timeout){
			return this }

		// do the action...
		if(this.__change_requested){
			this.sync() 
			this.runPlugins('__change__', this) 
			this.__change_requested = false }

		this.__change_timeout = setTimeout(
			function(){
				that.__change_timeout = undefined
				that.__change_requested
					&& that.__change__() }, 
			that.change_interval || 1000) 
		return this },

	/* XXX not used -- do we need this??
	// XXX UPDATE_CODE_SIZE this is a no-op at this point -- do we need this???
	_updateCodeSize: function(code, view){
		// XXX
		return this
		code.style.height = 
			getComputedStyle(
					view 
						?? code.nextSibling)
				.height 
		return this },
	_updateViewSize: function(view, code){
		view.style.height = 
			getComputedStyle(
					code 
						?? view.previousSibling)
				.height 
		return this },
	// XXX not a good solution...
	_syncTextSize: function(code, view){
		code = code.classList.contains('block') ?
			code.querySelector('.code')
			: code
		view = view 
			?? code.nextSibling
		code.updateSize()
		return view.offsetHeight > code.offsetHeight ?
			this._updateCodeSize(code, view)
			: this._updateViewSize(view, code) },
	//*/

	// Update node from data...
	//
	// NOTE: this does not internally handle undo as it would be too 
	// 		granular...
	// NOTE: to remove an attribute set it's value to null, undefined, 
	// 		'null', or 'undefined'
	update: function(node='focused', data){
		var node = this.get(node)
		data ??= this.data(node, false)

		var parsed = {}
		if('text' in data){
			var code = node.querySelector('.code')
			var html = node.querySelector('.view')
			if(this.__code2html__){
				// NOTE: we are ignoring the .collapsed attr here 
				parsed = this.__code2html__(data.text, {...data})
				html.innerHTML = parsed.text
				// heading...
				this.__styles != null
					&& node.classList.remove(...this.__styles)
				parsed.style
					&& node.classList.add(...parsed.style)
				delete parsed.style
			} else {
				html.innerHTML = data.text }
			code.value = data.text 
			code.updateSize() }
			// NOTE: this will have no effect if the element is not attached...
			//this._updateCodeSize(code) }
			//this._syncTextSize(code, html) }

		for(var [attr, value] of Object.entries({...data, ...parsed})){
			if(this.__system_attrs__.includes(attr)){
				continue }

			// quoted value...
			if(value && /^\s*([`'"])([^\1]*)\1\s*$/.test(value)){
				value = value.replace(/^\s*([`'"])([^\1]*)\1\s*$/, '$2') }

			var type = this.__block_attrs__[attr]
			if(type == 'cls'){
				value ?
					node.classList.add(attr)
					: node.classList.remove(attr) 
			} else if(type == 'attr'){
				typeof(value) == 'boolean'?
						(value ?
							node.setAttribute(attr, '')
							: node.removeAttribute(attr))
					: value != null ?
						node.setAttribute(attr, value)
					: node.removeAttribute(attr) 
			// dataset...
			} else {
				// remove attr...
				if(value == null
						|| value == 'null'
						|| value == 'undefined'){
					delete node.dataset[attr]
				} else {
					node.dataset[attr] = value } } }
		this.__change__()
		return node },

	// edit...
	indent: function(node='focused', indent='in'){
		// .indent(<indent>)
		if(node === 'in' || node === 'out'){
			indent = node
			node = 'focused' }
		var cur = this.get(node) 
		if(!cur){ 
			return }
		var prev = this.path(cur)
		var siblings = this.get(node, 'siblings')
		// deindent...
		if(indent == 'out'){
			var parent = this.get(node, 'parent')
			if(parent != this.outline){
				var children = siblings
					.slice(siblings.indexOf(cur)+1)
				parent.after(cur)
				children.length > 0
					&& cur.lastChild.append(...children) 
				this.__change__({undo: [
					this.path(cur), 
					'indent', 
					['in'],
					prev ]}) }
		// indent...
		} else {
			var parent = siblings[siblings.indexOf(cur) - 1]
			if(parent){
				parent.lastChild.append(cur) 
				this.__change__({undo: [
					this.path(cur), 
					'indent', 
					['out'],
					prev ]})} } 
		return cur },
	shift: function(node='focused', direction){
		if(node == 'up' || node == 'down'){
			direction = node
			node = 'focused' }
		if(direction == null 
				|| (direction !== 'up' 
					&& direction != 'down')){
			return }
		node = this.get(node)
		var focused = node.classList.contains('focused')
		var siblings = this.get(node, 'siblings')
		var i = siblings.indexOf(node)
		if(direction == 'up' 
				&& i > 0){
			siblings[i-1].before(node)
		} else if(direction == 'down' 
				&& i < siblings.length-1){
			siblings[i+1].after(node) }
		focused 
			&& this.focus()
		this.__change__({undo: [
			this.path(node), 
			'shift', 
			[direction == 'up' ? 
				'down' 
				: 'up'] ]})
		return this },
	// XXX make undo a bit more refined...
	remove: function(node='focused'){
		var elem = this.get(...arguments)
		// XXX HACK...
		var data = this.json()
		var next 
		if(elem.classList.contains('focused')){
			// XXX need to be able to get the next elem on same level...
			this.toggleCollapse(elem, true)
			next = elem === this.get(-1) ?
				this.get(elem, 'prev') 
				: this.get(elem, 'next') }
		elem?.remove()
		next 
			&& this.focus(next)
		this.__change__({undo: [
			undefined, 
			'load', 
			// XXX HACK...
			[data] ]})
		return this },
	clear: function(){
		var data = this.json()
		this.outline.innerText = ''
		this.__change__({undo: [
			undefined, 
			'load', 
			[data] ]})
		return this },

	// expand/collapse...
	toggleCollapse: function(node='focused', state='next'){
		var that = this
		if(node == 'all'){
			return this.get('all')
				.map(function(node){
					return that.toggleCollapse(node, state) }) }
		// .toggleCollapse(<state>)
		if(['next', true, false].includes(node)){
			state = node
			node = 'focused' }
		node = this.get(node)
		if(!node 
				// only nodes with children can be collapsed...
				|| !node.querySelector('.block')){
			return }
		state = state == 'next' ?
			node.getAttribute('collapsed') != ''
			: state
		state ?
			node.setAttribute('collapsed', '')
			: node.removeAttribute('collapsed')
		this.__change__()
		return node },
	show: function(node='focused', offset){
		var node = this.get(...arguments)
		var outline = this.outline
		var parent = node
		var changes = false
		do{
			parent = parent.parentElement
			changes = changes 
				|| parent.getAttribute('collapsed') == ''
			parent.removeAttribute('collapsed')
		} while(parent !== outline)
		changes
			&& this.__change__()
		return node },

	// crop...
	// XXX the header links are not component-compatible...
	crop: function(node='focused'){
		this.dom.classList.add('crop')
		for(var block of [...this.outline.querySelectorAll('[cropped]')]){
			block.removeAttribute('cropped') }
		this.get(...arguments).setAttribute('cropped', '')
		// build header path...
		this.header.innerHTML = 
			`<span class="path-item" onclick="editor.uncrop('all')">/</span> ` 
				+ this.path(...arguments, 'text')
					.slice(0, -1)
					.map(function(s, i, {length}){
						return `<span class="path-item" uncrop="${ length-i }">${
							plugin.encode(s)
						}</span> ` })
					.join(' / ')
		return this },
	uncrop: function(count=1){
		var outline = this.outline
		var top = this.get(0)
		for(var block of [...this.outline.querySelectorAll('[cropped]')]){
			block.removeAttribute('cropped') }
		// crop parent if available...
		while(count != 'all' 
				&& count > 0 
				&& top !== outline){
			top = this.get(top, 'parent')
			count-- }
		if(count == 'all' || top === outline){
			this.dom.classList.remove('crop')
			this.header.innerHTML = '' 
		} else {
			this.crop(top) }
		return this },

	// undo...
	// NOTE: calling .setUndo(..) will drop the redo stack, but this does 
	// 		not happen when calling a method via .undo(..)/.redo(..) as we
	// 		are reassigning the stacks manually.
	__undo_stack: undefined,
	__redo_stack: undefined,
	setUndo: function(path, action, args, next){
		;(this.__undo_stack ??= []).push([path, action, args, next])
		this.__redo_stack = undefined
		return this },
	mergeUndo: function(n, stack){
		stack ??= this.__undo_stack
		if(stack == null || stack.length == 0){
			return this }
		stack.push(
			stack.splice(-n, n)
				.map(function(e){
					return typeof(e[1]) == 'string' ?
						[e]
						: e })
				.flat())
		return this },
	clearUndo: function(){
		this.__undo_stack = undefined
		this.__redo_stack = undefined
		return this },
	__undo: function(from, to){
		if(from == null 
				|| from.length == 0){
			return [from, to] }
		var actions = from.pop()
		actions = typeof(actions[1]) == 'string' ?
			[actions]
			: actions
		while(actions.length > 0){
			var [path, action, args, next] = actions.pop()
			var l = from.length
			path != null
				&& this.focus(path)
			this[action](...args)
			next != null ?
				this.focus(next)
				: this.focus() }
		if(l < from.length){
			to ??= []
			to.push(
				...from.splice(l, from.length)) }
		if(from.length == 0){
			from = undefined }
		return [from, to] },
	undo: function(){
		;[this.__undo_stack, this.__redo_stack] = 
			this.__undo(this.__undo_stack, this.__redo_stack)
		return this },
	redo: function(){
		;[this.__redo_stack] = this.__undo(this.__redo_stack)
		return this },

	// serialization...
	data: function(elem, deep=true){
		var that = this
		elem = 
			// all elements...
			(elem == 'all' || elem == 'root' || elem == '*') ?
				[...this.outline.children]
			: elem instanceof Array ?
				elem
			: this.get(elem)	
		// multiple nodes...
		if(elem instanceof Array){
			return elem
				.map(function(elem){
					return that.data(elem) }) }
		// single node...
		// XXX move these to config...
		var attrs = this.__block_attrs__
		var cls_attrs = ['focused']
		return {
			// NOTE: this is first to prevent it from overriding system attrs...
			...elem.dataset,
			text: elem.querySelector('.code').value,
			...(Object.entries(attrs)
				.reduce(function(res, [attr, type]){
					if(type == 'attr'){
						var val = elem.getAttribute(attr)
						if(val != null){
							res[attr] = val == '' ?
								true
								: val } }
					if(type == 'cls'){
						elem.classList.contains(attr)
							&& (res[attr] = true) }
					return res }, {})),
			...(deep ? 
				{children: this.data([...elem.lastChild.children])}
				: {}),
		} },
	// Same as .data(..) but by default returns the root nodes.
	// NOTE: this always returns an array
	json: function(node='all'){
		return [this.data(...(
				arguments.length == 0 ? 
					['all']
					: arguments))]
			.flat() },

	// XXX should this handle children???
	// XXX revise name...
	Block: function(data={}, place=null){
		var that = this
		if(typeof(data) != 'object'){
			place = data
			data = {} }

		// block...
		var block = document.createElement('div')
		block.classList.add('block')
		block.setAttribute('tabindex', '0')
		// XXX hack??
		block.setAttribute('cropped', '')
		// code...
		var code = document.createElement('textarea')
			.autoUpdateSize()
		code.classList.add('code', 'text')
		// view...
		var html = document.createElement('span')
		html.classList.add('view', 'text')
		// children...
		var children = document.createElement('div')
		children.classList.add('children')
		children.setAttribute('tabindex', '-1')
		block.append(
			code, 
			html, 
			children)

		this.update(block, data)

		// place...
		var cur = this.get()
		if(place && cur){
			place = place == 'prev' ?
				'before'
				: place
			//	...			...
			//	cur			cur
			//	  new		new		<- before the next after cur
			//	  ---		---
			//	...			...
			;(place == 'next' 
					// has children (uncollapsed)...
					&& (cur.querySelector('.block')?.offsetParent
						// not last sibling...
						|| cur !== this.get('siblings').at(-1))) ?
				this.get(place).before(block)
			//	...
			//	  ---
			//	  cur
			//	  new	<- next after cur
			//	...
			: (place == 'next' 
					// last sibling...
					&& cur === this.get('siblings').at(-1)) ?
				cur.after(block)
			: (place == 'before' || place == 'after') ?
				cur[place](block)
			: undefined 

			//this._updateCodeSize(code)
			//this._syncTextSize(code, view)

			this.setUndo(this.path(cur), 'remove', [this.path(block)]) }
		return block },
	/*/ XXX 
	load: function(data){
		var that = this
		this.dom.classList.add('loading')
		data = typeof(data) == 'string' ?
				this.parse(data)
			: data instanceof Array ?
				data
			: data == null ?
				this.json()
			: [data]
		// generate dom...
		var level = function(lst){
			return lst
				.map(function(data){
					var elem = that.Block(data) 
					if((data.children || []).length > 0){
						elem.lastChild
							.append(...level(data.children)) }
					return elem }) }
		this
			.clear()
			.outline
				.append(...level(data))
		//// update sizes of all the textareas (transparent)...
		//// NOTE: this is needed to make initial clicking into multi-line 
		//// 		blocks place the cursor into the clicked location.
		//// 		...this is done by expanding the textarea to the element 
		//// 		size and enabling it to intercept clicks correctly...
		//setTimeout(function(){
		//	var f = that._updateCodeSize
		//	//var f = that._syncTextSize.bind(that)
		//	for(var e of [...that.outline.querySelectorAll('textarea')]){
		//		f(e) } }, 0)
		this.dom.classList.remove('loading')
		return this },
	/*/ // XXX JSON version...
	load: function(data){
		var that = this
		this.dom.classList.add('loading')
		data = typeof(data) == 'string' ?
				this.parse(data)
			: data instanceof Array ?
				data
			: data == null ?
				this.json()
			: [data]

		this.outline.innerHTML = this.html(data)

		//// update sizes of all the textareas (transparent)...
		//// NOTE: this is needed to make initial clicking into multi-line 
		//// 		blocks place the cursor into the clicked location.
		//// 		...this is done by expanding the textarea to the element 
		//// 		size and enabling it to intercept clicks correctly...
		//// XXX this is a hack -- need to style the thing in such away 
		//// 		so as to not require this step...
		//setTimeout(function(){
		//	var f = that._updateCodeSize.bind(that)
		//	//var f = that._syncTextSize.bind(that)
		//	for(var e of [...that.outline.querySelectorAll('textarea')]){
		//		f(e) } }, 0)
		this.dom.classList.remove('loading')
		return this },
	//*/

	sync: function(){
		this.code = this.text()
		return this },


	// Actions...
	prev: function(){},
	next: function(){},
	above: function(){},
	below: function(){},

	up: function(){},
	down: function(){},
	left: function(){},
	right: function(){},

	__overtravel_timeout: undefined,
	__caret_x: undefined,
	// XXX move the code here into methods/actions...
	// XXX use keyboard.js...
	keyboard: {
		// XXX might be a good feature to add to keyboard.js...
		// 		...might even be fun to extend this and add key classes, 
		// 		like: 
		// 			Modifier
		// 			Function
		// 			Letter
		// 			Number
		// 			...
		// 			Unhandled
		Any: function(evt, key){
			if(this.__caret_x
					&& this.get('edited') 
					&& key != 'ArrowUp' 
					&& key != 'ArrowDown'){
				this.__caret_x = undefined } },

		// vertical navigation...
		// XXX this is a bit hacky but it works -- the caret blinks at 
		// 		start/end of block before switching to next, would be 
		// 		nice po prevent this...
		ArrowUp: function(evt){
			var that = this

			// overtravel...
			var overtravel = 
				this.__overtravel_timeout != null 
					&& this.get() === this.get(0)
			this.__overtravel_timeout != null
				&& clearTimeout(this.__overtravel_timeout)
			this.__overtravel_timeout = setTimeout(function(){
				that.__overtravel_timeout = undefined }, 100)
			if(overtravel){
				return }

			var edited = this.get('edited')
			if(edited){
				var g = edited.getTextGeometry()
				if(g.line == 0){
					evt.preventDefault() 
					//var left = edited.getBoundingClientRect().x + g.offsetLeft
					var left = this.__caret_x = 
						this.__caret_x 
							?? edited.getBoundingClientRect().x + g.offsetLeft
					edited = that.edit('prev') 
					// keep caret horizontally constrained...
					var bottom = edited.getBoundingClientRect().bottom
					/*/ XXX CARET_V_MOVE this is not correct yet...
					var view = this.get(edited).querySelector('.view')
					var c = getCharOffset(view, left, bottom - 1)
					var m = getMarkdownOffset(edited.value, view.innerText, c)
					console.log('---', c, m)
					edited.selectionStart = 
						edited.selectionEnd = 
							c - m }
					/*/
					edited.selectionStart = 
						edited.selectionEnd = 
							edited.getTextOffsetAt(left, bottom - 1) }
					//*/
			} else {
				evt.preventDefault() 
				this.focus('focused', -1) } },
		ArrowDown: function(evt){
			var that = this

			// overtravel...
			var overtravel = 
				this.__overtravel_timeout != null 
					&& this.get() === this.get(-1)
			this.__overtravel_timeout != null
				&& clearTimeout(this.__overtravel_timeout)
			this.__overtravel_timeout = setTimeout(function(){
				that.__overtravel_timeout = undefined }, 100)
			if(overtravel){
				return }

			var edited = this.get('edited')
			if(edited){
				var g = edited.getTextGeometry()
				if(g.lines == 0 || g.line == g.lines - 1){
					evt.preventDefault() 
					//var left = edited.getBoundingClientRect().x + g.offsetLeft
					var left = this.__caret_x = 
						this.__caret_x 
							?? edited.getBoundingClientRect().x + g.offsetLeft
					edited = that.edit('next') 
					// keep caret horizontally constrained...
					var top = edited.getBoundingClientRect().y
					/* XXX CARET_V_MOVE this needs fixing...
					var view = this.get(edited).querySelector('.view')
					var c = getCharOffset(view, left, top - 1)
					var m = getMarkdownOffset(edited.value, view.innerText, c)
					console.log('---', c, m)
					edited.selectionStart = 
						edited.selectionEnd = 
							c - m }
					/*/
					edited.selectionStart = 
						edited.selectionEnd = 
							edited.getTextOffsetAt(left, top + 1) }
					//*/
			} else {
				evt.preventDefault() 
				this.focus('focused', 1) } },
		// horizontal navigation / collapse...
		ArrowLeft: function(evt){
			var edited = this.get('edited')
			if(edited){
				// move caret to prev element...
				if(edited.selectionStart == edited.selectionEnd
						&& edited.selectionStart == 0){
					evt.preventDefault()
					edited = this.focus('edited', 'prev') 
					edited.selectionStart = 
						edited.selectionEnd = edited.value.length + 1 }
				return }
			if(evt.ctrlKey){
				evt.preventDefault()
				tasks.prevCheckbox(this)
				return }
			;((this.left_key_collapses 
						|| evt.shiftKey)
					&& this.get().getAttribute('collapsed') == null
					&& this.get('children').length > 0) ?
				this.toggleCollapse(true)
				: this.focus('parent') },
		ArrowRight: function(evt){
			var that = this

			// overtravel...
			var overtravel = 
				this.__overtravel_timeout != null 
					&& this.get() === this.get(-1)
			this.__overtravel_timeout != null
				&& clearTimeout(this.__overtravel_timeout)
			this.__overtravel_timeout = setTimeout(function(){
				that.__overtravel_timeout = undefined }, 100)
			if(overtravel){
				return }

			var edited = this.get('edited')
			if(edited){
				// move caret to next element...
				if(edited.selectionStart == edited.selectionEnd
						&& edited.selectionStart == edited.value.length){
					evt.preventDefault()
					edited = this.focus('edited', 'next') 
					edited.selectionStart = 
						edited.selectionEnd = 0 }
				return }
			if(evt.ctrlKey){
				evt.preventDefault()
				tasks.nextCheckbox(this)
				return }
			if(this.right_key_expands){
				this.toggleCollapse(false) 
				this.focus('next')
			} else {
				evt.shiftKey ?
					this.toggleCollapse(false)
					: this.focus('next') } },

		Home: function(evt){
			if(this.get('edited') 
					&& !evt.ctrlKey){
				return }
			evt.preventDefault()
			this.focus(0) },
		End: function(evt){
			if(this.get('edited')
					&& !evt.ctrlKey){
				return }
			evt.preventDefault()
			this.focus(-1) },
		PageUp: function(evt){
			var that = this
			if(this.get('edited')){
				return }
			if(evt.shiftKey 
					|| evt.ctrlKey){
				evt.preventDefault()
				this.shift('up') 
			} else {
				var viewport = that.get('viewport')
				viewport[0] === that.get(0) ?
					that.focus(0)
					: that.focus(
						viewport[0], 'prev') } },
		PageDown: function(evt){
			var that = this
			if(this.get('edited')){
				return }
			if(evt.shiftKey 
					|| evt.ctrlKey){
				evt.preventDefault()
				this.shift('down') 
			} else {
				var viewport = that.get('viewport')
				viewport.at(-1) === that.get(-1) ?
					that.focus(-1)
					: that.focus(
						that.get('viewport').at(-1), 'next') } },

		// indent..
		Tab: function(evt){
			evt.preventDefault()
			var edited = this.get('edited')
			var node = this.show(
				this.indent(evt.shiftKey ? 
					'out' 
					: 'in'))
			// keep focus in node...
			;(edited ?
				edited
				: node)?.focus() },

		// edit mode...
		O: function(evt){
			if(!this.get('edited')){
				evt.preventDefault()
				this.edit(
					this.Block('before')) } },
		o: function(evt){
			if(!this.get('edited')){
				evt.preventDefault()
				this.edit(
					this.Block('next')) } },
		Enter: function(evt){
			var edited = this.get('edited')
			if(edited){
				if(evt.ctrlKey
						|| evt.shiftKey){
					var that = this
					// NOTE: setTimeout(..) because we need the input of 
					// 		the key...
					setTimeout(function(){
						that.update(edited) }, 0)
					return }
				// split text...
				evt.preventDefault()
				var a = edited.selectionStart
				var b = edited.selectionEnd
				// position 0: focus empty node above...
				if(a == 0 
						&& edited.value.trim() != ''){
					this.Block('prev')
					this.edit('prev')
				// focus new node...
				} else {
					var prev = edited.value.slice(0, a)
					var next = edited.value.slice(b)
					edited.value = prev
					this.Block({text: next}, 'next')
					edited = this.edit('next')
					edited.selectionStart = 0
					edited.selectionEnd = 0 
					this.mergeUndo(2) }
				return }
			// view -> edit...
			evt.preventDefault()
			this.edit() },
		Escape: function(evt){
			if(this.get('edited')){
				this.focus() 
			} else {
				this.uncrop() } },
		s_Escape: function(evt){
			if(this.get('edited')){
				this.focus() 
			} else {
				this.uncrop('all') } },
		c: function(evt){
			if(!this.get('edited')){
				this.crop() } },
		c_z: function(evt){
			if(!this.get('edited')){
				evt.preventDefault()
				this.undo() } },
		c_s_z: function(evt){
			if(!this.get('edited')){
				evt.preventDefault()
				this.redo() } },
		U: function(evt){
			if(!this.get('edited')){
				this.redo() } },
		u: function(evt){
			if(!this.get('edited')){
				this.undo() } },

		Delete: function(evt){
			var edited = this.get('edited')
			if(edited){
				if(edited.selectionStart == edited.value.length){
					var next = this.get('edited', 'next')
					// can't reclaim nested children...
					if(this.get(next, 'children').length > 0){
						return }
					// do not delete past the top element...
					if(this.get(0).querySelector('.code') === next){
						return }
					evt.preventDefault()
					var i = edited.value.length
					edited.value += next.value
					edited.selectionStart = i
					edited.selectionEnd = i
					this.remove(next) }
				return }
			this.remove() },
		Backspace: function(evt){
			var edited = this.get('edited')
			if(edited 
					&& edited.selectionEnd == 0
					// can't reclaim nested children...
					&& this.get(edited, 'children').length == 0){
				var prev = this.get('edited', 'prev')
				// do not delete past the bottom element...
				if(this.get(-1).querySelector('.code') === prev){
					return }
				evt.preventDefault()
				var i = prev.value.length
				prev.value += edited.value
				this.edit(prev)
				prev.selectionStart = i
				prev.selectionEnd = i
				this.remove(edited)
				return } },

		a_s: function(evt){
			// toggle done...
			evt.preventDefault()
			tasks.toggleStatus(this) },
		a_x: function(evt){
			// toggle done...
			evt.preventDefault()
			tasks.toggleDone(this) },
		a_r: function(evt){
			// toggle done...
			evt.preventDefault()
			tasks.toggleReject(this) },

		// selection...
		// XXX need more work...
		// 		- should we select the .block or .text???
		// 		- we should remember the first state and apply it (a-la FAR) 
		// 			and not simply toggle on/off per node...
		Shift: function(evt){
			if(this.get('edited')){
				return }
			// XXX set selection mode
			// 		...need to reset this when shift key is released...
			// 		one way to do this is to save a press id and reset 
			// 		it each call -- if the id has changed since lass s-up 
			// 		is pressed then reset mode...
		},
		s_ArrowUp: function(evt){
			if(this.get('edited')){
				return }
			var elem = this.get()
			elem.hasAttribute('selected') ?
				elem.removeAttribute('selected')
				: elem.setAttribute('selected', '')
			this.keyboard.ArrowUp.call(this, evt) },
		s_ArrowDown: function(evt){
			if(this.get('edited')){
				return }
			var elem = this.get()
			elem.hasAttribute('selected') ?
				elem.removeAttribute('selected')
				: elem.setAttribute('selected', '')
			this.keyboard.ArrowDown.call(this, evt) },
		c_d: function(evt){
			if(this.get('edited')){
				return }
			evt.preventDefault()
			for(var e of this.get('selected')){
				e.removeAttribute('selected') } },
		c_a: function(evt){
			if(this.get('edited')){
				return }
			evt.preventDefault()
			for(var e of this.get('all')){
				e.setAttribute('selected', '') } },

		// toggle checkbox...
		' ': function(evt){
			if(this.get('edited') != null){
				return }
			evt.preventDefault()
			tasks.toggleCheckbox(this) },
	},

	setup: function(dom){
		var that = this
		this.dom = dom

		// outline...
		var outline = this.outline
		// update stuff already in DOM...
		for(var elem of [...outline.querySelectorAll('textarea')]){
			elem.autoUpdateSize() } 
		// click...
		// XXX revise...
		// XXX tap support...
		// XXX support selection from first click... (see: mousemove handler)
		var selecting, start
		outline.addEventListener('mousedown', 
			function(evt){
				var elem = evt.target
				// prevent clicking through children to parent elements...
				if(elem.classList.contains('children')){
					evt.preventDefault()
					outline.focus()
					return }
				// place the cursor where the user clicked in code/text...
				if(elem.classList.contains('code') 
						&& document.activeElement !== elem){
					that.__caret_x = undefined
					var view = that.get(elem).querySelector('.view')
					var initial = elem.selectionStart
					var c = getCharOffset(view, evt.clientX, evt.clientY)
					var m = getMarkdownOffset(elem.value, getText(view), c)
					// selecting an element with text offset by markup...
					if(m != 0){
						evt.preventDefault()
						selecting = elem }
					start = c == null ?
						elem.value.length
						: c + m
					// NOTE: this is done on next frame to allow the 
					// 		browser to place the caret before we correct 
					// 		its position... (if .preventDefault() was not called)
					setTimeout(function(){
						elem.focus()
						elem.selectionStart = 
							elem.selectionEnd = 
								start }, 0) } })
		outline.addEventListener('mousemove', 
			function(evt){
				// handle selection in element with text offset by markup...
				if(selecting != null){
					var c = selecting.getTextOffsetAt(evt.clientX, evt.clientY)
					if(c > start){
						selecting.selectionStart = start
						selecting.selectionEnd = c
					} else {
						selecting.selectionStart = c
						selecting.selectionEnd = start } } })
		outline.addEventListener('mouseup', 
			function(evt){
				selecting = undefined })
		outline.addEventListener('click', 
			function(evt){
				var elem = evt.target

				// prevent focusing parent by clicking between blocks...
				if(elem.classList.contains('children')){
					return }

				// empty outline -> create new eleemnt...
				if(elem.classList.contains('outline')
						&& elem.children.length == 0){
					// create new eleemnt and edit it...
					var block = that.Block()
					that.outline.append(block)
					that.edit(block)
					return }

				// expand/collapse
				if(elem.classList.contains('view')){
					// click: left of elem (outside)
					if(evt.offsetX < 0){
						// XXX item menu?
					
					// click: right of elem (outside)
					} else if(elem.offsetWidth < evt.offsetX){
						that.toggleCollapse(that.get(elem))

					// click inside element...
					} else {
						// XXX 
					} }

				// edit of focus...
				// NOTE: this is useful if element text is hidden but the 
				// 		frame is still visible...
				if(elem.classList.contains('block')){
					elem.querySelector('.code').focus() }

				// focus viewport...
				// XXX this does not work because by this point there is 
				// 		no focused element...
				if(elem === outline){
					var cur = that.get()
					var viewport = that.get('viewport')
					if(!viewport.includes(cur)){
						var visible = that.get('visible')
						var i = visible.indexOf(cur)
						var v = visible.indexOf(viewport[0])
						i < v ?
							that.focus(viewport[0])
							: that.focus(viewport.at(-1)) } }

				that.runPlugins('__click__', evt, that, elem) })
		// keyboard handling...
		outline.addEventListener('keydown', 
			function(evt){
				var elem = evt.target
				if(that.runPlugins('__keydown__', evt, that, evt.target) !== true){
					return }

				// handle keyboard...
				// 'Any' key...
				if('Any' in that.keyboard){
					if(that.keyboard.Any.call(that, evt, evt.key) === false){
						return } }
				// keys/mods...
				var keys = []
				evt.ctrlKey
					&& keys.push('c_' + evt.key)
				evt.ctrlKey && evt.altKey 
					&& keys.push('c_a_' + evt.key)
				evt.ctrlKey && evt.shiftKey
					&& keys.push('c_s_' + evt.key)
				evt.altKey && evt.ctrlKey && evt.shiftKey
					&& keys.push('c_a_s_' + evt.key)
				evt.altKey
					&& keys.push('a_' + evt.key)
				evt.altKey && evt.shiftKey
					&& keys.push('a_s_' + evt.key)
				evt.shiftKey
					&& keys.push('s_' + evt.key)
				keys.push(evt.key)
				for(var k of keys){
					if(k in that.keyboard){
						that.keyboard[k].call(that, evt, k)
						break } } })
		// update code block...
		outline.addEventListener('keyup', 
			function(evt){
				var elem = evt.target
				// update element state...
				if(elem.classList.contains('code')){
					// NOTE: for some reason setting the timeout here to 0
					// 		makes FF sometimes not see the updated text...
					setTimeout(function(){
						that.update(elem.parentElement) }, 0) }
				that.runPlugins('__keyup__', evt, that, elem) })

		// toggle view/code of nodes...
		outline.addEventListener('focusin', 
			function(evt){
				var elem = evt.target

				// ignore children container...
				if(elem.classList.contains('children')){
					return }

				// handle focus...
				if(elem !== that.outline){
					for(var e of [...that.dom.querySelectorAll('.focused')]){
						e.classList.remove('focused') }
					that.get('focused')?.classList?.add('focused') }
				// textarea...
				if(elem.classList.contains('code')){
					elem.dataset.original = elem.value
					elem.updateSize() } 

				// XXX do we need this???
				that.runPlugins('__focusin__', evt, that, elem) })
		outline.addEventListener('focusout', 
			function(evt){
				var elem = evt.target
				// update code...
				if(elem.classList.contains('code')){
					var block = that.get(elem)
					// clean out attrs...
					elem.value = 
						that.trim_block_text ?
							that.threadPlugins('__parse_code__', elem.value, that).trim()
							: that.threadPlugins('__parse_code__', elem.value, that)
					that.update(block) 
					// undo...
					if(elem.value != elem.dataset.original){
						that.setUndo(
							that.path(elem),
							'update',
							[that.path(elem), {
								...that.data(elem), 
								text: elem.dataset.original,
							}])
						delete elem.dataset.original }
					// give the browser a chance to update the DOM...
					// XXX revise...
					setTimeout(function(){
						that.runPlugins('__editedcode__', evt, that, elem) 
						// this will resize the text to fill the available area...
						elem.style.removeProperty('height') }, 0) } 

				that.runPlugins('__focusout__', evt, that, elem) })
		// update .code...
		outline.addEventListener('change', 
			function(evt){
				that.__change__() })

		// header...
		var header = this.header
		header.addEventListener('click', 
			function(evt){
				var elem = evt.target
				if(elem.classList.contains('path-item')){
					that.uncrop(elem.getAttribute('uncrop') ?? 'all') } })

		// toolbar...
		var toolbar = this.toolbar
		if(toolbar){
			// handle return of focus when clicking toolbar...
			var focus_textarea
			var cahceNodeType = function(){
				// NOTE: for some reason .activeElement returns an element
				// 		that is not in the DOM after the action is done...
				focus_textarea = document.activeElement.nodeName == 'TEXTAREA' }
			var refocusNode = function(){
				focus_textarea ?
					editor.get().querySelector('.code').focus() 
					: editor.focus()
				focus_textarea = undefined } 
			// cache the focused node type before focus changes...
			toolbar.addEventListener('mousedown', cahceNodeType)
			// refocus the node after we are done...
			toolbar.addEventListener('click', refocusNode) }

		// code...
		var code = this.code
		if(code){
			var t = Date.now()
			this.load(code
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')) 
			console.log(`Parse: ${Date.now() - t}ms`) }
		this.clearUndo()

		this.runPlugins('__setup__', this)

		// autofocus...
		if(this.dom.getAttribute('autofocus') != null){
			/*
			setTimeout(function(){
				that.focus() }, 0) }
			/*/
			// XXX this for some reason takes lots of time at this point...
			this.focus() }
			//*/
		
		return this },
}



//---------------------------------------------------------------------
// Custom element...


window.customElements.define('outline-editor',
window.OutlineEditor = 
Object.assign(
	function(){
		var obj = Reflect.construct(HTMLElement, [...arguments], OutlineEditor)

		var shadow = obj.attachShadow({mode: 'open'})

		var style = document.createElement('link');
		style.setAttribute('rel', 'stylesheet');
		style.setAttribute('href', 'editor.css');

		// XXX it is not rational to have this...
		var editor = obj.dom = document.createElement('div')
		editor.classList.add('editor')

		var header = document.createElement('div')
		header.classList.add('header')

		var outline = document.createElement('div')
		outline.classList.add('outline')
		outline.setAttribute('tabindex', '0')

		//var toolbar = document.createElement('div')
		//toolbar.classList.add('toolbar')

		// XXX can't yet get rid of the editor element here... 
		// 		- handling autofocus of host vs. shadow???
		// 		- CSS not working correctly yet...
		// 		...is this feasible???
		editor.append(
			style,
			header,
			outline)
		shadow.append(editor) 

		console.log('SETUP')
		obj.setup(editor)

		return obj }, 
	// constructor stuff...
	{
		observedAttributes: [
			'value',

			'session-storage',
			'local-storage',
		],

		prototype: Object.assign(
			{
				__proto__: HTMLElement.prototype,

				// XXX HACK these are copies from Outline, use 
				// 		object.mixin(...) instead...
				get header(){
					return this.dom?.querySelector('.header') },
				set header(val){},
				get outline(){
					return this.dom?.querySelector('.outline') },
				set outline(val){},
				get toolbar(){
					return this.dom?.querySelector('.toolbar') },
				set toolbar(val){},

				// NOTE: this is here to break recursion of trying to set 
				// 		html's value both in .code that is called both when
				// 		setting .value and from .attributeChangedCallback(..)
				get __code(){
					return this.code },
				set __code(value){
					if(value == null){
						return }
					// XXX is this the right way to do this???
					this.__sessionStorage
						&& (sessionStorage[this.__sessionStorage] = value)
					this.__localStorage
						&& (localStorage[this.__localStorage] = value) },
				get code(){
					return this.hasAttribute('value') ?
						this.getAttribute('value')
						: HTMLElement.decode(this.innerHTML) },
				set code(value){
					if(value == null){
						return }
					// XXX this can break in conjunction with .attributeChangedCallback(..)
					if(this.hasAttribute('value')){
						this.setAttribute('value', value)
					} else {
						this.innerHTML = HTMLElement.encode(value) } 
					this.__code = value },

				// XXX do we need this???
				// 		...rename .code -> .value ???
				get value(){
					return this.code },
				set value(value){
					this.code = value },

				connectedCallback: function(){
					var that = this
					// load the data...
					setTimeout(function(){
						that.load(that.code) }, 0) },

				// XXX do we need to before == after check???
				attributeChangedCallback(name, before, after){
					if(name == 'local-storage'){
						this.__localStorage = after
						// NOTE: we setting .code here because we will 
						// 		.load(..) at .setup(..)
						sessionStorage[after]
							&& (this.code = sessionStorage[after]) }

					if(name == 'session-storage'){
						this.__sessionStorage = after
						sessionStorage[after]
							&& (this.code = sessionStorage[after]) }

					// NOTE: if other sources are active but unset this 
					// 		should provide the default, otherwise it will 
					// 		get overwritten by the value in .code by .load(..)
					if(name == 'value'){
						// see notes for .__code
						this.__code = after }
				},

			},
			// XXX this will fail due to all the getters/setters -- use object.mixin(..)...
			Outline),
	}))




/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                                         */
