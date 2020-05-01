/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)(
function(require){ var module={} // makes module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')
var actions = module.actions = require('ig-actions')



/*********************************************************************/

var FeatureLinearizationError =
module.FeatureLinearizationError = 
function(data){
	this.data = data
	this.message = 'Failed to linearise.'
	this.toString = function(){
		return this.message
	}
}
FeatureLinearizationError.prototype = Object.create(new Error)
FeatureLinearizationError.prototype.constructor = FeatureLinearizationError




//---------------------------------------------------------------------
// Base feature...
//
// 	Feature(obj)
// 		-> feature
//
// 	Feature(feature-set, obj)
// 		-> feature
//
// 	Feature(tag, obj)
// 		-> feature
//
// 	Feature(tag, suggested)
// 		-> feature
//
// 	Feature(tag, actions)
// 		-> feature
//
// 	Feature(feature-set, tag, actions)
// 		-> feature
//
//
// Feature attributes:
// 	.tag			- feature tag (string)
// 					  this is used to identify the feature, its event 
// 					  handlers and DOM elements.
//
// 	.title			- feature name (string | null)
// 	.doc			- feature description (string | null)
//
// 	.priority		- feature priority
// 					  can be:
// 					  	- 'high' (99) | 'medium' (0) | 'low' (-99)
// 					  	- number
// 					  	- null (0, default)
// 					  features with higher priority will be setup first,
// 					  features with the same priority will be run in 
// 					  order of occurrence.
// 	.suggested		- list of optional suggested features, these are not 
// 					  required but setup if available.
// 					  This is useful for defining meta features but 
// 					  without making each sub-feature a strict dependency.
// 	.depends		- feature dependencies -- tags of features that must 
// 					  setup before the feature (list | null)
// 					  NOTE: a feature can depend on an exclusive tag, 
// 					  		this will remove the need to track which 
// 					  		specific exclusive tagged feature is loaded...
// 	.exclusive		- feature exclusivity tags (list | null)
// 					  an exclusivity group enforces that only one feature
// 					  in it will be run, i.e. the first / highest priority.
//
// 	.actions		- action object containing feature actions (ActionSet | null)
// 					  this will be mixed into the base object on .setup()
// 					  and mixed out on .remove()
// 	.config			- feature configuration, will be merged with base 
// 					  object's .config
// 					  NOTE: the final .config is an empty object with
// 					  		.__proto__ set to the merged configuration
// 					  		data...
// 	.handlers		- feature event handlers (list | null)
// 
//
//
// .handlers format:
// 	[
// 		[ <event-spec>, <handler-function> ],
// 		...
// 	]
//
// NOTE: both <event-spec> and <handler-function> must be compatible with
// 		Action.on(..)
//
//
// Feature applicability:
// 	If feature.isApplicable(..) returns false then the feature will not be
// 	considered on setup...
//
//
var Feature =
module.Feature =
object.Constructor('Feature', {
	//__featureset__: Features,
	__featureset__: null,

	// Attributes...
	tag: null,

	//title: null,
	//doc: null,
	//priority: null,
	//exclusive: null,
	//suggested: null,
	//depends: null,
	//actions: null,
	//config: null,
	//handlers: null,


	isApplicable: function(actions){ return true },


	// API...
	getPriority: function(human_readable){
		var res = this.priority || 0
		res = res == 'high' ? 99
			: res == 'low' ? -99
			: res == 'medium' ? 0
			: res == 'normal' ? 0
			: res
		return human_readable ?
				(res == 99 ? 'high'
					: res == 0 ? 'normal'
					: res == -99 ? 'low'
					: res)
			: res },

	// XXX this could install the handlers in two locations:
	// 		- mixin if available...
	// 		- base object (currently implemented)
	// 		should the first be done?
	setup: function(actions){
		var that = this

		// mixin actions...
		if(this.actions != null){
			this.tag ? 
				actions.mixin(this.actions, {source_tag: this.tag}) 
				: actions.mixin(this.actions) 
		}

		// install handlers...
		if(this.handlers != null){
			this.handlers.forEach(function(h){
				actions.on(h[0], that.tag, h[1])
			})
		}

		// merge config...
		// NOTE: this will merge the actual config in .config.__proto__
		// 		keeping the .config clean for the user to lay with...
		if(this.config != null 
				|| (this.actions != null 
					&& this.actions.config != null)){
			// sanity check -- warn of config shadowing...
			if(this.config && this.actions && this.actions.config){
				console.warn('Feature config shadowed: '
					+'both .config (used) and .actions.config (ignored) are defined for:', 
					this.tag, 
					this)
			}

			var config = this.config = this.config || this.actions.config

			if(actions.config == null){
				actions.config = Object.create({})
			}
			Object.keys(config).forEach(function(n){
				// NOTE: this will overwrite existing values...
				actions.config.__proto__[n] = config[n]
			})
		}

		// custom setup...
		// XXX is this the correct way???
		if(this.hasOwnProperty('setup') && this.setup !== Feature.prototype.setup){
			this.setup(actions)
		}

		return this
	},

	// XXX need to revise this...
	// 		- .mixout(..) is available directly from the object while 
	// 			.remove(..) is not...
	// 		- might be a good idea to add a specific lifecycle actions to
	// 			enable feautures to handle their removal correctly... 
	remove: function(actions){
		if(this.actions != null){
			actions.mixout(this.tag || this.actions)
		}

		if(this.handlers != null){
			actions.off('*', this.tag)
		}

		// XXX
		if(this.hasOwnProperty('remove') && this.setup !== Feature.prototype.remove){
			this.remove(actions)
		}

		// remove feature DOM elements...
		// XXX
		actions.ribbons.viewer.find('.' + this.tag).remove()

		return this
	},


	// XXX EXPERIMENTAL: if called from a feature-set this will add self
	// 		to that feature-set...
	// XXX do we need this to be .__new__(..) and not .__init__(..)
	__new__: function(context, feature_set, tag, obj){
		// NOTE: we need to account for context here -- inc length...
		if(arguments.length == 3){
			// Feature(<tag>, <obj>)
			if(typeof(feature_set) == typeof('str')){
				obj = tag
				tag = feature_set
				//feature_set = Features
				// XXX EXPERIMENTAL...
				feature_set = context instanceof FeatureSet ?
					context
					: (this.__featureset__ || Features)

			// Feature(<feature-set>, <obj>)
			} else {
				obj = tag
				tag = null
			}

		// Feature(<obj>)
		// NOTE: we need to account for context here -- inc length...
		} else if(arguments.length == 2){
			obj = feature_set
			//feature_set = Features
			// XXX EXPERIMENTAL...
			feature_set = context instanceof FeatureSet ?
				context
				: (this.__featureset__ || Features)
		}

		if(tag != null && obj.tag != null && obj.tag != tag){
			throw 'Error: tag and obj.tag mismatch, either use one or both must match.' }

		// action...
		if(obj instanceof actions.Action){
			if(tag == null){
				throw 'Error: need a tag to make a feature out of an action' }
			var f = {
				tag: tag,
				actions: obj,
			}
			obj = f

		// meta-feature...
		} else if(obj.constructor === Array){
			if(tag == null){
				throw 'Error: need a tag to make a meta-feature'
			}
			var f = {
				tag: tag,
				suggested: obj,
			}
			obj = f
		}

		// feature-set...
		if(feature_set){
			feature_set[obj.tag] = obj
		}

		return obj
	},
})



//---------------------------------------------------------------------

var FeatureSet =
module.FeatureSet = 
object.Constructor('FeatureSet', {
	// if true, .setup(..) will report things it's doing... 
	__verbose__: null,


	__actions__: actions.Actions,

	// NOTE: a feature is expected to write a reference to itself to the 
	// 		feature-set (context)...
	Feature: Feature,


	// List of registered features...
	get features(){
		var that = this
		return Object.keys(this)
			.filter(function(e){ 
				return e != 'features' 
					&& that[e] instanceof Feature }) },

	// build exclusive groups...
	//
	// 	Get all exclusive tags...
	// 	.getExclusive()
	// 	.getExclusive('*')
	// 		-> exclusive
	//
	// 	Get specific exclusive tags...
	// 	.getExclusive(tag)
	// 	.getExclusive([tag, ..])
	// 		-> exclusive
	//
	// If features is given, only consider the features in list.
	// If rev_exclusive is given, also build a reverse exclusive feature
	// list.
	//
	// output format:
	// 	{
	// 		exclusive-tag: [
	// 			feature-tag,
	// 			...
	// 		],
	// 		...
	// 	}
	//
	getExclusive: function(tag, features, rev_exclusive, isDisabled){
		tag = tag == null || tag == '*' ? '*'
			: tag instanceof Array ? tag
			: [tag]

		features = features || this.features
		rev_exclusive = rev_exclusive || {}

		var that = this
		var exclusive = {}
		features
			.filter(function(f){ 
				return !!that[f].exclusive 
					&& (!isDisabled || !isDisabled(f)) })
			.forEach(function(k){
				var e = that[k].exclusive
				;((e instanceof Array ? e : [e]) || [])
					.forEach(function(e){
						// skip tags not explicitly requested...
						if(tag != '*' && tag.indexOf(e) < 0){
							return
						}
						exclusive[e] = (exclusive[e] || []).concat([k]) 
						rev_exclusive[k] = (rev_exclusive[k] || []).concat([e]) }) })
		return exclusive
	},

	// Build list of features in load order...
	//
	// 	.buildFeatureList()
	// 	.buildFeatureList('*')
	// 		-> data
	//
	// 	.buildFeatureList(feature-tag)
	// 		-> data
	//
	// 	.buildFeatureList([feature-tag, .. ])
	// 		-> data
	//
	// 	.buildFeatureList(.., filter)
	// 		-> data
	//
	//
	// Requirements:
	//	- features are pre-sorted by priority, original order is kept 
	//		where possible
	//	- a feature is loaded strictly after it's dependencies
	//	- features depending on inapplicable feature(s) are also 
	//		inapplicable (recursive up)
	//	- inapplicable features are not loaded
	//	- missing dependency -> missing dependency error
	//	- suggested features (and their dependencies) do not produce 
	//		dependency errors, unless explicitly included in dependency 
	//		graph (i.e. explicitly depended on by some other feature)
	//	- features with the same exclusive tag are grouped into an 
	//		exclusive set
	//	- only the first feature in an exclusive set is loaded, the rest
	//		are *excluded*
	//	- exclusive tag can be used to reference (alias) the loaded 
	//		feature in exclusive set (i.e. exclusive tag can be used as 
	//		a dependency)
	//
	// NOTE: an exclusive group name can be used as an alias.
	// NOTE: if an alias is used and no feature from that exclusive group
	// 		is explicitly included then the actual loaded feature will 
	// 		depend on the load order, which in an async world is not 
	// 		deterministic...
	//
	//
	// Algorithm:
	// 	- expand features:
	// 		- handle dependencies (detect loops)
	// 		- handle suggestions
	// 		- handle explicitly disabled features (detect loops)
	// 		- handle exclusive feature groups/aliases (handle conflicts)
	// 	- sort list of features:
	// 		- by priority
	// 		- by dependency (detect loops/errors)
	//
	//
	// Return format:
	// 	{
	//		// input feature feature tags...
	//		input: [ .. ],
	//
	//		// output list of feature tags...
	//		features: [ .. ],
	//
	//		// disabled features...
	//		disabled: [ .. ],
	//		// exclusive features that got excluded... 
	//		excluded: [ .. ],
	//
	//		// Errors...
	//		error: null | {
	//			// fatal/recoverable error indicator...
	//			fatal: bool,
	//
	//			// missing dependencies...
	//			// NOTE: this includes tags only included by .depends and 
	//			//		ignores tags from .suggested...
	//			missing: [ .. ],
	//
	//			// exclusive feature conflicts...
	//			// This will include the explicitly required conflicting
	//			// exclusive features.
	//			// NOTE: this is not an error, but indicates that the 
	//			//		system tried to fix the state by disabling all
	//			//		but the first feature.
	//			conflicts: {
	//				exclusive-tag: [ feature-tag, .. ],
	//				..
	//			},
	//
	//			// detected dependency loops (if .length > 0 sets fatal)...
	//			loops: [ .. ],
	//
	//			// sorting loop overflow error (if true sets fatal)...
	//			sort_loop_overflow: bool,
	//		},
	//
	//		// Introspection...
	//		// index of features and their list of dependencies...
	//		depends: {
	//			feature-tag: [ feature-tag, .. ],
	//			..
	//		},
	//		// index of features and list of features depending on them...
	//		// XXX should this include suggestions or should we do them 
	//		//		in a separate list...
	//		depended: { 
	//			feature-tag: [ feature-tag, .. ],
	//			..
	//		},
	// 	}
	//
	// XXX should exclusive conflicts resolve to first (current state)
	//		feature or last in an exclusive group???
	// XXX PROBLEM: exclusive feature trees should be resolved accounting 
	// 		feature applicablility...
	// 		...in this approach it is impossible...
	// 		...one way to fix this is to make this interactively check 
	// 		applicability, i.e. pass a context and check applicablility 
	// 		when needed...
	buildFeatureList: function(lst, isDisabled){
		var all = this.features
		lst = (lst == null || lst == '*') ? all : lst
		lst = lst.constructor !== Array ? [lst] : lst

		//isDisabled = isDisabled || function(){ return false }

		var that = this

		// Pre-sort exclusive feature by their occurrence in dependency
		// tree...
		//
		// NOTE: there can be a case when an exclusive alias is used but
		//		no feature in a group is loaded, in this case which 
		//		feature is actually loaded depends on the load order...
		var sortExclusive = function(features){
			var loaded = Object.keys(features)
			Object.keys(exclusive)
				.forEach(function(k){
					exclusive[k] = exclusive[k]
						.map(function(e, i){ return [e, i] })
						.sort(function(a, b){
							var i = loaded.indexOf(a[0])
							var j = loaded.indexOf(b[0]) 
							// keep the missing at the end...
							i = i < 0 ? Infinity : i
							j = j < 0 ? Infinity : j
							// NOTE: Infinity - Infinity is NaN, so we need 
							// 		to guard against it...
							return i - j || 0 })
						.map(function(e){ return e[0] }) })
		}

		// Expand feature references (recursive)...
		//
		// NOTE: closures are not used here as we need to pass different
		// 		stuff into data in different situations...
		var expand = function(target, lst, store, data, _seen){
			data = data || {}
			_seen = _seen || []

			// clear disabled...
			// NOTE: we do as a separate stage to avoid loading a 
			// 		feature before it is disabled in the same list...
			lst = data.disabled ?
				lst
					.filter(function(n){
						// feature disabled -> record and skip...
						if(n[0] == '-'){
							n = n.slice(1)
							if(_seen.indexOf(n) >= 0){
								// NOTE: a disable loop is when a feature tries to disable
								// 		a feature up in the same chain...
								// XXX should this break or accumulate???
								console.warn(`Disable loop detected at "${n}" in chain: ${_seen}`)
								var loop = _seen.slice(_seen.indexOf(n)).concat([n])
								data.disable_loops = (data.disable_loops || []).push(loop)
								return false
							}
							// XXX STUB -- need to resolve actual loops and 
							// 		make the disable global...
							if(n in store){
								console.warn('Disabling a feature after it is loaded:', n, _seen)
							}
							data.disabled.push(n)
							return false
						}
						// skip already disabled features...
						if(data.disabled.indexOf(n) >= 0){
							return false
						}
						return true
					})
				: lst

			// traverse the tree...
			lst
				// normalize the list -- remove non-features and resolve aliases...
				.map(function(n){ 
					var f = that[n]
					// exclusive tags...
					if(f == null && data.exclusive && n in data.exclusive){
						store[n] = null
						return false
					}
					// feature not defined or is not a feature...
					if(f == null){
						data.missing 
							&& data.missing.indexOf(n) < 0
							&& data.missing.push(n)
						return false
					}
					return n
				})
				.filter(function(e){ return e })

				// traverse down...
				.forEach(function(f){
					// dependency loop detection...
					if(_seen.indexOf(f) >= 0){
						var loop = _seen.slice(_seen.indexOf(f)).concat([f])
						data.loops 
							&& data.loops.push(loop)
						return
					}

					// skip already done features...
					if(f in store){
						return
					}

					//var feature = store[f] = that[f]
					var feature = that[f]
					if(feature){
						var _lst = []

						// merge lists...
						;(target instanceof Array ? target : [target])
							.forEach(function(t){
								_lst = _lst.concat(feature[t] || [])
							})
						store[f] = _lst 

						// traverse down...
						expand(target, _lst, store, data, _seen.concat([f]))
					}
				})

			return store
		}

		// Expand feature dependencies and suggestions recursively...
		//
		// NOTE: this relies on the following values being in the closure:
		// 		loops			- list of loop chains found
		// 		disable_loops	- disable loops
		// 							when a feature containing a disable 
		// 							directive gets disabled as a result
		// 		disabled		- list of disabled features
		// 		missing			- list of missing features
		// 		missing_suggested
		// 						- list of missing suggested features and
		// 							suggested feature dependencies
		// 		exclusive		- exclusive feature index
		// 		suggests		- index of feature suggestions (full)
		// 		suggested		- suggested feature dependency index
		// NOTE: the above containers will get updated as a side-effect.
		// NOTE: all of the above values are defined near the location 
		// 		they are first used/initiated...
		// NOTE: closures are used here purely for simplicity and conciseness
		// 		as threading data would not add any flexibility but make 
		// 		the code more complex...
		var expandFeatures = function(lst, features){
			features = features || {}

			// feature tree...
			var expand_data = {
				loops: loops, 
				disabled: disabled, 
				disable_loops: disable_loops, 
				missing: missing,
				exclusive: exclusive,
			}

			features = expand('depends', lst, features, expand_data)

			// suggestion list...
			//	...this will be used to check if we need to break on missing 
			//	features, e.g. if a feature is suggested we can silently skip 
			//	it otherwise err...
			//
			// NOTE: this stage does not track suggested feature dependencies...
			// NOTE: we do not need loop detection active here...
			var s = expand('suggested', Object.keys(features), {}, 
				{ 
					disabled: disabled,
					missing: missing_suggested,
				})
			s = Object.keys(s)
				.filter(function(f){ 
					// populate the tree of feature suggestions...
					suggests[f] = s[f]
					// filter out what's in features already...
					return !(f in features) })
			// get suggestion dependencies...
			// NOTE: we do not care bout missing here...
			s = expand('depends', s, {}, 
				{ 
					loops: loops, 
					disabled: disabled, 
					disable_loops: disable_loops, 
					exclusive: exclusive,
					missing: missing_suggested,
				})
			Object.keys(s)
				.forEach(function(f){ 
					// keep only suggested features -- diff with features...
					if(f in features){
						delete s[f]

					// mix suggested into features...
					} else {
						features[f] = s[f]
						suggested[f] = (s[f] || []).slice()
					}
				})

			sortExclusive(features)

			return features
		}


		//--------------------- Globals: filtering / exclusive tags ---

		var loops = []
		var disable_loops = []
		var disabled = []
		var missing = []
		var missing_suggested = []
		var suggests = {}
		var suggested = {}

		// user filter...
		// NOTE: we build this out of the full feature list...
		disabled = disabled
			.concat(isDisabled ? all.filter(isDisabled) : [])

		// build exclusive groups...
		// XXX need to sort the values to the same order as given features...
		var rev_exclusive = {}
		var exclusive = this.getExclusive('*', all, rev_exclusive, isDisabled)


		//-------------------------------- Stage 1: expand features ---
		var features = expandFeatures(lst)


		//-------------------------------- Exclusive groups/aliases ---
		// Handle exclusive feature groups and aliases...
		var conflicts = {}
		var done = []
		var to_remove = []
		Object.keys(features)
			.forEach(function(f){
				// alias...
				while(f in exclusive && done.indexOf(f) < 0){
					var candidates = (exclusive[f] || [])
						.filter(function(c){ return c in features })

					// resolve alias to non-included feature...
					if(candidates.length == 0){
						var target = exclusive[f][0]

						// expand target to features...
						expandFeatures([target], features)

					// link alias to existing feature...
					} else {
						var target = candidates[0]
					}

					// remove the alias...
					// NOTE: exclusive tag can match a feature tag, thus
					// 		we do not want to delete such tags...
					// NOTE: we are not removing to_remove here as they may
					// 		get added/expanded back in by other features...
					!(f in that)
						&& to_remove.push(f)
					// replace dependencies...
					Object.keys(features)
						.forEach(function(e){
							var i = features[e] ? features[e].indexOf(f) : -1
							i >= 0
								&& features[e].splice(i, 1, target)
						})
					f = target
					done.push(f)
				}
				
				// exclusive feature...
				if(f in rev_exclusive){
					// XXX handle multiple groups... (???)
					var group = rev_exclusive[f]
					var candidates = (exclusive[group] || [])
						.filter(function(c){ return c in features })

					if(!(group in conflicts) && candidates.length > 1){
						conflicts[group] = candidates
					}
				}
			})
		// cleanup...
		to_remove.forEach(function(f){ delete features[f] })
		// resolve any exclusivity conflicts found...
		var excluded = []
		Object.keys(conflicts)
			.forEach(function(group){
				// XXX should this resolve to the last of the first feature???
				excluded = excluded.concat(conflicts[group].slice(1))})
		disabled = disabled.concat(excluded)


		//--------------------------------------- Disabled features ---
		// Handle disabled features and cleanup...

		// reverse dependency index...
		// 	...this is used to clear out orphaned features later and for
		// 	introspection...
		var rev_features = {}
		Object.keys(features)
			.forEach(function(f){
				(features[f] || [])
					.forEach(function(d){ 
						rev_features[d] = (rev_features[d] || []).concat([f]) }) })

		// clear dependency trees containing disabled features...
		var suggested_clear = []
		do {
			var expanded_disabled = false
			disabled
				.forEach(function(d){ 
					// disable all features that depend on a disabled feature...
					Object.keys(features)
						.forEach(function(f){ 
							if(features[f]
									&& features[f].indexOf(d) >= 0
									&& disabled.indexOf(f) < 0){
								expanded_disabled = true
								disabled.push(f)
							}
						})

					// delete the feature itself...
					var s = suggests[d] || []
					delete suggests[d]
					delete features[d] 

					// clear suggested...
					s
						.forEach(function(f){
							if(disabled.indexOf(f) < 0 
									// not depended/suggested by any of 
									// the non-disabled features...
									&& Object.values(features)
										.concat(Object.values(suggests))
											.filter(n => n.indexOf(f) >= 0)
											.length == 0){
								expanded_disabled = true
								disabled.push(f)
							}
						})
				})
		} while(expanded_disabled)

		// remove orphaned features...
		// ...an orphan is a feature included by a disabled feature...
		// NOTE: this should take care of missing features too...
		Object.keys(rev_features)
			.filter(function(f){
				return rev_features[f]
					// keep non-disabled and existing sources only...
					.filter(function(e){ 
						return !(e in features) || disabled.indexOf(e) < 0 })
					// keep features that have no sources left, i.e. orphans...
					.length == 0 })
			.forEach(function(f){
				console.log('ORPHANED:', f)
				disabled.push(f)
				delete features[f]
			})


		//---------------------------------- Stage 2: sort features ---

		// Prepare for sort: expand dependency list in features... 
		//
		// NOTE: this will expand lst in-place...
		// NOTE: we are not checking for loops here -- mainly because
		// 		the input is expected to be loop-free...
		var expanddeps = function(lst, cur, seen){
			seen = seen || []
			if(features[cur] == null){
				return
			}
			// expand the dep list recursively...
			// NOTE: this will expand features[cur] in-place while 
			// 		iterating over it...
			for(var i=0; i < features[cur].length; i++){
				var f = features[cur][i]
				if(seen.indexOf(f) < 0){
					seen.push(f)

					expanddeps(features[cur], f, seen)

					features[cur].forEach(function(e){
						lst.indexOf(e) < 0
							&& lst.push(e)
					})
				}
			}
		}
		// do the actual expansion...
		var list = Object.keys(features)
		list.forEach(function(f){ expanddeps(list, f) })

		// sort by priority...
		//
		// NOTE: this will attempt to only move features with explicitly 
		// 		defined priorities and keep the rest in the same order 
		// 		when possible...
		list = list
			// format: 
			// 	[ <feature>, <index>, <priority> ]
			.map(function(e, i){ 
				return [e, i, (that[e] && that[e].getPriority) ? that[e].getPriority() : 0 ] })
			.sort(function(a, b){ 
				return a[2] - b[2] || a[1] - b[1] })
			// cleanup...
			.map(function(e){ return e[0] })
			// sort by the order features should be loaded...
			.reverse()

		// sort by dependency...
		//
		// NOTE: this requires the list to be ordered from high to low 
		// 		priority, i.e. the same order they should be loaded in...
		// NOTE: dependency loops will throw this into and "infinite" loop...
		var loop_limit = list.length + 1
		do {
			var moves = 0
			if(list.length == 0){
				break
			}
			list
				.slice()
				.forEach(function(e){
					var deps = features[e]
					if(!deps){
						return
					}
					var from = list.indexOf(e)
					var to = list
						.map(function(f, i){ return [f, i] })
						.slice(from+1)
						// keep only dependencies...
						.filter(function(f){ return deps.indexOf(f[0]) >= 0 })
						.pop()
					if(to){
						// place after last dependency...
						list.splice(to[1]+1, 0, e)
						list.splice(from, 1)
						moves++
					}
				})
			loop_limit--
		} while(moves > 0 && loop_limit > 0)


		//-------------------------------------------------------------

		// remove exclusivity tags that were resolved...
		var isMissing = function(f){
			return !(
				// feature is a resolvable exclusive tag...
				(exclusive[f] || []).length > 0 
				// feature was resolved...
				&& exclusive[f]
					.filter(function(f){ return list.indexOf(f) >= 0 })
					.length > 0) }
		
		return {
			input: lst,

			features: list,

			disabled: disabled,
			excluded: excluded,

			// errors and conflicts...
			error: (loops.length > 0 
					|| Object.keys(conflicts).length > 0 
					|| loop_limit <= 0 
					|| missing.length > 0
					|| missing_suggested.length > 0) ?
				{
					missing: missing.filter(isMissing),
					missing_suggested: missing_suggested.filter(isMissing),
					conflicts: conflicts,

					// fatal stuff...
					fatal: loops.length > 0 || loop_limit <= 0,
					loops: loops,
					sort_loop_overflow: loop_limit <= 0,
				}
				: null,

			// introspection...
			depends: features,
			depended: rev_features,
			suggests: suggests,
			suggested: suggested,
			//exclusive: exclusive,
		}
	},

	// Setup features...
	//
	//	Setup features on existing actions object...
	//	.setup(actions, [feature-tag, ...])
	//		-> actions
	//
	//	Setup features on a new actions object...
	//	.setup(feature-tag)
	//	.setup([feature-tag, ...])
	//		-> actions
	//
	//
	// This will set .features on the object.
	//
	// .features format:
	// 	{
	// 		// the current feature set object...
	// 		// XXX not sure about this -- revise...
	// 		FeatureSet: feature-set,
	//
	// 		// list of features not applicable in current context...
	// 		//
	// 		// i.e. the features that defined .isApplicable(..) and it 
	// 		// returned false when called.
	// 		unapplicable: [ feature-tag, .. ],
	//
	// 		// output of .buildFeatureList(..)...
	// 		...
	// 	}
	//
	// NOTE: this will store the build result in .features of the output 
	// 		actions object.
	// NOTE: .features is reset even if a FeatureLinearizationError error
	// 		is thrown.
	setup: function(obj, lst){
		// no explicit object is given...
		if(lst == null){
			lst = obj
			obj = null
		}
		obj = obj || (this.__actions__ || actions.Actions)()
		lst = lst instanceof Array ? lst : [lst]

		var unapplicable = []
		var features = this.buildFeatureList(lst, 
			(function(n){
				// if we already tested unapplicable, no need to test again...
				if(unapplicable.indexOf(n) >= 0){
					return true
				}
				var f = this[n]
				// check applicability if possible...
				if(f && f.isApplicable && !f.isApplicable.call(this, obj)){
					unapplicable.push(n)
					return true
				}
				return false
			}).bind(this)) 
		features.unapplicable = unapplicable 
		// cleanup disabled -- filter out unapplicable and excluded features...
		// NOTE: this is done mainly for cleaner and simpler reporting 
		// 		later on...
		features.disabled = features.disabled
			.filter(function(n){ 
				return unapplicable.indexOf(n) < 0 
					&& features.excluded.indexOf(n) < 0 })

		// if we have critical errors and set verbose...
		var fatal = features.error 
			&& (features.error.loops.length > 0 || features.error.sort_loop_overflow)

		// report stuff...
		if(this.__verbose__){
			var error = features.error
			// report dependency loops...
			error.loops.length > 0
				&& error.loops
					.forEach(function(loop){
						console.warn('Feature dependency loops detected:\n\t' 
							+ loop.join('\n\t\t-> ')) })
			// report conflicts...
			Object.keys(error.conflicts)
				.forEach(function(group){
					console.error('Exclusive "'+ group +'" conflict at:', error.conflicts[group]) })
			// report loop limit...
			error.sort_loop_overflow
				&& console.error('Hit loop limit while sorting dependencies!')
		}

		features.FeatureSet = this

		obj.features = features

		// fatal error -- can't load...
		if(fatal){
			throw new FeatureLinearizationError(features)
		}

		// do the setup...
		var that = this
		var setup = Feature.prototype.setup
		features.features.forEach(function(n){
			// setup...
			if(that[n] != null){
				this.__verbose__ && console.log('Setting up feature:', n)
				setup.call(that[n], obj)
			}
		})

		return obj
	},

	// XXX revise...
	// 		...the main problem here is that .mixout(..) is accesible 
	// 		directly from actions while the feature .remove(..) method
	// 		is not...
	// 		...would be nice to expose the API to actions directly or 
	// 		keep it only in features...
	remove: function(obj, lst){
		lst = lst.constructor !== Array ? [lst] : lst
		var that = this
		lst.forEach(function(n){
			if(that[n] != null){
				console.log('Removing feature:', n)
				that[n].remove(obj) } }) },


	// Generate a Graphviz graph from features...
	//
	// XXX experimental...
	gvGraph: function(lst, dep){
		lst = lst || this.features
		dep = dep || this

		var graph = ''
		graph += 'digraph ImageGrid {\n'
		lst
			.filter(function(f){ return f in dep })
			.forEach(function(f){
				var deps = dep[f].depends || []

				deps.length > 0 ?
					deps.forEach(function(d){
						graph += `\t"${f}" -> "${d}";\n` })
					: (graph += `\t"${f}";\n`)
			})
		graph += '}'

		return graph
	},
})




/*********************************************************************/
// default feature set...

var Features =
module.Features = new FeatureSet()




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
