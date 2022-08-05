/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var base = require('./base')
var showdown = require('showdown')


//---------------------------------------------------------------------

module.markdown = 
base.Filter(
	{quote: 'quote-markdown'},
	function(source){
		var converter = new showdown.Converter({
			strikethrough: true,
			tables: true,
			tasklists: true,
		})
		return converter.makeHtml(source) })

module.quoteMarkdown = 
function(source){
	// XXX
	return source }




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
