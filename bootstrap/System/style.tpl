.raw,
.text {
  display: block;
}

input[type="checkbox"][checked]~*,
.checked {
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
}
.item:hover .sort-handle {
  opacity: 0.3;
}
.sort-placeholder {
  display: block;
}
