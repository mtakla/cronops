import fsx from "fs-extra";
import assert from "node:assert"; 
console.log(process.argv);
assert(fsx.pathExistsSync(process.argv[2]));  // source file should exist!
console.log("SHOULD PASS!");
