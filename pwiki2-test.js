/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var pwiki = require('./pwiki2')

// XXX for some reason this does not run quietly in browser
var pouchdbstore = require('./store/pouchdb')
// XXX need to prevent this from breaking in browser...
var filestore = require('./store/file')

// XXX this fails silently in browser...
var bootstrap = require('./bootstrap')


//---------------------------------------------------------------------

/*/ // XXX chained system store...
store.next.load(
	// Create a new system action-set with paths starting with 'System/'
	Object.entries(System)
		.reduce(function(res, [key, func]){
			res[pwpath.join('System', key)] = func
			return res }, {}))
//*/

pwiki.store.update('@file-ro', {
	__proto__: filestore.FileStoreRO,
	__path__: 'bootstrap',
})

pwiki.store.update('@file', {
	__proto__: filestore.FileStore,
	__path__: 'data/fs',
})

pwiki.store.update('@pouch', {
	__proto__: pouchdbstore.PouchDBStore,
	__path__: 'data/pouch',
})


//---------------------------------------------------------------------
// XXX experiments and testing...

// XXX for persistent stores test if the data is already loaded here...
//pwiki.store.load(bootstrap)


// XXX TEST...
// XXX add filter tests...
pwiki.pwiki
	.update({
		location: '/test/a',
		text: 'a',
	})
	.update({
		location: '/test/b',
		text: 'b',
	})
	.update({
		location: '/test/c',
		text: 'c',
	})
	.update({
		location: '/test/c/x',
		text: 'x',
	})
	.update({
		location: '/test/c/y',
		text: 'y',
	})
	.update({
		location: '/test/d/z',
		text: 'z',
	})
	.update({
		location: '/page',
		text: 'PAGE\n'
			+'\n'
			+'@include(/test recursive="Recursion type 2 (<now/>)")\n'
			+'\n'
			+'@slot(name=b text="filled slot")\n',
	})
	.update({
		location: '/other',
		text: 'OTHER',
	})
	.update({
		location: '/test',
		text: 'TEST\n'
			+'\n'
			+'globally filtered test text...\n'
			+'\n'
			+'<filter -test>...unfiltered test text</filter>\n'
			+'\n'
			//+'<filter test>locally filtered test text</filter>\n'
			+'\n'
			+'@slot(name=a text="non-filled slot")\n'
			+'\n'
			+'@slot(name=b text="non-filled slot")\n'
			+'\n'
			+'Including /other #1: @include(/other)\n'
			//+'Including /other #2: @include(/other)\n'
			+'\n'
			+'Including /test: @include(/test recursive="Recursion type 1 (<now/>)")\n'
			+'\n'
			+'Including /page: @include(/page recursive="...")\n'
			+'\n'
			+'Including /: \\@include(/)\n'
			+'\n'
			+'@filter(test)',
	})
//*/


module.pwiki = pwiki.pwiki



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
