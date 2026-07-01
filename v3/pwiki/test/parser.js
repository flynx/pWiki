#!/usr/bin/node
//---------------------------------------------------------------------

var test = require('ig-test')
var serialize = require('ig-serialize')

var parser = require('../parser').parser


//---------------------------------------------------------------------

test.Setups({
	empty: function(assert){
		return { code: [ '', '' ] }},

	// slot...
	slot_empty: function(assert){
		return {code: [
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
				'' ]} },
	slot_value: function(assert){
		return {code: [
			'<slot slot value/>',
			'<slot slot text=value/>',
			'@slot(slot value)',
			'@slot(slot text=value)',
				'value' ]} },
	slot_fill: function(assert){
		var ins = this.slot_value(assert).code.slice(0, -1)
		return {code: [
			...ins.map(function(e){
				return e + '@slot(slot other)' }),
			...ins.map(function(e){
				return e + '<slot slot other/>' }),
			...ins.map(function(e){
				return e + '<slot slot>other</slot>' }),
			'other' ]} },
	slot_fill_fill: function(assert){
		var ins = this.slot_fill(assert).code.slice(0, -1)
		return {code: [
			...ins.map(function(e){
				return e + '@slot(slot third)' }),
			...ins.map(function(e){
				return e + '<slot slot third/>' }),
			...ins.map(function(e){
				return e + '<slot slot>third</slot>' }),
			'third' ]} },

	slot_nested: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot.content value)',
			'[[ value ]]' ]} },
	slot_nested_overwrite: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot value)',
			'value' ]} },

	// recursion...
	slot_nested_nested: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot value/> ]]</slot>',
			'<slot slot shown>[[ <slot slot value/> ]]</slot>',
			'value' ]} },
	slot_nested_shown_nested: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot/> ]]</slot>',
			'[[  ]]' ]} },

	/* XXX SHOWN_HIDDEN
	// XXX these need to be revised...
	// 		...do we actually need hidden/shown???
	//
	slot_shown: function(assert){
		var ins = this.slot_value(assert).code
		var expect = ins.pop()
		return {code: [
			...ins.map(function(i){
				return i +' @slot(slot that shown)' }),
			'that that' ]} },
	slot_hidden: function(assert){
		return {code: [
			'<slot slot value hidden/>',
			'@slot(slot value hidden)',
				'' ]} },
	slot_hidden_value: function(assert){
		var ins = this.slot_hidden(assert).code
		var expect = ins.pop()
		return {code: [
			...ins.map(function(i){
				return i +'@slot(slot other)' }),
			'' ]} },
	slot_hidden_shown: function(assert){
		var ins = this.slot_hidden(assert).code
		var expect = ins.pop()
		return {code: [
			...ins.map(function(i){
				return i +'@slot(slot shown)' }),
			'' ]} },
	//*/
	
	// XXX var...
	// XXX
	
	// XXX arg...
	// XXX

})


test.Modifiers({
	args: function(assert, state){
		;(state.state = (state.state ?? {})).args = {
			number: 1,
			string: 'string',
		}
		return state },
})


test.Tests({
	parse: function(assert, state){
		var {page, code, st} = state
		page ??= {}
		st ??= {}

		var res
		var inputs = code.slice(0, -1)
		var expect = code.at(-1)
		var i = 0
		for(var input of inputs){	
			var p = serialize.partialDeepCopy(page)
			var s = serialize.partialDeepCopy(st)
			assert(
				(res = parser.parse(
						p,
						input,
						s))
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
