import {base64Encode} from '@shockpkg/plist-dom';

import {SecurityCertificate} from './security/certificate.ts';
import {SecurityKeyPrivate} from './security/key/private.ts';
import {SecurityTimestamper} from './security/timestamper.ts';
import {HasherSha1} from './hasher/sha1.ts';
import {HasherSha256} from './hasher/sha256.ts';

const defaultSignDigest = 'sha256' as const;
const defaultTimestampDigest = 'sha256' as const;

const templates: [string, string][] = [
	['certificate', '<X509Certificate>{0}</X509Certificate>'],
	['crl', '<X509CRL>{0}</X509CRL>'],
	[
		'fileReference',
		[
			'<Reference URI="{0}">',
			'<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>',
			'<DigestValue>{1}</DigestValue>',
			'</Reference>'
		].join('')
	],
	[
		'packageManifest',
		'<Manifest xmlns="http://www.w3.org/2000/09/xmldsig#" Id="PackageContents">{0}</Manifest>'
	],
	[
		'PackageSignature',
		[
			'<signatures>',
			'  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="PackageSignature">',
			'    <SignedInfo>',
			'      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
			'      <SignatureMethod Algorithm="{0}"/>',
			'      <Reference URI="#PackageContents">',
			'        <Transforms>',
			'          <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
			'        </Transforms>',
			'        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>',
			'        <DigestValue>{1}</DigestValue>',
			'      </Reference>',
			'    </SignedInfo>',
			// eslint-disable-next-line max-len
			'    <SignatureValue Id="PackageSignatureValue">{2}</SignatureValue>',
			'    <KeyInfo>',
			'      <X509Data>',
			'        {3}',
			'      </X509Data>',
			'    </KeyInfo>',
			'    <Object>',
			'      <Manifest Id="PackageContents">',
			'        {4}',
			'      </Manifest>',
			'    </Object>',
			'    {5}',
			'  </Signature>',
			'</signatures>',
			''
		].join('\n')
	],
	[
		'SignedInfo',
		[
			'<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">',
			'<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>',
			'<SignatureMethod Algorithm="{0}"></SignatureMethod>',
			'<Reference URI="#PackageContents">',
			'<Transforms>',
			'<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>',
			'</Transforms>',
			'<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>',
			'<DigestValue>{1}</DigestValue>',
			'</Reference>',
			'</SignedInfo>'
		].join('')
	],
	[
		'timestamp',
		[
			'<Object xmlns:xades="http://uri.etsi.org/01903/v1.1.1#" > ',
			'  <xades:QualifyingProperties>',
			'    <xades:UnsignedProperties > ',
			'      <xades:UnsignedSignatureProperties>',
			'        <xades:SignatureTimeStamp>',
			'     \t  <xades:HashDataInfo uri="{0}">',
			'     \t    <Transforms>',
			'          \t  <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
			'            </Transforms>',
			'            <xades:EncapsulatedTimeStamp>',
			'              {1}',
			'            </xades:EncapsulatedTimeStamp>     \t',
			'     \t  </xades:HashDataInfo>     \t',
			'        </xades:SignatureTimeStamp>',
			'      </xades:UnsignedSignatureProperties> ',
			'    </xades:UnsignedProperties>',
			'  </xades:QualifyingProperties>',
			'</Object>'
		].join('\n')
	],
	[
		'SignatureValue',
		'<SignatureValue xmlns="http://www.w3.org/2000/09/xmldsig#" Id="PackageSignatureValue">{0}</SignatureValue>'
	]
];

/**
 * Signature object.
 */
export class Signature {
	/**
	 * Certificate.
	 */
	public certificate: SecurityCertificate | null = null;

	/**
	 * Private key.
	 */
	public privateKey: SecurityKeyPrivate | null = null;

	/**
	 * Signature digest algorithm.
	 */
	public signDigest: 'sha1' | 'sha256' = defaultSignDigest;

	/**
	 * Timestamp digest algorithm.
	 */
	public timestampDigest: 'sha1' | 'sha256' = defaultTimestampDigest;

	/**
	 * Timestamp URL.
	 */
	public timestampUrl: string | null = null;

	/**
	 * Timestamp URI for SignatureValue.
	 */
	public timestampUriSignature = false;

	/**
	 * Timestamp URI for #PackageSignatureValue.
	 */
	public timestampUriPackage = true;

	/**
	 * Template strings for signatures.
	 */
	protected _templates = new Map(templates);

	/**
	 * File references.
	 */
	protected _packageManifest: string[] = [];

	/**
	 * Manifest digest.
	 */
	protected _manifestDigest: Uint8Array | null = null;

	/**
	 * Signed data.
	 */
	protected _signedInfo: string | null = null;

	/**
	 * Signature digest.
	 */
	protected _signature: Uint8Array | null = null;

	/**
	 * Key info.
	 */
	protected _keyInfo: string | null = null;

	/**
	 * Timestamp info.
	 */
	protected _timestamp: Uint8Array | null = null;

	/**
	 * Signature constructor.
	 */
	constructor() {}

	/**
	 * Reset options to defaults.
	 */
	public defaults() {
		this.certificate = null;
		this.privateKey = null;
		this.signDigest = defaultSignDigest;
		this.timestampDigest = defaultTimestampDigest;
		this.timestampUrl = null;
		this.timestampUriSignature = false;
		this.timestampUriPackage = true;
	}

	/**
	 * Reset the internal state.
	 */
	public reset() {
		this._packageManifest = [];
		this._manifestDigest = null;
		this._signedInfo = null;
		this._signature = null;
		this._keyInfo = null;
		this._timestamp = null;
	}

	/**
	 * Add file to signature.
	 *
	 * @param uri File URI.
	 * @param data File data.
	 */
	public addFile(uri: string, data: Readonly<Uint8Array>) {
		if (this._signedInfo || this._manifestDigest) {
			throw new Error('Cannot call after: digest');
		}

		const digestB64 = this._base64Encode(this._hashSha256(data));

		// Not perfect, but matches official packager.
		const uriEncoded = uri.replace(/&/g, '&amp;');

		this._packageManifest.push(
			this._templated('fileReference', [uriEncoded, digestB64])
		);
	}

	/**
	 * Digest contents.
	 */
	public digest() {
		if (this._signedInfo || this._manifestDigest) {
			throw new Error('Already called');
		}

		const manifest = this._templated('packageManifest', [
			this._packageManifest.join('')
		]);
		const signatureAlgorithm =
			this.signDigest === 'sha256'
				? 'http://www.w3.org/TR/xmldsig-core#rsa-sha256'
				: 'http://www.w3.org/TR/xmldsig-core#rsa-sha1';
		const digest = this._hashSha256(new TextEncoder().encode(manifest));
		const signed = this._templated('SignedInfo', [
			signatureAlgorithm,
			this._base64Encode(digest)
		]);

		this._manifestDigest = digest;
		this._signedInfo = signed;
	}

	/**
	 * Sign signature.
	 */
	public sign() {
		if (this._signature || this._keyInfo !== null) {
			throw new Error('Already called');
		}

		const signedInfo = this._signedInfo;
		if (!signedInfo) {
			throw new Error('Must call after: digest');
		}

		const {privateKey: keyPrivate} = this;
		if (!keyPrivate) {
			throw new Error('Private key not set');
		}

		const {signDigest} = this;
		const keyInfo = this._buildKeyInfo();
		const signature = keyPrivate.sign(
			new TextEncoder().encode(signedInfo),
			signDigest
		);

		this._signature = signature;
		this._keyInfo = keyInfo;
	}

	/**
	 * Add timestamp to signature.
	 */
	public async timestamp() {
		if (this._timestamp) {
			throw new Error('Already called');
		}

		const signature = this._signature;
		if (!signature) {
			throw new Error('Must call after: sign');
		}

		const {timestampUrl} = this;
		if (!timestampUrl) {
			throw new Error('Timestamp URL not set');
		}

		const message = this._templated('SignatureValue', [
			this._base64Encode(signature)
		]);
		const messageData = new TextEncoder().encode(message);

		const {timestampDigest} = this;
		const timestamper = this._createSecurityTimestamper(timestampUrl);
		const timestamp = await timestamper.timestamp(
			timestampDigest === 'sha256'
				? this._hashSha256(messageData)
				: this._hashSha1(messageData),
			timestampDigest
		);

		this._timestamp = timestamp;
	}

	/**
	 * Encode signature.
	 *
	 * @returns Encoded signature.
	 */
	public encode() {
		const signature = this._signature;
		if (!signature) {
			throw new Error('Must call after: sign');
		}

		const manifestDigest = this._manifestDigest;
		const keyInfo = this._keyInfo;
		if (!manifestDigest || keyInfo === null) {
			throw new Error('Internal error');
		}

		const timestamp = this._timestamp ? this._createTimestampXml() : '';
		const signatureAlgorithm =
			this.signDigest === 'sha256'
				? 'http://www.w3.org/TR/xmldsig-core#rsa-sha256'
				: 'http://www.w3.org/TR/xmldsig-core#rsa-sha1';

		return new TextEncoder().encode(
			this._templated('PackageSignature', [
				signatureAlgorithm,
				this._base64Encode(manifestDigest),
				this._base64Encode(signature),
				keyInfo,
				this._packageManifest.join(''),
				timestamp
			])
		);
	}

	/**
	 * Get list of timestamp data references for URI attribute.
	 *
	 * @returns List of references.
	 */
	protected _getTimestampDataReferenceUris() {
		const r: string[] = [];
		if (this.timestampUriSignature) {
			r.push('SignatureValue');
		}
		if (this.timestampUriPackage) {
			r.push('#PackageSignatureValue');
		}
		return r;
	}

	/**
	 * Create string from a template string.
	 *
	 * @param name Template name.
	 * @param values Indexed values.
	 * @returns Complete string.
	 */
	protected _templated(name: string, values: readonly string[]) {
		const template = this._templates.get(name);
		if (!template) {
			throw new Error(`Unknown template name: ${name}`);
		}
		return template.replace(/{(\d+)}/g, (str, index) => {
			const i = +index;
			if (i >= values.length) {
				throw new Error(`Index out of range: ${i} > ${values.length}`);
			}
			return values[i];
		});
	}

	/**
	 * Create timestamper.
	 *
	 * @param url Server URL.
	 * @returns Timestamper instance.
	 */
	protected _createSecurityTimestamper(url: string) {
		return new SecurityTimestamper(url);
	}

	/**
	 * Create SHA1 hasher instance.
	 *
	 * @returns Hasher instance.
	 */
	protected _createHasherSha1() {
		return new HasherSha1();
	}

	/**
	 * Create SHA256 hasher instance.
	 *
	 * @returns Hasher instance.
	 */
	protected _createHasherSha256() {
		return new HasherSha256();
	}

	/**
	 * Hash data using SHA1.
	 *
	 * @param data Data to be hashed.
	 * @returns Hash digest.
	 */
	protected _hashSha1(data: Readonly<Uint8Array>) {
		const hasher = this._createHasherSha1();
		hasher.update(data);
		return hasher.digest();
	}

	/**
	 * Hash data using SHA256.
	 *
	 * @param data Data to be hashed.
	 * @returns Hash digest.
	 */
	protected _hashSha256(data: Readonly<Uint8Array>) {
		const hasher = this._createHasherSha256();
		hasher.update(data);
		return hasher.digest();
	}

	/**
	 * Base64 encode with some defaults to match official pacakger.
	 *
	 * @param data Data to be encoded.
	 * @param chunk Chunk size.
	 * @param delimit Chunk delimiter.
	 * @returns Encoded data.
	 */
	protected _base64Encode(
		data: Readonly<Uint8Array>,
		chunk = 76,
		delimit = '\n'
	) {
		const chunks = [];
		for (let b64 = base64Encode(data); b64; b64 = b64.slice(chunk)) {
			chunks.push(b64.slice(0, chunk));
		}
		return chunks.join(delimit);
	}

	/**
	 * Create the timestamp XML.
	 *
	 * @returns Timestamp XML.
	 */
	protected _createTimestampXml() {
		const timestamp = this._timestamp;
		if (!timestamp) {
			throw new Error('Internal error');
		}

		const timestampBase64 = this._base64Encode(timestamp);
		const result: string[] = [];
		for (const uri of this._getTimestampDataReferenceUris()) {
			result.push(this._templated('timestamp', [uri, timestampBase64]));
		}
		return result.join('\n');
	}

	/**
	 * Build the key info.
	 *
	 * @returns Key info.
	 */
	protected _buildKeyInfo() {
		const {certchain, crlValidationCerts, crls} =
			this._buildAndVerifyCertChain();

		const out = [];

		for (const data of certchain) {
			out.push(
				this._templated('certificate', [this._base64Encode(data)])
			);
		}

		if (crls.length) {
			for (const data of crlValidationCerts) {
				out.push(
					this._templated('certificate', [this._base64Encode(data)])
				);
			}
		}

		for (const data of crls) {
			out.push(this._templated('crl', [this._base64Encode(data)]));
		}

		return out.join('');
	}

	/**
	 * Build the certchain data.
	 *
	 * @returns Certchain data.
	 */
	protected _buildAndVerifyCertChain() {
		const {certificate} = this;
		if (!certificate) {
			throw new Error('Certificate not set');
		}

		// Not exactly complete, but enough for self-signed anyway.
		const certchain: Uint8Array[] = [];
		const crlValidationCerts: Uint8Array[] = [];
		const crls: Uint8Array[] = [];

		// Add the certificate data.
		certchain.push(certificate.encodeCertchain());

		return {
			certchain,
			crlValidationCerts,
			crls
		};
	}
}
