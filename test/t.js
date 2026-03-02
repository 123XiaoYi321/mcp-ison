const parser = require('ison-parser');
console.log(Object.keys(parser));

try {
    const isonStr = parser.dumps({ users: [{ id: 1 }] });
    console.log("dumps result:", isonStr);
} catch (e) {
    console.error("dumps error:", e);
}

try {
    const isonStr = parser.stringify({ users: [{ id: 1 }] });
    console.log("stringify result:", isonStr);
} catch (e) {
    console.error("stringify error:", e);
}
