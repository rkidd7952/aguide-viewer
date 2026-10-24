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
