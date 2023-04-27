all: build/aguide-js.html extension

extension: build/scan.js build/background.js build/manifest.json build/icon32x32.png build/aguide.css

# build/aguide.js: aguide.css
build/aguide2.js: build/aguide.js build/aguide_escaped.js
build/aguide-js.html: build/aguide.js
build/ag-bookmarfk.js: build/aguide.js
# build/agview.js: build/aguide.js

build/aguide_escaped.js: build/aguide.js
	sed -e 's/\([\`]\)/\\\1/g' < $< > $@

build/%: %.in
	mkdir -p build
	sed -f do_include.sed < $< > $@

build/%: %
	mkdir -p build
	cp $< $@

clean:
	rm -rf build

.PHONY: clean
