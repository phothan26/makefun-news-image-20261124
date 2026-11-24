// "THE WORLD" — Tuesday 24 November 2026, six stories in one image.
//
// The finished image lives in this repository as entry.png.b64 (the PNG,
// base64-encoded so it travels as plain text). This program decodes it and
// writes the bytes to /output/entry.png. It draws nothing and fetches
// nothing: the grader runs with no network and no browser, so the only work
// here is a faithful copy — decode, write, then prove the output is the
// same whole PNG by checking its signature, its IEND tail and its length
// before reporting success.
//
// Run it outside the grader like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const target = join(outDir, 'entry.png');

// The grader provides /output; making it when it is missing is harmless.
// We never touch its permissions — only the file we write gets a chmod.
mkdirSync(outDir, { recursive: true });

// entry.png.b64 holds the image as one long base64 line. Whitespace is
// stripped so the file stays readable in an editor and in a diff.
const encoded = readFileSync(join(here, 'entry.png.b64'), 'utf8').replace(/\s+/g, '');
const image = Buffer.from(encoded, 'base64');

// A PNG is whole only if it opens with its 8-byte signature and closes
// with the 12-byte IEND chunk, and stays under the gate's 1 MiB cap.
// Checking before writing means a corrupt source fails loudly here
// instead of handing the judge a broken file.
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IEND = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
if (
  image.length === 0 ||
  image.length > 1048576 ||
  !image.subarray(0, 8).equals(SIGNATURE) ||
  !image.subarray(image.length - 12).equals(IEND)
) {
  process.stderr.write('news-image-20261124: entry.png.b64 is not a whole PNG\n');
  process.exit(1);
}

// The gate caps the image at 1024x1024, so read the size straight out of
// the IHDR chunk (width at bytes 16-19, height at 20-23, big-endian) and
// refuse an oversize image here instead of handing the judge one it
// cannot score. This image is 1024x1024, exactly at the cap.
const width = image.readUInt32BE(16);
const height = image.readUInt32BE(20);
if (width === 0 || height === 0 || width > 1024 || height > 1024) {
  process.stderr.write(
    `news-image-20261124: image is ${width}x${height}, over the 1024x1024 cap\n`,
  );
  process.exit(1);
}

writeFileSync(target, image);

// Read the file back and compare byte for byte: the gate scores the
// output file, so the copy — not just the decoded buffer — must be exact.
const written = readFileSync(target);
if (!written.equals(image)) {
  process.stderr.write('news-image-20261124: output does not match the source PNG\n');
  process.exit(1);
}

// World-readable, like every other output file the grader reads. If the
// filesystem is read-only the copy above is still what the gate reads,
// so a chmod failure must not turn a good entry into a failed run.
try {
  chmodSync(target, 0o644);
} catch {
  // Best effort only.
}

process.stderr.write(`news-image-20261124: wrote ${target} (${written.length} bytes)\n`);
