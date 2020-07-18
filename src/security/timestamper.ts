import forge from 'node-forge';
import request from 'request';

const {
	asn1,
	pki
} = forge;

export type SecurityTimestamperRequest = (
	obj: {
		url: string;
		method?: string;
		headers?: {[key: string]: string};
		body?: any;
		encoding?: string | null;
	},
	cb: (
		error: Error,
		response: {
			statusCode: number;
		},
		body: any
	) => void
) => any;

/**
 * SecurityTimestamper constructor.
 *
 * @param url The timestamp server URL.
 */
export class SecurityTimestamper extends Object {
	/**
	 * The timestamp server URL.
	 */
	public url: string;

	constructor(url: string) {
		super();

		this.url = url;
	}

	/**
	 * Timestamp data digested with specified algorithm.
	 *
	 * @param digested The data to timestamp.
	 * @param digest Digest algorithm.
	 * @returns Timestamp data.
	 */
	public async timestamp(digested: Readonly<Buffer>, digest: string) {
		const encodedRequest = this._encodeRequest(digested, digest);
		const response = await this._sendRequest(encodedRequest);
		return this._decodeResponse(response);
	}

	/**
	 * Create a request object.
	 *
	 * @returns Request object.
	 */
	protected _createRequest() {
		return request.defaults({}) as SecurityTimestamperRequest;
	}

	/**
	 * Send message request and return response or error on failure.
	 *
	 * @param message Encoded message.
	 * @returns Encoded response.
	 */
	protected async _sendRequest(message: Readonly<Buffer>) {
		const {url} = this;
		const req = this._createRequest();

		const [response, body] = await new Promise<[
			{
				statusCode: number;
			},
			Buffer
		]>((resolve, reject) => {
			req(
				{
					method: 'POST',
					url,
					headers: {
						'Content-Type': 'application/timestamp-query'
					},
					body: message,
					encoding: null
				},
				(error, response, body) => {
					if (error) {
						reject(error);
						return;
					}
					resolve([response, body]);
				}
			);
		});

		const {statusCode} = response;
		if (statusCode !== 200) {
			throw new Error(
				`Unexpected status code: ${statusCode}: ${body}`
			);
		}
		return body;
	}

	/**
	 * Encode request.
	 *
	 * @param digested Digested message.
	 * @param digest Digest algorithm.
	 * @returns Encoded request.
	 */
	protected _encodeRequest(digested: Readonly<Buffer>, digest: string) {
		digest = digest.toLowerCase();
		if (digest !== 'sha1') {
			throw new Error(`Unsupported digest algorithm: ${digest}`);
		}

		const hashedMessage = forge.util.decode64(digested.toString('base64'));

		const certReq = true;

		const hashAlgoDef = forge.asn1.create(
			asn1.Class.UNIVERSAL,
			asn1.Type.SEQUENCE,
			true,
			[
				asn1.create(
					asn1.Class.UNIVERSAL,
					asn1.Type.OID,
					false,
					asn1.oidToDer(pki.oids.sha1).getBytes()
				),
				asn1.create(
					asn1.Class.UNIVERSAL,
					asn1.Type.NULL,
					false,
					''
				)
			]
		);

		const messageImprintDef = asn1.create(
			asn1.Class.UNIVERSAL,
			asn1.Type.SEQUENCE,
			true,
			[
				hashAlgoDef,
				asn1.create(
					asn1.Class.UNIVERSAL,
					asn1.Type.OCTETSTRING,
					false,
					hashedMessage
				)
			]
		);

		// Could be set to some bytes.
		// ie: reqPolicy = new forge.util.DataBuffer(Buffer.from('test'));
		const reqPolicy = null;
		const asn1ReqPolicy = reqPolicy ?
			asn1.create(
				asn1.Class.UNIVERSAL,
				asn1.Type.OID,
				false,
				reqPolicy
			) :
			null;

		// Always null.
		const nonceDER = null;

		// This could be a DER encodable, if extensions is set to be?
		// Just null for now.
		// const extensions = null;
		// const asn1Extn = extensions ? extensions : null;
		const asn1Extn = null;

		const tsaReqDef = asn1.create(
			asn1.Class.UNIVERSAL,
			asn1.Type.SEQUENCE,
			true,
			[
				asn1.create(
					asn1.Class.UNIVERSAL,
					asn1.Type.INTEGER,
					false,
					String.fromCharCode(1)
				),
				messageImprintDef,
				asn1ReqPolicy,
				nonceDER,
				asn1.create(
					asn1.Class.UNIVERSAL,
					asn1.Type.BOOLEAN,
					false,
					String.fromCharCode(certReq ? 0xFF : 0)
				),
				asn1Extn
			].filter(Boolean) as forge.asn1.Asn1[]
		);

		return Buffer.from(asn1.toDer(tsaReqDef).toHex(), 'hex');
	}

	/**
	 * Decode response.
	 *
	 * @param response Encoded response.
	 * @returns Decoded response.
	 */
	protected _decodeResponse(response: Readonly<Buffer>) {
		const object = asn1.fromDer(
			forge.util.decode64(response.toString('base64'))
		);

		const validator = {
			name: 'root',
			tagClass: asn1.Class.UNIVERSAL,
			type: asn1.Type.SEQUENCE,
			constructed: true,
			value: [
				{
					name: 'root.statusInfo',
					tagClass: asn1.Class.UNIVERSAL,
					type: asn1.Type.SEQUENCE,
					constructed: true,
					value: [
						{
							name: 'root.statusInfo.pkiStatus',
							tagClass: asn1.Class.UNIVERSAL,
							type: asn1.Type.INTEGER,
							constructed: false,
							captureAsn1: 'root.statusInfo.pkiStatus',
							optional: true
						},
						{
							name: 'root.statusInfo.pkiFreeText',
							tagClass: asn1.Class.UNIVERSAL,
							type: asn1.Type.UTF8,
							constructed: false,
							captureAsn1: 'root.statusInfo.pkiFreeText',
							optional: true
						},
						{
							name: 'root.statusInfo.pkiFailureInfo',
							tagClass: asn1.Class.UNIVERSAL,
							type: asn1.Type.BITSTRING,
							constructed: false,
							captureAsn1: 'root.statusInfo.pkiFailureInfo',
							optional: true
						}
					]
				},
				{
					name: 'root.tst',
					tagClass: asn1.Class.UNIVERSAL,
					type: asn1.Type.SEQUENCE,
					constructed: true,
					captureAsn1: 'root.tst',
					optional: true
				}
			]
		};

		const capture: {[key: string]: any} = {};
		const errors: string[] = [];

		const success = (asn1 as any).validate(
			object,
			validator,
			capture,
			errors
		);
		if (!success || errors.length) {
			const error = errors[0] || 'Unknown error';
			throw new Error(`Decode error: ${error}`);
		}

		const pkiStatus = capture['root.statusInfo.pkiStatus'];
		if (!pkiStatus) {
			throw new Error('Missing PKI status');
		}

		if (pkiStatus.value.length !== 1) {
			throw new Error(
				`Unexpected PKI status length: ${pkiStatus.value.length}`
			);
		}

		const pkiStatusCode = pkiStatus.value.charCodeAt(0);
		if (pkiStatusCode !== 0 && pkiStatusCode !== 1) {
			throw new Error(`Unexpected PKI status code: ${pkiStatusCode}`);
		}

		const tst = capture['root.tst'];
		if (!tst) {
			throw new Error('Missing PKI TSTInfo');
		}

		return Buffer.from(asn1.toDer(tst).toHex(), 'hex');
	}
}
