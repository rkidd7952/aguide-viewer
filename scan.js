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
            window.location = aguide_url + "?" + p.toString();
        });
    }
})();
