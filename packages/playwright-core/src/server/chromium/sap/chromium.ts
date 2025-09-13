/**
 * Copyright (c) Arpit Sureka.
 * Orignal Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'fs';
import * as path from 'path';

import type * as types from '../../types';

/**
 * pinUI5ExtensionByUpdatingPreferences
 *
 * @param userDir Path to the file (no extension required)
 */
export async function pinUI5ExtensionByUpdatingPreferences(userDir: string): Promise<void> {
  try {
    const filePath = userDir + '/Default/Preferences';

    if (fs.existsSync(filePath))
      return;

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

    await fs.promises.copyFile('./Preferences', filePath);

    // console.log(`✅ DevTools JSON written/updated at ${filePath}`);
  } catch (err) {
    // console.error('❌ Error writing DevTools JSON:', err);
    // throw err;
  }
}

export function updateOptionsToIncludeUI5Extension(options: types.LaunchOptions): string[] {

  // This is to load ui5 extension.
  const ui5ExtensionPath = path.resolve(__filename, '../../../sap/ui5Extension');
  if (options.headless === false) {
    if (!options.args) {
      options.args =  [
        `--disable-extensions-except=${ui5ExtensionPath}`,
        `--load-extension=${ui5ExtensionPath}`
      ];
    } else {
      if (!options.args.filter(arg => arg.includes('--disable-extensions-except')).length) {
        options.args.push(`--disable-extensions-except=${ui5ExtensionPath}`);
      } else {
        options.args = options.args.map(arg => {
          let na2 = arg;
          if (na2.includes('--disable-extensions-except='))
            na2 = na2.replace('--disable-extensions-except=', `--disable-extensions-except=${ui5ExtensionPath},`);
          return na2;
        });
      }
      if (!options.args.filter(arg => arg.includes('--load-extension')).length) {
        options.args.push(`--load-extension=${ui5ExtensionPath}`);
      } else {
        options.args = options.args.map(arg => {
          let na2 = arg;
          if (na2.includes('--load-extension='))
            na2 = na2.replace('--load-extension=', `--load-extension=${ui5ExtensionPath},`);
          return na2;
        });
      }
    }
  }

  if (!options.args)
    options.args = [];

  // Adding Prefrences file in order to pin the ui5 Extension causes issue as it gives popup to restore chrome tabs as it thinks it closed unexpectedly
  // This is to fix it.
  options.args.push(`--hide-crash-restore-bubble`);
  options.args.push(`--disable-session-crashed-bubble`);

  return options.args;

}
