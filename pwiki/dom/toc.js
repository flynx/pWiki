/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/




//---------------------------------------------------------------------

var makeToc = 
module.makeToc =
function(){
	return [...document.querySelectorAll('toc')]
		.map(function(toc){
			toc.innerHTML = ''
			var parent = toc.parentElement
			var base = pwiki.path
			;[...parent.querySelectorAll('[id]')]
				.filter(function(n){
					return /^h[0-9]$/i.test(n.nodeName) })
				.forEach(function(section){
					var e = document.createElement('a')
					e.classList.add(section.nodeName.toLowerCase())
					e.setAttribute('href', '#'+ base +'#'+ section.id)
					e.innerHTML = section.innerHTML
					toc.appendChild(e) }) 
			return toc }) }



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
