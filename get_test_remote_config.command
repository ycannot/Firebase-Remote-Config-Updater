#!/bin/bash
cd "$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
package='firebase-admin'
if [ `npm list -g | grep -c $package` -eq 0 ]; then
    npm install $package
fi
node index.js get test
git update-index --assume-unchanged package-lock.json
