all: aguide.xpi

SRCS=aguide-js.html aguide.js scan.js background.js manifest.json icon*.png aguide.css

aguide.xpi: $(SRCS)
	zip $@ $^

dist: clean tag
	make aguide.xpi

GS=git status --porcelain --untracked-files=no
tag:
	@test -n "$(VERSION)" || (echo "usage: make tag VERSION=vers" && false)
	@test -z "`$(GS)`" -o -n "$(DIRTY_OK)" || (echo "Uncommitted changes exist in tree; set DIRTY_OK to bypass" && $(GS))
	jq -M '.version = "$(VERSION)"' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
	git commit -m "Tagging version $(VERSION)" manifest.json
	git tag -m "Tagging version $(VERSION)" "v$(VERSION)"

clean:
	-rm aguide.xpi

.PHONY: clean tag dist
