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
HTMLTextAreaElement.prototype.getTextGeometry = function(){
	var offset = this.selectionStart
	var text = this.value

	// get the relevant styles...
	var style = getComputedStyle(this)
	var paddingV = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
	var s = {}
	for(var i=0; i < style.length; i++){
		var k = style[i]
		if(k.startsWith('font')
				|| k.startsWith('line')
				|| k.startsWith('white-space')){
			s[k] = style[k] } }

	var carret = document.createElement('span')
	carret.innerText = '|' 
	carret.style.margin = '0px'
	carret.style.padding = '0px'

	var span = document.createElement('span')
	Object.assign(span.style, {
		...s,

		position: 'fixed',
		display: 'block',
		top: '-100%',
		left: '-100%',
		width: style.width,
		height: style.height,

		padding: style.padding,

		boxSizing: style.boxSizing,
		//whiteSpace: 'pre-wrap',

		outline: 'solid 1px red',

		pointerEvents: 'none',
	})
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

	span.remove()

	return res }

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
