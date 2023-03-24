M4FLAGS=-d --debugfile=debug.txt

all: aguide-js.html

aguide.js: aguide.css
aguide-js.html: aguide.js aguide_escaped.js
ag-bookmark.js: aguide.js

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
