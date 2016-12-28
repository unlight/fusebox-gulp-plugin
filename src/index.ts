import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { streamToVinyl, vinylToStream } from './transforms';
const toString = require('stream-to-string');
const pumpify = require('pumpify');

export class GulpAdapterPlugin implements Plugin {

    context: WorkFlowContext;
    test: any = { test: () => true };

    constructor(
        private vinylStreams: ((file: File) => any)[]
    ) {
    }

    init(context: WorkFlowContext) {
        this.context = context;
    }

    transform(file: File) {
        if (file.collection.name !== 'default') {
            return;
        }
        // if (this.context.useCache) {

        //     let cached = this.context.cache.getStaticCache(file);
        //     if (cached) {
        //         if (cached.sourceMap) {
        //             file.sourceMap = cached.sourceMap;
        //         }
        //         file.analysis.skip();
        //         file.analysis.dependencies = cached.dependencies;
        //         file.contents = cached.contents;
        //         return;
        //     }
        // }
        file.loadContents();
        const streams = this.vinylStreams.map(vinylStream => {
            return vinylStream(file);
        });
        const input = streamToVinyl(file.absPath);
        streams.unshift(input);
        const output = vinylToStream();
        streams.push(output);
        const pipeline = pumpify.obj(...streams);
        input.write(file.contents);
        // pipeline.on('error', err => {
        //     console.log('err', err);
        // });
        input.end();
        // var oemit = output.emit;
        // output.emit = function() {
        //     console.log(arguments[0]);
        //     return oemit.apply(output, arguments);
        // };
        return toString(pipeline, (err, result) => {
            file.contents = result;
        });

        // if (pass) {

        //      file.analysis.loadAst(result.ast);
        //      file.analysis.analyze();
        //      file.contents = result.code;
        //      let sm = result.map;
        //      sm.file = file.info.fuseBoxPath;
        //      sm.sources = [file.info.fuseBoxPath];
        //      file.sourceMap = JSON.stringify(sm);

        //      if (this.context.useCache) {
        //          this.context.cache.writeStaticCache(file, file.sourceMap);
        //      }
        //  }
    }
}

export function GulpPlugins(plugins: ((file: File) => any)[]) {
    return new GulpAdapterPlugin(plugins);
}