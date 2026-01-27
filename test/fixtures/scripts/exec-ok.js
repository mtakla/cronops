import assert from "node:assert";
console.log(process.env);
console.log("SHOULD PASS!");
assert(process.env.CROPS_DRY_RUN === "false");
process.exit(0);