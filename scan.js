(function () {
    let t = document.firstChild.textContent.slice(0, 9);
    if(t.toLowerCase() === "@database") {
        console.log("smells like amigaguide");

        const storage_name = "guidetext";
        // localStorage.setItem(storage_name, document.firstChild.textContent);
        browser.runtime.sendMessage({method: "setGuideText", body: document.firstChild.textContent}, function(resp) {
            console.log("wrote local storage: value = " + document.firstChild.textContent);
            const aguide_url = browser.runtime.getURL("aguide-js.html");
            const p = new URLSearchParams();
            // storage is a flag telling the viewer to read from local storage.
            p.set("storage", encodeURI(storage_name));
            const parent_ref = window.location.href.split("/").slice(0, -1).join("/");
            p.set("parent_ref", encodeURI(parent_ref));
            // p.set("guide", encodeURI(window.location));
            // p.set("aguide_text", encodeURI(document.firstChild.textContent));
            window.location = aguide_url + "?" + p.toString();
        });
    }
})();
