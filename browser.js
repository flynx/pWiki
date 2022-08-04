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

var basestore = require('./store/base')
var localstoragestore = require('./store/localstorage')

// XXX for some reason this does not run quietly in browser
//var pouchdbstore = require('./store/pouchdb')

// XXX this fails silently in browser...
//var bootstrap = require('./bootstrap')



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
