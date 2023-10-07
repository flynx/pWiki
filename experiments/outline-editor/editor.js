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

var Node = {
	dom: undefined,
	document: undefined,

	get: function(){},

	get root(){},
	get parent(){},
	get children(){},
	get next(){},
	get prev(){},

	focus: function(){},
	edit: function(){},

	indent: function(){ },
	deindent: function(){ },
	toggleCollapse: function(){ },

	remove: function(){},

	json: function(){},
	text: function(){},

	load: function(){},
}

var NodeGroup = {
	__proto__: Node,
}

// XXX should this be Page or root??
var Root = {
	__proto__: NodeGroup,
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX might be a good idea to do a view-action model...
var Outline = {
	dom: undefined,

	// config...
	//
	left_key_collapses: true,
	right_key_expands: true,


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

	focus: function(node='focused', offset){},
	edit: function(node='focused', offset){},

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
			next = this.get(elem, 'next') }
		elem?.remove()
		next?.focus()
		return this },

	// block serialization...
	// XXX these should be symetrical...
	__code2html__: function(code){
		var elem = {
			collapsed: false,
		}
		elem.text = code 
			// attributes...
			// XXX make this generic...
			.replace(/\n\s*collapsed::\s*(.*)\s*$/, 
				function(_, value){
					elem.collapsed = value.trim() == 'true'
					return '' })
			// markdown...
			// XXX STUB...
			.replace(/^#\s*(.*)\s*(\n|$)/, '<h1>$1</h1>')
			.replace(/^##\s*(.*)\s*(\n|$)/, '<h2>$1</h2>')
			.replace(/^###\s*(.*)\s*(\n|$)/, '<h3>$1</h3>')
			.replace(/^####\s*(.*)\s*(\n|$)/, '<h4>$1</h4>')
			.replace(/^#####\s*(.*)\s*(\n|$)/, '<h5>$1</h5>')
			.replace(/^######\s*(.*)\s*(\n|$)/, '<h6>$1</h6>')
			.replace(/\*(.*)\*/g, '<b>$1</b>')
			.replace(/~([^~]*)~/g, '<s>$1</s>')
			.replace(/_([^_]*)_/g, '<i>$1</i>') 
			.replace(/(\n|^)---*\h*(\n|$)/, '$1<hr>')
			.replace(/\n/g, '<br>\n')
		return elem },
	__html2code__: function(html){
		return html 
			// XXX STUB...
			.replace(/<hr>$/, '---')
			.replace(/<hr>/, '---\n')
			.replace(/^<h1>(.*)<\/h1>\s*(.*)$/g, '# $1\n$2')
			.replace(/^<h2>(.*)<\/h2>\s*(.*)$/g, '## $1\n$2')
			.replace(/^<h3>(.*)<\/h3>\s*(.*)$/g, '### $1\n$2')
			.replace(/^<h4>(.*)<\/h4>\s*(.*)$/g, '#### $1\n$2')
			.replace(/^<h5>(.*)<\/h5>\s*(.*)$/g, '##### $1\n$2')
			.replace(/^<h6>(.*)<\/h6>\s*(.*)$/g, '###### $1\n$2')
			.replace(/<b>(.*)<\/b>/g, '*$1*')
			.replace(/<s>(.*)<\/s>/g, '~$1~')
			.replace(/<i>(.*)<\/i>/g, '_$1_')
			.replace(/<br>\s*/g, '\n') },

	// serialization...
	json: function(node){
		var that = this
		node ??= this.outline
		return [...node.children]
			.map(function(elem){
				return elem.nodeName != 'DIV' ?
					[]
					: [{
						text: that.__html2code__ ?
							that.__html2code__(elem.querySelector('span').innerHTML)
							: elem.querySelector('span').innerHTML,
						collapsed: elem.getAttribute('collapsed') != null,
						children: that.json(elem)
					}] })
			.flat() },
	text: function(node, indent, level){
		// .text(<indent>, <level>)
		if(typeof(node) == 'string'){
			;[node, indent='  ', level=''] = [undefined, ...arguments] }
		node ??= this.json(node)
		indent ??= '  '
		level ??= ''
		var text = ''
		for(var elem of node){
			text += 
				level
				+'- '
				+ elem.text
					.replace(/\n/g, '\n'+ level +'  ') 
				+'\n'
				+ (elem.collapsed ?
					level+'  ' + 'collapsed:: true\n'
					: '')
				+ this.text(elem.children || [], indent, level+indent) }
		return text },

	parse: function(text){
		text = ('\n' + text)
			.split(/\n(\s*)- /g)
			.slice(1)
		var level = function(lst, prev_sep=undefined, parent=[]){
			while(lst.length > 0){
				sep = lst[0]
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
						text: block,
						collapsed,
						children: [],
					})
				// indent...
				} else {
					parent.at(-1).children = level(lst, sep) } }
			return parent }
		return level(text) },

	// XXX revise name...
	Block: function(data={}, place=null){
		if(typeof(data) != 'object'){
			place = data
			data = {} }
		var block = document.createElement('div')
		block.setAttribute('tabindex', '0')
		data.collapsed
			&& block.setAttribute('collapsed', '')
		var text
		var html
		block.append(
			text = document.createElement('textarea')
				.autoUpdateSize(),
			html = document.createElement('span'))
		if(data.text){
			text.value = data.text
			html.innerHTML = this.__code2html__ ?
				this.__code2html__(data.text)
				: data.text }
		var cur = this.get()
		place && cur
			&& cur[place](block)
		return block },
	// XXX use .__code2html__(..)
	load: function(data){
		data = typeof(data) == 'string' ?
			this.parse(data)
			: data
		// generate dom...
		// XXX
		return this },

	// XXX add scrollIntoView(..) to nav...
	keyboard: {
		// vertical navigation...
		// XXX wrapped line navigation is broken...
		ArrowUp: function(evt){
			var state = 'focused'
			var edited = this.get('edited')
			if(edited){
				if(!atLine(edited, 0)){
					return }
				/*/
				//*/
				state = 'edited' }
			evt.preventDefault() 
			this.get(state, -1)?.focus() },
		ArrowDown: function(evt, offset=1){
			var state = 'focused'
			var edited = this.get('edited')
			if(edited){
				if(!atLine(edited, -1)){
					return }
				state = 'edited' }
			evt.preventDefault() 
			this.get(state, 1)?.focus() },

		// horizontal navigation / collapse...
		ArrowLeft: function(evt){
			var edited = this.get('edited')
			if(edited){
				// move caret to prev element...
				if(edited.selectionStart == edited.selectionEnd
						&& edited.selectionStart == 0){
					evt.preventDefault()
					edited = this.get('edited', 'prev') 
					edited.focus() 
					edited.selectionStart = 
						edited.selectionEnd = edited.value.length + 1 }
				return }
			;((this.left_key_collapses 
						|| evt.shiftKey)
					&& this.get().getAttribute('collapsed') == null
					&& this.get('children').length > 0) ?
				this.toggleCollapse(true)
				: this.get('parent')?.focus() },
		ArrowRight: function(evt){
			var edited = this.get('edited')
			if(edited){
				// move caret to next element...
				if(edited.selectionStart == edited.selectionEnd
						&& edited.selectionStart == edited.value.length){
					evt.preventDefault()
					edited = this.get('edited', 'next') 
					edited.focus() 
					edited.selectionStart = 
						edited.selectionEnd = 0 }
				return }
			if(this.right_key_expands){
				this.toggleCollapse(false) 
				var child = this.get('children')[0]
				child?.focus()
				if(!child){
					this.get('next')?.focus() }
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
				this.Block('before')?.querySelector('textarea')?.focus() } },
		o: function(evt){
			if(evt.target.nodeName != 'TEXTAREA'){
				evt.preventDefault()
				this.Block('after')?.querySelector('textarea')?.focus() } },
		Enter: function(evt){
			/*if(evt.target.isContentEditable){
				// XXX create new node...
				return }
			//*/
			if(evt.ctrlKey
					|| evt.shiftKey){
				return }
			evt.preventDefault()
			evt.target.nodeName == 'TEXTAREA' ?
				this.Block('after')?.querySelector('textarea')?.focus()
				: this.get()?.querySelector('textarea')?.focus() },
		Escape: function(evt){
			this.outline.querySelector('textarea:focus')?.parentElement?.focus() },
		Delete: function(evt){
			if(evt.target.isContentEditable){
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

	setup: function(dom){
		var that = this
		this.dom = dom

		// outline...
		var outline = this.outline
		// update stuff already in DOM...
		for(var elem of [...outline.querySelectorAll('textarea')]){
			elem.autoUpdateSize() } 
		// heboard handling...
		outline.addEventListener('keydown', 
			function(evt){
				evt.key in that.keyboard 
					&& that.keyboard[evt.key].call(that, evt) })
		// toggle view/code of nodes...
		outline.addEventListener('focusin', 
			function(evt){
				var node = evt.target
				// handle focus...
				for(var e of [...that.dom.querySelectorAll('.focused')]){
					e.classList.remove('focused') }
				that.get('focused')?.classList?.add('focused')
				// textarea...
				if(node.nodeName == 'TEXTAREA' 
						&& node?.nextElementSibling?.nodeName == 'SPAN'){
					node.value = 
						that.__html2code__ ?
							that.__html2code__(node.nextElementSibling.innerHTML)
							: node.nextElementSibling.innerHTML 
					node.updateSize() } })
		outline.addEventListener('focusout', 
			function(evt){
				var node = evt.target
				if(node.nodeName == 'TEXTAREA' 
						&& node?.nextElementSibling?.nodeName == 'SPAN'){
					if(that.__code2html__){
						var data = that.__code2html__(node.value)
						node.nextElementSibling.innerHTML = data.text
						data.collapsed 
							&& node.parentElement.setAttribute('collapsed', '')
					} else {
						node.nextElementSibling.innerHTML = node.value } } })

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
					: editor.get().focus()
				focus_textarea = undefined } 
			// cache the focused node type before focus changes...
			toolbar.addEventListener('mousedown', cahceNodeType)
			// refocus the node after we are done...
			toolbar.addEventListener('click', refocusNode) }

		return this },
}



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
