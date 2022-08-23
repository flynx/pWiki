/**********************************************************************
* 
*
* XXX CACHE match pattern paths -- to catch page creation...
* 		1) explicit subpath matching -- same as .match(..)
* 		2) identify recursive patterns -- same as **
* XXX CACHE track store changes...
* XXX CACHE/DEPENDS might be a good idea to add a dependencyUpdated event...
* 		...and use it for cache invalidation...
* XXX CACHE creating a new page does not invalidate /tree cache...
* XXX OPTIMIZE: the actions that depend on lots of tiny requests (/tree)
* 		can get really slow...
* 		...it feels like one reason is the async/await ping-pong...
* 		problems:
* 			- too many async requests
* 				micro cache?
* 				pack requests?
* 			- redundant path normalization (RENORMALIZE)
* 				mark the normalized string and return it as-is on 
* 				renormalization...
* 				...initial experiment made things slower...
* XXX need a uniform way to track some state in links in pwiki for things 
* 		like paging and the like with simple user/macro access (???)...
* 		...the simplest that comes to mind is to store in in path 
* 		somehow:
* 			- <path>?<arg>=<value>&...
* 				traditional "query string"...
* 			- <path>/<arg>:<valu>/<arg>:<value>/.../<action>
* 				stack-style arguments...
* 				+ simple to implement
* 				- goes through page search???
* 			- <path>:<value>:<name>=<value>:...
* 			- ...
* 		the general idea is to be:
* 			- flexible enough to allow the basics done
* 			- restrictive enough to prevent misuse
* 		...the rest of the state can simply be stored in the root pwiki 
* 		object in one of the following ways:
* 			- directly (attrs/dict)
* 			- a special page 
* 				- virtual (path-specific)
* 					e.g.
* 						/some/path/@state/page -> 4
* 					...might be fun to implement a basic json editor
* 					and viewer with this api...
* 					...controlled via js 
* 					...or special actions:
* 						/some/path/@state/page/next (increment)
* 						/some/path/@state/page/prev (decrement)
* 						/some/path/@state/page=10	(assign)
* 						...
* 				- session
* 				- stored (config)
* 		...css selector as path....
* XXX GENERATOR make pattern path parsing a generator...
* 		...experiment with a controllable iterator/range thing...
* 		This would require:
* 			1) the rendering infrastructure to support generation and 
* 				partial rendering starting from .expand(..) and up...
* 										input			output
* 					.expand(..)			DONE			DONE
* 					.resolve(..)		partial			DONE
* 						XXX for-await-of (vs. for-of-await) breaks things 
* 							(see: /test_slots, ..?)
* 					.parse(..)			DONE			NO
* 						XXX with the current implementation of filters 
* 							this can't work as a generator...
* 							...might be a good idea to make filters local only...
* 						XXX slots/macros might also pose a problem...
* 			2) all the macros that can source pages to produce generators (DONE)
* XXX the parser should handle all action return values, including:
* 			- lists			-- DONE
* 			- iterators		-- DONE
* 			- strings		-- DONE
* 			- numbers		-- DONE
* 			- misc:
* 				dates		-- ???
* XXX BUG: .move(..) behaves in an odd way...
* 		see: System/move page action
* 		...deletes the original and moves an empty page -- sync error???
* XXX DELETE ./delete is triggered twice...
* XXX differences in behaviour between _abc and abc, either need to make 
* 		them the same or document the differences and the reasons behind 
* 		them...
* XXX add support for <join> tag in include/source/quote???
* XXX BUG?: markdown: when parsing chunks each chunk gets an open/closed 
* 		<p> inserted at start/end -- this breaks stuff returned by macros...
* 		...there are two ways to dance around this:
* 			- make filters run a bit more globaly -- per block...
* 			- find a local parser...
* XXX introspection:
* 			/stores
* 				list stores...
*			/info	
*				list page/store info
*			/storage
*				list storage usage / limits
* XXX BUG: FF: conflict between object.run and PouchDB... 
* XXX add action to reset overloaded (bootstrap) pages...
* 		- per page
* 		- global
* XXX Q: can we access fs from a pwa???
* 		...looks like no :|
* XXX DEPENDS @now() makes the template uncachable, to we actually need it???
* XXX CHECK: @macro(..) and @slot(..) must overload in the same way...
* XXX DEPENDS/CACHE @macro(..) introduces a dependency on count (pattern)
* 		...not sure how we track these...
*
*
*
* XXX ROADMAP:
* 	- run in browser
* 		- basics, loading 							-- DONE
* 		- test localStorage / sessionStorage 		-- DONE
* 		- test pouch								-- DONE
* 		- render page								-- DONE
* 		- navigation								-- DONE
* 			- hash/anchor							-- DONE
* 			- action redirects (see: System/delete)	-- DONE
* 		- basic editor and interactivity			-- DONE
* 		- export
* 			- json									-- DONE
* 			- zip (json/tree)						--
* 		- page actions
* 			- delete								-- DONE
* 			- copy/move								-- DONE
* 			- resolved (async)						--
* 		- migrate/rewrite bootstrap					--
* 		- store topology							--
* 		- sync and sync conf						--
* 		- images
* 			- get 									-- 
* 			- download								--
* 			- upload								--
* 	- search
* 		- paths
* 		- text
* 	- markdown										-- DONE
* 	- WikiWord										-- DONE
* 	- dom filter mechanics							-- DONE
* 	- filters
* 		- markdown (???)							-- ???
* 			this can be done in one of two ways:
* 				- wrapping blocks in elemens
* 					...requires negative filter calls, either on -wikiword 
* 					or a different filter like nowikiwords...
* 				- tags (current)
* 		- raw / code								-- DONE?
* 		- nl2br										-- 
* 		- nowhitespace								-- 
* 			clear extra whitespace from text elements
* 	- dom filters:
* 		- editor
* 			basic									-- DONE
* 				see: /System/edit
* 			MediumEditor (markdown-plugin)
* 				https://github.com/yabwe/medium-editor
* 				https://github.com/IonicaBizau/medium-editor-markdown
* 					- heavy-ish markdown plugin
* 			ToastUI (markdown)
* 				https://github.com/nhn/tui.editor
* 					- quite heavy
* 			Pen (markdown)
* 				https://github.com/sofish/pen
* 					- no npm module
* 					- not sure if it works on mobile
* 					+ small
* 			tiptap (no-markdown, investigate y.js)
* 		- wikiword / path2link						-- 
* 			..do we need to be able to control this???
* 	- templates
* 		- all (tree)								-- DONE
* 	- configuration
* 		- defaults
* 		- System/config (global)
* 	- pwa
* 		- service worker ???
* 			...handle relative urls (???)
* 	- cli
* 		- basic wiki manipulations (1:1 methods)
* 		- import/export/sync
* 		- introspection/repl
* 	- archive old code
* 	- update docs
* 	- refactor and cleanup
* 		- module structure							-- REVISE
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
* XXX DOC:
* 		- paths in pWiki behave a bit differently than traditional 
* 			file-system paths, this is due to one key distinction:
* 				in pWiki there is no distinction between a file and a 
* 				directory
* 			i.e. each path can both contain data as a file and at the same
* 			time support sub-paths etc.
* 			for this reason behaviour of some APIs will differ, all paths
* 			within a page (a-la file) are relative to its children and not
* 			to it's siblings. For example, for page "/a/b/c" a link to "./x"
* 			will resolve to "/a/b/c/x" and this is independent of whether
* 			the base path is given as "/a/b/c/" or "/a/b/c"
*
* 			NOTE: implementing things in a traditional manner would 
* 				introduce lots of edge-cases and subtle ways to make 
* 				mistakes, bugs and inconsistencies.
* 		- types of recursion
* 			(see: pwiki/page.js: Page.macros.include(..) notes)
* 		- slot <content/> order -- 
* 			(see: page.js: Page's .macros.slot(..) notes)
*
*
* XXX weaknesses to review:
* 		- <store>.paths() as an index...
* 			+ decouples the search logic from the store backend
* 			- requires the whole list of pages to be in memory
* 				...need to be independent of the number of pages if at 
* 				all possible -- otherwise this will hinder long-term use...
* 			.paths() should be cached to make all path searches away from 
* 			async waits as we can test quite a number of paths before we 
* 			find a page...
* 			...another solution is to offload the search to the store backend
* 			but this would require the stores to reimplement most of pwiki/path
* 		- 
*
*
* TODO?:
* 	- <page>.then() -- resolve when all pending write operations done ???
* 	- an async REPL???
* 	- custom element???
* 	- might be a good idea to try signature based security:
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
* XXX RELATIVE relative urls are a bit odd...
* 			Path/to/page opens Moo	-> Path/to/Page/Moo
* 		should be (???):
* 			Path/to/page opens Moo	-> Path/to/Moo
* 		this boils down to how path.relative(..) works, treating the base
* 		as a directory always (current) vs. only if '/' is at the end, on 
* 		one hand the current approach is more uniform with less subtle ways
* 		to make mistakes but on the other hand this may introduce a lot 
* 		of complexity to the user writing links, e.g. how should the 
* 		following be interpreted?
* 			page: /SomePage
* 				link: SomeOtherPage
* 					-> /SomeOtherPage
* 					-> /SomePage/SomeOtherPage (current)
* 		the current approach does not seem to be intuitive...
* 		can this be fixed uniformly across the whole system???
* 		XXX document this!
*
* XXX need to think about search -- page function argument syntax???
*
* XXX might need to get all the links (macro-level) from a page...
* 		...would be useful for caching...
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


// XXX these are async...
// 		...see browser.js for a way to deal with this...
// XXX note sure how to organize the system actions -- there can be two 
// 		options:
// 			- a root ram store with all the static stuff and nest the rest
// 			- a nested store (as is the case here)
// XXX nested system store...
store.update('System', 
	Object.create(basestore.BaseStore).load(page.System))
store.update('Settings', 
	Object.create(basestore.BaseStore).load(page.Settings))



// NOTE: in general the root wiki api is simply a page instance.
// XXX not yet sure how to organize the actual client -- UI, hooks, .. etc
var pwiki =
module.pwiki = 
	//page.Page('/', '/', store)
	page.CachedPage('/', '/', store)


//---------------------------------------------------------------------
// comandline...

if(typeof(__filename) != 'undefined'
		&& __filename == (require.main || {}).filename){



}



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
