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
// XXX this does not seem to handle html well...

var WIKIWORD_PATTERN =
	RegExp('('+[
		//'\\\\?(\\/|\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\/?(\\./|\\.\\./|>>|[A-Z][_a-z0-9]+[A-Z/])[_a-zA-Z0-9/]*',
		'\\\\?\\[[^\\]]+\\]',
	].join('|') +')', 'g')

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

module.wikiWord = 
Filter(
	{quote: 'quote-wikiword'},
	function(source){
		return setWikiWords(source) })
module.quoteWikiWord = 
function(source){
	// XXX
	return source }



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
