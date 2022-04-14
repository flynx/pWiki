/**********************************************************************
* 
*
*
**********************************************************************/

var requirejs_cfg = {
	paths: {
		'lib/object': [
			'./node_modules/ig-object/object',
			'./lib/object',
		],
		'lib/actions': [
			'./node_modules/ig-actions/actions',
			'./lib/actions',
		],
		'lib/features': [
			'./node_modules/ig-features/features',
			'./lib/features',
		],

		//'lib/keyboard': './node_modules/ig-keyboard/keyboard',
	},	
	map: {
		'*': {
			// back-refs
			// ...these enable the npm modules reference each other in 
			// a cross-platform manner....
			'ig-object': 'lib/object',
			'ig-actions': 'lib/actions',
			'ig-features': 'lib/features',

			//'ig-keyboard': 'lib/keyboard',
		},
	},
}
// config the browser version of requirejs...
requirejs.config(requirejs_cfg)


;/********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var pwiki = require('pwiki')



/**********************************************************************
* vim:set ts=4 sw=4 nowrap :                        */ return module })
