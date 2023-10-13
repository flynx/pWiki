/**********************************************************************
* 
*
*
**********************************************************************/


//---------------------------------------------------------------------

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




//---------------------------------------------------------------------

var codeBlock = {
	// can be used in:
	// 		<string>.replace(codeBlock.pattern, codeBlock.handler)
	// or:
	// 		codeBlock
	pattern: /(?<!\\)```(.*\s*\n)((\n|.)*?)\h*(?<!\\)```/g,
	handler: function(_, language, code){
		var quote = this?.quote 
			|| codeBlock.quote
		language = language.trim()
		language = language ?
			'language-'+language
			: language
		return `<pre>`
				+`<code contenteditable="true" class="${language}">${ 
					quote ?
						quote(code)
						: code
				}</code>`
			+`</pre>` },

	quote: function(text){
		return text
			.replace(/(?<!\\)&/g, '&amp;')
			.replace(/(?<!\\)</g, '&lt;')
			.replace(/(?<!\\)>/g, '&gt;')
			.replace(/\\(?!`)/g, '\\\\') },

	map: function(text, func){
		return text.replace(this.pattern, func) },

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
}



//---------------------------------------------------------------------

// XXX experiment with a concatinative model...
// 		.get(..) -> Outline (view)
var Outline = {
	dom: undefined,

	// config...
	//
	left_key_collapses: true,
	right_key_expands: true,
	code_update_interval: 5000,
	tab_size: 4,
	carot_jump_edge_then_block: false,


	get code(){
		return this.dom.querySelector('.code') },
	get outline(){
		return this.dom.querySelector('.outline') },
	get toolbar(){
		return this.dom.querySelector('.toolbar') },


	//
	// 	.get([<offset>])
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

		// root nodes...
		if(node == 'top'){
			return [...outline.children] }
		// groups defaulting to .outline as base...
		if(['all', 'visible', 'editable', 'selected'].includes(node)){
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
						return e.offsetParent != null })
			: offset == 'editable' ?
				[...node.querySelectorAll('.block>.code')] 
			: offset == 'selected' ?
				[...node.querySelectorAll('.block[selected]')] 
					.filter(function(e){
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
		elem?.focus()
		return elem },
	edit: function(node='focused', offset){
		var elem = this.get(...arguments)
		if(elem.nodeName != 'TEXTAREA'){
			elem = elem.querySelector('textarea') }
		elem?.focus()
		return elem },

	update: function(node='focused', data){
		var node = this.get(node)
		data ??= this.data(node, false)
		typeof(data.collapsed) == 'boolean'
			&& (data.collapsed ?
				node.setAttribute('collapsed', '')
				: node.removeAttribute('collapsed'))
		if(data.text != null){
			var text = node.querySelector('textarea')
			var html = node.querySelector('span')
			if(this.__code2html__){
				// NOTE: we are ignoring the .collapsed attr here 
				var parsed = this.__code2html__(data.text)
				html.innerHTML = parsed.text
				// heading...
				node.classList.remove(...this.__styles)
				parsed.style
					&& node.classList.add(...parsed.style)
			} else {
				html.innerHTML = data.text }
			text.value = data.text
			// XXX this does not see to work until we click in the textarea...
			text.autoUpdateSize() }
		return node },

	indent: function(node='focused', indent=true){
		// .indent(<indent>)
		if(node === true || node === false){
			indent = node
			node = 'focused' }
		var cur = this.get(node) 
		if(!cur){ 
			return }
		var siblings = this.get(node, 'siblings')
		// deindent...
		if(!indent){
			var parent = this.get(node, 'parent')
			if(parent != this.outline){
				var children = siblings
					.slice(siblings.indexOf(cur)+1)
				parent.after(cur)
				children.length > 0
					&& cur.lastChild.append(...children) }
		// indent...
		} else {
			var parent = siblings[siblings.indexOf(cur) - 1]
			if(parent){
				parent.lastChild.append(cur) } } 
		return cur },
	deindent: function(node='focused', indent=false){
		return this.indent(node, indent) },
	show: function(node='focused', offset){
		var node = this.get(...arguments)
		var outline = this.outline
		var parent = node
		do{
			parent = parent.parentElement
			parent.removeAttribute('collapsed')
		} while(parent !== outline)
		return node },
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
		return node },
	remove: function(node='focused', offset){
		var elem = this.get(...arguments)
		var next 
		if(elem.classList.contains('focused')){
			// XXX need to be able to get the next elem on same level...
			this.toggleCollapse(elem, true)
			next = elem === this.get(-1) ?
				this.get(elem, 'prev') 
				: this.get(elem, 'next') }
		elem?.remove()
		next?.focus()
		return this },

	clear: function(){
		this.outline.innerText = ''
		return this },

	// block serialization...
	// XXX split this up into a generic handler + plugins...
	// XXX need a way to filter input text...
	// 		use-case: hidden attributes...
	// NOTE: this is auto-populated by .__code2html__(..)
	__styles: undefined,
	__code2html__: function(code){
		var that = this
		var elem = {
			collapsed: false,
		}
		// only whitespace -> keep element blank...
		if(code.trim() == ''){
			elem.text = ''
			return elem }

		// helpers...
		var style = function(style, code=undefined){
			style = [style].flat()
			that.__styles = [...new Set([
				...(that.__styles ?? []),
				...style,
			])]
			return function(_, text){
				elem.style ??= []
				elem.style.push(...style)
				return code 
					?? text } }
		var quoteText = function(text){
			return text
				.replace(/(?<!\\)&/g, '&amp;')
				.replace(/(?<!\\)</g, '&lt;')
				.replace(/(?<!\\)>/g, '&gt;')
				.replace(/\\(?!`)/g, '\\\\') }
		var quote = function(_, code){
			return `<code>${quoteText(code)}</code>` }
		var table = function(_, body){
			return `<table><tr><td>${
				body
					.replace(/\s*\|\s*\n\s*\|\s*/gm, '</td></tr>\n<tr><td>')
					.replace(/\s*\|\s*/gm, '</td><td>')
			}</td></td></table>` }

		var preParse = function(text){
			return text 
				// hidden attributes...
				// XXX make this generic...
				// collapsed...
				.replace(/(\n|^)\s*collapsed::\s*(.*)\s*(\n|$)/, 
					function(_, value){
						elem.collapsed = value.trim() == 'true'
						return '' })
				// id...
				.replace(/(\n|^)\s*id::\s*(.*)\s*(\n|$)/, 
					function(_, value){
						elem.id = value.trim()
						return '' }) }
		var blockParse = function(text){
			return text 
				// markdown...
				// style: headings...
				.replace(/^(?<!\\)######\s+(.*)$/m, style('heading-6'))
				.replace(/^(?<!\\)#####\s+(.*)$/m, style('heading-5'))
				.replace(/^(?<!\\)####\s+(.*)$/m, style('heading-4'))
				.replace(/^(?<!\\)###\s+(.*)$/m, style('heading-3'))
				.replace(/^(?<!\\)##\s+(.*)$/m, style('heading-2'))
				.replace(/^(?<!\\)#\s+(.*)$/m, style('heading-1'))
				// style: list...
				//.replace(/^(?<!\\)[-\*]\s+(.*)$/m, style('list-item'))
				.replace(/^\s*(.*)(?<!\\):\s*$/m, style('list'))
				.replace(/^\s*(.*)(?<!\\)#\s*$/m, style('numbered-list'))

				// style: misc...
				.replace(/^\s*(?<!\\)>\s+(.*)$/m, style('quote'))
				.replace(/^\s*(?<!\\)((\/\/|;)\s+.*)$/m, style('comment'))
				.replace(/^\s*(?<!\\)NOTE:?\s*(.*)$/m, style('NOTE'))
				.replace(/^\s*(?<!\\)XXX\s+(.*)$/m, style('XXX'))
				.replace(/^(.*)\s*(?<!\\)XXX$/m, style('XXX')) }
		var quoteParse = function(text){
			return text
				.replace(codeBlock.pattern, codeBlock.handler)
				.replace(/(?<!\\)`(?=[^\s])(([^`]|\\`)*[^\s])(?<!\\)`/gm, quote) }
		var inlineParse = function(text){
			return text 
				.replace(/(\s*)(?<!\\)(FEATURE:|Q:|Question:|Note:)(\s*)/gm, 
					'$1<b class="$2">$2</b>$3')
				.replace(/(\s*)(?<!\\)(ASAP|BUG|FIX|HACK|STUB|WARNING|CAUTION)(\s*)/gm, 
					'$1<span class="highlight $2">$2</span>$3')
				// elements...
				.replace(/(\n|^)(?<!\\)---*\h*(\n|$)/m, '$1<hr>')
				// ToDo...
				// NOTE: these are separate as we need to align block text 
				// 		to leading chekbox...
				.replace(/^\s*(?<!\\)\[[_ ]\]\s*/m, 
					style('todo', '<input type="checkbox">'))
				.replace(/^\s*(?<!\\)\[[Xx]\]\s*/m, 
					style('todo', '<input type="checkbox" checked>'))
				// inline checkboxes...
				.replace(/\s*(?<!\\)\[[_ ]\]\s*/gm, 
					style('check', '<input type="checkbox">'))
				.replace(/\s*(?<!\\)\[[Xx]\]\s*/gm, 
					style('check', '<input type="checkbox" checked>'))
				// tables...
				.replace(/^\s*(?<!\\)\|\s*((.|\n)*)\s*\|\s*$/, table)
				// basic styling...
				// XXX revise...
				.replace(/(?<!\\)\*(?=[^\s*])(([^*]|\\\*)*[^\s*])(?<!\\)\*/gm, '<b>$1</b>')
				.replace(/(?<!\\)~(?=[^\s~])(([^~]|\\~)*[^\s~])(?<!\\)~/gm, '<s>$1</s>')
				.replace(/(?<!\\)_(?=[^\s_])(([^_]|\\_)*[^\s_])(?<!\\)_/gm, '<i>$1</i>') 
				// code/quoting...
				//.replace(/(?<!\\)`(?=[^\s])(([^`]|\\`)*[^\s])(?<!\\)`/gm, quote) 
				// XXX support "\==" in mark...
				.replace(/(?<!\\)==(?=[^\s])(.*[^\s])(?<!\\)==/gm, '<mark>$1</mark>') 
				// links...
				.replace(/(?<!\\)\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
				.replace(/((?:https?:|ftps?:)[^\s]*)(\s*)/g, '<a href="$1">$1</a>$2')
				// characters...
				// XXX use ligatures for these???
				.replace(/(?<!\\)\(i\)/gm, '🛈') 
				.replace(/(?<!\\)\(c\)/gm, '©') 
				.replace(/(?<!\\)\/!\\/gm, '⚠') 
				.replace(/(?<!\\)---(?!-)/gm, '&mdash;') 
				.replace(/(?<!\\)--(?!-)/gm, '&ndash;') }
		var postParse = function(text){
			return text
				// quoting...
				// NOTE: this must be last...
				.replace(/(?<!\\)\\(.)/gm, '$1') }

		var parse = function(text){
			// split text into parsable and non-parsable sections...
			// split fomat:
			// 	[ text <match> <type> <body>, ... ]
			var pattern = /(<(pre|code)(?:|\s[^>]*)>((?:\n|.)*)<\/\2>)/g
			var sections = 
				quoteParse(
						blockParse(
							preParse(text
								.replace(/\x00/g, ''))))
					.split(pattern)
			// sort out the sections...
			var parsable = [] 
			var quoted = []
			while(sections.length > 0){
				var [section, match] = sections.splice(0, 4)
				parsable.push(section)
				quoted.push(match) }
			// parse only the parsable sections...
			return postParse(
				inlineParse(
						parsable
							.join('\x00'))
					.split(/\x00/g)
					.map(function(section){
						return [section, quoted.shift() ?? '']	})
					.flat()
					.join('')) }

		elem.text = parse(code)

		return elem },
	// XXX essentially here we need to remove service stuff like some 
	// 		attributes (collapsed, id, ...)...
	// XXX also need to quote leading '- ' in block text here...
	// 		e.g.
	// 			- block
	// 			  some text
	// 			  - text in the above block ('-' needs to be quoted)
	// 			- next block
	__code2text__: function(code){
		// XXX
	},
	__text2code__: function(text){
		// XXX
	},

	// serialization...
	data: function(elem, deep=true){
		elem = this.get(elem)	
		return {
			text: elem.querySelector('textarea').value,
			collapsed: elem.getAttribute('collapsed') != null,
			...(deep ? 
				{children: this.json(elem)}
				: {}),
		} },
	json: function(node){
		var that = this
		node ??= this.outline
		return [...node.lastChild.children]
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
					+ elem.text
						.replace(/\n/g, '\n'+ level +'  ') 
					+ (elem.collapsed ?
						'\n'+level+'  ' + 'collapsed:: true'
						: ''),
				(elem.children 
						&& elem.children.length > 0) ?
					this.text(elem.children || [], indent, level+indent) 
					: [] ) }
		return text
			.flat()
			.join('\n') },

	parse: function(text){
		text = text
			.replace(/^\s*\n/, '')
		text = ('\n' + text)
			.split(/\n(\s*)(?:- |-\s*$)/gm)
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
					var collapsed = false
					block = block
						.replace(/\n\s*collapsed::\s*(.*)\s*$/, 
							function(_, value){
								collapsed = value == 'true'
								return '' })
					parent.push({ 
						text: block
							// normalize indent...
							.split(new RegExp('\n'+sep+'  ', 'g'))
							.join('\n'),
						collapsed,
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
			;(place == 'next' 
					&& (cur.querySelector('.block')
						|| cur.nextElementSibling)) ?
				this.get(place).before(block)
			: (place == 'next' 
					&& !cur.nextElementSibling) ?
				cur.after(block)
			: (place == 'before' || place == 'after') ?
				cur[place](block)
			: undefined }
		return block },
	load: function(data){
		var that = this
		data = typeof(data) == 'string' ?
			this.parse(data)
			: data
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
		for(var e of [...this.outline.querySelectorAll('textarea')]){
			e.updateSize() }
		return this },

	sync: function(){
		var code = this.code
		code 
			&& (code.innerHTML = this.text())
		return this },

	// XXX move the code here into methods/actions...
	// XXX add scrollIntoView(..) to nav...
	// XXX use keyboard.js...
	keyboard: {
		// vertical navigation...
		// XXX this is a bit hacky but it works -- the caret blinks at 
		// 		start/end of block before switching to next, would be 
		// 		nice po prevent this...
		ArrowUp: function(evt){
			var that = this
			var edited = this.get('edited')
			if(edited){
				var c = edited.selectionStart
				var jump = function(){
					if(edited.selectionStart == 0){
						// needed to remember the position...
						edited.selectionStart = c
						edited.selectionEnd = c
						that.focus('edited', -1) } }
				this.carot_jump_edge_then_block ?
					jump()
					: setTimeout(jump, 0)
			} else {
				evt.preventDefault() 
				this.focus('focused', -1) } },
		ArrowDown: function(evt){
			var that = this
			var edited = this.get('edited')
			if(edited){
				var c = edited.selectionStart
				var jump = function(){
					if(edited.selectionStart == edited.value.length){
						// needed to remember the position...
						edited.selectionStart = c
						edited.selectionEnd = c
						that.focus('edited', 1) } }
				this.carot_jump_edge_then_block ?
					jump()
					: setTimeout(jump, 0)
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
			;((this.left_key_collapses 
						|| evt.shiftKey)
					&& this.get().getAttribute('collapsed') == null
					&& this.get('children').length > 0) ?
				this.toggleCollapse(true)
				: this.focus('parent') },
		ArrowRight: function(evt){
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
			if(this.right_key_expands){
				this.toggleCollapse(false) 
				this.focus('next')
			} else {
				evt.shiftKey ?
					this.toggleCollapse(false)
					: this.focus('next') } },

		// indent...
		Tab: function(evt){
			evt.preventDefault()
			var edited = this.get('edited')
			var node = this.show(
				this.indent(!evt.shiftKey))
			// keep focus in node...
			;(edited ?
				edited
				: node)?.focus() },

		// edit mode...
		O: function(evt){
			if(evt.target.nodeName != 'TEXTAREA'){
				evt.preventDefault()
				this.Block('before')
					?.querySelector('textarea')
					?.focus() } },
		o: function(evt){
			if(evt.target.nodeName != 'TEXTAREA'){
				evt.preventDefault()
				this.Block('next')
					?.querySelector('textarea')
					?.focus() } },
		Enter: function(evt){
			if(evt.ctrlKey
					|| evt.shiftKey){
				return }
			evt.preventDefault()
			evt.target.nodeName == 'TEXTAREA' ?
				this.Block('next')
					?.querySelector('textarea')
					?.focus()
				: this.get()
					?.querySelector('textarea')
					?.focus() },
		Escape: function(evt){
			this.outline.querySelector('textarea:focus')
				?.parentElement
				?.focus() },
		Delete: function(evt){
			if(this.get('edited')){
				return }
			this.remove() },

		// select...
		// XXX add:
		// 		ctrl-A
		// 		ctrl-D
		' ': function(evt){
			if(this.get('edited') != null){
				return }
			evt.preventDefault()
			var focused = this.get()
			focused.getAttribute('selected') != null ?
				focused.removeAttribute('selected')
				: focused.setAttribute('selected', '') },
	},

	// XXX might be a good idea to defer specific actions to event-like 
	// 		handlers...
	// 		e.g. clicking left if block -> .blockleft(..) ... etc.
	setup: function(dom){
		var that = this
		this.dom = dom

		// outline...
		var outline = this.outline
		// update stuff already in DOM...
		for(var elem of [...outline.querySelectorAll('textarea')]){
			elem.autoUpdateSize() } 
		// click...
		outline.addEventListener('click', 
			function(evt){
				var elem = evt.target

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
				if(elem.classList.contains('view')
						&& elem.parentElement.getAttribute('tabindex')){
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
				// NOTE: this is usefull if element text is hidden but the 
				// 		frame is still visible...
				if(elem.getAttribute('tabindex')){
					elem.querySelector('.code').focus() }

				// toggle checkbox...
				if(elem.type == 'checkbox'){
					var node = that.get(elem)
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
					text.value = text.value.replace(/\[[Xx_]\]/g, toggle) } })
		// keyboard handling...
		outline.addEventListener('keydown', 
			function(evt){
				var elem = evt.target
				// code editing...
				if(elem.nodeName == 'CODE' 
						&& elem.getAttribute('contenteditable') == 'true'){
					return }
				// update element state...
				if(elem.nodeName == 'TEXTAREA'){
					setTimeout(function(){
						that.update(elem.parentElement) 
						elem.updateSize() }, 0) }
				// handle keyboard...
				evt.key in that.keyboard 
					&& that.keyboard[evt.key].call(that, evt) })
		// update code block...
		outline.addEventListener('keyup', 
			function(evt){
				var elem = evt.target
				// editable code...
				if(elem.nodeName == 'CODE' 
						&& elem.getAttribute('contenteditable') == 'true'){
					// XXX should we clear the syntax???
					// XXX do this only if things changed...
					delete elem.dataset.highlighted

					var block = that.get(elem)
					var code = block.querySelector('.code')

					var update = elem.innerText
					var i = [...block
							.querySelectorAll('.view code[contenteditable=true]')]
						.indexOf(elem)
					// update element content...
					code.value = codeBlock.replace(code.value, i, update)

					return } })
		// toggle view/code of nodes...
		outline.addEventListener('focusin', 
			function(evt){
				var elem = evt.target

				if(elem.classList.contains('children')){
					return }

				// handle focus...
				for(var e of [...that.dom.querySelectorAll('.focused')]){
					e.classList.remove('focused') }
				that.get('focused')?.classList?.add('focused')
				// textarea...
				if(elem.classList.contains('code')){
					elem.updateSize() } 

				/*/ scroll...
				that.get(node).querySelector('view')
					?.scrollIntoView({ 
						block: 'nearest', 
						behavior: 'smooth',
					})
				//*/
			})
		outline.addEventListener('focusout', 
			function(evt){
				var node = evt.target
				if(node.nodeName == 'TEXTAREA' 
						&& node?.nextElementSibling?.nodeName == 'SPAN'){
					var block = node.parentElement
					that.update(block, { text: node.value }) } 
				
				// XXX do a plugin...
				window.hljs
					&& hljs.highlightAll() 
			})
		// update .code...
		var update_code_timeout
		outline.addEventListener('change', 
			function(evt){
				if(update_code_timeout){
					return }
				update_code_timeout = setTimeout(
					function(){
						update_code_timeout = undefined
						that.sync() }, 
					that.code_update_interval || 5000) })

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
					editor.get().querySelector('textarea').focus() 
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
			this.load(code.innerHTML
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')) 
			console.log(`Parse: ${Date.now() - t}ms`)}

		// XXX do a plugin...
		window.hljs
			&& hljs.highlightAll() 
		
		return this },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
