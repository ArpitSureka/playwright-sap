### Commands to build module for NPM 

```bash
// Dont use npm watch command when deploying
npm run build 
node utils/sapWorkspace.js --copy-respecting-npmignore
node utils/sapWorkspace.js --set-version <version-num>

```

cd packages/ -> 
npm publish 

npm dist-tag add <package-name>@<version> <tag>

npm dist-tag add playwright-sap@<version> stable


npm dist-tag add playwright-sap@1.1.4 stable
npm dist-tag add playwright-sap-core@1.1.4 stable
npm dist-tag add @playwright-sap/test@1.1.4 stable
