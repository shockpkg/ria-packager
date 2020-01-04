#!/bin/bash

openssl pkcs12 \
	-info \
	-in 'key.p12' \
	-passin 'pass:password' \
	-passout 'pass:password'
