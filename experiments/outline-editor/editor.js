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


	// XXX revise name...
	Block: function(place=none){
		var block = document.createElement('div')
		block.setAttribute('tabindex', '0')
		block.append(
			document.createElement('span'),
			document.createElement('textarea')
				.autoUpdateSize())
		var cur = this.get()
		place && cur
			&& cur[place](block)
		return block },

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
	__code2html__: function(code){
		return code 
			// XXX STUB...
			.replace(/\*(.*)\*/g, '<b>$1</b>')
			.replace(/~([^~]*)~/g, '<s>$1</s>')
			.replace(/_([^_]*)_/g, '<i>$1</i>') },
	__html2code__: function(html){
		return html 
			// XXX STUB...
			.replace(/<b>(.*)<\/b>/g, '*$1*')
			.replace(/<s>(.*)<\/s>/g, '~$1~')
			.replace(/<i>(.*)<\/i>/g, '_$1_') },

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
				+ this.text(elem.children || [], indent, level+indent) }
		return text },

	// XXX use .__code2html__(..)
	load: function(data){
		// text...
		if(typeof(data) == 'string'){
			// XXX
		} 
		// json...
		// XXX
	},

	// XXX add scrollIntoView(..) to nav...
	keyboard: {
		// vertical navigation...
		ArrowUp: function(evt){
			var state = 'focused'
			var edited = this.get('edited')
			if(edited){
				if(!atLine(edited, 0)){
					return }
				state = 'edited' }
			evt.preventDefault() 
			this.get(state, -1)?.focus() },
		ArrowDown: function(evt, offset=1){
			var state = 'focused'
			var edited = this.get('edited')
			if(edited){
				if(!atLine(edited, -1)){
					return }
				//window.getSelection()
				state = 'edited' }
			evt.preventDefault() 
			this.get(state, 1)?.focus() },

		// horizontal navigation / collapse...
		// XXX if at start/end of element move to prev/next...
		ArrowLeft: function(evt){
			if(this.outline.querySelector('textarea:focus')){
				// XXX if at end of element move to next...
				return }
			;((this.left_key_collapses 
						|| evt.shiftKey)
					&& this.get().getAttribute('collapsed') == null
					&& this.get('children').length > 0) ?
				this.toggleCollapse(true)
				: this.get('parent')?.focus() },
		ArrowRight: function(evt){
			if(this.outline.querySelector('textarea:focus')){
				// XXX if at end of element move to next...
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
						&& node?.previousElementSibling?.nodeName == 'SPAN'){
					node.value = 
						that.__html2code__ ?
							that.__html2code__(node.previousElementSibling.innerHTML)
							: node.previousElementSibling.innerHTML 
					node.updateSize() } })
		outline.addEventListener('focusout', 
			function(evt){
				var node = evt.target
				if(node.nodeName == 'TEXTAREA' 
						&& node?.previousElementSibling?.nodeName == 'SPAN'){
					node.previousElementSibling.innerHTML = 
						that.__code2html__ ?
							that.__code2html__(node.value)
							: node.value } })

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
