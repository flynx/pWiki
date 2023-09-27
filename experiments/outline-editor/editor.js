/**********************************************************************
* 
*
*
**********************************************************************/



//---------------------------------------------------------------------

var Outline = {
	dom: undefined,

	focused: function(){},
	edited: function(){},

	focus: function(node=undefined){},
	edit: function(node=undefined){},

	// block serialization...
	__code2html__: function(code){
		return code },
	__html2code__: function(html){
		return html },


	keyboard: {
		// vertical navigation...
		ArrowUp: function(evt){
			var action = getFocused
			var edited = this.dom.querySelector('.editor textarea:focus')
			if(edited){
				if(!atLine(0)){
					return }
				action = getEditable }
			evt.preventDefault() 
			action(-1)?.focus() },
		ArrowDown: function(evt, offset=1){
			var action = getFocused
			var edited = this.dom.querySelector('.editor textarea:focus')
			if(edited){
				if(!atLine(-1)){
					return }
				//window.getSelection()
				action = getEditable }
			evt.preventDefault() 
			action(1)?.focus() },

		// horizontal navigation / collapse...
		// XXX if at start/end of element move to prev/next...
		ArrowLeft: function(evt){
			if(this.dom.querySelector('.editor textarea:focus')){
				// XXX if at end of element move to next...
				return }
			if(LEFT_COLLAPSE){
					toggleCollapse(true)
					getFocused('parent')?.focus()
			} else { 
				evt.shiftKey ?
					toggleCollapse(true)
					: getFocused('parent')?.focus() } },
		ArrowRight: function(evt){
			if(this.dom.querySelector('.editor textarea:focus')){
				// XXX if at end of element move to next...
				return }
			if(RIGHT_EXPAND){
				toggleCollapse(false) 
				var child = getFocused('child')
				child?.focus()
				if(!child){
					getFocused(1)?.focus() }
			} else {
				evt.shiftKey ?
					toggleCollapse(false)
					: getFocused('child')?.focus() } },

		// indent...
		Tab: function(evt){
			evt.preventDefault()
			var editable = getEditable()
			var node = indentNode(!evt.shiftKey)
			;(editable ?
				editable
				: node)?.focus() },

		// edit mode...
		O: function(evt){
			if(evt.target.nodeName != 'TEXTAREA'){
				evt.preventDefault()
				createBlock('before')?.querySelector('textarea')?.focus() } },
		o: function(evt){
			if(evt.target.nodeName != 'TEXTAREA'){
				evt.preventDefault()
				createBlock('after')?.querySelector('textarea')?.focus() } },
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
				createBlock('after')?.querySelector('textarea')?.focus()
				: getFocused()?.querySelector('textarea')?.focus() },
		Escape: function(evt){
			this.dom.querySelector('textarea:focus')?.parentElement?.focus() },
		Delete: function(evt){
			if(evt.target.isContentEditable){
				return }
			var next = getFocused(1)
			getFocused()?.remove() 
			next?.focus() },
	},

	setup: function(dom){
		var that = this
		this.dom = dom
		// update stuff already in DOM...
		for(var elem of [...dom.querySelectorAll('.editor textarea')]){
			elem.autoUpdateSize() } 

		// heboard handling...
		dom.addEventListener('keydown', 
			function(evt){
				evt.key in that.keyboard 
					&& that.keyboard[evt.key].call(that, evt) })

		// toggle view/code of nodes...
		dom.addEventListener('focusin', 
			function(evt){
				var node = evt.target
				if(node.nodeName == 'TEXTAREA' 
						&& node?.previousElementSibling?.nodeName == 'SPAN'){
					node.value = 
						that.__html2code__ ?
							that.__html2code__(node.previousElementSibling.innerHTML)
							: node.previousElementSibling.innerHTML 
					node.updateSize() } })
		dom.addEventListener('focusout', 
			function(evt){
				var node = evt.target
				if(node.nodeName == 'TEXTAREA' 
						&& node?.previousElementSibling?.nodeName == 'SPAN'){
					node.previousElementSibling.innerHTML = 
						that.__code2html__ ?
							that.__code2html__(node.value)
							: node.value } })



		return this },
}




//---------------------------------------------------------------------



var getFocused = function(offset=0, selector='[tabindex]'){
	var focused = document.querySelector(`.editor ${selector}:focus`)
		|| (selector != 'textarea' ? 
			getEditable()?.parentElement
			: null)
	if(offset == 0){
		return focused }

	if(offset == 'parent'){
		if(!focused){
			return document.querySelector(`.editor ${selector}`) }
		var elem = focused.parentElement
		return elem.classList.contains('editor') ?
			undefined
			: elem }

	if(offset == 'child'){
		if(!focused){
			return document.querySelector(`.editor ${selector}`) }
		return focused.querySelector('div') }

	if(offset == 'children'){
		if(!focused){
			return [] }
		return [...focused.children]
			.filter(function(elem){ 
				return elem.getAttribute('tabindex') }) }

	if(offset == 'siblings'){
		if(!focused){
			return [] }
		return [...focused.parentElement.children]
			.filter(function(elem){ 
				return elem.getAttribute('tabindex') }) }

	var focusable = [...document.querySelectorAll(`.editor ${selector}`)]
		.filter(function(e){
			return e.offsetParent != null })
	if(offset == 'all'){
		return focusable }

	// offset from focused...
	if(focused){
		var i = focusable.indexOf(focused) + offset
		i = i < 0 ?
			focusable.length + i
			: i % focusable.length
		return focusable[i]

	// nothing focused -> forst/last...
	} else {
		return focusable[offset > 0 ? 0 : focusable.length-1] } }

// XXX would also be nice to make the move only if at first/last line/char
// XXX would be nice to keep the cursor at roughly the same left offset...
var getEditable = function(offset){
	return getFocused(offset, 'textarea') }

var indentNode = function(indent=true){
	var cur = getFocused() 
	if(!cur){
		return }
	var siblings = getFocused('siblings')
	// deindent...
	if(!indent){
		var parent = cur.parentElement
		if(!parent.classList.contains('.editor')){
			var children = siblings.slice(siblings.indexOf(cur)+1)
			parent.after(cur)
			children.length > 0
				&& cur.append(...children) }
	// indent...
	} else {
		var parent = siblings[siblings.indexOf(cur) - 1]
		if(parent){
			parent.append(cur) } } 
	return cur }

var toggleCollapse = function(node, state='next'){
	if(node == 'all'){
		return getFocused('all')
			.map(function(node){
				return toggleCollapse(node, state) }) }
	// toggleCollapse(<state>)
	if(!(node instanceof HTMLElement) && node != null){
		state = node
		node = null }
	node ??= getFocused()
	if(!node 
			// only nodes with children can be collapsed...
			|| !node.querySelector('[tabindex]')){
		return }
	state = state == 'next' ?
		!node.getAttribute('collapsed')
		: state
	if(state){
		node.setAttribute('collapsed', '')
	} else {
		node.removeAttribute('collapsed')
		for(var elem of [...node.querySelectorAll('textarea')]){
			elem.updateSize()
			//updateTextareaSize(elem) 
		}
	}
	return node }

// XXX add reference node...
var createBlock = function(place=none){
	var block = document.createElement('div')
	block.setAttribute('tabindex', '0')
	block.append(
		document.createElement('span'),
		document.createElement('textarea')
			.autoUpdateSize())
	var cur = getFocused()
		|| getEditable()?.parentElement
	place && cur
		&& cur[place](block)
	return block }

var json = function(node){
	node ??= document.querySelector('.editor')
	return [...node.children]
		.map(function(elem){
			return elem.nodeName != 'DIV' ?
				[]
				: [{
					text: elem.querySelector('span').innerHTML,
					collapsed: elem.getAttribute('collapsed') != null,
					children: json(elem)
				}] })
		.flat() }
var markdown = function(node, indent=''){
	node ??= json(node)
	var text = ''
	for(var elem of node){
		text += 
			indent
			+'- '
			+ elem.text
				.replace(/\n/g, '\n  '+indent) 
			+'\n'
			+ markdown(elem.children || [], indent+'  ') }
	return text } 

// XXX do a caret api...

// XXX this works only on the current text node...
// XXX only for text areas...
var atLine = function(index){
	// XXX add support for range...
	var elem = getEditable()
	var text = elem.value
	var lines = text.split(/\n/g).length
	var offset = elem.selectionStart
	var line = text.slice(0, offset).split(/\n/g).length

	//console.log('---', line, 'of', lines, '---', offset, sel)

	// XXX STUB index handling...
	if(index == -1 && line == lines){
		return true
	} else if(index == 0 && line == 1){
		return true
	}
	return false
}

var LEFT_COLLAPSE = false
var RIGHT_EXPAND = true

// XXX add scrollIntoView(..) to nav...




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
