/**********************************************************************
* 
*
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

require('./Map')

var object = require('ig-object')



/*********************************************************************/

var UniqueKeyMap = 
module.UniqueKeyMap = 
object.Constructor('UniqueKeyMap', Map, {

	// Format:
	// 	Map([
	// 		[ <elem>, Set([
	// 				<original-name>, 
	// 				...
	// 			]) ],
	// 		...
	// 	])
	//
	__keys_index: null,
	get __keys(){
		return (this.__keys_index = 
			this.__keys_index || new Map()) },

	// Format:
	// 	Map([
	// 		[<unique-key>, <orig-key>],
	// 		...
	// 	])
	//
	__reverse_index: null,
	get __reverse(){
		return (this.__reverse_index = 
			this.__reverse_index || new Map()) },


	// Pattern to be used to generate unique key...
	//
	__key_pattern__: '$KEY ($COUNT)',

	// If true then a value can not be stored under the same key more 
	// than once...
	//
	// Example:
	// 	var u = UniqueKeyMap()
	// 	u.set('x', 123)
	// 	// if .__unique_key_value__ is true this will have no effect, 
	// 	// otherwise 123 will be stored under 'x (1)'
	// 	u.set('x', 123)
	//
	__unique_key_value__: false,



	// helpers...
	//
	originalKey: function(key){
		return this.__reverse.get(key) },
	uniqieKey: function(key){
		var n = key
		var i = 0
		while(this.has(n)){
			i++
			n = this.__key_pattern__
				.replace(/\$KEY/, key)
				.replace(/\$COUNT/, i) }
		return n },
	keysOf: function(elem, mode='original'){
		// get unique keys...
		if(mode == 'unique'){
			return this
				.entries()
				.reduce(function(res, [k, e]){
					e === elem
						&& res.push(k)
					return res }, []) }
		// get keys used to set the values...
		return [...(this.__keys.get(elem) || [])] },

	// NOTE: this will never overwrite a key's value, to overwrite use .reset(..)
	set: function(key, elem, return_key=false){
		// index...
		var names
		this.__keys.set(elem, 
			names = this.__keys.get(elem) || new Set())
		// key/elem already exists...
		if(this.__unique_key_value__ 
				&& names.has(key)){
			return return_key ?
				key
				: this }
		names.add(key)
		// add the elem with the unique name...
		var n
		var res = object.parentCall(
			UniqueKeyMap.prototype, 
			'set', 
			this, 
			n = this.uniqieKey(key), 
			elem) 
		// reverse index...
		this.__reverse.set(n, key)
		return return_key ?
			n
			: res },
	// NOTE: this will never generate a new name...
	reset: function(key, elem){
		// rewrite...
		if(this.has(key)){
			// remove old elem/key from .__keys...
			var o = this.originalKey(key)
			var s = this.__keys.get(this.get(key))
			s.delete(o)
			s.size == 0
				&& this.__keys.delete(this.get(key))
			// add new elem/key to .__keys...
			var n
			this.__keys.set(elem, (n = this.__keys.get(elem) || new Set()))
			n.add(o)
			
			return object.parentCall(UniqueKeyMap.prototype, 'set', this, key, elem) 
		// add...
		} else {
			return this.set(key, elem) } },
	delete: function(key){
		var s = this.__keys.get(this.get(key))
		if(s){
			// XXX will this delete if key is with an index???
			//s.delete(key)
			s.delete(this.originalKey(key))
			this.__reverse.delete(key)
			s.size == 0
				&& this.__keys.delete(this.get(key)) }
		return object.parentCall(UniqueKeyMap.prototype, 'delete', this, key) },

	// NOTE: this maintains the item order. This is done by rewriting 
	// 		items in sequence, this may be slow and trigger lots of write 
	// 		observer callbacks. to avoid this use .unOrderedRename(..)
	// XXX do not see how can we avoid rewriting the map if we want to 
	// 		keep the order...
	orderedRename: function(from, to, return_key=false){
		var keys = [...this.keys()]
		// rename the element...
		var e = this.get(from)
		this.delete(from)
		var n = this.set(to, e, true) 
		// keep order...
		keys.splice(keys.indexOf(from), 1, n)
		this.sort(keys)
		return return_key ?
   			n
			: this },
	// NOTE: the renamed item is appended to the map...
	unorderedRename: function(from, to, return_key=false){
		var e = this.get(from)
		this.delete(from)
		return this.set(to, e, return_key) },

	__unorderd_rename__: false,
	rename: function(from, to, return_key=false){
		return this.__unorderd_writes__ ?
			this.unorderedRename(...arguments)
			: this.orderedRename(...arguments) },
})


//---------------------------------------------------------------------

// XXX should this be a map???
// XXX make two variants: ordered and unordered...
// 		...the ordered variant should have the same API as an array...
var ObjectWithAutoKeys = 
module.ObjectWithAutoKeys = 
object.Constructor('ObjectWithAutoKeys', {

	__last_key: null,
	__new_key__: function(value){
		return (this.__last_key = (this.__last_key || -1) + 1) },

	// 
	// 	.push(value)
	// 		-> key
	//
	// 	.push(value, ..)
	// 		-> [key, ..]
	//
	push: function(...values){
		var that = this
		var res = values
			.map(function(value){
				that[that.__new_key__(value)] = value })
		return values.length == 1 ?
   			res.pop()
			: res },
})



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
