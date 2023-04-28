all: aguide.xpi

aguide.xpi: aguide-js.html aguide.js scan.js background.js manifest.json icon32x32.png aguide.css
	zip $@ $^

clean:
	rm -f aguide.xpi

.PHONY: clean
