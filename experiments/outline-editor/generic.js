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


/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
