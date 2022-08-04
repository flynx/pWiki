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

var pwpath = require('./lib/path')
var page = require('./page')

var basestore = require('./store/base')
var localstoragestore = require('./store/localstorage')

var pouchdbstore = require('./store/pouchdb')

// XXX this fails silently in browser...
//var bootstrap = require('./bootstrap')


//---------------------------------------------------------------------

var store = 
module.store = 
	{ __proto__: basestore.BaseStore }
		.nest({ __proto__: basestore.MetaStore })

store.update('System', 
	Object.create(basestore.BaseStore).load(page.System))

var pwiki =
module.pwiki = 
	page.Page('/', '/', store)


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
