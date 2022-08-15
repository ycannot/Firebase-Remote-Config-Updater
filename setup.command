#!/bin/bash
cd "$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

    package_firebase_admin='firebase-admin'
if [ `npm list -g | grep -c $package_firebase_admin` -eq 0 ]; then
    npm install $package_firebase_admin
fi

package_xlsx='xlsx'
if [ `npm list -g | grep -c $package_xlsx` -eq 0 ]; then
    npm install $package_xlsx
fi

node index.js fetch