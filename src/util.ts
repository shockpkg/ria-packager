// @ts-expect-error: No types.
import {quoteForCmd, quoteForSh} from 'puka';
import {
	IImageData,
	decodePngToRgba,
	encodeRgbaToPng
} from '@shockpkg/icon-encoder';

/**
 * Trim dot flash from head of path.
 *
 * @param path Path string.
 * @returns Trimmed path.
 */
export function trimDotSlash(path: string) {
	return path.replace(/^(\.\/)+/, '');
}

/**
 * Find path relative from base, if base matches.
 *
 * @param path Path to match against.
 * @param start Search start.
 * @param nocase Match case-insensitive.
 * @returns Returns path, or null.
 */
export function pathRelativeBase(path: string, start: string, nocase = false) {
	const p = trimDotSlash(nocase ? path.toLowerCase() : path);
	const s = trimDotSlash(nocase ? start.toLowerCase() : start);
	if (p === s) {
		return '';
	}
	if (p.startsWith(`${s}/`)) {
		return path.substring(s.length + 1);
	}
	return null;
}

/**
 * Same as pathRelativeBase, but retuns true on a match, else false.
 *
 * @param path Path to match against.
 * @param start Search start.
 * @param nocase Match case-insensitive.
 * @returns Returns true on match, else false.
 */
export function pathRelativeBaseMatch(
	path: string,
	start: string,
	nocase = false
) {
	return pathRelativeBase(path, start, nocase) !== null;
}

/**
 * Align integer.
 *
 * @param i Integer value.
 * @param align Alignment amount.
 * @returns Aligned integer.
 */
export function align(i: number, align: number) {
	const o = i % align;
	return o ? align - o + i : i;
}

/**
 * Quote string for SH.
 *
 * @param str String to be quoted.
 * @returns Quoted string.
 */
export function quoteSh(str: string) {
	return (quoteForSh as (str: string) => string)(str);
}

/**
 * Quote string for CMD.
 *
 * @param str String to be quoted.
 * @returns Quoted string.
 */
export function quoteCmd(str: string) {
	return (quoteForCmd as (str: string) => string)(str);
}

/**
 * Resize RGBA image data down by exactly half.
 * Input dimensions must be a power of 2.
 *
 * @param rgba Image data.
 * @returns Image data.
 */
function resizeRgbaHalf(rgba: IImageData) {
	const {width: ww, height: hh, data: dd} = rgba;
	const w = ww / 2;
	const h = hh / 2;
	const d = new Uint8Array(w * h * 4);
	const r: IImageData = {
		width: w,
		height: h,
		data: d
	};
	const w4 = w * 4;
	const ww4 = ww * 4;
	for (let y = 0, yy = 0; y < h; y++, yy += 2) {
		const yi = y * w4;
		const yyi = yy * ww4;
		const yyj = (yy + 1) * ww4;
		for (let x = 0, xx = 0; x < w; x++, xx += 2) {
			const xi = x * 4;
			const xxi = xx * 4;
			const xxj = (xx + 1) * 4;
			let p0 = yyi + xxi;
			let p1 = yyi + xxj;
			let p2 = yyj + xxi;
			let p3 = yyj + xxj;
			const r0 = dd[p0++];
			const r1 = dd[p1++];
			const r2 = dd[p2++];
			const r3 = dd[p3++];
			const g0 = dd[p0++];
			const g1 = dd[p1++];
			const g2 = dd[p2++];
			const g3 = dd[p3++];
			const b0 = dd[p0++];
			const b1 = dd[p1++];
			const b2 = dd[p2++];
			const b3 = dd[p3++];
			const a0 = dd[p0];
			const a1 = dd[p1];
			const a2 = dd[p2];
			const a3 = dd[p3];
			const a4 = a0 + a1 + a2 + a3;
			let a04 = 0;
			let a14 = 0;
			let a24 = 0;
			let a34 = 0;
			if (a4) {
				a04 = a0 / a4;
				a14 = a1 / a4;
				a24 = a2 / a4;
				a34 = a3 / a4;
			}
			let p = yi + xi;
			d[p++] = Math.round(r0 * a04 + r1 * a14 + r2 * a24 + r3 * a34);
			d[p++] = Math.round(g0 * a04 + g1 * a14 + g2 * a24 + g3 * a34);
			d[p++] = Math.round(b0 * a04 + b1 * a14 + b2 * a24 + b3 * a34);
			d[p] = Math.round(a4 / 4);
		}
	}
	return r;
}

/**
 * Resize RGBA image data down by exactly half.
 * Input dimensions must be a power of 2, else error is thrown.
 * If resizing multiple steps, each step dimensions must be a power of 2.
 *
 * @param png PNG data.
 * @param x Number of times to resize down by half.
 * @returns PNG data.
 */
export async function pngHalfSize(png: Readonly<Uint8Array>, x = 1) {
	let rgba = await decodePngToRgba(png);
	if ((x = Math.round(x)) > 0) {
		const p = 2 ** x;
		const {width, height} = rgba;
		if (width % 1 || height % 1) {
			throw new Error(
				`Image dimensions not a power of ${p}: ${width}x${height}`
			);
		}
		for (let i = 0; i < x; i++) {
			rgba = resizeRgbaHalf(rgba);
		}
	}
	return encodeRgbaToPng(rgba);
}
