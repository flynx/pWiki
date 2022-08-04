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


var MapProtoMixin =
module.MapProtoMixin =
object.Mixin('MapProtoMixin', 'soft', {
	iter: function*(){
		for(var e of this){
			yield e } },

	// NOTE: we do not touch .__keys here as no renaming is ever done...
	//
	// XXX this essentially rewrites the whole map, is there a faster/better 
	// 		way to do this???
	// 		...one way would be to decouple order from the container, i.e.
	// 		store the order in a separate attr/prop but this would require
	// 		a whole new set of ordered "type" that would overload every single
	// 		iteration method, not sure if this is a good idea untill we 
	// 		reach a state whe JS "shuffles" (index-orders) its containers 
	// 		(a-la Python)
	sort: function(keys){
		keys = (typeof(keys) == 'function' 
				|| keys === undefined) ?
			[...this.keys()].sort(keys)
			: keys
		var del = this.delete.bind(this)
		var set = this.set.bind(this)
		new Set([...keys, ...this.keys()])
			.forEach(function(k){
				if(this.has(k)){
					var v = this.get(k)
					del(k)
					set(k, v) } }.bind(this))
		return this },

	replaceKey: function(old, key, ordered=true){
		if(!this.has(old)){
			return this }
		if(ordered){
			var order = [...this.keys()]
			order[order.lastIndexOf(old)] = key }
		// replace...
		var value = this.get(old)
		this.delete(old)
		this.set(key, value)
		ordered
			&& this.sort(order)
		return this },
})


MapProtoMixin(Map.prototype)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
