'use strict';

if(typeof browser === "undefined") {
    var browser = chrome;
}

const get_aguide_url = (ag_url = null) => {
    const aguide_url = browser.runtime.getURL("aguide-js.html");
    if(ag_url) {
        const p = new URLSearchParams();
        p.set("guide", encodeURI(ag_url));
        return aguide_url + "?" + p.toString();
    }
    return aguide_url;
}

function handle_on_before_request(details)
{
    console.log("onBeforeRequest");
    return { redirectUrl: get_aguide_url(details.url) };
}

function open_page()
{
    browser.tabs.create({ url: get_aguide_url() });
}

function handle_message(request, sender, sendResponse)
{
    const guideTextKey = "guideText";

    console.log("handling " + request.method);

    if(request.method === "getGuideText") {
        sendResponse({text: localStorage.getItem(guideTextKey)});
    } else if(request.method === "setGuideText") {
        // localStorage.setItem(guideTextKey, JSON.stringify(request));
        console.log("calling setItem");
        try{
            localStorage.setItem(guideTextKey, request.body);
        } catch(error) {
            console.log("setItem threw exception: " + error);
        }
        console.log("called setItem");
        sendResponse({});
    } else {
        sendResponse({});
    }
}

function load_it()
{
    browser.webRequest.onBeforeRequest.addListener(handle_on_before_request, {
        urls: [
            'file:///*/*.guide*',
            'file:///*/*.GUIDE*',
            '*://*/*.guide*',
            '*://*/*.GUIDE*'
        ],
        types: ['main_frame']
    }, ["blocking"]);

    browser.browserAction.onClicked.addListener(open_page);
    browser.runtime.onMessage.addListener(handle_message);
}

load_it();
console.log("loaded");