<!-- @filter(-wikiword) -->

<include src="../_view"/>

<slot name="toggle-edit-link">(<a href="#..">view</a>)</slot>

<slot name="title" class="title" contenteditable saveto="..">@source(../title)</slot>

<slot name="page-content">
	<code><pre><quote src="../raw" class="raw" saveto=".." contenteditable/></pre></code>
</slot>

<!-- vim:set ts=4 sw=4 : -->
