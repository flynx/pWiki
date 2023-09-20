/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var setupTextarea = 
module.setupTextarea = 
function(){
	var __resize = new Event('__resize')

	for(var elem of document.body.querySelectorAll('textarea.editor')){
		elem.addEventListener('input', function(evt){
			var elem = evt.target
			elem.dispatchEvent(__resize) })

		elem.addEventListener('__resize', function(evt){
			var elem = evt.target
			// XXX this messes up scroll...
			elem.style.height = ''
			elem.style.height = elem.scrollHeight + 'px' })

		elem.dispatchEvent(__resize) } }




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
