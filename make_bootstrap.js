/**********************************************************************
* 
*
*
**********************************************************************/

var fs = require('fs')
var glob = require('glob')


/*********************************************************************/

var bootstrap = {}

glob('bootstrap/**/*.tpl')
	.on('match', function(path){
		var p = path
			.replace('bootstrap/', '')
			.replace('.tpl', '')

		if(p)

		console.log('Found:', p)
		bootstrap[p] = {
			text: fs.readFileSync(path).toString(),
		}
	})
	.on('end', function(){
		var txt = '// This file is generated automatically, '
			+'all changes made here will be lost.'
			+'\n\n'
			+'var Bootstrap = ' + JSON.stringify(bootstrap)

		if(!bootstrap.WikiHome && fs.existsSync('README.md')){
			bootstrap.WikiHome = {
				text: fs.readFileSync('README.md').toString(),
			}
		}

		console.log('Writing:', 'bootstrap.js')
		fs.writeFileSync('bootstrap.js', txt)
	})



/**********************************************************************
* vim:set ts=4 sw=4 :                                                */
