/*
  Copyright 2023-2024 Robert Kidd

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
    document.getElementById("cancel-button").addEventListener("click", close_window);

    document.getElementById("save-button").addEventListener("click", () => {
        save_config();
        close_window();
    });

    browser.runtime.sendMessage({method: "loadPrefs"}).then(set_config);
    browser.runtime.onMessage.addListener(handle_message);

    document.addEventListener("keyup", catch_escape);

    let dlg = document.getElementById("prefs-dlg")
    dlg.hidden = false;
}

function handle_message(request, sender, sendResponse)
{
    if(request.method === "closePrefs") {
        close_window();
        sendResponse({});
    }
}

function close_window()
{
    browser.runtime.onMessage.removeListener(handle_message);
    document.removeEventListener("keyup", catch_escape);
    browser.runtime.sendMessage({method: "removePrefsWindow"});
}

function catch_escape(event)
{
    if(event.code === "Escape") {
        close_window();
    }
}

function set_config(prefs)
{
    document.getElementById("theme_os3").checked = prefs.theme == "os3";
    document.getElementById("theme_native").checked = prefs.theme == "native";
    document.getElementById("file-ext").checked = prefs.detect_ext;
    document.getElementById("file-sig").checked = prefs.detect_sig;
}

function save_config()
{
    let theme = "os3";
    if(document.getElementById("theme_native").checked) {
        theme = "native";
    }

    let prefs = {
        theme: theme,
        detect_ext: document.getElementById("file-ext").checked,
        detect_sig: document.getElementById("file-sig").checked
    };
    browser.runtime.sendMessage({method: "savePrefs", prefs: prefs})
}

main();
