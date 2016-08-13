## Syntax

Any macro can be used in any of the two forms, either _inline_ or _HTML-like_.

Inline:
```
@macro-name(arg)
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


## Macros

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

Example:
- `[./_edit]` -- see the macro at the end of the page.


### include (src text)

Include a page. The included page is rendered independently from current
page and is inserted as-is in macro body.

Note that this will produce a `include` tag in the code that contains 
the included page, this makes this tag not suitable for use anywhere 
but an html element body.

Arguments:
- `src` -- path to source page.
- `text` -- is used when recursive include is detected and ignored otherwise.

### source (src) / quote (src)

Insert a page without rendering. This is similar to include but will not
render the page. 

The difference between `source` and `quote` is:
- _source_ includes the page as-is
- _quotes_ escapes the page (i.e. _quotes_ it's source) for its code to 
  display in the rendered HTML correctly.

Arguments:
- `src` -- path to source page.



### slot (name text)

Define or fill a slot.

First occurrence of a `name` will _define_ a slot and fill it with `text`.
Each new occurrence of a name will change slot content.


### macro (name src text) / else ()

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


`else` macro is applicable inside `macro`. it is used when the `src` path
of `macro` matches no pages.


<!-- @filter(markdown) -->
<!-- vim:set ts=4 sw=4 ft=markdown : -->
