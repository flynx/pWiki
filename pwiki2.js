/**********************************************************************
* 
*
* XXX shoul Doc/About be found from both / and /WikiHome???
*		...currently / + Doc/About reolves correctly while
* 		/WikiHome + Doc/About is not found...
* 		...this is a questions of subpath search, i.e. when we do not 
* 		find "About" should we search for Doc/About and so on...
* XXX wikiword filter seems to act up on /
* XXX BUG? /test/wikiword -- produces nested links...
*
*
* XXX ROADMAP:
* 	- run in browser
* 		- basics, loading 							-- DONE
* 		- test localStorage / sessionStorage 		-- DONE
* 		- test pouch								-- DONE
* 		- render page								-- DONE
* 		- navigation
* 			- hash/anchor							-- DONE
* 			- service worker
* 				...handle relative urls (???)
* 		- editor and interactivity
* 		- migrate bootstrap
* 		- store topology
* 	- WikiWord										-- DONE
* 	- markdown										-- DONE??
* 	- pwa
* 	- cli
* 		- basic wiki manipulations (1:1 methods)
* 		- import/export/sync
* 		- introspection/repl
* 	- archive old code
* 	- update docs
* 	- refactor and cleanup
* 		- module structure							-- DONE
* 	- pack as electron app (???)
*
*
*
* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*
* Architecture:
* 	store
* 	page
* 	renderer
*
* Modules:
* 	page				- base pages and page APIs (XXX should this be in lib???)
* 	parser				- pWiki macro parser (XXX should this be in lib???)
* 	store				- stores
* 		base			- memory store and store utils
*		file			- file storage
*		localstorage	- localStorage / sessionStorage stores
*		pouchdb			-
* 		...
* 	filter				- page filters
* 		base			- base filters incl. wikiword
* 		markdown		- markdown renderer
* 		...
* 	pwiki2				- main cli / node entry point
* 	browser				- browser entry point
* 	pwiki2-test			- testing and experimenting (XXX move to test.js)
*
*
* Q: can we make this a single module with +/- some plugins??
* 	...this would make things quite a bit simpler but will negate the 
* 	use of high level libs like types...
*
*
* XXX weaknesses to review:
* 		- <store>.paths() as an index...
* 			+ decouples the search logic from the store backend
* 			- requires the whole list of pages to be in memory
* 				...need to be independent of the number of pages if at 
* 				all possible -- otherwise this will hinder long-term use...
* 		- 
* TODO:
* 	- <page>.then() -- resolve when all pending write operations done ???
* 	- an async REPL???
* 	- custom element???
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

var pwpath = 
module.path =
	require('./pwiki/path')
var page = require('./pwiki/page')

var basestore = require('./pwiki/store/base')

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


// XXX note sure how to organize the system actions -- there can be two 
// 		options:
// 			- a root ram store with all the static stuff and nest the rest
// 			- a nested store (as is the case here)
// XXX nested system store...
store.update('System', 
	Object.create(basestore.BaseStore).load(page.System))


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
