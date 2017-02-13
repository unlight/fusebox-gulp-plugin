import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { streamToVinyl, vinylToStream } from './transforms';
import * as stream from 'stream';
const toString = require('stream-to-string');
const pumpify = require('pumpify');

export function GulpPlugin(streamFactories: ((file: File) => stream.Transform)[]) {
    return new FuseBoxGulpPlugin(streamFactories);
}

export class FuseBoxGulpPlugin implements Plugin {

    test: any = { test: () => true };

    constructor(
        private vinylStreams: ((file: File) => any)[]
    ) {
    }

    transform(file: File) {
        if (file.collection.name !== 'default') {
            return;
        }
        let context: WorkFlowContext = file.context;
        const useCache = false;
        // const useCache = context.useCache;
        if (useCache) {
            let cached = context.cache.getStaticCache(file);
            if (cached) {
                file.contents = cached.contents;
                return;
            }
        }
        file.loadContents();
        const input = streamToVinyl(file.absPath);
        const streams = [input];
        this.vinylStreams.forEach(vinylStreamFactory => {
            streams.push(vinylStreamFactory(file));
        });
        streams.push(vinylToStream());
        const pipeline = pumpify.obj(streams);
        input.write(file.contents);
        input.end();
        return toString(pipeline, (err, result) => {
            file.contents = result;
            // TODO: Do we need writeStaticCache?
            // Seems no, because writeStaticCache is called before tryPlugins
            if (useCache) {
                context.cache.writeStaticCache(file, null);
            }
        });
    }
}