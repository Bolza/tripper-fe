# Trapper FE

> run with "gulp serve"

## Prerequisites

1. Install [Node.js](http://nodejs.org)

2. Install these NPM packages globally

    ```bash
    npm install -g bower gulp nodemon
    ```

    > :squirrel: Refer to these [instructions on how to not require sudo](https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md)

### Installing Packages
You *must* run these commands before anything will work:

 - `npm install`
 - `bower install`

## Running Bullseye UI

### Linting
 - Run code analysis using `gulp analyze`. This runs jshint, jscs, and plato.

### Tests
 - Run the unit tests using `gulp test` (via karma, mocha, sinon).

### Running in dev mode
 - Run the project with `gulp serve-dev --sync`

 - `--sync` opens it in a browser and updates the browser with any files changes.

### Building the project
 - Build the optimized project using `gulp build`
 - This create the optimized code for the project and puts it in the build folder

### Running the optimized code
 - Run the optimize project from the build folder with `gulp serve-build`

## Structural information

### The Modules
The app has 4 feature modules and depends on a series of external modules and custom but cross-app modules

```
app --> [
        app.admin,
        app.dashboard,
        app.layout,
        app.widgets,
		app.core --> [
			ngAnimate,
			ngSanitize,
			ui.router,
			utils.exception,
			utils.logger,
			utils.router
		]
    ]
```

#### core Module
Core modules are ones that are shared throughout the entire application and may be customized for the specific application. Example might be common data services.

This is an aggregator of modules that the application will need. The `core` module takes the utils, common, and Angular sub-modules as dependencies.

#### utils Modules
Block modules are reusable utils of code that can be used across projects simply by including them as dependencies.

##### utils.logger Module
The `utils.logger` module handles logging across the Angular app.

##### utils.exception Module
The `utils.exception` module handles exceptions across the Angular app.

It depends on the `utils.logger` module, because the implementation logs the exceptions.

##### utils.router Module
The `utils.router` module contains a routing helper module that assists in adding routes to the $routeProvider.
