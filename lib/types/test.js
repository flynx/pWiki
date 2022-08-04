#!/usr/bin/env node
/**********************************************************************
* 
*
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var colors = require('colors')
var test = require('ig-test')
var object = require('ig-object')

var types = require('./main')
var promise = require('./Promise')

var containers = require('./containers')
	var generator = require('./generator')
var events = require('./event')
var runner = require('./runner')



//---------------------------------------------------------------------

/*
var setups = test.Setups({
})

var modifiers = test.Modifiers({
})

var tests = test.Tests({
})
//*/


var cases = test.Cases({
	// Object.js
	//
	Object: function(assert){
		var o = Object.assign(
			Object.create({
				x: 111,
				y: 222,
			}), {
				y: 333,
				z: 444,
			})
		var oo = assert(Object.flatCopy(o), 'Object.flatCopy(..)')

		assert(Object.match(oo, {x: 111, y: 333, z: 444}), 'Object.match(..)')

		var k = ['z', 'x', 'y']
		assert(Object.keys(Object.sort(oo, k)).cmp(k), 'Object.sort(,,)')

		assert(Object.keys(Object.sort(oo)).cmp(k.slice().sort()), 'Object.sort(,,)')

		var cmp = function(a, b){
			return a == 'y' ?
					1
				: a == 'z' ?
					-1
				: 0 }
		assert(Object.keys(Object.sort(oo, cmp)).cmp(k.slice().sort(cmp)), 'Object.sort(,,)')
	},

	// Array.js
	// 	- flat (???)
	// 	- includes (???)
	// 	- first
	// 	- last
	// 	- compact
	// 	- len
	// 	- unique
	// 	- tailUnique
	// 	- cmp
	// 	- setCmp
	// 	- sortAs
	// 	- mapChunks
	// 	- filterChunks
	// 	- reduceChunks
	// 	- toKeys
	// 	- toMap
	Array: function(assert){
	},

	// Set.js
	// 	- unite
	// 	- intersect
	// 	- subtract
	// 	- sort
	Set: function(assert){
	},
	
	// Map.js
	// 	- sort
	Map: function(assert){
	},

	Generator: function(assert){
	},
	
	String: function(assert){
		assert(''.capitalize() == '')
		assert('a'.capitalize() == 'A')
		assert('abc'.capitalize() == 'Abc')
	},

	RegExp: function(assert){
	},

	IterablePromise: test.TestSet(function(){
		var create = function(assert, value){
			return {
				input: value, 
				output: assert(Promise.iter(value), 'Promise.iter(', value, ')'),
			} }

		this.Setup({
			empty: function(assert){
				return create(assert, []) },
			value: function(assert){
				return create(assert, 123) },
			array: function(assert){
				return create(assert, [1, 2, 3]) },
			nested_array: function(assert){
				return create(assert, [1, 2, [3]]) },
			promise_value: function(assert){
				return create(assert, Promise.resolve(123)) },
			promise_array: function(assert){
				return create(assert, Promise.resolve([1, 2, 3])) },
			promise_nested_array: function(assert){
				return create(assert, Promise.resolve([1, 2, [3]])) },
			array_mixed: function(assert){
				return create(assert, [1, Promise.resolve(2), 3]) },
			nested_array_mixed: function(assert){
				return create(assert, [
					1, 
					Promise.resolve(2), 
					[3], 
					Promise.resolve([4]),
				]) },
			promise_array_mixed: function(assert){
				return create(assert, Promise.resolve([1, Promise.resolve(2), 3])) },
			promise_nested_array_mixed: function(assert){
				return create(assert, Promise.resolve([
					1, 
					Promise.resolve(2), 
					[3], 
					Promise.resolve([4]),
				])) },
		})
		this.Modifier({
			nest: function(assert, setup){
				setup.output = Promise.iter(setup.output)
				return setup },
			iter: function(assert, setup){
				setup.output = setup.output.iter()
				return setup },

			map_asis: function(assert, setup){
				setup.output = setup.output
					.map(function(e){ 
						return e }) 
				return setup },
			map_promise: function(assert, setup){
				setup.output = setup.output
					.map(function(e){ 
						return Promise.resolve(e) }) 
				return setup },

			filter_all: function(assert, setup){
				setup.output = setup.output
					.filter(function(e){ return true }) 
				return setup },
			// XXX either the test is worng or something is broken...
			filter_none: function(assert, setup){
				return {
					input: [],
					output: setup.output
						.filter(function(e){ return false }),
				} },

			/* XXX need tuning...
			concat_basic: function(assert, {input, output}){
				return {
					input: [input].flat()
						.concat(['a', 'b', 'c']),
					output: output
						.concat(['a', 'b', 'c']),
				} },
			concat_nested_array: function(assert, {input, output}){
				return {
					input: [input].flat()
						.concat(['a', ['b'], 'c']),
					output: output
						.concat(['a', ['b'], 'c']),
				} },
			//*/

		})
		this.Test({
			value: async function(assert, {input, output}){

				var res = await output

				assert(res instanceof Array, 'result is array')

				input instanceof Array ?
					// XXX this does not catch some errors -- map_promise specifically...
					assert.array(res, 
						await Promise.all(input), 
							'array -> array')
				: (input instanceof Promise && await input instanceof Array) ?
					assert.array(res, 
						await input, 
							'promise array -> array')
				: input instanceof Promise ?
					assert.array(res, 
						[await input], 
							'promise value -> array')
				: assert.array(res, 
					[input], 
					'value -> array') },
		})
	}),
	Promise: async function(assert){
		var p = assert(Promise.cooperative(), '.cooperative()')
		
		assert(!p.isSet, 'promise unset')
		
		var RESOLVE = 123
		var then = false
		var done = false

		p.then(function(v){
			then = assert(v == RESOLVE, '.then(..) handled') })

		p.finally(function(){
			done = assert(true, '.finally(..) handled') })

		assert(!p.isSet, 'promise unset')

		p.set(RESOLVE)

		assert(p.isSet, 'promise set')

		// allow the promise to finalize...
		await p

		assert(then, '.then(..): confirmed')
		assert(done, '.done(..): confirmed')

		// XXX

		assert(await Promise.iter([1, Promise.resolve(2), [3]]), '.iter(..)')

		assert.array(
			await Promise.iter([1, 2, 3]), 
			[1, 2, 3], 
				'basic array')
		assert.array(
			await Promise.iter([1, Promise.resolve(2), 3]), 
			[1, 2, 3], 
				'promises as elements')
	},

	// Date.js
	Date: function(assert){
		var d = new Date()

		var ts = assert(d.getTimeStamp(), '.getTimeStamp()')
		var tsm = assert(d.getTimeStamp(true), '.getTimeStamp(true)')

		var dd = assert(Date.fromTimeStamp(tsm), '.fromTimeStamp(..)')
		var dds = assert(Date.fromTimeStamp(ts), '.fromTimeStamp(..)')

		assert(d.toString() == dd.toString(), 'timestamp reversable')

		assert(d.toShortDate() == dd.toShortDate(), '.toShortDate()')
		assert(d.toShortDate() == dds.toShortDate(), '.toShortDate()')
		assert(d.toShortDate(true) == dd.toShortDate(true), '.toShortDate(true)')

		var a = Date.timeStamp()
		var b = Date.timeStamp(true)

		assert(a == Date.fromTimeStamp(a).getTimeStamp())
		assert(a + '000' == Date.fromTimeStamp(a).getTimeStamp(true))
		assert(b == Date.fromTimeStamp(b).getTimeStamp(true))

		assert(Date.str2ms('1') == 1, 'Date.str2ms("1")')
		assert(Date.str2ms(1) == 1, 'Date.str2ms(1)')
		assert(Date.str2ms('1ms') == 1, 'Date.str2ms("1ms")')
		assert(Date.str2ms('1s') == 1000, 'Date.str2ms("1s")')
		assert(Date.str2ms('1m') == 60*1000, 'Date.str2ms("1m")')
		assert(Date.str2ms('1h') == 60*60*1000, 'Date.str2ms("1h")')
		assert(Date.str2ms('1d') == 24*60*60*1000, 'Date.str2ms("1d")')

		assert(Date.str2ms('5 sec') == 5000, 'Date.str2ms("1 sec")')
		assert(Date.str2ms('5 second') == 5000, 'Date.str2ms("1 second")')
		assert(Date.str2ms('5 seconds') == 5000, 'Date.str2ms("1 seconds")')

		assert(Date.str2ms('2hour') == 2*60*60*1000, 'Date.str2ms("1hour")')
		assert(Date.str2ms('2 Hour') == 2*60*60*1000, 'Date.str2ms("1 Hour")')
		assert(Date.str2ms('2 hours') == 2*60*60*1000, 'Date.str2ms("1 hours")')

		assert(Number.isNaN(Date.str2ms('moo')), 'Date.str2ms("moo")')
		assert(Number.isNaN(Date.str2ms('123 moo')), 'Date.str2ms("moo")')
	},

	// containers.js
	// XXX move this out to a separate test set...
	UniqueKeyMap: function(assert){
		var a = assert(containers.UniqueKeyMap(), '')
		var b = assert(containers.UniqueKeyMap([]), '')
		var c = assert(containers.UniqueKeyMap([
			['a', 111],
			['b', 222],
			['a', 333],
		]), '')
		
		assert(a.size == 0)
		assert(b.size == 0)
		assert(c.size == 3)

		assert(c.get('a') == 111)

		assert(c.has('a (1)'))
		assert(c.get('a (1)') == 333)


		var n

		assert((n = c.set('a', 444, true)) == 'a (2)')
		assert(c.get(n) == 444)

		assert(c.reset(n, 555))
		assert(c.get(n) == 555)

		assert(c.delete('a (1)'))
		assert(!c.has('a (1)'))

		assert((n = c.set('a', 222, true)) == 'a (1)')

		assert(c.keysOf(222).sort().cmp(['b', 'a'].sort()))

		var k = [...c.keys()]
		k[k.indexOf('a')] = 'b (1)'

		assert((n = c.rename('a', 'b', true)) == 'b (1)')

		// check order...
		// XXX since we are using Array's .cmp(..) would be nice to be 
		// 		able to fail this test if that fails to test correctly...
		// 		...not sure how to do this though...
		assert(k.cmp([...c.keys()]), '.rename(..) order')
	},
})



//---------------------------------------------------------------------

var PromiseTests = test.TestSet()
test.Case('PromiseTests', PromiseTests)

PromiseTests.setups({
	cooperative: function(assert){
		return {
			a: assert(Promise.cooperative(), '.cooperative()')
		} },
})

PromiseTests.modifiers({
})

PromiseTests.tests({

})
	


//---------------------------------------------------------------------
// UniqueKeyMap testing...

var UniqueKeyMap = test.TestSet()
test.Case('UniqueKeyMap-new', UniqueKeyMap)
	
// XXX
UniqueKeyMap.setups({
	empty: function(assert){
		return {
			value: assert(containers.UniqueKeyMap()),
			// metadata...
			size: 0,
		}},
	'empty-input': function(assert){
		return {
			value: assert(containers.UniqueKeyMap([])), 
			// metadata...
			size: 0,
		}},
	// XXX non-empty input...
	// XXX intersecting unput...
})

// XXX
UniqueKeyMap.modifiers({
	set: function(assert, e, k='a', o){
		o = o || {}
		var n

		var exists = e.value.has(k)
		var expected = e.value.uniqieKey(k)

		assert(n = e.value.set(k, o, true), '.set(..)')

		// key update...
		assert(n.startsWith(k), 'key prefix')
		assert(n == expected, 'unexpected key')
		exists
			|| assert(n == k, 'key unexpectedly changed')

		// size...
		e.size += 1
		assert(e.value.size == e.size, 'inc size')

		return e },
	reset: function(assert, e, k='a', o){
		o = o || {}

		var exists = e.value.has(k)

		assert(e.value.reset(k, o))
		assert(e.value.get(k) === o)

		// size...
		exists
			|| (e.size += 1)
		assert(e.value.size == e.size)

		return e },
	delete: function(assert, e, k='a'){

		var exists = e.value.has(k)

		assert(e.value.delete(k) == exists, '.delete(..)')
		assert(!e.value.has(k), 'delete successful')

		// size...
		exists
			&& (e.size -= 1)
		assert(e.value.size == e.size)

		return e },

	'set-set': function(assert, e){
		this.set(assert, e, 'x')
		this.set(assert, e, 'y')
		this.set(assert, e, 'x')
		return e },
})

// XXX
UniqueKeyMap.tests({
	consistent: function(assert, e){

		assert(e.value.size == e.size, '.size')
		assert([...e.value.keys()].length == e.value.size, '.keys() same size as .size')

		return e }
})



//---------------------------------------------------------------------
// events...

var Events = test.TestSet()
test.Case('Events', Events)

// XXX test aborting handlers...
Events.cases({
	base: function(assert){
		var called = {}

		// object with events...
		var ObjWithEvents = 
			assert(
				events.EventMixin('flat', {
					// NOTE: we will also use virtual events later -- 'moo' 
					// 		and 'foo', these do not have to be defined to 
					// 		be usable...

					// blank events...
					bareEventBlank: assert(
						events.Eventful('bareEventBlank'), 
						'.Eventful(..): blank'),
					eventBlank: assert(
						events.Event('eventBlank'), 
						'.Event(..): blank'),

					// normal events...
					bareEvent: assert(events.Eventful('bareEvent', 
						function(handle, ...args){
							called['bareEvent-call'] = true
							assert(handle(), '.Eventful(..) -> handle(..)')
							return 'bareEvent'
						}), '.Eventful(..)'),
					event: assert(events.Event('event', 
						function(handle, ...args){
							called['event-call'] = true
							assert(handle(), '.Event(..) -> handle(..)')
						}), '.Event(..)'),
				}), 
				'object with event mixin created.')

		// create an "instance"...
		var obj = Object.create(ObjWithEvents)


		// test event list...
		assert.array(obj.events, ['event', 'eventBlank'], '.events')
		assert.array(obj.eventful, ['bareEvent', 'bareEventBlank'], '.eventful')

		// bind...
		var bind = function(evt){
			assert(obj.on(evt, function(evt, ...args){
				called[evt +'-handle'] = true
			}) === obj, 'bind: <obj-w-events>.on("'+ evt +'", ..)') }

		;['moo', 
				...obj.events,
				...obj.eventful]
			.forEach(bind)

		assert(obj.event(function(evt, ...args){
			called['event-handle-2'] = true
		}) === obj, 'bind: <obj-w-events>.event(<func>)')


		// trigger 
		var trigger = function(evt, triggerd=true, handled=true){
			var res = assert(obj.trigger(evt), 'trigger: <obj-w-events>.trigger("'+ evt +'")')
			triggerd
				&& !evt.endsWith('Blank')
				&& assert(called[evt +'-call'], 'trigger: "'+ evt +'" event triggered')
			handled
				&& assert(called[evt +'-handle'], 'trigger: "'+ evt +'" event handled') 
			delete called[evt +'-call']
			delete called[evt +'-handle'] 
			return res }
		var call = function(evt, triggered=true, handled=true){
			var res = assert(obj[evt](), 'trigger: <obj-w-events>.'+ evt +'(..)')
			triggered
				&& !evt.endsWith('Blank')
				&& assert(called[evt +'-call'], 'trigger: "'+ evt +'" event triggered')
			handled
				&& assert(called[evt +'-handle'], 'trigger: "'+ evt +'" event handled')
			delete called[evt +'-call']
			delete called[evt +'-handle'] 
			return res }

		trigger('foo', false, false)
		trigger('moo', false)

		obj.events
			.forEach(function(e){ 
				trigger(e) 
				call(e) })

		assert(called['event-handle-2'], 'trigger: "event" event handled')
		delete called['event-handle-2']

		assert(call('event') === obj, '<obj-w-events>.event(..) return value.')
		assert(call('bareEvent') == 'bareEvent', '<obj-w-events>.bareEvent(..) return value.')


		// unbind: .one(..) / .off(..) 
		// XXX this is triggered twice for some reason...
		obj.one('event', function(){ 
			called['event-one-time-handler'] = 
				(called['event-one-time-handler'] || 0) + 1 })
		obj
			.event()
			//.event()
			//.event()
		assert(called['event-one-time-handler'] == 1, '.one("event", ..) handler cleared.')
		delete called['event-one-time-handler']

		// special case...
		obj.trigger('event', function(){ called['trigger-function-called'] = true })
		assert(called['trigger-function-called'] === undefined, '.trigger(..) should not call it\'s args')
		
		// XXX test passing args...

		// XXX test different mode events...

		// re-bind...

	},
})


//---------------------------------------------------------------------
// events...

var Runner = test.TestSet()
test.Case('Runner', Runner)

// XXX test aborting handlers...
Runner.cases({
	base: function(assert){
		//var q = assert(runner.Queue({auto_stop: true}), 'Queue()')
		var q = assert(runner.Queue(), 'Queue()')

		// empty states...
		assert(q.state == 'stopped', '.state: stopped')

		q.start()

		assert(q.state == 'running', '.state: running')

		q.start()

		assert(q.state == 'running', '.state: running')

		q.stop()

		assert(q.state == 'stopped', '.state: stopped')

		var tasks_run = []
		var a = function(){ tasks_run.push('a') }
		var b = function(){ tasks_run.push('b') }
		var c = function(){ tasks_run.push('c') }

		q.push(a)
		q.push(b)
		q.push(c)
		
		assert(q.length == 3, '.length is 3')

		q.runTask()
		q.runTask()
		q.runTask()

		assert.array(tasks_run, ['a', 'b', 'c'], 'all tasks run')

		// XXX need to figure out how to test async...

		tasks_run = []

		var q = assert(runner.Queue({sync_start: true}), 'Queue({sync_start: true})')

		q.push(a)
		q.push(b)
		q.push(c)

		q.start()

		assert.array(tasks_run, ['a', 'b', 'c'], 'all tasks run')


		//console.log('\n>>>', q.state)
	},
})


//---------------------------------------------------------------------

typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	&& test.run()



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
