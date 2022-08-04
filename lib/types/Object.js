/**********************************************************************
* 
*
*
* XXX shoule we add these from object to Object?
* 		- .parent(..)
* 		- .parentProperty(..)
* 		- .parentCall(..)
* 		- .parentOf(..)
* 		- .childOf(..)
* 		- .related(..)
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

require('object-run')
var object = require('ig-object')



/*********************************************************************/

var ObjectMixin =
module.ObjectMixin =
object.Mixin('ObjectMixin', 'soft', {
	// stuff from object.js...
	deepKeys: object.deepKeys,

	match: object.match,
	matchPartial: object.matchPartial,

	/* XXX not yet sure about these...
	// XXX EXPERIMENTAL...
	parent : object.parent,
	parentProperty: object.parentProperty,
	parentCall: object.parentCall,

	parentOf: object.parentOf,
	childOf: object.childOf,
	related: object.related,
	//*/


	// Make a copy of an object...
	//
	// This will:
	// 	- create a new object linked to the same prototype chain as obj
	// 	- copy obj own state
	//
	// NOTE: this will copy prop values and not props...
	copy: function(obj, constructor){
		return Object.assign(
			constructor == null ?
				Object.create(obj.__proto__)
				: constructor(),
			obj) },

	// Make a full key set copy of an object...
	//
	// NOTE: this will copy prop values and not props...
	// NOTE: this will not deep-copy the values...
	flatCopy: function(obj, constructor){
		return Object.deepKeys(obj)
			.reduce(
				function(res, key){
					res[key] = obj[key] 
					return res },
				constructor == null ?
					//Object.create(obj.__proto__)
					{}
					: constructor()) },

	// XXX for some reason neumric keys do not respect order...
	// 		to reproduce:
	// 			Object.keys({a:0, x:1, 10:2, 0:3, z:4, ' 1 ':5})
	// 			// -> ["0", "10", "a", "x", "z", " 1 "]
	// 		...this is the same across Chrome and Firefox...
	sort: function(obj, keys){
		keys = (typeof(keys) == 'function'
				|| keys === undefined) ? 
			[...Object.keys(obj)].sort(keys)
			: keys
		new Set([...keys, ...Object.keys(obj)])
			.forEach(function(k){
				if(k in obj){
					var v = Object.getOwnPropertyDescriptor(obj, k)
					delete obj[k]
					Object.defineProperty(obj, k, v) } })
		return obj },
})


ObjectMixin(Object)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
