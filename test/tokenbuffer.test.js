import * as tbuf from "../tokenbuffer.js";
import assert from "node:assert";

describe("get_next_token", function (){
    it("returns tokens", function (){
        var ps = tbuf.new_tbuf("here's some    \"text\"");
        var t1 = tbuf.get_next_token(ps, false);
        assert.equal(t1.token, "here's");
        var t2 = tbuf.get_next_token(ps, false);
        assert.equal(t2.token, "some");

        assert.equal(tbuf.at_eof(ps), false);

        var t3 = tbuf.get_next_token(ps, false);
        assert.equal(t3.token, "\"text\"");

        assert.equal(tbuf.at_eof(ps), true);
    });

    it("can peek", function (){
        var ps = tbuf.new_tbuf("here's some    \"text\"");
        var t1 = tbuf.get_next_token(ps, true);
        assert.equal(t1.token, "here's");
        var t2 = tbuf.get_next_token(ps, true);
        assert.equal(t2.token, "here's");
        tbuf.tbuf_consume_token(ps, t2);
        var t3 = tbuf.get_next_token(ps, false);
        assert.equal(t3.token, "some");
    });

    it("can slice", function (){
        var ps = tbuf.new_tbuf("here's some    \"text\"");
        var t1 = tbuf.tbuf_slice(ps, 1, 3, true);
        assert.equal(t1, "er");
        var t2 = tbuf.tbuf_slice(ps, 1, 3, false);
        assert.equal(t2, "er");
        var t3 = tbuf.get_next_token(ps, false);
        assert.equal(t3.token, "e's");
    });

    it("can search", function (){
        var ps = tbuf.new_tbuf("here's some    \"text\"");
        var t1 = tbuf.tbuf_search_token(ps, /.om./, false);
        assert.equal(t1.token, "some");
    });

    it("can translate", function (){
        var ps = tbuf.new_tbuf("abcdefg");
        var ps2 = tbuf.tbuf_translate(ps, [{from: /abc/g, to: "123"},
                                           {from: /efg/g, to: "456"}]);
        var t1 = tbuf.get_next_token(ps2, false);
        assert.equal(t1.token, "123d456");
    });
});
