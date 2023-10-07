export interface IFetchRequestHeaders {
	[header: string]: string;
}

export interface IFetchRequestInit {
	/**
	 * Request method.
	 */
	method?: string;

	/**
	 * Request headers.
	 */
	headers?: {[header: string]: string};

	/**
	 * Request body.
	 */
	body?: ArrayBufferView | ArrayBuffer;
}

export interface IFetchResponseHeaders {
	/**
	 * Get header case-insensitive.
	 */
	get(header: string): string | null;
}

export interface IFetchResponse {
	/**
	 * Response status code.
	 */
	status: number;

	/**
	 * Response headers.
	 */
	headers: IFetchResponseHeaders;

	/**
	 * Response body as data.
	 */
	arrayBuffer: () => Promise<ArrayBuffer>;
}

export type IFetch = (
	url: string,
	init?: IFetchRequestInit
) => Promise<IFetchResponse>;
