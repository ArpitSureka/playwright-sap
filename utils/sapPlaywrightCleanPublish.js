// const fs = require('fs');
// const path = require('path');
// const packlist = require("npm-packlist");
// const { fileURLToPath }  = require("url");
// const { Arborist }  = require("@npmcli/arborist");


import fs from "fs";
import path from "path";
import packlist from "npm-packlist";
import { fileURLToPath } from "url";
import Arborist from "@npmcli/arborist";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEST_DIR = path.join(__dirname, "../publish/");

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR);
}

function copyFile(inputPath, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(inputPath, outputPath);
}


export async function copyRespectingNpmignore(modulePath, outputPath) {
  const arborist = new Arborist({ path: modulePath });
  await arborist.loadActual().then((tree) => {
    packlist(tree).then((files) => {
      for (const fileRelPath of files) {
        const srcFile = path.join(modulePath, fileRelPath);
        const destFile = path.join(outputPath, fileRelPath);
        
        copyFile(srcFile, destFile);
      }
    });
  });
}


