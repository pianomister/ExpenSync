// GULP TASKS

// include gulp
var gulp = require('gulp');

// include plugins
var babel = require('gulp-babel');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var util = require('gulp-util');

// base paths
var paths = {
	src: {
		js: 'js/',
		scss: 'scss/'
	},
	dist: {
		js: 'dist/',
		css: 'dist/'
	}
};

// JS build file lists
var jsFiles = {
	vendor: [
		// 3rd party libs
		'node_modules/jquery/dist/jquery.min.js',
		'node_modules/framework7/dist/js/framework7.min.js',
		'node_modules/crossfilter2/crossfilter.min.js',
		'node_modules/d3/d3.min.js',
		'node_modules/dc/dc.min.js',
		// local 3rd party libs
		paths.src.js + 'vendor/md5.js',
		paths.src.js + 'vendor/dropbox-sdk-2.5.10.min.js'
	],
	app: [
		// fileDB lib
		'node_modules/multideviceDatabase/dist/fileDB.min.js',
		paths.src.js + 'app/expenses-backend.js',
		paths.src.js + 'app/expenses-stats.js',
		paths.src.js + 'app/expenses-frontend.js'
	]
};


// compile sass
gulp.task('sass', function() {
	return gulp.src(paths.src.scss + 'main.scss')
		.pipe(sass())
		.pipe(rename('main.css'))
		.pipe(gulp.dest(paths.dist.css))
		.pipe(rename('main.min.css'))
		.pipe(cleanCSS())
		.pipe(gulp.dest(paths.dist.css))
		.on('error', util.log);
});

// concatenate & minify vendor JS
gulp.task('scripts:vendor', function() {
	return gulp.src(jsFiles.vendor)
		.pipe(concat('vendor.js'))
		.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

// build app-specific JS
gulp.task('scripts:app', function() {

	return gulp.src(jsFiles.app)
		.pipe(babel())
		.pipe(concat('app.js'))
		.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

gulp.task('scripts:build', ['scripts:vendor', 'scripts:app'], function() {
	return gulp.src([paths.dist.js + 'vendor.js', paths.dist.js + 'app.js'])
		.pipe(concat('main.js'))
		.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

gulp.task('scripts:app-watch', ['scripts:app'], function() {
	return gulp.src([paths.dist.js + 'vendor.js', paths.dist.js + 'app.js'])
		.pipe(concat('main.js'))
		.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

// full JS build
gulp.task('scripts:default', ['scripts:vendor', 'scripts:app', 'scripts:build']);

// watch files for changes
gulp.task('watch', function() {
	gulp.watch(paths.src.js + '**/*.js', ['scripts:app-watch']);
	gulp.watch(paths.src.scss + '**/*.scss', ['sass']);
});

// Default Task
gulp.task('default', ['sass', 'scripts:default']);
