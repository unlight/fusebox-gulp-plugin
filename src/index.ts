import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { streamToVinyl, vinylToStream } from './transforms';
const toString = require('stream-to-string');
const pumpify = require('pumpify');

export function GulpPlugin(vinylStreams: ((file: File) => any)[]) {
    return new FuseBoxGulpPlugin(vinylStreams);
}

export class FuseBoxGulpPlugin implements Plugin {

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
        const useCache = this.context.useCache && !this.isTypescriptHandled(file);
        if (useCache) {
            let cached = this.context.cache.getStaticCache(file);
            if (cached) {
                file.analysis.skip();
                file.analysis.dependencies = cached.dependencies;
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
                this.context.cache.writeStaticCache(file, null);
            }
        });
    }

    private isTypescriptHandled(file: File) {
        return /\.ts(x)?$/.test(file.absPath);
    }
}