module.exports = function() {
    var client = './src/client/';
    var server = './src/server/';
    var configFolder = './config';
    var clientApp = client + './';
    var clientSpecs = client + 'specs/';
    var report = './report/';
    var root = './';
    var specRunnerFile = 'specs.html';
    var temp = './.tmp/';
    var wiredep = require('wiredep');
    var bowerFiles = wiredep({devDependencies: true})['js'];
    var bower = {
        json: require('./bower.json'),
        directory: './bower_components/',
        ignorePath: ['../..'],
        exclude: ['uikit.min.css'],
        overrides: {
            'main': '*.min.js'
        }
    };
    var uikitComponentsDirectory = bower.directory + 'uikit/js/components/';
    var nodeModules = 'node_modules';

    var defaultBullseyeApiBaseUrl = 'http://api.test.admedo.net/';

    var config = {
        /**
         * File paths
         */
        // all javascript that we want to vet
        alljs: [
            './src/**/*.js',
            './*.js',
            '!' + client + 'styles/**/*.js',
            '!' + client + 'integration/**/*.js',
            '!' + clientApp + 'shared/uikit*.js',
            '!' + clientApp + 'lineItem/lineItem.module.js'
        ],
        build: './build/',
        client: client,
        clientApp: clientApp,
        configFolder: configFolder,
        css: temp + 'styles.css',
        fonts: client + 'fonts/**/*.*',
        html: client + '**/*.html',
        htmltemplates: clientApp + '**/*.html',
        images: client + 'images/**/*.*',
        indexFile: 'index.html',
        indexTemplate: 'index.tmpl',
        // app js, with no specs
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js',
            '!' + client + '/integration/*.js'
        ],
        jsOrder: [
            '**/app.module.js',
            '**/*.module.js',
            '**/*.js'
        ],
        sass: client + 'styles/**/*.scss',
        sassCore: client + 'styles/styles.scss',
        report: report,
        root: root,
        server: server,
        source: 'src/',
        stubsjs: [
            bower.directory + 'angular-mocks/angular-mocks.js',
            client + 'stubs/**/*.js'
        ],
        temp: temp,

        /**
         * optimized files
         */
        optimized: {
            app: 'app.js',
            lib: 'lib.js'
        },

        /**
         * plato
         */
        plato: {js: clientApp + '**/*.js'},

        /**
         * browser sync
         */
        browserReloadDelay: 1000,

        defaultBullseyeApiBaseUrl: defaultBullseyeApiBaseUrl,

        /**
         * template cache
         */
        templateCache: {
            file: 'templates.js',
            options: {
                module: 'app',
                root: './',
                standAlone: false
            }
        },

        /**
         * Bower and NPM files
         */
        bower: bower,
        packages: [
            './package.json',
            './bower.json'
        ],

        /**
         * specs.html, our HTML spec runner
         */
        specRunnerPath: client,
        specRunnerFile: specRunnerFile,

        /**
         * The sequence of the injections into specs.html:
         *  1 testlibraries
         *      mocha setup
         *  2 bower
         *  3 js
         *  4 spechelpers
         *  5 specs
         *  6 templates
         */
        testlibraries: [
            nodeModules + '/mocha/mocha.js',
            nodeModules + '/chai/chai.js',
            nodeModules + '/chai-spies/chai-spies.js',
            nodeModules + '/mocha-clean/index.js',
            nodeModules + '/sinon-chai/lib/sinon-chai.js',
            nodeModules + '/shared-examples-for/index.js'
        ],
        specHelpers: [client + 'test-helpers/*.js', clientSpecs + '**/*.lib.js'],
        specs: [clientSpecs + '**/*.spec.js'],
        serverIntegrationSpecs: [client + '/integration/*.js'],

        uikitComponents: [
            uikitComponentsDirectory + 'accordion' + '.min.js',
            uikitComponentsDirectory + 'datepicker' + '.min.js',
            // uikitComponentsDirectory + 'notify' + '.min.js',
            uikitComponentsDirectory + 'form-select' + '.min.js',
            uikitComponentsDirectory + 'search' + '.min.js',
            uikitComponentsDirectory + 'sortable' + '.min.js',
            uikitComponentsDirectory + 'sticky' + '.min.js',
            uikitComponentsDirectory + 'tooltip' + '.min.js'
        ],

        /**
         * Node settings
         */
        nodeServer: './src/server/app.js',
        defaultPort: '8001'
    };

    /**
     * wiredep and bower settings
     */
    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath,
            exclude: config.bower.exclude
        };
        return options;
    };

    /**
     * karma settings
     */
    config.karma = getKarmaOptions();

    return config;

    ////////////////

    function getKarmaOptions() {
        var options = {
            files: [].concat(
                bowerFiles,
                nodeModules + '/chai-spies/chai-spies.js',
                nodeModules + '/shared-examples-for/index.js',
                config.specHelpers,
                clientApp + '**/*.module.js',
                configFolder + '/dev.config.js',
                clientApp + '**/*.js',
                //clientSpecs + '**/*.js',
                temp + config.templateCache.file,
                config.serverIntegrationSpecs
            ),
            exclude: [],
            reporters: ['progress', 'coverage'],
            coverage: {
                dir: report + 'coverage',
                reporters: [
                    // reporters not supporting the `file` property
                    {type: 'html', subdir: 'report-html'},
                    {type: 'lcov', subdir: 'report-lcov'},
                    {type: 'text-summary'} //, subdir: '.', file: 'text-summary.txt'}
                ]
            },
            preprocessors: {}
        };
        options.preprocessors[clientApp + '!(layout|widgets|core)/**/!(*.spec)+(.js)'] = ['coverage'];
        return options;
    }
};
