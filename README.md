# ria-packager

Package for creating Adobe AIR packages

[![npm](https://img.shields.io/npm/v/@shockpkg/ria-packager.svg)](https://npmjs.com/package/@shockpkg/ria-packager)
[![node](https://img.shields.io/node/v/@shockpkg/ria-packager.svg)](https://nodejs.org)

[![dependencies](https://david-dm.org/shockpkg/ria-packager.svg)](https://david-dm.org/shockpkg/ria-packager)
[![size](https://packagephobia.now.sh/badge?p=@shockpkg/ria-packager)](https://packagephobia.now.sh/result?p=@shockpkg/ria-packager)
[![downloads](https://img.shields.io/npm/dm/@shockpkg/ria-packager.svg)](https://npmcharts.com/compare/@shockpkg/ria-packager?minimal=true)

[![travis-ci](https://travis-ci.com/shockpkg/ria-packager.svg?branch=master)](https://travis-ci.com/shockpkg/ria-packager)


# Overview

Creates AIR packages from the packaged files, and an AIR SDK if necessary.

When an AIR SDK is necessary, it can use a directory containing an SDK, or a shockpkg AIR SDK package file.

Reading DMG SDK packages is only supported on macOS.

Not all possible packing formats are supported, and some have individual limitations.

Some packagers have extra features which can optionally be enabled for things the official packager does not support.

This package is not as strict about various things and will allow packaging applications that the official packager would reject as invalid.

Currently there is no option for creating license files for packaging HARMAN SDK runtimes.


# Usage

## Installer

```js
import {
	PackagerAirInstaller,
	SecurityKeystorePkcs12
} from '@shockpkg/ria-packager';

const keystore = new SecurityKeystorePkcs12();
await keystore.readFile('key.p12', 'password');

const packager = new PackagerAirInstaller('application.air');
packager.keystore = keystore;
packager.timestampUrl = 'http://sha256timestamp.ws.symantec.com/sha256/timestamp';

// Options:
packager.profile = 'extendedDesktop';

await packager.withFile('src/application-app.xml', async packager => {
	await packager.addResourceFile('src/main.swf', 'main.swf');
	await packager.addResourceDirectory('src/icons', 'icons');
});
```

## Bundle (Captive Runtime)

**Limitations:**

-   Native extensions not supported.

### Windows

```js
import {
	PackagerBundleWindows,
	SecurityKeystorePkcs12
} from '@shockpkg/ria-packager';

const keystore = new SecurityKeystorePkcs12();
await keystore.readFile('key.p12', 'password');

const packager = new PackagerAdlWindows('application');
packager.sdkPath = 'airsdk-win.zip';
packager.keystore = keystore;
packager.timestampUrl = 'http://sha256timestamp.ws.symantec.com/sha256/timestamp';

// Options:
packager.applicationIconModern = true;
packager.fileTypeIconModern = true;
packager.frameworkCleanHelpers = true;
packager.fileVersion = '1.2.3.4';
packager.productVersion = '1.2.3.4';
packager.versionStrings = {
	CompanyName: 'Custom Company Name',
	LegalCopyright: 'Custom Legal Copyright'
};
packager.architecture = 'x64';

await packager.withFile('src/application-app.xml', async packager => {
	await packager.addResourceFile('src/main.swf', 'main.swf');
	await packager.addResourceDirectory('src/icons', 'icons');
});
```

### Mac

**Limitations:**

-   The default icon format does not include the obsolete `ICN#` and `ics#` encoded icons.

```js
import {
	PackagerBundleMac,
	SecurityKeystorePkcs12
} from '@shockpkg/ria-packager';

const keystore = new SecurityKeystorePkcs12();
await keystore.readFile('key.p12', 'password');

const packager = new PackagerBundleMac('application.app');
packager.sdkPath = 'airsdk-mac.zip';
packager.keystore = keystore;
packager.timestampUrl = 'http://sha256timestamp.ws.symantec.com/sha256/timestamp';

// Options:
packager.applicationIconModern = true;
packager.fileTypeIconModern = true;
packager.frameworkCleanOsFiles = true;

await packager.withFile('src/application-app.xml', async packager => {
	await packager.addResourceFile('src/main.swf', 'main.swf');
	await packager.addResourceDirectory('src/icons', 'icons');
});
```

## ADL (Debug Launcher)

Limitations:

-   Native extensions not supported.

### Windows

```js
import {PackagerAdlWindows} from '@shockpkg/ria-packager';

const packager = new PackagerAdlWindows('application');
packager.sdkPath = 'airsdk-win.zip';

// Options:
packager.profile = 'extendedDesktop';
packager.architecture = 'x64';

await packager.withFile('src/application-app.xml', async packager => {
	await packager.addResourceFile('src/main.swf', 'main.swf');
	await packager.addResourceDirectory('src/icons', 'icons');
});
```

### Mac

```js
import {PackagerAdlMac} from '@shockpkg/ria-packager';

const packager = new PackagerAdlMac('application');
packager.sdkPath = 'airsdk-mac.zip';

// Options:
packager.profile = 'extendedDesktop';

await packager.withFile('src/application-app.xml', async packager => {
	await packager.addResourceFile('src/main.swf', 'main.swf');
	await packager.addResourceDirectory('src/icons', 'icons');
});
```


# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.


# License

Copyright (c) 2019-2020 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.
