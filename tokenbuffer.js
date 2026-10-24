/*
  Copyright 2026 Robert Kidd

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

/******* token buf functions *******/

var utils;
import("./utils.js").then((i) => utils = i);

export function new_tbuf(text)
{
    return { text: text, pos: 0 }
}

function tbuf_fork(ps)
{
    return new_tbuf(ps.text.slice(ps.pos))
}

export function at_eof(ps)
{
    return ps.pos >= ps.text.length
}

/* peek: if true, don't update parse state */
export function get_next_token(ps, peek)
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

export function tbuf_slice(ps, start, end, peek)
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

export function tbuf_search_token(ps, re, peek)
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

export function tbuf_consume_token(ps, token)
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
export function tbuf_translate(ps, trs)
{
    let ps2 = tbuf_fork(ps);
    ps2.text = utils.str_translate(ps2.text, trs);
    return ps2;
}
