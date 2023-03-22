M4FLAGS=

all: aguide-js.html ag-bookmark.js

aguide.js: aguide.css
aguide-js.html: aguide.js
ag-bookmark.js: aguide.js

%: %.in macros.m4
	m4 macros.m4 $(M4FLAGS) $< > $@

clean:
	rm -f aguide.js
	rm -f aguide-js.html
	rm -f ag-bookmark.js

.PHONY: clean
