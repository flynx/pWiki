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
	/* XXX CONTENT...
	slot_content_empty: function(assert){
		return [
			'@slot(slot body="[[ <content/> ]]")',
			'<slot slot>[[ <content/> ]]</slot>',
				'[[  ]]' ] },
	slot_content_default: function(assert){
		return [
			'@slot(slot default body="[[ <content/> ]]")',
			'<slot slot default>[[ <content/> ]]</slot>',
			'[[ default ]]' ] },
	slot_content_fill: function(assert){
		var ins = this.slot_content_default(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +'@slot(slot value)' }),
			expect.replace('default', 'value') ] },
	//*/

	// XXX these are an alternative to <content/>...
	slot_nested: function(assert){
		return [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot.content value)',
			'[[ value ]]' ] },
	slot_nested_overwrite: function(assert){
		return [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot value)',
			'value' ] },

	/* XXX CONTENT...
	// XXX the question with the next tow is:
	// 		should body override or nest?
	// 		...both are logical but in either case the result should be 
	// 		consistent.
	//
	// XXX should the new body/content override or expand the original???
	slot_content_content: function(assert){
		var ins = this.slot_content_default(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +'@slot(slot body="(( @content() ))")' }),
			// XXX should this override the default above???
			//expect.replace('default', '(( default ))') ] },
			expect.replace('default', '((  ))') ] },
	slot_content_content_content: function(assert){
		var ins = this.slot_content_content(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +'@slot(slot body="<< @content() >>")' }),
			// XXX should this override the default above???
			//expect.replace('default', '(( default ))') ] },
			expect.replace('((  ))', '(( <<  >> ))') ] },
	// XXX if we are expanding (see above) why are we overriding here???
	slot_content_content_fill: function(assert){
		var ins = this.slot_content_content(assert)
		var expect = ins.pop()
		return [
			...ins.map(function(i){
				return i +'@slot(slot value)' }),
			expect.replace('((  ))', '(( value ))') ] },
			//expect.replace('((  ))', 'value') ] },
			//


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
