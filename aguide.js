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

function main()
{
    init_page(true);

    let params = new URLSearchParams(window.location.search);
    let guideEnc = params.get("guide");
    let storage_name_enc = params.get("storage");
    if(guideEnc) {
        let guide = decodeURI(guideEnc);
        console.log("guide = " + guide);
        if(guide.indexOf("http") === 0 || guide.indexOf("file") === 0) {
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
        if(typeof browser === "undefined") {
            var browser = chrome;
        }

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
    if(guideEnc) {
        return new URL(decodeURI(guideEnc));
    }
    return new URL(window.location);
}

function init_page(show_open)
{
    let b = document.getElementsByTagName("body");
    let body = null;

    if(b.length > 1) {
        body = b[0];
    } else {
        body = document.createElement("body");
        document.body = body;
    }
    
    body.innerHTML = `<div>
  <div class="toolbar" id="toolbar">` +
        (show_open ? `<input type="file" id="open-file"/><button type="button" class="button" id="button-open">Open File...</button>` : ``) + `
    <button type="button" class="button" id="button-contents" disabled="true">Contents</button>
    <button type="button" class="button" id="button-index" disabled="true">Index</button>
    <button type="button" class="button" id="button-help" disabled="true">Help</button>
    <button type="button" class="button" id="button-retrace" disabled="true">Retrace</button>
    <button type="button" class="button" id="button-browse-prev" disabled="true">Browse &lt;</button>
    <button type="button" class="button" id="button-browse-next" disabled="true">Browse &gt;</button>
  </div>

  <div id="aguide" class="aguide">
  </div>
</div>`;

    document.getElementById("open-file").addEventListener(
        "change", read_input, false);

    document.getElementById("button-open").onclick = () => {
        document.getElementById("open-file").click();
    };

    document.getElementById("button-retrace").onclick = () => {
        history.go(-1);
    };

    // &nbsp;|&nbsp;
    // <input type="checkbox" class="checkbox" id="fixed-width-font" checked="true">Fixed width font</input>
    // document.getElementById("fixed-width-font").onclick = () => {
    //     var cb = document.getElementById("fixed-width-font");
    //     var b = document.getElementsByTagName("body")[0];
    //     if(cb.checked) {
    //         b.style.fontFamily = "monospace";
    //     } else {
    //         b.style.fontFamily = "initial";
    //     }
    // };

    addEventListener("popstate", handle_popstate);
    addEventListener("hashchange", display_node_hash);
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
    return new_aguide(new_tbuf(text)) !== null;
}

function process_input(text, filename, encoding)
{
    if(encoding && encoding != "") {
        let transcoded = transcode_charset(text, encoding, 'iso-8859-1');
        text = transcoded;
    }

    let ps = new_tbuf(text);
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
        { cmd: "@remark", handler: finish_cmd_remark }
    ];

    let e = true;
    while(aguide && !at_eof(ps) && e === true) {
        let token = tbuf_search_token(ps, /^@\S+/m, false);
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
    let token = get_next_token(ps, false);
    if(!token || token.token.toLowerCase() !== "@database") {
        return null;
    }

    console.info("Reading AmigaGuide: found @database");

    let db_name = get_next_token(ps, false);
    if(!db_name) {
        return null;
    }
    return {
        database: db_name.token,
        text: ps.text,
        nodes: []
    };
}

/* token is @master, parse path
 * Return true on success, false on error */
function finish_cmd_master(ps, token, aguide)
{
    let path = get_next_token(ps, false);
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

    let name = get_next_token(ps, false);
    if(!name) {
        return false;
    }
    node.name = str_strip_quote(name.token.toLowerCase());

    console.log("node name " + node.name);

    let title = tbuf_search_token(ps, /.*$/m, false);
    if(title) {
        node.title = str_strip_quote(title.token.trim());
    }
    node.start = title.end;

    token = tbuf_search_token(ps, /^@endnode/mi, false);

    if(!token) {
        return false;
    }

    node.end = token.start;
    node.end_cmd = token.end;

    let en_name = get_next_token(ps, true);
    if(en_name && en_name.token.toLowerCase()[0] != "@") {
        tbuf_consume_token(ps, en_name);
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
    let index = get_next_token(ps, false);
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
    let eol = tbuf_search_token(ps, /$/m, false);
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
    document.getElementById("button-contents").disabled = (name === toc.name);

    set_button_link(document.getElementById("button-browse-next"),
                    find_node_next(AG, name));
    set_button_link(document.getElementById("button-browse-prev"),
                    find_node_prev(AG, name));

    document.title = get_title(AG, n);
    let div = document.getElementById("aguide");
    div.innerHTML = html;
}

/* Translate amiga guide node to HTML */
function render_html(aguide, node)
{
    let html = "";

    let ps = new_node_tbuf(aguide, node);

    const cmd_handlers = [
        { cmd: "@toc", handler: handle_toc_next_prev },
        { cmd: "@next", handler: handle_toc_next_prev },
        { cmd: "@prev", handler: handle_toc_next_prev }
    ];
    
    let ps2 = tbuf_translate(ps,
                             [{from: "<", to: "&lt;"},
                              {from: ">", to: "&gt;"},
                              {from: "\n", to: "<br>"}]);
    let render_state = {
        style: []
    };

    while(!at_eof(ps2)) {
        console.info("pos: " + ps2.pos);

        let c = tbuf_search_token(ps2, /[\\@]/, true);
        if(!c) {
            html += tbuf_slice(ps2, ps2.pos, -1, false);
            break;
        }

        html += tbuf_slice(ps2, 0, c.start - ps2.pos, false);

        if(c.token === "\\") { /* escape */
            /* Skip backslash, emit next char */
            html += tbuf_slice(ps2, 1, 2, false);
        } else if(c.token === "@") { /* start cmd */
            let brace = tbuf_search_token(ps2, /^@{[^}]*}/, true);
            if(brace) {
                tbuf_consume_token(ps2, brace);
                let cmd = brace.token.slice(2, -1);
                console.log("handle @{" + cmd + "}");
                html += render_brace_cmd(aguide, cmd, render_state);
            } else {
                let t = get_next_token(ps2, false);
                let cmd = t.token.toLowerCase();
                let cmd_handler = get_handler(cmd_handlers, cmd);
                console.log("handle cmd " + cmd);
                if(cmd_handler) {
                    html += cmd_handler(aguide, node, cmd, ps2);
                } else {
                    html += t.token;
                }
            }
        }
    }

    /* Convert any space chars at the beginning of a line to non-breaking */
    html = html.replaceAll(/(<br>(?:<\/?span[^>]*>)*)( +)/gm,
                           (match, p1, p2, offset, string) => {
                               let r = p1;
                               for(let i = 0; i < p2.length; ++i) {
                                   r += "&nbsp;";
                               }
                               return r;
                           });

    return html;
}

function handle_toc_next_prev(aguide, node, cmd, ps)
{
    let t = get_next_token(ps, false);
    let n = str_strip_quote(t.token.toLowerCase());
    if(cmd === "@toc") {
        node.toc = n;
    } else if(cmd === "@next") {
        node.next = n;
    } else if(cmd === "@prev") {
        node.prev = n;
    }
    return "";
}

function render_brace_cmd(aguide, cmd, render_state)
{
    const orig = "@{" + cmd + "}";
    let ps = new_tbuf(cmd);
    let t = get_next_token(ps, false);
    if(!t) {
        return orig;
    }

    let tlc = t.token.toLowerCase();
    if(tlc === "b" || tlc === "i" || tlc === "u") {
        let html = render_state.style.length > 0 ? "</span>" : "";
        let cls = apply_style(render_state, tlc);
        if(cls) {
            html += "<span class=\"" + cls + "\">";
        }
        return html;
    } else if(tlc === "ub" || tlc === "ui" || tlc === "uu") {
        let html = render_state.style.length > 0 ? "</span>" : "";
        let cls = remove_style(render_state, tlc);
        if(cls) {
            html += "<span class=\"" + cls + "\">";
        }
        return html;
    } else if(tlc === "fg" || tlc === "bg") {
        let color = get_next_token(ps, false);
        if(color) {
            let html = render_state.style.length > 0 ? "</span>" : "";
            let cls = apply_color(render_state, tlc, color);
            if(cls) {
                html += "<span class=\"" + cls + "\">";
            }
            return html;
        }
    } else {
        let html = render_link(ps, t.token);
        if(!html) {
            return orig;
        }
        return html;
    }

    return orig;
}

function render_link(ps, link_text)
{
    link_text = str_strip_quote(link_text);
    let link_text_len = link_text.length;
    link_text = str_translate(link_text,
                              [{from: " ", to: "&nbsp;"}]);

    let t = get_next_token(ps, false);
    if(!t) {
        return null;
    }
    let command = t.token.toLowerCase();

    if(command === "link") {
        t = get_next_token(ps, false);
        if(!t) {
            return null;
        }
        let name = t.token;
        let line = "";

        t = get_next_token(ps, false);
        if(t) {
            line = t.token;
        }

        name = str_strip_quote(name);

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

        let a = document.createElement("a");
        a.className = "ag";
        a.href = link;
        a.onclick = handle_click_link;
        a.innerHTML = link_text;
        a.style = "width: " + link_text_len + "em;";
        return a.outerHTML;
    }

    return null;
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

function new_node_tbuf(aguide, node)
{
    return new_tbuf(aguide.text.slice(node.start, node.end));
}

/******* token buf functions *******/
function new_tbuf(text)
{
    return { text: text, pos: 0 }
}

function tbuf_fork(ps)
{
    return new_tbuf(ps.text.slice(ps.pos))
}

function at_eof(ps)
{
    return ps.pos >= ps.text.length
}

/* peek: if true, don't update parse state */
function get_next_token(ps, peek)
{
    let pos = ps.pos;

    /* skip to first not-whitespace */
    let next_ws = ps.text.slice(pos).search(/\S/);
    if(next_ws === -1) {
        return null;
    }

    pos += next_ws;

    let begins_line = false;
    if(pos > 0 && ps.text[pos - 1] == '\n') {
        begins_line = true;
    }

    let next_re = /\s/;
    let quoted = 0;
    /* If current char is double quote, token is all text up to matching
     * quote. */
    if(ps.text[pos] === '"') {
        next_re = /"/;
        quoted = 1;
    }

    let next = ps.text.slice(pos + quoted).search(next_re);
    if(next === -1) {
        /* token is all text to end */
        let token = ps.text.slice(pos);
        let end = pos + token.length;
        if(peek === false) {
            tbuf_consume_to(ps, end);
        }
        return new_token(token, pos, end, begins_line);
    }

    next += quoted * 2;
    let token = ps.text.slice(pos, pos + next);
    let end = pos + next;
    if(peek === false) {
        tbuf_consume_to(ps, end);
    }
    return new_token(token, pos, end, begins_line);
}

function new_token(token, start, end, begins_line)
{
    return { token: token, start: start, end: end, begins_line: begins_line };
}

function tbuf_slice(ps, start, end, peek)
{
    if(end !== -1) {
        let t = ps.text.slice(ps.pos + start, ps.pos + end);
        if(peek === false) {
            tbuf_consume_to(ps, ps.pos + end);
        }
        return t;
    }
    let t = ps.text.slice(ps.pos);
    if(peek === false) {
        tbuf_consume_to(ps, ps.pos + t.length);
    }
    return t;
}

function tbuf_search_token(ps, re, peek)
{
    let pos = ps.pos;
    let start = ps.text.slice(pos).search(re);
    if(start === -1) {
        return null;
    }

    let token = ps.text.slice(pos).match(re);
    if(token.length <= 0) {
        return null;
    }
    let end = pos + start + token[0].length;

    if(peek === false) {
        tbuf_consume_to(ps, end);
    }

    return new_token(token[0], pos + start, end, false);
}

function tbuf_consume_token(ps, token)
{
    ps.pos = token.end;
}

/* end: absolute position in tbuf to consume to */
function tbuf_consume_to(ps, end)
{
    ps.pos = end;
}

/* trs: array of objects {from: x, to: y}
 *      x: string or regex to replace
 *      y: replacement */
function tbuf_translate(ps, trs)
{
    let ps2 = tbuf_fork(ps);
    ps2.text = str_translate(ps2.text, trs);
    return ps2;
}

function str_translate(s, trs)
{
    trs.forEach((tr) => {
        s = s.replaceAll(tr.from, tr.to);
    });
    return s;
}

function str_strip_quote(s)
{
    return str_translate(s, [{from: /^"/g, to: ""},
                             {from: /"$/g, to: ""}]);
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
