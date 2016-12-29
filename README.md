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
        new GulpPlugin([
        	(file) => g.replace('foo', 'bar'),
        	// Other gulp plugins...
        ])
    ]
});
```

### API
`GulpPlugin(plugins: ((file: File) => any)[])`

**Note:**
GulpPlugin is applicable to all files, so you must control type of transform by ChainPlugin.

### Examples

```js
const { GulpPlugin } = require('fusebox-gulp-plugin');
const g = require('gulp-load-plugins')();
```

#### Markdown
```js
const plugins = [
    TypeScriptHelpers(),
    [
        /\.html$/,
        gulpPlugin([
            () => g.markdown()
        ]),
        HTMLPlugin({ useDefault: true })
    ]
];
```
```js
import doc from './doc.md'
```

#### JSON5
```js
const plugins = [
    [
        /\.json$/,
        new GulpPlugin([
            () => g.json5(),
        ]),
        JSONPlugin()
    ]
];
```
```js
const data = require('./data.json');
```

#### Replace and size
```js
const plugins = [
    new GulpPlugin([
        () => g.replace('foo', 'bar'),
        () => g.size(),
        // Other gulp plugins...
    ])
];
```