/**********************************************************************
* 
*
*
**********************************************************************/

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
