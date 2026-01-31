/**
 * X (Twitter) OAuth 2.0 PKCE Authentication
 * 
 * Flow:
 * 1. Generate code_verifier and code_challenge
 * 2. Redirect user to X authorization URL
 * 3. User authorizes → X redirects back with code
 * 4. Exchange code for access_token + refresh_token
 * 5. Store tokens in Supabase
 */

import crypto from 'crypto'

// Scopes we need for xthread
export const X_SCOPES = [
  'tweet.read',      // Read user's tweets
  'tweet.write',     // Post tweets
  'users.read',      // Read user profile
  'offline.access',  // Refresh tokens
].join(' ')

/**
 * Generate a random code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Generate code challenge from verifier (S256 method)
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Build the X authorization URL
 */
export function buildAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  forceLogin?: boolean
}): string {
  const { clientId, redirectUri, state, codeChallenge, forceLogin = true } = params
  
  const url = new URL('https://twitter.com/i/oauth2/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', X_SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  
  // Force login screen to allow connecting different accounts
  if (forceLogin) {
    url.searchParams.set('force_login', 'true')
  }
  
  return url.toString()
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(params: {
  code: string
  codeVerifier: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const { code, codeVerifier, clientId, clientSecret, redirectUri } = params
  
  // Create Basic auth header
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  
  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }
  
  return response.json()
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(params: {
  refreshToken: string
  clientId: string
  clientSecret: string
}): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const { refreshToken, clientId, clientSecret } = params
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  
  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }
  
  return response.json()
}

/**
 * Fetch the authenticated user's X profile
 */
export async function fetchXUser(accessToken: string): Promise<{
  id: string
  name: string
  username: string
  profile_image_url?: string
}> {
  const response = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch X user: ${error}`)
  }
  
  const data = await response.json()
  return data.data
}
