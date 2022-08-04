/**********************************************************************
* 
*
* Architecture:
* 	store
* 	page
* 	renderer
*
*
* XXX ROADMAP:
* 	- run in browser
* 	- test localStorage / sessionStorage
* 	- test pouch
* 	- move the bootstrap over
* 	- test pwa
* 	- archive old code
* 	- update docs
* 	- refactor and cleanup
* 	- pack as electron app (???)
*
*
* XXX weaknesses to review:
* 		- <store>.paths() as an index...
* 			+ decouples the search logic from the store backend
* 			- requires the whole list of pages to be in memory
* 				...need to be independent of the number of pages if at 
* 				all possible -- otherwise this will hinder long-term use...
* 		- 
*
*
* TODO:
* 	- <page>.then() -- resolve when all pending write operations done ???
* 	- an async REPL???
*
*
*
***********************************************************************
*
* XXX might be a good idea to try signature based security:
* 		- sign changes
* 		- sign sync session
* 		- refuse changes with wrong signatures
* 		- public keys available on client and on server
* 			- check signatures localy
* 			- check signatures remotely
* 		- private key available only with author
* 		- keep both the last signed and superceding unsigned version
* 		- on sync ask to overwrite unsigned with signed
* 		- check if we can use the same mechanics as ssh...
* 		- in this view a user in the system is simply a set of keys and 
* 			a signature (a page =))
*
* XXX pages into lib/page ???
*
* XXX add action to reset overloaded (bootstrap) pages...
* 		- per page
* 		- global
*
* XXX need to think about search -- page function argument syntax???
*
* XXX might need to get all the links (macro-level) from a page...
* 		...would be useful for caching...
*
* XXX .__paths__(..) may be a bottleneck...
* 		need to either think of a way around it or cache the path index
* 		in a sync way...
*
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

// XXX
//var object = require('lib/object')
var object = require('ig-object')
var types = require('ig-types')

var pwpath = require('./lib/path')
var page = require('./page')

var basestore = require('./store/base')

//var localstoragestore = require('./store/localstorage')
// XXX for some reason this does not run quietly in browser
//var pouchdbstore = require('./store/pouchdb')
//var filestore = require('./store/file')



//---------------------------------------------------------------------
// Basic setup...
//
//
// Store topology:
// 		
// 		root (BaseStore) ---next--- main (MetaStore)
// 										|
// 										+-- System/... (BaseStore)
//
// Alternative store topology:
//
// 		root (BaseStore) ---next--- main (MetaStore)
// 			System/... (static)
//
//

var store = 
module.store = 
	//BaseStore.nest()
	// XXX clone...
	{ __proto__: basestore.BaseStore }
		.nest({ __proto__: basestore.MetaStore })


var System = 
module.System = {
	// base templates...
	//
	_text: { 
		text: '<macro src="." join="\n">@source(.)</macro>' },
	NotFound: { 
		text: page.PAGE_NOT_FOUND
			.replace('$PATH', '@source(./path)') },

	// XXX tests...
	test_list: function(){
		return 'abcdef'.split('') },

	// metadata...
	//
	path: function(){
		return this.get('..').path },
	location: function(){
		return this.get('..').path },
	dir: function(){
		return this.get('..').dir },
	name: function(){
		return this.get('..').name },
	ctime: function(){
		return this.get('..').data.ctime },
	mtime: function(){
		return this.get('..').data.mtime },

	// XXX this can be a list for pattern paths...
	resolved: function(){
		return this.get('..').resolve() },

	title: function(){
		var p = this.get('..')
		return p.title 
			?? p.name },


	// utils...
	//
	// XXX System/subpaths
	// XXX
	links: function(){
		// XXX
		return '' },
	// XXX links to pages...
	to: function(){
		return (this.get('..').data || {}).to ?? [] },
	// XXX pages linking to us...
	'from': function(){
		return (this.get('..').data || {})['from'] ?? [] },


	// actions...
	//
	delete: function(){
		this.location = '..'
		this.delete()
		return this.text },
	// XXX System/back
	// XXX System/forward
	// XXX System/sort
	// XXX System/reverse
}


// XXX note sure how to organize the system actions -- there can be two 
// 		options:
// 			- a root ram store with all the static stuff and nest the rest
// 			- a nested store (as is the case here)
// XXX nested system store...
store.update('System', 
	Object.create(basestore.BaseStore).load(System))


// NOTE: in general the root wiki api is simply a page instance.
// XXX not yet sure how to organize the actual client -- UI, hooks, .. etc
var pwiki =
module.pwiki = 
	page.Page('/', '/', store)


//---------------------------------------------------------------------
// comandline...

if(typeof(__filename) != 'undefined'
		&& __filename == (require.main || {}).filename){



}



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
