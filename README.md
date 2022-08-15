# Introduction 
This is a repo for updating firebase remote config. This code created according to Firebase Docs and spesifically edited to manage localization data.

# Getting Started
you need to follow these steps to start:
1.  install Node.js (https://nodejs.org/en/)
2.	Download Firebase Admin Key adn copy under "/credentials" folder
4.	Manage language support (key of "supportedLanguages") on "cache.json"
5.  (Only Once, MAC) run "setup.command" file
6.  (Only Once, Windows) run "setup.bat" file

# Run Commands
##  Fetch Data from Remote Config
    run `node index.js fetch` to fetch latest version of remote config. This operation updates "tables/Localizable.xlsm" file. All non-published changes will be discarted after running this script.

## Publish Data to Remote Config
    run `node index.js fetch` to publish new changes to remote config. All saved changes in "tables/Localizable.xlsm" will be merged with latest remote config data and will be published to Remote Config after running this script.

