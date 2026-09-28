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
