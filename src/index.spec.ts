import 'babel-register';
import { test } from 'ava';
import { GulpPlugin } from './index';
import { FuseBox, HTMLPlugin, TypeScriptHelpers, JSONPlugin } from 'fuse-box';
const g = require('gulp-load-plugins')();
const through = require('through2');

function fuseBoxBundle(files, plugins: any[], bundleStr = '**/*.*'): Promise<any> {
    return new Promise((resolve, reject) => {
        let fuseBox = new FuseBox({
            log: false,
            cache: false,
            plugins: plugins,
            files: files
        });
        fuseBox.bundle(bundleStr)
            .then(data => {
                if (!data || !data.content) return reject(new Error('bundle content empty'));
                let scope = { navigator: 1 };
                let str = data.content.toString();
                str = str.replace(/\(this\)\)$/, "(__root__))");
                try {
                    let fn = new Function("window", "__root__", str);
                    fn(scope, scope);
                } catch (err) {
                    var pos = str.indexOf('(function(e){var r="undefined"!=typeof window&&window.navigator');
                    if (pos !== -1) {
                        var content = str.slice(0, pos);
                        console.error(content);
                    }
                    return reject(err);
                }
                return resolve(scope);
            })
            .catch(err => {
                reject(err);
            });
    });
}

test('smoke', t => {
    t.truthy(GulpPlugin);
});

test('fusebox bundle', async t => {
    let {FuseBox} = await fuseBoxBundle({
        './a.js': `module.exports = 1`,
    }, []);
    let result = FuseBox.import('./a.js');
    t.is(result, 1);
});

test('gulp replace single plugin', async t => {
    const plugins = [
        GulpPlugin([
            () => g.replace('foo', 'bar')
        ])
    ];
    let {FuseBox} = await fuseBoxBundle({
        './foo.js': `module.exports = 'foo'`,
    }, plugins);
    let foo = FuseBox.import('./foo');
    t.is(foo, 'bar');
});

test('gulp replace, inject-string', async t => {
    const plugins = [
        GulpPlugin([
            () => g.replace('foo', 'bar'),
            () => g.injectString.append(`exports.b = 'buz';`),
        ])
    ];
    let {FuseBox} = await fuseBoxBundle({
        './foo.js': `exports.f = 'foo';`,
    }, plugins);
    let {f, b} = FuseBox.import('./foo');
    t.is(f, 'bar');
    t.is(b, 'buz');
});

test('gulp markdown', async t => {
    const plugins = [
        TypeScriptHelpers(),
        [
            /\.html$/,
            GulpPlugin([
                () => g.markdown()
            ]),
            HTMLPlugin({ useDefault: true }),
        ]
    ];
    let {FuseBox} = await fuseBoxBundle({
        './app.ts': `import doc from './doc.html'; exports.doc = doc`,
        './doc.html': `# header`,
    }, plugins);
    let {doc} = FuseBox.import('./app.ts');
    t.is(doc, `<h1 id="header">header</h1>\n`);
});

test('gulp json5', async t => {
    const plugins = [
        [
            /\.json$/,
            GulpPlugin([
                () => g.json5(),
            ]),
            JSONPlugin(),
        ]
    ];
    var {FuseBox} = await fuseBoxBundle({
        './foo.json': `{foo:1}`,
        './app.js': `module.exports.data = require('./foo.json')`,
    }, plugins);
    let foo = FuseBox.import('./foo.json');
    t.deepEqual(foo, { foo: 1 });
    let app = FuseBox.import('./app.js');
    t.deepEqual(app.data, { foo: 1 });
});
