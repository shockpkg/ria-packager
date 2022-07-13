import fs from 'fs';
import path from 'path';
import stream from 'stream';
import childProcess from 'child_process';
import util from 'util';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';
import del from 'del';
import {
	Manager
} from '@shockpkg/core';

const readFile = util.promisify(fs.readFile);
const pipeline = util.promisify(stream.pipeline);

async function exec(
	cmd: string,
	args: string[] = [],
	env: {[e: string]: string} = {}
) {
	const code = await new Promise<number | null>((resolve, reject) => {
		const p = childProcess.spawn(cmd, args, {
			stdio: 'inherit',
			shell: true,
			// eslint-disable-next-line no-process-env
			env: {...process.env, ...env}
		});
		p.once('close', resolve);
		p.once('error', reject);
	});
	if (code) {
		throw new Error(`Exit code: ${code}`);
	}
}

async function packageJSON() {
	return JSON.parse(await readFile('package.json', 'utf8'));
}

async function babelrc() {
	return {
		...JSON.parse(await readFile('.babelrc', 'utf8')),
		babelrc: false
	};
}

async function babelTarget(
	src: string[],
	srcOpts: any,
	dest: string,
	modules: string | boolean
) {
	// Change module.
	const babelOptions = await babelrc();
	for (const preset of babelOptions.presets) {
		if (preset[0] === '@babel/preset-env') {
			preset[1].modules = modules;
		}
	}
	if (!modules) {
		babelOptions.plugins.push([
			'esm-resolver', {
				source: {
					extensions: [
						[
							['.js', '.mjs', '.jsx', '.mjsx', '.ts', '.tsx'],
							'.mjs'
						]
					]
				}
			}
		]);
	}

	// Read the package JSON.
	const pkg = await packageJSON();

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter(['*/meta.ts'], {restore: true});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)]
	].map(([f, r]) => gulpReplace(f, r));

	await pipeline(
		gulp.src(src, srcOpts),
		filterMeta,
		...filterMetaReplaces,
		filterMeta.restore,
		gulpSourcemaps.init(),
		gulpBabel(babelOptions),
		gulpRename(path => {
			if (!modules && path.extname === '.js') {
				path.extname = '.mjs';
			}
		}),
		gulpSourcemaps.write('.', {
			includeContent: true,
			addComment: false,
			destPath: dest
		}),
		gulpInsert.transform((contents, file) => {
			// Manually append sourcemap comment.
			if (/\.m?js$/i.test(file.path)) {
				const base = path.basename(file.path);
				return `${contents}\n//# sourceMappingURL=${base}.map\n`;
			}
			return contents;
		}),
		gulp.dest(dest)
	);
}

// clean

gulp.task('clean:logs', async () => {
	await del([
		'npm-debug.log*',
		'yarn-debug.log*',
		'yarn-error.log*',
		'report.*.json'
	]);
});

gulp.task('clean:lib', async () => {
	await del([
		'lib'
	]);
});

gulp.task('clean:packages', async () => {
	await del([
		'spec/packages'
	]);
});

gulp.task('clean', gulp.parallel([
	'clean:logs',
	'clean:lib',
	'clean:packages'
]));

// lint

gulp.task('lint:es', async () => {
	await exec('eslint', ['.']);
});

gulp.task('lint', gulp.parallel([
	'lint:es'
]));

// build

gulp.task('build:lib:dts', async () => {
	await exec('tsc');
});

gulp.task('build:lib:cjs', async () => {
	await babelTarget(['src/**/*.ts'], {}, 'lib', 'commonjs');
});

gulp.task('build:lib:mjs', async () => {
	await babelTarget(['src/**/*.ts'], {}, 'lib', false);
});

gulp.task('build:lib', gulp.parallel([
	'build:lib:dts',
	'build:lib:cjs',
	'build:lib:mjs'
]));

gulp.task('build', gulp.parallel([
	'build:lib'
]));

// test

gulp.task('test:node', async () => {
	const installed = await (new Manager()).with(
		async manager => manager.installed()
	);
	await exec('jasmine', [], {
		RIA_PACKAGER_INSTALLED: installed.map(p => p.name).join(',')
	});
});

gulp.task('test', gulp.parallel([
	'test:node'
]));

// watch

gulp.task('watch', () => {
	gulp.watch([
		'src/**/*'
	], gulp.series([
		'all'
	]));
});

// all

gulp.task('all', gulp.series([
	'clean',
	'build',
	'test',
	'lint'
]));

// prepack

gulp.task('prepack', gulp.series([
	'clean',
	'build'
]));

// default

gulp.task('default', gulp.series([
	'all'
]));
