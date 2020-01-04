import fse from 'fs-extra';
import forge from 'node-forge';

import {SecurityCertificateX509} from '../certificates/x509';
import {SecurityKeyPrivateRsa} from '../keys/privates/rsa';
import {SecurityKeystore} from '../keystore';

const forgeOidCertBag = forge.pki.oids.certBag;
const forgeOidPkcs8ShroudedKeyBag = forge.pki.oids.pkcs8ShroudedKeyBag;

/**
 * SecurityKeystorePkcs12 constructor.
 */
export class SecurityKeystorePkcs12 extends SecurityKeystore {
	/**
	 * Certificate.
	 */
	protected _certificate: SecurityCertificateX509 | null = null;

	/**
	 * Private key.
	 */
	protected _keyPrivate: SecurityKeyPrivateRsa | null = null;

	constructor() {
		super();
	}

	/**
	 * Reset the internal state.
	 */
	public reset() {
		this._certificate = null;
		this._keyPrivate = null;
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
	public getKeyPrivate() {
		const r = this._keyPrivate;
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

		const der = forge.util.decode64(data.toString('base64'));
		const asn1 = forge.asn1.fromDer(der);
		const p12 = password ?
			forge.pkcs12.pkcs12FromAsn1(asn1, true, password) :
			forge.pkcs12.pkcs12FromAsn1(asn1, true);

		const certificates: forge.pki.Certificate[] = [];
		const keyPrivates: forge.pki.PrivateKey[] = [];
		for (const safeContent of p12.safeContents) {
			for (const safeBag of safeContent.safeBags) {
				switch (safeBag.type) {
					case forgeOidCertBag: {
						const {cert} = safeBag;
						if (!cert) {
							throw new Error('Internal error');
						}
						certificates.push(cert);
						break;
					}
					case forgeOidPkcs8ShroudedKeyBag: {
						const {key} = safeBag;
						if (!key) {
							throw new Error('Internal error');
						}
						keyPrivates.push(key as any);
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
		if (keyPrivates.length > 1) {
			throw new Error(
				`Found multiple private keys: ${keyPrivates.length}`
			);
		}

		const certificate = certificates.length ?
			this._createCertificateX509(certificates[0]) :
			null;

		const keyPrivate = keyPrivates.length ?
			this._SecurityKeyPrivateRsa(keyPrivates[0]) :
			null;

		this._certificate = certificate;
		this._keyPrivate = keyPrivate;
	}

	/**
	 * Read data from file.
	 *
	 * @param path File path.
	 * @param password The password if necessary.
	 */
	public async readFile(path: string, password: string | null = null) {
		const data = await fse.readFile(path);
		this.readData(data, password);
	}

	/**
	 * Create CertificateX509.
	 *
	 * @param certificate Force certificate.
	 * @returns New CertificateX509.
	 */
	protected _createCertificateX509(
		certificate: Readonly<forge.pki.Certificate>
	) {
		const r = new SecurityCertificateX509();
		r.readForgeCertificate(certificate);
		return r;
	}

	/**
	 * Create KeyPrivateRsa.
	 *
	 * @param keyPrivate Force private key.
	 * @returns New KeyPrivateRsa.
	 */
	protected _SecurityKeyPrivateRsa(
		keyPrivate: Readonly<forge.pki.PrivateKey>
	) {
		const r = new SecurityKeyPrivateRsa();
		r.readForgeKeyPrivate(keyPrivate);
		return r;
	}
}
