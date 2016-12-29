import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { streamToVinyl, vinylToStream } from './transforms';
const toString = require('stream-to-string');
const pumpify = require('pumpify');

export class GulpPlugin implements Plugin {

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
        // TODO: Check and use cache this.context.useCache
        file.loadContents();
        const streams = this.vinylStreams.map(vinylStream => {
            return vinylStream(file);
        });
        const input = streamToVinyl(file.absPath);
        streams.unshift(input);
        streams.push(vinylToStream());
        const pipeline = pumpify.obj(...streams);
        input.write(file.contents);
        input.end();
        return toString(pipeline, (err, result) => {
            file.contents = result;
        });
    }
}