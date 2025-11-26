const path = require('path')
const dotenv = require('dotenv')

// Load test env; prefer .env.test if present
const envPath = path.resolve(__dirname, '..', '..', '.env.test')
const examplePath = path.resolve(__dirname, '..', '..', '.env.test.example')

if (require('fs').existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config({ path: examplePath })
}

module.exports = {}
