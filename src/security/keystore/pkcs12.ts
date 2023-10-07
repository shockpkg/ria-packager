import {readFile} from 'node:fs/promises';

import forge from 'node-forge';

import {SecurityCertificateX509} from '../certificate/x509';
import {SecurityKeyPrivateRsa} from '../key/private/rsa';
import {SecurityKeystore} from '../keystore';

/**
 * SecurityKeystorePkcs12 object.
 */
export class SecurityKeystorePkcs12 extends SecurityKeystore {
	/**
	 * Certificate.
	 */
	protected _certificate: SecurityCertificateX509 | null = null;

	/**
	 * Private key.
	 */
	protected _privateKey: SecurityKeyPrivateRsa | null = null;

	/**
	 * SecurityKeystorePkcs12 constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * Reset the internal state.
	 */
	public reset() {
		this._certificate = null;
		this._privateKey = null;
	}

	/**
	 * Get certificate or throw if none.
	 *
	 * @returns Certificate instance.
	 */
	public getCertificate() {
		const r = this._certificate;
		if (!r) {
			throw new Error('No certificate');
		}
		return r;
	}

	/**
	 * Get private key or throw if none.
	 *
	 * @returns Private key instance.
	 */
	public getPrivateKey() {
		const r = this._privateKey;
		if (!r) {
			throw new Error('No private key');
		}
		return r;
	}

	/**
	 * Read data from buffer.
	 *
	 * @param data File data.
	 * @param password The password if necessary.
	 */
	public readData(data: Readonly<Buffer>, password: string | null = null) {
		this.reset();

		const asn1 = forge.asn1.fromDer(new forge.util.ByteStringBuffer(data));
		const p12 = password
			? forge.pkcs12.pkcs12FromAsn1(asn1, true, password)
			: forge.pkcs12.pkcs12FromAsn1(asn1, true);

		const certificates: forge.pki.Certificate[] = [];
		const privateKeys: forge.pki.PrivateKey[] = [];
		for (const safeContent of p12.safeContents) {
			for (const safeBag of safeContent.safeBags) {
				switch (safeBag.type) {
					case forge.pki.oids.certBag: {
						const {cert} = safeBag;
						if (!cert) {
							throw new Error('Internal error');
						}
						certificates.push(cert);
						break;
					}
					case forge.pki.oids.pkcs8ShroudedKeyBag: {
						const {key} = safeBag;
						if (!key) {
							throw new Error('Internal error');
						}
						privateKeys.push(key);
						break;
					}
					default: {
						// Do nothing.
					}
				}
			}
		}

		if (certificates.length > 1) {
			throw new Error(
				`Found multiple certificates: ${certificates.length}`
			);
		}
		if (privateKeys.length > 1) {
			throw new Error(
				`Found multiple private keys: ${privateKeys.length}`
			);
		}

		const certificate = certificates.length
			? this._createCertificateX509(
					forge.pki.certificateToPem(certificates[0])
			  )
			: null;

		const privateKey = privateKeys.length
			? this._createSecurityKeyPrivateRsa(
					forge.pki.privateKeyToPem(privateKeys[0])
			  )
			: null;

		this._certificate = certificate;
		this._privateKey = privateKey;
	}

	/**
	 * Read data from file.
	 *
	 * @param path File path.
	 * @param password The password if necessary.
	 */
	public async readFile(path: string, password: string | null = null) {
		const data = await readFile(path);
		this.readData(data, password);
	}

	/**
	 * Create CertificateX509.
	 *
	 * @param certificate X509 certificate in PEM format.
	 * @returns New CertificateX509.
	 */
	protected _createCertificateX509(certificate: string) {
		return new SecurityCertificateX509(certificate);
	}

	/**
	 * Create KeyPrivateRsa.
	 *
	 * @param privateKey RSA private key in PEM format.
	 * @returns New KeyPrivateRsa.
	 */
	protected _createSecurityKeyPrivateRsa(privateKey: string) {
		return new SecurityKeyPrivateRsa(privateKey);
	}

	/**
	 * Create from data.
	 *
	 * @param data File data.
	 * @param password The password if necessary.
	 * @returns New instance.
	 */
	public static fromData(
		data: Readonly<Buffer>,
		password: string | null = null
	) {
		const T = this.prototype.constructor as typeof SecurityKeystorePkcs12;
		const r = new T();
		r.readData(data, password);
		return r;
	}

	/**
	 * Create from file.
	 *
	 * @param path File path.
	 * @param password The password if necessary.
	 * @returns New instance.
	 */
	public static async fromFile(path: string, password: string | null = null) {
		const T = this.prototype.constructor as typeof SecurityKeystorePkcs12;
		const r = new T();
		await r.readFile(path, password);
		return r;
	}
}
