// GULP TASKS
// Thanks to awesome documentation collected throughout the web.
// https://www.viget.com/articles/gulp-browserify-starter-faq

// TODO clean this mess up ...

// include gulp
var gulp = require('gulp');

// include plugins
var babel = require('gulp-babel');
var babelify = require('babelify');
var browserify = require('browserify');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var include = require("gulp-include");
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var transform = require('vinyl-transform');
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
		'node_modules/framework7/dist/framework7.min.js',
		'node_modules/crossfilter2/crossfilter.min.js',
		'node_modules/d3/d3.min.js',
		'node_modules/dc/dc.min.js',
		// local 3rd party libs
		paths.src.js + 'vendor/md5.js',
		paths.src.js + 'vendor/dropbox-datastores-1.2.0.js'
	],
	app: [
		// fileDB lib
		'node_modules/multideviceDatabase/dist/fileDB.min.js',
		paths.src.js + 'app/expenses-backend.js',
		paths.src.js + 'app/expenses-stats.js',
		//paths.src.js + 'app/expenses-sync.js',
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

// Concatenate & Minify JS
/*
gulp.task('scripts', function() {
    //var browserified = transform(function(filename) {
    //  var b = browserify(filename);
    //  return b.bundle();
    //});


    //return gulp.src(paths.src.js + '*.js')
    //    .pipe(babel())
    //    .pipe(concat('main.js'))

    return browserify(paths.src.js + 'main.js')
        .transform('babelify', {
          "presets": ["es2015"]
        })
        .bundle()
        .pipe(source('main.js'))

    //return gulp.src([paths.src.js + 'main.js'])
    //    .pipe(browserified)
    //    .pipe(rename('main.js'))
        .pipe(gulp.dest(paths.dist.js))
        .pipe(rename('main.min.js'))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest(paths.dist.js))
        .on('error', util.log);
});
*/

// concatenate & minify vendor JS
gulp.task('scripts:vendor', function() {
	return gulp.src(jsFiles.vendor)
		.pipe(concat('vendor.js'))
		.pipe(gulp.dest(paths.dist.js))
		//.pipe(rename('vendor.min.js'))
		//.pipe(streamify(uglify()))
    //.pipe(uglify())
		//.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

// build app-specific JS
gulp.task('scripts:app', function() {

	//return browserify(paths.src.js + '_app.js')
	//	.transform('babelify', {
	//		"presets": ["es2015"]
	//	})
	//	.bundle()
  //  .pipe(source('app.js'))
	return gulp.src(jsFiles.app)
		.pipe(babel())
		.pipe(concat('app.js'))
		.pipe(gulp.dest(paths.dist.js))
		//.pipe(rename('app.min.js'))
		//.pipe(streamify(uglify()))
    //.pipe(uglify())
		//.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

gulp.task('scripts:build', ['scripts:vendor', 'scripts:app'], function() {
	return gulp.src([paths.dist.js + 'vendor.js', paths.dist.js + 'app.js'])
		.pipe(concat('main.js'))
		.pipe(gulp.dest(paths.dist.js))
		//.pipe(rename('main.min.js'))
    //.pipe(uglify())
		//.pipe(gulp.dest(paths.dist.js))
		.on('error', util.log);
});

gulp.task('scripts:app-watch', ['scripts:app'], function() {
	return gulp.src([paths.dist.js + 'vendor.js', paths.dist.js + 'app.js'])
		.pipe(concat('main.js'))
		.pipe(gulp.dest(paths.dist.js))
		//.pipe(rename('main.min.js'))
    //.pipe(uglify())
		//.pipe(gulp.dest(paths.dist.js))
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
