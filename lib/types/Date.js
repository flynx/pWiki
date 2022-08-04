/**********************************************************************
* 
*
*
**********************************************/  /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var object = require('ig-object')


/*********************************************************************/

var DateMixin =
module.DateMixin =
object.Mixin('DateMixin', 'soft', {
	timeStamp: function(...args){
		return (new this()).getTimeStamp(...args) },
	fromTimeStamp: function(ts){
		return (new this()).setTimeStamp(ts) },

	// convert string time period to milliseconds...
	str2ms: function(str, dfl){
		dfl = dfl || 'ms'

		// number -- dfl unit...
		if(typeof(str) == typeof(123)){
			var val = str
			str = dfl

		// 00:00:00:00:000 format...
		} else if(str.includes(':')){
			var units = str.split(/\s*:\s*/g).reverse()
			// parse units...
			var ms = units[0].length == 3 ?
				parseFloat(units.shift() || 0)
				: 0
			var [s=0, m=0, h=0, d=0] = units
			// merge...
			return ((((parseFloat(d || 0)*24 
				+ parseFloat(h || 0))*60 
					+ parseFloat(m || 0))*60 
						+ parseFloat(s || 0))*1000 + ms)

		// 00sec format...
		} else {
			var val = parseFloat(str)
			str = str.trim()
			// check if a unit is given...
			str = str == val ? 
				dfl 
				: str }

		// NOTE: this is a small hack to avoid overcomplicating the 
		// 		pattern to still match the passed dfl unit...
		str = ' '+str
		var c = 
			(/[^a-z](m(illi)?(-)?s(ec(ond(s)?)?)?)$/i.test(str)
		   			|| /^([0-9]*\.)?[0-9]+$/.test(str) ) ? 
				1
			: /[^a-z]s(ec(ond(s)?)?)?$/i.test(str) ? 
				1000
			: /[^a-z]m(in(ute(s)?)?)?$/i.test(str) ? 
				1000*60
			: /[^a-z]h(our(s)?)?$/i.test(str) ? 
				1000*60*60
			: /[^a-z]d(ay(s)?)?$/i.test(str) ? 
				1000*60*60*24
			: null

		return c ? 
			val * c 
			: NaN },

	isPeriod: function(str){
		return !isNaN(this.str2ms(str)) },
	isDateStr: function(str){
		return !isNaN(new Date(str).valueOf()) },
})


// XXX should this be flat???
var DateProtoMixin =
module.DateProtoMixin =
object.Mixin('DateProtoMixin', 'soft', {
	toShortDate: function(show_ms){
		return '' 
			+ this.getFullYear()
			+'-'+ ('0'+(this.getMonth()+1)).slice(-2)
			+'-'+ ('0'+this.getDate()).slice(-2)
			+' '+ ('0'+this.getHours()).slice(-2)
			+':'+ ('0'+this.getMinutes()).slice(-2)
			+':'+ ('0'+this.getSeconds()).slice(-2)
			+ (show_ms ? 
				':'+(('000'+this.getMilliseconds()).slice(-3))
				: '') },
	getTimeStamp: function(show_ms){
		return '' 
			+ this.getFullYear()
			+ ('0'+(this.getMonth()+1)).slice(-2)
			+ ('0'+this.getDate()).slice(-2)
			+ ('0'+this.getHours()).slice(-2)
			+ ('0'+this.getMinutes()).slice(-2)
			+ ('0'+this.getSeconds()).slice(-2)
			+ (show_ms ? 
				('000'+this.getMilliseconds()).slice(-3)
				: '') },
	setTimeStamp: function(ts){
		ts = ts.replace(/[^0-9]*/g, '')
		this.setFullYear(ts.slice(0, 4))
		this.setMonth(ts.slice(4, 6)*1-1)
		this.setDate(ts.slice(6, 8))
		this.setHours(ts.slice(8, 10))
		this.setMinutes(ts.slice(10, 12))
		this.setSeconds(ts.slice(12, 14))
		this.setMilliseconds(ts.slice(14, 17) || 0)
		return this },
})



//---------------------------------------------------------------------

// NOTE: repatching a date should not lead to any side effects as this
// 		does not add any state...
// NOTE: this is done differently as there are contexts where there may 
// 		be multiple Date objects in different contexts (nw/electron/..)
var patchDate =
module.patchDate = 
function(date){
	date = date || Date
	DateMixin(date)
	DateProtoMixin(date.prototype)
	return date }



//---------------------------------------------------------------------

// patch the root date...
patchDate()



/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
