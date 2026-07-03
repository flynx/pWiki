# ![pWiki](img/pWiki-i.jpg) pWiki Macros

## Syntax

Any macro can be used in any of the two forms, either _inline_ or _HTML-like_.

Inline:
```
@macro-name(value)

@macro-name(value text=" ...text... ")
```

HTML-style:
```
<macro-name arg="value"/>

<macro-name arg="value">
  ...text...
</macro-name>
```

The two forms are almost identical, with the only difference being that the 
inline form does not support body text (note that some macros may provide
this functionality as an argument, namely `slot`).

The two forms exist to fill two distinct functions:
- inline: compatible with attribute values and short
- html-like: element-like, simpler when dealing with html


### Positional and keyword attributes

Attributes (arguments) can be set sequentially by value, as they are 
defined or by name in any order.

The following are equivalent:
```
<slot abc "some text"/>
<slot name=abc text="some text"/>
<slot "some text" name=abc/>
```

Keyword attributes are special attributes that are given by name rather 
than by value by default and if no value is set explicitly it defaults 
to `true` if passed, and to false if omitted.

The following are equivalent:
```
<slot some-name hidden/>
<slot some-name hidden=true/>
```

### Special attributes

Two special attributes are handled differently: `text` and `body`, these 
are equivalent, the two names exist to make the semantics of macros simpler.

If both attributes are defined `body` takes precedence over `text` and 
both are overriden by a non-empty body, e.g. the following:
```
<slot slot text=text-attr body=body-attr>body</slot>
```
will resolve to `body`.

The main difference from normal attributes is that the value of these is
parsed in the same way as the element's body is. Thus, the following are
identical:
```
<macro-name text="body text"/>

<macro-name body="body text"/>

<macro-name>body text</macro-name>
```

The values are parsed lazily, i.e. only the final value is parsed, the 
overridden values are ignored.


### Escaping macros

Macros can be escaped for inclusion in the page, the two types of macros 
are escaped a bit differently:

- inline macros -- escaped by preceding with a "\"

  ```
  \\@include(\SomePage)
  ```

  Displayed in page as:

  \@include(\SomePage)

  <pwiki-comment>
  _NOTE: if displayed on github, this will show an extra "\" in both 
  cases, this should be ignored as pWiki will consume the escaping "\" 
  in both the code example and the preview._
  </pwiki-comment>


- html-like macros -- escaped _the HTML way_

  ```
  &lt;include src="\SomePage"\&gt;
  ```

  Displayed in page as:

  &lt;include src="\SomePage"\\&gt;



### Conditional comments

In addition to HTML and filter-specific comments pWiki provides two types
of conditional comments that serve two specific functions:

Show something in pWiki but hide it in HTML:
```
<!--\[pWiki[ ... ]]-->
```

Show something in HTML but hide in pWiki:
<pre>
&lt;pwiki-comment&gt; ... &lt;/pwiki-comment&gt;
</pre>


This will enable writing documents (mainly in _markdown_) that are usable 
bot from within pWiki as well as outside.



## Macros

### now ()

```
\@now()
```

Get current date in seconds since epoch, this is equivalet Javascript's
`Date.now()`.

This is mostly used for automatically creating paths (see: todo / outline)

This is different from `$NOW` in path (see: Doc/Path) in that this gets 
the date once per page load, i.e. the date changes on page load, while 
`$NOW` is set every time the path is used, i.e. on every click or script
use.

<pwiki-comment>Will produce: `1471389217848`</pwiki-comment>

<!--[pWiki[  Will produce: `@now()` ]]-->



### slot (<name> <text> shown|hidden) / content

```
@slot(<name>)
@slot(<name> <text>)
@slot(<name> <text> hidden)
@slot(<name> <text> shown)

<slot <name> ...>
	...
	<content/>
	...
</slot>
```

Define or fill a slot.

First occurrence of a slot `name` will _define_ a slot and set its value 
(fill it) with `text` if given.
Each new occurrence of a slot with the same name will override slot content.

Only the first occurance of the `name` slot macro is displayed by default.

Slot display can be explicitly controlled via the `hidden` and `shown` 
keywords, if both are given `hidden` has precedence. All _shown_ slots of 
the same name will display the same value.

Nested slots are processed in order of occurrence, i.e. a nested slot can 
override it's parent's value.

**Example:**
```
<slot X>
	some text 
	<slot X "new text"/>
</slot>
```
Will resolve to: `new text`

`<content/>` / `@content()` if encountered will be replaced with previous 
slot value.

**Example:**
```
This is: <slot X text="some text"/>

<slot X>[[ <content/> ]]</slot>
```
Will resolve to `This is: [[ some text ]]`


**Example:**

<pwiki-comment>
- [bootstrap view](/bootstrap/Templates/_view.html)
- [bootstrap edit](/bootstrap/Templates/_edit.html)
</pwiki-comment>

<!--[pWiki[
[Templates/\_view] / [bootstrap view](bootstrap/Templates/_view.html):
```
@source(Templates/_view)
```

[Templates/\_edit] / [bootstrap edit](bootstrap/Templates/_edit.html):
```
@source(Templates/_edit)
```
]]-->




---

### filter (name)

Enable or disable a page filter.

A filter is a way to transform the page source.

Arguments:
- `name` -- filter name. If name is preceded with a '-' then it 
will be forced off. This is useful for disabling _default_ filters, or 
filters added previously in templates.

Filters:
- wikiword (default)
- markdown

**Example:**


<!--[pWiki[
- `[Templates/_edit/_edit]` &ndash; _see the macro at the end of the page._
]]-->

<pwiki-comment>
- [bootstrap \_edit](/bootstrap/Templates/_edit.html) &ndash; _see the 
macro at the end of the page._
</pwiki-comment>



### include (src isolated recursive) / content

```
@include(<src>)
@include(<src> [recursive=".."] [join=".."] [isolated])
@include(<src> [recursive=".."] [join=".."] [isolated="partial"])

<include <src>>
	...
	<content/>
	...
</include>
```

Include a page. The included page is rendered relative to the spurce page
resolved from `<src>`, independently from current page, but in the current 
namespace, and is inserted as-is.

If body is not empty, it will render instead of included page content.
If body contains `<content/>` macro, it will be replaced with included 
page content.
If more than one page matches `<src>`, the body will be copied once per 
page and the page's content will be inserted into each respective `<content/>`
macro.

`join` is inserted between pages if more than one page is matched by `<src>`.

If `isolated` is given, prevent slots from included page from affecting 
the including page. 

**Example:**
`/some/page`:
```
<slot X value/>
```

Normal case: render included page but in view of current namespace:
```
<slot X original/><include src=/some/page> [ <content/> ] </include>
```
Will render to: `value [  ]`


Completely isolated:
```
<slot X original/><include src=/some/page isolated> [ <content/> ] </include>
```
Will render to: `original [ value ]`


Isolated up, i.e. the included page sees local state but can not affect it:
```
<slot X original/><include src=/some/page isolated=partial> [ <content/> ] </include>
```
Will render to: `original [  ]`


### source (src)

```
@source(<src>)

<source <src>>
	...
	<content/>
	...
</source>
```

Load page source into the current page.



### quote (src)

Insert a page without rendering. This is similar to include but will not
render the page. 

The difference between `source` and `quote` is:
- _source_ includes the page as-is
- _quotes_ escapes the page (i.e. _quotes_ it's source) for its code to 
  display in the rendered HTML correctly.

Arguments:
- `src` -- path to source page.

**Example:**

<pwiki-comment>
- [bootstrap css](/bootstrap/Templates/_css.html)
</pwiki-comment>

<!--[pWiki[
[Templates/\_css] / [bootstrap css](bootstrap/Templates/_css.html):
```
@source(Templates/_css)
```
]]-->


### macro (name src sort) / else ()

Apply macro to source page and include the result.

This is similar to include but does not require a separate page.

Both `name` and `src` are optional.

If `name` is given a _named macro_ is defined. This macro can be later 
referenced (used) by name. A named macro can be redefined/overridden.

If `src` is given a macro is applied to a specific page or range of pages
(see: WikiPath).

For a macro to be useful it must have a body (`text`), either defined as
a named macro or in the current macro.

Arguments:
- `name` -- macro name (optional).
- `src` -- path to source page (optional).
- `sort` -- space separated list of methods to use for item sorting


`else` macro is applicable inside `macro`. it is used when the `src` path
of `macro` matches no pages.

**Example:**

<pwiki-comment>
- [bootstrap pages](/bootstrap/Templates/pages.html)
</pwiki-comment>

<!--[pWiki[ 
[Templates/pages] / [bootstrap pages](bootstrap/Templates/pages.html):
```
@source(Templates/pages)
```
]]-->


<!-- @filter(markdown) -->
<!-- vim:set ts=4 sw=4 ft=markdown : -->
