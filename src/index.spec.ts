/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />
import { GulpPlugin } from './index';
import { FuseBox, RawPlugin, JSONPlugin } from 'fuse-box';
import { File } from 'fuse-box/dist/typings/File';
const g = require('gulp-load-plugins')();
import through = require('through2');
import assert = require('power-assert');

function fuseBoxBundle(files, plugins: any[], options = {}, bundleStr = '**/*.*'): Promise<any> {
    const defaultOptions = {
        log: false,
        cache: false,
        plugins: plugins,
        files: files,
    };
    return new Promise((resolve, reject) => {
        const fuseBox = new FuseBox({ ...defaultOptions, ...options });
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

describe('index', () => {

    it('smoke', () => {
        assert(GulpPlugin);
    });

    it('fusebox bundle', async () => {
        let {FuseBox} = await fuseBoxBundle({
            './app.js': `module.exports = 1`,
        }, []);
        let result = FuseBox.import('./app');
        assert(result === 1);
    });

    it('replace', async () => {
        const plugins = [
            GulpPlugin([
                () => g.replace('foo', 'bar')
            ])
        ];
        let {FuseBox} = await fuseBoxBundle({
            './foo.js': `module.exports = 'foo'`,
        }, plugins);
        let foo = FuseBox.import('./foo');
        assert(foo === 'bar');
    });

    it('replace and inject-string', async () => {
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
        assert(f === 'bar');
        assert(b === 'buz');
    });

    it('markdown', async () => {
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
        assert(doc === `<h1 id="header">header</h1>\n`);
    });

    it('json5', async () => {
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
        assert.deepEqual(foo, { foo: 1 });
        let app = FuseBox.import('./app');
        assert.deepEqual(app.data, { foo: 1 });
    });

    it('eslint', done => {
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
                        assert(result.errorCount === 1);
                        assert(result.warningCount === 1);
                        done();
                    }),
                ])
            ]
        ];
        (async () => {
            let {FuseBox} = await fuseBoxBundle({
                './app.js': `var x; y = 2;`,
            }, plugins);
            let app = FuseBox.import('./app');
        })();
    });

    it.skip('cache', async () => {
        const plugins = [
            GulpPlugin([
                () => g.replace('foo', 'bar')
            ]),
        ];
        let {FuseBox} = await fuseBoxBundle({
            './foo.js': `module.exports = 'foo'`,
        }, plugins, { cache: true });
        let foo = FuseBox.import('./foo');
        assert(foo === 'bar');
    });
});
