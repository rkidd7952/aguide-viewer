# Copyright 2023 Robert Kidd
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

SRCS=aguide.html aguide.js scan.js background.js manifest.json icon*.png aguide.css README.txt README.guide COPYING

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
