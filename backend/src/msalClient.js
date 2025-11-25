const msal = require('@azure/msal-node')

// Only initialize MSAL ConfidentialClientApplication when AUTH_MODE=entra
// and the required env vars are present. Otherwise export a safe stub.
const AUTH_MODE = (process.env.AUTH_MODE || 'jwt').toLowerCase()

let cca = null

if (AUTH_MODE === 'entra') {
  const clientId = process.env.AZURE_CLIENT_ID || ''
  const tenantId = process.env.AZURE_TENANT_ID || ''
  const clientSecret = process.env.AZURE_CLIENT_SECRET || ''

  if (!clientId || !tenantId || !clientSecret) {
    console.warn('MSAL not configured: AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET are required for ENTRA mode')
  } else {
    const msalConfig = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret
      }
    }
    try {
      cca = new msal.ConfidentialClientApplication(msalConfig)
    } catch (err) {
      console.error('Failed to initialize MSAL ConfidentialClientApplication', err)
      cca = null
    }
  }
}

module.exports = { cca }
