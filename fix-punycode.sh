#\!/bin/bash

# This script fixes the punycode dependency issue in the Docker container

# Navigate to the application directory
cd /app

# Remove any existing punycode dependencies
rm -rf node_modules/punycode
rm -rf node_modules/@tahul/punycode
rm -rf node_modules/mongodb-connection-string-url/node_modules/tr46/node_modules/punycode

# Install the correct version of punycode
npm install --no-save punycode@2.3.1

# Force install punycode directly in the tr46 module that needs it
cd node_modules/mongodb-connection-string-url/node_modules/tr46
npm install --no-save punycode@2.3.1

echo "Punycode dependency fix completed"
