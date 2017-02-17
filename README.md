fusebox-gulp-plugin
===================
Adapt gulp plugins to work with fuse-box.

## Usage
```js
const fsbx = require('fuse-box');
const g = require('gulp-load-plugins')();
const { GulpPlugin } = require('fusebox-gulp-plugin');

const fuseBox = fsbx.FuseBox.init({
    homeDir: 'src/',
    outFile: './build/app.js',
    plugins: [
        // Other fusebox plugins...
        GulpPlugin([
        	(file) => g.replace('foo', 'bar'),
        	// Other gulp plugins...
        ])
    ]
});
```

**Note:**
GulpPlugin is applicable to all files, so you must control type of transform by `ChainPlugin`
(see examples below).

Also, you can use only those plugins which only manipulates `contents` property of vinyl file.  
Applying of some plugins, like `gulp-rename`, does not make sense,
because they do not affect `contents`, but others - path, dirname, etc.


### API
```js
function GulpPlugin(streamFactories: ((file: File) => stream.Transform)[])
```

### Examples

```js
const { GulpPlugin } = require('fusebox-gulp-plugin');
const g = require('gulp-load-plugins')();
```

#### Markdown
```js
const plugins = [
    [
        /\.md$/,
        GulpPlugin([
            () => g.markdown(),
        ]),
        RawPlugin({ extensions: ['.md'] }),
    ]
];
```
```js
var doc = require('./doc.md')
```

#### JSON5
```js
const plugins = [
    {
        init: (k) => k.allowExtension('.json5')
    },
    [
        /\.json5$/,
        GulpPlugin([
            () => g.json5(),
        ]),
        JSONPlugin({}),
    ]
];
```
```js
const data = require('./data.json5');
```

### DEBUG
```
inspect node_modules/ava/profile.js lib/index.spec.js
```