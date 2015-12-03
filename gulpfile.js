var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')();
var del = require('del');
var glob = require('glob');
var gulp = require('gulp');
var path = require('path');
var replace = require('gulp-replace');
var lazypipe = require('lazypipe');
var runSeries = require('run-sequence');
var _ = require('lodash');
var exec = require('gulp-exec');
var protractor = require('gulp-protractor').protractor;
var webdriver = require('gulp-protractor').webdriver;
var $ = require('gulp-load-plugins')({lazy: true});
var webserver = require('gulp-webserver');
var exit = require('gulp-exit');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var colors = $.util.colors;
var env = $.util.env;
var port = process.env.PORT || config.defaultPort;
var reload = browserSync.reload;
var fs = require('fs');

process.env.NODE_ENV = 'development';

/**
 * yargs variables can be passed in to alter the behavior, when present.
 * Example: gulp serve
 *
 * --verbose  : Various tasks will produce more output to the console.
 * --nosync   : Don't launch the browser with browser-sync when serving code.
 * --debug    : Launch debugger with node-inspector.
 * --debug-brk: Launch debugger and break on 1st line with node-inspector.
 * --startServers: Will start servers for midway tests on the test task.
 */

var basicInjector = function(devDep) {
    var options = config.getWiredepDefaultOptions();
    if (devDep) {
        options.devDependencies = true;
    }
    var js = args.stubs ? [].concat(config.js, config.stubsjs) : config.js;
    var templateCache = config.temp + config.templateCache.file;
    var wiredep = require('wiredep').stream;
    return lazypipe()
        .pipe(inject, config.css)
        .pipe(wiredep, options)
        .pipe(inject, templateCache, 'templates')
        .pipe(inject, js, '', config.jsOrder);
};

gulp.task('config', ['template-config-files'], function () {

});


gulp.task('default', ['config', 'compile-css', 'templatecache'], function() {
    var fileInject = basicInjector();
    return gulp
        .src(config.client + config.indexTemplate) //indexTemplate
        .pipe(fileInject())
        .pipe($.rename(config.indexFile))
        .pipe(gulp.dest(config.client));
});

/**
 * Optimize all files, move to a build folder,
 * and inject them into the new index.html
 * @return {Stream}
 */
gulp.task('optimize', ['default', 'fonts', 'images'], function() {
    log('Optimizing the js, css, and html');
    var fileInject = basicInjector();
    var assets = $.useref.assets({searchPath: './'});
    // Filters are named for the gulp-useref path
    var cssFilter = $.filter('**/*.css');
    var jsAppFilter = $.filter('**/app.js');
    var jslibFilter = $.filter('**/lib.js');
    var templateCache = config.temp + config.templateCache.file;
    return gulp
        .src(config.client + config.indexFile)
        .pipe($.plumber())
        .pipe(assets) // Gather all assets from the html with useref
        .pipe(cssFilter) // Get the css
        .pipe($.csso())
        .pipe(cssFilter.restore())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(jsAppFilter) // Get the custom javascript
        .pipe($.ngAnnotate())
        .pipe(uglify())
        .pipe(jsAppFilter.restore())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(jslibFilter)
        .pipe(uglify())
        .pipe(jslibFilter.restore())
        .pipe($.rev()) // Take inventory of the file names for future rev numbers
        .pipe(assets.restore()) // Apply the concat and file replacement with useref
        .pipe($.useref())
        .pipe($.revReplace()) // Replace the file names in the html with rev numbers
        .pipe(sourcemaps.write('./map'))
        .pipe(gulp.dest(config.build));
});

/**
 * Generate build directory that can be archived and deployed
 */
gulp.task('build', ['build-config-files', 'optimize']);

gulp.task('webdriver', ['serve'], function() {
    gulp.src('./')
        .pipe(exec('webdriver-manager start'));
});

gulp.task('e2e', ['serve'], function(done) {
    var conf = process.env.NODE_ENV === 'development' ? 'conf-dev.js' : 'conf-test.js';
    gulp.src(['./src/client/integration/*.js'])
        .pipe(protractor({
            configFile: './src/client/integration/' + conf
        }))
        .once('close', function() {
            browserSync.exit();
            done();
        });
});

/**
 * List the available gulp tasks
 */
gulp.task('help', $.taskListing);

/**
 * vet the code and create coverage report
 * @return {Stream}
 */
gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');

    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'))
        .pipe($.jscs());
});

/**
 * Create a visualizer report
 */
gulp.task('plato', function(done) {
    log('Analyzing source with Plato');
    log('Browse to /report/plato/index.html to see Plato results');

    startPlatoVisualizer(done);
});

/**
 * Compile sass to css
 * @return {Stream}
 */
gulp.task('compile-css', ['clean-styles'], function() {
    log('Compiling Sass --> CSS');

    return gulp
        .src(config.sassCore)
        .pipe($.plumber()) // exit gracefully if something fails after this XXX: is this a TODO?
        .pipe($.sass())
        .pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
        .pipe(gulp.dest(config.temp))
        .pipe(reload({ stream:true }));
});

/**
 * Copy fonts
 * @return {Stream}
 */
gulp.task('fonts', ['clean-fonts'], function() {
    log('Copying fonts');

    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

/**
 * Compress images
 * @return {Stream}
 */
gulp.task('images', ['clean-images'], function() {
    log('Compressing and copying images');

    return gulp
        .src(config.images)
        .pipe($.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('sass-watcher', function() {
    gulp.watch([config.sass], ['compile-css']);
});

/**
 * Create $templateCache from the html templates
 * @return {Stream}
 */
gulp.task('templatecache', ['clean-code'], function() {
    log('Creating an AngularJS $templateCache');

    return gulp
        .src(config.htmltemplates)
        .pipe($.if(args.verbose, $.bytediff.start()))
        .pipe($.minifyHtml({empty: true}))
        .pipe($.if(args.verbose, $.bytediff.stop(bytediffFormatter)))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp));
});

/**
 * Inject all the spec files into the specs.html
 * @return {Stream}
 */
gulp.task('build-specs', ['templatecache'], function(done) {
    log('building the spec runner');
    var specs = config.specs;
    var fileInject = basicInjector(true);
    if (args.startServers) {
        specs = [].concat(specs, config.serverIntegrationSpecs);
    }
    return gulp
        .src(config.specRunnerPath + 'specs.tmpl')
        .pipe(inject(config.testlibraries, 'testlibraries'))
        .pipe(inject(config.specHelpers, 'spechelpers'))
        .pipe(inject(specs, 'specs', ['**/*']))
        .pipe(fileInject())
        .pipe($.rename(config.specRunnerFile))
        .pipe(gulp.dest(config.specRunnerPath));
});

/**
 * Remove all files from the build, temp, and reports folders
 * @param  {Function} done - callback when complete
 */
gulp.task('clean', function(done) {
    var delconfig = [].concat(config.build, config.temp, config.report);
    delconfig.push(config.client + '*.html');
    delconfig.push(config.clientApp + 'shared/config.module.js');
    log('Cleaning: ' + $.util.colors.blue(delconfig));
    del(delconfig, done);
});

gulp.task('clean-config', function(done) {
    clean(config.build + 'config/**/*.*', function() {
        clean(config.configFolder + '/config.js', done);
    });
});

/**
 * Remove all fonts from the build folder
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-fonts', function(done) {
    clean(config.build + 'fonts/**/*.*', done);
});

/**
 * Remove all images from the build folder
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-images', function(done) {
    clean(config.build + 'images/**/*.*', done);
});

/**
 * Remove all styles from the build and temp folders
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-styles', function(done) {
    var files = [].concat(
        config.temp + '**/*.css',
        config.build + 'styles/**/*.css'
    );
    clean(files, done);
});

/**
 * Remove all js and html from the build and temp folders
 * @param  {Function} done - callback when complete
 */
gulp.task('clean-code', function(done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + 'js/**/*.js',
        config.build + '**/*.html'
    );
    clean(files, done);
});

/**
 * Run specs for each folder and exit
 * To start servers and run midway specs as well:
 *    gulp test --startServers
 * @return {Stream}
 */
gulp.task('test', function(done) {
    runSeries(['config', 'templatecache'], 'vet', function() {
        startSplitTests(true /*singleRun*/, done);
    });
});

/**
 * Run specs once and exit
 * To start servers and run midway specs as well:
 *    gulp test --startServers
 * @return {Stream}
 */
gulp.task('testall', function(done) {
    runSeries(['config', 'templatecache'], 'vet', function() {
        startTests(true /*singleRun*/, done);
    });
});

/**
 * Run specs and wait.
 * Watch for file changes and re-run tests on each change
 * To start servers and run midway specs as well:
 *    gulp autotest --startServers
 */
gulp.task('autotest', function(done) {
    startTests(false /*singleRun*/ , done);
});

/**
 * Run the spec runner
 * @return {Stream}
 */
gulp.task('serve-specs', ['build-specs'], function(done) {
    log('run the spec runner');
    serve(false /* runningBuild */, true /* specRunner */);
    done();
});

/**
 * serve the dev environment
 * --debug-brk or --debug
 * --nosync
 */
gulp.task('serve', ['default'], function() {
    return serve(false /* runningBuild */);
});

// TODO: what is this for?
gulp.task('close', [], function() {});

/**
 * serve the build environment
 * --debug-brk or --debug
 * --nosync
 */
gulp.task('serve-build', ['build'], function() {
    process.env.NODE_ENV = 'build';
    serve(true /* runningBuild */);
});

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function() {
    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.ver;
    var options = {};
    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);

    return gulp
        .src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

/**
 * Add config files (we have many, need to find better names for all of them) to build directory
 */
gulp.task('build-config-files', ['template-config-files'], function() {
    return gulp
        .src(config.configFolder + '/*.js')
        .pipe(gulp.dest(config.build + 'config'));
});

/**
 * Create config.js file that picks up environment variables
 *
 * Currently used to set up a config that can be used by Jenkins more
 * easily than the shell-script that is currently being run to generate it.
 */
gulp.task('template-config-files', function() {
    var bullseyeApiBaseUrl = process.env['BULLSEYE_API_BASE_URL'] ?
            process.env['BULLSEYE_API_BASE_URL'] : config.defaultBullseyeApiBaseUrl;

    return gulp.src(config.configFolder + '/config.js.template')
        .pipe(replace(/%BULLSEYE_API_BASE_URL%/g, bullseyeApiBaseUrl))
        .pipe($.rename('config.js'))
        .pipe(gulp.dest(config.configFolder));
});

/**
 * Run e2e Cucumber features
 */
gulp.task('cucumber', ['cucumber-serve'], function() {
    return gulp.src(['./features/*.feature'])
        .pipe(protractor({
            configFile: './protractor.conf.js'
        }))
        .pipe(exit());
});

/**
 * Serve build for cucumber tests
 */
gulp.task('cucumber-serve', ['build'], function() {
    return gulp.src(config.build)
        .pipe(webserver({
            host: '0.0.0.0',
            port: 4000,
            open: false
        }));
});

////////////////

/**
 * When files change, log it
 * @param  {Object} event - event that fired
 */
function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

/**
 * Delete all files in a given path
 * @param  {Array}   path - array of paths to delete
 * @param  {Function} done - callback when complete
 */
function clean(path, done) {
    log('Cleaning: ' + $.util.colors.blue(path));
    del(path, done);
}

/**
 * Inject files in a sorted sequence at a specified inject label
 * @param   {Array} src   glob pattern for source files
 * @param   {String} label   The label name
 * @param   {Array} order   glob pattern for sort order of the files
 * @returns {Stream}   The stream
 */
function inject(src, label, order) {
    var options = { read: false };
    if (label) { options.name = 'inject:' + label; }

    return $.inject(orderSrc(src, order), options);
}

/**
 * Order a stream
 * @param   {Stream} src   The gulp.src stream
 * @param   {Array} order Glob array pattern
 * @returns {Stream} The ordered stream
 */
function orderSrc (src, order) {
    //order = order || ['**/*'];
    return gulp
        .src(src)
        .pipe($.if(order, $.order(order)));
}

/**
 * serve the code
 * --debug-brk or --debug
 * --nosync
 * @param  {Boolean} runningBuild - dev or build mode
 * @param  {Boolean} specRunner - server spec runner html
 */
function serve(runningBuild, specRunner) {
    var debug = args.debug || args.debugBrk;
    var debugMode = args.debug ? '--debug' : args.debugBrk ? '--debug-brk' : '';
    var nodeOptions = getNodeOptions();

    if (debug) {
        runNodeInspector();
        nodeOptions.nodeArgs = [debugMode + '=5858'];
    }

    if (args.verbose) {
        console.log(nodeOptions);
    }

    return $.nodemon(nodeOptions)
        .on('restart', ['vet'], function(ev) {
            log('*** nodemon restarted');
            log('files changed:\n' + ev);
            setTimeout(function() {
                browserSync.notify('reloading now ...');
                browserSync.reload({stream: false});
            }, config.browserReloadDelay);
        })
        .on('start', function () {
            log('*** nodemon started');
            startBrowserSync(runningBuild, specRunner);
        })
        .on('crash', function () {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function () {
            log('*** nodemon exited cleanly');
        });
}

function getNodeOptions() {
    return {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': process.env.NODE_ENV === 'development' ? 'dev' : 'build'
        },
        watch: [config.server]
    };
}

function runNodeInspector() {
    log('Running node-inspector.');
    log('Browse to http://localhost:8080/debug?port=5858');
    var exec = require('child_process').exec;
    exec('node-inspector');
}

/**
 * Start BrowserSync
 * --nosync will avoid browserSync
 */
function startBrowserSync(runningBuild, specRunner) {
    if (args.nosync || browserSync.active) {
        return;
    }

    log('Starting BrowserSync on port ' + port);

    // If build: watches the files, builds, and restarts browser-sync.
    // If dev: watches sass, compiles it to css, browser-sync handles reload
    if (!runningBuild) {
        gulp.watch([config.sass], ['compile-css']).on('change', changeEvent);
        gulp.watch([config.html], ['templatecache']).on('change', changeEvent);
    } else {
        gulp.watch([config.sass, config.js, config.html], ['build', reload])
            .on('change', changeEvent);
    }
    startServer(runningBuild, specRunner);
}
function startServer(runningBuild, specRunner) {
    var options = {
        proxy: 'localhost:' + port,
        port: 4000,
        files: !runningBuild ? [
            config.client + '**/*.*',
            config.temp + '**/*.css',
            '!' + config.sass
        ] : [],
        ghostMode: false,
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 0 //1000
    } ;
    if (specRunner) {
        options.startPath = config.specRunnerPath + config.specRunnerFile;
    }

    return browserSync(options);
}

/**
 * Start Plato inspector and visualizer
 */
function startPlatoVisualizer(done) {
    log('Running Plato');

    var files = glob.sync(config.plato.js);
    var excludeFiles = /.*\.spec\.js/;
    var plato = require('plato');

    var options = {
        title: 'Plato Inspections Report',
        exclude: excludeFiles
    };
    var outputDir = config.report + '/plato';

    plato.inspect(files, outputDir, options, platoCompleted);

    function platoCompleted(report) {
        var overview = plato.getOverviewReport(report);
        if (args.verbose) {
            log(overview.summary);
        }
        if (done) { done(); }
    }
}

function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}

function startFolderTests(dir, done) {
    var folder = dir.shift();
    var specs = './src/client/specs/' + folder + '/**/*.js';
    var testfiles = [].concat(config.karma.files, specs);
    var karma = require('karma').server;
    var serverSpecs = config.serverIntegrationSpecs;

    log('Starting tests for ' + folder);
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        exclude: serverSpecs,
        files: testfiles,
        singleRun: true
    }, karmaCompleted);

    function karmaCompleted(karmaResult) {
        if (karmaResult === 0) {
            if (dir.length) {
                startFolderTests(dir, done);
            } else {
                log('Karma completed');
                done();
            }
        } else {
            done('karma: tests failed with code ' + karmaResult);
        }
    }
}

/**
 * Start the split tests using karma.
 * @param  {boolean} singleRun - True means run once and end (CI), or keep running (dev)
 * @param  {Function} done - Callback to fire when karma is done
 * @return {undefined}
 */
function startSplitTests(singleRun, done) {
    var specDir = getFolders('./src/client/specs/');

    startFolderTests(specDir, done);
}

/**
 * Start the tests using karma.
 * @param  {boolean} singleRun - True means run once and end (CI), or keep running (dev)
 * @param  {Function} done - Callback to fire when karma is done
 * @return {undefined}
 */
function startTests(singleRun, done) {
    var child;
    var excludeFiles = [];
    var fork = require('child_process').fork;
    var karma = require('karma').server;
    var serverSpecs = config.serverIntegrationSpecs;
    var specfiles = './src/client/specs/**/*.js';
    var testfiles = [].concat(config.karma.files, specfiles);

    if (args.startServers) {
        log('Starting servers');
        var savedEnv = process.env;
        savedEnv.NODE_ENV = 'dev';
        savedEnv.PORT = 8888;
        child = fork(config.nodeServer);
    } else {
        if (serverSpecs && serverSpecs.length) {
            excludeFiles = serverSpecs;
        }
    }

    karma.start({
        configFile: __dirname + '/karma.conf.js',
        files: testfiles,
        exclude: serverSpecs,
        singleRun: !!singleRun,
        reporters: config.karma.reporters,
        coverageReporter: config.karma.coverage
    }, karmaCompleted);

    ////////////////

    function karmaCompleted(karmaResult) {
        log('Karma completed');
        if (child) {
            log('shutting down the child process');
            child.kill();
        }
        if (karmaResult === 1) {
            done('karma: tests failed with code ' + karmaResult);
        } else {
            done();
        }
    }
}

/**
 * Formatter for bytediff to display the size changes after processing
 * @param  {Object} data - byte data
 * @return {String}      Difference in bytes, formatted
 */
function bytediffFormatter(data) {
    var difference = (data.savings > 0) ? ' smaller.' : ' larger.';
    return data.fileName + ' went from ' +
        (data.startSize / 1000).toFixed(2) + ' kB to ' +
        (data.endSize / 1000).toFixed(2) + ' kB and is ' +
        formatPercent(1 - data.percent, 2) + '%' + difference;
}

/**
 * Log an error message and emit the end of a task
 */
function errorLogger(error) {
    log('*** Start of Error ***');
    log(error);
    log('*** End of Error ***');
    this.emit('end');
}

/**
 * Format a number as a percentage
 * @param  {Number} num       Number to format as a percent
 * @param  {Number} precision Precision of the decimal
 * @return {String}           Formatted perentage
 */
function formatPercent(num, precision) {
    return (num * 100).toFixed(precision);
}



/**
 * Log a message or series of messages using chalk's blue color.
 * Can pass in a string, object or array.
 */
function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}

/**
 * Show OS level notification using node-notifier
 */
function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };
    _.assign(notifyOptions, options);
    notifier.notify(notifyOptions);
}

module.exports = gulp;
