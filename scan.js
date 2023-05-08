/*
  Copyright 2023 Robert Kidd

  This file is part of AGuide Viewer.

  AGuide Viewer is free software: you can redistribute it and/or
  modify it under the terms of the GNU General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  AGuide Viewer is distributed in the hope that it will be useful, but
  WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
  General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with AGuide Viewer. If not, see
  <https://www.gnu.org/licenses/>.
*/

(function () {
    if(typeof browser === "undefined") {
        var browser = chrome;
    }

    let t = document.firstChild.textContent.slice(0, 9);
    if(t.toLowerCase() === "@database") {
        console.log("smells like amigaguide");

        const storage_name = "guidetext";
        browser.runtime.sendMessage({
            method: "setGuideText",
            body: document.firstChild.textContent,
            encoding: document.inputEncoding
        }, function(resp) {
            console.log("wrote local storage: value = " + document.firstChild.textContent);
            console.log("encoding = " + document.inputEncoding);
            const aguide_url = browser.runtime.getURL("aguide-js.html");
            const p = new URLSearchParams();
            // storage is a flag telling the viewer to read from local storage.
            p.set("storage", encodeURI(storage_name));
            const parent_ref = window.location.href.split("/").slice(0, -1).join("/");
            p.set("parent_ref", encodeURI(parent_ref));
            window.location.replace(aguide_url + "?" + p.toString());
        });
    }
})();
