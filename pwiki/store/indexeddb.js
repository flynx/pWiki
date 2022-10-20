/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var idb = require('idb-keyval')

var object = require('ig-object')
var types = require('ig-types')

var pwpath = require('../path')

var base = require('./base')


//---------------------------------------------------------------------

// XXX EXPERIMENTAL, needs testing in browser...
var IndexedDBStore =
module.IndexedDBStore = {
	__proto__: base.Store,

	__db__: 'pwiki',
	__store__: 'pages',

	// XXX add caching of unserialized data???
	//__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data = idb.createStore(this.__db__, this.__store__)) },
	
	// XXX INDEX...
	__xpaths__: function(){
		return idb.keys(this.data) },

	__paths__: function(){
		return idb.keys(this.data) },
	__exists__: function(path){
		return idb.get(path, this.data) !== undefined
			&& path },
	__get__: function(path){
		return idb.get(path, this.data) },
	// XXX should this use idb.update(..) ???
	__update__: function(path, data={}){
		// XXX we seem to have some trouble caching things...
		return idb.set(path, data, this.data) },
		/*/
		return idb.update(path, 
			function(value){ 
				return data }, 
			this.data) },
		//*/
	__delete__: function(path){
		idb.del(path, this.data)
		return this },

	clear: function(){
		idb.clear(this.data)
		return this },
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

// XXX
var localStorageNestedStore =
module.localStorageNestedStore = {
	__proto__: base.BaseStore,
	__data__: '__pwiki_data__',
	__cache__: '__pwiki_cache__',

	__data: undefined,
	get data(){
		return this.__data 
			?? (this.__data =
				Object.assign(
					{ __proto__: JSON.parse(localStorage[this.__data__] || '{}') },
					JSON.parse(localStorage[this.__cache__] || '{}') )) },

	// XXX do partials saves -> cache + write cache...
	// XXX on full save merge cache and save...
}




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
