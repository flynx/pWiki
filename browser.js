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
module.store = 
	{ __proto__: basestore.BaseStore }
		.nest({ __proto__: basestore.MetaStore })

store.update('System', 
	Object.create(basestore.BaseStore).load(page.System))
store.update('Settings', 
	Object.create(basestore.BaseStore).load(page.Settings))

var pwiki =
module.pwiki = 
	// XXX
	//page.Page('/', '/', store)
	page.pWikiPageElement('/', '/', store)


pwiki.store.update('@local', {
	__proto__: localstoragestore.localStorageStore,
	data: localStorage,
})

pwiki.store.update('@session', {
	__proto__: localstoragestore.localStorageStore,
	data: sessionStorage,
})

pwiki.store.update('@pouch', {
	__proto__: pouchdbstore.PouchDBStore,
})


// XXX
typeof(Bootstrap) != 'undefined'
	&& pwiki.store.load(Bootstrap)



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
