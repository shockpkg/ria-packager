#!/bin/bash

as3compile --flashversion 9 --width 600 --height 400 --rate 30 'HelloWorld.as'
flasm -x 'HelloWorld.swf'
rm 'HelloWorld.$wf'
