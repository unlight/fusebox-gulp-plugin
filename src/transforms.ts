import { Transform } from 'stream';
import Vinyl = require('vinyl');
import through = require('through2');

export function streamToVinyl(filepath: string) {
    return new Transform({
        objectMode: true,
        transform(chunk: string | Buffer, encoding: string, callback: Function) {
            let vinyl = new Vinyl({
                path: filepath,
                contents: (chunk instanceof Buffer) ? chunk : Buffer.from(chunk)
            });
            callback(null, vinyl);
        }
    });
}

export function vinylToStream() {
    return new Transform({
        objectMode: true,
        transform(chunk: any | Vinyl, encoding: string, callback: Function) {
            callback(null, chunk.contents.toString());
        }
    });
}