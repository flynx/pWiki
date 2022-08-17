/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')

var pwiki = require('./pwiki2')
module.path = pwiki.path

// XXX for some reason this does not run quietly in browser
var pouchdbstore = require('./pwiki/store/pouchdb')
// XXX need to prevent this from breaking in browser...
var filestore = require('./pwiki/store/file')

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

module.setup = 
Promise.all([
	pwiki.store.update('@file-ro', {
		__proto__: filestore.FileStoreRO,
		__path__: 'bootstrap',
	}),
	pwiki.store.update('@file', {
		__proto__: filestore.FileStore,
		__path__: 'data/fs',
	}),
	pwiki.store.update('@pouch', {
		__proto__: pouchdbstore.PouchDBStore,
		__path__: 'data/pouch',
	}),
])


//---------------------------------------------------------------------
// XXX experiments and testing...

// XXX for persistent stores test if the data is already loaded here...
//pwiki.store.load(bootstrap)


// XXX TEST...
// XXX add filter tests...
pwiki.pwiki
	.update({
		location: '/test/markdown',
		text: object.doc`
		some text with inline @source(./path) macros...

		@filter(markdown)` })
	.update({
		location: '/test/recursion',
		text: object.doc` @include(.) ` })
	.update({
		location: '/test/recursionA',
		text: object.doc` @include(../recursionB) ` })
	.update({
		location: '/test/recursionB',
		text: object.doc` @include(../recursionA) ` })
	.update({
		location: '/test/recursionC',
		text: object.doc` @include(recursionC) ` })
	.update({
		location: '/test/sort/*',
		order: ['a', 'c', 'b'], })
	.update({
		location: '/test/sort/a',
		text: 'a', })
	.update({
		location: '/test/sort/b',
		text: 'b', })
	.update({
		location: '/test/sort/c',
		text: 'c', })
	.update({
		location: '/test/comments',
		text: object.doc`
		<!--[pWiki[ This text should be visible... ]]-->

		<!--[pWiki[
			This text should be visible too... 
		]]-->

		<pwiki-comment>
			And this should not be visible...
		</pwiki-comment>
		`,
	})
	.update({
		location: '/test/test',
		text: 'test', })
	.update({
		location: '/test/filter',
		text: object.doc`
		Should be: AAAAaaaaAAAAaaaa : test<filter -test>test</filter>@include(../test)@include(../test isolated)
		@filter(test)
		`, })
	.update({
		location: '/test/filter-local',
		text: object.doc`
		Should be: aaaaAAAAaaaa : test<filter test>test</filter>test
		`, })
	.update({
		location: '/test/filter-isolated',
		text: object.doc`
		Should be: AAAAaaaaAAAA : test<filter isolated>test</filter>test
		@filter(test)
		`, })
	.update({
		location: '/test/quote',
		text: object.doc`
			Inline quoted text:
			---
			<quote>
				this test should not get expanded: @now()
			</quote>
			---

			Included quoted text:
			---
			<quote src="/test/slots"/>
			---

			Quote filters:
			---
			<quote filter="quote-tags test">
				test <now />...
			</quote>
			---
		`, })
	// XXX BUG: this prints '' for each <quote>
	.update({
		location: '/test/macro-quote',
		text: object.doc`
		Outside of macro:
		<quote src="/test/a"/>

		In macro:
		<macro src="/test/*/path" join="\n">-- <quote src="/test/a"/></macro>
		`, })
	.update({
		location: '/test/wikiword',
		text: object.doc`
			This is a basic WikiWord test, all  
			the [basic] forms and Versions of  
			/inline/links.

			@filter(wikiword markdown) `, })
	.update({
		location: '/test/slot',
		text: object.doc`
			Testing slot mechanics...

			This slot is (<slot name="empty">unfilled</slot>)

			...while this (<slot name="non-empty">text should be replaced...</slot>)

			<slot name="non-empty">text is filling a slot</slot>
		`, })
	.update({
		location: '/test/slots',
		text: object.doc`
			<slot name="slot">unfilled</slot>

			<slot name="slot">filled</slot>

			<slot name="slot">refilled</slot> `, })
	.update({
		location: '/test/nestedslots',
		text: object.doc`
			<slot name="slot">
				unfilled
				<slot name="slot">
					filled
					<slot name="slot">
						refilled
					</slot>
				</slot>
			</slot> `, })
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
		text: '>>> PAGE\n'
			+'\n'
			+'@include(/test recursive="Recursion type 2 (<now/>)")\n'
			+'\n'
			+'@slot(name=b text="filled slot")\n'
			+ '<<< PAGE\n',
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
			// XXX this does not seem to work...
			+'<filter -test>...unfiltered test text</filter>\n'
			+'\n'
			//+'<filter test>locally filtered test text</filter>\n'
			+'\n'
			// XXX slots do not seem to work...
			+'@slot(name=a text="non-filled slot a")\n'
			+'\n'
			+'@slot(name=b text="non-filled slot b")\n'
			+'\n'
			+'Including /other #1: @include(/other)\n'
			+'Including /other #2: @include(/other)\n'
			+'\n'
			+'Including /test: @include(/test recursive="Recursion type 1 (<now/>)")\n'
			+'\n'
			+'Including /page: @include(/page recursive="...")\n'
			+'\n'
			+'Sourceing /: \\@include(/)\n'
			+'\n'
			// XXX slots do not seem to work...
			+'<slot name="a">filled slot a</slot>\n'
			+'\n'
			+'@filter(test)',
	})
//*/


module.pwiki = pwiki.pwiki



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
