/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')
var types = require('ig-types')

var pwpath = require('../lib/path')
var base = require('../store/base')

var pouchdb = require('pouchdb')


//---------------------------------------------------------------------

var PouchDBStore =
module.PouchDBStore = {
	__proto__: base.BaseStore,

	// XXX should this be __path__???
	// 		...this sets the path where the store is created...
	__path__: 'data/pouch',
	__key_prefix__: 'pwiki:',

	__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data = new pouchdb.PouchDB(this.__path__)) },
	set data(value){
		this.__data = value },

	// XXX cache???
	__paths__: async function(){
		var that = this
		// XXX not sure if this is a good idea...
		return (await this.data.allDocs()).rows
			.map(function(e){ 
				return e.id.slice(that.__key_prefix__.length) }) },
	// XXX use an index...
	__exists__: async function(key){
		return !!(await this.__get__(key)) 
			&& key },
	__get__: async function(key){
		try{
			return await this.data.get(this.__key_prefix__ + key) 
		}catch(err){
			return undefined } },
	__update__: async function(key, data, mode='update'){
		var {_id, _rev, ...rest} = await this.__get__(key) ?? {}
		await this.data.put({
			// original data...
			...( (mode == 'update') ?
				rest
				: {}),
			// new data...
			...data,
			// system...
			_id: _id 
				?? (this.__key_prefix__ + key),
			...(_rev ? 
				{_rev} 
				: {}),
		})
		return this },
    __delete__: async function(key){
		var doc = await this.__get__(key)
		doc 
			&& (await this.data.remove(doc))
		return this },
}




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
