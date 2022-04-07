/**********************************************************************
* 
*
*
**********************************************************************/

var fs = require('fs')
var glob = require('glob')


/*********************************************************************/

var bootstrap = {}

// XXX add support for json...
glob('bootstrap/**/*.@(tpl|md|css|html)')
	.on('match', function(path){
		var p = path
			.replace('bootstrap/', '')
			.replace(/\.(json|txt|md|css|html)/, '')

		p
			&& console.log('Found:', p)

		bootstrap[p] = {
			text: fs.readFileSync(path).toString(),
		} })
	.on('end', function(){
		if(fs.existsSync('README.md')){
			console.log('Setting:', 'About')
			bootstrap['Doc/About'] = {
				text: fs.readFileSync('README.md').toString(),
			} }
		if(fs.existsSync('LICENSE')){
			console.log('Setting:', 'LICENSE')
			bootstrap['LICENSE'] = {
				text: fs.readFileSync('LICENSE').toString(),
			} }
		if(!bootstrap.WikiHome){
			console.log('Setting:', 'WikiHome')
			bootstrap.WikiHome = {
				text: '@include(Doc/About)'
			} }

		var txt = '// This file is generated automatically, '
			+'all changes made here will be lost.'
			+'\n\n'
			+'var Bootstrap = ' + JSON.stringify(bootstrap)

		console.log('Writing:', 'bootstrap.js')
		fs.writeFileSync('bootstrap.js', txt) })



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
