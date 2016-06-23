var gulp = require('gulp');
var path = require('path');
var del = require('del');
var colors = require('colors');
var $ = require('gulp-load-plugins')();

gulp.task('clean', function (cb) {
    del(['dist/']).then(path => { cb(); });
});

gulp.task('compile', () => {
    var tsProject = $.typescript.createProject('./tsconfig.json', {
        removeComments: true,
        noExternalResolve: false
    });

    var tsResult = gulp.src(['./src/**/*.ts', './typings/**/*.ts'])
        .pipe($.typescript(tsProject));
    
    tsResult.dts
        .pipe(gulp.dest('./dist/typings'));

    return tsResult.js
        .pipe(gulp.dest('./dist/src'));
});

gulp.task('ts-lint', function () {
  return gulp.src('./src/**/*.ts')
    .pipe($.tslint())
    .pipe($.tslint.report('full', {emitError: false}));
});

gulp.task('watch', () => {
    gulp.watch('./src/**/*.ts').on('change', tsLintFile);
    gulp.watch('./src/**/*.ts').on('change', compileFile);
});

gulp.task('build', gulp.series('clean', 'compile'));

gulp.task('default', gulp.series('build', 'ts-lint'));

function tsLintFile(file) {
    console.log(colors.yellow('[gulp watch - tsLint]' + ' ' + colors.cyan(file)));
    gulp.src(file)
        .pipe($.tslint())
        .pipe($.tslint.report('full', {emitError: false}));
}

function compileFile(file) {
    console.log(colors.yellow('[gulp watch - compileFile]' + ' ' + colors.cyan(file) ));
    var tsProject = $.typescript.createProject('./tsconfig.json', {
        removeComments: true,
        noExternalResolve: false,
        rootDir: '.'
    });

    var tsResult = gulp.src([file, './typings/**/*.ts'])
        .pipe($.typescript(tsProject));

    return tsResult.js
        .pipe(gulp.dest('./dist'));
}
