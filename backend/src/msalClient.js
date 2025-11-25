const msal = require('@azure/msal-node')

// Build MSAL Confidential Client application
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET || ''
  }
}

const cca = new msal.ConfidentialClientApplication(msalConfig)

module.exports = { cca }
