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

// Wrap .map(..) / .filter(..) / .reduce(..) / .. to support STOP...
// 
// NOTE: internally these are implemented as for-of loops (./generator.js)
var stoppableSet = function(iter){
	return function(func){
		return new Set([...this][iter](...arguments)) } }
var stoppableValue = function(iter, no_return=false){
	return function(func){
		var res = [...this][iter](...arguments) 
		return no_return ?
			undefined
			: res } }



//---------------------------------------------------------------------

var SetProtoMixin =
module.SetProtoMixin =
object.Mixin('SetMixin', 'soft', {
	iter: function*(){
		for(var e of this){
			yield e } },

	// Set set operation shorthands...
	unite: function(other=[]){ 
		return new Set([...this, ...other]) },
	intersect: function(other){
		var test = other.has ?  
			'has' 
			: 'includes'
		return new Set([...this]
			.filter(function(e){ 
				return other[test](e) })) },
	subtract: function(other=[]){
		other = new Set(other)
		return new Set([...this]
			.filter(function(e){ 
				return !other.has(e) })) },

	sort: function(values=[]){
		values = (typeof(values) == 'function' 
				|| values === undefined) ?
			[...this].sort(values)
			: values
		var del = this.delete.bind(this)
		var add = this.add.bind(this)
		new Set([...values, ...this])
			.forEach(function(e){
				if(this.has(e)){
					del(e)
					add(e) } }.bind(this))
		return this },

	replace: function(old, value, ordered=true){
		// nothing to do...
		if(!this.has(old) || old === value){
			return this }
		if(ordered){
			var order = [...this]
			// XXX is this fast enough???
			order[order.lastIndexOf(old)] = value }
		// replace...
		this.delete(old)
		this.add(value)
		ordered
			&& this.sort(order)
		return this },
	// NOTE: if index is <0 then the value is prepended to the set, if 
	// 		it's >=this.size then the value will be appended.
	// 		if ordered is set to false in both cases the value is appended.
	// XXX should this be implemented via .splice(..) ???
	replaceAt: function(index, value, ordered=true){
		// append...
		if(index >= this.size){
			this.add(value)
			return this }
		// prepend...
		if(index < 0){
			index = 0
			var order = [, ...this]
		// replace...
		} else {
			var order = [...this]
			var old = order[index] 
			// nothing to do...
			if(old === value){
				return this } }
		ordered
			&& (order[index] = value)

		// replace...
		this.has(old)
			&& this.delete(old)
		this.add(value)

		ordered
			&& this.sort(order)
		return this },

	// XXX do we need this???
	// 		...should this be enough???
	// 			new Set([...set].splice(..))
	splice: function(from, count, ...items){
		var that = this
		var order = [...this]
		var removed = order.splice(...arguments)

		// update the set...
		removed.forEach(this.delete.bind(this))
		items.forEach(this.add.bind(this))
		this.sort(order) 

		return removed },

	filter: stoppableSet('filter'),
	map: stoppableSet('map'),
	reduce: stoppableValue('reduce'),
	reduceRight: stoppableValue('reduceRight'),
	forEach: stoppableValue('map', true),
})


SetProtoMixin(Set.prototype)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
