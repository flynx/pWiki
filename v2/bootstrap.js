// This file is generated automatically, all changes made here will be lost.

var Bootstrap = {"Doc":{"text":"@include(./About)\r\n"},"Templates":{"text":"<p>\r\nXXX Genereal template description...\r\n</p>\r\n\r\n<macro name=\"show-source\" src=\"./**\" sort=\"path\">\r\n\t<hr>\r\n\t<h2>\r\n\t\t<a href=\"#@source(./path)/_edit\">@source(./path)</a>\r\n\t</h2>\r\n\t<p>\r\n\t\t<pre><code>@quote(./raw)</code></pre>\r\n\t</p>\r\n</macro>\r\n\r\n<macro name=\"show-source\" src=\"Templates\"/>\r\n\r\n<macro name=\"show-source\" src=\"System/style\"/>\r\n\r\n<!-- @filter(-wikiword) -->\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"TestTodo":{"text":"[Templates/outline/_edit]\r\n\r\n@include(./todo)\r\n"},"Doc/About":{"text":"# ![pWiki](img/pWiki-i.jpg) Portable Wiki (pWiki)\n\n_NOTE: the project is currently in prototype phase, thus while most things \nare likely to change, the implementation / API **will definitely** change! ;)_\n\n\n### Project goals / main features:\n\n- _Simple embeddable Wiki_\n\n  To be used as a zero-workflow app documentation platform, i.e. \n  documentation that can be created, edited, tweaked and updated in-app \n  without requiring setting up and maintaining a write-convert-embed \n  workflow.\n\n  This was a requirement on the _\\ImageGrid.Viewer_ project and as a \n  side-effect pWiki hosts it's own documentation too.\n\n- _Pluggable storage and synchronization_ mechanisms\n\n  A set of tools and API's to enable data synchronization between pWiki\n  instances.\n\n- _Self-hosted[*]_ and flexible user interface\n\n  The pWiki interface is implemented as a set of pWiki pages and \n  templates within pWiki itself (see: [Templates] / [/bootstrap](bootstrap)), \n  this enables the user to customize the look feel and to some extent \n  the function of the interface from within pWiki, without touching the \n  code.\n\n  [*]: \"Self-hosted\" here is meant in the old-school meaning of the word, \n  i.e. hosted on the client.\n\n- pWiki _portable app_\n\n  This is a simple note / todo / outline app.\n\n  The pWiki app is a stand-alone instance of pWiki wrapped in an app \n  supporting all major desktop as well as mobile platforms.\n\n  The app serves the following goals:\n\n    - a simple and functional note / todo / outline app (_obviously_)\n    - an external/portable Wiki editor, as an alternative for \n      in-target-app documentation editor with ability to seamlesly \n      synchronize with the target app pWiki instance.\n    - a stand-alone testing platform and reference implementation for \n      pWiki components.\n\n### General Documentation:\n<!--\nNOTE: newlines here are needed to satisfy all the various markdown \n      engines, especially GitHub's... \n-->\n<pwiki-comment>\n\n- [General info](README.md) - This document.\n- [Bootstrap path](bootstrap/Doc/Path.md) - Path mechanics.\n- [Bootstrap macros](bootstrap/Doc/Macros.md) - Macro documentation\n\n</pwiki-comment>\n\n<!--[pWiki[\n\n- [Doc/About] - This document.\n- [Doc/Path] - Path mechanics.\n- [Doc/Macros] - Macro documentation\n\n]]-->\n\n\n### Project:\n\n- The project on [GitHub](https://github.com/flynx/pWiki)\n- pWiki [live demo (hosted on Gitgub)](https://flynx.github.io/pWiki/) _&ndash; \nThe data is stored in sessionStorage on the client, closing the tab/browser \nwill reset the wiki._\n\n\n### License and Copyright\n\npWiki is developed by [Alex A. Naanou](https://github.com/flynx) and \nlicensed under the <pwiki-comment>[3-Clause BSD License](LICENSE)\n</pwiki-comment><!--[pWiki[ [3-Clause BSD License](#LICENSE) ]]-->\n\n\n\n<!-- @filter(markdown) -->\n<!-- vim:set ts=2 sw=2 expandtab spell : -->\n"},"Doc/Macros":{"text":"# ![pWiki](img/pWiki-i.jpg) pWiki Macros\r\n\r\n## Syntax\r\n\r\nAny macro can be used in any of the two forms, either _inline_ or _HTML-like_.\r\n\r\nInline:\r\n```\r\n@macro-name(value)\r\n```\r\n\r\nHTML-style:\r\n```\r\n<macro-name arg=\"value\"/>\r\n\r\n<macro-name arg=\"value\">\r\n  ...text...\r\n</macro-name>\r\n```\r\n\r\nThe two forms are almost identical, with the only difference being that the \r\ninline form does not support body text (note that some macros may provide\r\nthis functionality as an argument, namely `slot`).\r\n\r\nThe two forms exist to fill two distinct functions:\r\n- inline: compatible with attribute values and short\r\n- html-like: element-like, simpler when dealing with html\r\n\r\n\r\n\r\n### Escaping macros\r\n\r\nMacros can be escaped for inclusion in the page, the two types of macros \r\nare escaped a bit differently:\r\n\r\n- inline macros -- escaped by preceding with a \"\\\"\r\n\r\n  ```\r\n  \\\\@include(\\SomePage)\r\n  ```\r\n\r\n  Displayed in page as:\r\n\r\n  \\@include(\\SomePage)\r\n\r\n  <pwiki-comment>\r\n  _NOTE: if displayed on github, this will show an extra \"\\\" in both \r\n  cases, this should be ignored as pWiki will consume the escaping \"\\\" \r\n  in both the code example and the preview._\r\n  </pwiki-comment>\r\n\r\n\r\n- html-like macros -- escaped _the HTML way_\r\n\r\n  ```\r\n  &lt;include src=\"\\SomePage\"\\&gt;\r\n  ```\r\n\r\n  Displayed in page as:\r\n\r\n  &lt;include src=\"\\SomePage\"\\\\&gt;\r\n\r\n\r\n\r\n### Conditional comments\r\n\r\nIn addition to HTML and filter-specific comments pWiki provides two types\r\nof conditional comments that serve two specific functions:\r\n\r\nShow something in pWiki but hide it in HTML:\r\n```\r\n<!--\\[pWiki[ ... ]]-->\r\n```\r\n\r\nShow something in HTML but hide in pWiki:\r\n<pre>\r\n&lt;pwiki-comment&gt; ... &lt;/pwiki-comment&gt;\r\n</pre>\r\n\r\n\r\nThis will enable writing documents (mainly in _markdown_) that are usable \r\nbot from within pWiki as well as outside.\r\n\r\n\r\n## Macros\r\n\r\n### now ()\r\n\r\nGet current date in seconds since epoch, this is equivalet Javascript's\r\n`Date.now()`.\r\n\r\nThis is mostly used for automatically creating paths (see: todo / outline)\r\n\r\nThis is different from `$NOW` in path (see: Doc/Path) in that this gets \r\nthe date once per page load, i.e. the date changes on page load, while \r\n`$NOW` is set every time the path is used, i.e. on every click or script\r\nuse.\r\n\r\n**Example:**\r\n```\r\n\\@now()\r\n```\r\n\r\n<pwiki-comment>Will produce: `1471389217848`</pwiki-comment>\r\n\r\n<!--[pWiki[  Will produce: `@now()` ]]-->\r\n\r\n\r\n\r\n### filter (name)\r\n\r\nEnable or disable a page filter.\r\n\r\nA filter is a way to transform the page source.\r\n\r\nArguments:\r\n- `name` -- filter name. If name is preceded with a '-' then it \r\nwill be forced off. This is useful for disabling _default_ filters, or \r\nfilters added previously in templates.\r\n\r\nFilters:\r\n- wikiword (default)\r\n- markdown\r\n\r\n**Example:**\r\n\r\n\r\n<!--[pWiki[\r\n- `[Templates/_edit/_edit]` &ndash; _see the macro at the end of the page._\r\n]]-->\r\n\r\n<pwiki-comment>\r\n- [bootstrap \\_edit](/bootstrap/Templates/_edit.html) &ndash; _see the \r\nmacro at the end of the page._\r\n</pwiki-comment>\r\n\r\n\r\n\r\n### include (src isolated text)\r\n\r\nInclude a page. The included page is rendered independently from current\r\npage and is inserted as-is in macro body.\r\n\r\nNote that this will produce a `include` tag in the code that contains \r\nthe included page, this makes this tag not suitable for use anywhere \r\nbut an html element body.\r\n\r\nArguments:\r\n- `src` -- path to source page.\r\n- `isolated` -- prevent slots from included page from affecting the including page. \r\n- `text` -- is used when recursive include is detected and ignored otherwise.\r\n\r\n_For examples see `slot` macro exaples below._\r\n\r\n\r\n\r\n### source (src) / quote (src)\r\n\r\nInsert a page without rendering. This is similar to include but will not\r\nrender the page. \r\n\r\nThe difference between `source` and `quote` is:\r\n- _source_ includes the page as-is\r\n- _quotes_ escapes the page (i.e. _quotes_ it's source) for its code to \r\n  display in the rendered HTML correctly.\r\n\r\nArguments:\r\n- `src` -- path to source page.\r\n\r\n**Example:**\r\n\r\n<pwiki-comment>\r\n- [bootstrap css](/bootstrap/Templates/_css.html)\r\n</pwiki-comment>\r\n\r\n<!--[pWiki[\r\n[Templates/\\_css] / [bootstrap css](bootstrap/Templates/_css.html):\r\n```\r\n@source(Templates/_css)\r\n```\r\n]]-->\r\n\r\n\r\n### slot (name text)\r\n\r\nDefine or fill a slot.\r\n\r\nFirst occurrence of a `name` will _define_ a slot and fill it with `text`.\r\nEach new occurrence of a name will change slot content.\r\n\r\n**Example:**\r\n\r\n<pwiki-comment>\r\n- [bootstrap view](/bootstrap/Templates/_view.html)\r\n- [bootstrap edit](/bootstrap/Templates/_edit.html)\r\n</pwiki-comment>\r\n\r\n<!--[pWiki[\r\n[Templates/\\_view] / [bootstrap view](bootstrap/Templates/_view.html):\r\n```\r\n@source(Templates/_view)\r\n```\r\n\r\n[Templates/\\_edit] / [bootstrap edit](bootstrap/Templates/_edit.html):\r\n```\r\n@source(Templates/_edit)\r\n```\r\n]]-->\r\n\r\n\r\n### macro (name src sort) / else ()\r\n\r\nApply macro to source page and include the result.\r\n\r\nThis is similar to include but does not require a separate page.\r\n\r\nBoth `name` and `src` are optional.\r\n\r\nIf `name` is given a _named macro_ is defined. This macro can be later \r\nreferenced (used) by name. A named macro can be redefined/overridden.\r\n\r\nIf `src` is given a macro is applied to a specific page or range of pages\r\n(see: WikiPath).\r\n\r\nFor a macro to be useful it must have a body (`text`), either defined as\r\na named macro or in the current macro.\r\n\r\nArguments:\r\n- `name` -- macro name (optional).\r\n- `src` -- path to source page (optional).\r\n- `sort` -- space separated list of methods to use for item sorting\r\n\r\n\r\n`else` macro is applicable inside `macro`. it is used when the `src` path\r\nof `macro` matches no pages.\r\n\r\n**Example:**\r\n\r\n<pwiki-comment>\r\n- [bootstrap pages](/bootstrap/Templates/pages.html)\r\n</pwiki-comment>\r\n\r\n<!--[pWiki[ \r\n[Templates/pages] / [bootstrap pages](bootstrap/Templates/pages.html):\r\n```\r\n@source(Templates/pages)\r\n```\r\n]]-->\r\n\r\n\r\n<!-- @filter(markdown) -->\r\n<!-- vim:set ts=4 sw=4 ft=markdown : -->\r\n"},"Doc/Path":{"text":"# ![pWiki](img/pWiki-i.jpg) pWiki Path\r\n\r\nA Wiki is a set of _pages_, each uniquely defined by it's _title_. Titles \r\nare traditionally formatted as WikiWords. pWiki closely follows this \r\nculture, while not restricting either page title formatting nor page \r\nnesting (nested paths), though in the general case following the Wiki \r\nstyle is recommended.\r\n\r\n\r\n\r\n## Basic terminology\r\n\r\n**Path**  \r\n_One or more strings (or parts) separated by \"/\" that identifies a view._\r\n\r\nWe call the last _part_ in a path sequence a _title_.\r\n\r\nWe call the sub-path without the _title_ a _basedir_ or simply _dir_.\r\n\r\nIn pWiki, there is no distinction between a page and a _directory_, thus\r\nwe do not use the later term, instead, we may use the term _sub-page_.\r\n\r\nPaths are case sensitive.\r\n\r\n\r\n**Page**  \r\n_A set of data associated with a path._\r\n\r\nA page is identified by it's path, but this does not require every\r\nsub-path of that path to exist -- the full path is the identifier.\r\n\r\nNot every path _identifies_ a page, but every path _resolves_ to a page.\r\n\r\nSome pages are _bootstrapped_, i.e. are predefined in pWiki, these pages\r\ncan be overridden but can not be removed. This is done to make it simple \r\nto revert to the default state if something goes wrong.\r\n\r\n\r\n**View**  \r\n_A path that resolves to a page that may or may not be at (identified by) \r\nthat specific path._\r\n\r\nA _view's_ path may match that of a specific page or may not match any\r\npage directly, but any view will resolve to a page via the _acquisition \r\nprocess_\r\n\r\nAny page is a view, every view resolves to a page, but not every view \r\nis a page.\r\n\r\n(see: _Page acquisiton_ below)\r\n\r\n\r\n**\\WikiWord**  \r\n_A WikiWork is a specially formated string that is treated as a link in\r\npage text_\r\n\r\nIn pWiki a simple WikiWord is any string starting with a capital letter,\r\nmust contain at least and one more capital letter and can consist of \r\nletters, numbers, underscores (WikiWord itself is a good example)\r\n\r\nA WikiWord path (_WikiPath_) is a set of path parts separated by '/' the\r\nfirst part must start with a capital letter and the rest can contain \r\nletters, numbers and/or underscores (example: Path/to/somepage).\r\n\r\n_Note that this is not actually a part of the path specification but it \r\nis part of the Wiki culture and a convenient way to automatically link \r\nto pages (handled by pWiki macros when rendering pages)._\r\n\r\n\r\n\r\n**Special path characters**  \r\nTitles of _user pages_ must not contain the leading underscore `_` \r\ncharacter, such paths are used internally.\r\n\r\n\r\n\r\n## Page acquisition\r\n\r\npWiki path system differs from how traditional file system paths are \r\nhandled. In pWiki if a path does not reference a page directly (i.e. \r\nit's a _view_), a search is conducted to find an alternative page. This \r\nsearch is called _page acquisition_.\r\n\r\n**Acquisition process:**  \r\n_A set of rules defining how a page is retrieved via a path._\r\n\r\n\r\nThis is used as a simple and uniform mechanism to:\r\n- Get default pages for specific situations  \r\n  Like [Templates/EmptyPage] to handle the _page not found_ condition.\r\n- Define generic templates/pages accessible by multiple pages in path  \r\n  A good example would be the viewer used to show this page [Templates/\\_view]\r\n  and all of it's _chrome_ like the path in the header and links in the \r\n  footer <pwiki-comment>(seen: when viewing through pWiki)</pwiki-comment>\r\n- Overload default templates/pages\r\n\r\n\r\n### The acquisition order/rules:\r\n\r\n1. if _path_ matches a specific page, target _page_ is found \r\n1. if _path_ does not match a page:\r\n  1. if _title_ matches a page in the parent _path_, _page_ is found\r\n  1. repeat until we either have a match or reach root (empty _basedir_)\r\n1. if no match is found, check if title exists in [Templates] in _basedir_\r\n1. if no match is found, check if title exists in [/System]\r\n1. if no match is found, repeat process for `EmptyPage` instead of _title_\r\n\r\n\r\n**Example:**  \r\n\r\nFor path `Path/To/Page` the following paths are checked in order \r\nand the first matching page is returned:\r\n\r\n- _Check path as-is then go up:_\r\n  - `Path/To/Page` \r\n  - `Path/Page`\r\n  - `Page`\r\n- _Check in `Templates`, in path and up:_\r\n  - `Path/To/Templates/Page`\r\n  - `Path/Templates/Page`\r\n  - `Templates/Page`\r\n- _Check root `System`:_\r\n  - `System/Page`\r\n- _Check `EmptyPage` in path, then in templates:_\r\n  - `Path/To/EmptyPage`\r\n  - `Path/EmptyPage`\r\n  - `EmptyPage`\r\n  - `Path/To/Templates/EmptyPage`\r\n  - `Path/Templates/EmptyPage`\r\n  - `Templates/EmptyPage` _(This is guaranteed to exist)_\r\n\r\n\r\n**Exceptions:**\r\n\r\n- `System/settings` is global and _can not be overloaded_ for use as \r\nsystem configuration. This is done for security reasons.\r\n\r\n\r\n\r\n## Default pages\r\n\r\n**EmptyPage**  \r\nA page resolved when a page does not exist. Used as a template for \r\nnew/empty pages.\r\n\r\nThis page is guaranteed to exist by the system.\r\n\r\nLocated at: Templates/EmptyPage\r\n\r\n\r\n**EmptyToDo**   \r\nUsed as a template for new/empty ToDo pages.\r\n\r\nLocated at: Templates/EmptyToDo\r\n\r\n\r\n**EmptyOutline**  \r\nUsed as a template for new/empty outline pages.\r\n\r\nLocated at: Templates/EmptyOutline\r\n\r\n\r\n**NoMatch**  \r\nReturned when pattern matches no pages.\r\n\r\n\r\n\r\n## Relative and absolute paths\r\n\r\npWiki follows the traditional path semantics with one addition, the \"&gt;&gt;\"\r\nthat is similar to \"..\" but works in the opposite direction, consuming \r\nthe next, i.e. child, path element instead of parent.\r\n\r\nTo illustrate the relative and absolute mechanics:\r\n\r\n| Title\t\t\t\t| Source Page | Path\t\t\t\t  | Resolves to\t\t\t\t|\r\n|-------------------|-------------|-----------------------|-------------------------|\r\n| \".\" - current\t\t| \\SourcePage | \\\\./Target/Page\t\t  | \\SourcePage/Target/Page |\r\n| \"..\" - parent\t\t| \\SourcePage | \\\\../Target/Page\t  | \\Target/Page\t\t\t|\r\n| \"&gt;&gt;\"\t\t| \\SourcePage | &gt;&gt;\\/Target/Page | \\SourcePage/Page\t\t|\r\n| \"/\" - root dir\t| \\SourcePage | \\/Target/Page\t\t  | \\/Target/Page\t\t\t|\r\n\r\n\r\n_Note that neither a leading \"..\" at root level, nor a trailing \"&gt;&gt;\" \r\nin any path, will have any effect, and will simply be ignored (e.g. \r\n\"\\/../Page\" is same as \"/Page\" and \"\\Path/&gt;&gt;\" is the same as \"Path\")_\r\n\r\n\r\n\r\n## Path patterns\r\n\r\nPath patterns are used to match/iterate multiple pages. The syntax is \r\nsimilar to path glob patterns.\r\n\r\n- \"\\*\" - matches any page in a sub-path on one level\r\n- \"\\*\\*\" - matches any page in a sub-path recursively\r\n\r\nNote that neither will match parts of paths that do not explicitly \r\nidentify pages.\r\n\r\n\r\n**Example:**\r\n\r\nXXX revise...\r\n\r\nFor the following paths:\r\n\r\n```\r\nWikiHome\r\nSomePage\r\nPath/to/OtherPage\r\nPath/Page\r\n```\r\n\r\nPatterns and their matches:\r\n- `*` will match:\r\n\t- WikiHome\r\n\t- SomePage\r\n- `**` will match:\r\n\t- WikiHome\r\n\t- SomePage\r\n\t- Path/to/OtherPage\r\n\t- Path/Page\r\n- `\\Path/*` will match:\r\n\t- Path/Page\r\n\r\nNote that neither `\\Path` nor `\\Path/to` does not refer to any real pages,\r\nthus neither is matched by any of the patterns explicitly.\r\n\r\n\r\n\r\n## Path actions\r\n\r\nXXX path elements that perform actions on pages but do not actually \r\ncorrespond to actual pages.\r\n\r\n\r\n\r\n## Path variables\r\n\r\nPath variables are resolved when path is resolved or accessed.\r\n\r\n**`$NOW`**  \r\nReplaced with the current time.\r\n\r\n_Also see the `\\@now()` macro: [Doc/Macros]._\r\n\r\n\r\n**`$PATH`**  \r\nReplaced with current page path.\r\n\r\n\r\n**`$BASE`**  \r\nReplaced with current page basedir.\r\n\r\n\r\n**`$TITLE`**  \r\nReplaced with current page title.\r\n\r\n\r\n**`$INDEX`**  \r\nReplaced with current page index in pattern matching.\r\n\r\n\r\n\r\n<!-- @filter(markdown) -->\r\n<!-- vim:set ts=4 sw=4 ft=markdown spell : -->\r\n"},"Doc/Templates":{"text":"XXX Document the template structure here XXX\r\n"},"System/style":{"text":"body {\r\n\tfont-family: /*worksans,*/ opensans, sans-serif;\r\n\r\n}\r\n\r\n.title img {\r\n\tvertical-align: middle;\r\n}\r\n\r\nh1, h2, h3 {\r\n\tborder-bottom: solid 1px rgba(0, 0, 0, 0.1);\r\n\tpadding-bottom: 5px;\r\n}\r\nh2, h3 {\r\n\tborder-bottom: solid 1px rgba(0, 0, 0, 0.05);\r\n}\r\n\r\n\r\n/* tables */\r\ntable {\r\n\twidth: 100%;\r\n}\r\ntable, td, th {\r\n\tborder-bottom: solid 1px gray;\r\n\tborder-collapse: collapse;\r\n}\r\ntd, th {\r\n\ttext-align: left;\r\n\tpadding: 5px;\r\n}\r\ntr:hover {\r\n\tbackground-color: rgba(0, 0, 0, 0.05);\r\n}\r\n\r\n\r\n.raw,\r\n.text {\r\n\tdisplay: block;\r\n}\r\n\r\n.item.checked {\r\n\topacity: 0.3;\r\n}\r\n.item.checked:hover {\r\n\topacity: 0.8;\r\n}\r\n.item.checked .item-content * {\r\n\ttext-decoration: line-through;\r\n}\r\n\r\n.button {\r\n\ttext-decoration: none;\r\n}\r\n.button:last-child {\r\n\tmargin-right: 5px;\r\n}\r\n\r\n.separator~* {\r\n\tfloat: right;\r\n}\r\n\r\npre {\r\n\tdisplay: block;\r\n\tbackground-color: rgba(0, 0, 0, 0.05);\r\n\tpadding: 10px;\r\n\tpadding-bottom: 15px;\r\n\r\n\t-moz-tab-size: 4;\r\n\t-o-tab-size: 4;\r\n\ttab-size: 4;\r\n}\r\n\r\n.item:hover {\r\n\tbackground-color: rgba(0, 0, 0, 0.05);\r\n}\r\n.item .button {\r\n\tdisplay: none;\r\n}\r\n.item:hover .button {\r\n\tdisplay: inline-block;\r\n}\r\n\r\n.sort-handle {\r\n\topacity: 0.1;\r\n\tpadding-left: 5px;\r\n\tpadding-right: 5px;\r\n\tcursor: pointer;\r\n\ttext-decoration: none;\r\n}\r\n.item:hover .sort-handle {\r\n\topacity: 0.3;\r\n}\r\n.sort-placeholder {\r\n\tdisplay: block;\r\n}\r\n\r\n/* @filter(-wikiword) */\r\n/* @filter(text) */\r\n/* vim:set ts=4 sw=4 ft=css : */\r\n"},"Templates/all_pages":{"text":"<macro src=\"../**\">\r\n\t<div class=\"item\">\r\n\t\t[@source(./path)]\r\n\t\t<span class=\"separator\"/>\r\n\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t</div>\r\n\t<else>\r\n\t\tNo pages...\r\n\t</else>\r\n</macro>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/EmptyOutline":{"text":"@include(./outline)\r\n"},"Templates/EmptyPage":{"text":"<!-- place filters here so as not to takup page space: ... -->\r\n\r\nPage @include(./path) is empty.<br><br>\r\n\r\nLinks to this page:<br>\r\n@include(./links)<br><br>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/EmptyToDo":{"text":"@include(./todo)\r\n"},"Templates/macros":{"text":"<macro name=\"remove-button\">\r\n\t<span page=\"./path\" class=\"remove-button button\">&times;</span>\r\n</macro>\r\n\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/outline":{"text":"<macro name=\"item-pre-controls\"/>\r\n\r\n<macro name=\"item-content\" class=\"item-content\">\r\n\t<include \r\n\t\t\tclass=\"raw\" \r\n\t\t\tcontenteditable \r\n\t\t\ttabindex=\"0\" \r\n\t\t\tstyle=\"display:inline-block\" \r\n\t\t\tsaveto=\"@source(./path)\" \r\n\t\t\tsrc=\".\" />\r\n</macro>\r\n\r\n<macro name=\"item-post-controls\">\r\n\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n</macro>\r\n\r\n\r\n<div>\r\n\t<span \r\n\t\t\tclass=\"raw\" \r\n\t\t\tcontenteditable \r\n\t\t\ttabindex=\"0\" \r\n\t\t\tsaveto=\"@source(../path)/@now()\" \r\n\t\t\tstyle=\"display:inline-block\" >\r\n\t\t+\r\n\t</span>\r\n</div>\r\n<div class=\"sortable\">\r\n\t<macro src=\"../*\" sort=\"checked order -title\">\r\n\t\t<div class=\"item\">\r\n\t\t\t<div>\r\n\t\t\t\t<span class=\"sort-handle\">&#x2630;</span>\r\n\t\t\t\t<macro name=\"item-pre-controls\" src=\".\"/>\r\n\t\t\t\t<macro name=\"item-content\" src=\".\" />\r\n\t\t\t\t<span class=\"separator\"/>\r\n\t\t\t\t<macro name=\"item-post-controls\" src=\".\"/>\r\n\t\t\t</div>\r\n\t\t\t<div style=\"padding-left: 30px\">\r\n\t\t\t\t<include \r\n\t\t\t\t\t\tstyle=\"display:block\" \r\n\t\t\t\t\t\tsrc=\"@source(./path)/outline\" />\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</macro>\r\n</div>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/pages":{"text":"<macro src=\"../*\">\r\n\t<div class=\"item\">\r\n\t\t[@source(./path)]\r\n\t\t<span class=\"separator\"/>\r\n\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t</div>\r\n\t<else>\r\n\t\tNo pages...\r\n\t</else>\r\n</macro>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/todo":{"text":"<macro name=\"item-pre-controls\">\r\n\t<input type=\"checkbox\" class=\"state\" saveto=\"@source(./path)\"/>\r\n</macro>\r\n\r\n<include src=\"../outline\">\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/tree":{"text":"<div class=\"sortable\">\r\n\t<macro src=\"../*\">\r\n\t\t<div class=\"item\">\r\n\t\t\t<span class=\"sort-handle\">&#x2630;</span> \r\n\t\t\t<a href=\"#@source(./path)\">@source(./title)</a>\r\n\t\t\t<span class=\"separator\"/>\r\n\t\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t\t</div>\r\n\t\t<div style=\"padding-left: 30px\">\r\n\t\t\t<include style=\"display:block\" src=\"@source(./path)/tree\" />\r\n\t\t</div>\r\n\t</macro>\r\n</div>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_css":{"text":"<style>\r\n@source(..)\r\n</style>\r\n"},"Templates/_edit":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"toggle-edit-link\">(<a href=\"#..\">view</a>)</slot>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t<code><pre><quote src=\"../raw\" class=\"raw\" saveto=\"..\" contenteditable/></pre></code>\r\n</slot>\r\n\r\n<!-- @filter(-wikiword) -->\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_outline":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t@include(../outline)\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_raw":{"text":"@source(..)\r\n"},"Templates/_todo":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t@include(../todo)\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_view":{"text":"\r\n@include(./style/_css)\r\n\r\n<div>\r\n\t<a href=\"#pages\" class=\"pages-list-button button\">&#x2630;</a> \r\n\r\n\t[@source(../path)]\r\n\r\n\t<slot name=\"toggle-edit-link\"> (<a href=\"#./_edit\">edit</a>) </slot>\r\n\r\n\t<span class=\"separator\"/>\r\n\r\n\t<a href=\"#NewPage/_edit\" class=\"new-page-button button\">+</a>\r\n</div>\r\n\r\n<hr>\r\n\t<h1 saveto=\"..\">\r\n\t\t<slot name=\"title\" class=\"title\">@source(../title)</slot>\r\n\t</h1>\r\n<br>\r\n\r\n<div>\r\n\t<slot name=\"page-content\">\r\n\t\t<include src=\"..\" class=\"text\" saveto=\"..\" tabindex=\"0\"/>\r\n\t</slot>\r\n</div>\r\n\r\n<hr>\r\n<a href=\"#/\">home</a>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Test/slot":{"text":"\r\n<slot name=first text=\"first slot default\"/>\r\n\r\n"},"TestTodo/01":{"text":"item 1\n"},"TestTodo/02":{"text":"item 2\n"},"TestTodo/03":{"text":"item 3\n"},"TestTodo/04":{"text":"item 4\n"},"Theme/CLI/tree":{"text":"@source(../name)<macro src=\"../*\">\n  <include src=\"@source(./path)/tree\" recursive=\"...\"/></macro>\n"},"WikiHome":{"text":"@include(Doc/About)"},"LICENSE":{"text":"Copyright (c) 2016-2019, Alex A. Naanou\nAll rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n* Redistributions of source code must retain the above copyright notice, this\n  list of conditions and the following disclaimer.\n\n* Redistributions in binary form must reproduce the above copyright notice,\n  this list of conditions and the following disclaimer in the documentation\n  and/or other materials provided with the distribution.\n\n* Neither the name of the copyright holder nor the names of its\n  contributors may be used to endorse or promote products derived from\n  this software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\"\nAND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\nIMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n<!-- @filter(text) -->"}} 

typeof(module) != "undefined"
	&& (module.exports = Bootstrap)