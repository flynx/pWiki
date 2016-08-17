# ![pWiki](img/pWiki-i.jpg) pWiki Path

XXX a Wiki is a set of pages, mostly top level pages, mosty titled in
WikiWord style, pWiki follows this culture but does not restrict either 
page nesting or title formatting. But following this style is recommended.

XXX write a set of recommendations...



## Basic terminology

**Path**  
One or more _names_ separated by "/" that identifies a _view_.

We call the last name in the path sequence a _title_.

We call the sub-path without the _title_ a _basedir_ or simply _dir_.

In pWiki, there is no distinction between a page and a _directory_, thus
we do not use the term, instead, we may use the term _sub-page_


**View**  
A _path_ that resolves to a _page_ that may or may not be at that specific
path.

(see: _Page acquisiton_ below)


**Page**  
A set of data associated with a _path_.

A page is identified by it's path, but this does not require that every
sub-path of that path must exist.

XXX a word about bootstrap pages that can't be deleted...


**WikiWord**  
XXX


## Page acquisition

XXX motivation...

**Acquisition process:**

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
