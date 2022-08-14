/**********************************************************************
* 
*
*
* XXX move .zip(..) here from diff.js
* XXX do we need .at(..) / .to(..) methods here and in Map/Set/...???
*
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')
var stoppable = require('ig-stoppable')

var generator = require('./generator')



/*********************************************************************/

// NOTE: this is used in a similar fashion to Python's StopIteration...
var STOP =
module.STOP =
	stoppable.STOP


//---------------------------------------------------------------------
// Mixins...

// Wrap .map(..) / .filter(..) / .reduce(..) / .. to support STOP...
// 
// NOTE: internally these are implemented as for-of loops (./generator.js)
var stoppableList = function(iter){
	return function(func){
		return [...this.iter()[iter](...arguments)] } }
var stoppableValue = function(iter, no_return=false){
	return function(func){
		var res = this.iter()[iter](...arguments) 
		return no_return ?
			undefined
			: res } }


// Equivalent to .map(..) / .filter(..) / .reduce(..) that process the 
// contents in chunks asynchronously...
//
//	.mapChunks(func)
//	.mapChunks(chunk_size, func)
//	.mapChunks([item_handler, chunk_handler])
//	.mapChunks(chunk_size, [item_handler, chunk_handler])
//		-> promise(list)
//	
//	.filterChunks(func)
//	.filterChunks(chunk_size, func)
//	.filterChunks([item_handler, chunk_handler])
//	.filterChunks(chunk_size, [item_handler, chunk_handler])
//		-> promise(list)
//	
//	.reduceChunks(func, res)
//	.reduceChunks(chunk_size, func, res)
//	.reduceChunks([item_handler, chunk_handler], res)
//	.reduceChunks(chunk_size, [item_handler, chunk_handler], res)
//		-> promise(res)
//
//
//	chunk_handler(chunk, result, offset)
//
//
// chunk_size can be:
// 	20			- chunk size
// 	'20'		- chunk size
// 	'20C'		- number of chunks
//
//
// STOP can be thrown in func or chunk_handler at any time to 
// abort iteration, this will resolve the promise.
//	
//
// The main goal of this is to not block the runtime while processing a 
// very long array by interrupting the processing with a timeout...
//
// XXX should these return a partial result on STOP?
// XXX add generators:
// 			.map(..) / .filter(..) / .reduce(..)
// 		...the basis here should be the chunks, i.e. each cycle should
// 		go through a chunk...
//		...the mixin can be generic, i.e. applicable to Array, and 
//		other stuff...
// XXX add time-based chunk iteration...
var makeChunkIter = function(iter, wrapper){
	wrapper = wrapper
		|| function(res, func, array, e){
			return func.call(this, e[1], e[0], array) }
	return function(size, func, ...rest){
		var that = this
		var args = [...arguments]
		size = (args[0] instanceof Function 
				|| args[0] instanceof Array) ? 
			(this.CHUNK_SIZE || 50)
			: args.shift()
		size = typeof(size) == typeof('str') ?
				// number of chunks...
				(size.trim().endsWith('c') || size.trim().endsWith('C') ?
				 	Math.round(this.length / (parseInt(size) || 1)) || 1
				: parseInt(size))
			: size
		var postChunk
		func = args.shift()
		;[func, postChunk] = func instanceof Array ? func : [func]
		rest = args

		// special case...
		// no need to setTimeout(..) if smaller than size...
		if(this.length <= size){
			try {
				// handle iteration...
				var res = this[iter](func, ...rest)
				// handle chunk...
				postChunk
					&& postChunk.call(this, this, res, 0) 
				return Promise.all(res) 
			// handle STOP...
			} catch(err){
				if(err === STOP){
					return Promise.resolve() 
				} else if( err instanceof STOP){
					return Promise.resolve(err.value) }
				throw err } }

		var res = []
		var _wrapper = wrapper.bind(this, res, func, this)

		return new Promise(function(resolve, reject){
				var next = function(chunks){
					setTimeout(function(){
						var chunk, val
						try {
							// handle iteration...
							res.push(
								val = (chunk = chunks.shift())
									[iter](_wrapper, ...rest))
							// handle chunk...
							postChunk
								&& postChunk.call(that, 
									chunk.map(function([i, v]){ return v }), 
									val,
									chunk[0][0])
						// handle STOP...
						} catch(err){
							if(err === STOP){
								return resolve() 
							} else if( err instanceof STOP){
								return resolve(err.value) }
							throw err }

						// stop condition...
						chunks.length == 0 ?
							resolve(res.flat(2))
							: next(chunks) }, 0) }
				next(that
					// split the array into chunks...
					.reduce(function(res, e, i){
						var c = res.slice(-1)[0]
						c.length >= size ?
							// initial element in chunk...
							res.push([[i, e]])
							// rest...
							: c.push([i, e])
						return res }, [[]])) }) } }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var ArrayMixin =
module.ArrayMixin =
object.Mixin('ArrayMixin', 'soft', {
	STOP: object.STOP,

	// 	zip(array, array, ...)
	// 		-> [[item, item, ...], ...]
	//
	// 	zip(func, array, array, ...)
	// 		-> [func(i, [item, item, ...]), ...]
	//
	zip: function(func, ...arrays){
		var i = arrays[0] instanceof Array ? 
			0 
			: arrays.shift()
		if(func instanceof Array){
			arrays.splice(0, 0, func)
			func = null }
		// build the zip item...
		// NOTE: this is done this way to preserve array sparseness...
		var s = arrays
			.reduce(
				function(res, a, j){
					//a.length > i
					i in a
						&& (res[j] = a[i])
					return res }, 
				new Array(arrays.length))
		return arrays
				// check that at least one array is longer than i...
				.reduce(function(res, a){ 
					return Math.max(res, i, a.length) }, 0) > i ?
			// collect zip item...
			[func ? func(i, s) : s]
				// get next...
				.concat(this.zip(func, i+1, ...arrays))
			// done...
			: [] },

	// XXX not sure about the handler API here yet... 
	iter: function*(lst=[], handler=undefined){
		yield* lst.iter(
			...(handler ? 
				[handler] 
				: [])) },
})


var ArrayProtoMixin =
module.ArrayProtoMixin =
object.Mixin('ArrayProtoMixin', 'soft', {

	// A faster version of .indexOf(..)
	//
	// NOTE: this is not faster when looking for an item not in this,
	// 		for some reason the native .includes(..) and .indexOf(..)
	// 		search for non existant elements about an order of magnirude 
	// 		faster than if it existed...
	// 		...the funny thing is that at least on Crome .lastIndexOf(..)
	// 		is about as fast as this for an item in about the same relative 
	// 		location...
	// NOTE: this will get depricated as soon as JS redoes its .indexOf(..)
	index: function(value){
		for(var i = 0; i < this.length && this[i] !== value; i++){}
		return i == this.length ? -1 : i },


	// first/last element access short-hands...
	//
	//	.first()
	//	.last()
	//		-> elem
	//
	//	.first(value)
	//	.last(value)
	//		-> array
	//
	// NOTE: setting a value will overwrite an existing first/last value.
	// NOTE: for an empty array both .first(..)/.last(..) will return undefined 
	// 		when getting a value and set the 0'th value when setting...
	// NOTE: decided to keep these as methods and not props because methods
	// 		have one advantage: they can be chained
	// 		...while you can't chain assignment unless you wrap it in .run(..)
	first: function(value){
		return arguments.length > 0 ?
			((this[0] = value), this)
			: this[0]},
	last: function(value){
		return arguments.length > 0 ?
			((this[Math.max(this.length - 1, 0)] = value), this)
			: this[this.length - 1]},

	// Roll left/right (in-place)...
	//
	// NOTE: to .rol(..) left just pass a negative n value...
	// NOTE: we can't use ...[..] for sparse arrays as the will expand undefined
	// 		inplace of empty positions, this is thereason the .splice(..) 
	// 		implementation was replaced by a less clear (but faster)
	// 		.copyWithin(..) version...
	rol: function(n=1){
		var l = this.length
		n = (n >= 0 ? 
				n 
				: l - n)
			% l
		if(n != 0){
			this.length += n
			this.copyWithin(l, 0, n)
			this.splice(0, n) }
		return this },

	// Compact a sparse array...
	//
	// NOTE: this will not compact in-place.
	compact: function(){
		return this
			.filter(function(){ return true }) },

	// Remove sprse slots form start/end/both ends of array...
	//
	trim: function(){
		var l = this.length
		var i = 0
		while(!(i in this) && i < l){ i++ }
		var j = 0
		while(!(l-j-1 in this) && j < l){ j++ }
		return this.slice(i, j == 0 ? l : -j) },
	trimStart: function(){
		var l = this.length
		var i = 0
		while(!(i in this) && i < l){ i++ }
		return this.slice(i) },
	trimEnd: function(){
		var l = this.length
		var j = 0
		while(!(l-j-1 in this) && j < l){ j++ }
		return this.slice(0, j == 0 ? l : -j) },

	// like .length but for sparse arrays will return the element count...
	get len(){
		// NOTE: if we don't do .slice() here this can count array 
		// 		instance attributes...
		// NOTE: .slice() has an added menifit here of removing any 
		// 		attributes from the count...
		return Object.keys(this.slice()).length },

	// Return a new array with duplicate elements removed...
	//
	// NOTE: order is preserved... 
	unique: function(normalize){
		return normalize ? 
			[...new Map(this
					.map(function(e){ 
						return [normalize(e), e] }))
				.values()]
			// NOTE: we are calling .compact() here to avoid creating 
			// 		undefined items from empty slots in sparse arrays...
			: [...new Set(this.compact())] },
	tailUnique: function(normalize){
		return this
			.slice()
			.reverse()
			.unique(normalize)
			.reverse() },

	// Compare two arrays...
	//
	// NOTE: this is diffectent from Object.match(..) in that this compares 
	// 		self to other (internal) while match compares two entities 
	// 		externally.
	// 		XXX not sure if we need the destinction in name, will have to 
	// 			come back to this when refactoring diff.js -- all three 
	// 			have to be similar...
	cmp: function(other){
		if(this === other){
			return true }
		if(this.length != other.length){
			return false }
		for(var i=0; i<this.length; i++){
			if(this[i] != other[i]){
				return false } }
		return true },

	// Compare two Arrays as sets...
	//
	// NOTE: this will ignore order and repeating elments...
	setCmp: function(other){
		return this === other 
			|| (new Set([...this, ...other])).length 
				== (new Set(this)).length },

	// Sort as the other array...
	//
	// 	Sort as array placing the sorted items at head...
	// 	.sortAs(array)
	// 	.sortAs(array, 'head')
	// 		-> sorted
	//
	// 	Sort as array placing the sorted items at tail...
	// 	.sortAs(array, 'tail')
	// 		-> sorted
	//
	// This will sort the intersecting items in the head keeping the rest 
	// of the items in the same relative order...
	//
	// NOTE: if an item is in the array multiple times only the first 
	// 		index is used...
	//
	// XXX should this extend/patch .sort(..)???
	// 		...currently do not see a clean way to do this without 
	// 		extending and replacing Array or directly re-wrapping 
	// 		.sort(..)...
	sortAs: function(other, place='head'){
		place = place == 'tail' ? -1 : 1 
		// NOTE: the memory overhead here is better than the time overhead 
		// 		when using .indexOf(..)...
		other = other.toMap()
		var orig = this.toMap()
		return this.sort(function(a, b){
			var i = other.get(a)
			var j = other.get(b)
			return i == null && j == null ?
					orig.get(a) - orig.get(b)
				: i == null ? 
					place
				: j == null ? 
					-place
				: i - j }) },

	/*/ XXX EXPERIMENTAL...
	//		...if this is successful then merge this with .sortAs(..)
	sort: function(cmp){
		return (arguments.length == 0 || typeof(cmp) == 'function') ?
			object.parentCall(ArrayProtoMixin.data.sort, this, ...arguments)
			: this.sortAs(...arguments) },
	//*/

	// Same as .sortAs(..) but will not change indexes of items not in other...
	//
	// Example:
	// 		['a', 3, 'b', 1, 2, 'c']
	// 			.inplaceSortAs([1, 2, 3, 3]) // -> ['a', 1, 'b', 2, 3, 'c']
	//
	inplaceSortAs: function(other){
		// sort only the intersection...
		var sorted = this
			.filter(function(e){ 
				return other.includes(e) })
			.sortAs(other)
		// "zip" the sorted items back into this...
		this.forEach(function(e, i, l){
			other.includes(e) 
				&& (l[i] = sorted.shift()) })
		return this },

	// Convert an array to object...
	//
	// Format:
	// 	{
	// 		<item>: <index>,
	// 		...
	// 	}
	//
	// NOTE: items should be strings, other types will get converted to 
	// 		strings and thus may mess things up.
	// NOTE: this will forget repeating items...
	// NOTE: normalize will slow things down...
	toKeys: function(normalize){
		return normalize ? 
			this.reduce(function(r, e, i){
				r[normalize(e, i)] = i
				return r }, {})
			: this.reduce(function(r, e, i){
				r[e] = i
				return r }, {}) },

	// Convert an array to a map...
	//
	// This is similar to Array.prototype.toKeys(..) but does not 
	// restrict value type to string.
	//
	// Format:
	// 	Map([
	// 		[<item>, <index>],
	// 		...
	// 	])
	//
	// NOTE: this will forget repeating items...
	// NOTE: normalize will slow things down...
	toMap: function(normalize){
		return normalize ? 
			this
				.reduce(function(m, e, i){
					m.set(normalize(e, i), i)
					return m }, new Map())
			: this
				.reduce(function(m, e, i){
					m.set(e, i)
					return m }, new Map()) },

	// XXX would be nice for this to use the instance .zip(..) in recursion...
	// 		...this might be done by reversign the current implementation, i.e.
	// 		for instance .zip(..) to be the main implementation and for 
	// 		Array.zip(..) to be a proxy to that...
	zip: function(func, ...arrays){
		return func instanceof Array ?
			this.constructor.zip(this, func, ...arrays)
			: this.constructor.zip(func, this, ...arrays) },

	// Insert new values between elements of an array
	//
	//	.between(value)
	//		-> array
	//
	//	.between(func)
	//		-> array
	//
	//	func([a, b], from_index, to_index, array)
	//		-> elem
	//
	between: function(func){
		var res = []
		// NOTE: we skip the last element...
		for(var i=0; i < this.length; i+=1){
			var pair = new Array(2)
			i in this ?
				res.push(pair[0] = this[i])
				: (res.length += 1)
			if(i+1 >= this.length){
				break }
			i+1 in this
				&& (pair[1] = this[i+1])
			res.push(
				typeof(func) == 'function' ?
					func.call(this, pair, i, res.length, this)
					: func) }
		return res },

	// get iterator over array...
	//
	//	Array.iter()
	//	Array.iter([ .. ])
	//		-> iterator
	//
	//	array.iter()
	//		-> iterator
	//
	// XXX should this take an argument and be like map??
	// XXX this should handle throwing STOP!!!
	// 		...might also ne a good idea to isolate the STOP mechanics 
	// 		into a spearate module/package...
	iter: stoppable(function*(handler=undefined){
		if(handler){
			var i = 0
			for(var e of this){
				var res = handler.call(this, e, i++) 
				// treat non-iterables as single elements...
				if(typeof(res) == 'object' 
						&& Symbol.iterator in res){
					yield* res
				} else {
					yield res } } 
		} else {
			yield* this }}),


	// Stoppable iteration...
	//
	// NOTE: internally these are generators...
	smap: stoppableList('map'),
	sfilter: stoppableList('filter'),
	sreduce: stoppableValue('reduce'),
	sreduceRight: stoppableValue('reduceRight'),
	sforEach: stoppableValue('map', true),

	// Chunk iteration...
	//
	CHUNK_SIZE: 50,
	mapChunks: makeChunkIter('map'),
	filterChunks: makeChunkIter('map', 
		function(res, func, array, e){
			return !!func.call(this, e[1], e[0], array) ? [e[1]] : [] }),
	reduceChunks: makeChunkIter('reduce',
		function(total, func, array, res, e){
			return func.call(this, 
				total.length > 0 ? 
					total.pop() 
					: res, 
				e[1], e[0], array) }),
})


ArrayMixin(Array)
ArrayProtoMixin(Array.prototype)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
