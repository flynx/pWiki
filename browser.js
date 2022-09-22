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

var pwpath = require('./pwiki/path')
var page = require('./pwiki/page')

var basestore = require('./pwiki/store/base')
var localstoragestore = require('./pwiki/store/localstorage')

var pouchdbstore = require('./pwiki/store/pouchdb')

// XXX this fails silently in browser...
//var bootstrap = require('./bootstrap')


//---------------------------------------------------------------------

var store = 
/* XXX the store cache is not working correctly yet -- should be global 
// 		and not local to a specific store...
// 		...i.e. likely like MetaStore, it should be Level-2...
module.store = object.mixin({ 
	__proto__: localstoragestore.localStorageStore,
	__prefix__: '--pwiki-root:',
	data: localStorage,
	next: { __proto__: basestore.Store },
}, basestore.CachedStoreMixin)
/*/
module.store = { 
	__proto__: localstoragestore.localStorageStore,
	__prefix__: '--pwiki-root:',
	data: localStorage,
	next: { __proto__: basestore.Store },
}
//*/

module.setup = 
Promise.all([
	// static stores...
	//
	//store.next.update('System', 
	store.next.update(
		pwpath.sanitize(pwpath.SYSTEM_PATH),
		Object.create(basestore.BaseStore).load(page.System)),
	store.next.update('.templates',
		Object.create(basestore.BaseStore).load(page.Templates)),
	store.update('.config', 
		Object.create(basestore.BaseStore).load(page.Config)),

	store.update('Test', 
		Object.create(basestore.BaseStore).load(page.Test)),

	// persistent stores...
	//
	store.update('@local', {
		__proto__: localstoragestore.localStorageStore,
		data: localStorage,
	}),
	store.update('@session', {
		__proto__: localstoragestore.localStorageStore,
		data: sessionStorage,
	}),
	store.update('@pouch', {
		__proto__: pouchdbstore.PouchDBStore,
	}),

	/*/ XXX next testing...
	store.next.update('NextPage', {
		text: 'next page...',
	}),
	store.next.update('Next', {
		__proto__: localstoragestore.localStorageStore,
		__prefix__: '--pwiki-next:',
		data: localStorage,
	}),
	store.next.update('Next/Test', { 
		text: 'next test..'
	}),
	// XXX not sure of we need this to work...
	store.next.update('System/NextTest', { 
		text: 'next test..'
	}),
	//*/
])
// XXX
//typeof(Bootstrap) != 'undefined'
//	&& pwiki.store.load(Bootstrap)



var pwiki =
module.pwiki = 
	// XXX
	//page.Page('/', '/', store)
	page.pWikiPageElement('/', '/', store)



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
