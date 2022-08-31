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

var pwpath = require('../path')

var base = require('./base')


//---------------------------------------------------------------------

// XXX EXPERIMENTAL, needs testing in browser...
var localStorageStore =
module.localStorageStore = {
	__proto__: base.Store,
	__prefix__: '--pwiki:',

	// XXX add caching of unserialized data???
	data:
		typeof(localStorage) != 'undefined' ?
			localStorage
			: undefined,
	
	__paths__: function(){
		var that = this
		return Object.keys(this.data)
			.map(function(k){ 
				return k.startsWith(that.__prefix__) ?
					k.slice((that.__prefix__ ?? '').length) 
					: [] }) 
			.flat() },
	__exists__: function(path){
		return ((this.__prefix__ ?? '')+ path) in this.data 
			&& path },
	__get__: function(path){
		path = (this.__prefix__ ?? '')+ path
		return path in this.data ?
			JSON.parse(this.data[path]) 
			: undefined },
	__update__: function(path, data={}){
		this.data[(this.__prefix__ ?? '')+ path] = 
			JSON.stringify(data) },
	__delete__: function(path){
		delete this.data[(this.__prefix__ ?? '')+ path] },

	clear: function(){
		for(var e in this.data){
			if(e.startsWith(this.__prefix__)){
				delete this.data[e] } } 
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
