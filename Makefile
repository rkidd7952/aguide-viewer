# Copyright 2023-2024 Robert Kidd
#
# This file is part of AGuide Viewer.
#
# AGuide Viewer is free software: you can redistribute it and/or
# modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# AGuide Viewer is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with AGuide Viewer. If not, see
# <https://www.gnu.org/licenses/>.

all: aguide.xpi

SRCS=aguide.html \
	prefs.html \
	aguide.js \
	prefs.js \
	scan.js \
	background.js \
	manifest.json \
	icon*.png \
	aguide.css \
	README.md \
	README.guide \
	COPYING

aguide.xpi: $(SRCS)
	zip $@ $^

# make VERSION=vers [FORCE=-f] dist
# Before make dist
#   Update version in README.md and README.guide
#   Update CHANGELOG
dist: clean tag
	mkdir -p distfiles
	make aguide.xpi
	cp aguide.xpi distfiles/aguide-$(VERSION)-unsigned.xpi
	git archive -o distfiles/aguide-$(VERSION).tar.gz "v$(VERSION)"
	git archive -o distfiles/aguide-$(VERSION).zip "v$(VERSION)"
	cp CHANGELOG distfiles

# make VERSION=vers [FORCE=-f] tag
GS=git status --porcelain --untracked-files=no
tag:
	@test -n "$(VERSION)" || (echo "usage: make tag VERSION=vers" && false)
	@test -z "`$(GS)`" -o -n "$(DIRTY_OK)" || (echo "Uncommitted changes exist in tree; set DIRTY_OK to bypass" && false)
	jq -M '.version = "$(VERSION)"' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
	test -z "`git diff manifest.json`" || git commit -m "Tagging version $(VERSION)" manifest.json
	git tag $(FORCE) -m "Tagging version $(VERSION)" "v$(VERSION)"
	@echo "*** Push tag with \`git push origin v$(VERSION)\` ***"

clean:
	-rm -f aguide.xpi
	-rm -f distfiles

.PHONY: clean tag dist
