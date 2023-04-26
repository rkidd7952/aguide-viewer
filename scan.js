(function () {
    let t = document.firstChild.textContent.slice(0, 9);
    if(t.toLowerCase() === "@database") {
        const storage_name = "guidetext";
        // localStorage.setItem(storage_name, document.firstChild.textContent);
        browser.runtime.sendMessage({method: "setGuideText", body: document.firstChild.textContent});
        console.log("wrote local storage: name = " + storage_name + ", value = " + document.firstChild.textContent)
        const aguide_url = browser.runtime.getURL("aguide-js.html");
        const p = new URLSearchParams();
        p.set("storage", encodeURI(storage_name));
        // p.set("guide", encodeURI(window.location));
        // p.set("aguide_text", encodeURI(document.firstChild.textContent));
        window.location = aguide_url + "?" + p.toString();
    }
})();
