import {TranscodeEncoding} from 'buffer';

import fse from 'fs-extra';
import xmldom from 'xmldom';

import {Packager} from '../packager';

const childTags = (el: Readonly<Element>, name: String | null = null) => {
	const {childNodes} = el;
	const r: Element[] = [];
	// eslint-disable-next-line
	for (let i = 0; i < childNodes.length; i++) {
		const child = childNodes[i] as Element;
		const {tagName} = child;
		if (!tagName || (name && tagName !== name)) {
			continue;
		}
		r.push(child);
	}
	return r;
};

const tagPath = (el: Readonly<Element>, add: string | null = null) => {
	const r = add === null ? [el.tagName] : [add, el.tagName];
	for (let e = el.parentNode; e; e = e.parentNode) {
		const {tagName} = (e as Element);
		if (!tagName) {
			break;
		}
		r.push(tagName);
	}
	return r.reverse().join('.');
};

export interface IIcon {
	image16x16: string | null;
	image29x29: string | null;
	image32x32: string | null;
	image36x36: string | null;
	image48x48: string | null;
	image50x50: string | null;
	image57x57: string | null;
	image58x58: string | null;
	image72x72: string | null;
	image96x96: string | null;
	image100x100: string | null;
	image114x114: string | null;
	image128x128: string | null;
	image144x144: string | null;
	image512x512: string | null;
	image732x412: string | null;
	image1024x1024: string | null;
}

export interface IFileTypeInfo {
	name: string;
	contentType: string;
	description: string | null;
	icon: IIcon | null;
}

/**
 * PackagerBundle constructor.
 *
 * @param path Output path.
 */
export abstract class PackagerBundle extends Packager {
	/**
	 * Path to the SDK, an archive or directory.
	 */
	public sdkPath: string | null = null;

	/**
	 * Application info from the id tag.
	 */
	protected _applicationInfoId: string | null = null;

	/**
	 * Application info from the versionNumber tag.
	 */
	protected _applicationInfoVersionNumber: string | null = null;

	/**
	 * Application info from the filename tag.
	 */
	protected _applicationInfoFilename: string | null = null;

	/**
	 * Application info from the copyright tag.
	 */
	protected _applicationInfoCopyright: string | null = null;

	/**
	 * Application info from the icon tag.
	 */
	protected _applicationInfoIcon: Readonly<IIcon> | null = null;

	/**
	 * Application info from the fileTypes tag.
	 */
	protected _applicationInfoFileTypes: Map<string, IFileTypeInfo> | null = (
		null
	);

	/**
	 * Application info from the supportedLanguages tag.
	 */
	protected _applicationInfoSupportedLanguages: string | null = null;

	/**
	 * Application info from the initialWindow.requestedDisplayResolution tag.
	 */
	protected _applicationInfoRequestedDisplayResolution: string | null = null;

	/**
	 * Application info from the architecture tag.
	 */
	protected _applicationInfoArchitecture: string | null = null;

	constructor(path: string) {
		super(path);
	}

	/**
	 * Package mimetype.
	 *
	 * @returns Mimetype string.
	 */
	public get mimetype() {
		return 'application/vnd.adobe.air-application-installer-package+zip';
	}

	/**
	 * Package signed.
	 *
	 * @returns Boolean for if package is signed or not.
	 */
	public get signed() {
		return true;
	}

	/**
	 * Open the configured SDK.
	 *
	 * @returns Archive instance.
	 */
	protected async _openSdk() {
		const {sdkPath} = this;
		if (!sdkPath) {
			throw new Error('SDK path not set');
		}
		const archive = await this._openArchive(sdkPath);
		return archive;
	}

	/**
	 * Init application info from descriptor data.
	 *
	 * @param applicationData The application descriptor data.
	 */
	protected _applicationInfoInit(applicationData: Readonly<Buffer>) {
		const doc = (new xmldom.DOMParser()).parseFromString(
			applicationData.toString('utf8'),
			'text/xml'
		);
		const root = doc.documentElement;

		const childTag = (el: Readonly<Element>, name: string) => {
			const tags = childTags(el, name);
			if (tags.length > 2) {
				const path = tagPath(el, name);
				throw new Error(`Application info allows 1 ${path} tag`);
			}
			return tags.length ? tags[0] : null;
		};
		const childTagReq = (el: Readonly<Element>, name: string) => {
			const tag = childTag(el, name);
			if (!tag) {
				const path = tagPath(el, name);
				throw new Error(`Application info requires 1 ${path} tag`);
			}
			return tag;
		};
		const childTagValue = (el: Readonly<Element>, name: string) => {
			const tag = childTag(el, name);
			return tag ? tag.textContent || '' : null;
		};
		const childTagReqValue = (el: Readonly<Element>, name: string) => {
			const {textContent} = childTagReq(el, name);
			return textContent || '';
		};
		const childTagReqValued = (el: Readonly<Element>, name: string) => {
			const r = childTagReqValue(el, name);
			if (!r) {
				const path = tagPath(el, name);
				throw new Error(
					`Application info requires non-empty ${path} tag`
				);
			}
			return r;
		};
		const readIcons = (el: Readonly<Element>): IIcon => ({
			image16x16: childTagValue(el, 'image16x16'),
			image29x29: childTagValue(el, 'image29x29'),
			image32x32: childTagValue(el, 'image32x32'),
			image36x36: childTagValue(el, 'image36x36'),
			image48x48: childTagValue(el, 'image48x48'),
			image50x50: childTagValue(el, 'image50x50'),
			image57x57: childTagValue(el, 'image57x57'),
			image58x58: childTagValue(el, 'image58x58'),
			image72x72: childTagValue(el, 'image72x72'),
			image96x96: childTagValue(el, 'image96x96'),
			image100x100: childTagValue(el, 'image100x100'),
			image114x114: childTagValue(el, 'image114x114'),
			image128x128: childTagValue(el, 'image128x128'),
			image144x144: childTagValue(el, 'image144x144'),
			image512x512: childTagValue(el, 'image512x512'),
			image732x412: childTagValue(el, 'image732x412'),
			image1024x1024: childTagValue(el, 'image1024x1024')
		});

		// The application.id tag.
		this._applicationInfoId = childTagReqValued(root, 'id');

		// The application.versionNumber tag.
		this._applicationInfoVersionNumber =
			childTagReqValued(root, 'versionNumber');

		// The application.filename tag.
		this._applicationInfoFilename = childTagReqValued(root, 'filename');

		// The application.copyright tag.
		this._applicationInfoCopyright = childTagValue(root, 'copyright');

		const iconTag = childTag(root, 'icon');
		this._applicationInfoIcon = iconTag ? readIcons(iconTag) : null;

		// The application.fileTypes tag.
		const fileTypesTag = childTag(root, 'fileTypes');
		if (fileTypesTag) {
			const fileTypes = new Map<string, IFileTypeInfo>();
			for (const fileTypeTag of childTags(fileTypesTag, 'fileType')) {
				// The extension is the unique key.
				const extension = childTagReqValued(fileTypeTag, 'extension');
				if (fileTypes.has(extension)) {
					const path = tagPath(fileTypeTag, 'extension');
					throw new Error(`Duplicate ${path}: ${extension}`);
				}
				const name = childTagReqValued(fileTypeTag, 'name');
				const contentType =
					childTagReqValued(fileTypeTag, 'contentType');
				const description = childTagValue(fileTypeTag, 'description');

				const iconTag = childTag(fileTypeTag, 'icon');
				const icon = iconTag ? readIcons(iconTag) : null;

				fileTypes.set(extension, {
					name,
					contentType,
					description,
					icon
				});
			}
			this._applicationInfoFileTypes = fileTypes;
		}
		else {
			this._applicationInfoFileTypes = null;
		}

		// The application.supportedLanguages tag.
		this._applicationInfoSupportedLanguages =
			childTagValue(root, 'supportedLanguages');

		// The application.initialWindow.requestedDisplayResolution tag.
		const initialWindowTag = childTag(root, 'initialWindow');
		this._applicationInfoRequestedDisplayResolution = initialWindowTag ?
			childTagValue(initialWindowTag, 'requestedDisplayResolution') :
			null;

		// The application.architecture tag (can be anywhere, use first).
		const architectureTags = doc.getElementsByTagName('architecture');
		this._applicationInfoArchitecture = architectureTags.length ?
			architectureTags[0].textContent || null :
			null;
	}

	/**
	 * Get the application ID.
	 *
	 * @returns The ID.
	 */
	protected _getId() {
		const r = this._applicationInfoId;
		if (r === null) {
			throw new Error('Internal error');
		}
		return r;
	}

	/**
	 * Get the application version number.
	 *
	 * @returns The version number.
	 */
	protected _getVersionNumber() {
		const r = this._applicationInfoVersionNumber;
		if (r === null) {
			throw new Error('Internal error');
		}
		return r;
	}

	/**
	 * Get the application filename.
	 *
	 * @returns The filename.
	 */
	protected _getFilename() {
		const r = this._applicationInfoFilename;
		if (r === null) {
			throw new Error('Internal error');
		}
		return r;
	}

	/**
	 * Get the application copyright if present.
	 *
	 * @returns Copyright string or null.
	 */
	protected _getCopyright() {
		return this._applicationInfoCopyright;
	}

	/**
	 * Get the application icon.
	 *
	 * @returns Application icon.
	 */
	protected _getIcon() {
		return this._applicationInfoIcon;
	}

	/**
	 * The the application file types if present.
	 *
	 * @returns File types map or null.
	 */
	protected _getFileTypes() {
		return this._applicationInfoFileTypes;
	}

	/**
	 * Clear application info from descriptor data.
	 */
	protected _applicationInfoClear() {
		this._applicationInfoId = null;
		this._applicationInfoVersionNumber = null;
		this._applicationInfoFilename = null;
		this._applicationInfoCopyright = null;
		this._applicationInfoIcon = null;
		this._applicationInfoFileTypes = null;
		this._applicationInfoSupportedLanguages = null;
		this._applicationInfoRequestedDisplayResolution = null;
		this._applicationInfoArchitecture = null;
	}

	/**
	 * Get data from buffer or file.
	 *
	 * @param data Data buffer.
	 * @param file File path.
	 * @returns Data buffer.
	 */
	protected async _dataFromBufferOrFile(
		data: Readonly<Buffer> | null,
		file: string | null
	) {
		if (data) {
			return data;
		}
		if (file) {
			return fse.readFile(file);
		}
		return null;
	}

	/**
	 * Get data from value or file.
	 *
	 * @param data Data value.
	 * @param file File path.
	 * @param newline Newline string.
	 * @param encoding String encoding.
	 * @returns Data buffer.
	 */
	protected async _dataFromValueOrFile(
		data: Readonly<string[]> | string | Readonly<Buffer> | null,
		file: string | null,
		newline: string | null,
		encoding: TranscodeEncoding | null
	) {
		let str: string | null = null;
		if (typeof data === 'string') {
			str = data;
		}
		else if (Array.isArray(data as string[])) {
			if (newline === null) {
				throw new Error('New line delimiter required');
			}
			str = (data as string[]).join(newline);
		}
		else {
			return this._dataFromBufferOrFile(data as Buffer, file);
		}
		if (!encoding) {
			throw new Error('String data encoding required');
		}
		return Buffer.from(str, encoding);
	}
}
