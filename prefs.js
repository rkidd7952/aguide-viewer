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

if(typeof browser === "undefined") {
    var browser = chrome;
}

function main()
{
    document.getElementById("cancel-button").addEventListener("click", () => {
        browser.runtime.sendMessage({method: "closePrefs"});
    });

    document.getElementById("save-button").addEventListener("click", () => {
        save_config();
        browser.runtime.sendMessage({method: "closePrefs"});
    });

    browser.runtime.sendMessage({method: "loadPrefs"}).then(set_config);

    let dlg = document.getElementById("prefs-dlg")
    dlg.hidden = false;
}

function set_config(prefs)
{
    document.getElementById("file-ext").checked = prefs.detect_ext;
    document.getElementById("file-sig").checked = prefs.detect_sig;
}

function save_config()
{
    let prefs = {
        detect_ext: document.getElementById("file-ext").checked,
        detect_sig: document.getElementById("file-sig").checked
    };
    browser.runtime.sendMessage({method: "savePrefs", prefs: prefs})
}

main();
