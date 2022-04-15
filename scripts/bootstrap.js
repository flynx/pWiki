/**********************************************************************
* 
*
*
**********************************************************************/

var fs = require('fs')
var glob = require('glob')


/*********************************************************************/

var bootstrap = {}

var BOOTSTRAP_TEMPLATE = 
`// This file is generated automatically, all changes made here will be lost.

var Bootstrap = $BOOTSTRAP 

typeof(module) != "undefined"
	&& (module.exports = Bootstrap)`


// XXX add support for json...
glob('bootstrap/**/*.@(tpl|md|css|html)')
	.on('match', function(path){
		var p = path
			.replace('bootstrap/', '')
			.replace(/\.(json|txt|md|css|html)/, '')
		console.log('Found:', p)
		bootstrap[p] = {
			text: fs.readFileSync(path).toString(),
		} })
	.on('end', function(){

		// extra root stuff...
		if(fs.existsSync('README.md')){
			console.log('Setting:', 'About')
			bootstrap['Doc/About'] = {
				text: fs.readFileSync('README.md').toString(),
			} }
		if(!bootstrap.WikiHome){
			console.log('Setting:', 'WikiHome')
			bootstrap.WikiHome = {
				text: '@include(Doc/About)'
			} }
		if(fs.existsSync('LICENSE')){
			console.log('Setting:', 'LICENSE')
			bootstrap['LICENSE'] = {
				text: `${ 
						fs.readFileSync('LICENSE').toString() 
					}<!-- @filter(text) -->`,
			} }

		var txt = BOOTSTRAP_TEMPLATE
			.replace(/\$BOOTSTRAP/g, JSON.stringify(bootstrap))

		console.log('Writing:', 'bootstrap.js')
		fs.writeFileSync('bootstrap.js', txt) })



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
