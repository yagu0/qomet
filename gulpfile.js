var gulp = require('gulp');
var nodemon = require('gulp-nodemon'); //reload server on changes

var nodemonOptions = {
	script: 'bin/www',
	ext: 'js',
	env: { 'NODE_ENV': 'development' },
	verbose: true,
	watch: ['./','config','utils','routes','models','entities']
};

gulp.task('server', function () {
	nodemon(nodemonOptions)
	.on('restart', function () {
		console.log('restarted!')
	});
});
