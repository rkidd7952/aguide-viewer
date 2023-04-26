all: aguide-js.html agview.js

aguide.js: aguide.css
aguide2.js: aguide.js  aguide_escaped.js
aguide-js.html: aguide2.js
ag-bookmark.js: aguide.js
agview.js: aguide.js

aguide_escaped.js: aguide.js
	sed -e 's/\([\`]\)/\\\1/g' < $< > $@

%: %.in
	sed -f do_include.sed < $< > $@

clean:
	rm -f aguide.js
	rm -f aguide-js.html
	rm -f ag-bookmark.js
	rm -f aguide_escaped.js

.PHONY: clean
