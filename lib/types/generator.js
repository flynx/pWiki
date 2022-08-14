/**********************************************************************
* 
*
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')
var stoppable = require('ig-stoppable')



/*********************************************************************/

// NOTE: this is used in a similar fashion to Python's StopIteration...
var STOP =
module.STOP =
	stoppable.STOP


//---------------------------------------------------------------------
// The generator hierarchy in JS is a bit complicated.
//
// Consider the following:
//
// 		// this is the generator function (i.e. the constructor)
// 		var Iter = function*(lst){
// 			for(var e of lst){
// 				yield e }}
//
// 		// this is the generator instance (constructed instance)...
// 		var iter = Iter([1,2,3])
//
//
// In this module we need to add methods to be visible from either Iter
// or iter from the above example, so we need to access the prototypes 
// of each of them.
// So, below we will define:
//
// 	Generator.prototype 
// 		prototype of the generator constructors (i.e. Iter(..) from the 
// 		above example)
//
// 	Generator.prototype.prototype
// 		generator instance prototype (i.e. iter for the above code)
//
//
// Also the following applies:
//
//		iter instanceof Iter		// -> true
//
// 		Iter instanceof Generator
//
//
// NOTE: there appears to be no way to test if iter is instance of some 
// 		generic Generator...
//
//---------------------------------------------------------------------

var Generator = 
module.Generator =
	(function*(){}).constructor

var AsyncGenerator =
module.AsyncGenerator =
	(async function*(){}).constructor


// base iterator prototypes...
var ITERATOR_PROTOTYPES = [
	Array,
	Set,
	Map,
].map(function(e){ 
	return (new e()).values().__proto__ })



//---------------------------------------------------------------------
// generic generator wrapper...

// helper...
var __iter = 
module.__iter =
function*(lst=[]){
	if(typeof(lst) == 'object' 
			&& Symbol.iterator in lst){
		yield* lst 
	} else {
		yield lst } }

// XXX updatae Array.js' version for compatibility...
// XXX DOCS!!!
var iter = 
module.iter = 
Generator.iter =
	stoppable(function(lst=[]){
		// handler -> generator-constructor...
		if(typeof(lst) == 'function'){
			// we need to be callable...
			var that = this instanceof Function ?
				this
				// generic root generator...
				: module.__iter
			return function*(){
				yield* that(...arguments).iter(lst) } }
		// no handler -> generator instance...
		return module.__iter(lst) })

// NOTE: we need .iter(..) to both return generators if passed an iterable
// 		and genereator constructos if passed a function...
iter.__proto__ = Generator.prototype



//---------------------------------------------------------------------
// Generator.prototype "class" methods...
//
// the following are effectively the same:
// 	1) Wrapper
// 		var combined = function(...args){
// 			return someGenerator(...args)
// 				.filter(function(e){ ... })
// 				.map(function(e){ ... }) }
//
// 		combined( .. )
//
// 	2) Static generator methods...
// 		var combined = someGenerator
// 			.filter(function(e){ ... })
// 			.map(function(e){ ... })
//
// 		combined( .. )
//
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
// Helpers...

//
// 	makeGenerator(<name>)
// 	makeGenerator(<name>, <handler>)
// 		-> <func>
//
// 	makeGenerator('async', <name>)
// 	makeGenerator('async', <name>, <handler>)
// 		-> <func>
//
//
// 	<func>(...args)
// 		-> <Generator>
//
// 	<Generator>(...inputs)
// 		-> <generator>
//
// 	<handler>(args, ...inputs)
// 		-> args
//
//
// XXX this needs to be of the correct type... (???)
// XXX need to accept generators as handlers...
var makeGenerator = function(name, pre){
	var sync = true
	if(name == 'async'){
		sync = false
		var [name, pre] = [...arguments].slice(1) }
	return function(...args){
		var that = this
		return Object.assign(
			// NOTE: the two branches here are identical, the only 
			// 		difference is the async keyword...
			sync ?
				function*(){
					var a = pre ? 
						pre.call(this, args, ...arguments)
						: args
					yield* that(...arguments)[name](...a) }
				: async function*(){
					var a = pre ? 
						pre.call(this, args, ...arguments)
						: args
					yield* that(...arguments)[name](...a) }, 
			{ toString: function(){
				return [
					that.toString(), 
					// XXX need to normalize args better...
					`.${ name }(${ args.join(', ') })`,
				].join('\n    ') }, }) } }

// XXX do a better doc...
var makePromise = function(name){
	return function(...args){
		var that = this
		return function(){
			return that(...arguments)[name](func) } } }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var GeneratorMixin =
module.GeneratorMixin =
object.Mixin('GeneratorMixin', 'soft', {
	STOP: object.STOP,

	iter: module.iter,

	gat: makeGenerator('gat'),
	at: function(i){
		var that = this
		return Object.assign(
			function(){
				return that(...arguments).at(i) },
			{ toString: function(){
				return that.toString() 
					+ '\n    .at('+ i +')'}, }) },

	slice: makeGenerator('slice'),
	flat: makeGenerator('flat'),

	map: makeGenerator('map'),
	filter: makeGenerator('filter'),
	reduce: makeGenerator('reduce'),
	reduceRight: makeGenerator('reduceRight'),

	between: makeGenerator('between'),

	// XXX EXPERIMENTAL
	// XXX add .toString(..) to this???
	forEach: function(func){
		var that = this
		return function(){
			return that(...arguments).forEach(func) } },

	// non-generators...
	//
	toArray: function(){
		var that = this
		return Object.assign(
			function(){
				return that(...arguments).toArray() },
			{ toString: function(){
				return that.toString() 
					+ '\n    .toArray()'}, }) },
	gpop: makeGenerator('gpop'),
	pop: function(){
		var that = this
		return Object.assign(
			function(){
				//return that(...arguments).toArray().pop() },
				return that(...arguments).pop() },
			{ toString: function(){
				return that.toString() 
					+ '\n    .pop()'}, }) },
	push: makeGenerator('push'),
	gshift: makeGenerator('gshift'),
	shift: function(){
		var that = this
		return Object.assign(
			function(){
				//return that(...arguments).toArray().shift() }, 
				return that(...arguments).shift() }, 
			{ toString: function(){
				return that.toString() 
					+ '\n    .shift()'}, }) },
	unshift: makeGenerator('unshift'),

	// promises...
	//
	then: makePromise('then'),
	catch: makePromise('catch'),
	finally: makePromise('finally'),

	// combinators...
	//
	chain: makeGenerator('chain'),
	concat: makeGenerator('concat', 
		// initialize arguments...
		function(next, ...args){
			return next
				.map(function(e){
					return (e instanceof Generator
							|| typeof(e) == 'function') ?
						e(...args)
						: e }) }),
	//zip: makeGenerator('zip'),
	
	enumerate: makeGenerator('enumerate'),

	// XXX should this have a .gjoin(..) companion...
	join: function(){
		var args = [...arguments]
		var that = this
		return Object.assign(
			function(){
				//return that(...arguments).toArray().shift() }, 
				return that(...arguments).join(...args) }, 
			{ toString: function(){
				return that.toString() 
					+ '\n    .join()'}, }) },
})


var GeneratorProtoMixin =
module.GeneratorProtoMixin =
object.Mixin('GeneratorProtoMixin', 'soft', {
	// XXX use module.iter(..) ???
	iter: stoppable(function*(handler){ 
		if(handler){
			var i = 0
			for(var elem of this){
				var res = handler.call(this, elem, i) 
				// expand iterables...
				if(typeof(res) == 'object' 
						&& Symbol.iterator in res){
					yield* res
				// as-is...
				} else {
					yield res }}
		// no handler...
		} else {
			yield* this } }),
	//*/

	at: function(i){
		return this.gat(i).next().value },
	// XXX this needs the value to be iterable... why???
	gat: function*(i){
		// sanity check...
		if(i < 0){
			throw new Error('.gat(..): '
				+'generator index can\'t be a negative value.')}
		for(var e of this){
			if(i-- == 0){
				yield e 
				return } } },

	// NOTE: this is different from Array's .slice(..) in that it does not 
	// 		support negative indexes -- this is done because there is no way 
	// 		to judge the length of a generator until it is fully done...
	slice: function*(from=0, to=Infinity){
		// sanity check...
		if(from < 0 || to < 0){
			throw new Error('.slice(..): '
				+'generator form/to indexes can\'t be negative values.')}
		var i = 0
		for(var e of this){
			// stop at end of seq...
			if(i >= to){
				return }
			// only yield from from...
			if(i >= from){
				yield e }
			i++ } },
	// XXX do we need a version that'll expand generators???
	flat: function*(depth=1){
		if(depth == 0){
			return this }
		for(var e of this){
			// expand array...
			if(e instanceof Array){
				for(var i=0; i < e.length; i++){
					if(depth <= 1){
						yield e[i]

					} else {
						yield* typeof(e[i].flat) == 'function' ?
							e[i].flat(depth-1)
							: e[i] } }
			// item as-is...
			} else {
				yield e } } },

	// NOTE: if func is instanceof Generator then it's result (iterator) 
	// 		will be expanded...
	// NOTE: there is no point to add generator-handler support to either 
	// 		.filter(..)  or .reduce(..)
	map: stoppable(
		function*(func){
			var i = 0
			if(func instanceof Generator){
				for(var e of this){
					yield* func(e, i++, this) } 
			} else {
				for(var e of this){
					yield func(e, i++, this) } } }),
	filter: stoppable(function*(func){
			var i = 0
			try{
				for(var e of this){
					if(func(e, i++, this)){
						yield e } } 
			// normalize the stop value...
			} catch(err){
				if(err instanceof STOP){
					if(!err.value){
						throw STOP }
					err.value = e }
				throw err } }),

	reduce: stoppable(function(func, res){
		var i = 0
		for(var e of this){
			res = func(res, e, i++, this) }
		return res }),
	greduce: function*(func, res){
		yield this.reduce(...arguments) },

	between: stoppable(function*(func){
		var i = 0
		var j = 0
		var prev
		for(var e of this){
			if(i > 0){
				yield typeof(func) == 'function' ?
					func.call(this, [prev, e], i-1, i + j++, this)
					: func }
			prev = e
			yield e
			i++ } }),

	// NOTE: this is a special case in that it will unwind the generator...
	// NOTE: this is different from <array>.forEach(..) in that this will
	// 		return the resulting array.
	// XXX EXPERIMENTAL
	forEach: function(func){
		return [...this].map(func) },

	pop: function(){
		return [...this].pop() },
	// XXX this needs the value to be iterable...
	gpop: function*(){
		yield [...this].pop() },
	push: function*(value){
		yield* this
		yield value },
	shift: function(){
		return this.next().value },
	// XXX this needs the value to be iterable...
	gshift: function*(){
		yield this.next().value },
	unshift: function*(value){
		yield value
		yield* this },

	// non-generators...
	//
	toArray: function(){
		return [...this] },

	// promises...
	//
	then: function(onresolve, onreject){
		var that = this
		var p = new Promise(
			function(resolve){
				resolve([...that]) }) 
		p = (onresolve || onreject) ?
			p.then(...arguments)
			: p
		return p },
	catch: function(func){
		return this.then().catch(func) },
	finally: function(func){
		return this.then().finally(func) },

	// combinators...
	//
	chain: function*(...next){
		yield* next
			.reduce(function(cur, next){
				return next(cur) }, this) },
	concat: function*(...next){
		yield* this
		for(var e of next){
			yield* e } },

	// XXX EXPERIMENTAL...
	/* XXX not sure how to do this yet...
	tee: function*(...next){
		// XXX take the output of the current generator and feed it into 
		// 		each of the next generators... (???)
	},
	zip: function*(...items){
		// XXX
	},
	//*/

	enumerate: function*(){
		var i = 0
		for(var e of this){
			yield [i++, e] } },

	join: function(){
		return [...this]
			.join(...arguments) },
})


GeneratorMixin(Generator.prototype)
GeneratorProtoMixin(Generator.prototype.prototype)


// Extend base iterators...
ITERATOR_PROTOTYPES
	.forEach(function(proto){
		GeneratorProtoMixin(proto) })


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
// XXX EXPERIMENTAL...

var AsyncGeneratorMixin =
module.AsyncGeneratorMixin =
object.Mixin('AsyncGeneratorMixin', 'soft', {
	// XXX TEST...
	iter: makeGenerator('async', 'iter'),

	map: makeGenerator('async', 'map'),
	filter: makeGenerator('async', 'filter'),
	reduce: makeGenerator('async', 'reduce'),

	// XXX TEST...
	between: makeGenerator('async', 'between'),
})

var AsyncGeneratorProtoMixin =
module.AsyncGeneratorProtoMixin =
object.Mixin('AsyncGeneratorProtoMixin', 'soft', {
	// promise...
	//
	// NOTE: this will unwind the generator...
	// XXX create an iterator promise???
	// XXX should we unwind???
	then: function(resolve, reject){
		var that = this
		var p = new Promise(async function(_resolve, _reject){
			var res = []
			for await(var elem of that){
				res.push(elem) }
			_resolve(res) }) 
		p = (resolve || reject) ?
			p.then(...arguments)
			: p
		return p },
	catch: function(func){
		return this.then().catch(func) },
	finally: function(){
		return this.then().finally(func) },

	// XXX might be a good idea to use this approach above...
	iter: stoppable(async function*(handler=undefined){
		var i = 0
		if(handler){
			for await(var e of this){
				var res = handler.call(this, e, i++)
				if(typeof(res) == 'object' 
						&& Symbol.iterator in res){
					yield* res
				} else {
					yield res } }
		} else {
			yield* this } }),

	map: async function*(func){
		yield* this.iter(function(elem, i){
			return [func.call(this, elem, i)] }) },
	filter: async function*(func){
		yield* this.iter(function(elem, i){
			return func.call(this, elem, i) ?
	   			[elem]
				: [] }) },
	// NOTE: there is not much point in .reduceRight(..) in an async 
	// 		generator as we'll need to fully unwind it then go from the 
	// 		end...
	reduce: async function(func, state){
		this.iter(function(elem, i){
			state = func.call(this, state, elem, i) 
			return [] })
		return state },

	// XXX BETWEEN...
	between: async function*(func){
		var i = 0
		var j = 0
		var prev
		yield* this.iter(function(e){
			return i++ > 0 ?
				[
					typeof(func) == 'function' ?
						func.call(this, [prev, e], i, i + j++, this)
						: func,	
					e,
				]
				: [e] }) },

	// XXX TEST...
	chain: async function*(...next){
		yield* next
			.reduce(function(cur, next){
				return next(cur) }, this) },

	flat: async function*(){
		for await(var e of this){
			if(e instanceof Array){
				yield* e
			} else {
				yield e }}},

	concat: async function*(other){
		yield* this
		yield* other },
	push: async function*(elem){
		yield* this
		yield elem },
	unsift: async function*(elem){
		yield elem 
		yield* this },

	join: async function(){
		return [...(await this)]
			.join(...arguments) },

	// XXX
	// 	slice -- not sure if we need this...
	// 	...
})

AsyncGeneratorMixin(AsyncGenerator.prototype)
AsyncGeneratorProtoMixin(AsyncGenerator.prototype.prototype)



//---------------------------------------------------------------------
// Generators...

// NOTE: step can be 0, this will repeat the first element infinitely...
var range =
module.range =
function*(from, to, step){
	if(to == null){
		to = from
		from = 0 }
	step = step ?? (from > to ? -1 : 1)
	while(step > 0 ? 
			from < to 
			: from > to){
		yield from 
		from += step } }


var repeat =
module.repeat =
function*(value=true, stop){
	while( typeof(stop) == 'function' && stop(value) ){
		yield value } }


var produce =
module.produce =
stoppable(function*(func){
	while(true){
		yield func() } })




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
