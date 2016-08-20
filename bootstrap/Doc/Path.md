# ![pWiki](/img/pWiki-i.jpg) pWiki Path

XXX a Wiki is a set of pages, mostly top level pages, mosty titled in
WikiWord style, pWiki follows this culture but does not restrict either 
page nesting or title formatting. But following this style is recommended.

XXX write a set of recommendations...



## Basic terminology

**Path**  
_One or more strings (or parts) separated by "/" that identifies a view._

We call the last _part_ in a path sequence a _title_.

We call the sub-path without the _title_ a _basedir_ or simply _dir_.

In pWiki, there is no distinction between a page and a _directory_, thus
we do not use the later term, instead, we may use the term _sub-page_.

Paths are case sensitive.


**Page**  
_A set of data associated with a path._

A page is identified by it's path, but this does not require every
sub-path of that path to exist -- the full path is the identifier, not
a sequence of path parts.

Some pages are _bootstrapped_, i.e. are predefined in pWiki, these pages
can be overridden but can not be removed.


**View**  
_A path that resolves to a page that may or may not be at that specific
path._

A _view's_ path may match that of a specific page or may not match any
page directly, but any view will resolve to a page via the _acquisition 
process_

Any page is a view, every view resolves to a page, but not every view 
is a page.

(see: _Page acquisiton_ below)


**WikiWord**  
_XXX_


## Page acquisition

pWiki path system differs from how traditional file system paths are 
handled. In pWiki if a path does not reference a page directly (i.e. 
it's a _view_), a search is conducted to find an alternative page. This 
search is called _page acquisition_.

**Acquisition process:**  
_A set of rules defining how a page is retrieved via a path._


This is used as a simple and uniform mechanism to:
- Get default pages for specific situations  
  Like [Templates/EmptyPage] to handle the _page not found_ condition.
- define generic templates/pages accessible by multiple pages in path  
  A good example would be the viewer used to show this page [Templates/\_view]
  and all of it's _chrome_ like the path in the header and links in the 
  footer <pwiki-comment>(seen: when viewing through pWiki)</pwiki-comment>
- Overload default templates/pages


### The acquisition order/rules:

1. if _path_ matches a specific page, target _page_ is found 
1. if _path_ does not match a page:
  1. if _title_ matches a page in the parent _path_, _page_ is found
  1. repeat until we either have a match or reach root (empty _basedir_)
1. if no match is found, check if title exists in [Templates] in _basedir_
1. if no match is found, check if title exists in [/System]
1. if no match is found, repeat process for `EmptyPage` instead of _title_


**Example:**  

For path `Path/To/Page` the following paths are checked in order 
and the first matching page is returned:

- _Check path as-is then go up:_
  - `Path/To/Page` 
  - `Path/Page`
  - `Page`
- _Check in `Templates`, in path and up:_
  - `Path/To/Templates/Page`
  - `Path/Templates/Page`
  - `Templates/Page`
- _Check root `System`:_
  - `System/Page`
- _Check `EmptyPage` in path, then in templates:_
  - `Path/To/EmptyPage`
  - `Path/EmptyPage`
  - `EmptyPage`
  - `Path/To/Templates/EmptyPage`
  - `Path/Templates/EmptyPage`
  - `Templates/EmptyPage` _(This is guaranteed to exist)_


**Exceptions:**

- `System/settings` is global and _can not be overloaded_ for use as 
system configuration. This is done for security reasons.



## Default pages

XXX

- `Templates/EmptyPage`
- `Templates/EmptyToDo`
- `Templates/EmptyOutline`



## Relative and absolute paths (".", ".." and "/")

XXX



## Path patterns ("\*" and "\*\*")

XXX



## Path actions

XXX path elements that perform actions on pages but do not actually 
correspond to actual pages.



## Path variables

### `$NOW`

XXX

_Also see the `\@now()` macro: [Doc/Macros]._



## WikiWord

XXX not actualy part of the path spec but a way (culture) to define paths 
in pages + automatic link creation.


<!-- @filter(markdown) -->
<!-- vim:set ts=4 sw=4 ft=markdown spell : -->
