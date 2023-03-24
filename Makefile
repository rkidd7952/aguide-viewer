M4FLAGS=-d --debugfile=debug.txt

all: aguide-js.html ag-bookmark.js

aguide.js: aguide.css
aguide-js.html: aguide.js aguide_escaped.js
ag-bookmark.js: aguide.js

aguide_escaped.js: aguide.js
	sed -e 's/\([\`]\)/\\\1/g' < $< > $@

%: %.in macros.m4
	m4 $(M4FLAGS) macros.m4 $< > $@

clean:
	rm -f aguide.js
	rm -f aguide-js.html
	rm -f ag-bookmark.js
	rm -f aguide_escaped.js

.PHONY: clean
