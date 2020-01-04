#!/bin/bash

if [ "$#" -ne 1 ]; then
	echo 'Requires an icon name'
fi

dst="$1"
src="${dst}.png"

rm -rf "${dst}"
mkdir "${dst}"
sizes=(
"16x16"
"29x29"
"32x32"
"36x36"
"48x48"
"50x50"
"57x57"
"58x58"
"72x72"
"96x96"
"100x100"
"114x114"
"128x128"
"144x144"
"512x512"
"732x412"
"1024x1024"
)
for size in "${sizes[@]}"; do
	echo "<image${size}>${dst}/icon_${size}.png</image${size}>"
	resize="$(cut -d'x' -f1 <<< "${size}")"
	convert -strip "${src}" \
		-resize "${resize}" \
		-gravity center \
		-crop "${size}+0+0" \
		+repage \
		"${dst}/icon_${size}.png"
done
