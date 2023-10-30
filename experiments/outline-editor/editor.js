/**********************************************************************
* 
*
*
**********************************************************************/


//---------------------------------------------------------------------
// Helpers...

// XXX do a caret api...

// XXX only for text areas...
var atLine = function(elem, index){
	// XXX add support for range...
	var text = elem.value
	var lines = text.split(/\n/g).length
	var line = elem.caretLine 

	// XXX STUB index handling...
	if((index == -1 && line == lines) 
			|| (index == 0 && line == 1)){
		return true }
	return false }


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
// XXX it would be a better idea to do a binary search instead of a liner 
// 		pass... but at this point this is not critical (unless we get 
// 		gigantic blocks)
// XXX HACK -- is there a better way to do this???
var getCharOffset = function(elem, x, y, c){
	c = c ?? 0
	var r = document.createRange()
	for(var e of [...elem.childNodes]){
		// text node...
		if(e instanceof Text){
			var prev, b
			for(var i=0; i <= e.length; i++){
				r.setStart(e, i)
				r.setEnd(e, i)
				prev = b
				b = r.getBoundingClientRect()
				// found target...
				if(b.x >= x 
						&& b.y <= y 
						&& b.bottom >= y){
					// get the closest gap between chars to the click...
					return Math.abs(b.x - x) <= Math.abs(prev.x - x) ?
						c + i
						: c + i - 1 } }
			c += i - 1
		// html node...
		} else {
			var res = getCharOffset(e, x, y, c)
			if(!(res instanceof Array)){
				return res } 
			;[c, res] = res } }
	// no result was found...
	return arguments.length > 3 ?
		[c, null]
		: null }


// Get offset in markdown relative to the resulting text...
//                     
//					    v <----- position
//		text:		'Hea|ding'
//					    |
//		                +-+ <--- offset in markdown
//		                  |
//		markdown:	'# Hea|ding'
//
var getMarkdownOffset = function(markdown, text, i){
	i = i ?? text.length
	var m = 0
	// walk both strings skipping/counting non-matching stuff...
	for(var n=0; n <= i; n++, m++){
		var c = text[n]
		var p = m
		// walk to next match...
		while(c != markdown[m] && m < markdown.length){
			m++ } 
		// reached something unrepresentable directly in markdown (html 
		// entity, symbol, ...)
		if(m >= markdown.length){
			m = p } }
	return m - n }



//---------------------------------------------------------------------
// Plugins...

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
			return code 
				?? text } },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

// XXX style attributes... 
var attributes = {
	__proto__: plugin,

	__parse__: function(text, editor, elem){
		var skip = new Set([
			'text', 
			'focused',
			'collapsed',
			'id',
			'children', 
			'style',
		])
		return text 
			+ Object.entries(elem)
				.reduce(function(res, [key, value]){
					return skip.has(key) ?
						res
						: res + `<br>${key}: ${value}` }, '') },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

var blocks = {
	__proto__: plugin,

	__pre_parse__: function(text, editor, elem){
		return text 
			// markdown...
			// style: headings...
			.replace(/^(?<!\\)######\s+(.*)$/m, this.style(editor, elem, 'heading-6'))
			.replace(/^(?<!\\)#####\s+(.*)$/m, this.style(editor, elem, 'heading-5'))
			.replace(/^(?<!\\)####\s+(.*)$/m, this.style(editor, elem, 'heading-4'))
			.replace(/^(?<!\\)###\s+(.*)$/m, this.style(editor, elem, 'heading-3'))
			.replace(/^(?<!\\)##\s+(.*)$/m, this.style(editor, elem, 'heading-2'))
			.replace(/^(?<!\\)#\s+(.*)$/m, this.style(editor, elem, 'heading-1'))
			// style: list...
			//.replace(/^(?<!\\)[-\*]\s+(.*)$/m, style('list-item'))
			.replace(/^\s*(.*)(?<!\\):\s*$/m, this.style(editor, elem, 'list'))
			.replace(/^\s*(.*)(?<!\\)#\s*$/m, this.style(editor, elem, 'numbered-list'))
			// style: misc...
			.replace(/^\s*(?<!\\)>\s+(.*)$/m, this.style(editor, elem, 'quote'))
			.replace(/^\s*(?<!\\)((\/\/|;)\s+.*)$/m, this.style(editor, elem, 'comment'))
			.replace(/^\s*(?<!\\)NOTE:?\s*(.*)$/m, this.style(editor, elem, 'NOTE'))
			.replace(/^\s*(?<!\\)XXX\s+(.*)$/m, this.style(editor, elem, 'XXX'))
			.replace(/^(.*)\s*(?<!\\)XXX$/m, this.style(editor, elem, 'XXX'))
			.replace(/^\s*---\s*$/m, this.style(editor, elem, 'hr', '<hr>')) } ,
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

	pre_pattern: /(?<!\\)```(.*\s*\n)((\n|.)*?)\h*(?<!\\)```/g,
	pre: function(_, language, code){
		language = language.trim()
		language = language ?
			'language-'+language
			: language
		return `<pre>`
				+`<code contenteditable="true" class="${language}">${ 
					this.encode(code)
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

var tasks = {
	__proto__: plugin,

	done_patterns: [
		/^\s*(?<!\\)DONE\s+(.*)$/m,
		/^(.*)\s*(?<!\\)DONE\s*$/m,
	],

	// State...
	updateStatus: function(editor, node){
		node = editor.get(node)
		if(node == null){
			return this }
		var state = node
			.querySelector('.view')
				.querySelector('.completion')
		if(state){
			var c = 
				((node.querySelectorAll('input[type=checkbox]:checked').length
						/ node.querySelectorAll('input[type=checkbox]').length)
					* 100)
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
	// DONE...
	toggleDone: function(editor, elem){
		var node = editor.get(elem)
		if(node == null){
			return }
		var data = editor.data(elem, false)
		var text = node.querySelector('.code')
		var value = text.value
		var s = text.selectionStart
		var e = text.selectionEnd
		var l = text.value.length
		if(this.done_patterns
				.reduce(function(res, p){ 
					return res 
						|| p.test(text.value) } , false)){
			for(var p of this.done_patterns){
				value = value.replace(p, '$1') }
		} else {
			value = 'DONE ' + value }
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

	__setup__: function(editor){
		return this.updateAllStatus(editor) },
	__pre_parse__: function(text, editor, elem){
		// handle done..
		var handler = this.style(editor, elem, 'DONE')
		for(var p of this.done_patterns){
			text = text
				.replace(p, handler) }
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

	__parse__: function(text, editor, elem){
		return text
			.replace(/^\s*(?<!\\)\|\s*((.|\n)*)\s*\|\s*$/, 
				function(_, body){
					return `<table><tr><td>${
						body
							.replace(/\s*\|\s*\n\s*\|\s*/gm, '</td></tr>\n<tr><td>')
							.replace(/\s*\|\s*/gm, '</td><td>')
					}</td></td></table>` }) },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -      

var styling = {
	__proto__: plugin,

	__parse__: function(text, editor, elem){
		return text
			// markers...
			.replace(/(\s*)(?<!\\)(FEATURE[:?]|Q:|Question:|Note:)(\s*)/gm, 
				'$1<b class="$2">$2</b>$3')
			.replace(/(\s*)(?<!\\)(ASAP|BUG|FIX|HACK|STUB|WARNING|CAUTION)(\s*)/gm, 
				'$1<span class="highlight $2">$2</span>$3')
			// elements...
			.replace(/(\n|^)(?<!\\)---*\h*(\n|$)/m, '$1<hr>')
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
	// Format:
	// 	<json> ::= [
	// 			{
	// 				text: <text>,
	// 				children: <json>,
	// 				...
	// 			},
	// 			...
	// 		]
	json: undefined,

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
			for(var e of this.json){
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
		for(var node of this.json){
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

	parseBlockAttrs: function(){},
	parse: function(){},

	data: function(){},
	load: function(){},
	text: function(){},
}



// XXX experiment with a concatinative model...
// 		.get(..) -> Outline (view)
var Outline = {
	dom: undefined,

	// config...
	//
	left_key_collapses: true,
	right_key_expands: true,
	change_interval: 1000,
	tab_size: 4,
	carot_jump_edge_then_block: false,


	// Plugins...
	//
	// The order of plugins can be significant in the following cases:
	// 	- parsing
	// 	- event dropping
	plugins: [
		blocks,
		quoted,

		// NOTE: this needs to be before styling to prevent it from 
		// 		treating '[_] ... [_]' as italic...
		tasks,
		styling,
		// XXX
		//attributes,
		tables,
		symbols,
		//syntax,

		// keep this last...
		// XXX revise -- should this be external???
		escaping,
	],
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
				: node.parentElement.parentElement }
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
						return e.querySelector('.view').offsetParent != null })
			: offset == 'viewport' ?
				[...node.querySelectorAll('.block')] 
					.filter(function(e){
						return e.querySelector('.view').offsetParent != null 
							&& e.querySelector('.code').visibleInViewport() })
			: offset == 'editable' ?
				[...node.querySelectorAll('.block>.code')] 
			: offset == 'selected' ?
				[...node.querySelectorAll('.block[selected]')] 
					.filter(function(e){
						return e.querySelector('.view').offsetParent != null }) 
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

	__block_attrs__: {
		id: 'attr',
		collapsed: 'attr',
		focused: 'cls',
	},
	// NOTE: this does not internally handle undo as it would be too 
	// 		granular...
	update: function(node='focused', data){
		var node = this.get(node)
		data ??= this.data(node, false)

		var parsed = {}
		if('text' in data){
			var text = node.querySelector('.code')
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
			text.value = data.text
			// XXX this does not seem to work until we click in the textarea...
			text.autoUpdateSize() }

		for(var [attr, value] of Object.entries({...data, ...parsed})){
			if(attr == 'children' || attr == 'text'){
				continue }

			var type = this.__block_attrs__[attr]
			if(type == 'cls'){
				value ?
					node.classList.add(attr)
					: node.classList.remove(attr) 

			} else if(type == 'attr' 
					|| type == undefined){
				typeof(value) == 'boolean'?
						(value ?
							node.setAttribute(attr, '')
							: node.removeAttribute(attr))
					: value != null ?
						node.setAttribute(attr, value)
					: node.removeAttribute(attr) } }
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
		if(state){
			node.setAttribute('collapsed', '')
		} else {
			node.removeAttribute('collapsed')
			for(var elem of [...node.querySelectorAll('textarea')]){
				elem.updateSize() } }
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
						return `<span class="path-item" onclick="editor.uncrop(${ length-i })">${
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

	// block render...
	// NOTE: this is auto-populated by .__code2html__(..)
	__styles: undefined,
	__code2html__: function(code, elem={}){
		var that = this

		// only whitespace -> keep element blank...
		if(code.trim() == ''){
			elem.text = ''
			return elem }

		// helpers...
		var run = function(stage, text){
			var meth = {
				pre: '__pre_parse__',
				main: '__parse__',
				post: '__post_parse__',
			}[stage]
			return that.threadPlugins(meth, text, that, elem) }

		elem = this.parseBlockAttrs(code, elem)
		code = elem.text

		// stage: pre...
		var text = run('pre', 
			// pre-sanitize...
			code.replace(/\x00/g, ''))
		// split text into parsable and non-parsable sections...
		var sections = text
			// split fomat:
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

		return elem },
	// output format...
	__code2text__: function(code){
		return code 
			.replace(/(\n\s*)-/g, '$1\\-') },
	__text2code__: function(text){
		return text 
			.replace(/(\n\s*)\\-/g, '$1-') },

	// serialization...
	data: function(elem, deep=true){
		elem = this.get(elem)	
		// XXX move these to config...
		var attrs = this.__block_attrs__
		var cls_attrs = ['focused']
		return {
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
				{children: this.json(elem)}
				: {}),
		} },
	json: function(node){
		var that = this
		var children = [...(node ?
			node.lastChild.children
			: this.outline.children)]
		return children
			.map(function(elem){
				return that.data(elem) }) },
	// XXX add option to customize indent size...
	text: function(node, indent, level){
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
							return (attr == 'text' 
									|| attr == 'children') ?
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

	//
	//	Parse attrs...
	//	.parseBlockAttrs(<text>[, <elem>])
	//		-> <elem>
	//
	//	Parse attrs keeping non-system attrs in .text...
	//	.parseBlockAttrs(<text>, true[, <elem>])
	//		-> <elem>
	//
	//	Parse attrs keeping all attrs in .text...
	//	.parseBlockAttrs(<text>, 'all'[, <elem>])
	//		-> <elem>
	//
	parseBlockAttrs: function(text, keep=false, elem={}){
		if(typeof(keep) == 'object'){
			elem = keep
			keep = typeof(elem) == 'boolean' ?
				elem
				: false }
		var system = this.__block_attrs__
		var clean = text
			// XXX for some reason changing the first group into (?<= .. )
			// 		still eats up the whitespace...
			// 		...putting the same pattern in a normal group and 
			// 		returning it works fine...
			//.replace(/(?<=[\n\h]*)(?:(?:\n|^)\s*\w*\s*::\s*[^\n]*\s*)*$/, 
			.replace(/([\n\t ]*)(?:(?:\n|^)[\t ]*\w+[\t ]*::[\t ]*[^\n]+[\t ]*)+$/, 
				function(match, ws){
					var attrs = match
						.trim()
						.split(/(?:[\t ]*::[\t ]*|[\t ]*\n[\t ]*)/g)
					while(attrs.length > 0){
						var [name, val] = attrs.splice(0, 2)
						elem[name] = 
							val == 'true' ?
				   				true
							: val == 'false' ?
								false
							: val 
						// keep non-system attrs...
						if(keep 
								&& !(name in system)){
							ws += `\n${name}::${val}` } } 
					return ws })
		elem.text = keep == 'all' ? 
			text 
			: clean
		return elem },
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
					var attrs = that.parseBlockAttrs(block)
					attrs.text = that.__text2code__(attrs.text
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
		block.append(code, html, children)

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

			this.setUndo(this.path(cur), 'remove', [this.path(block)]) }
		return block },
	// XXX see inside...
	load: function(data){
		var that = this
		data = typeof(data) == 'string' ?
				this.parse(data)
			: data instanceof Array ?
				data
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
		// update sizes of all the textareas (transparent)...
		// NOTE: this is needed to make initial clicking into multi-line 
		// 		blocks place the cursor into the clicked location.
		// 		...this is done by expanding the textarea to the element 
		// 		size and enabling it to intercept clicks correctly...
		setTimeout(function(){
			for(var e of [...that.outline.querySelectorAll('textarea')]){
				e.updateSize() } }, 0)
		// restore focus...
		this.focus()
		return this },

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

	// XXX move the code here into methods/actions...
	// XXX use keyboard.js...
	__overtravel_timeout: undefined,
	keyboard: {
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
				var line = edited.getTextGeometry().line
				if(line == 0){
					evt.preventDefault() 
					that.focus('edited', 'prev') }
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
				var {line, lines} = edited.getTextGeometry()
				if(line == lines - 1){
					evt.preventDefault() 
					that.focus('edited', 'next') }
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
					return }
				// split text...
				evt.preventDefault()
				var a = edited.selectionStart
				var b = edited.selectionEnd
				// position 0: focus empty node above...
				if(a == 0){
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

		a_x: function(evt){
			// toggle done...
			evt.preventDefault()
			tasks.toggleDone(this) },

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
		outline.addEventListener('mousedown', 
			function(evt){
				var elem = evt.target
				// place the cursor where the user clicked in code/text...
				if(elem.classList.contains('code') 
						&& document.activeElement !== elem){
					evt.preventDefault()
					var view = that.get(elem).querySelector('.view')
					var c = getCharOffset(view, evt.clientX, evt.clientY)
					if(c == null){
						elem.focus()
						elem.selectionStart = elem.value.length
						elem.selectionEnd = elem.value.length 
					} else {
						console.log('---', c)
						var m = getMarkdownOffset(elem.value, view.innerText, c)
						elem.focus()
						elem.selectionStart = c + m
						elem.selectionEnd = c + m } } })
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
						that.keyboard[k].call(that, evt)
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
						that.update(elem.parentElement)
						elem.updateSize() }, 0) }
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
					elem.value = that.parseBlockAttrs(elem.value).text
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
						that.runPlugins('__editedcode__', evt, that, elem) }, 0) } 

				that.runPlugins('__focusout__', evt, that, elem) })
		// update .code...
		outline.addEventListener('change', 
			function(evt){
				that.__change__() })

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
			this.focus() }
		
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

		editor.append(
			style,
			header,
			outline)
		shadow.append(editor) 

		obj.setup(editor)

		return obj }, 
	// constructor stuff...
	{
		observedAttributes: [
			'value',
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

				// XXX these are generic...
				encode: function(text){
					var span = document.createElement('span')
					span.innerText = text
					return span.innerHTML },
				decode: function(text){
					var span = document.createElement('span')
					span.innerHTML = text
					return span.innerText },

				get code(){
					return this.hasAttribute('value') ?
						this.getAttribute('value')
						: this.decode(this.innerHTML) },
				set code(value){
					if(value == null){
						return }
					// XXX this can break in conjunction with .attributeChangedCallback(..)
					if(this.hasAttribute('value')){
						this.setAttribute('value', value)
					} else {
						this.innerHTML = this.encode(value) } },

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

				attributeChangedCallback(name, before, after){
					if(name == 'value'){
						if(before != after){
							// XXX
							console.log('---', before, '->', after)
						}
						return }
				},

			},
			// XXX this will fail due to all the getters/setters -- use object.mixin(..)...
			Outline),
	}))




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
