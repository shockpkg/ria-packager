import forge from 'node-forge';

import {NAME, VERSION} from '../meta.ts';
import {IFetch} from '../types.ts';

/**
 * SecurityTimestamper object.
 */
export class SecurityTimestamper {
	/**
	 * The timestamp server URL.
	 */
	public url: string;

	/**
	 * The default headers for HTTP requests.
	 */
	public headers: {[header: string]: string} = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'User-Agent': `${NAME}/${VERSION}`
	};

	/**
	 * A fetch-like interface requiring only a sebset of features.
	 */
	public fetch: IFetch | null =
		typeof fetch === 'undefined' ? null : (fetch as IFetch);

	/**
	 * SecurityTimestamper constructor.
	 *
	 * @param url The timestamp server URL.
	 */
	constructor(url: string) {
		this.url = url;
	}

	/**
	 * Timestamp data digested with specified algorithm.
	 *
	 * @param digested The data to timestamp.
	 * @param digest Digest algorithm.
	 * @returns Timestamp data.
	 */
	public async timestamp(digested: Readonly<Uint8Array>, digest: string) {
		const encodedRequest = this._encodeRequest(digested, digest);
		const response = await this._sendRequest(encodedRequest);
		return this._decodeResponse(response);
	}

	/**
	 * Send message request and return response or error on failure.
	 *
	 * @param message Encoded message.
	 * @returns Encoded response.
	 */
	protected async _sendRequest(message: Readonly<Uint8Array>) {
		const {url, headers} = this;
		const fetch = this._ensureFetch();
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: message
		});
		if (response.status !== 200) {
			throw new Error(`Status code: ${response.status}: ${url}`);
		}
		return new Uint8Array(await response.arrayBuffer());
	}

	/**
	 * Encode request.
	 *
	 * @param digested Digested message.
	 * @param digest Digest algorithm.
	 * @returns Encoded request.
	 */
	protected _encodeRequest(digested: Readonly<Uint8Array>, digest: string) {
		digest = digest.toLowerCase();
		let iod = '';
		switch (digest) {
			case 'sha1': {
				iod = forge.pki.oids.sha1;
				break;
			}
			case 'sha256': {
				iod = forge.pki.oids.sha256;
				break;
			}
			default: {
				throw new Error(`Unsupported digest algorithm: ${digest}`);
			}
		}

		const certReq = true;

		const hashAlgoDef = forge.asn1.create(
			forge.asn1.Class.UNIVERSAL,
			forge.asn1.Type.SEQUENCE,
			true,
			[
				forge.asn1.create(
					forge.asn1.Class.UNIVERSAL,
					forge.asn1.Type.OID,
					false,
					forge.asn1.oidToDer(iod).getBytes()
				),
				forge.asn1.create(
					forge.asn1.Class.UNIVERSAL,
					forge.asn1.Type.NULL,
					false,
					''
				)
			]
		);

		const messageImprintDef = forge.asn1.create(
			forge.asn1.Class.UNIVERSAL,
			forge.asn1.Type.SEQUENCE,
			true,
			[
				hashAlgoDef,
				forge.asn1.create(
					forge.asn1.Class.UNIVERSAL,
					forge.asn1.Type.OCTETSTRING,
					false,
					// eslint-disable-next-line unicorn/prefer-code-point
					String.fromCharCode(...digested)
				)
			]
		);

		// Could be set to some bytes.
		// ie: reqPolicy = 'some bytes';
		const reqPolicy = null;
		const asn1ReqPolicy = reqPolicy
			? forge.asn1.create(
					forge.asn1.Class.UNIVERSAL,
					forge.asn1.Type.OID,
					false,
					reqPolicy
				)
			: null;

		// Always null.
		const nonceDER = null;

		// This could be a DER encodable, if extensions is set to be?
		// Just null for now.
		// const extensions = null;
		// const asn1Extn = extensions ? extensions : null;
		const asn1Extn = null;

		const tsaReqDef = forge.asn1.create(
			forge.asn1.Class.UNIVERSAL,
			forge.asn1.Type.SEQUENCE,
			true,
			[
				forge.asn1.create(
					forge.asn1.Class.UNIVERSAL,
					forge.asn1.Type.INTEGER,
					false,
					// eslint-disable-next-line unicorn/prefer-code-point
					String.fromCharCode(1)
				),
				messageImprintDef,
				asn1ReqPolicy,
				nonceDER,
				forge.asn1.create(
					forge.asn1.Class.UNIVERSAL,
					forge.asn1.Type.BOOLEAN,
					false,
					// eslint-disable-next-line unicorn/prefer-code-point
					String.fromCharCode(certReq ? 0xff : 0)
				),
				asn1Extn
			].filter(Boolean) as forge.asn1.Asn1[]
		);

		return forge.util.binary.raw.decode(
			forge.asn1.toDer(tsaReqDef).bytes()
		);
	}

	/**
	 * Decode response.
	 *
	 * @param response Encoded response.
	 * @returns Decoded response.
	 */
	protected _decodeResponse(response: Readonly<Uint8Array>) {
		const object = forge.asn1.fromDer(
			new forge.util.ByteStringBuffer(response as Uint8Array<ArrayBuffer>)
		);

		const validator = {
			name: 'root',
			tagClass: forge.asn1.Class.UNIVERSAL,
			type: forge.asn1.Type.SEQUENCE,
			constructed: true,
			value: [
				{
					name: 'root.statusInfo',
					tagClass: forge.asn1.Class.UNIVERSAL,
					type: forge.asn1.Type.SEQUENCE,
					constructed: true,
					value: [
						{
							name: 'root.statusInfo.pkiStatus',
							tagClass: forge.asn1.Class.UNIVERSAL,
							type: forge.asn1.Type.INTEGER,
							constructed: false,
							captureAsn1: 'root.statusInfo.pkiStatus',
							optional: true
						},
						{
							name: 'root.statusInfo.pkiFreeText',
							tagClass: forge.asn1.Class.UNIVERSAL,
							type: forge.asn1.Type.UTF8,
							constructed: false,
							captureAsn1: 'root.statusInfo.pkiFreeText',
							optional: true
						},
						{
							name: 'root.statusInfo.pkiFailureInfo',
							tagClass: forge.asn1.Class.UNIVERSAL,
							type: forge.asn1.Type.BITSTRING,
							constructed: false,
							captureAsn1: 'root.statusInfo.pkiFailureInfo',
							optional: true
						}
					]
				},
				{
					name: 'root.tst',
					tagClass: forge.asn1.Class.UNIVERSAL,
					type: forge.asn1.Type.SEQUENCE,
					constructed: true,
					captureAsn1: 'root.tst',
					optional: true
				}
			]
		};

		const capture: {[key: string]: unknown} = {};
		const errors: string[] = [];

		const success = (
			forge.asn1 as unknown as {
				validate: (
					a: unknown,
					b: unknown,
					c: unknown,
					d: unknown
				) => boolean;
			}
		).validate(object, validator, capture, errors);
		if (!success || errors.length) {
			const error = errors[0] || 'Unknown error';
			throw new Error(`Decode error: ${error}`);
		}

		const pkiStatus = capture['root.statusInfo.pkiStatus'] as {
			value: string;
		};
		if (!pkiStatus) {
			throw new Error('Missing PKI status');
		}

		if (pkiStatus.value.length !== 1) {
			throw new Error(
				`Unexpected PKI status length: ${pkiStatus.value.length}`
			);
		}

		// eslint-disable-next-line unicorn/prefer-code-point
		const pkiStatusCode = pkiStatus.value.charCodeAt(0);
		if (pkiStatusCode !== 0 && pkiStatusCode !== 1) {
			throw new Error(`Unexpected PKI status code: ${pkiStatusCode}`);
		}

		const tst = capture['root.tst'] as forge.asn1.Asn1;
		if (!tst) {
			throw new Error('Missing PKI TSTInfo');
		}

		return forge.util.binary.raw.decode(forge.asn1.toDer(tst).bytes());
	}

	/**
	 * Ensure fetch-like function is set.
	 *
	 * @returns The fetch-like function.
	 */
	protected _ensureFetch(): IFetch {
		const {fetch} = this;
		if (!fetch) {
			throw new Error('Default fetch not available');
		}
		return fetch;
	}
}
