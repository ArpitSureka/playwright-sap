### Commands to build module for NPM 

```bash
// Dont use npm watch command when deploying
npm run build 
node utils/sapWorkspace.js --copy-respecting-npmignore
node utils/sapWorkspace.js --set-version <version-num>

```