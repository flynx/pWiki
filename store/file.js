/**********************************************************************
* 
*
*
**********************************************************************/
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var fs = require('fs')
var glob = require('glob')

var object = require('ig-object')
var types = require('ig-types')

var pwpath = require('../lib/path')

var base = require('../store/base')


//---------------------------------------------------------------------

//
// XXX structure is not final...
// 		- need to split each adapter into modules...
// 		- should the media handler api be merged with store???
// 		- how do we handle config???

var FILESTORE_OPTIONS = {
	index: '.index',
	backup: '/.backup',

	clearEmptyDir: true,
	dirToFile: true,
	cleanBackup: true,

	verbose: true,
}

var getOpts = 
function(opts){
	return {
		...FILESTORE_OPTIONS,
		...(opts ?? {}),
	} }

//	func(base[, options])
//		-> true/false
//
//	func(base, path[, options])
//		-> true/false
//
// XXX not yet sure how w should handle dot-files....
// XXX should these be store methods???
// XXX do we need error checking in these???
var exists =
module.exists =
async function(base, sub, options){
	if(typeof(sub) != 'string'){
		options = sub ?? options
		sub = base
		base = null }
	var {index} = getOpts(options)

	var target = base ?
		pwpath.join(base, sub)
		: sub
	if(!fs.existsSync(target)){
		return false }
	var stat = await fs.promises.stat(target)
	if(stat.isDirectory()){
		return fs.existsSync(pwpath.join(target, index)) }
	return true }
var read =
module.read =
async function(base, sub, options){
	if(typeof(sub) != 'string'){
		options = sub ?? options
		sub = base
		base = null }
	var {index} = getOpts(options)

	var target = base ?
		pwpath.join(base, sub)
		: sub
	if(!fs.existsSync(target)){
		return undefined }
	// handle dir text...
	var stat = await fs.promises.stat(target)
	if(stat.isDirectory()){
		var target = pwpath.join(target, index) 
		fs.existsSync(target)
			|| (target = false) }
	return target ?
		fs.promises.readFile(target, {encoding: 'utf-8'})
		: undefined }
var mkdir = 
module.mkdir =
async function(base, sub, options){
	if(typeof(sub) != 'string'){
		options = sub ?? options
		sub = base 
		base = null }
	var {index, verbose} = getOpts(options)

	var levels = pwpath.split(sub)
	for(var level of levels){
		base = base == null ?
			level
			: pwpath.join(base, level)
		// nothing exists -- create dir and continue...
		if(!fs.existsSync(base)){
			verbose 
				&& console.log('mkdir(..): mkdir:', base)
			await fs.promises.mkdir(base, {recursive: true}) 
			continue }
		// directory -- continue...
		var stat = await fs.promises.stat(base)
		if(stat.isDirectory()){
			continue }
		// file -- convert to dir...
		verbose 
			&& console.log('mkdir(..): converting file to dir:', base)
		await fs.promises.rename(base, base+'.pwiki-bak') 
		await fs.promises.mkdir(base, {recursive: true}) 
		await fs.promises.rename(base +'.pwiki-bak', base +'/'+ index) }
	return base }
// XXX metadata???
var update = 
module.update =
async function(base, sub, data, options){
	if(typeof(data) != 'string'){
		options = data ?? options
		data = sub
		sub = base
		base = null }
	var {index} = getOpts(options)

	var target = base ?
		pwpath.join(base, sub)
		: sub
	// path already exists...
	if(fs.existsSync(target)){
		var stat = await fs.promises.stat(target)
		if(stat.isDirectory()){
			target = pwpath.join(target, index) } 
	// create path / parts of path...
	} else {
		var levels = pwpath.split(target)
		levels.pop()
		// ensure the parent dir exists...
		await module.mkdir(
			...(base ?
				// NOTE: we are keeping this separate here to avoid creating 
				// 		anything above it...
				[base]
				: []), 
			levels, 
			options) }
	// write the data...
	var f = await fs.promises.open(target, 'w')
	await f.writeFile(data)
	f.close()
	return target }
var clear = 
module.clear =
async function(base, sub, options){
	if(typeof(sub) != 'string'){
		options = sub ?? options
		sub = base
		base = '' }
	var {index} = getOpts(options)

	// remove leaf...
	var target = base == '' ?
		sub
		: pwpath.join(base, sub)
	// dir...
	if(fs.existsSync(target)){
		var stat = await fs.promises.stat(target)
		if(stat.isDirectory()){
			var files = await fs.promises.readdir(target)
			// remove index...
			if(files.includes(index)){
				await fs.promises.rm(pwpath.join(target, index))
				// NOTE: we do not care what we pop as long as the .length 
				// 		is correct as we'll not be using the content after 
				// 		this point...
				files.pop() }
			// remove dir if empty...
			if(files.length == 0){
				fs.promises.rmdir(target) }
		// simple file...
		} else {
			await fs.promises.rm(target) } }
	// cleanup path -- remove empty dirs... (XXX ???)
	var levels = pwpath.split(sub)
		.slice(0, -1)
	while(levels.length > 0){
		var cur = pwpath.join(base, ...levels)
		if(fs.existsSync(cur)){
			var stat = await fs.promises.stat(base)
			if(stat.isDirectory()){
				// stop cleanup if non-empty dir...
				if((await fs.promises.readdir(cur)).length != 0){
					break }
				fs.promises.rmdir(cur) } }
		levels.pop() } 
	return target }
var cleanup =
module.cleanup =
async function(base, options){
	var {index, clearEmptyDir, dirToFile, verbose} = getOpts(options)

	glob(pwpath.join(base, '**/*'))
		.on('end', async function(paths){
			paths
				.sort(function(a, b){
					return b.length - a.length })
			for(var path of paths){
				var stat = await fs.promises.stat(path)
				if(stat.isDirectory()){
					var children = await fs.promises.readdir(path)
					// empty -> remove...
					if(clearEmptyDir 
							&& children.length == 0){
						verbose 
							&& console.log('cleanup(..): removing dir:', path)
						fs.promises.rmdir(path)
						continue }
					// dir -> file...
					if(dirToFile
							&& children.length == 1 
							&& children[0] == index){
						verbose 
							&& console.log('cleanup(..): converting dir to file:', path)
						await fs.promises.rename(path +'/'+ index, path+'.pwiki-bak') 
						await fs.promises.rmdir(path) 
						await fs.promises.rename(path +'.pwiki-bak', path)
						continue }
				} } }) }

// XXX backup metadata...
// 		- date
// 		- reason
// 		- refs...
// XXX set hidden attribute on backup dir...
// XXX add backup packing...
var backup =
module.backup = {
	// XXX backup config???
	//index: '.index',
	//base: '/.backup',
	//cleanBackup: true,
	//verbose: true,

	//
	// 	.create(<base>[, <options>])
	// 	.create(<base>, '**'[, <options>])
	// 	.create(<base>, '**', Date.timeStamp()[, <options>])
	// 		-> <list>
	//
	// 	.create(<base>, <path>[, <version>][, <options>])
	// 		-> <list>
	//
	// 	.create(<base>, <path>, false[, <options>])
	// 		-> <list>
	//
	// .create(..) and .restore(..) are completely symmetrical.
	//
	// NOTE: backing up ** will include nested backups but will skip the 
	// 		root backup but will ignore the root backup dir...
	//
	// XXX since these are *almost* identical in structure, can we reuse one 
	// 		to implement the other???
	// 		..or can we implement these in a manner similar to "cp A B" vs. "cp B A"???
	create: async function(base, sub='**', version=Date.timeStamp(), options){
		var that = this
		if(typeof(sub) == 'object'){
			options = sub
			sub = '**' }
		if(typeof(version) == 'object'){
			options = version
			version = Date.timeStamp() }
		// options...
		var {index, backup, verbose, recursive, cleanBackup, __batch} = options = getOpts(options)
		recursive = recursive ?? false

		var _backup = backup = 
			version ?
				pwpath.join(backup, version)
				: backup
		backup = 
			pwpath.join(
				base,
				pwpath.relative(pwpath.dirname(sub), backup))

		// ** or * -- backup each file in path...
		if(/[\\\/]*\*\*?$/.test(sub)){
			if(sub.endsWith('**')){
				options.recursive = true }
			options.__batch = true

			if(cleanBackup 
					&& fs.existsSync(backup)){
				verbose
					&& console.log('.create(..): cleaning:', backup)
				await fs.promises.rm(backup, {recursive: true}) }
			sub = sub.replace(/[\\\/]*\*\*?$/, '')
			var b = pwpath.split(_backup)
				.filter(function(p){ 
					return p != '' })
				.shift()
			return fs.promises.readdir(base +'/'+ sub)
				.iter()
				// skip backups...
				.filter(function(file){
					return !file.includes(b) })
				.map(async function(file){
					return await that.create(base, sub +'/'+ file, version, options) })
				// keep only the paths we backed up...
				.filter(function(e){ 
					return !!e }) 

		// backup single page...
		} else {
			var target = pwpath.join(base, sub) 
			var full = _backup[0] == '/'

			// nothing to backup...
			if(!fs.existsSync(target)){
				verbose
					&& console.log('.create(..): target does not exist:', target)
				return }

			var to = full ?
				backup +'/'+ sub
				: backup +'/'+ pwpath.basename(sub)
			var todir = pwpath.dirname(to)

			if(!recursive){
				var stat = await fs.promises.stat(target)
				if(stat.isDirectory()){
					target += '/'+index 
					to += '/'+index 
					// nothing to backup...
					if(!fs.existsSync(target)){
						verbose
							&& !__batch
							&& console.log('.create(..): nothing to backup:', target)
						return } } }

			verbose
				&& console.log('.create(..):', sub, '->', to)
			await fs.promises.mkdir(todir, {recursive: true}) 
			await fs.promises.cp(target, to, {force: true, recursive})
			return to } },
	restore: async function(base, sub, version, options){
		var that = this
		// XXX
		var {index, backup, verbose, recursive, preBackup, __batch} = options = getOpts(options)
		recursive = recursive ?? false

		var _backup = backup = 
			version ?
				pwpath.join(backup, version)
				: backup
		backup = 
			pwpath.join(
				base,
				pwpath.relative(
					pwpath.dirname(sub), 
					backup))

		// check if we can restore...
		if(!fs.existsSync(backup)){
			verbose
				&& console.log('restore(..): no backup version:', version)
			return }

		// XXX should we use the same options...
		preBackup
			&& await this.create(base, sub, options ?? {})

		// ** or * -- backup each file in path...
		// NOTE: when restoring there is no difference between ** and *...
		if(/[\\\/]*\*\*?$/.test(sub)){
			if(sub.endsWith('**')){
				options.recursive = true }
			// restore...
			// NOTE: we have already made a full backup so no need to 
			// 		redo it down the line...
			options.preBackup = false
			options.__batch = true

			sub = sub.replace(/[\\\/]*\*\*?$/, '')
			var to = pwpath.join(base, sub)
			var b = pwpath.split(_backup)
				.filter(function(p){ 
					return p != '' })
				.shift()
			// cleanup...
			// NOTE: we need this stage as the file list we are backing up 
			// 		and the one in the target dir can differ, and a single-page
			// 		.restore(..) will only remove collisions...
			await fs.promises.readdir(base +'/'+ sub)
				.iter()
				// skip backups...
				.filter(function(file){
					return !file.includes(b) })
				.map(async function(file){
					var p = pwpath.join(base, sub, file)
					verbose
						&& console.log('restore(..): removing:', p)
					await fs.promises.rm(p, {recursive: true})
					return p })
			return fs.promises.readdir(backup)
				.iter()
				.map(async function(file){
					return await that.restore(base, sub+'/'+file, version, options) })
				// keep only the paths we backed up...
				.filter(function(e){ 
					return !!e }) 

		// single page...
		} else {
			var index_file = ''
			var full = _backup[0] == '/'
			var source = full ?
				pwpath.join(backup, sub)
				: pwpath.join(backup, pwpath.basename(sub))
			if(!fs.existsSync(source)){
				verbose
					&& console.log('restore(..): source not present in backup:', source)
				return }
			var to = pwpath.join(base, sub)
			if(fs.existsSync(to)){
				var stat = await fs.promises.stat(to)
				if(stat.isDirectory()){
					var f = pwpath.join(to, index)
					if(fs.existsSync(f)){
						verbose
							&& console.log('restore(..): removing:', f)
						await fs.promises.rm(f) }
				} else {
					verbose
						&& console.log('restore(..): removing:', to)
					await fs.promises.rm(to) } }

			if(!recursive){
				// handle dir text...
				var stat = await fs.promises.stat(source)
				if(stat.isDirectory()){
					source += '/'+index
					to += '/'+index 
					if(!fs.existsSync(source)){
						verbose
							&& !__batch
							&& console.log('restore(..): source not present in backup:', source)
						return } } }

			verbose
				&& console.log('restore(..): restoring:', to)
			await fs.promises.cp(source, to, {recursive: true})
			return source } },
	//
	//	Get backup versions...
	//	listbackups(<base>[, <options>])
	//	listbackups(<base>, '*'[, <options>])
	//		-> <list>
	//
	//	Get backup versions containing <path>...
	//	listbackups(<base>, <path>[, <options>])
	//		-> <list>
	//
	list: async function(base, sub, options){
		var that = this
		if(typeof(sub) == 'object'){
			options = sub
			sub = '*' }
		var {backup} = getOpts(options)

		// handle local/global backups...
		var full = backup[0] == '/'
		base = full ?
			pwpath.join(base, backup)
			: pwpath.join(base, pwpath.dirname(sub), backup)
		sub = full ?
			sub
			: pwpath.basename(sub)

		return fs.existsSync(base) ?
			fs.promises.readdir(base)
				.iter()
				.filter(function(version){
					return (sub == '*' || sub == '**')
						|| fs.existsSync(
							pwpath.join(base, version, sub)) }) 
			: [] },

	remove: async function(base, version, options){
		var {backup, verbose} = getOpts(options)
		var target = 
			(version == '*' || version == '**') ?
				pwpath.join(base, backup)
				: pwpath.join(base, backup, version)
		if(fs.existsSync(target)){
			verbose
				&& console.log(`.remove(..): removing:`, target)
			await fs.promises.rm(target, {recursive: true})
			return target } },
	clear: async function(base, options){
		return await this.remove(base, '*', options) }
}


// -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

// XXX might be a good idea to support ro mode on top level explicitly...
// XXX add monitor API + cache + live mode (auto on when lock detected)...
var FileStoreRO =
module.FileStoreRO = {
	__proto__: base.BaseStore,

	// XXX
	__path__: 'data/fs',

	// XXX should this be "index" or ".index"???
	__directory_text__: '.index',

	// XXX do we remove the extension???
	// XXX cache???
	__paths__: async function(){
		var that = this
		return new Promise(function(resolve, reject){
			glob(pwpath.join(that.__path__, '**/*'))
				.on('end', function(paths){
					Promise.all(paths
							.map(async function(path){
								return await module.exists(path) ?
									path
										.slice(that.__path__.length)
									: [] }))
						.then(function(paths){
							resolve(paths.flat()) }) }) }) },
	__exists__: async function(path){
		return await module.exists(this.__path__, path, {index: this.__directory_text__}) 
			&& path },
	__get__: async function(path){
		var p = pwpath.join(this.__path__, path)
		var {atimeMs, mtimeMs, ctimeMs, birthtimeMs} = await fs.promises.stat(p)
		return {
			atime: atimeMs,
			mtime: mtimeMs,
			ctime: ctimeMs,
			text: await module.read(p, {index: this.__directory_text__})
		} },

	__update__: function(){},
	__delete__: function(){},
}

// XXX add a lock file and prevent multiple adapters from controlling 
// 		one path...
// XXX backup files on write/delete...
var FileStore =
module.FileStore = {
	__proto__: FileStoreRO,

	// XXX
	__path__: 'data/fs',
	__backup_path__: '/.pwiki/backup',
	__lock_path__: '/.pwiki/lock',

	// XXX should this be "index" or ".index"???
	__directory_text__: '.index',

	__clear_lock__: [
		`SIGINT`, 
		`SIGUSR1`, 
		`SIGUSR2`, 
		`SIGTERM`,
		`exit`, 
		// XXX should we handle this??
		// 		...this can be an indicator of inconsistent state...
		//`uncaughtException`, 
	],
	__exit_lock_handler: undefined,
	// prevent more than one handler to write to a store...
	ensureLock: async function(){
		var that = this
		var lock = this.__path__ + this.__lock_path__
		// check lock...
		if(fs.existsSync(lock)){
			if(await module.read(lock) != process.pid){
				throw new Error('attempting to write to a locked store:', this.__path__) }
		// set lock...
		} else {
			module.update(lock, `${process.pid}`) 
			this.__exit_lock_handler = 
				this.__exit_lock_handler 
					// NOTE: this must be sync as deferred calls might 
					// 		not get a chance to execute...
					?? function(){
						fs.rmSync(lock) }
			this.__clear_lock__.forEach(function(evt){
				process.off(evt, that.__exit_lock_handler)
				process.on(evt, that.__exit_lock_handler) }) }
		return this },

	// XXX do we write all the data or only the .text???
	__update__: async function(path, data, mode='update'){
		this.ensureLock()
		return module.update(
			this.__path__, path, 
			data.text, 
			{index: this.__directory_text__}) },
    __delete__: async function(path){
		this.ensureLock()
		return module.clear(
			this.__path__, path, 
			{index: this.__directory_text__}) },

	// specific API...
	cleanup: async function(options={}){
		return module.cleanup(this.__path__, {
			index: this.__directory_text__,
			...options, 
		}) },
	// XXX add explicit versioning???
	backup: async function(path='**', options={}){
		this.ensureLock()
		return backup.create(
			this.__path__, path, 
			{
				index: this.__directory_text__,
				backup: this.__backup_path__,
				...options,
			}) },
	restore: async function(path='**', options={}){
		this.ensureLock()
		return backup.restore(
			this.__path__, path, 
			{
				index: this.__directory_text__,
				backup: this.__backup_path__,
				...options,
			}) },
}




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
