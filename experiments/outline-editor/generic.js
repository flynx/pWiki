/**********************************************************************
* 
*
*
**********************************************************************/

Element.prototype.visibleInViewport = function(partial=false){
  var { top, left, bottom, right } = this.getBoundingClientRect()
  var { innerHeight, innerWidth } = window
  return partial
    ? ((top > 0 
				&& top < innerHeight) 
			|| (bottom > 0 
				&& bottom < innerHeight))
		&& ((left > 0 
				&& left < innerWidth) 
			|| (right > 0 
				&& right < innerWidth))
    : (top >= 0 
		&& left >= 0 
		&& bottom <= innerHeight 
		&& right <= innerWidth) }


//---------------------------------------------------------------------

// XXX should these be here???
HTMLElement.encode = function(str){
	var span = document.createElement('span')
	// XXX
	return str
		.replace(/&/g, '&amp;') 
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;') }
	/*/
	span.innerText = str
	return span.innerHTML }
	//*/
// XXX this does not convert <br> back to \n...
HTMLElement.decode = function(str){
	var span = document.createElement('span')
	// XXX
	return str
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>') 
		.replace(/&amp;/g, '&') }
	/*/
	span.innerHTML = str
	return span.innerText }
	//*/



//---------------------------------------------------------------------

HTMLTextAreaElement.prototype.updateSize = function(){
	this.style.height = ''
	this.style.height = this.scrollHeight + 'px' 
	return this }
HTMLTextAreaElement.prototype.autoUpdateSize = function(){
	var that = this
	this.addEventListener('input', 
		function(evt){
			that.updateSize() }) 
	return this }


var cloneAsOffscreenSpan = function(elem){
	var style = getComputedStyle(elem)
	var s = {}
	for(var i=0; i < style.length; i++){
		var k = style[i]
		if(k.startsWith('font')
				|| k.startsWith('line')
				|| k.startsWith('white-space')){
			s[k] = style[k] } }
	var span = document.createElement('span')
	Object.assign(span.style, {
		...s,

		position: 'fixed',
		display: 'block',
		/* DEBUG...
		top: '0px',
		left: '0px',
		/*/
		top: '-100%',
		left: '-100%',
		//*/
		width: style.width,
		height: style.height,

		padding: style.padding,

		boxSizing: style.boxSizing,
		whiteSpace: style.whiteSpace,

		outline: 'solid 1px red',

		pointerEvents: 'none',
	})
	return span }

HTMLTextAreaElement.prototype.getTextGeometry = function(func){
	var offset = this.selectionStart
	var text = this.value

	// get the relevant styles...
	var style = getComputedStyle(this)
	var paddingV = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

	var carret = document.createElement('span')
	carret.innerText = '|' 
	carret.style.margin = '0px'
	carret.style.padding = '0px'

	var span = cloneAsOffscreenSpan(this)
	span.append(
		text.slice(0, offset),
		carret,
		// NOTE: wee need the rest of the text for the carret to be typeset
		// 		to the correct line...
		text.slice(offset))
	document.body.append(span)

	var res = {
		length: text.length,
		lines: Math.floor(
			(this.offsetHeight - paddingV) 
				/ carret.offsetHeight),
		line: Math.floor(carret.offsetTop / carret.offsetHeight),
		offset: offset,
		offsetLeft: carret.offsetLeft,
		offsetTop: carret.offsetTop,
	}

	if(typeof(func) == 'function'){
		res = func(res, span) }

	span.remove()

	return res }

HTMLTextAreaElement.prototype.getTextOffsetAt = function(x, y){
	var that = this
	var text = this.value

	// cleanup cached span...
	this.__getTextOffsetAt_timeout
		&& clearTimeout(this.__getTextOffsetAt_timeout)
	this.__getTextOffsetAt_timeout = setTimeout(function(){
		delete that.__getTextOffsetAt_timeout
		that.__getTextOffsetAt_clone.remove()
		delete that.__getTextOffsetAt_clone }, 50)

	// create/get clone span...
	if(this.__getTextOffsetAt_clone == null){
		var span = 
			this.__getTextOffsetAt_clone = 
				cloneAsOffscreenSpan(this)
		span.append(text)
		document.body.append(span)
	} else {
		var span = this.__getTextOffsetAt_clone }

	var r = document.createRange()
	var t = span.firstChild

	var clone = span.getBoundingClientRect()
	var target = this.getBoundingClientRect()

	var ox = x - target.x
	var oy = y - target.y

	var rect, prev
	var cursor_line
	var col
	for(var i=0; i <= t.length; i++){
		r.setStart(t, i)
		r.setEnd(t, i)
		prev = rect
		rect = r.getBoundingClientRect()

		// line change...
		if(prev && prev.y != rect.y){
			// went off the cursor line
			if(cursor_line 
					// cursor above block
					|| oy <= prev.y - clone.y){
				// end of prev line...
				return col 
					?? i - 1 } 
			// reset col
			col = undefined }

		// cursor line...
		cursor_line = 
			oy >= rect.y - clone.y
				&& oy <= rect.bottom - clone.y

		// cursor col -- set once per line...
		if(col == null 
				&& ox <= rect.x - clone.x){
			col = (!prev 
					|| Math.abs(rect.x - clone.x - x) <= Math.abs(prev.x - clone.x - x)) ?
				i
				: i - 1 
			if(cursor_line){
				return col } } }
	return col 
		?? i }

// calculate number of lines in text area (both wrapped and actual lines)
Object.defineProperty(HTMLTextAreaElement.prototype, 'heightLines', {
	enumerable: false,
	get: function(){
		var style = getComputedStyle(this)
		return Math.floor(
			(this.scrollHeight 
				- parseFloat(style.paddingTop)
				- parseFloat(style.paddingBottom)) 
			/ (parseFloat(style.lineHeight) 
				|| parseFloat(style.fontSize))) }, })
Object.defineProperty(HTMLTextAreaElement.prototype, 'lines', {
	enumerable: false,
	get: function(){
		return this.value
			.split(/\n/g)
			.length }, })
// XXX this does not account for wrapping...
Object.defineProperty(HTMLTextAreaElement.prototype, 'caretLine', {
	enumerable: false,
	get: function(){
		var offset = this.selectionStart
		return offset != null ?
			this.value
				.slice(0, offset)
				.split(/\n/g)
				.length
			: undefined }, })


Object.defineProperty(HTMLTextAreaElement.prototype, 'caretOffset', {
	enumerable: false,
	get: function(){
		var offset = this.selectionStart
		var r = document.createRange()
		r.setStart(this, offset)
		r.setEnd(this, offset)
		var rect = r.getBoundingClientRect()
		return {
			top: rect.top, 
			left: rect.left,
		} },
})




/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
