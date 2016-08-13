// This file is generated automatically, all changes made here will be lost.

var Bootstrap = {"Templates":{"text":"<p>\r\nXXX Genereal template description...\r\n</p>\r\n\r\n<macro src=\"./*\">\r\n\t<hr>\r\n\t<h2>\r\n\t\t<a href=\"#@source(./path)/_edit\">@source(./path)</a>\r\n\t</h2>\r\n\t<p>\r\n\t\t<pre><code>@quote(./raw)</code></pre>\r\n\t</p>\r\n</macro>\r\n\r\n<!-- @filter(-wikiword) -->\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"WikiMacros":{"text":"## Syntax\r\n\r\nAny macro can be used in any of the two forms, either _inline_ or _HTML-like_.\r\n\r\nInline:\r\n```\r\n@macro-name(arg)\r\n```\r\n\r\nHTML-style:\r\n```\r\n<macro-name arg=\"value\"/>\r\n\r\n<macro-name arg=\"value\">\r\n  ...text...\r\n</macro-name>\r\n```\r\n\r\nThe two forms are almost identical, with the only difference being that the \r\ninline form does not support body text (note that some macros may provide\r\nthis functionality as an argument, namely `slot`).\r\n\r\nThe two forms exist to fill two distinct functions:\r\n- inline: compatible with attribute values and short\r\n- html-like: element-like, simpler when dealing with html\r\n\r\n\r\n## Macros\r\n\r\n### filter (name)\r\n\r\nEnable or disable a page filter.\r\n\r\nA filter is a way to transform the page source.\r\n\r\nArguments:\r\n- `name` -- filter name. If name is preceded with a '-' then it \r\nwill be forced off. This is useful for disabling _default_ filters, or \r\nfilters added previously in templates.\r\n\r\nFilters:\r\n- wikiword (default)\r\n- markdown\r\n\r\nExample:\r\n- `[./_edit]` -- see the macro at the end of the page.\r\n\r\n\r\n### include (src text)\r\n\r\nInclude a page. The included page is rendered independently from current\r\npage and is inserted as-is in macro body.\r\n\r\nNote that this will produce a `include` tag in the code that contains \r\nthe included page, this makes this tag not suitable for use anywhere \r\nbut an html element body.\r\n\r\nArguments:\r\n- `src` -- path to source page.\r\n- `text` -- is used when recursive include is detected and ignored otherwise.\r\n\r\n### source (src) / quote (src)\r\n\r\nInsert a page without rendering. This is similar to include but will not\r\nrender the page. \r\n\r\nThe difference between `source` and `quote` is:\r\n- _source_ includes the page as-is\r\n- _quotes_ escapes the page (i.e. _quotes_ it's source) for its code to \r\n  display in the rendered HTML correctly.\r\n\r\nArguments:\r\n- `src` -- path to source page.\r\n\r\n\r\n\r\n### slot (name text)\r\n\r\nDefine or fill a slot.\r\n\r\nFirst occurrence of a `name` will _define_ a slot and fill it with `text`.\r\nEach new occurrence of a name will change slot content.\r\n\r\n\r\n### macro (name src text) / else ()\r\n\r\nApply macro to source page and include the result.\r\n\r\nThis is similar to include but does not require a separate page.\r\n\r\nBoth `name` and `src` are optional.\r\n\r\nIf `name` is given a _named macro_ is defined. This macro can be later \r\nreferenced (used) by name. A named macro can be redefined/overridden.\r\n\r\nIf `src` is given a macro is applied to a specific page or range of pages\r\n(see: WikiPath).\r\n\r\nFor a macro to be useful it must have a body (`text`), either defined as\r\na named macro or in the current macro.\r\n\r\nArguments:\r\n- `name` -- macro name (optional).\r\n- `src` -- path to source page (optional).\r\n\r\n\r\n`else` macro is applicable inside `macro`. it is used when the `src` path\r\nof `macro` matches no pages.\r\n\r\n\r\n<!-- @filter(markdown) -->\r\n<!-- vim:set ts=4 sw=4 ft=markdown : -->\r\n"},"WikiPath":{"text":""},"System/settings":{"text":"/**********************************************************************\r\n* !EXPERIMENTAL!\r\n*\r\n* These filters are required for .code to be JSON compatible: \r\n*  @filter(json) @filter(-wikiword)\r\n*\r\n* NOTE: currently inline editing may mess this up.\r\n* NOTE: all the comments will be removed before parsing.\r\n*\r\n**********************************************************************/\r\n\r\n// The actual root data to be parsed...\r\n{\r\n  // Wiki config...\r\n  \"HomePage\": \"WikiHome\",\r\n  \"ShowSystemPages\": false,\r\n  \"ShowBasePages\": true,\r\n  // NOTE: setting this to true will effectively allow pages to control\r\n  //      your wiki. This is a potential threat if you allow untrusted\r\n  //      content on your wiki...\r\n  //      You are doing this at your own risk!\r\n  \"AllowScripts\": false,\r\n\r\n  // PeerJS API key...\r\n  \"PeerJS-API-key\": \"XXX\",\r\n  // PeerJS server URL (leave blank for default)...\r\n  \"PeerJS-Server\": null,\r\n\r\n  // XXX\r\n  \"CouchDB-Server\": null\r\n}\r\n\r\n\r\n/*********************************************************************/\r\n"},"System/style":{"text":".raw,\r\n.text {\r\n  display: block;\r\n}\r\n\r\ninput[type=\"checkbox\"][checked]~*,\r\n.checked {\r\n  text-decoration: line-through;\r\n}\r\n\r\n.button {\r\n  text-decoration: none;\r\n}\r\n.button:last-child {\r\n  margin-right: 5px;\r\n}\r\n\r\n.separator~* {\r\n  float: right;\r\n}\r\n\r\n.item:hover {\r\n  background-color: rgba(0, 0, 0, 0.05);\r\n}\r\n.item .button {\r\n  display: none;\r\n}\r\n.item:hover .button {\r\n  display: inline-block;\r\n}\r\n\r\n.sort-handle {\r\n  opacity: 0.1;\r\n  padding-left: 5px;\r\n  padding-right: 5px;\r\n  cursor: pointer;\r\n}\r\n.item:hover .sort-handle {\r\n  opacity: 0.3;\r\n}\r\n.sort-placeholder {\r\n  display: block;\r\n}\r\n"},"Templates/all_pages":{"text":"<macro src=\"../**\">\r\n\t<div class=\"item\">\r\n\t\t[@source(./path)]\r\n\t\t<span class=\"separator\"/>\r\n\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t</div>\r\n</macro>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/EmptyOutline":{"text":"@include(./outline)\r\n"},"Templates/EmptyPage":{"text":"<!-- place filters here so as not to takup page space: ... -->\r\n\r\nPage @include(./path) is empty.<br><br>\r\n\r\nLinks to this page:<br>\r\n@include(./links)<br><br>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/EmptyToDo":{"text":"@include(./todo)\r\n"},"Templates/outline":{"text":"<macro name=\"item-pre-controls\"/>\r\n\r\n<macro name=\"item-content\">\r\n\t<include \r\n\t\t\tclass=\"raw\" \r\n\t\t\tcontenteditable \r\n\t\t\ttabindex=\"0\" \r\n\t\t\tstyle=\"display:inline-block\" \r\n\t\t\tsaveto=\"@source(./path)\" \r\n\t\t\tsrc=\".\" />\r\n</macro>\r\n\r\n<macro name=\"item-post-controls\">\r\n\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n</macro>\r\n\r\n\r\n<div>\r\n\t<span \r\n\t\t\tclass=\"raw\" \r\n\t\t\tcontenteditable \r\n\t\t\ttabindex=\"0\" \r\n\t\t\tsaveto=\"@source(../path)/@now()\" \r\n\t\t\tstyle=\"display:inline-block\" >\r\n\t\t+\r\n\t</span>\r\n</div>\r\n<div class=\"sortable\">\r\n\t<macro src=\"../*\">\r\n\t\t<div class=\"item\">\r\n\t\t\t<div>\r\n\t\t\t\t<span class=\"sort-handle\">&#x2630;</span>\r\n\t\t\t\t<macro name=\"item-pre-controls\" src=\".\"/>\r\n\t\t\t\t<macro name=\"item-content\" src=\".\"/>\r\n\t\t\t\t<span class=\"separator\"/>\r\n\t\t\t\t<macro name=\"item-post-controls\" src=\".\"/>\r\n\t\t\t</div>\r\n\t\t\t<div style=\"padding-left: 30px\">\r\n\t\t\t\t<include \r\n\t\t\t\t\t\tstyle=\"display:block\" \r\n\t\t\t\t\t\tsrc=\"@source(./path)/outline\" />\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</macro>\r\n</div>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/pages":{"text":"<macro src=\"../*\">\r\n\t<div class=\"item\">\r\n\t\t[@source(./path)]\r\n\t\t<span class=\"separator\"/>\r\n\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t</div>\r\n</macro>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/todo":{"text":"<macro name=\"item-pre-controls\">\r\n\t<input type=\"checkbox\"/>\r\n</macro>\r\n\r\n<include src=\"../outline\">\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/tree":{"text":"<div class=\"sortable\">\r\n\t<macro src=\"../*\">\r\n\t\t<div class=\"item\">\r\n\t\t\t<span class=\"sort-handle\">&#x2630;</span> \r\n\t\t\t<a href=\"#@source(./path)\">@source(./title)</a>\r\n\t\t\t<span class=\"separator\"/>\r\n\t\t\t<a class=\"button\" href=\"#@source(./path)/delete\">&times;</a>\r\n\t\t</div>\r\n\t\t<div style=\"padding-left: 30px\">\r\n\t\t\t<include style=\"display:block\" src=\"@source(./path)/tree\" />\r\n\t\t</div>\r\n\t</macro>\r\n</div>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_css":{"text":"<style>\r\n@source(..)\r\n</style>\r\n"},"Templates/_edit":{"text":"<!-- @filter(-wikiword) -->\r\n\r\n<include src=\"../_view\"/>\r\n\r\n<slot name=\"toggle-edit-link\">(<a href=\"#..\">view</a>)</slot>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t<code><pre><quote src=\"../raw\" class=\"raw\" saveto=\"..\" contenteditable/></pre></code>\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_outline":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t@include(../outline)\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_raw":{"text":"@source(..)\r\n"},"Templates/_todo":{"text":"<include src=\"../_view\"/>\r\n\r\n<slot name=\"title\" class=\"title\" contenteditable saveto=\"..\">@source(../title)</slot>\r\n\r\n<slot name=\"page-content\">\r\n\t@include(../todo)\r\n</slot>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"},"Templates/_view":{"text":"\r\n@include(style/_css)\r\n\r\n<div>\r\n\t<a href=\"#pages\" class=\"pages-list-button button\">&#x2630;</a> \r\n\r\n\t[@source(../path)]\r\n\r\n\t<slot name=\"toggle-edit-link\"> (<a href=\"#./_edit\">edit</a>) </slot>\r\n\r\n\t<span class=\"separator\"/>\r\n\r\n\t<a href=\"#NewPage/_edit\" class=\"new-page-button button\">+</a>\r\n</div>\r\n\r\n<hr>\r\n\t<h1 saveto=\"..\">\r\n\t\t<slot name=\"title\">@source(../title)</slot>\r\n\t</h1>\r\n<br>\r\n\r\n<slot name=\"page-content\">\r\n\t<include src=\"..\" class=\"text\" saveto=\"..\" tabindex=\"0\"/>\r\n</slot>\r\n\r\n<hr>\r\n<a href=\"#/\">home</a>\r\n\r\n<!-- vim:set ts=4 sw=4 : -->\r\n"}}