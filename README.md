# Portable Wiki (pWiki)

### Project goals / main features:

- _Simple embeddable Wiki_

  To be used as a zero-workflow app documentation platform, i.e. 
  documentation that can be created, edited, tweaked and updated in-app 
  without requiring setting up and maintaining a write-convert-embed 
  workflow.

  This was a requirement on the _ImageGrid.Viewer_ project and as a 
  side-effect pWiki hosts it's own documentation too.

- _Pluggable storage and synchronization_ mechanisms

  A set of tools and API's to enable data synchronization between pWiki
  instances.

- _Self-hosted_ and flexible user interface

  The pWiki interface is implemented as a set of pWiki pages and 
  templates within pWiki itself (see: /bootstrap), this enables the user
  to customize the look feel and to some extent the function of the 
  interface from within pWiki, without touching the code.

- Wiki/note _portable app_

    - a simple and functional note/todo/outline app
    - an external/portable Wiki editor, as an alternative for in-app 
      documentation editor with ability to seamlesly synchronize with 
      the target app.
    - a stand-alone testing platform for project components


### General Documentation:
- WikiPath / [bootstrap](bootstrap/WikiPath.md)
- WikiMacros / [bootstrap](bootstrap/WikiMacros.md)


<!-- @filter(markdown) -->
<!-- vim:set ts=4 sw=4 spell -->
