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

const get_aguide_url = (ag_url = null) => {
    const aguide_url = browser.runtime.getURL("aguide.html");
    if(ag_url) {
        const p = new URLSearchParams();
        p.set("guide", encodeURI(ag_url));
        return aguide_url + "?" + p.toString();
    }
    return aguide_url;
}

function handle_on_headers_received(details)
{
    // console.log("onHeadersReceived");

    let ct_header = details.responseHeaders.find((x) => {
        return x.name.toLowerCase() == "content-type" });
    if(ct_header) {
        ct = ct_header.value.toLowerCase();

        if(ct.startsWith("text/plain") ||
           ct.startsWith("application/octet-stream")) {
            return { redirectUrl: get_aguide_url(details.url) };
        }
    }
}

function open_page()
{
    browser.tabs.create({ url: get_aguide_url() });
}

function handle_message(request, sender, sendResponse)
{
    const guideTextKey = "guideText";

    // console.log("handling " + request.method);

    if(request.method === "getGuideText") {
        sendResponse(JSON.parse(sessionStorage.getItem(guideTextKey)));
    } else if(request.method === "setGuideText") {
        try{
            sessionStorage.setItem(guideTextKey, JSON.stringify(request));
        } catch(error) {
            console.log("setItem threw exception: " + error);
        }
        sendResponse({});
    } else if(request.method === "loadPrefs") {
        return load_prefs();
    } else if(request.method === "savePrefs") {
        browser.storage.local.set({prefs: request.prefs});
        handle_prefs_update(request.prefs);
    }
}

function default_prefs()
{
    return {detect_ext: true, detect_sig: true};
}

function load_prefs()
{
    return browser.storage.local.get("prefs").then(
        prefs => prefs.prefs ? prefs.prefs : default_prefs());
}

function handle_prefs_update(prefs)
{
    const orh = browser.webRequest.onHeadersReceived;

    if(prefs.detect_ext) {
        if(!orh.hasListener(handle_on_headers_received)) {
            orh.addListener(handle_on_headers_received, {
                urls: [
                    'file:///*/*.guide*',
                    'file:///*/*.GUIDE*',
                    '*://*/*.guide*',
                    '*://*/*.GUIDE*'
                ],
                types: ['main_frame']
            }, ["blocking", "responseHeaders"]);
        }
    } else {
        orh.removeListener(handle_on_headers_received);
    }

    const scanner_id = "aguide-scanner";
    if(prefs.detect_sig) {
        browser.scripting.getRegisteredContentScripts({ids: [scanner_id]})
            .then(scripts => scripts.length > 0 ? scripts :
                  browser.scripting.registerContentScripts([{
                      id: "aguide-scanner",
                      js: ["scan.js"],
                      matches: [
                          "*://*/*",
                          "file:///*"
                      ],
                  }]));
    } else {
        browser.scripting.unregisterContentScripts({ids: [scanner_id]})
            .then(null, reason => null);
    }
}

function load_it()
{
    load_prefs().then(handle_prefs_update);

    browser.browserAction.onClicked.addListener(open_page);
    browser.runtime.onMessage.addListener(handle_message);
}

load_it();
// console.log("loaded");
