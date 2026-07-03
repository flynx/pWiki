#!/usr/bin/node
//---------------------------------------------------------------------

var path = require('path')

var test = require('ig-test')
var serialize = require('ig-serialize')

var parser = require('../parser').parser


//---------------------------------------------------------------------

var PAGES = 
module.exports.PAGES = {
	'/blank': '',
	'/page': 'Page',
	'/async/page': Promise.resolve('Page'),
	'/includePage': '@include(/page)',
	'/isolated': '@slot(slot original)',

	'/recursive/Self': '<< @include(/recursive/Self) >>',
	'/recursive/OtherSelf': '<< @include(/recursive/SelfOther) >>',
	'/recursive/SelfOther': '<< @include(/recursive/OtherSelf) >>',
	'/async/recursive/Self': Promise.resolve('<< @include(/async/recursive/Self) >>'),
	'/async/recursive/OtherSelf': Promise.resolve('<< @include(/async/recursive/SelfOther) >>'),
	'/async/recursive/SelfOther': Promise.resolve('<< @include(/async/recursive/OtherSelf) >>'),

	'/multi/page': [ 'A', 'B', 'C' ],
}

var P = 
module.exports.P = {
	__pages__: PAGES,
	__parser__: parser,
	
	path: '/',

	get basepath(){
		return path.dirname(this.path ?? '') },

	get raw(){
		return this.__pages__[this.path] ?? '' },
	get text(){
		return this.__parser__.parse(this, this.raw, {}) },

	get: function(p){
		return {
			__proto__: P,
			path: path.resolve(this.path, p),
		} },

	// XXX
	resolvePathVars: function(path){
		return path },
}



//---------------------------------------------------------------------

test.Setups({
	// general parser...
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
	// nested...
	slot_nested: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot.content value)',
			'[[ value ]]' ]} },
	slot_nested_overwrite: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot.content/> ]]</slot>@slot(slot value)',
			'value' ]} },
	// nested-self...
	slot_nested_nested: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot value/> ]]</slot>',
			'<slot slot shown>[[ <slot slot value/> ]]</slot>',
			'value' ]} },
	slot_nested_shown_nested: function(assert){
		return {code: [
			'<slot slot>[[ <slot slot/> ]]</slot>',
			'[[  ]]' ]} },
	// slot content...
	slot_content: function(assert){
		return {code: [
			'<slot slot>[[ <content/> ]]</slot>',
			'[[  ]]' ]} },
	slot_content_multi: function(assert){
		return {code: [
			'<slot slot "moo"/><slot slot>[[ <content/> <content/> <content/> ]]</slot>',
			'[[ moo moo moo ]]' ]} },
	slot_content_filled: function(assert){
		var ins = this.slot_content(assert).code.slice(0, -1)
		return {code: [
			...ins.map(function(e){
				return '<slot slot "content"/>' + e }),
			'[[ content ]]' ]} },
	slot_content_content_filled: function(assert){
		var ins = this.slot_content_filled(assert).code
		var res = ins.pop()
		return {code: [
			...ins.map(function(e){
				return e +'<slot slot>(( <content/> ))</slot>' }),
			'(( '+ res +' ))' ]} },
	slot_content_nested: function(assert){
		return {code: [
			'<slot slot>moo<slot slot>[[ <content/> ]]</slot></slot>',
			'[[ moo ]]' ]} },
	// shown/hidden..
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
				return i +' | @slot(slot shown)' }),
			' | value' ]} },
	
	// XXX var...
	// XXX
	
	// XXX arg...
	// XXX

	// include...
	// XXX see inside...
	include: function(assert, path='/blank', expected){
		return { 
			page: P,
			code: [ 
				`@include(${path})`, 
				// XXX for some reason this does not parse int a macro....
				//'<include /blank />', 
				`<include "${path}" />`, 
				`<include src="${path}" />`, 

				expected 
					?? P.get(path).raw,
			],
		}},
	include_page: function(assert){
		return this.include(assert, '/page') },
	include_include_page: function(assert){
		return this.include(assert, '/includePage', 'Page') },
	include_async: function(assert){
		return this.include(assert, '/async/page', 'Page') },
	// islotaed...
	include_nonisolated: function(assert){
		return {
			page: P,
			code:[
				'@include("/isolated") @slot(slot overloaded)',
					'overloaded ',
			],
		} },
	include_isolated: function(assert){
		return {
			page: P,
			code:[
				'@include(isolated /isolated) @slot(slot overloaded)',
					'original overloaded',
			],
		} },
	// recursion...
	// XXX test path recursion: /A -> /A/A -> /A/A/A -> ...
	include_recursive_a: function(assert){
		return {
			page: P,
			code:[
				'@include(/recursive/Self recursive="recursion found")',
				'@include(/async/recursive/Self recursive="recursion found")',
					'<< recursion found >>', ], } },
	include_recursive_b: function(assert){
		return {
			page: P,
			code:[
				'@include(/recursive/SelfOther recursive="recursion found")',
				'@include(/async/recursive/SelfOther recursive="recursion found")',
					'<< << recursion found >> >>', ], } },
	
	// quote...
	// for inline quoting see: test.Modifiers.quote
	// XXX <quote src=.. />
})


test.Modifiers({
	args: function(assert, state){
		;(state.state = (state.state ?? {})).args = {
			number: 1,
			string: 'string',
		}
		return state },
	slot: function(assert, state){
		state.code = [
			...state.code
				.slice(0, -1)
				.map(function(e){
					return `[[ <slot parent>${e}</slot> ]]` }),
			`[[ ${state.code.at(-1)} ]]`,
		]
		return state },
	slot_expand: function(assert, state){
		state.code = [
			...state.code
				.slice(0, -1)
				.map(function(e){
					return `[[ <slot parent/> ]]<slot parent>${e}</slot>` }),
			`[[ ${state.code.at(-1)} ]]`,
		]
		return state },
	quote: function(assert, state){
		return state.code
			.slice(0, -1)
			.map(function(code){
				code = code.replace(/<\/quote>/, '&lt;/quote&gt;')
				return {
					page: state.P,
					code: [
						`<quote>${ code }</quote>`,
						code, 
					], 
				} }) },
})


test.Tests({
	parse: async function(assert, state){
		var states = 
			state instanceof Array ?
				state
				: [state]
		for(state of states){
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
					(res = await parser.parse(
							p,
							input,
							s))
						=== expect,
					'Parsing:',
						'\n\t      in: "'+ input +'"',
						'\n\t     out: "'+ res +'"',
						'\n\texpected: "'+ expect +'"') } } },
	//asyncParse: async function(assert, state){
	//	return await this.parse(assert, state) },
})


test.Cases({
})



//---------------------------------------------------------------------
// make the test runnable as a standalone script...
__filename == (require.main || {}).filename
    && test.run()



//---------------------------------------------------------------------
// vim:set ts=4 sw=4 :
