// const fs = require("fs");
// const path = require("path");
// const obfuscator = require("javascript-obfuscator");

// import fs from "fs";
// import path from "path";
// import obfuscator from "javascript-obfuscator";
// import packlist from "npm-packlist";
// import { fileURLToPath } from "url";
// import Arborist from "@npmcli/arborist";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const DEST_DIR = path.join(__dirname, "../publish/obfuscated");
// if (!fs.existsSync(DEST_DIR)) {
//   fs.mkdirSync(DEST_DIR);
// }
// const SOURCE_DIR = path.join(__dirname, "../publish/clean");
// // const DEST_DIR = path.resolve(__dirname, "dist-modules");

// //**
// //Stopped using this code  
// // */
// // /// Stopped using this code

// const obfuscatorOptions = {
//   /// High Setting
//   //   compact: true,
//   //   controlFlowFlattening: true,
//   //   controlFlowFlatteningThreshold: 1,
//   //   deadCodeInjection: true,
//   //   deadCodeInjectionThreshold: 1,
//   //   disableConsoleOutput: true,
//   //   identifierNamesGenerator: "hexadecimal",
//   //   numbersToExpressions: true,
//   //   renameGlobals: true,
//   //   selfDefending: true,
//   //   simplify: true,
//   //   splitStrings: true,
//   //   splitStringsChunkLength: 5,
//   //   stringArray: true,
//   //   stringArrayEncoding: ["rc4"],
//   //   stringArrayThreshold: 1,
//   //   transformObjectKeys: true,
//   //   unicodeEscapeSequence: false,

//   compact: true,
//   controlFlowFlattening: false, // set to true if you're okay with performance hit
//   deadCodeInjection: true,
//   deadCodeInjectionThreshold: 0.3, // partial injection
//   identifierNamesGenerator: "hexadecimal",
//   renameGlobals: false, // true only if you're okay with global scope being touched
//   selfDefending: true, // protects against beautifiers/debuggers
//   simplify: true,
//   splitStrings: true,
//   splitStringsChunkLength: 10,
//   stringArray: true,
//   stringArrayEncoding: ["base64"], // not as heavy as rc4
//   stringArrayThreshold: 0.75,
//   transformObjectKeys: true,
//   ignoreRequireImports: true,
//   target: 'node',

//   sourceMap: false,
//   sourceMapMode: "separate",
//   sourceMapBaseUrl: "",
//   sourceMapFileName: "",
//   banner: `/*!
//  * © 2025 Arpit Sureka
//  * Licensed for personal/internal use only.
//  * Commercial use and reverse engineering are strictly prohibited.
//  */`,
// };

// function obfuscateFile(inputPath, outputPath) {
//   copyFile(inputPath, outputPath)
//   // const code = fs.readFileSync(inputPath, "utf8");
//   // const obfuscatedCode = obfuscator
//   //   .obfuscate(code, obfuscatorOptions)
//   //   .getObfuscatedCode();
//   // fs.mkdirSync(path.dirname(outputPath), { recursive: true });
//   // fs.writeFileSync(outputPath, obfuscatedCode, "utf8");
// }

// function copyFile(inputPath, outputPath) {
//   fs.mkdirSync(path.dirname(outputPath), { recursive: true });
//   fs.copyFileSync(inputPath, outputPath);
// }

// // export async function processDirectoryObfuscation(currentDir, targetDir) {
// // //   const entries = fs.readdirSync(currentDir, { withFileTypes: true });
// //     const files = await packlist({ path: modulePath });
// //   for (const entry of entries) {
// //     const srcPath = path.join(currentDir, entry.name);
// //     const destPath = path.join(targetDir, entry.name);

// //     if (entry.isDirectory()) {
// //       processDirectoryObfuscation(srcPath, destPath);
// //     } else if (entry.name.endsWith(".js")) {
// //       obfuscateFile(srcPath, destPath);
// //     } else if (entry.name.endsWith(".d.ts") || entry.name.endsWith(".json")) {
// //       copyFile(srcPath, destPath); // Don't obfuscate .d.ts or .json
// //     } else if (entry.name.endsWith(".ts")) {
// //       obfuscateFile(srcPath, destPath);
// //     } else {
// //       copyFile(srcPath, destPath); // Don't obfuscate other files
// //     }
// //   }
// //   console.log("✅ Obfuscation complete.");
// // }

// async function processModule(modulePath, outputPath) {
//   // console.log(1, modulePath);
//   //   const files = await packlist({ path: modulePath });
//   const ends = new Set();
//   const arborist = new Arborist({ path: modulePath });
//   await arborist.loadActual().then((tree) => {
//     packlist(tree).then((files) => {
//         // console.log(files);
//       for (const fileRelPath of files) {
//         const srcFile = path.join(modulePath, fileRelPath);
//         const destFile = path.join(outputPath, fileRelPath);
        
//         ends.add(fileRelPath.split('.').slice(1).join("."));
//         if( fileRelPath.startsWith("node_modules/") ) {
//           copyFile(srcFile, destFile);
//         } else if (fileRelPath.startsWith("test/") || fileRelPath.startsWith("tests/") || !fileRelPath.includes('/')) {
//           // Don't obfuscate test files or files in the root directory
//           copyFile(srcFile, destFile);
//         } else if (fileRelPath.endsWith(".js")) {
//           obfuscateFile(srcFile, destFile);
//         } else if ( fileRelPath.endsWith(".js.map") ) {
//             // Ignore .js.map file if u wanna know check what .js.map file are
//         } else if ( fileRelPath.endsWith(".d.ts") || fileRelPath.endsWith(".json") || fileRelPath.endsWith("")) {
//           copyFile(srcFile, destFile); // .d.ts, .json
//         } else if (fileRelPath.endsWith(".ts")) {
//           obfuscateFile(srcFile, destFile);
//         } else {
//           copyFile(srcFile, destFile); //  others
//         }
//       }
//       console.log(1, ends);
//     });
//     console.log(ends);
//   });
// }

// // Example: For all modules in custom-modules/
// export async function processObfuscationAllModules() {
//   const modules = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
//   for (const mod of modules) {
//     if (mod.isDirectory()) {
//     //   console.log("mod", mod);
//       await processModule(
//         path.join(SOURCE_DIR, mod.name),
//         path.join(DEST_DIR, mod.name)
//       );
//     }
//   }
// }

// // // Start processing
// // processDirectoryObfuscation(SOURCE_DIR, DEST_DIR);
// // console.log("✅ Obfuscation complete.");
