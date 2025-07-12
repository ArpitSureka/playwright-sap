const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {minimatch} = require('minimatch');

/**
 * Parses a .npmignore file and returns the ignore and include patterns.
 * @param {string} npmignorePath - The full path to the .npmignore file.
 * @returns {{ignorePatterns: string[], includePatterns: string[], ignoreEverything: boolean}}
 */
function parseNpmignore(npmignorePath) {
    const ignorePatterns = [];
    const includePatterns = [];
    let ignoreEverything = false;

    if (!fs.existsSync(npmignorePath)) {
        return { ignorePatterns, includePatterns, ignoreEverything };
    }

    const content = fs.readFileSync(npmignorePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        if (trimmedLine.startsWith('!')) {
            // Include patterns are negations of ignore patterns
            includePatterns.push(trimmedLine.substring(1).trim());
        } else if (trimmedLine === '**/*') {
            ignoreEverything = true;
        } else {
            ignorePatterns.push(trimmedLine);
        }
    }

    return { ignorePatterns, includePatterns, ignoreEverything };
}


function shouldInclude(relPath, ignorePatterns, includePatterns, ignoreEverything = false) {
    // In npm, inclusion rules (negations) override exclusion rules.
    // The last matching pattern determines the outcome.

    if (!relPath.includes('/'))
        return true; // If the path is a file in the root, we always include it.

    let included = !ignoreEverything;

    for (const pattern of ignorePatterns) {
        if (minimatch(relPath, pattern, { dot: true })) {
            included = false;
        }
    }

    for (const pattern of includePatterns) {
        if (minimatch(relPath, pattern, { dot: true })) {
            included = true;
        }
    }

    return included;
}

/**
 * Copies files and folders from srcDir to destDir while respecting .npmignore rules.
 * @param {string} srcDir - The source directory.
 * @param {string} destDir - The destination directory.
 */
function copyRespectingNpmignore(srcDir, destDir) {
    const npmignorePath = path.join(srcDir, '.npmignore');
    if (!fs.existsSync(npmignorePath)) {
        throw new Error(`No .npmignore file found in ${srcDir}`);
    }

    const { ignorePatterns, includePatterns, ignoreEverything } = parseNpmignore(npmignorePath);

    const resolvedSrcDir = path.resolve(srcDir);
    const resolvedDestDir = path.resolve(destDir);

    if (!fs.existsSync(resolvedDestDir)) {
        fs.mkdirSync(resolvedDestDir, { recursive: true });
    }

    // These files are always included according to npm's behavior,
    // unless they are explicitly ignored. We add them to the include list.
    // const alwaysAllowed = ['./*.json', './package.json', './README.md', './LICENSE', './CHANGELOG.md', './*.js', './*.d.ts', './*.ts', './*.mjs', './*.cjs', './*.md', './*.txt'];
    const alwaysAllowed = [];
    const finalIncludePatterns = [...includePatterns, ...alwaysAllowed];

    // Recursive function to walk the directory tree
    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir);

        for (const entry of entries) {
            const srcPath = path.join(currentDir, entry);
            const relPath = path.relative(resolvedSrcDir, srcPath).replace(/\\/g, '/'); // Use forward slashes for minimatch

            // Skip the destination directory if it's inside the source
            if (path.resolve(srcPath) === resolvedDestDir) {
                continue;
            }
            
            // Skip node_modules and .git by default, as npm does
            if (entry === 'node_modules' || entry === '.git') {
                continue;
            }

            const stats = fs.statSync(srcPath);

            if (stats.isDirectory()) {
                // Always recurse into directories. The check will be done at the file level.
                walk(srcPath);
            } else if (stats.isFile()) {
                if (shouldInclude(relPath, ignorePatterns, finalIncludePatterns, ignoreEverything)) {
                    const destPath = path.join(resolvedDestDir, relPath);
                    const destParentDir = path.dirname(destPath);

                    // Ensure the parent directory exists in the destination
                    fs.mkdirSync(destParentDir, { recursive: true });
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    }

    walk(resolvedSrcDir);
    console.log(`Copied files from ${srcDir} to ${destDir} respecting .npmignore`);
}


// // --- Example Usage ---
// // This block corresponds to the `if __name__ == "__main__":` in the Python script.
// try {
//     console.log("Starting copy process...");

//     // JS equivalent of: subprocess.run('npm run build', ...)
//     // try {
//     //     console.log("Running build command...");
//     //     const output = execSync('npm run build', { stdio: 'inherit' });
//     // } catch (error) {
//     //     console.error("Build command failed:", error);
//     //     process.exit(1);
//     // }

//     // Create dummy directories and .npmignore for demonstration if they don't exist

//     copyRespectingNpmignore('packages/playwright-core', 'publish/clean/playwright-core');
//     copyRespectingNpmignore('packages/playwright', 'publish/clean/playwright');
//     copyRespectingNpmignore('packages/playwright-test', 'publish/clean/playwright-test');

//     console.log("\nCopy process finished successfully.");
//     console.log("Check the 'publish/clean' directory to see the results.");

// } catch (error) {
//     console.error("An error occurred:", error.message);
//     process.exit(1);
// }

module.exports = {copyRespectingNpmignore};

// if (require.main === module) {
//   parseCLI();
// } else {
// }