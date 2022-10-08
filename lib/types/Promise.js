/**********************************************************************
*
* This defines the following extensions to Promise:
*
* 	Promise.iter(seq)
* 	<promise>.iter()
* 		Iterable promise object.
* 		Similar to Promise.all(..) but adds basic iterator API.
*
* 	Promise.interactive(handler)
* 		Interactive promise object.
* 		This adds a basic message passing API to the promise.
*
* 	Promise.cooperative()
* 		Cooperative promise object.
* 		Exposes the API to resolve/reject the promise object 
* 		externally.
*
* 	<promise>.as(obj)
* 		Promise proxy.
* 		Proxies the methods available from obj to promise value.
*
*
*
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')

//var generator = require('./generator')



//---------------------------------------------------------------------
// Iterable promise...
// 
// Like Promise.all(..) but adds ability to iterate through results
// via generators .map(..)/.reduce(..) and friends...
// 
// NOTE: the following can not be implemented here:
// 			.splice(..)				- can't both modify and return
// 									  a result...
// 			.pop() / .shift()		- can't modify the promise, use 
// 									  .first() / .last() instead.
// 			[Symbol.iterator]()		- needs to be sync and we can't
// 									  know the number of elements to
// 									  return promises before the whole
// 									  iterable promise is resolved.
// NOTE: we are not using async/await here as we need to control the 
// 		type of promise returned in cases where we know we are returning 
// 		an array...
// NOTE: there is no point in implementing a 1:1 version of this that 
// 		would not support element expansion/contraction as it would only 
// 		simplify a couple of methods that are 1:1 (like .map(..) and 
// 		.some(..)) while methods like .filter(..) will throw everything
// 		back to the complex IterablePromise...
// 		
// XXX how do we handle errors/rejections???
// 		...mostly the current state is OK, but need more testing...
// XXX add support for async generators...
// 		

var iterPromiseProxy = 
module.iterPromiseProxy = 
function(name){
	return function(...args){
		return this.constructor(
			this.then(function(lst){
				return lst[name](...args) })) } }
var promiseProxy =
module.promiseProxy =
function(name){
	return async function(...args){
		return (await this)[name](...args) } }

var IterablePromise =
module.IterablePromise =
object.Constructor('IterablePromise', Promise, {
	get STOP(){
		return Array.STOP },

}, {
	// packed array...
	//
	// Holds promise state.
	//
	// Format:
	// 	[
	//		<non-array-value>,
	//		[ <value> ],
	//		<promise>,
	//		...
	// 	]
	//
	// This format has several useful features:
	// 	- concatenating packed lists results in a packed list
	// 	- adding an iterable promise (as-is) into a packed list results 
	// 		in a packed list
	//
	// NOTE: in general iterable promises are implicitly immutable, so
	// 		it is not recomended to ever edit this in-place...
	// NOTE: we are not isolating or "protecting" any internals to 
	// 		enable users to responsibly extend the code.
	__packed: null,

	// low-level .__packed handlers/helpers...
	//
	// NOTE: these can be useful for debugging and extending...
	//
	// pack and oprionally transform/handle an array (sync)...
	//
	// NOTE: if 'types/Array' is imported this will support throwing STOP
	// 		from the handler.
	// 		Due to the async nature of promises though the way stops are 
	// 		handled may be unpredictable -- the handlers can be run out 
	// 		of order, as the nested promises resolve and thus throwing 
	// 		stop will stop the handlers not yet run and not the next 
	// 		handlers in sequence.
	// 		XXX EXPEREMENTAL: STOP...
	// XXX add support for async generators...
	// 		...an async generator is not "parallel", i.e. intil one 
	// 		returned promise is resolved the generator blocks (will not 
	// 		advance)...
	// 		...can we feed out a results one by one???
	__pack: function(list, handler=undefined){
		var that = this
		// handle iterable promise list...
		if(list instanceof IterablePromise){
			return this.__handle(list.__packed, handler) }
		// handle promise list...
		if(list instanceof Promise){
			return list.then(function(list){
				return that.__pack(list, handler) }) }
		// do the work...
		// NOTE: packing and handling are mixed here because it's faster
		// 		to do them both on a single list traverse...
		var handle = !!handler
		handler = handler 
			?? function(elem){ 
				return [elem] }

		//* XXX EXPEREMENTAL: STOP...
		var stoppable = false
		var stop = false
		var map = 'map'
		var pack = function(){
			return [list].flat()
				[map](function(elem){
					return elem && elem.then ?
							(stoppable ?
								// stoppable -- need to handle stop async...
								elem
									.then(function(res){
										return !stop ?
											handler(res)
											: [] }) 
									// NOTE: we are using .catch(..) here
									// 		instead of directly passing the
									// 		error handler to be able to catch
									// 		the STOP from the handler...
									.catch(handleSTOP)
								// non-stoppable...
								: elem.then(handler))
						: elem instanceof Array ?
							handler(elem)
						// NOTE: we keep things that do not need protecting 
						// 		from .flat() as-is...
						: !handle ?
							elem
						: handler(elem) }) }

		// pack (stoppable)...
		if(!!this.constructor.STOP){
			stoppable = true
			map = 'smap'
			var handleSTOP = function(err){
				stop = err
				if(err === that.constructor.STOP
						|| err instanceof that.constructor.STOP){
					return 'value' in err ?
						err.value
						: [] }
				throw err }
			try{
				return pack()
			}catch(err){
				return handleSTOP(err) } }

		// pack (non-stoppable)...
		return pack() },
		/*/
		return [list].flat()
			.map(function(elem){
				return elem && elem.then ?
						//that.__pack(elem, handler)
						elem.then(handler)
					: elem instanceof Array ?
						handler(elem)
					// NOTE: we keep things that do not need protecting 
					// 		from .flat() as-is...
					: !handle ?
						elem
					: handler(elem) }) },
		//*/
	// transform/handle packed array (sync)...
	__handle: function(list, handler=undefined){
		var that = this
		if(typeof(list) == 'function'){
			handler = list
			list = this.__packed }
		if(!handler){
			return list }
		// handle promise list...
		if(list instanceof Promise){
			return list.then(function(list){
				return that.__handle(list, handler) }) }
		// do the work...
		// NOTE: since each section of the packed .__array is the same 
		// 		structure as the input we'll use .__pack(..) to handle 
		// 		them, this also keeps all the handling code in one place.
		//* XXX EXPEREMENTAL: STOP...
		var map = !!this.constructor.STOP ?
			'smap'
			: 'map'
		return list[map](function(elem){
		/*/
		return list.map(function(elem){
		//*/
			return elem instanceof Array ?
					that.__pack(elem, handler)
				: elem instanceof Promise ?
					that.__pack(elem, handler)
						//.then(function(elem){
						.then(function([elem]){
							return elem })
				: [handler(elem)] })
   			.flat() },
	// unpack array (async)...
	__unpack: async function(list){
		list = list 
			?? this.__packed
		// handle promise list...
		return list instanceof Promise ?
			this.__unpack(await list)
			// do the work...
			: (await Promise.all(list))
				.flat() },

	[Symbol.asyncIterator]: async function*(){
		var list = this.__packed
		if(list instanceof Promise){
			yield this.__unpack(await list) 
			return }
		for await(var elem of list){
			yield* elem instanceof Array ?
				elem
				: [elem] } },

	// iterator methods...
	//
	// These will return a new IterablePromise instance...
	//
	// NOTE: these are different to Array's equivalents in that the handler
	// 		is called not in the order of the elements but rather in order 
	// 		of promise resolution...
	// NOTE: index of items is unknowable because items can expand and
	// 		contract depending on handlers (e.g. .filter(..) can remove 
	// 		items)...
	map: function(func){
		return this.constructor(this, 
			function(e){
				var res = func(e)
				return res instanceof Promise ?
		   			res.then(function(e){ 
						return [e] })
					: [res] }) },
	filter: function(func){
		return this.constructor(this, 
			function(e){
				var res = func(e)
				var _filter = function(elem){
					return res ?
						[elem]
						: [] }
				return res instanceof Promise ?
					res.then(_filter)
					: _filter(e) }) },
	// NOTE: this does not return an iterable promise as we can't know 
	// 		what the user reduces to...
	// NOTE: the items can be handled out of order because the nested 
	// 		promises can resolve in any order...
	// NOTE: since order of execution can not be guaranteed there is no
	// 		point in implementing .reduceRight(..) in the same way 
	// 		(see below)...
	reduce: function(func, res){
		return this.constructor(this, 
				function(e){
					res = func(res, e)
					return [] })
			.then(function(){ 
				return res }) },

	// XXX BETWEEN...
	between: function(func){
		var i = 0
		var j = 0
		var prev
		return this.constructor(this,
			function(e){
				return i++ > 0 ?
					[
						typeof(func) == 'function' ?
							func.call(this, [prev, e], i, i + j++)
							: func,
						e,
					]
					: [e] }) },

	// XXX .chain(..) -- see generator.chain(..)

	flat: function(depth=1){
		return this.constructor(this, 
			function(e){ 
				return (depth > 1 
							&& e != null 
							&& e.flat) ? 
						e.flat(depth-1) 
					: depth != 0 ?
						e
					: [e] }) },
	reverse: function(){
		var lst = this.__packed
		return this.constructor(
			lst instanceof Promise ?
				lst.then(function(elems){
					return elems instanceof Array ?
						elems.slice()
							.reverse()
						: elems })
			: lst
				.map(function(elems){
					return elems instanceof Array ?
							elems.slice()
								.reverse()
						: elems instanceof Promise ?
							elems.then(function(elems){
								return elems.reverse() })
						: elems })
				.reverse(),
			'raw') },

	// NOTE: the following methods can create an unresolved promise from 
	// 		a resolved promise...
	concat: function(other){
		var that = this
		var cur = this.__pack(this)
		var other = this.__pack(other)
		return this.constructor(
			// NOTE: we need to keep things as exposed as possible, this 
			// 		is why we're not blanketing all the cases with 
			// 		Promise.all(..)...
			(cur instanceof Promise 
					&& other instanceof Promise) ?
				[cur, other]
			: cur instanceof Promise ?
				[cur, ...other]
			: other instanceof Promise ?
				[...cur, other]
			: [...cur, ...other],
			'raw') },
	push: function(elem){
		return this.concat([elem]) },
	unshift: function(elem){
		return this.constructor([elem])
			.concat(this) },

	// proxy methods...
	//
	// These require the whole promise to resolve to trigger.
	//
	// An exception to this would be .at(0)/.first() and .at(-1)/.last()
	// that can get the target element if it's accessible.
	//
	// NOTE: methods that are guaranteed to return an array will return
	// 		an iterable promise (created with iterPromiseProxy(..))...
	//
	at: async function(i){
		var list = this.__packed
		return ((i != 0 && i != -1)
					|| list instanceof Promise
					// XXX not sure if this is correct...
					|| list.at(i) instanceof Promise) ?
				(await this).at(i)
			// NOTE: we can only reason about first/last explicit elements, 
			// 		anything else is non-deterministic...
			: list.at(i) instanceof Promise ?
				[await list.at(i)].flat().at(i)
			: list.at(i) instanceof Array ?
				list.at(i).at(i)
			: list.at(i) },
	first: function(){
		return this.at(0) },
	last: function(){
		return this.at(-1) },
	
	// NOTE: unlike .reduce(..) this needs the parent fully resolved 
	// 		to be able to iterate from the end.
	// XXX is it faster to do .reverse().reduce(..) ???
	reduceRight: promiseProxy('reduceRight'),

	// NOTE: there is no way we can do a sync generator returning 
	// 		promises for values because any promise in .__packed makes 
	// 		the value count/index non-deterministic...
	sort: iterPromiseProxy('sort'),
	slice: iterPromiseProxy('slice'),

	entries: iterPromiseProxy('entries'),
	keys: iterPromiseProxy('keys'),
	values: iterPromiseProxy('values'),

	indexOf: promiseProxy('indexOf'),
	lastIndexOf: promiseProxy('lastIndexOf'),
	includes: promiseProxy('includes'),

	//
	// 	.find(<func>)
	// 	.find(<func>, 'value')
	// 		-> <promise>(<value>)
	//
	// 	.find(<func>, 'result')
	// 		-> <promise>(<result>)
	//
	// 	.find(<func>, 'bool')
	// 		-> <promise>(<bool>)
	//
	// NOTE: this is slightly different to Array's .find(..) in that it 
	// 		accepts the result value enabling returning both the value 
	// 		itself ('value', default), the test function's result 
	// 		('result') or true/false ('bool') -- this is added to be 
	// 		able to distinguish between the undefined as a stored value 
	// 		and undefined as a "nothing found" result.
	// NOTE: I do not get how essentially identical methods .some(..) 
	// 		and .find(..) got added to JS's Array...
	// 		the only benefit is that .some(..) handles undefined values 
	// 		stored in the array better...
	// NOTE: this will return the result as soon as it's available but 
	// 		it will not stop the created but unresolved at the time 
	// 		promises from executing, this is both good and bad:
	// 		+ it will not break other clients waiting for promises 
	// 			to resolve...
	// 		- if no clients are available this can lead to wasted 
	// 			CPU time...
	find: async function(func, result='value'){
		var that = this
		// NOTE: not using pure await here as this is simpler to actually 
		// 		control the moment the resulting promise resolves without 
		// 		the need for juggling state...
		return new Promise(function(resolve, reject){
			var resolved = false
			that.map(function(elem){
					var res = func(elem)
					if(res){
						resolved = true
						resolve(
							result == 'bool' ?
								true
							: result == 'result' ?
								res
							: elem)
						// XXX EXPEREMENTAL: STOP...
						// NOTE: we do not need to throw STOP here 
						// 		but it can prevent some overhead...
						if(that.constructor.STOP){
							throw that.constructor.STOP } } })
				.then(function(){
					resolved
						|| resolve(
							result == 'bool' ?
								false
								: undefined) }) }) },
	findIndex: promiseProxy('findIndex'),

	// NOTE: this is just a special-case of .find(..)
	some: async function(func){
		return this.find(func, 'bool') },
	every: promiseProxy('every'),


	join: async function(){
		return [...(await this)]
			.join(...arguments) },


	// this is defined globally as Promise.prototype.iter(..)
	//
	// for details see: PromiseMixin(..) below...
	//iter: function(handler=undefined){ ... },


	// promise api...
	//
	// Overload .then(..), .catch(..) and .finally(..) to return a plain 
	// Promise instnace...
	//
	// NOTE: .catch(..) and .finally(..) are implemented through .then(..)
	// 		so we do not need to overload those...
	// NOTE: this is slightly different from .then(..) in that it can be 
	// 		called without arguments and return a promise wrapper. This can
	// 		be useful to hide special promise functionality...
	then: function (onfulfilled, onrejected){
		var p = new Promise(
			function(resolve, reject){
				Promise.prototype.then.call(this,
					// NOTE: resolve(..) / reject(..) return undefined so
					// 		we can't pass them directly here...
					function(res){ 
						resolve(res)
						return res },
					function(res){
						reject(res)
						return res }) }.bind(this))
		return arguments.length > 0 ?
			p.then(...arguments) 
			: p },


	// constructor...
	//
	//	Promise.iter([ .. ])
	//		-> iterable-promise
	//
	//	Promise.iter([ .. ], handler)
	//		-> iterable-promise
	//
	//
	// 	handler(e)
	// 		-> [value, ..]
	// 		-> []
	// 		-> <promise>
	//
	//
	// NOTE: element index is unknowable until the full list is expanded
	// 		as handler(..)'s return value can expand to any number of 
	// 		items...
	// 		XXX we can make the index a promise, then if the client needs
	// 			the value they can wait for it...
	// 			...this may be quite an overhead...
	//
	//
	// Special cases useful for extending this constructor...
	//
	//	Set raw .__packed without any pre-processing...
	//	Promise.iter([ .. ], 'raw')
	//		-> iterable-promise
	//
	//	Create a rejected iterator...
	//	Promise.iter(false)
	//		-> iterable-promise
	//
	//
	// NOTE: if 'types/Array' is imported this will support throwing STOP,
	// 		for more info see notes for .__pack(..)
	// 		XXX EXPEREMENTAL: STOP...
	__new__: function(_, list, handler){
		// instance...
		var promise
		var obj = Reflect.construct(
			IterablePromise.__proto__, 
			[function(resolve, reject){
				// NOTE: this is here for Promise compatibility...
				if(typeof(list) == 'function'){
					return list.call(this, ...arguments) } 
				// initial reject... 
				if(list === false){
					return reject() }
				promise = {resolve, reject} }], 
			IterablePromise)

		// populate new instance...
		if(promise){
			// handle/pack input data...
			if(handler != 'raw'){
				list = list instanceof IterablePromise ?
					this.__handle(list.__packed, handler)
					: this.__pack(list, handler) }
			Object.defineProperty(obj, '__packed', {
				value: list,
				enumerable: false,
			})
			// handle promise state...
			this.__unpack(list)
				.then(function(list){
					promise.resolve(list) })
				.catch(promise.reject) }

		return obj },
})



//---------------------------------------------------------------------
// Interactive promise...
// 
// Adds ability to send messages to the running promise.
// 

var InteractivePromise =
module.InteractivePromise =
object.Constructor('InteractivePromise', Promise, {
	// XXX do we need a way to remove handlers???
	__message_handlers: null,

	send: function(...args){
		var that = this
		;(this.__message_handlers || [])
			.forEach(function(h){ h.call(that, ...args) })
		return this },

	then: IterablePromise.prototype.then,

	//
	//	Promise.interactive(handler)
	//		-> interacive-promise
	//
	//	handler(resolve, reject, onmessage)
	//
	//	onmessage(func)
	//
	//
	__new__: function(_, handler){
		var handlers = []

		var onmessage = function(func){
			// remove all handlers...
			if(func === false){
				var h = (obj == null ?
					handlers
					: (obj.__message_handlers || []))
				h.splice(0, handlers.length)
			// remove a specific handler...
			} else if(arguments[1] === false){
				var h = (obj == null ?
					handlers
					: (obj.__message_handlers || []))
				h.splice(h.indexOf(func), 1)
			// register a handler...
			} else {
				var h = obj == null ?
					// NOTE: we need to get the handlers from 
					// 		.__message_handlers unless we are not 
					// 		fully defined yet, then use the bootstrap 
					// 		container (handlers)...
					// 		...since we can call onmessage(..) while 
					// 		the promise is still defined there is no 
					// 		way to .send(..) until it returns a promise 
					// 		object, this races here are highly unlikely...
					handlers
					: (obj.__message_handlers = 
						obj.__message_handlers ?? [])
				handlers.push(func) } }

		var obj = Reflect.construct(
			InteractivePromise.__proto__, 
			!handler ?
				[]
				: [function(resolve, reject){
					return handler(resolve, reject, onmessage) }], 
			InteractivePromise)
		Object.defineProperty(obj, '__message_handlers', {
			value: handlers,
			enumerable: false,
			// XXX should this be .configurable???
			configurable: true,
		})
   		return obj },
})



//---------------------------------------------------------------------
// Cooperative promise...
// 
// A promise that can be resolved/rejected externally.
//
// NOTE: normally this has no internal resolver logic...
// 

var CooperativePromise =
module.CooperativePromise =
object.Constructor('CooperativePromise', Promise, {
	__handlers: null,

	get isSet(){
		return this.__handlers === false },

	set: function(value, resolve=true){
		// can't set twice...
		if(this.isSet){
			throw new Error('.set(..): can not set twice') }
		// bind to promise...
		if(value && value.then && value.catch){
			value.then(handlers.resolve)
			value.catch(handlers.reject)
		// resolve with value...
		} else {
			resolve ?
				this.__handlers.resolve(value) 
				: this.__handlers.reject(value) }
		// cleanup and prevent setting twice...
		this.__handlers = false
		return this },

	then: IterablePromise.prototype.then,

	__new__: function(){
		var handlers
		var resolver = arguments[1]

		var obj = Reflect.construct(
			CooperativePromise.__proto__, 
			[function(resolve, reject){
				handlers = {resolve, reject} 
				// NOTE: this is here to support builtin .then(..)
				resolver
					&& resolver(resolve, reject) }], 
			CooperativePromise) 

		Object.defineProperty(obj, '__handlers', {
			value: handlers,
			enumerable: false,
			writable: true,
		})
		return obj },
})



//---------------------------------------------------------------------

// XXX EXPEREMENTAL...
var ProxyPromise =
module.ProxyPromise =
object.Constructor('ProxyPromise', Promise, {

	then: IterablePromise.prototype.then,

	__new__: function(context, other, nooverride=false){
		var proto = 'prototype' in other ?
			other.prototype
			: other
		var obj = Reflect.construct(
			ProxyPromise.__proto__, 
			[function(resolve, reject){
				context.then(resolve)
				context.catch(reject) }], 
			ProxyPromise) 
		// populate...
		// NOTE: we are not using object.deepKeys(..) here as we need 
		// 		the key origin not to trigger property getters...
		var seen = new Set()
		nooverride = nooverride instanceof Array ?
			new Set(nooverride)
			: nooverride
		while(proto != null){
			Object.entries(Object.getOwnPropertyDescriptors(proto))
				.forEach(function([key, value]){
					// skip overloaded keys...
					if(seen.has(key)){
						return }
					// skip non-functions...
					if(typeof(value.value) != 'function'){
						return }
					// skip non-enumerable except for Object.prototype.run(..)...
					if(!(key == 'run' 
								&& Object.prototype.run === value.value) 
							&& !value.enumerable){
						return }
					// do not override existing methods...
					if(nooverride === true ? 
								key in obj
							: nooverride instanceof Set ?
								nooverride.has(key)
							: nooverride){
						return }
					// proxy...
					obj[key] = promiseProxy(key) })
			proto = proto.__proto__ } 
		return obj },
})



//---------------------------------------------------------------------

var PromiseMixin =
module.PromiseMixin =
object.Mixin('PromiseMixin', 'soft', {
	iter: IterablePromise,
	interactive: InteractivePromise,
	cooperative: CooperativePromise,
})

PromiseMixin(Promise)


var PromiseProtoMixin =
module.PromiseProtoMixin =
object.Mixin('PromiseProtoMixin', 'soft', {
	as: ProxyPromise,
	iter: function(handler=undefined){
		return IterablePromise(this, handler) },
})

PromiseProtoMixin(Promise.prototype)




/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
