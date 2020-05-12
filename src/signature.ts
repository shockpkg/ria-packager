import {SecurityCertificate} from './security/certificate';
import {SecurityKeyPrivate} from './security/key/private';
import {SecurityTimestamper} from './security/timestamper';
import {HasherSha1} from './hasher/sha1';
import {HasherSha256} from './hasher/sha256';

const templates: [string, string][] = [
	[
		'certificate',
		'' +
'<X509Certificate>{0}</X509Certificate>'
	],
	[
		'crl',
		'' +
'<X509CRL>{0}</X509CRL>'
	],
	[
		'fileReference',
		'' +
'<Reference URI="{0}">' +
	'<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>' +
	'<DigestValue>{1}</DigestValue>' +
'</Reference>'
	],
	[
		'packageManifest',
		'' +
'<Manifest xmlns="http://www.w3.org/2000/09/xmldsig#" Id="PackageContents">{0}</Manifest>'
	],
	[
		'PackageSignature',
		'' +
'<signatures>\n' +
'  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="PackageSignature">\n' +
'    <SignedInfo>\n' +
'      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>\n' +
'      <SignatureMethod Algorithm="http://www.w3.org/TR/xmldsig-core#rsa-sha1"/>\n' +
'      <Reference URI="#PackageContents">\n' +
'        <Transforms>\n' +
'          <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>\n' +
'        </Transforms>\n' +
'        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>\n' +
'        <DigestValue>{0}</DigestValue>\n' +
'      </Reference>\n' +
'    </SignedInfo>\n' +
'    <SignatureValue Id="PackageSignatureValue">{1}</SignatureValue>\n' +
'    <KeyInfo>\n' +
'      <X509Data>\n' +
'        {2}\n' +
'      </X509Data>\n' +
'    </KeyInfo>\n' +
'    <Object>\n' +
'      <Manifest Id="PackageContents">\n' +
'        {3}\n' +
'      </Manifest>\n' +
'    </Object>\n' +
'    {4}\n' +
'  </Signature>\n' +
'</signatures>\n'
	],
	[
		'SignedInfo',
		'' +
'<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">' +
	'<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>' +
	'<SignatureMethod Algorithm="http://www.w3.org/TR/xmldsig-core#rsa-sha1"></SignatureMethod>' +
	'<Reference URI="#PackageContents">' +
		'<Transforms>' +
			'<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>' +
		'</Transforms>' +
		'<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>' +
		'<DigestValue>{0}</DigestValue>' +
	'</Reference>' +
'</SignedInfo>'
	],
	[
		'timestamp',
		'' +
'<Object xmlns:xades="http://uri.etsi.org/01903/v1.1.1#" > \n' +
'  <xades:QualifyingProperties>\n' +
'    <xades:UnsignedProperties > \n' +
'      <xades:UnsignedSignatureProperties>\n' +
'        <xades:SignatureTimeStamp>\n' +
'     \t  <xades:HashDataInfo uri="{0}">\n' +
'     \t    <Transforms>\n' +
'          \t  <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>\n' +
'            </Transforms>\n' +
'            <xades:EncapsulatedTimeStamp>\n' +
'              {1}\n' +
'            </xades:EncapsulatedTimeStamp>     \t\n' +
'     \t  </xades:HashDataInfo>     \t\n' +
'        </xades:SignatureTimeStamp>\n' +
'      </xades:UnsignedSignatureProperties> \n' +
'    </xades:UnsignedProperties>\n' +
'  </xades:QualifyingProperties>\n' +
'</Object>'
	],
	[
		'SignatureValue',
		'' +
'<SignatureValue xmlns="http://www.w3.org/2000/09/xmldsig#" Id="PackageSignatureValue">{0}</SignatureValue>'
	]
];

/**
 * Signature constructor.
 */
export class Signature extends Object {
	/**
	 * Certificate.
	 */
	public certificate: SecurityCertificate | null = null;

	/**
	 * Private key.
	 */
	public keyPrivate: SecurityKeyPrivate | null = null;

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
	protected _manifestDiest: Buffer | null = null;

	/**
	 * Signed data.
	 */
	protected _signedInfo: string | null = null;

	/**
	 * Signature digest.
	 */
	protected _signature: Buffer | null = null;

	/**
	 * Key info.
	 */
	protected _keyInfo: string | null = null;

	/**
	 * Timestamp info.
	 */
	protected _timestamp: Buffer | null = null;

	constructor() {
		super();
	}

	/**
	 * Reset options to defaults.
	 */
	public defaults() {
		this.certificate = null;
		this.keyPrivate = null;
		this.timestampUrl = null;
		this.timestampUriSignature = false;
		this.timestampUriPackage = true;
	}

	/**
	 * Reset the internal state.
	 */
	public reset() {
		this._packageManifest = [];
		this._manifestDiest = null;
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
	public addFile(uri: string, data: Readonly<Buffer>) {
		if (this._signedInfo || this._manifestDiest) {
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
		if (this._signedInfo || this._manifestDiest) {
			throw new Error('Already called');
		}

		const manifest = this._templated('packageManifest', [
			this._packageManifest.join('')
		]);
		const digest = this._hashSha256(Buffer.from(manifest, 'utf8'));
		const signed = this._templated('SignedInfo', [
			this._base64Encode(digest)
		]);

		this._manifestDiest = digest;
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

		const {keyPrivate} = this;
		if (!keyPrivate) {
			throw new Error('Private key not set');
		}

		const keyInfo = this._buildKeyInfo();
		const signature = keyPrivate.sign(
			Buffer.from(signedInfo, 'utf8'),
			'sha1'
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

		const timestamper = this._createSecurityTimestamper(timestampUrl);
		const timestamp = await timestamper.timestamp(
			this._hashSha1(Buffer.from(message, 'utf8')),
			'sha1'
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

		const manifestDiest = this._manifestDiest;
		const keyInfo = this._keyInfo;
		if (!manifestDiest || keyInfo === null) {
			throw new Error('Internal error');
		}

		const timestamp = this._timestamp ? this._createTimestampXml() : '';

		return Buffer.from(this._templated('PackageSignature', [
			this._base64Encode(manifestDiest),
			this._base64Encode(signature),
			keyInfo,
			this._packageManifest.join(''),
			timestamp
		]), 'utf8');
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
	protected _templated(name: string, values: Readonly<string[]>) {
		const template = this._templates.get(name);
		if (!template) {
			throw new Error(`Unknown template name: ${name}`);
		}
		return template.replace(/\{(\d+)\}/g, (str, index) => {
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
	protected _hashSha1(data: Readonly<Buffer>) {
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
	protected _hashSha256(data: Readonly<Buffer>) {
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
		data: Readonly<Buffer>,
		chunk = 76,
		delimit = '\n'
	) {
		let b64 = data.toString('base64');
		const chunks = [];
		while (b64.length > chunk) {
			chunks.push(b64.substr(0, chunk));
			b64 = b64.substr(chunk);
		}
		if (b64.length) {
			chunks.push(b64);
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
			result.push(this._templated('timestamp', [
				uri,
				timestampBase64
			]));
		}
		return result.join('\n');
	}

	/**
	 * Build the key info.
	 *
	 * @returns Key info.
	 */
	protected _buildKeyInfo() {
		const {
			certchain,
			crlValidationCerts,
			crls
		} = this._buildAndVerifyCertChain();

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
			out.push(
				this._templated('crl', [this._base64Encode(data)])
			);
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
		const certchain: Buffer[] = [];
		const crlValidationCerts: Buffer[] = [];
		const crls: Buffer[] = [];

		// Add the certificate data.
		certchain.push(certificate.encodeCertchain());

		return {
			certchain,
			crlValidationCerts,
			crls
		};
	}
}
