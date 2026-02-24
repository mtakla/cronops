import assert from "node:assert";
console.log(process.env);
console.log("SHOULD PASS!");
assert(process.env.PATH);
assert(process.env.CROPS_TEST === "true");
process.exit(0);