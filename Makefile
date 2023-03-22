all: aguide-js.html

aguide.js: aguide.css
aguide-js.html: aguide.js

%: %.in macros.m4
	m4 macros.m4 $< > $@

clean:
	rm -f aguide.js
	rm -f aguide-js.html

.PHONY: clean
