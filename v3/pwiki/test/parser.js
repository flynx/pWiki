#!/usr/bin/node
//---------------------------------------------------------------------

var test = require('ig-test')

var parser = require('../parser').parser


//---------------------------------------------------------------------

test.Setups({
	empty: function(assert){
		return [ '', '' ] },

	slot_empty: function(assert){
		return [
			'@slot(slot)',
			'@slot("slot")',
			'@slot(\'slot\')',
			'@slot(name=slot)',
			'@slot(name="slot")',
			'@slot(name=\'slot\')',
			'<slot slot/>',
			'<slot "slot"/>',
			'<slot \'slot\'/>',
			'<slot name=slot/>',
			'<slot name="slot"/>',
			'<slot name=\'slot\'/>',
				'' ] },
	slot_value: function(assert){
		return [
			'<slot slot value/>',
			'<slot slot text=value/>',
			'@slot(slot value)',
			'@slot(slot text=value)',
				'value' ] },
	slot_fill: function(assert){
		var ins = this.slot_value(assert).slice(0, -1)
		return [
			...ins.map(function(e){
				return e + '@slot(slot other)' }),
			...ins.map(function(e){
				return e + '<slot slot other/>' }),
			...ins.map(function(e){
				return e + '<slot slot>other</slot>' }),
			'other' ] },
	slot_fill_fill: function(assert){
		var ins = this.slot_fill(assert).slice(0, -1)
		return [
			...ins.map(function(e){
				return e + '@slot(slot third)' }),
			...ins.map(function(e){
				return e + '<slot slot third/>' }),
			...ins.map(function(e){
				return e + '<slot slot>third</slot>' }),
			'third' ] },

	// XXX these are an alternative to <content/>...
	slot_nested: function(assert){
		return [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot.content value)',
			'[[ value ]]' ] },
	slot_nested_overwrite: function(assert){
		return [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot value)',
			'value' ] },

	/* XXX SHOWN_HIDDEN
	// XXX these need to be revised...
	// 		...do we actually need hidden/shown???
	//
	slot_shown: function(assert){
		var ins = this.slot_value(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +' @slot(slot that shown)' }),
			'that that' ] },
	slot_hidden: function(assert){
		return [
			'<slot slot value hidden/>',
			'@slot(slot value hidden)',
				'' ] },
	slot_hidden_value: function(assert){
		var ins = this.slot_hidden(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +'@slot(slot other)' }),
			'' ] },
	slot_hidden_shown: function(assert){
		var ins = this.slot_hidden(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +'@slot(slot shown)' }),
			'' ] },
	//*/
})


test.Modifiers({
})


test.Tests({
	parse: function(assert, state){
		var res
		var inputs = state.slice(0, -1)
		var expect = state.at(-1)
		var i = 0
		for(var input of inputs){
			assert(
				(res = parser.parse(
						{},
						input,
						{}))
					=== expect,
				'Parsing:',
					'\n\t      in: "'+ input +'"',
					'\n\t     out: "'+ res +'"',
					'\n\texpected: "'+ expect +'"') } },
})


test.Cases({
})



//---------------------------------------------------------------------
// make the test runnable as a standalone script...
__filename == (require.main || {}).filename
    && test.run()



//---------------------------------------------------------------------
// vim:set ts=4 sw=4 :
