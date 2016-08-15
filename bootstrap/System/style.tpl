.raw,
.text {
  display: block;
}

.item.checked {
	opacity: 0.3;
}
.item.checked:hover {
	opacity: 0.8;
}
.item.checked .item-content * {
	text-decoration: line-through;
}

.button {
	text-decoration: none;
}
.button:last-child {
	margin-right: 5px;
}

.separator~* {
	float: right;
}

.item:hover {
	background-color: rgba(0, 0, 0, 0.05);
}
.item .button {
	display: none;
}
.item:hover .button {
	display: inline-block;
}

.sort-handle {
	opacity: 0.1;
	padding-left: 5px;
	padding-right: 5px;
	cursor: pointer;
	text-decoration: none;
}
.item:hover .sort-handle {
	opacity: 0.3;
}
.sort-placeholder {
	display: block;
}

/* vim:set ts=4 sw=4 ft=css : */