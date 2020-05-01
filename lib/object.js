/**********************************************************************
* 
* object.js
*
* Repo and docs:
* 	https://github.com/flynx/object.js
*
*
* XXX should this extend Object???
* 		...if yes then it would also be logical to move Object.run(..) 
* 		here...
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/
// Helpers...

var TAB_SIZE =
module.TAB_SIZE = 4


// Normalize indent...
//
// 	normalizeIndent(text)
// 		-> text
//
//
// This will remove common indent from each like of text, this is useful 
// for printing function code of functions that were defined at deep 
// levels of indent.
//
// NOTE: this will trim out both leading and trailing white-space.
//
// XXX is this the right place for this???
// 		...when moving take care that ImageGrid's core.doc uses this...
var normalizeIndent =
module.normalizeIndent =
function(text, tab_size){
	tab_size = tab_size || TAB_SIZE
	text = tab_size > 0 ?
		text.replace(/\t/g, ' '.repeat(tab_size))
		: text
	var lines = text.split(/\n/)
	var l = lines 
		.reduce(function(l, e, i){
			var indent = e.length - e.trimLeft().length
			return e.trim().length == 0 
					// ignore 0 indent of first line...
					|| (i == 0 && indent == 0) ? l 
				: l < 0 ? 
					indent 
				: Math.min(l, indent)
		}, -1)
	return lines
		.map(function(line, i){ 
			return i == 0 ? 
				line 
				: line.slice(l) })
		.join('\n')
		.trim() }



//---------------------------------------------------------------------
// Prototype chain content access...

// Get a list of source objects for a prop/attr name...
//
// 	sources(obj, name)
// 	sources(obj, name, callback)
// 		-> list
// 		-> []
// 		
// 	callback(obj)
// 		-> true | 'stop'
// 		-> ..
// 		
// 		
// The callback(..) is called with each matching object.
// 
// The callback(..) can be used to break/stop the search, returning 
// a partial list og matcges up untill and including the object 
// triggering the stop.
//
//
// NOTE: this go up the prototype chain, not caring about any role (
// 		instance/class or instance/prototype) bounderies and depends 
// 		only on the object given as the starting point.
// 		It is possible to start the search from this, thus checking
// 		for any overloading in the instance, though this approach is 
// 		not very reusable....
// NOTE: this will not trigger any props...
var sources =
module.sources =
function(obj, name, callback){
	var stop
	var res = []
	do {
		if(obj.hasOwnProperty(name)){
			res.push(obj) 
			// handle callback...
			stop = callback
				&& callback(obj)
			// stop requested by callback...
			if(stop === true || stop == 'stop'){
				return res } 
		}
		obj = obj.__proto__
	} while(obj !== null)
	return res }


// Find the next parent attribute in the prototype chain.
//
// 	Get parent attribute value...
// 	parent(proto, name)
// 		-> value
// 		-> undefined
//
// 	Get parent method...
// 	parent(method, this)
// 		-> meth
// 		-> undefined
//
// 
// The two forms differ in:
// 	- in parent(method, ..) a method's .name attr is used for name.
// 	- in parent(method, ..) the containing prototype is inferred.
//
// NOTE: there are cases where method.name is not set (e.g. anonymous 
// 		function), so there a name should be passed explicitly...
// NOTE: when passing a method it is recommended to pass an explicit 
// 		reference to it relative to the constructor, i.e.:
// 			Constructor.prototype.method
// 		this will avoid relative resolution loops, for example: 
// 			this.method 
// 		deep in a chain will resolve to the first .method value visible 
// 		from 'this', i.e. the top most value and not the value visible
// 		from that particular level...
//
//
// Example:
// 		var X = object.Constructor('X', {
//			__proto__: Y.prototype,
//
//			attr: 123,
//
// 			method: function(){
// 				// get attribute...
// 				var a = object.parent(X.prototype, 'attr')
//
// 				// get method...
// 				var ret = object.parent(X.prototype.method, this)
// 					.call(this, ...arguments)
//
// 				// ...
// 			}
// 		})
//
//
// NOTE: in the general case this will get the value of the returned 
// 		property/attribute, the rest of the way passive to props.
// 		The method case will get the value of every method from 'this' 
// 		and to the method after the match.
// NOTE: this is super(..) replacement, usable in any context without 
// 		restriction -- super(..) is restricted to class methods only...
var parent =
module.parent =
function(proto, name){
	// special case: method...
	if(typeof(name) != typeof('str')){
		that = name
		name = proto.name
		// get first matching source...
		proto = sources(that, name, 
				function(obj){ return obj[name] === proto })
			.pop() }
	// get first source...
	var res = sources(proto, name, 
			function(obj){ return 'stop' })
		.pop() 
	return res ?
		// get next value...
		res.__proto__[name] 
		: undefined }


// Find the next parent property descriptor in the prototype chain...
//
// 	parentProperty(proto, name)
// 		-> prop-descriptor
//
//
// This is like parent(..) but will get a property descriptor...
//
var parentProperty =
module.parentProperty =
function(proto, name){
	// get second source...
	var c = 0
	var res = sources(proto, name, 
			function(obj){ return c++ == 1 })
		.pop() 
	return res ?
		// get next value...
		Object.getOwnPropertyDescriptor(res, name)
		: undefined }


// Find the next parent method and call it...
//
// 	parentCall(proto, name, this, ...)
// 	parentCall(meth, this, ...)
// 		-> res
// 		-> undefined
//
//
// This also gracefully handles the case when no higher level definition 
// is found, i.e. the corresponding parent(..) call will return undefined
// or a non-callable.
//
// NOTE: this is just like parent(..) but will call the retrieved method,
// 		essentially this is a shorthand to:
// 			parent(proto, name).call(this, ...)
// 		or:
// 			parent(method, this).call(this, ...)
// NOTE: for more docs see parent(..)
var parentCall =
module.parentCall =
function(proto, name, that, ...args){
	var meth = parent(proto, name)
	return meth instanceof Function ?
		meth.call(...( typeof(name) == typeof('str') ?
			[...arguments].slice(2)
			: [...arguments].slice(1) ))
		: undefined }



//---------------------------------------------------------------------
// Mixin utils...
// XXX should we add mixout(..) and friends ???

// Mix a set of methods/props/attrs into an object...
// 
//	mixinFlat(root, object, ...)
//		-> root
//
//
// NOTE: essentially this is just like Object.assign(..) but copies 
// 		properties directly rather than copying property values...
var mixinFlat = 
module.mixinFlat = 
function(root, ...objects){
	return objects
		.reduce(function(root, cur){
			Object.keys(cur)
				.map(function(k){
					Object.defineProperty(root, k,
						Object.getOwnPropertyDescriptor(cur, k)) })
			return root }, root) }


// Mix sets of methods/props/attrs into an object as prototypes...
//
// 	mixin(root, object, ...)
// 		-> root
//
//
// This will create a new object per set of methods given and 
// mixinFlat(..) the method set into this object leaving the 
// original objects intact.
// 
// 		root <-- object1_copy <-- .. <-- objectN_copy
// 				
var mixin = 
module.mixin = 
function(root, ...objects){
	return objects
		.reduce(function(res, cur){
			return module.mixinFlat(Object.create(res), cur) }, root) }



//---------------------------------------------------------------------
// Constructor...

// Make an uninitialized instance object...
//
// 	makeRawInstance(context, constructor, ...)
// 		-> instance
//
//
// This will:
// 	- construct an object
// 		- if .__new__(..) is defined
// 			-> call and use its return value
//		- if prototype is a function or if .__call__(..) is defined
//			-> use a wrapper function
//		- else
//			-> use {}
// 	- link the object into the prototype chain
//
//
// This will not call .__init__(..)
//
//
// NOTE: context is only used when passeding to .__new__(..) if defined, 
// 		and is ignored otherwise...
// NOTE: as this is simply an extension to the base JavaScript protocol this
// 		can be used to construct any object...
// 		Example:
// 			var O = function(){}
// 			// new is optional...
// 			var o = new makeRawInstance(null, O)
// NOTE: .__new__(..) is intentionaly an instance method (contary to 
// 		Python) this is done because there are no classes in JS and 
// 		adding and instance constructor as a class method would create 
// 		unneccessary restrictions both on the "class" object and on the 
// 		instance...
// 
// XXX Q: should the context (this) in .__new__(..) be _constructor or 
// 		.prototype???
// 		... .prototype seems to be needed more often but through it we 
// 		can't reach the actual constructor... but on the other hand we 
// 		can (should?) always explicitly use it -- .__new__(..) is usually 
// 		in the same scope + this makes it more reusable for chaining
// 		.__new__(..) calls...
// 		...currently it's .prototype...
var makeRawInstance = 
module.makeRawInstance =
function(context, constructor, ...args){
	var _mirror_doc = function(func, target){
		Object.defineProperty(func, 'toString', {
			value: function(...args){
				return target.toString(...args) },
			enumerable: false,
		})
		return func }

	var obj =
		// prototype defines .__new__(..)...
		constructor.prototype.__new__ instanceof Function ?
			constructor.prototype.__new__(context, ...args)
		// callable instance -- prototype is a function...
		// NOTE: we need to isolate the .prototype from instances...
		: constructor.prototype instanceof Function ?
			_mirror_doc(
				function(){
					return constructor.prototype
						.call(obj, this, ...arguments) },
				constructor.prototype)
		// callable instance -- prototype defines .__call__(..)...
		// NOTE: we need to isolate the .__call__ from instances...
		: constructor.prototype.__call__ instanceof Function ?
			_mirror_doc(
				function(){
					return constructor.prototype.__call__
						.call(obj, this, ...arguments) },
				constructor.prototype.__call__)
		// default object base...
		: {} 

	// link to prototype chain...
	obj.__proto__ = constructor.prototype
	Object.defineProperty(obj, 'constructor', {
		value: constructor,
		enumerable: false,
	})

	return obj }


// Make an object constructor function...
//
// 	Make a constructor with an object prototype...
// 		Constructor(name, proto)
// 			-> constructor
//
// 	Make a constructor with a prototype (object/function) and a class
// 	prototype...
// 		Constructor(name, class-proto, proto)
// 			-> constructor
// 			NOTE: the <class-proto> defines a set of class methods and 
// 					attributes.
//
//
// The resulting constructor can produce objects in one of these ways:
//
// 	Create instance...
// 		constructor(..)
// 		new constructor
// 		new constructor(..)
// 			-> instance
//
//	Create raw/uninitialized instance...
//		constructor.__rawinstance__(..)
//		makeRawInstance(null, constructor, ..)
//			-> raw-instance
//
//
// All produced objects are instances of the constructor
// 		instance instanceof constructor
// 			-> true
//
//
//
// Create and initialization protocol:
// 	1) raw instance is created:
// 		a) constructor.__rawinstance__(..) / makeRawInstance(..) called:
// 			- call .__new__(..) if defined and get return value as 
// 				instance, or
// 			- if .__call__(..) defined or prototype is a function, wrap 
// 				it and use the wrapper function as instance, or
// 			- create an empty object
// 		b) instance linked to prototype chain
// 			set .__proto__ to constructor.prototype
// 	2) instance is initialized: 
// 		call .__init__(..) if defined
// 
//
// 
// Special methods (constructor):
//
//  Handle uninitialized instance construction
// 	.__rawinstance__(context, ...)
// 		-> instance
// 		NOTE: This is a shorthand to makeRawInstance(..) see it for 
// 			details.
// 
// 
// Special methods (.prototype):
//
// 	Create new instance object...
// 	.__new__(context, ..)
// 		-> object
//
// 	Handle instance call...
// 	.__call__(context, ..)
// 		-> ..
//
// 	Initialize instance object...
// 	.__init__(..)
// 		-> ..
//
//
// NOTE: raw instance creation is defined by makeRawInstance(..) so see 
// 		it for more info.
// NOTE: raw instance creation can be completely overloaded by defining
// 		.__rawinstance__(..) on the constructor.
//
//
//
// Inheritance:
// 	A simple way to build C -> B -> A chain would be:
//
// 		// NOTE: new is optional...
// 		var A = new Constructor('A')
//
// 		// NOTE: in a prototype chain the prototypes are "inherited"
// 		// NOTE: JS has no classes and the prototype is just another 
// 		//		object, the only difference is that it's used by the 
// 		//		constructor to link other objects i.e. "instances" to...
// 		var B = Constructor('B', {__proto__: A.prototype})
//
// 		var C = Constructor('C', Objec.create(B.prototype))
//
// 		var c = C()
//
// 		c instanceof C		// -> true
// 		c instanceof B		// -> true
// 		c instanceof A		// -> true
//
// 		A.prototype.x = 123
//
// 		c.x 				// -> 123
//
//
//
// Motivation:
// 	The general motivation here is to standardise the constructor 
// 	protocol and make a single simple way to go with minimal variation. 
// 	This is due to the JavaScript base protocol though quite simple, 
// 	being too flexible making it very involved to produce objects in a 
// 	consistent manner by hand, especially in long running projects, 
// 	in turn spreading all the refactoring over multiple sites and styles.
//
// 	This removes part of the flexibility and in return gives us:
// 		- single, well defined protocol
// 		- one single spot where all the "magic" happens
// 		- full support for existing JavaScript ways of doing things
// 		- easy refactoring without touching the client code
//
//
// NOTE: this sets the proto's .constructor attribute, thus rendering it
// 		not reusable, to use the same prototype for multiple objects 
// 		clone it via. Object.create(..) or copy it...
// NOTE: to disable .__rawinstance__(..) handling set it to false in the 
// 		class prototype...
var Constructor = 
module.Constructor =
// shorthand...
module.C =
function Constructor(name, a, b){
	var proto = b == null ? a : b
	var cls_proto = b == null ? b : a
	proto = proto || {}

	// the actual constructor...
	var _constructor = function Constructor(){
		// create raw instance...
		var obj = _constructor.__rawinstance__ ? 
				_constructor.__rawinstance__(this, ...arguments)
			: makeRawInstance(this, _constructor, ...arguments)
		// initialize...
		obj.__init__ instanceof Function
			&& obj.__init__(...arguments)
		return obj }

	_constructor.name = name
	// just in case the browser refuses to change the name, we'll make
	// it a different offer ;)
	_constructor.name == 'Constructor'
		// NOTE: this eval(..) should not be a risk as its inputs are
		// 		static and never infuenced by external inputs...
		&& eval('_constructor = '+ _constructor
				.toString()
				.replace(/Constructor/g, name))
	// set .toString(..)...
	// NOTE: do this only if .toString(..) is not defined by user...
	;((cls_proto || {}).toString() == ({}).toString())
		&& Object.defineProperty(_constructor, 'toString', {
			value: function(){ 
				var args = proto.__init__ ?
					proto.__init__
						.toString()
						.split(/\n/)[0]
							.replace(/function\(([^)]*)\){.*/, '$1')
					: ''
				var code = proto.__init__ ?
					proto.__init__
						.toString()
						.replace(/[^{]*{/, '{')
					: '{ .. }'
				return `${this.name}(${args})${normalizeIndent(code)}` },
			enumerable: false,
		})
	_constructor.__proto__ = cls_proto
	_constructor.prototype = proto
	// generic raw instance constructor...
	_constructor.__rawinstance__ instanceof Function
		|| (_constructor.__rawinstance__ = 
			function(context, ...args){
				return makeRawInstance(context, this, ...args) })

	// set .prototype.constructor
	Object.defineProperty(_constructor.prototype, 'constructor', {
		value: _constructor,
		enumerable: false,
	})

	return _constructor }



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
