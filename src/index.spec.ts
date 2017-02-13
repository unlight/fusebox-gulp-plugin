import { test } from 'ava';
import { GulpPlugin } from './index';
import { FuseBox, RawPlugin, JSONPlugin } from 'fuse-box';
const g = require('gulp-load-plugins')();
import through = require('through2');

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
                let str: string = data.content.toString();
                str = str.replace(/\(this\)\)$/, "(__root__))");
                try {
                    let fn = new Function("window", "__root__", str);
                    fn(scope, scope);
                } catch (err) {
                    var pos = str.lastIndexOf('function(___scope___){');
                    var end = str.indexOf('(function(e){var r="undefined"!=typeof window&&window.navigator');
                    var content = str.slice(pos, end - 6);
                    console.error(content);
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
        './app.js': `module.exports = 1`,
    }, []);
    let result = FuseBox.import('./app');
    t.is(result, 1);
});

test('replace', async t => {
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

test('replace and inject-string', async t => {
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

test('markdown', async t => {
    const plugins = [
        [
            /\.md$/,
            GulpPlugin([
                () => g.markdown()
            ]),
            RawPlugin({ extensions: ['.md'] }),
        ]
    ];
    let {FuseBox} = await fuseBoxBundle({
        './app.js': `exports.doc = require('./doc.md')`,
        './doc.md': `# header`,
    }, plugins);
    let {doc} = FuseBox.import('./app');
    t.is(doc, `<h1 id="header">header</h1>\n`);
});

test('json5', async t => {
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
    var {FuseBox} = await fuseBoxBundle({
        './foo.json5': `{foo:1}`,
        './app.js': `exports.data = require('./foo.json5')`,
    }, plugins);
    let foo = FuseBox.import('./foo.json5');
    t.deepEqual(foo, { foo: 1 });
    let app = FuseBox.import('./app');
    t.deepEqual(app.data, { foo: 1 });
});

test('eslint', async t => {
    const plugins = [
        [
            /\.js$/,
            GulpPlugin([
                () => g.eslint({
                    warnFileIgnored: true,
                    ignore: false,
                    dotfiles: true,
                    rules: {
                        "no-unused-vars": 1,
                        "no-undef": 2,
                    }
                }),
                () => g.eslint.result(result => {
                    t.is(result.errorCount, 1);
                    t.is(result.warningCount, 1);
                }),
            ])
        ]
    ];
    let {FuseBox} = await fuseBoxBundle({
        './app.js': `var x; y = 2;`,
    }, plugins);
    let app = FuseBox.import('./app');
});