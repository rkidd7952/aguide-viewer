import * as utils from "../utils.js";
import assert from "node:assert";

describe("str_strip_quote", function (){
    it("should strip quotes", function (){
        assert.equal(utils.str_strip_quote("\"text\""), "text");
    });
});

describe("str_translate", function (){
    it("should translate one", function (){
        assert.equal(utils.str_translate("abcdefg", [{from: /abc/g, to: "123"}]),
                     "123defg");
    });
    it("should translate two", function (){
        assert.equal(utils.str_translate("abcdefg", [{from: /abc/g, to: "123"},
                                                     {from: /efg/g, to: "456"}]),
                     "123d456");
    });
});
