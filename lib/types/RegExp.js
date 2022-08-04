/**********************************************************************
* 
*
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')



/*********************************************************************/

var RegExpMixin =
module.RegExpMixin =
object.Mixin('RegExpMixin', 'soft', {
	// Quote a string and convert to RegExp to match self literally.
	quoteRegExp: function(str){
		return str
			.replace(/([\.\\\/\(\)\[\]\$\*\+\-\{\}\@\^\&\?\<\>])/g, '\\$1') }
})


var GROUP_PATERN =
//module.GROUP_PATERN = /(^\(|[^\\]\()/g
module.GROUP_PATERN = new RegExp([
	'^\\(',
	// non-escaped braces...
	'[^\\\\]\\(',
	// XXX ignore braces in ranges...
	// XXX '\\[.*(.*\\]',
].join('|'))

// Pattern group introspection...
var RegExpProtoMixin =
module.RegExpProtoMixin =
object.Mixin('RegExpProtoMixin', 'soft', {
	// Format:
	// 	[
	// 		{
	//			index: <index>,
	//			name: <name>,
	//			pattern: <string>,
	//			offset: <offset>,
	// 		},
	// 		...
	// 	]
	// XXX cache this...
	get groups(){
		this.toString()
			.matchAll(GROUP_PATERN)
	},
	get namedGroups(){
		return this.groups
			.reduce(function(res, e){
				e.name
					&& (res[name] = e)
				return res }, {}) },
	get groupCount(){
		return this.groups.length },
})


RegExpMixin(RegExp)
// XXX EXPEREMENTAL...
//RegExpProtoMixin(RegExp.prototype)


var quoteRegExp =
RegExp.quoteRegExp = 
	RegExp.quoteRegExp



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
