all: aguide.xpi

aguide.xpi: aguide-js.html aguide.js scan.js background.js manifest.json icon*.png aguide.css
	zip $@ $^

clean:
	rm -f aguide.xpi

.PHONY: clean
