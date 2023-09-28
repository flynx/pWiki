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

Object.defineProperty(HTMLTextAreaElement.prototype, 'caretLine', {
	enumerable: false,
	get: function(){
		var offset = this.selectionStart
		return offset != null ?
			this.value
				.slice(0, offset)
				.split(/\n/g)
				.length
			: undefined },
})



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
