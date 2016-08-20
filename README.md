# ![pWiki](img/pWiki-i.jpg) Portable Wiki (pWiki)

_NOTE: the project is currently in prototype phase, thus while most things 
are likely to change, the implementation / API **will definitely** change! ;)_


### Project goals / main features:

- _Simple embeddable Wiki_

  To be used as a zero-workflow app documentation platform, i.e. 
  documentation that can be created, edited, tweaked and updated in-app 
  without requiring setting up and maintaining a write-convert-embed 
  workflow.

  This was a requirement on the _\ImageGrid.Viewer_ project and as a 
  side-effect pWiki hosts it's own documentation too.

- _Pluggable storage and synchronization_ mechanisms

  A set of tools and API's to enable data synchronization between pWiki
  instances.

- _Self-hosted_ and flexible user interface

  The pWiki interface is implemented as a set of pWiki pages and 
  templates within pWiki itself (see: [Templates] / [/bootstrap](bootstrap)), 
  this enables the user to customize the look feel and to some extent 
  the function of the interface from within pWiki, without touching the 
  code.

- pWiki _portable app_

  This is a simple note / todo / outline app.

  The pWiki app is a stand-alone instance of pWiki wrapped in an app 
  supporting all major desktop as well as mobile platforms.

  The app serves the following goals:

    - a simple and functional note / todo / outline app (_obviously_)
    - an external/portable Wiki editor, as an alternative for 
      in-target-app documentation editor with ability to seamlesly 
      synchronize with the target app pWiki instance.
    - a stand-alone testing platform and reference implementation for 
      pWiki components.


### General Documentation:
- [Doc/About] / [general info](README.md) -- This document.
- [Doc/Path] / [bootstrap path](bootstrap/Doc/Path.md) -- Path mechanics.
- [Doc/Macros] / [bootstrap macros](bootstrap/Doc/Macros.md) -- Macro documentation


### Project:
- The project on [GitHub](https://github.com/flynx/pWiki)
- pWiki [live demo](https://flynx.github.io/pWiki/) _&ndash; The data is stored in 
localStorage on the client_

<!-- @filter(markdown) -->
<!-- vim:set ts=2 sw=2 expandtab spell : -->
