// This file is generated automatically, all changes made here will be lost.

var Bootstrap = {"Doc":{"text":"@include(./About)\r\n"},"Templates":{"text":"<p>\r\nXXX Genereal template description...\r\n</p>\r\n\r\n<macro src=\"./*\">\r\n\t<hr>\r\n\t<h2>\r\n\t\t<a href=\"#@source(./path)/_edit\">@source(./path)</a>\r\n\t</h2>\r\n\t<p>\r\n\t\t<pre><code>@quote(./raw)</code></pre>\r\n\t</p>\r\n</macro>\r\n\r\n<!-- @filter(-wikiword) -->\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Doc/Macros":{"text":"# ![pWiki](img/pWiki-i.jpg) pWiki Macros\r\n\r\n## Syntax\r\n\r\nAny macro can be used in any of the two forms, either _inline_ or _HTML-like_.\r\n\r\nInline:\r\n```\r\n@macro-name(value)\r\n```\r\n\r\nHTML-style:\r\n```\r\n<macro-name arg=\"value\"/>\r\n\r\n<macro-name arg=\"value\">\r\n  ...text...\r\n</macro-name>\r\n```\r\n\r\nThe two forms are almost identical, with the only difference being that the \r\ninline form does not support body text (note that some macros may provide\r\nthis functionality as an argument, namely `slot`).\r\n\r\nThe two forms exist to fill two distinct functions:\r\n- inline: compatible with attribute values and short\r\n- html-like: element-like, simpler when dealing with html\r\n\r\n\r\n\r\n### Escaping macros\r\n\r\nMacros can be escaped for inclusion in the page, the two types of macros \r\nare escaped a bit differently:\r\n\r\n- inline macros -- escaped by preceding with a `\\`\r\n\r\n  ```\r\n  \\\\@include(SomePage)\r\n  ```\r\n\r\n  Displayed in page as:\r\n\r\n  \\@include(SomePage)\r\n\r\n  _NOTE: if displayed on github, this will show an extra \"\\\" in both \r\n  cases, this should be ignored as pWiki will consume the escaping \"\\\" \r\n  in both the code example and the preview._\r\n\r\n\r\n- html-like macros -- escaped _the HTML way_\r\n\r\n  ```\r\n  &lt;include src=\"SomePage\"\\&gt;\r\n  ```\r\n\r\n  Displayed in page as:\r\n\r\n  &lt;include src=\"SomePage\"\\\\&gt;\r\n\r\n\r\n\r\n\r\n## Macros\r\n\r\n### now ()\r\n\r\nGet current date in seconds since epoch, this is equivalet Javascript's\r\n`Date.now()`.\r\n\r\nThis is mostly used for automatically creating paths (see: todo / outline)\r\n\r\nThis is different from `$NOW` in path (see: Doc/Path) in that this gets \r\nthe date once per page load, i.e. the date changes on page load, while \r\n`$NOW` is set every time the path is used, i.e. on every click or script\r\nuse.\r\n\r\n**Example:**\r\n```\r\n\\@now()\r\n```\r\nWill produce: `@now()` \r\n\r\n_NOTE: when viewing from outside of pWiki, this should look like: `1471389217848`_\r\n\r\n\r\n\r\n### filter (name)\r\n\r\nEnable or disable a page filter.\r\n\r\nA filter is a way to transform the page source.\r\n\r\nArguments:\r\n- `name` -- filter name. If name is preceded with a '-' then it \r\nwill be forced off. This is useful for disabling _default_ filters, or \r\nfilters added previously in templates.\r\n\r\nFilters:\r\n- wikiword (default)\r\n- markdown\r\n\r\n**Example:**\r\n- `[./_edit]` -- _see the macro at the end of the page._\r\n\r\n\r\n\r\n### include (src isolated text)\r\n\r\nInclude a page. The included page is rendered independently from current\r\npage and is inserted as-is in macro body.\r\n\r\nNote that this will produce a `include` tag in the code that contains \r\nthe included page, this makes this tag not suitable for use anywhere \r\nbut an html element body.\r\n\r\nArguments:\r\n- `src` -- path to source page.\r\n- `isolated` -- prevent slots from included page from affecting the including page. \r\n- `text` -- is used when recursive include is detected and ignored otherwise.\r\n\r\n_For examples see `slot` macro exaples below._\r\n\r\n\r\n\r\n### source (src) / quote (src)\r\n\r\nInsert a page without rendering. This is similar to include but will not\r\nrender the page. \r\n\r\nThe difference between `source` and `quote` is:\r\n- _source_ includes the page as-is\r\n- _quotes_ escapes the page (i.e. _quotes_ it's source) for its code to \r\n  display in the rendered HTML correctly.\r\n\r\nArguments:\r\n- `src` -- path to source page.\r\n\r\n**Example:**\r\n\r\n[Templates/\\_css] / [bootstrap css](bootstrap/Templates/_css.html):\r\n```\r\n@source(Templates/_css)\r\n```\r\n\r\n\r\n### slot (name text)\r\n\r\nDefine or fill a slot.\r\n\r\nFirst occurrence of a `name` will _define_ a slot and fill it with `text`.\r\nEach new occurrence of a name will change slot content.\r\n\r\n**Example:**\r\n\r\n[Templates/\\_view] / [bootstrap view](bootstrap/Templates/_view.html):\r\n```\r\n@source(Templates/_view)\r\n```\r\n\r\n[Templates/\\_edit] / [bootstrap edit](bootstrap/Templates/_edit.html):\r\n```\r\n@source(Templates/_edit)\r\n```\r\n\r\n\r\n### macro (name src sort) / else ()\r\n\r\nApply macro to source page and include the result.\r\n\r\nThis is similar to include but does not require a separate page.\r\n\r\nBoth `name` and `src` are optional.\r\n\r\nIf `name` is given a _named macro_ is defined. This macro can be later \r\nreferenced (used) by name. A named macro can be redefined/overridden.\r\n\r\nIf `src` is given a macro is applied to a specific page or range of pages\r\n(see: WikiPath).\r\n\r\nFor a macro to be useful it must have a body (`text`), either defined as\r\na named macro or in the current macro.\r\n\r\nArguments:\r\n- `name` -- macro name (optional).\r\n- `src` -- path to source page (optional).\r\n- `sort` -- space separated list of methods to use for item sorting\r\n\r\n\r\n`else` macro is applicable inside `macro`. it is used when the `src` path\r\nof `macro` matches no pages.\r\n\r\n**Example:**\r\n\r\n[Templates/pages] / [bootstrap pages](bootstrap/Templates/pages.html):\r\n```\r\n@source(Templates/pages)\r\n```\r\n\r\n\r\n<!-- @filter(markdown) -->\r\n<!-- vim:set ts=4 sw=4 ft=markdown : -->\r\n"},"Doc/Path":{"text":"# ![pWiki](img/pWiki-i.jpg) pWiki Path\r\n\r\nXXX a Wiki is a set of pages, mostly top level pages, mosty titled in\r\nWikiWord style, pWiki follows this culture but does not restrict either \r\npage nesting or title formatting. But following this style is recommended.\r\n\r\nXXX write a set of recommendations...\r\n\r\n\r\n\r\n## Basic terminology\r\n\r\n**Path**  \r\n_One or more strings (or parts) separated by \"/\" that identifies a view._\r\n\r\nWe call the last _part_ in a path sequence a _title_.\r\n\r\nWe call the sub-path without the _title_ a _basedir_ or simply _dir_.\r\n\r\nIn pWiki, there is no distinction between a page and a _directory_, thus\r\nwe do not use the later term, instead, we may use the term _sub-page_.\r\n\r\nPaths are case sensitive.\r\n\r\n\r\n**Page**  \r\n_A set of data associated with a path._\r\n\r\nA page is identified by it's path, but this does not require every\r\nsub-path of that path to exist -- the full path is the identifier, not\r\na sequence of path parts.\r\n\r\nSome pages are _bootstrapped_, i.e. are predefined in pWiki, these pages\r\ncan be overridden but can not be removed.\r\n\r\n\r\n**View**  \r\n_A path that resolves to a page that may or may not be at that specific\r\npath._\r\n\r\nA _view's_ path may match that of a specific page or may not match any\r\npage directly, but any view will resolve to a page via the _acquisition \r\nprocess_\r\n\r\nAny page is a view, every view resolves to a page, but not every view \r\nis a page.\r\n\r\n(see: _Page acquisiton_ below)\r\n\r\n\r\n**WikiWord**  \r\n_XXX_\r\n\r\n\r\n## Page acquisition\r\n\r\npWiki path system differs from how traditional file system paths are \r\nhandled. In pWiki if a path does not reference a page directly (i.e. \r\nit's a _view_), a search is conducted to find an alternative page. This \r\nsearch is called _page acquisition_.\r\n\r\n**Acquisition process:**  \r\n_A set of rules defining how a page is retrieved via a path._\r\n\r\n\r\nThis is used as a simple and uniform mechanism to:\r\n- Get default pages for specific situations  \r\n  Like [Templates/EmptyPage] to handle the _page not found_ condition.\r\n- define generic templates/pages accessible by multiple pages in path  \r\n  A good example would be the viewer used to show this page [Templates/\\_view]\r\n  and all of it's _chrome_ like the path in the header and links in the \r\n  footer <pwiki-comment>(seen: when viewing through pWiki)</pwiki-comment>\r\n- Overload default templates/pages\r\n\r\n\r\n### The acquisition order/rules:\r\n\r\n1. if _path_ matches a specific page, target _page_ is found \r\n1. if _path_ does not match a page:\r\n  1. if _title_ matches a page in the parent _path_, _page_ is found\r\n  1. repeat until we either have a match or reach root (empty _basedir_)\r\n1. if no match is found, check if title exists in [Templates] in _basedir_\r\n1. if no match is found, check if title exists in [/System]\r\n1. if no match is found, repeat process for `EmptyPage` instead of _title_\r\n\r\n\r\n**Example:**  \r\n\r\nFor path `Path/To/Page` the following paths are checked in order \r\nand the first matching page is returned:\r\n\r\n- _Check path as-is then go up:_\r\n  - `Path/To/Page` \r\n  - `Path/Page`\r\n  - `Page`\r\n- _Check in `Templates`, in path and up:_\r\n  - `Path/To/Templates/Page`\r\n  - `Path/Templates/Page`\r\n  - `Templates/Page`\r\n- _Check root `System`:_\r\n  - `System/Page`\r\n- _Check `EmptyPage` in path, then in templates:_\r\n  - `Path/To/EmptyPage`\r\n  - `Path/EmptyPage`\r\n  - `EmptyPage`\r\n  - `Path/To/Templates/EmptyPage`\r\n  - `Path/Templates/EmptyPage`\r\n  - `Templates/EmptyPage` _(This is guaranteed to exist)_\r\n\r\n\r\n**Exceptions:**\r\n\r\n- `System/settings` is global and _can not be overloaded_ for use as \r\nsystem configuration. This is done for security reasons.\r\n\r\n\r\n\r\n## Default pages\r\n\r\nXXX\r\n\r\n- `Templates/EmptyPage`\r\n- `Templates/EmptyToDo`\r\n- `Templates/EmptyOutline`\r\n\r\n\r\n\r\n## Relative and absolute paths (\".\", \"..\" and \"/\")\r\n\r\nXXX\r\n\r\n\r\n\r\n## Path patterns (\"\\*\" and \"\\*\\*\")\r\n\r\nXXX\r\n\r\n\r\n\r\n## Path actions\r\n\r\nXXX path elements that perform actions on pages but do not actually \r\ncorrespond to actual pages.\r\n\r\n\r\n\r\n## Path variables\r\n\r\n### `$NOW`\r\n\r\nXXX\r\n\r\n_Also see the `\\@now()` macro: [Doc/Macros]._\r\n\r\n\r\n\r\n## WikiWord\r\n\r\nXXX not actualy part of the path spec but a way (culture) to define paths \r\nin pages + automatic link creation.\r\n\r\n\r\n<!-- @filter(markdown) -->\r\n<!-- vim:set ts=4 sw=4 ft=markdown spell : -->\r\n"},"Doc/Templates":{"text":"XXX Document the template structure here XXX\r\n"},"System/style":{"text":"body {\r\n\tfont-family: /*worksans,*/ opensans, sans-serif;\r\n\r\n}\r\n\r\n.title img {\r\n\tvertical-align: middle;\r\n}\r\n\r\nh1, h2, h3 {\r\n\tborder-bottom: solid 1px rgba(0, 0, 0, 0.1);\r\n\tpadding-bottom: 5px;\r\n}\r\nh2, h3 {\r\n\tborder-bottom: solid 1px rgba(0, 0, 0, 0.05);\r\n}\r\n\r\n.raw,\r\n.text {\r\n\tdisplay: block;\r\n}\r\n\r\n.item.checked {\r\n\topacity: 0.3;\r\n}\r\n.item.checked:hover {\r\n\topacity: 0.8;\r\n}\r\n.item.checked .item-content * {\r\n\ttext-decoration: line-through;\r\n}\r\n\r\n.button {\r\n\ttext-decoration: none;\r\n}\r\n.button:last-child {\r\n\tmargin-right: 5px;\r\n}\r\n\r\n.separator~* {\r\n\tfloat: right;\r\n}\r\n\r\npre {\r\n\tdisplay: block;\r\n\tbackground-color: rgba(0, 0, 0, 0.05);\r\n\tpadding: 10px;\r\n\tpadding-bottom: 15px;\r\n\r\n\t-moz-tab-size: 4;\r\n\t-o-tab-size: 4;\r\n\ttab-size: 4;\r\n}\r\n\r\n.item:hover {\r\n\tbackground-color: rgba(0, 0, 0, 0.05);\r\n}\r\n.item .button {\r\n\tdisplay: none;\r\n}\r\n.item:hover .button {\r\n\tdisplay: inline-block;\r\n}\r\n\r\n.sort-handle {\r\n\topacity: 0.1;\r\n\tpadding-left: 5px;\r\n\tpadding-right: 5px;\r\n\tcursor: pointer;\r\n\ttext-decoration: none;\r\n}\r\n.item:hover .sort-handle {\r\n\topacity: 0.3;\r\n}\r\n.sort-placeholder {\r\n\tdisplay: block;\r\n}\r\n\r\n/* vim:set ts=4 sw=4 ft=css : */\r\n"},"Templates/all_pages":{"text":"<macro src=\"../**\">\r\n\t<div class=\"item\">\r\n\t\t[@source(./path)]\r\n\t\t<span class=\"separator\"/>\r\n\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t</div>\r\n\t<else>\r\n\t\tNo pages...\r\n\t</else>\r\n</macro>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/EmptyOutline":{"text":"@include(./outline)\r\n"},"Templates/EmptyPage":{"text":"<!-- place filters here so as not to takup page space: ... -->\r\n\r\nPage @include(./path) is empty.<br><br>\r\n\r\nLinks to this page:<br>\r\n@include(./links)<br><br>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/EmptyToDo":{"text":"@include(./todo)\r\n"},"Templates/macros":{"text":"<macro name=\"remove-button\">\r\n\t<span page=\"./path\" class=\"remove-button button\">&times;</span>\r\n</macro>\r\n\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/outline":{"text":"<macro name=\"item-pre-controls\"/>\r\n\r\n<macro name=\"item-content\" class=\"item-content\">\r\n\t<include \r\n\t\t\tclass=\"raw\" \r\n\t\t\tcontenteditable \r\n\t\t\ttabindex=\"0\" \r\n\t\t\tstyle=\"display:inline-block\" \r\n\t\t\tsaveto=\"@source(./path)\" \r\n\t\t\tsrc=\".\" />\r\n</macro>\r\n\r\n<macro name=\"item-post-controls\">\r\n\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n</macro>\r\n\r\n\r\n<div>\r\n\t<span \r\n\t\t\tclass=\"raw\" \r\n\t\t\tcontenteditable \r\n\t\t\ttabindex=\"0\" \r\n\t\t\tsaveto=\"@source(../path)/@now()\" \r\n\t\t\tstyle=\"display:inline-block\" >\r\n\t\t+\r\n\t</span>\r\n</div>\r\n<div class=\"sortable\">\r\n\t<macro src=\"../*\" sort=\"checked -title\">\r\n\t\t<div class=\"item\">\r\n\t\t\t<div>\r\n\t\t\t\t<span class=\"sort-handle\">&#x2630;</span>\r\n\t\t\t\t<macro name=\"item-pre-controls\" src=\".\"/>\r\n\t\t\t\t<macro name=\"item-content\" src=\".\" />\r\n\t\t\t\t<span class=\"separator\"/>\r\n\t\t\t\t<macro name=\"item-post-controls\" src=\".\"/>\r\n\t\t\t</div>\r\n\t\t\t<div style=\"padding-left: 30px\">\r\n\t\t\t\t<include \r\n\t\t\t\t\t\tstyle=\"display:block\" \r\n\t\t\t\t\t\tsrc=\"@source(./path)/outline\" />\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</macro>\r\n</div>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/pages":{"text":"<macro src=\"../*\">\r\n\t<div class=\"item\">\r\n\t\t[@source(./path)]\r\n\t\t<span class=\"separator\"/>\r\n\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t</div>\r\n\t<else>\r\n\t\tNo pages...\r\n\t</else>\r\n</macro>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/todo":{"text":"<macro name=\"item-pre-controls\">\r\n\t<input type=\"checkbox\" class=\"state\" saveto=\"@source(./path)\"/>\r\n</macro>\r\n\r\n<include src=\"../outline\">\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/tree":{"text":"<div class=\"sortable\">\r\n\t<macro src=\"../*\">\r\n\t\t<div class=\"item\">\r\n\t\t\t<span class=\"sort-handle\">&#x2630;</span> \r\n\t\t\t<a href=\"#@source(./path)\">@source(./title)</a>\r\n\t\t\t<span class=\"separator\"/>\r\n\t\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t\t</div>\r\n\t\t<div style=\"padding-left: 30px\">\r\n\t\t\t<include style=\"display:block\" src=\"@source(./path)/tree\" />\r\n\t\t</div>\r\n\t</macro>\r\n</div>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_css":{"text":"<style>\r\n@source(..)\r\n</style>\r\n"},"Templates/_edit":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"toggle-edit-link\">(<a href=\"#..\">view</a>)</slot>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t<code><pre><quote src=\"../raw\" class=\"raw\" saveto=\"..\" contenteditable/></pre></code>\r\n</slot>\r\n\r\n<!-- @filter(-wikiword) -->\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_outline":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t@include(../outline)\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_todo":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t@include(../todo)\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_view":{"text":"\r\n@include(style/_css)\r\n\r\n<div>\r\n\t<a href=\"#pages\" class=\"pages-list-button button\">&#x2630;</a> \r\n\r\n\t[@source(../path)]\r\n\r\n\t<slot name=\"toggle-edit-link\"> (<a href=\"#./_edit\">edit</a>) </slot>\r\n\r\n\t<span class=\"separator\"/>\r\n\r\n\t<a href=\"#NewPage/_edit\" class=\"new-page-button button\">+</a>\r\n</div>\r\n\r\n<hr>\r\n\t<h1 saveto=\"..\">\r\n\t\t<slot name=\"title\" class=\"title\">@source(../title)</slot>\r\n\t</h1>\r\n<br>\r\n\r\n<slot name=\"page-content\">\r\n\t<include src=\"..\" class=\"text\" saveto=\"..\" tabindex=\"0\"/>\r\n</slot>\r\n\r\n<hr>\r\n<a href=\"#/\">home</a>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Doc/About":{"text":"# ![pWiki](img/pWiki-i.jpg) Portable Wiki (pWiki)\n\n_NOTE: the project is currently in prototype phase, thus while most things \nare likely to change, the implementation / API **will definitely** change! ;)_\n\n\n### Project goals / main features:\n\n- _Simple embeddable Wiki_\n\n  To be used as a zero-workflow app documentation platform, i.e. \n  documentation that can be created, edited, tweaked and updated in-app \n  without requiring setting up and maintaining a write-convert-embed \n  workflow.\n\n  This was a requirement on the _ImageGrid.Viewer_ project and as a \n  side-effect pWiki hosts it's own documentation too.\n\n- _Pluggable storage and synchronization_ mechanisms\n\n  A set of tools and API's to enable data synchronization between pWiki\n  instances.\n\n- _Self-hosted_ and flexible user interface\n\n  The pWiki interface is implemented as a set of pWiki pages and \n  templates within pWiki itself (see: [Templates] / [/bootstrap](bootstrap)), \n  this enables the user to customize the look feel and to some extent \n  the function of the interface from within pWiki, without touching the \n  code.\n\n- pWiki _portable app_\n\n  This is a simple note / todo / outline app.\n\n  The pWiki app is a stand-alone instance of pWiki wrapped in an app \n  supporting all major desktop as well as mobile platforms.\n\n  The app serves the following goals:\n\n    - a simple and functional note / todo / outline app (_obviously_)\n    - an external/portable Wiki editor, as an alternative for \n      in-target-app documentation editor with ability to seamlesly \n      synchronize with the target app pWiki instance.\n    - a stand-alone testing platform and reference implementation for \n      pWiki components.\n\n\n### General Documentation:\n- [Doc/About] / [general info](README.md) -- This document.\n- [Doc/Path] / [bootstrap path](bootstrap/Doc/Path.md) -- Path mechanics.\n- [Doc/Macros] / [bootstrap macros](bootstrap/Doc/Macros.md) -- Macro documentation\n\n\n<!-- @filter(markdown) -->\n<!-- vim:set ts=2 sw=2 expandtab spell : -->\n"},"WikiHome":{"text":"@include(Doc/About)"}}