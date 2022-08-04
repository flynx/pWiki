/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/



//---------------------------------------------------------------------
// XXX revise...
var Filter = 
module.Filter =
function(...args){
	var func = args.pop()
	args.length > 0
		&& Object.assign(func, args.pop())
	return func }


//---------------------------------------------------------------------

var WIKIWORD_PATTERN =
	RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g')

module.wikiWord = 
Filter(
	{quote: 'quote-wikiword'},
	function(source){
		// XXX
		return source })
module.quoteWikiWord = 
function(source){
	// XXX
	return source }



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
