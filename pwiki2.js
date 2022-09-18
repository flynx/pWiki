/**********************************************************************
* 
*
* XXX ASAP start writing docs in pwiki
* 		- WYSIWYG markdown editor/viewer (ASAP)
* 		- fs store/export in browser or a simple way to export/import...
*
*
* XXX might also be a good idea to investigate a .tree directory index 
* 		as a supplement to .paths()
* XXX Q: can we access fs from a pwa???
* XXX CACHE need to explicitly prevent caching of some actions/pages...
* XXX the parser should handle all action return values, including:
* 			- lists			-- XXX
* 			- strings		-- DONE
* 			- numbers		-- DONE
* 			- misc:
* 				dates		-- ???
* 		note that an action returning a list is not the same as a list
* 		stoted in <data>.text -- since we can't identify what an action
* 		returns without calling it, and we only call actions on 
* 		.raw/.text/.parse(..), we can't iterate over such results.
* 		Q: can we make a list reder as a list of pages??
* 			...likely no...
* 			...would depend on where we iterate pages and on whether 
* 			we can/should reach that spot from within the parser...
* XXX page access mothods (.get(..) / .__get__(..) via path + args)
* 			- path	   			 -- DONE
* 			- tags	   			 -- 
* 			- search   			 -- 
* 		Syntax:
* 			/path/to/*:tags=a,b,c:search=some text
* 			+--------+ . . . . . . . . . . . . . . . .  path           
* 			           +--------+ . . . . . . . . . . . tags
* 			                      +--------------+ . .  search
*		order is not relevant here...
*		each of the methods narrows down the previous' results
* XXX revise/update sort...
* XXX FEATURE tags: might be a good idea to add a .__match__(..) hook
* 		to enable store-level matching optimization...
* 		...not trivial to route to alk the stores...
* XXX FEATURE tags and accompanying API...
* 		- add tags to page -- macro/filter
* 			- <page>.text -> <page>.tags (cached on .update(..))
* 			- manual
* 		- a way to list tags -- folder like?
* 		- tag cache <store>.tags
* 			format:
* 				{
* 					<tag>: [<path>, ...],
* 				}
* 		- tag-path filtering...
* 			i.e. only show tags within a specific path/pattern...
* 		- path integration...
* 			i.e. a way to pass tags through path...
* 				/some/path:tags=a,b,c
* XXX FEATURE images...
* XXX generalize html/dom api...
* 		...see refresh() in pwiki2.html
* XXX async/live render...
* 		might be fun to push the async parts of the render to the dom...
* 		...i.e. return a partially rendered DOM with handlers to fill 
* 		in the blanks wen they are ready...
* 		something like:
* 			place placeholder element
* 				-> on visible / close to visible 
* 					-> trigger load (set id)
* 				-> on load
* 					-> fill content (on id)
* 		example:
* 			@include(./path ..)
* 				-> <span pwiki="@include(/full/path ..)"/>
* XXX prevent paths from using reserved chars like: ":", "#", ...
* XXX OPTIMIZE CACHE catch page creation --  match pattern path...
* 		1) explicit subpath matching -- same as .match(..)
* 		2) identify recursive patterns -- same as **
* XXX Q: empty title???
* 		- special default name
* 			a timestamp or some thing similar
* 			this can be hidden until changed by user
* 		- do we split .name/.path and .title???
* 			...since pWiki is a wiki, the system-level answer is NO.
* XXX do we need something like /System/Actions/.. for fast actions called 
* 		in the same way as direct page actions???
* 		...experiment??
* XXX FEATURE list macro paging...
* 		...should this be macro level or handled in .each()
* 		what mode?
* 			- count + block-offset (preferred)
* 			- count + elem-offset
* 			- from + to
* XXX fs: handle odd file names...
* 			- we need '*' and '**'
* 			- would be nice to be able to name files without
* 				any resyrictions other than the internally reserved
* 				cars...
* 				(currently: '#', and ':')
* XXX ASAP: MetaStore: need to correctly integrate the following store 
* 		methods:
* 			.get(..)					-- DONE
* 			.metadata(..)				-- 
* 			.delete(..)
* 				XXX deleting something in .next will break stuff...
* 			...
* XXX ENERGETIC: Q: do we need to make this a path syntax thing???
* 		...i.e. 
* 			/some/path/action/! (current) 
* 		vs.
* 			/some/path/!action
* 			..."!" is removed before the <store>.__<name>__(..) calls...
* XXX ENERGETIC revise naming...
* XXX ENERGETIC System/time does not seem to work correctly...
* 		...creating a _time alternative does not work...
* XXX OPTIMIZE might be a good idea to make some methods that only access 
* 		the index sync -- this will make the store unusable while indexing 
* 		though...
* XXX OPTIMIZE load pages in packs...
* 		might be a good idea to move stuff down the stack to Store:
* 			.each()	-> .store.each(<path>)
* 		...this will enable us to optimize page loading on a store 
* 		level...
* 		...another approach would be to make .get(..) accept a list of 
* 		paths and return an iterator...
* XXX OPTIMIZE page search: make things invariant via .names
* 			- if a page is in a system path and there are no alternatives 
* 				just return it and do not search.
* 			- if there are alternatives rank them
* 				- check the non-system ones (common sub-path?)
* 				- return the first system
* 		XXX sort paths in .names
* 		XXX remove/mark shadowed paths???
* XXX OPTIMIZE MATCH limit candidates to actual page name matches -- this will 
* 		limit the number of requests to actual number of pages with that 
* 		name...
* 		e.g. when searching for xxx/tree the only "tree" available is 
* 		System/tree, and if it is overloaded it's now a question of 
* 		picking one out of two and not out of tens generated by .paths()
* XXX OPTIMIZE CACHE track store (external) changes...
* XXX OPTIMIZE CACHE/DEPENDS might be a good idea to add a dependencyUpdated event...
* 		...and use it for cache invalidation...
* XXX OPTIMIZE NORMCACHE .normalize(..) cache normalized strings...
* 		...seems to have little impact...
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
* XXX FEATURE self-doc: 
* 			- some thing lile Action(<name>, <doc>, <func>|<str>)
* 			- System/doc -- show <doc> for action...
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
* XXX might be a good idea to parse a page into an executable/function
* 		that would render self in a given context...
* XXX BUG: .move(..) behaves in an odd way...
* 		see: System/move page action
* 		...deletes the original and moves an empty page -- sync error???
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
* 			/stores								-- DONE
* 				list stores...
*			/info								-- DONE?
*				list page/store info
*			/storage							-- XXX
*				list storage usage / limits
* XXX BUG: FF: conflict between object.run and PouchDB... 
* XXX add action to reset overloaded (bootstrap/.next) pages...
* 		- per page
* 		- global
* XXX CHECK: @macro(..) and @slot(..) must overload in the same way...
* XXX DEPENDS/CACHE @macro(..) introduces a dependency on count (pattern)
* 		...not sure how we track these...
* XXX revise how we handle .strict mode in page's .raw and .text...
* XXX might be a good idea to export HTML from a specific path/pattern...
* XXX should render templates (_view and the like) be a special case
* 		or render as any other page???
* 		...currently they are rendered in the context of the page and
* 		not in their own context...
* XXX EXPERIMENTAL DOC INHERIT_ARGS added a special-case...
* 		as basename will get appended :$ARGS if no args are given...
* 		...this only applies to paths referring to the current context 
* 		page, i.e.: 
* 			await pwiki
* 				.get('/page:x:y:z')
* 				// this will get the args...
* 				.parse('@source(./location)')
*
* 			await pwiki
* 				.get('/page:x:y:z')
* 				// this will not get the args -- different page...
* 				.parse('@source(./x/location)')
*
* 			await pwiki
* 				.get('/page:x:y:z')
* 				// this will get explicitly given empty args...
* 				.parse('@source(./location:)')
*
* 		special args that auto-inherit are given in .actions_inherit_args
* 		XXX this is currently implemented on the level of macro parsing,
* 			should this be in a more general way???  
* 		XXX should this be done when isolated??? 
* 			...yes (current)
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
* 			- resolved (async)						-- DONE
* 		- migrate/rewrite bootstrap					--
* 		- store topology							-- DONE
* 		- sync and sync conf						--
* 		- images
* 			- get 									-- 
* 			- download								--
* 			- upload								--
* 	- tags
* 		- get tags from page						-- 
* 		- show tagged pages							-- 
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
*
* 			store
* 			  ^
* 			  |
* 			page <--> renderer
* 			  ^
* 			  |
* 			client
*
*
*
* Modules:
* 	pwiki/
* 		page				- base pages and page APIs
* 		parser				- pWiki macro parser
* 		path				- base path API
* 		store/				- stores
* 			base			- memory store and store API and utils
*			file			- file store
*			localstorage	- localStorage / sessionStorage stores
*			pouchdb			- PouchDB store
* 			...
* 		filter/				- page filters
* 			base			- base filters incl. wikiword
* 			markdown		- markdown renderer
* 			...
* 	pwiki2					- main cli / node entry point
* 	browser					- browser entry point
* 	pwiki2-test				- testing and experimenting (XXX move to test.js)
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
* 		- arguments in macros that contain macros must be in quotes, e.g.
* 				@include("./*:@(all)")
* 			otherwise the macro will end on the first ')'...
* 		- :all argument to all pattern paths...
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
var pouchdbstore = require('./pwiki/store/pouchdb')



//---------------------------------------------------------------------
// Basic setup...
//
//
// Store topology:
// 		XXX
//

var store = 
module.store = {
	// XXX base localstorage...
	__proto__: pouchdbstore.PouchDBStore,
	/*/
	__proto__: basestore.MetaStore,
	//*/
	
	next: { __proto__: basestore.MetaStore },
}


// XXX these are async...
// 		...see browser.js for a way to deal with this...
// XXX note sure how to organize the system actions -- there can be two 
// 		options:
// 			- a root ram store with all the static stuff and nest the rest
// 			- a nested store (as is the case here)
// XXX nested system store...
module.setup = 
Promise.all([
	//store.next.update('System',
	store.next.update(
		pwpath.sanitize(pwpath.SYSTEM_PATH),
		Object.create(basestore.BaseStore).load(page.System)),
	store.update('.config', 
		Object.create(basestore.BaseStore).load(page.Config)),
])



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
