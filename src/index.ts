import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { streamToVinyl, vinylToStream } from './transforms';
import { Transform } from 'stream';
const toString = require('stream-to-string');
const pumpify = require('pumpify');

export function GulpPlugin(streamFactories: ((file: File) => Transform)[]) {
    return new FuseBoxGulpPlugin(streamFactories);
}

export class FuseBoxGulpPlugin implements Plugin {

    test: any = { test: () => true };

    constructor(
        private streamFactories: ((file: File) => Transform)[]
    ) {
    }

    transform(file: File) {
        if (file.collection.name !== 'default') {
            return;
        }
        file.loadContents();
        const input = streamToVinyl(file.absPath);
        const streams = [input];
        this.streamFactories.forEach(streamFactory => {
            streams.push(streamFactory(file));
        });
        streams.push(vinylToStream());
        const pipeline = pumpify.obj(streams);
        input.write(file.contents);
        input.end();
        return toString(pipeline, (err, result) => {
            file.contents = result;
        });
    }
}