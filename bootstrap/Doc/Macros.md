# ![pWiki](img/pWiki-i.jpg) pWiki Macros

## Syntax

Any macro can be used in any of the two forms, either _inline_ or _HTML-like_.

Inline:
```
@macro-name(value)
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



### Escaping macros

Macros can be escaped for inclusion in the page, the two types of macros 
are escaped a bit differently:

- inline macros -- escaped by preceding with a `\`

  ```
  \\@include(SomePage)
  ```

  Displayed in page as:

  \@include(SomePage)

  _NOTE: if displayed on github, this will show an extra "\" in both 
  cases, this should be ignored as pWiki will consume the escaping "\" 
  in both the code example and the preview._


- html-like macros -- escaped _the HTML way_

  ```
  &lt;include src="SomePage"\&gt;
  ```

  Displayed in page as:

  &lt;include src="SomePage"\\&gt;



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

or

\@pwiki-comment( ... )
</pre>


This will enable writing documents (mainly in _markdown_) that are usable 
bot from within pWiki as well as outside.


## Macros

### now ()

Get current date in seconds since epoch, this is equivalet Javascript's
`Date.now()`.

This is mostly used for automatically creating paths (see: todo / outline)

This is different from `$NOW` in path (see: Doc/Path) in that this gets 
the date once per page load, i.e. the date changes on page load, while 
`$NOW` is set every time the path is used, i.e. on every click or script
use.

**Example:**
```
\@now()
```
Will produce: `@now()` 

_NOTE: when viewing from outside of pWiki, this should look like: `1471389217848`_



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
- `[./_edit]` -- _see the macro at the end of the page._



### include (src isolated text)

Include a page. The included page is rendered independently from current
page and is inserted as-is in macro body.

Note that this will produce a `include` tag in the code that contains 
the included page, this makes this tag not suitable for use anywhere 
but an html element body.

Arguments:
- `src` -- path to source page.
- `isolated` -- prevent slots from included page from affecting the including page. 
- `text` -- is used when recursive include is detected and ignored otherwise.

_For examples see `slot` macro exaples below._



### source (src) / quote (src)

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
- [bootstrap css](bootstrap/Templates/_css.html)
</pwiki-comment>

<!--[pWiki[
[Templates/\_css] / [bootstrap css](bootstrap/Templates/_css.html):
```
@source(Templates/_css)
```
]]-->


### slot (name text)

Define or fill a slot.

First occurrence of a `name` will _define_ a slot and fill it with `text`.
Each new occurrence of a name will change slot content.

**Example:**

<pwiki-comment>
- [bootstrap view](bootstrap/Templates/_view.html)
- [bootstrap edit](bootstrap/Templates/_edit.html)
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
- [bootstrap pages](bootstrap/Templates/pages.html)
</pwiki-comment>

<!--[pWiki[ 
[Templates/pages] / [bootstrap pages](bootstrap/Templates/pages.html):
```
@source(Templates/pages)
```
]]-->


<!-- @filter(markdown) -->
<!-- vim:set ts=4 sw=4 ft=markdown : -->
