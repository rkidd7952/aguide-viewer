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

export function str_strip_quote(s)
{
    return str_translate(s, [{from: /^"/g, to: ""},
                             {from: /"$/g, to: ""}]);
}

export function str_translate(s, trs)
{
    trs.forEach((tr) => {
        s = s.replaceAll(tr.from, tr.to);
    });
    return s;
}
