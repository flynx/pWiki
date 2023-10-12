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

		// shorthands...
		if(node == 'next'){
			return this.get('focused', 1) }
		if(node == 'prev' || node == 'previous'){
			return this.get('focused', -1) }

		var outline = this.outline

		// get parent node...
		if(node instanceof HTMLElement){
			while(!node.getAttribute('tabindex')){
				node = node.parentElement 
				if(node === this.outline){
					return undefined } } }

		// node lists...
		var NO_NODES = {}
		var nodes = 
			node == 'all' ?
				[...outline.querySelectorAll('[tabindex]')] 
			: node == 'visible' ?
				[...outline.querySelectorAll('[tabindex]')] 
					.filter(function(e){
						return e.offsetParent != null })
			: node == 'editable' ?
				[...outline.querySelectorAll('[tabindex]>textarea')] 
			: node == 'selected' ?
				[...outline.querySelectorAll('[tabindex][selected]')]
			: node == 'top' ?
				[...outline.children]
					.filter(function(elem){ 
						return elem.getAttribute('tabindex') != null })
			: ['siblings', 'children'].includes(node) ?
				this.get('focused', node) 
			: node instanceof Array ?
				node
			: NO_NODES
		if(nodes !== NO_NODES){
			return offset == null ?
					nodes
				: typeof(offset) == 'number' ?
					nodes.at(offset)
				: nodes
					.map(function(elem){
						return that.get(elem, offset) }) }

		// single base node...
		node = 
			typeof(node) == 'number' ?
				this.at(node)
			: node == 'focused' ?
				(outline.querySelector(`[tabindex]:focus`)
					|| outline.querySelector(`textarea:focus`)?.parentElement
					|| outline.querySelector('[tabindex].focused'))
			: node == 'parent' ?
				this.get('focused')?.parentElement
			: node 
		var edited
		if(node == 'edited'){
			edited = outline.querySelector(`textarea:focus`)
			node = edited?.parentElement }

		if(!node || typeof(node) == 'string'){
			return undefined }

		// children...
		if(offset == 'children'){
			return [...node.children]
				.filter(function(elem){
					return elem.getAttribute('tabindex') != null }) }

		// siblings...
		if(offset == 'siblings'){
			return [...node.parentElement.children]
				.filter(function(elem){
					return elem.getAttribute('tabindex') != null }) }

		// offset...
		offset = 
			offset == 'next' ? 
				1
			: offset == 'prev' ?
				-1
			: offset
		if(typeof(offset) == 'number'){
			nodes = this.get('visible')
			var i = nodes.indexOf(node) + offset
			i = i < 0 ?
				nodes.length + i
				: i % nodes.length
			node = nodes[i] 
			edited = edited 
				&& node.querySelector('textarea') }
		return edited 
			|| node },
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
			var parent = cur.parentElement
			if(!parent.classList.contains('.outline')){
				var children = siblings.slice(siblings.indexOf(cur)+1)
				parent.after(cur)
				children.length > 0
					&& cur.append(...children) }
		// indent...
		} else {
			var parent = siblings[siblings.indexOf(cur) - 1]
			if(parent){
				parent.append(cur) } } 
		return cur },
	deindent: function(node='focused', indent=false){
		return this.indent(node, indent) },
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
				|| !node.querySelector('[tabindex]')){
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
		var table = function(_, body){
			return `<table><tr><td>${
				body
					.replace(/\s*\|\s*\n\s*\|\s*/gm, '</td></tr>\n<tr><td>')
					.replace(/\s*\|\s*/gm, '</td><td>')
			}</td></td></table>` }
		elem.text = code 
			// hidden attributes...
			// XXX make this generic...
			// XXX should these be hidden from code too???
			// collapsed...
			.replace(/(\n|^)\s*collapsed::\s*(.*)\s*(\n|$)/, 
				function(_, value){
					elem.collapsed = value.trim() == 'true'
					return '' })
			// id...
			.replace(/(\n|^)\s*id::\s*(.*)\s*(\n|$)/, 
				function(_, value){
					elem.id = value.trim()
					return '' })
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
			.replace(/^(.*)\s*(?<!\\)XXX$/m, style('XXX'))
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
			.replace(/(?<!\\)`(?=[^\s])(([^`]|\\`)*[^\s])(?<!\\)`/gm, '<code>$1</code>') 
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
			.replace(/(?<!\\)--(?!-)/gm, '&ndash;') 
			// quoting...
			// NOTE: this must be last...
			.replace(/(?<!\\)\\(.)/gm, '$1') 
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
		return [...node.children]
			.map(function(elem){
				return elem.nodeName != 'DIV' ?
					[]
					: [that.data(elem)] })
			.flat() },
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
			.split(/\n(\s*)- /g)
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
		if(typeof(data) != 'object'){
			place = data
			data = {} }
		var block = document.createElement('div')
		block.setAttribute('tabindex', '0')
		var text = document.createElement('textarea')
			.autoUpdateSize()
		var html = document.createElement('span')
		block.append(text, html)
		this.update(block, data)
		// place...
		var cur = this.get()
		if(place && cur){
			place = place == 'prev' ?
				'before'
				: place
			;(place == 'next' 
					&& (cur.querySelector('[tabindex]')
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
						elem.append(...level(data.children)) }
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

	// XXX add scrollIntoView(..) to nav...
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
				var child = this.focus('children')[0]
				if(!child){
					this.focus('next') }
			} else {
				evt.shiftKey ?
					this.toggleCollapse(false)
					: this.get('children')[0]?.focus() } },

		// indent...
		Tab: function(evt){
			evt.preventDefault()
			var edited = this.get('edited')
			var node = this.indent(!evt.shiftKey)
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

				// expand/collapse
				if(elem.nodeName == 'SPAN' 
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
					elem.querySelector('textarea').focus() }

				// toggle checkbox...
				if(elem.type == 'checkbox'){
					var node = that.get(elem)
					var text = node.querySelector('textarea')
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
		// heboard handling...
		outline.addEventListener('keydown', 
			function(evt){
				var elem = evt.target
				// update element state...
				if(elem.nodeName == 'TEXTAREA'){
					setTimeout(function(){
						that.update(elem.parentElement) 
						elem.updateSize() }, 0) }
				// handle keyboard...
				evt.key in that.keyboard 
					&& that.keyboard[evt.key].call(that, evt) })
		// toggle view/code of nodes...
		outline.addEventListener('focusin', 
			function(evt){
				var node = evt.target
				// scroll...
				// XXX a bit odd still and not smooth...
				;((node.nodeName == 'SPAN' 
							|| node.nodeName == 'TEXTAREA') ?
						node
						: node.querySelector('textarea+span'))
					?.scrollIntoView({ 
						block: 'nearest', 
						behavior: 'smooth',
					})
				// handle focus...
				for(var e of [...that.dom.querySelectorAll('.focused')]){
					e.classList.remove('focused') }
				that.get('focused')?.classList?.add('focused')
				// textarea...
				if(node.nodeName == 'TEXTAREA' 
						&& node?.nextElementSibling?.nodeName == 'SPAN'){
					node.updateSize() } })
		outline.addEventListener('focusout', 
			function(evt){
				var node = evt.target
				if(node.nodeName == 'TEXTAREA' 
						&& node?.nextElementSibling?.nodeName == 'SPAN'){
					var block = node.parentElement
					that.update(block, { text: node.value }) } })
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
			this.load(code.innerHTML
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')) }

		return this },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
