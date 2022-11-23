/**********************************************************************
* 
*
* XXX ASAP start writing docs in pwiki
* 		- transparent sync/backup
* 			- fs store/export in browser or a simple way to export/import...
* 				...can't seem to get it to work without asking for permission
* 				on every startup (one more thing left to try, keeping the 
* 				handler live in a service worker, but the hopes are low)...
* 			- pouchdb-couchdb sync					- 
* 			- pouchdb-pouchdb sync (p2p via webrtc) - XXX 
* 		- images									- XXX 
* 		- WYSIWYG markdown editor/viewer (ASAP)		- XXX
* 			- need a UI a-la milkdown
* 				...milkdown is good but 500mb dev-env and (apparently) 
* 				no AMD support are problems -- need more testing...
* 		- minimal/functional editor					- DONE
* 			...<pre> sometimes ties formatting while <textarea>/<input type=text>
* 			handle resizing in a really odd way...
* 		- tags										- DONE
* 		- search									- DONE
* 		- GUI										- 
* 			general UI/UX
* 			drag-n-drop
* 		- CLI										- 
* 			- server / replication target
* 			- management
*
*
*
* XXX things that will help:
* 		- async render (infinite scroll + search + large pages)
* 			unresolved -> dom placeholder
* 			iterator prepends to placeholder
* 			when resolved/done remove placeholder
* 		- 
*
*
* XXX macros: else/default macro args essentially mean the same thing, should we
* 		unify them to use the same name???
* XXX parser: error handling: revise page quoting... 
* 		...need a standard mechanism to quote urls, url-args and paths...
* XXX BUG? can't use < and > (both?) in page title...
* XXX parser: error handling: add line number + context... (???) 
* XXX BUG: parser:
* 		This will break:
* 			await pwiki.parse('<macro src=../tags join=", ">@source(.)</macro>')
*		This will not:
* 			await pwiki.parse('<macro src="../tags" join=", ">@source(.)</macro>')
* XXX might be a good idea to add a default template to draw a list...
* XXX FEATURE: make the pwiki "widget" work bot as an element and as a 
* 		full page (current)...
* 		...would need to handle stuff like history, url, nav locally...
* 		see: pwiki2.html
* XXX ASAP test: can we store the file handler with permissions in a ServiceWorker??
* XXX macros: Q: do we need macros for printing errors and the like???
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
* XXX ASAP: MetaStore: need to correctly integrate the following store 
* 		methods:
* 			.get(..)					-- DONE
* 			.metadata(..)				-- 
* 			.delete(..)
* 				XXX deleting something in .next will break stuff...
* 			...
* XXX FEATURE images...
* XXX BUG?: count does not appear to affect /Test/list/generator and /Test/list/static...
* 		...do we need to support this???
* XXX index: need to disable index persistence on memory stores...
* XXX index: would be nice to somehow persistently auto-generate index id's...
* 		...maybe: "<prefix>:<path>" or something similar...
* 		...would be nice to have store ids...
* XXX index: journal: might be a fun idea to try a simple sync file store
* 		- a json format simply appending elements in the format:
* 			',\n\t[ ... ]'
* 		- appending a '\n}' on exit
* XXX <store>.journal: needed to break the update recursion -- i.e. decouple 
* 		index .update(..) handlers from stored page updates by first 
* 		updating the journal and on a timer updating the .cache/<index> page...
* XXX BUG: indexedDB: .deleteDatabase(..) does not actually delete the 
* 		database from the list until reload.
* 		this breaks trying to open a database with the same name again...
* XXX FEATURE: would be nice to have a buffered store (mixin)...
* 		- state stored in memory
* 		- get state from memory (sync)
* 		- background updates (async)
* 		- update strategy
* 			- asap
* 			- timer -- save grouped changes 
* 				(changed paths + removed paths)
* 			- idle
* 			- ...
* 		- state query -- pending/saved/...
* XXX Q: can we get state and update in one go???
* 		...usefull where we need to get state to update...
* XXX macro: macro:count / macro:index vars can be overridden by count/index 
* 		attributes....
* 		...this can be usefull but this needs testing...
* XXX should @macro(..) handle offset in the same manner as count???
* XXX FEATURE store: mirror (slave) -- a way to hold data in one store 
* 		and to mirror everything (async) to a separate store...
* 		example:
* 			PouchDB (main) -- FileSore (export)
* XXX Q: do we need a way to index/access a list item via path???
* XXX STYLE: should style loading be done via the event mechanics 
* 		(see: pwiki2.html) or via the base templates (see: pwiki/page.js:_view 
* 		template)???
* XXX TAGS
* 		- add tags to page -- macro/filter
* 			- <page>.text -> <page>.tags (cached on .update(..))
* 													- ???
* 			- manual/API							- DONE
* 			- editor								- 
* 		- a way to list tags -- folder like?		- DONE
* 		- tag cache <store>.tags					- DONE
* 		- tag-path filtering...						- DONE
* XXX TAGS add a more advanced query -- e.g. "/**:tagged=y,z:untagged=x" ???
* XXX INDEX DOC can index validation be async???
* 		...likely no
* XXX INDEX add option to set default action (get/lazy/cached)
* XXX BUG: CachedStore seems to be broken (see: pwiki/store/base.js:837)
* XXX might be a good idea to create memory store (sandbox) from the 
* 		page API -- action??
* XXX Chrome started spamming CORS error: 
* 			Access to manifest at 'file:///L:/work/pWiki/manifest.json' 
* 			from origin 'null' ...
* 		not sure why...
* 		(switched off in console filter for now)
* XXX might be a good idea to wrap the wysiwig editor into a separate template
* 		and use it in the main edit template to make it user-selectable...
* XXX generalize html/dom api...
* 		...see refresh() in pwiki2.html
* XXX test pouchdb latency at scale in browser...
* XXX macros: .depends: need fast path pattern matching... 
* XXX macros / CACHE: convert a /path/* dependency to /path/** if a script 
* 		is recursive...
* XXX might also be a good idea to investigate a .tree directory index 
* 		as a supplement to .paths()
* XXX CACHE need to explicitly prevent caching of some actions/pages...
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
* XXX do we need something like /System/Actions/.. for fast actions called 
* 		in the same way as direct page actions???
* 		...experiment??
* XXX fs: handle odd file names...
* 			- we need '*' and '**'
* 			- would be nice to be able to name files without
* 				any resyrictions other than the internally reserved
* 				cars...
* 				(currently: '#', and ':')
* XXX ENERGETIC: Q: do we need to make this a path syntax thing???
* 		...i.e. 
* 			/some/path/action/! (current) 
* 		vs.
* 			/some/path/!action
* 			..."!" is removed before the <store>.__<name>__(..) calls...
* XXX OPTIMIZE load pages in packs...
* 		might be a good idea to move stuff down the stack to Store:
* 			.each()	-> .store.each(<path>)
* 		...this will enable us to optimize page loading on a store 
* 		level...
* 		...another approach would be to make .get(..) accept a list of 
* 		paths and return an iterator...
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
* XXX add support for <join> tag in include/source/quote???
* XXX introspection:
* 			/stores								-- DONE
* 				list stores...
*			/info								-- DONE?
*				list page/store info
*			/storage							-- XXX
*				list storage usage / limits
*			/time								-- DONE
*				time page load/render
* XXX BUG: FF: conflict between object.run and PouchDB... 
* 		...seems to be a race, also affects chrome sometimes...
* XXX add a way to indicate and reset overloaded (bootstrap/.next) pages...
* 		- per page
* 		- global
* XXX should render templates (_view and the like) be a special case
* 		or render as any other page???
* 		...currently they are rendered in the context of the page and
* 		not in their own context...
* 		...document this
* XXX macros: add @defmacro(<name> ..) to be exactly as @macro(<name> ..) 
* 		but defines a @<name>(..) macro...
* 		...this would be useful for things like:
* 			<pw:delete src="."/>
* 		or:
* 			<pw:info src="."/>
* 		generating delete and info buttons...
* 		...this is not possible because:
* 			- we statically set the macro name list (regexp) parser.lex(..)
* 			- we need this list to parser.group(..)
* 		...i.e. it would require changing the regexp during and async parse, 
*	 	potentially reparsing parsed sections agead of definition... this is 
*	 	fixable (more general macro name pattern + ns matching) but I'm not 
*	 	sure if this is worth it
* 		...see: <page>.defmacro(..)
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
* 		- localStorage / sessionStorage 			-- DONE
* 		- pouchdb									-- DONE
* 		- render page								-- DONE
* 		- navigation								-- DONE
* 			- hash/anchor							-- DONE
* 			- action redirects (see: System/delete)	-- ??? (unify api)
* 		- basic editor and interactivity			-- DONE
* 		- export
* 			- json									-- DONE
* 			- zip (json/tree)						--
* 		- sync (auto)								-- XXX
* 		- page actions								-- DONE
* 		- migrate/rewrite bootstrap					--
* 		- store topology							-- DONE
* 			- config???
* 		- images XXX
* 			- get 									-- 
* 			- download								--
* 			- upload								--
* 	- tags
* 		- get tags from page						-- DONE
* 		- show tagged pages							-- DONE
* 	- search
* 		- paths										-- ???
* 		- text										-- DONE 
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
* 			MediumEditor (markdown-plugin)			-- REJECTED XXX
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
* 		- defaults									-- 
* 		- System/config (global)					-- 
* 	- pwa
* 		- service worker							-- ???
* 			...handle relative urls (???)
* 		- fs access (external sync)					-- ???
* 	- cli
* 		- basic wiki manipulations (1:1 methods)
* 		- import/export/sync
* 		- introspection/repl
* 	- archive old code								-- 
* 	- update docs									--
* 	- refactor and cleanup
* 		- module structure							-- REVISE
* 	- package
* 		- pwa										-- ???
* 		- electron									-- 
* 		- android									-- ???
* 		- iOS										-- ???
*
*
*
* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*
* Architecture:
*
* 			store <-> index
* 			  ^			^
* 			  |			|
* 			  +---------+
* 			  |
* 			page <--> renderer
* 			  ^
* 			  |
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
* 		- macro isolation in relation to slots...
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
	store.next.update('.templates',
		Object.create(basestore.BaseStore).load(page.Templates)),
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
