const { src, dest, watch, series, parallel, lastRun } = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync');
const del = require('del');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const { argv } = require('yargs');
const htmlmin = require('gulp-htmlmin');
const injector = require('gulp-inject');
const rename = require('gulp-rename');

const $ = gulpLoadPlugins();
const server = browserSync.create();

const port = argv.port || 9000;

const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

function styles() {
	return src('app/styles/*.scss')
		.pipe($.plumber())
		.pipe($.if(!isProd, $.sourcemaps.init()))
		.pipe(
			$.sass
				.sync({
					outputStyle: 'expanded',
					precision: 10,
					includePaths: ['.']
				})
				.on('error', $.sass.logError)
		)
		.pipe($.postcss([autoprefixer()]))
		.pipe($.if(!isProd, $.sourcemaps.write()))
		.pipe(dest('.tmp/styles'))
		.pipe(
			server.reload({
				stream: true
			})
		);
}

function scripts() {
	return src('app/scripts/**/*.js')
		.pipe($.plumber())
		.pipe($.if(!isProd, $.sourcemaps.init()))
		.pipe($.babel())
		.pipe($.if(!isProd, $.sourcemaps.write('.')))
		.pipe(dest('.tmp/scripts'))
		.pipe(
			server.reload({
				stream: true
			})
		);
}

const lintBase = files => {
	return src(files)
		.pipe(
			$.eslint({
				fix: true
			})
		)
		.pipe(
			server.reload({
				stream: true,
				once: true
			})
		)
		.pipe($.eslint.format())
		.pipe($.if(!server.active, $.eslint.failAfterError()));
};

function lint() {
	return lintBase('app/scripts/**/*.js').pipe(dest('app/scripts'));
}

function lintTest() {
	return lintBase('test/spec/**/*.js').pipe(dest('test/spec'));
}

function images() {
	return src('app/images/**/*', {
		since: lastRun(images)
	})
		.pipe($.imagemin())
		.pipe(dest('dist/images'));
}

function fonts() {
	return src('app/fonts/**/*.{eot,svg,ttf,woff,woff2}').pipe(
		$.if(!isProd, dest('.tmp/fonts'), dest('dist/fonts'))
	);
}

function extras() {
	return src(['app/*', '!app/*.html'], {
		dot: true
	}).pipe(dest('dist'));
}

function clean() {
	// return del(['.tmp', 'dist'])
	return del('.tmp');
}

function measureSize() {
	return src('dist/**/*').pipe(
		$.size({
			title: 'build',
			gzip: true
		})
	);
}

// These two functions grab the HTML and CSS from their respective
// working files then concatenates them into assembled.html.
//
// Now minifies styling and markup, placing it in dist/compressed.html
// From there you do the good ol' copy+paste copy+paste
//
function injectCSS() {
	return src('./app/assembled.html')
		.pipe(
			injector(src(['./.tmp/styles/main.css']), {
				starttag: '/* inject:theCSS:css */',
				endtag: '/* endCSSinject */',
				transform: function(filePath, file) {
					var theCss = file.contents.toString('utf8');
					theCss = theCss.replace(
						/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
						'$1'
					);
					return theCss;
				}
			})
		)
		.pipe(dest('./app'));
}

function injectHTML() {
	return src('./app/assembled.html')
		.pipe(
			injector(src(['./app/originalHtml.html']), {
				starttag: '<!-- inject:theHTML:html -->',
				endtag: '<!-- endHTMLinject -->',
				transform: function(filePath, file) {
					return file.contents.toString('utf8');
				}
			})
		)
		.pipe(dest('./app'));
	// .pipe(htmlmin({
	//     collapseWhitespace: true,
	//     minifyCSS: true,
	//     minifyJS: true,
	//     processConditionalComments: true,
	//     removeComments: true,
	//     removeEmptyAttributes: true,
	//     removeScriptTypeAttributes: true,
	//     removeStyleLinkTypeAttributes: true
	// }))
	// .pipe(rename('compressed.html'))
	// .pipe(dest('./dist'));
}

const build = series(
	parallel(lint, series(parallel(styles, scripts)), images, fonts, extras),
	measureSize
);

function startAppServer() {
	server.init({
		notify: false,
		port,
		server: {
			baseDir: ['.tmp', 'app'],
			routes: {
				'/node_modules': 'node_modules'
			}
		}
	});

	watch([
		'app/*.html',
		'!app/assembled.html',
		'app/images/**/*',
		'.tmp/fonts/**/*'
	]).on('change', series(injectHTML, server.reload));
	watch('app/styles/**/*.scss', series(styles, injectCSS));
	watch('app/scripts/**/*.js', scripts);
	watch('app/fonts/**/*', fonts);
}

function startDistServer() {
	server.init({
		notify: false,
		port,
		server: {
			baseDir: 'dist',
			routes: {
				'/node_modules': 'node_modules'
			}
		}
	});
}

let serve;
if (isDev) {
    serve = series(clean, parallel(styles, scripts, fonts), startAppServer);
} else if (isProd) {
	serve = series(build, startDistServer);
}

let inject = series(injectCSS, injectHTML)

exports.serve = serve;
exports.build = build;
exports.inject = inject;
exports.default = build;
