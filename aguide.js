/*
  Copyright 2023-2026 Robert Kidd

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

var utils;
import("./utils.js").then((i) => utils = i);
var tbuf;
import("./tokenbuffer.js").then((i) => tbuf = i);

const NBSP_UC = "\u00A0";

var theme = "os3";

if(typeof browser === "undefined") {
    var browser = chrome;
}

function main()
{
    browser.runtime.onMessage.addListener(handle_message);

    init_page(true).then(continue_main);
}

function continue_main()
{
    let params = new URLSearchParams(window.location.search);
    let guideEnc = params.get("guide");
    let storage_name_enc = params.get("storage");
    if(guideEnc) {
        let guide = decodeURI(guideEnc);
        console.log("guide = " + guide);
        if(guide.indexOf("http") === 0 || guide.indexOf("file") === 0 ||
           guide.indexOf("moz-extension") === 0 ||
           guide.indexOf("chrome-extension") === 0) {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", guide);
            xhr.responseType = "blob";
            xhr.onload = async () => {
                const file = new File([xhr.response], "tmp.txt", {type: "application/octet-stream"});
                read_input_file(file, "");
            };
            xhr.send();
        }
    } else if(storage_name_enc) {
        // if(typeof browser === "undefined") {
        //     var browser = chrome;
        // }

        const storage_name = decodeURI(storage_name_enc);
        browser.runtime.sendMessage({method: "getGuideText"}, function(resp) {
            const file = new File([resp.body], "tmp.txt", {type: "application/octet-stream"});
            read_input_file(file, resp.encoding);
        });
    }
}

function get_guide_url()
{
    let params = new URLSearchParams(window.location.search);
    let guideEnc = params.get("guide");
    let window_url = new URL(window.location);
    if(guideEnc) {
        return new URL(decodeURI(guideEnc) + window_url.hash);
    }
    return window_url;
}

function init_page(show_open)
{
    return browser.runtime.sendMessage({method: "loadPrefs"})
        .then(set_config)
        .then((prefs) => continue_init_page(show_open, prefs));
}

function continue_init_page(show_open, prefs)
{
    let b = document.getElementsByTagName("body");
    let body = null;

    body = document.createElement("body");
    body.classList.add(theme);
    document.body = body;
    
    let body_div = document.createElement("div");
    body_div.appendChild(make_toolbar(show_open));
    body_div.appendChild(new_element("div", {"id": "aguide",
                                             "class": "aguide"}));
    body.appendChild(body_div);

    addEventListener("popstate", handle_popstate);
    addEventListener("hashchange", display_node_hash);

    return new Promise(resolve => resolve());
}

function set_config(prefs)
{
    theme = prefs.theme ? prefs.theme : "os3";

    let b = document.getElementsByTagName("body");
    if(b.length > 0) {
        b[0].className = theme;
    }

    return new Promise(resolve => resolve(prefs));
}

function handle_message(request, sender, sendResponse)
{
    if(request.method === "removePrefsWindow") {
        close_preferences();
        sendResponse({});
    } else if(request.method === "savePrefs") {
        set_config(request.prefs);
    }
}

function make_toolbar(show_open)
{
    let toolbar_div = new_element("div", {"id": "toolbar", "class": "toolbar"});
    if(show_open) {
        let open_file = new_element("input", {"type": "file", "id": "open-file"});
        open_file.addEventListener("change", read_input, false);
        toolbar_div.appendChild(open_file);
        toolbar_div.appendChild(
            new_button("button-open",
                       browser.i18n.getMessage("OpenFileButtonLabel"), false,
                       () => {
                           document.getElementById("open-file").click();
                       }));
        toolbar_div.appendChild(document.createTextNode(" "));
    }
    toolbar_div.appendChild(
        new_button("button-contents",
                   browser.i18n.getMessage("ContentsButtonLabel"), true, null));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-index",
                   browser.i18n.getMessage("IndexButtonLabel"), true, null));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-help",
                   browser.i18n.getMessage("HelpButtonLabel"), true, null));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-retrace",
                   browser.i18n.getMessage("RetraceButtonLabel"), true,
                   () => {
                       history.go(-1);
                   }));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-browse-prev",
                   browser.i18n.getMessage("BrowsePrevButtonLabel"), true,
                   null));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-browse-next",
                   browser.i18n.getMessage("BrowseNextButtonLabel"), true,
                   null));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-browse-next",
                   browser.i18n.getMessage("PreferencesButtonLabel"), false,
                   () => { show_preferences(); }));
    toolbar_div.appendChild(document.createTextNode(" "));
    toolbar_div.appendChild(
        new_button("button-about", browser.i18n.getMessage("AboutButtonLabel"),
                   false,
                   (event) => {
                       toggle_about();
                   }));
    return toolbar_div;
}

function handle_popstate(event)
{
    if(event.state && event.state.node === "main") {
        document.getElementById("button-retrace").disabled = true;
    } else {
        document.getElementById("button-retrace").disabled = false;
    }          
    display_node_hash();
}

function handle_click_link(event)
{
    display_node_hash();
    document.getElementById("button-retrace").disabled = false;
    return true;
}

function read_input()
{
    const file = this.files.item(0);
    read_input_file(file, "");
}

function read_input_file(file, encoding)
{
    let reader = new FileReader();
    reader.addEventListener("load", () => { process_input(reader.result, file.name, encoding); },
                            false);
    if(!encoding || encoding === "") {
        reader.readAsBinaryString(file);
    } else {
        reader.readAsText(file);
    }
}

var AG = null;

function is_aguide(text)
{
    return new_aguide(tbuf.new_tbuf(text)) !== null;
}

function process_input(text, filename, encoding)
{
    if(encoding && encoding != "") {
        let transcoded = transcode_charset(text, encoding, 'iso-8859-1');
        text = transcoded;
    }

    let ps = tbuf.new_tbuf(text);
    AG = parse_aguide(ps);
    if(AG) {
        AG.filename = filename;
    } else {
        let aguide_div = document.getElementById("aguide");
        aguide_div.innerText = text;
        return;
    }
    
    let t = "Parsed an AmigaGuide "+AG.database+" from "+filename+"<br>";
    t += JSON.stringify(AG.nodes);
    console.info(t);

    let u = get_guide_url();
    if(u.hash) {
        u.hash = "#";
        window.location = u.toString();
    }

    document.getElementById("button-retrace").disabled = true;

    if(AG.index) {
        document.getElementById("button-index").disabled = false;
    }

    set_button_link(document.getElementById("button-contents"),
                    find_node(AG, "main"));

    history.replaceState({node: "main", ct: 0}, "main");
    display_node("main");
}

/******* amiga guide functions *******/
function get_handler(handlers, name)
{
    for(let i = 0; i < handlers.length; ++i) {
        if(handlers[i].cmd === name) {
            return handlers[i].handler;
        }
    }

    return null;
}

function parse_aguide(ps)
{
    let aguide = new_aguide(ps);

    if(!aguide) {
        return null;
    }

    const cmd_handlers = [
        { cmd: "@master", handler: finish_cmd_master },
        { cmd: "@node", handler: finish_cmd_node },
        { cmd: "@index", handler: finish_cmd_index },
        { cmd: "@remark", handler: finish_cmd_remark },
        { cmd: "@wordwrap", handler: nop_global },
        { cmd: "@smartwrap", handler: nop_global }
    ];

    let e = true;
    while(aguide && !tbuf.at_eof(ps) && e === true) {
        let token = tbuf.tbuf_search_token(ps, /^@\S+/m, false);
        if(!token) {
            break;
        }

        let t = token.token.toLowerCase();
        console.info("Parsed token: " + t);

        let cmd_handler = get_handler(cmd_handlers, t);
        if(cmd_handler) {
            e = cmd_handler(ps, token, aguide);
        }
    }

    return aguide;
}

/* Create a new aguide struct and parse the initial
 * '@database <name>' command */
function new_aguide(ps)
{
    let token = tbuf.get_next_token(ps, false);
    if(!token || token.token.toLowerCase() !== "@database") {
        return null;
    }

    console.info("Reading AmigaGuide: found @database");

    let db_name = tbuf.get_next_token(ps, true);
    let db_name_str = "";
    if(db_name && db_name.token[0] !== "@") {
        db_name_str = db_name.token;
        tbuf.tbuf_consume_token(ps, db_name);
    }
    return {
        database: db_name_str,
        text: ps.text,
        nodes: []
    };
}

function nop_global(ps, token, aguide) {
    return true;
}

/* token is @master, parse path
 * Return true on success, false on error */
function finish_cmd_master(ps, token, aguide)
{
    let path = tbuf.get_next_token(ps, false);
    if(!path) {
        return false;
    }
    aguide.master = path;
    console.info("  master.path = " + path);
    return true;
}

/* token is @node, parse name, title, find @endnode */
function finish_cmd_node(ps, token, aguide)
{
    let node = {
        name: "",
        title : "",
        start_cmd: token.start, /* @ in @node */
        start: -1,          /* index past end of start */
        end_cmd: -1,        /* @ in @endnode */
        end: -1             /* index past end of @endnode */
    };

    let name = tbuf.get_next_token(ps, false);
    if(!name) {
        return false;
    }
    node.name = utils.str_strip_quote(name.token.toLowerCase());

    console.log("node name " + node.name);

    let title = tbuf.tbuf_search_token(ps, /.*$/m, false);
    if(title) {
        node.title = utils.str_strip_quote(title.token.trim());
    }
    node.start = title.end;

    token = tbuf.tbuf_search_token(ps, /^@endnode/mi, false);

    if(!token) {
        return false;
    }

    node.end = token.start;
    node.end_cmd = token.end;

    let en_name = tbuf.get_next_token(ps, true);
    if(en_name && en_name.token.toLowerCase()[0] != "@") {
        tbuf.tbuf_consume_token(ps, en_name);
        let n = en_name.token.toLowerCase();
        if(n !== node.name) {
            console.error("Found @endnode with name " + n + " for @node name " + node.name);
        } else {
            node.end_cmd = en_name.end;
        }
    }

    aguide.nodes.push(node);

    return true;
}

function finish_cmd_index(ps, token, aguide)
{
    let index = tbuf.get_next_token(ps, false);
    if(!index) {
        return false;
    }
    aguide.index = index;
    console.info("  index.node = " + index);
    return true;
}

function finish_cmd_remark(ps, token, aguide)
{
    /* eat everything to end of line */
    let eol = tbuf.tbuf_search_token(ps, /$/m, false);
    if(eol) {
        console.info("  remark: " + ps.text.slice(token.start, eol.end));
    }
    return true;
}

function find_node_index(aguide, name)
{
    for(let i = 0; i < aguide.nodes.length; ++i) {
        if(aguide.nodes[i].name.toLowerCase() === name.toLowerCase()) {
            return i;
        }
    }

    return -1;
}

function find_node(aguide, name)
{
    let i = find_node_index(aguide, name);
    if(i !== -1) {
        return aguide.nodes[i];
    }

    return null;
}

function find_toc(aguide, node)
{
    if(node.toc) {
        return find_node(aguide, node.toc);
    }
    return find_node(aguide, "main");
}

function find_node_next(aguide, name)
{
    let idx = find_node_index(aguide, name);
    if(idx === -1) {
        return null;
    }
    let node = aguide.nodes[idx];
    if(node.next) {
        return find_node(aguide, node.next);
    } else if(idx + 1 < aguide.nodes.length) {
        return aguide.nodes[idx + 1];
    }
    return null;
}

function find_node_prev(aguide, name)
{
    let idx = find_node_index(aguide, name);
    if(idx === -1) {
        return null;
    }
    let node = aguide.nodes[idx];
    if(node.prev) {
        return find_node(aguide, node.prev);
    } else if(idx - 1 >= 0) {
        return aguide.nodes[idx - 1];
    }
    return null;
}

function display_node_hash()
{
    let u = get_guide_url();
    if(u.hash && u.hash[0] === "#") {
        display_node(decodeURI(u.hash.slice(1)))
    } else {
        display_node("main")
    }
}

// Configures `button` to link to `node`.  If `node` is null, disables
// the button.
function set_button_link(button, node)
{
    if(!node) {
        button.disabled = true;
    } else {
        button.disabled = false;
        button.onclick = () => {
            window.location.hash = encodeURI(node.name);
        };
    }
}

function get_title(aguide, node)
{
    if(node.title) {
        return node.title;
    }
    return aguide.database;
}

/* Display node 'name', rendering to div with id 'aguide' */
function display_node(name)
{
    let n = find_node(AG, name);
    if(!n) {
        return;
    }

    let html = render_html(AG, n);

    let toc = find_toc(AG, n);
    document.getElementById("button-contents").disabled = (toc !== null && name === toc.name);

    set_button_link(document.getElementById("button-browse-next"),
                    find_node_next(AG, name));
    set_button_link(document.getElementById("button-browse-prev"),
                    find_node_prev(AG, name));

    document.title = get_title(AG, n);
    let div = document.getElementById("aguide");
    let old = div.firstChild;
    if(old) {
        div.removeChild(old);
    }
    div.appendChild(html);
}

function cur_crsr(st) {
    return st[st.length - 1];
}

/* Translate amiga guide node to HTML */
function render_html(aguide, node)
{
    let html = new_element("div", {});
    let jdiv = new_element("div", {"class": "j"});
    html.appendChild(jdiv);
    // crsr is the current element to which unmarked text is appended.
    let crsr = jdiv;

    let ps = new_node_tbuf(aguide, node);

    const cmd_handlers = [
        { cmd: "@next", handler: handle_toc_next_prev },
        { cmd: "@prev", handler: handle_toc_next_prev },
        { cmd: "@smartwrap", handler: nop_node },
        { cmd: "@title", handler: handle_node_title },
        { cmd: "@toc", handler: handle_toc_next_prev },
        { cmd: "@wordwrap", handler: nop_node }
    ];
    
    /* Convert any space chars at the beginning of a line to non-breaking */
    let ps2 = tbuf.tbuf_translate(ps,
                             [{from: /(\n)( +)/gm,
                               to: (match, p1, p2, offset, string) => {
                               let r = p1;
                               for(let i = 0; i < p2.length; ++i) {
                                   r += NBSP_UC;
                               }
                               return r;
                               }}]);

    let render_state = {
        style: [],
        crsr_stack: [html, jdiv]
    };

    while(!tbuf.at_eof(ps2)) {
        console.info("pos: " + ps2.pos);

        let c = tbuf.tbuf_search_token(ps2, /[\\@\n]/, true);
        if(!c) {
            add_text(crsr, tbuf.tbuf_slice(ps2, ps2.pos, -1, false));
            break;
        }

        add_text(crsr, tbuf.tbuf_slice(ps2, 0, c.start - ps2.pos, false));

        if(c.token === "\\") { /* escape */
            /* Skip backslash, emit next char */
            add_text(crsr, tbuf.tbuf_slice(ps2, 1, 2, false));
        } else if(c.token === "\n") {
            tbuf.tbuf_consume_token(ps2, c);
            crsr.appendChild(new_element("br", {}));
        } else if(c.token === "@") { /* start cmd */
            let brace = tbuf.tbuf_search_token(ps2, /^@{[^}]*}/, true);
            if(brace) {
                tbuf.tbuf_consume_token(ps2, brace);
                let cmd = brace.token.slice(2, -1);
                console.log("handle @{" + cmd + "}");
                render_brace_cmd(aguide, cmd, render_state);
                crsr = cur_crsr(render_state.crsr_stack);
            } else {
                let t = tbuf.get_next_token(ps2, false);
                let cmd = t.token.toLowerCase();
                let cmd_handler = get_handler(cmd_handlers, cmd);
                console.log("handle cmd " + cmd);
                if(cmd_handler) {
                    append_children(crsr, cmd_handler(aguide, node, cmd, ps2));
                } else {
                    add_text(crsr, t.token);
                }
            }
        }
    }

    return html;
}

function handle_node_title(aguide, node, cmd, ps)
{
    let t = tbuf.get_next_token(ps, false);
    node.title = utils.str_strip_quote(t.token);
    return "";
}

function handle_toc_next_prev(aguide, node, cmd, ps)
{
    let t = tbuf.get_next_token(ps, false);
    let n = utils.str_strip_quote(t.token.toLowerCase());
    if(cmd === "@toc") {
        node.toc = n;
    } else if(cmd === "@next") {
        node.next = n;
    } else if(cmd === "@prev") {
        node.prev = n;
    }
    return "";
}

function nop_node(aguide, node, cmd, ps)
{
    return "";
}

function render_brace_cmd(aguide, cmd, render_state)
{
    const orig = "@{" + cmd + "}";
    let ps = tbuf.new_tbuf(cmd);
    let t = tbuf.get_next_token(ps, false);
    if(!t) {
        add_text(cur_crsr(render_state.crsr_stack), orig);
        return;
    }

    let tlc = t.token.toLowerCase();
    if(tlc === "b" || tlc === "i" || tlc === "u") {
        if(render_state.style.length > 0) {
            render_state.crsr_stack.pop();
        }
        let cls = apply_style(render_state, tlc);
        if(cls) {
            push_span_of_class(cls, render_state);
        }
        return;
    } else if(tlc === "ub" || tlc === "ui" || tlc === "uu") {
        if(render_state.style.length > 0) {
            render_state.crsr_stack.pop();
        }
        let cls = remove_style(render_state, tlc);
        if(cls) {
            push_span_of_class(cls, render_state);
        }
        return;
    } else if(tlc === "fg" || tlc === "bg") {
        let color = tbuf.get_next_token(ps, false);
        if(color) {
            if(render_state.style.length > 0) {
                render_state.crsr_stack.pop();
            }
            let cls = apply_color(render_state, tlc, color);
            if(cls) {
                push_span_of_class(cls, render_state);
            }
            return;
        }
    } else if(tlc === "apen" || tlc === "bpen") {
        let pen = tbuf.get_next_token(ps, false);
        if(pen) {
            if(render_state.style.length > 0) {
                render_state.crsr_stack.pop();
            }
            let cls = apply_pen(render_state, tlc, pen);
            if(cls) {
                push_span_of_class(cls, render_state);
            }
            return;
        }
    } else if(tlc === "jcenter" || tlc === "jleft" || tlc === "jright") {
        let jdiv = new_element("div", {"class": "j " + tlc.slice(1)});
        apply_justification(render_state, jdiv);
        return;
    } else if(tlc === "lindent") {
        let indent = tbuf.get_next_token(ps, false);
        if(indent) {
            /* find jdiv, clone, add indent padding */
            for(let i = render_state.crsr_stack.length - 1; i > 0; --i) {
                if(render_state.crsr_stack[i].classList.contains("j")) {
                    let jdiv = render_state.crsr_stack[i].cloneNode();
                    jdiv.style.paddingLeft = indent.token + "em";
                    apply_justification(render_state, jdiv);
                    return;
                }
            }
        }
    } else if(tlc[0] === "\"") {
        let link = render_link(ps, t.token);
        if(!link) {
            add_text(cur_crsr(render_state.crsr_stack), orig);
            return;
        }
        for(const i in link) {
            cur_crsr(render_state.crsr_stack).appendChild(link[i]);
        }
        return;
    }

    add_text(cur_crsr(render_state.crsr_stack), orig);
    return;
}

function push_span_of_class(cls, render_state)
{
    let new_span = new_element("span", {"class": cls});
    cur_crsr(render_state.crsr_stack).appendChild(new_span);
    render_state.crsr_stack.push(new_span);
}

function apply_justification(render_state, jdiv)
{
    /*
      pop crsr_stack until we find div with class "j", save popped to P
      pop div, push div with new justfication
      for each element in P, clone element
    */
    let spans = []
    while(!cur_crsr(render_state.crsr_stack).classList.contains("j")) {
        spans.push(render_state.crsr_stack.pop());
    }
    /* Pop justification div */
    render_state.crsr_stack.pop();
    cur_crsr(render_state.crsr_stack).appendChild(jdiv);
    render_state.crsr_stack.push(jdiv);
    while(spans.length > 0) {
        let c = spans.pop().cloneNode();
        cur_crsr(render_state.crsr_stack).appendChild(c);
        render_state.crsr_stack.push(c);
    }
}

function render_link(ps, link_text)
{
    link_text = utils.str_strip_quote(link_text);
    link_text = utils.str_translate(link_text,
                              [{from: " ", to: NBSP_UC}]);

    let t = tbuf.get_next_token(ps, false);
    if(!t) {
        let a = new_element_with_text("a",
                                      {"class": "ag",
                                       "style": "width: " + link_text.length + "em;"},
                                      " " + link_text + " ");
        return [a];
    }
    let command = t.token.toLowerCase();

    if(command === "link") {
        return render_link_internal(ps, link_text)
    } else if(command === "system") {
        return render_link_system(ps, link_text)
    }
    
    let a = new_element_with_text("a",
                                  {"class": "ag",
                                   "style": "width: " + link_text.length + "em;"},
                                  " " + link_text + " ");
    return [a];
}

function render_link_internal(ps, link_text)
{
    let t = tbuf.get_next_token(ps, false);
    if(!t) {
        return null;
    }
    let name = t.token;
    let line = "";

    t = tbuf.get_next_token(ps, false);
    if(t) {
        line = t.token;
    }

    name = utils.str_strip_quote(name);

    let m = name.match(/(.*)\/([^/]+)/);
    let link = "javascript:void(0);";
    if(m) {
        let file = m[1];
        let node = m[2];
        
        link = file;

        let sp = new URLSearchParams(get_guide_url().search);
        let cur_parent_ref = sp.get("parent_ref");
        if(cur_parent_ref) {
            cur_parent_ref = decodeURI(cur_parent_ref)
            link = cur_parent_ref + "/" + link;
        }

        let file_split = file.split("/");
        if(cur_parent_ref) {
            link += "?parent_ref=" + encodeURI(cur_parent_ref);
        } else if(file_split.length > 1) {
            let dirs_split = file_split.slice(0, -1);
            let parent_split = dirs_split.map(() => { return ".." });
            let next_parent_ref = parent_split.join("/");
            if(next_parent_ref.length > 0) {
                link += "?parent_ref=" + encodeURI(next_parent_ref);
            }
        }
        link += "#" + node;
    } else {
        link = "#" + encodeURI(name);
    }

    let a = new_element_with_text("a",
                                  {"class": "ag",
                                   "href": link,
                                   "style": "width: " + link_text.length + "em;"},
                                  " " + link_text + " ");
    a.onclick = handle_click_link;
    const elems = [a];

    // Add tooltip if the link can't open naturally
    if(browser_is_firefox() && link.startsWith("file:///")) {
        a.classList.add("has-help");

        let div = new_element_with_text("div", {"class": "help fasthelp"},
                                        "Direct links to other local files are blocked in Firefox.  To open this link, right click, open in new tab, select the URL bar and press return.");
        elems.push(div);
    }

    return elems;
}

function render_link_system(ps, link_text)
{
    let t = tbuf.get_next_token(ps, false);
    if(!t) {
        return null;
    }

    let cmd = t.token;
    if(cmd == "" ||
       (cmd = utils.str_strip_quote(cmd)) == "") {
        return null;
    }
                 
    let ps2 = tbuf.new_tbuf(cmd);
    let t2 = tbuf.get_next_token(ps2, false);
    let link = "";

    let ados_cmd = t2.token.toLowerCase();
    if(ados_cmd == "openurl") {
        link = tbuf.get_next_token(ps2, false).token;
        let m = link.match(/^https?:\/\/|ftp:\/\//i)
        if(!m) {
            link = "http://" + link;
        }
    }

    let a = new_element_with_text("a",
                                  {"class": "ag",
                                   "href": link,
                                   "target": "_blank",
                                   "style": "width: " + link_text.length + "em;"},
                                  " " + link_text + " ");
    // a.onclick = handle_click_link;
    const elems = [a];

    return elems;
}

function browser_is_firefox()
{
    return navigator.userAgent.toLowerCase().includes("firefox");
}

function apply_style(render_state, cmd)
{
    if(render_state.style.indexOf(cmd) === -1) {
        render_state.style.push(cmd);
        render_state.style.sort();
    }

    return render_state.style.join(" ");
}

function remove_style(render_state, cmd)
{
    if(cmd[0] === "u") {
        render_state.style = render_state.style.filter((x) => {
            return x !== cmd[1];
        });
        render_state.style.sort();
    }

    return render_state.style.join(" ");
}

function apply_color(render_state, cmd, color)
{
    render_state.style = render_state.style.filter((x) => {
        return x.indexOf(cmd) !== 0;
    });
    render_state.style.push(cmd + "_" + color.token);
    render_state.style.sort();

    return render_state.style.join(" ");
}

function apply_pen(render_state, cmd, color)
{
    let fgOrBg = (cmd === "apen" ? "fg" : "bg");

    render_state.style = render_state.style.filter((x) => {
        return x.indexOf(fgOrBg) !== 0;
    });
    
    render_state.style.push(fgOrBg + "_pen_" + color.token);
    render_state.style.sort();

    return render_state.style.join(" ");
}

function new_node_tbuf(aguide, node)
{
    return tbuf.new_tbuf(aguide.text.slice(node.start, node.end));
}

function new_element(typ, attrs)
{
    let e = document.createElement(typ);
    for(const k in attrs) {
        e.setAttribute(k, attrs[k]);
    }
    return e;
}

function new_button(id, label, disabled, onclick)
{
    let b = new_element("button", {"type": "button",
                                   "class": "button",
                                   "id": id});
    b.textContent = label;
    b.disabled = disabled;
    if(onclick) {
        b.addEventListener("click", onclick, true);
    }
    return b;
}

function new_element_with_text(typ, attrs, txt)
{
    let e = new_element(typ, attrs);
    e.textContent = txt;
    return e;
}

function new_p(attrs, txt)
{
    let p = new_element("p", attrs);
    p.textContent = txt;
    return p;
}

function add_text(el, txt)
{
    el.appendChild(document.createTextNode(txt));
}

function append_children(el, children)
{
    for(const c in children) {
        el.appendChild(c);
    }
}

function toggle_about()
{
    let guide_div = document.getElementById("aguide");
    let about_div = document.getElementById("about");

    // if(typeof browser === "undefined") {
    //     var browser = chrome;
    // }

    if(about_div) {
        guide_div.removeChild(about_div);
        return;
    }

    let readme_guide = encodeURI(browser.runtime.getURL("README.guide"));

    about_div = new_element("div", {"class": "about", "id": "about"});
    about_div.appendChild(new_element_with_text("p", {"class": "center"},
                                                "AGuide Viewer"));
    about_div.appendChild(new_element_with_text("p", {"class": "center"},
                                                "Version " + browser.runtime.getManifest().version));
    about_div.appendChild(new_element_with_text("p", {"class": "center"},
                                                "Copyright 2023-2026 Robert Kidd"));
    let p = new_element("p", {"class": "center"});
    p.appendChild(
        new_element_with_text("a",
                              {"class": "ag",
                               "href": "aguide.html?guide=" + readme_guide,
                               "target": "_blank"},
                              "README.guide"));
    about_div.appendChild(p);
    about_div.appendChild(new_element_with_text("p", {}, "AGuide Viewer is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version."));
    about_div.appendChild(new_element_with_text("p", {}, "AGuide Viewer is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details."));
    p = new_element_with_text("p", {}, "You should have received a copy of the GNU General Public License along with AGuide Viewer. If not, see ")
    p.appendChild(new_element_with_text("a",
                                        {"href": "https://www.gnu.org/licenses/",
                                         "target": "_blank"},
                                        "https://www.gnu.org/licenses/"));
    p.appendChild(document.createTextNode("."))
    about_div.appendChild(p);
    let d = new_element("div", {"class": "center"});
    d.appendChild(new_button("button-about-ok", "OK", false,
                             () => {
                                 toggle_about();
                             }));
    about_div.appendChild(d);

    guide_div.appendChild(about_div);
}

function show_preferences()
{
    let guide_div = document.getElementById("aguide");
    let prefs_div = document.getElementById("prefs");
    
    if(prefs_div) {
        return;
    }

    about_div = new_element("div", {"class": "about prefs", "id": "prefs"});
    about_div.appendChild(new_element("iframe", {
        "class": "prefs",
        "src": browser.runtime.getURL("prefs.html"),
        "title": "Preferences"}));
    guide_div.appendChild(about_div);

    document.addEventListener("keyup", catch_escape);
}

function close_preferences()
{
    let guide_div = document.getElementById("aguide");
    let prefs_div = document.getElementById("prefs");

    if(prefs_div) {
        document.removeEventListener("keyup", catch_escape);
        guide_div.removeChild(prefs_div);
    }
}

function catch_escape(event)
{
    if(event.code === "Escape") {
        browser.runtime.sendMessage({method: "closePrefs"});
    }
}


/* text: utf-8 that was decoded as src_encoding
 * returns utf-8 decoded as dst_decoding
 * Build a 256 entry map mapping utf-8 => src_encoding.
 * Use map to construct original byte sequence
 * Decode original byte sequence as dst_encoding.
 */
function transcode_charset(text, src_encoding, dst_encoding)
{
    let utf_8_to_src = {};

    let dec = new TextDecoder(src_encoding);
    const ab = new ArrayBuffer(1);
    let dv = new DataView(ab);
    for(let i = 0; i < 256; ++i) {
        dv.setUint8(0, i);
        let utf_8 = dec.decode(dv);
        utf_8_to_src[utf_8[0]] = i;
    }

    const orig_text = new ArrayBuffer(text.length);
    dv = new DataView(orig_text);
    for(let i = 0; i < text.length; ++i) {
        const orig_char = utf_8_to_src[text[i]];
        dv.setUint8(i, orig_char);
    }

    dec = new TextDecoder(dst_encoding);
    return dec.decode(dv);
}

main();
