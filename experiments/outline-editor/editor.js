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

var attributes = {
	__proto__: plugin,

	__pre_parse__: function(text, editor, elem){
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
					return '' }) },
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
			.replace(/^(.*)\s*(?<!\\)XXX$/m, this.style(editor, elem, 'XXX')) } ,
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
		var node = editor.get(elem)
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

	toggleDone: function(editor, elem){
		var node = editor.get(elem)
		if(node == null){
			return }
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
	__parse__: function(text, editor, elem){
		return text
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
			.replace(/(?<!\\)\[[%]\]/gm, '<span class="completion"></span>') },
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

	__parse__: function(text, editor, elem){
		return text
			// characters...
			.replace(/(?<!\\)\(i\)/gm, '🛈') 
			.replace(/(?<!\\)\(c\)/gm, '©') 
			.replace(/(?<!\\)\/!\\/gm, '⚠') 
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


	// Plugins...
	//
	// The order of plugins can be significant in the following cases:
	// 	- parsing
	// 	- event dropping
	plugins: [
		attributes,
		blocks,
		quoted,

		// NOTE: this needs to be before styling to prevent it from 
		// 		treating '[_] ... [_]' as italic...
		tasks,
		styling,
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
	shift: function(node='focused', direction){
		if(node == 'up' || node == 'down'){
			direction = node
			node = 'focused' }
		if(direction == null){
			return }
		node = this.get(node)
		var focused = node.classList.contains('focused')
		var siblings = this.get(node, 'siblings')
		var i = siblings.indexOf(node)
		if(direction == 'up' 
				&& i > 0){
			siblings[i-1].before(node)
			focused 
				&& this.focus()
		} else if(direction == 'down' 
				&& i < siblings.length-1){
			siblings[i+1].after(node) 
			focused 
				&& this.focus() }
		return this },
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
		return {
			text: elem.querySelector('textarea').value,
			collapsed: elem.getAttribute('collapsed') != null,
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
		var that = this
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
						text: that.__text2code__(block
								// normalize indent...
								.split(new RegExp('\n'+sep+'  ', 'g'))
								.join('\n')),
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
				var line = edited.getTextGeometry().line
				if(line == 0){
					evt.preventDefault() 
					that.focus('edited', 'prev') }
			} else {
				evt.preventDefault() 
				this.focus('focused', -1) } },
		ArrowDown: function(evt){
			var that = this
			var edited = this.get('edited')
			if(edited){
				var {line, lines} = edited.getTextGeometry()
				if(line == lines -1){
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

		PageUp: function(evt){
			var edited = this.get('edited')
			if(!edited 
					&& (evt.shiftKey 
						|| evt.ctrlKey)){
				evt.preventDefault()
				this.shift('up') } },
		PageDown: function(evt){
			var edited = this.get('edited')
			if(!edited 
					&& (evt.shiftKey 
						|| evt.ctrlKey)){
				evt.preventDefault()
				this.shift('down') } },

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
			// edit -> split text...
			if(edited){
				if(evt.ctrlKey
						|| evt.shiftKey){
					return }
				evt.preventDefault()
				var a = edited.selectionStart
				var b = edited.selectionEnd
				var prev = edited.value.slice(0, a)
				var next = edited.value.slice(b)
				edited.value = prev
				this.Block('next')
				edited = this.edit('next')
				edited.value = next
				edited.selectionStart = 0
				edited.selectionEnd = 0
				return }
			// view -> edit...
			evt.preventDefault()
			this.edit() },
		Escape: function(evt){
			this.focus() },

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

		d: function(evt){
			// toggle done...
			if(evt.ctrlKey){
				evt.preventDefault()
				tasks.toggleDone(this) } },

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
				// NOTE: this is usefull if element text is hidden but the 
				// 		frame is still visible...
				if(elem.classList.contains('block')){
					elem.querySelector('.code').focus() }

				that.runPlugins('__click__', evt, that, elem) })
		// keyboard handling...
		outline.addEventListener('keydown', 
			function(evt){
				var elem = evt.target
				if(that.runPlugins('__keydown__', evt, that, evt.target) !== true){
					return }
				// update element state...
				if(elem.classList.contains('code')){
					setTimeout(function(){
						that.update(elem.parentElement) 
						elem.updateSize() }, 0) }
				// handle keyboard...
				evt.key in that.keyboard 
					&& that.keyboard[evt.key].call(that, evt) })
		// update code block...
		outline.addEventListener('keyup', 
			function(evt){
				that.runPlugins('__keyup__', evt, that, evt.target) })

		// toggle view/code of nodes...
		outline.addEventListener('focusin', 
			function(evt){
				var elem = evt.target

				// ignore children container...
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

				// XXX do we need this???
				that.runPlugins('__focusin__', evt, that, elem) })
		outline.addEventListener('focusout', 
			function(evt){
				var elem = evt.target
				if(elem.classList.contains('code')){
					var block = elem.parentElement
					that.update(block, { text: elem.value }) 
					// give the browser a chance to update the DOM...
					// XXX revise...
					setTimeout(function(){
						that.runPlugins('__editedcode__', evt, that, elem) }, 0) } 

				that.runPlugins('__focusout__', evt, that, elem) })
		// update .code...
		var update_code_timeout
		outline.addEventListener('change', 
			function(evt){
				if(update_code_timeout){
					return }
				update_code_timeout = setTimeout(
					function(){
						update_code_timeout = undefined
						that.sync() 
						that.runPlugins('__change__', evt, that) }, 
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

		this.runPlugins('__setup__', this)
		
		return this },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
