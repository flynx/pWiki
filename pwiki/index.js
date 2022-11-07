/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')


//---------------------------------------------------------------------
//
//	makeIndex(<name>[, <options>])
//	makeIndex(<name>, <generate>[, <options>])
//		-> <index-handler> 
//
//	Call/get
//	<index-handler>()
//		-> <data>
//		-> <promise>
//
//	Call the index handler method...
//	<index-handler>('__call__', ..)
//		-> ...
//		-> <promise>
//
//	Get merged data (cached)
//	<index-handler>('get')
//		-> <data>
//		-> <promise>
// 		NOTE: when a getter is pending (promise), all consecutive calls 
// 			will resolve the original getter return value...
//
//	Get sync or cached result and do "lazy" background update...
//	<index-handler>('lazy')
//		-> <data>
//		-> <promise>
// 		NOTE: if <index-handler>(..) is synchronous, this will wait till
// 			it returns and will return the result.
// 		NOTE: 'lazy' mode is generally faster as it does all the checks and 
// 			updating (if needed) in a background promise, but can return 
// 			outdated cached results.
// 		NOTE: as a side-effect this avoids returning promises if a cached 
// 			value is available. i.e. a promise is returned only when 
// 			getting/generating a value for the first time.
//
//	Get cached result and trigger a background update...
//	<index-handler>('cached')
//		-> <data>
//		-> <promise>
//		-> undefined
//		NOTE: this is like 'lazy' but will not wait for <index-handler>)(..)
//			to return, making it even faster but as a trade off it will
//			return the cached and possibly outdated result even if 
//			<index-handler>(..) is synchronous.
//
//	Get local data (uncached)...
//	<index-handler>('local')
//		-> <data>
//		-> <promise>
//
//	Clear cache...
//	<index-handler>('clear')
//
//	Reset cache (clear then get)...
//	<index-handler>('reset')
//		-> <data>
//		-> <promise>
//
//	Get index status...
//	<index-handler>('status')
//		-> 'empty'
//		-> 'pending'
//		-> 'cached'
//		-> 'outdated'
//
//	Run custom action...
//	<index-handler>(<action-name>), ...)
//		-> <data>
//		-> <promise>
//
// NOTE: the main differences between the 'get', 'lazy' and 'cached' actions:
// 		'get'
// 			generate/merge are all sync/async as defined
// 			when cached value available validate and return either the cached value or generate
// 		'lazy'
// 			XXX
// 		'cached'
// 			call get in background
// 			return cached value or undefined
// 	  
//
//
// Special methods:
//
// 	Special method to generate local <data>...
// 	.__<name>__()
// 		-> <data>
//
// 	Merge local data with other sources...
// 	.__<name>_merge__(<data>)
// 		-> <data>
//
// 	Test if cache is valid...
// 	.__<name>_isvalid__(<timestamp>)
// 		-> <bool>
//
// 	Handle custom action...
// 	.__<name>_<action-name>__(<data>. ...)
// 		-> <data>
//
//
//
// Special attributes:
//
// 	Cached data...
// 	.__<name>_cache / .<name>
//
// 	Modification time...
// 	.__<name>_modified
//
// 	Pending generator promise...
// 	.__<name>_promise
//
//
// Options format:
// 	{
// 		// XXX
// 		attr: false 
// 			| true 
// 			| <name>,
//
// 		// list of dependencies that when changed will trigger a cache 
// 		// drop on current index...
// 		// NOTE: dependency checking is done via .modified time, if value
// 		//		is changed manually and not via an action then the system
// 		//		will not catch the change.
// 		depends: [ 
// 			<index-name>, 
// 			... 
// 		],
//
// 		// custom action...
// 		// NOTE: this is the same as defining .__<name>_<action-name>__(..)
// 		//		method...
// 		<action-name>: <func>,
// 	}
//
//
// XXX do we separate internal methods and actions???
// 		i.e. __<name>_merge__(..) / __<name>_isvalid__(..) and the rest...
var makeIndex = 
module.makeIndex =
function(name, generate, options={}){
	// makeIndex(<name>, <options>)
	if(generate 
			&& typeof(generate) != 'function'){
		options = generate 
		generate = options.generate }

	// attr names...
	var cache = 
		typeof(options.attr) == 'string' ?
			options.attr
		// XXX revise default...
		: !!options.attr ?
			name
		: `__${name}_cache`
	var modified = `__${name}_modified`
	var promise = `__${name}_promise`
	var test = `__${name}_isvalid__`
	var merge = `__${name}_merge__`
	var special = `__${name}__`

	// set modified time...
	var _stamp = function(that, res){
		res instanceof Promise ?
			res.then(function(){
				that[modified] = Date.now() })
			: (that[modified] = Date.now())
		return res }
	// make local cache...
	var _make = function(that){
		return that[special] != null ?
				that[special]()
				: (generate 
					&& generate.call(that)) }
	var _smake = function(that){
		return _stamp(that, _make(that)) }
	// unwrap a promised value into cache...
	var _await = function(obj, val){
		if(val instanceof Promise){
			// NOTE: this avoids a race condition when a getter is called
			// 		while a previous getter is still pending...
			if(obj[promise] == null){
				obj[promise] = val
				val.then(
					function(value){
						delete obj[promise]
						obj[cache] = value },
					function(err){
						// XXX should we report this???
						delete obj[promise] }) }
			val = obj[promise] }
		return val }
	var _deferred = async function(obj, ...args){
		return meth.call(obj, ...args) }

	// build the method...
	var meth
	return (meth = Object.assign(
		function(action, ...args){
			var that = this

			action = action === undefined ?
				('__call__' in options ?
					'__call__'
					: 'get')
				: action

			// action: status...
			if(action == 'status'){
				if(this[cache] instanceof Promise){
					return 'pending' }
				if(cache in this){
					var cur = this[modified]
					// user test...
					if(test in this 
							&& !this[test](cur)){
						return 'outdated'
					// check dependencies...
					} else if(meth.options.depends){
						for(var dep of meth.options.depends){
							if(this[`__${this[dep].index}_modified`] > cur){
								return 'outdated' } } }
					return 'cached' }
				return 'empty' }

			// action: lazy...
			if(action == 'lazy'){
				if(this[cache] instanceof Promise){
					return this[cache] }
				var res = meth.call(this, 'get')
				return (this[cache]
						&& res instanceof Promise) ? 
					this[cache]
					: res }
			// action: cached...
			if(action == 'cached'){
				_deferred(this, 'get')
				return this[cache] }
			// action: local...
			// NOTE: this is intentionally not cached...
			if(action == 'local'){
				return _make(this) }

			// action: clear/reset...
			if(action == 'clear' 
					|| action == 'reset'){
				delete this[cache] 
				'reset' in options
					&& options['reset'].call(this, null, name) }
			if(action == 'clear'){
				return }

			// validate cache...
			if(cache in this
					&& meth.call(this, 'status') == 'outdated'){
				delete this[cache] }

			// action: other...
			if(action != 'get' 
					&& action != '__call__'
					&& action != 'reset'){
				var action_meth = `__${name}_${action}__`
				// generate cache if not available...
				var cur = cache in this ?
					this[cache]
					: meth.call(this, 'reset')
				var res = _await(this, 
					this[cache] = 
						// NOTE: this[action_meth] will fully shadow options[action]...
						action_meth in this ?
							this[action_meth](cur, ...args)
						: (action in options 
								&& typeof(options[action]) == 'function') ?
							//options[action].call(this, cur, ...args)
							options[action].call(this, cur, name, ...args)
						: cur) 
				res !== cur
					&& _stamp(this, res)
				return res }

			// get/generate the data...
			var res = _await(this, 
				this[cache] =
					// cached...
					this[cache] != null ?
						this[cache] 
					// generate + merge...
					: this[merge] != null ?
						// NOTE: need to set the timestamp after the merge...
						_stamp(this, 
							this[merge](_make(this)))
					// generate...
					: _smake(this)) 

			// action: call...
			// NOTE: this directly returns the result to user but will 
			// 		not automatically influence the stored value...
			if(action == '__call__'){
				return options.__call__.call(this, res, name, ...args) }

			// action: get...
			return res },
		{
			index: name,
			indexed: true,
			options,
		})) }



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX
var iter =
module.iter =
function*(obj){
	for(var key of object.deepKeys(obj)){
		var d = object.values(obj, key, true).next().value.value
		// XXX should makeIndex(..) be a constructor -- i.e. an instanceof test???
		if(typeof(d) == 'function' 
				&& d.indexed){
			yield key } } }


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

//
// 	.index(obj)
// 	.index(obj, 'get')
// 		-> <indexi>
//
// 	...
//
// 	.index(obj, <action>, ...)
// 		-> <indexi>
//
//
// 	.index('obj, new', <name>, <generate>[, <options>])
//		-> <index-handler> 
//
// XXX
var index =
module.index =
async function(obj, action='get', ...args){
	// create a new index...
	if(action == 'new'){
		var res = module.makeIndex(...args)
		var [name, _, options={}] = args
		var attr = name
		if(options.attr){
			var attr = `__${name}`
			Object.defineProperty(obj, name, {
				get: function(){ 
					return obj[attr] }, }) }
		return (obj[attr] = res) }
	// propagate action...
	return Object.fromEntries(
		await Promise.all(
			module.iter(obj)
				.map(async function(name){
					return [
						obj[name].index, 
						await obj[name](action, ...args),
					] }))) }



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

var IndexManagerMixin = 
module.IndexManagerMixin =
object.Mixin('IndexManagerMixin', {
	// List of index handler attribute names...
	//
	// XXX rename???
	get index_attrs(){
		return [...module.iter(this)] },
	index: async function(action='get', ...args){
		return module.index(this, ...arguments) },
})



//---------------------------------------------------------------------

var indexTest = 
module.indexTest =
IndexManagerMixin({
	// tests...
	//
	moo: module.makeIndex('moo', () => 123),

	foo_index: module.makeIndex('foo', () => 123, {
		attr: true,
		add: function(cur, val){
			return cur + val },
	}),

	__boo_add__: function(cur, val){
		return cur + val },
	boo: module.makeIndex('boo', () => 123),

	__soo_add__: async function(cur, val){
		return await cur + val },
	__soo: module.makeIndex('soo', async () => 123),
	get soo(){
		return this.__soo() },

	__sum: module.makeIndex('sum', 
		async function(){
			return await this.moo() 
				+ await this.foo_index()
				+ await this.boo() 
				+ await this.soo },
		{ depends: [
			'moo', 
			'foo_index', 
			'boo', 
			'__soo',
		], }),
	get sum(){
		return this.__sum() },

	__merged__: function(){
		return 777 },
	__merged_merge__: async function(data){
		return (await data) + 777 },
	__merged: module.makeIndex('merged'),
	get merged(){
		return this.__merged() },
})




/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
