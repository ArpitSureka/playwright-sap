import os
import shutil
import fnmatch
from pathlib import Path
import subprocess

def parse_npmignore(npmignore_path):
    """
    Parses .npmignore file and returns two lists:
    - patterns to ignore
    - patterns to explicitly include
    """
    ignore_patterns = []
    include_patterns = []

    ignoreEverything = False

    with open(npmignore_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("!"):
                include_patterns.append(line[1:].strip())
            elif line.startswith("*") and line == '**/*':
                ignoreEverything = True
            else:
                ignore_patterns.append(line)

    return ignore_patterns, include_patterns, ignoreEverything

def should_include(rel_path, ignore_patterns, include_patterns, ignoreEverything=False):
    """
    Determines whether a file should be included based on ignore/include patterns.
    """
    included = not ignoreEverything
    for pattern in ignore_patterns:
        if fnmatch.fnmatch(rel_path, pattern) or fnmatch.fnmatch(rel_path + "/", pattern):
            included = False
    for pattern in include_patterns:
        if fnmatch.fnmatch(rel_path, pattern) or fnmatch.fnmatch(rel_path + "/", pattern):
            included = True
    return included

def copy_respecting_npmignore(src_dir, dest_dir):
    """
    Copies files and folders from src_dir to dest_dir while respecting .npmignore rules.
    """
    npmignore_path = Path(src_dir) / ".npmignore"
    if not npmignore_path.exists():
        raise FileNotFoundError(f"No .npmignore file found in {src_dir}")

    ignore_patterns, include_patterns, ignoreEverything = parse_npmignore(npmignore_path)

    src_dir = Path(src_dir).resolve()
    dest_dir = Path(dest_dir).resolve()

    if not dest_dir.exists():
        dest_dir.mkdir(parents=True)

    allowed_patterns = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', '.npmignore', 'tsconfig.json', 'tsconfig.build.json', 'tsconfig.playwright.json']

    for root, dirs, files in os.walk(src_dir):
        rel_root = os.path.relpath(root, src_dir)
        for name in files:
            rel_path = os.path.normpath(os.path.join(rel_root, name))
            if should_include(rel_path, ignore_patterns, allowed_patterns, ignoreEverything) or should_include(rel_path, ignore_patterns, include_patterns, ignoreEverything):
                src_file = src_dir / rel_path
                dest_file = dest_dir / rel_path
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_file, dest_file)

        # Prune ignored directories from traversal
        dirs[:] = [d for d in dirs if should_include(os.path.normpath(os.path.join(rel_root, d)), ignore_patterns, include_patterns)]

    print(f"Copied files from {src_dir} to {dest_dir} respecting .npmignore")

# Example usage
if __name__ == "__main__":
    # result = subprocess.run('npm run build', shell=True, text=True, capture_output=True)
    copy_respecting_npmignore('packages/playwright-core', 'publish/clean/playwright-core')
    copy_respecting_npmignore('packages/playwright', 'publish/clean/playwright')
    copy_respecting_npmignore('packages/playwright-test', 'publish/clean/playwright-test')