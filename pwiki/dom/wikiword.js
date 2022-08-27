/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var WIKIWORD_PATTERN =
	RegExp('('+[
		// /some/path | ./some/path | ../some/path | >>/some/path
		'(?<=^|\\s)(|\\.|\\.\\.|>>)[\\/\\\\][^\\s]+',
		// [path]
		'\\\\?\\[[^\\]]+\\]',
		// WikiWord
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
	].join('|') +')', 'g')

// XXX RENAME...
// XXX REVISE...
var setWikiWords = 
module.setWikiWords =
function(text, show_brackets=true, skip){
	skip = skip ?? []
	skip = skip instanceof Array ? 
		skip 
		: [skip]
	return text 
		// set new...
		.replace(
			WIKIWORD_PATTERN,
			function(l){
				// check if WikiWord is escaped...
				if(l[0] == '\\'){
					return l.slice(1) }

				var path = l[0] == '[' ? 
					l.slice(1, -1) 
					: l
				var i = [].slice.call(arguments).slice(-2)[0]

				// XXX HACK check if we are inside a tag...
				var rest = text.slice(i+1)
				if(rest.indexOf('>') < rest.indexOf('<')){
					return l }

				return skip.indexOf(l) < 0 ? 
					('<a '
						+'class="wikiword" '
						+'href="#'+ path +'" '
						+'bracketed="'+ (show_brackets && l[0] == '[' ? 'yes' : 'no') +'" '
						//+'onclick="event.preventDefault(); go($(this).attr(\'href\').slice(1))" '
						+'>'
							+ (!!show_brackets ? path : l) 
						+'</a>')
					: l })}


// XXX move this to a better spot....
var iterText =
module.iterText =
function*(root, skip_empty=true){
    for(var node of root.childNodes){
        if(node.nodeType == Node.TEXT_NODE 
               && (!skip_empty || node.nodeValue.trim().length != 0)){
            yield node
        } else {
            yield* iterText(node) } } }


// handle wikiwords...
//
// this will skip:
// 	a
// 	[wikiwords=no]
//
var wikiWordText =
module.wikiWordText =
function(elem){
	var tmp = document.createElement('div')
	iterText(elem)
		.forEach(function(text){
			// skip stuff...
			if(text.parentNode.nodeName.toLowerCase() == 'a'
					|| (text.parentNode.getAttribute('wikiwords') ?? '').toLowerCase() == 'no'){
				return }
			var t = text.nodeValue
			var n = setWikiWords(text.nodeValue)
			if(t != n){
				tmp.innerHTML = n
				text.replaceWith(...tmp.childNodes) } }) }




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
