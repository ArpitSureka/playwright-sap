#!/usr/bin/env node
/**
 * Copyright (c) Arpit Sureka.
 * Orignal Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// @ts-check

/**
 * Use the following command to typescheck this file:
 * npx tsc --target es2020  --watch --checkjs --noemit --moduleResolution node workspace.js
 */
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { copyRespectingNpmignore } = require('../utils/sapPlaywrightCleanPublish');
// const { processObfuscationAllModules }  = require('../utils/sapObfuscate'); // processDirectory(SOURCE_DIR, DEST_DIR);

const readJSON = async (filePath) => JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
const writeJSON = async (filePath, json) => {
  await fs.promises.writeFile(filePath, JSON.stringify(json, null, 2) + '\n');
}


if (!fs.existsSync(path.join(__dirname, '../publish/playwright-sap'))) {
  fs.mkdirSync(path.join(__dirname, '../publish/playwright-sap'), { recursive: true });
}

if (!fs.existsSync(path.join(__dirname, '../publish/playwright-sap-core'))) {
  fs.mkdirSync(path.join(__dirname, '../publish/playwright-sap-core'), { recursive: true });
}

if (!fs.existsSync(path.join(__dirname, '../publish/playwright-sap-test'))) {
  fs.mkdirSync(path.join(__dirname, '../publish/playwright-sap-test'), { recursive: true });
}
const ROOT_PATH_Temp = path.join(__dirname, '../publish/');

fs.copyFileSync(path.join(ROOT_PATH_Temp, '../package.json'), path.join(ROOT_PATH_Temp, 'package.json'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../package-lock.json'), path.join(ROOT_PATH_Temp, 'package-lock.json'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../NOTICE'), path.join(ROOT_PATH_Temp, 'NOTICE'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../LICENSE'), path.join(ROOT_PATH_Temp, 'LICENSE'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../README.md'), path.join(ROOT_PATH_Temp, 'README.md'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../packages/playwright/package.json'), path.join(ROOT_PATH_Temp, 'playwright-sap/package.json'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../packages/playwright-core/package.json'), path.join(ROOT_PATH_Temp, 'playwright-sap-core/package.json'));
fs.copyFileSync(path.join(ROOT_PATH_Temp, '../packages/playwright-test/package.json'), path.join(ROOT_PATH_Temp, 'playwright-sap-test/package.json'));


class PWPackage {
  constructor(descriptor) {
    this.name = descriptor.name;
    this.path = descriptor.path;
    this.files = descriptor.files;
    this.packageJSONPath = path.join(this.path, 'package.json');
    this.packageJSON = JSON.parse(fs.readFileSync(this.packageJSONPath, 'utf8'));
    this.isPrivate = !!this.packageJSON.private;
  }
}

class Workspace {
  /**
   * @param {string} rootDir
   * @param {PWPackage[]} packages
   */
  constructor(rootDir, packages) {
    this._rootDir = rootDir;
    this._packages = packages;
  }

  /**
   * @returns {PWPackage[]}
   */
  packages() {
    return this._packages;
  }

  async version() {
    const workspacePackageJSON = await readJSON(path.join(this._rootDir, 'package.json'));
    return workspacePackageJSON.version;
  }

  /**
   * @param {string} version
   */
  async setVersion(version) {
    if (version.startsWith('v'))
      throw new Error('version must not start with "v"');

    // 1. update workspace's package.json (playwright-internal) with the new version
    const workspacePackageJSON = await readJSON(path.join(this._rootDir, 'package.json'));
    workspacePackageJSON.version = version;
    // workspacePackageJSON.repository = {};
    // Upate this url to point to the documentation.
    // workspacePackageJSON.homepage = 'https://github.com/microsoft/playwright/graphs/contributors';
    // workspacePackageJSON.author = {name: 'Arpit Sureka'};
    await writeJSON(path.join(this._rootDir, 'package.json'), workspacePackageJSON);
    // 2. make workspace consistent.
    await this.ensureConsistent();
  }

  async ensureConsistent() {
    let hasChanges = false;

    const maybeWriteJSON = async (jsonPath, json) => {
      const oldJson = await readJSON(jsonPath);
      if (JSON.stringify(json) === JSON.stringify(oldJson))
        return;
      hasChanges = true;
      console.warn('Updated', jsonPath);
      await writeJSON(jsonPath, json);
    };

    const workspacePackageJSON = await readJSON(path.join(this._rootDir, 'package.json'));
    const packageLockPath = path.join(this._rootDir, 'package-lock.json');
    const packageLock = JSON.parse(await fs.promises.readFile(packageLockPath, 'utf8'));
    const version = workspacePackageJSON.version;

    // Make sure package-lock version is consistent with root package.json version.
    packageLock.version = version;
    packageLock.packages[""].version = version;

    for (const pkg of this._packages) {
      // 1. Copy package files.
      for (const file of pkg.files) {
        const fromPath = path.join(this._rootDir, file);
        const toPath = path.join(pkg.path, file);
        await fs.promises.mkdir(path.dirname(pkg.path), { recursive: true });
        await fs.promises.copyFile(fromPath, toPath);
      }

      // 2. Make sure package's package.jsons are consistent.
      if (!pkg.isPrivate) {
        pkg.packageJSON.version = version;
        pkg.packageJSON.repository = workspacePackageJSON.repository;
        pkg.packageJSON.engines = workspacePackageJSON.engines;
        pkg.packageJSON.homepage = workspacePackageJSON.homepage;
        pkg.packageJSON.author = workspacePackageJSON.author;
        pkg.packageJSON.license = workspacePackageJSON.license;
      }

      if(!pkg.packageJSON.name.includes('sap')) {
        pkg.packageJSON.name = pkg.packageJSON.name.replace('playwright', 'playwright-sap');
        console.log(`Updated package name for ${pkg.name} to ${pkg.packageJSON.name}`);
      }

      for (const [dependency, version] of Object.entries(pkg.packageJSON.dependencies || {})) {
        if (dependency.includes('playwright') && !dependency.includes('sap')) {
          pkg.packageJSON.dependencies[dependency.replace('playwright', 'playwright-sap')] = version;
          delete pkg.packageJSON.dependencies[dependency];
        }
      }


      for (const otherPackage of this._packages) {
        if (pkg.packageJSON.dependencies && pkg.packageJSON.dependencies[otherPackage.name])
          pkg.packageJSON.dependencies[otherPackage.name] = version;
        if (pkg.packageJSON.devDependencies && pkg.packageJSON.devDependencies[otherPackage.name])
          pkg.packageJSON.devDependencies[otherPackage.name] = version;
      }
      for (const [dependency, version] of Object.entries(pkg.packageJSON.dependencies || {})) {
        if (dependency.includes('playwright-sap')) {
          pkg.packageJSON.dependencies[dependency.replace('playwright-sap', 'playwright')] = `npm:${dependency}@${version}`;
          delete pkg.packageJSON.dependencies[dependency];
        }
      }

      await maybeWriteJSON(pkg.packageJSONPath, pkg.packageJSON);
    }

    // Re-run npm i to make package-lock dirty.
    child_process.execSync('npm i', {
      env: {
        ...process.env,
        // Playwright would download the browsers because it has e.g. @playwright/browser-chromium or playwright-chromium
        // in the workspace. We don't want to download browsers here.
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
      }
    });
    return hasChanges;
  }
}

const ROOT_PATH = path.join(__dirname, '../publish');
const LICENCE_FILES = ['NOTICE', 'LICENSE'];
const workspace = new Workspace(ROOT_PATH, [
  new PWPackage({
    name: 'playwright-sap',
    path: path.join(ROOT_PATH, 'playwright-sap'),
    // We copy README.md additionally for playwright so that it looks nice on NPM.
    files: [...LICENCE_FILES, 'README.md'],
  }),
  new PWPackage({
    name: 'playwright-sap-core',
    path: path.join(ROOT_PATH, 'playwright-sap-core'),
    files: LICENCE_FILES,
  }),
  new PWPackage({
    name: 'playwright-sap-test',
    path: path.join(ROOT_PATH, 'playwright-sap-test'),
    // We copy README.md additionally for @playwright/test so that it looks nice on NPM.
    files: [...LICENCE_FILES, 'README.md'],
  })
]);

if (require.main === module) {
  parseCLI();
} else {
  module.exports = {workspace};
}

function die(message, exitCode = 1) {
  console.error(message);
  process.exit(exitCode);
}

async function parseCLI() {
  const commands = {
    '--ensure-consistent': async () => {
      const hasChanges = await workspace.ensureConsistent();
      if (hasChanges)
        die(`\n  ERROR: workspace is inconsistent! Run '//utils/workspace.js --ensure-consistent' and commit changes!`);
      // Ensure lockfileVersion is 3
      const packageLock = require(ROOT_PATH +  '/package-lock.json');
      if (packageLock.lockfileVersion !== 3)
        die(`\n  ERROR: package-lock.json lockfileVersion must be 3`);
    },
    '--list-public-package-paths': () => {
      for (const pkg of workspace.packages()) {
        if (!pkg.isPrivate)
          console.log(pkg.path);
      }
    },
    '--copy-respecting-npmignore': async () => {
        fs.rmSync(ROOT_PATH, { recursive: true, force: true });
        if (!fs.existsSync(path.join(__dirname, '../publish/playwright-sap'))) {
          fs.mkdirSync(path.join(__dirname, '../publish/playwright-sap'), { recursive: true });
        }
        if (!fs.existsSync(path.join(__dirname, '../publish/playwright-sap-core'))) {
          fs.mkdirSync(path.join(__dirname, '../publish/playwright-sap-core'), { recursive: true });
        }
        if (!fs.existsSync(path.join(__dirname, '../publish/playwright-sap-test'))) {
          fs.mkdirSync(path.join(__dirname, '../publish/playwright-sap-test'), { recursive: true });
        }
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../package.json'), path.join(ROOT_PATH_Temp, 'package.json'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../package-lock.json'), path.join(ROOT_PATH_Temp, 'package-lock.json'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../NOTICE'), path.join(ROOT_PATH_Temp, 'NOTICE'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../LICENSE'), path.join(ROOT_PATH_Temp, 'LICENSE'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../README.md'), path.join(ROOT_PATH_Temp, 'README.md'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../packages/playwright/package.json'), path.join(ROOT_PATH_Temp, 'playwright-sap/package.json'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../packages/playwright-core/package.json'), path.join(ROOT_PATH_Temp, 'playwright-sap-core/package.json'));
        fs.copyFileSync(path.join(ROOT_PATH_Temp, '../packages/playwright-test/package.json'), path.join(ROOT_PATH_Temp, 'playwright-sap-test/package.json'));
        copyRespectingNpmignore('packages/playwright-core', 'publish/playwright-sap-core');
        copyRespectingNpmignore('packages/playwright', 'publish/playwright-sap');
        copyRespectingNpmignore('packages/playwright-test', 'publish/playwright-sap-test');
    },
    // Stopping this.
    // '--obfuscate': async () =>  {
    //   await processObfuscationAllModules();
    //   console.log("✅ Obfuscation (with npmignore respected) complete.");
    // },
    '--get-version': async (version) => {
      console.log(await workspace.version());
    },
    '--set-version': async (version) => {
        // await workspace.updatePackageName();
        // await new Promise(r => setTimeout(r, 4000));
      if (!version)
        die('ERROR: Please specify version! e.g. --set-version 1.99.2');
      await workspace.setVersion(version);
    },
    '--help': () => {
      console.log([
        `Available commands:`,
        ...Object.keys(commands).map(cmd => '  ' + cmd),
      ].join('\n'));
    },
  };
  
  const handler = commands[process.argv[2]];
  if (!handler)
    die('ERROR: wrong usage! Run with --help to list commands');
  await handler(process.argv[3]);
}
