<macro name="item-pre-controls"/>

<macro name="item-content">
	<include 
			class="raw" 
			contenteditable 
			tabindex="0" 
			style="display:inline-block" 
			saveto="@source(./path)" 
			src="." />
</macro>

<macro name="item-post-controls">
	<a class="button" href="#@source(./path)/delete">&times;</a>
</macro>


<div>
	<span 
			class="raw" 
			contenteditable 
			tabindex="0" 
			saveto="@source(../path)/@now()" 
			style="display:inline-block" >
		+
	</span>
</div>
<div class="sortable">
	<macro src="../*">
		<div class="item">
			<div>
				<span class="sort-handle">&#x2630;</span>
				<macro name="item-pre-controls" src="."/>
				<macro name="item-content" src="."/>
				<span class="separator"/>
				<macro name="item-post-controls" src="."/>
			</div>
			<div style="padding-left: 30px">
				<include 
						style="display:block" 
						src="@source(./path)/outline" />
			</div>
		</div>
	</macro>
</div>

<!-- vim:set ts=4 sw=4 : -->
