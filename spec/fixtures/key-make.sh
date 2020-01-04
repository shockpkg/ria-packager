#!/bin/bash

adt -certificate \
	-cn SelfSign \
	-ou organizationalunit \
	-o organization \
	-c US \
	-validityPeriod 30 \
	2048-RSA \
	'key.p12' \
	'password'
