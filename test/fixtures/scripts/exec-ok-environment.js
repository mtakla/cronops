import assert from "node:assert";
console.log("SHOULD PASS!");
assert(process.env.CRONOPS_TEST_ENV === "foo");
