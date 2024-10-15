# REDSKY QuickStart App

This project is a starting point for new React-Typescript based mobile application. Each new application shall take the latest
git version of this project, copy it to a new folder, and remove the .git folder. Improvements made to the base project should
be contributed back to this project.

If you are looking for guidance on how to write React+Typescript than head to this link.

[React-TypeScript Cheat Sheet][https://github.com/typescript-cheatsheets/react-typescript-cheatsheet]

## Build release for app

To kick off a build for release, run

### `./build-release.sh [app_version] [platform]`

-   [app_version] App version. e.g. 1.0.6
-   [platform] Specified platform. e.g. android, ios, all. By default, it is set to 'all'. If using 'androidDebug' here, it will install debug build of app onto your connected Android device.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode using the webpack.config.dev.js.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn start:no-refresh`

Is the same as running `yarn start` but if you modify any of the working files it will not automatically update the webpage. If you want to see an update press `F5` in the browser.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

### `yarn build:debug`

Builds to the `build` folder but also includes source maps inlined into the code. This works best for android applications.

### `yarn prettier:check`

Runs a prettier check across all your project files but does _NOT_ modify your files. Use `yarn prettier:fix-all` if you want to fix the files.

### `yarn prettier:fix-all`

Fixes all your files with prettier.

[https://github.com/typescript-cheatsheets/react-typescript-cheatsheet]: https://github.com/typescript-cheatsheets/react-typescript-cheatsheet
