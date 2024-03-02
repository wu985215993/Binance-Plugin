import fetch from 'node-fetch'

const DEFAULT_HEADERS = {
  'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
  'Content-Type': 'application/json',
}

async function request(url, options = {}) {
  const requestOptions = {
    method: options.method || 'GET',
    headers: { ...DEFAULT_HEADERS, ...options.headers },
    redirect: options.redirect || 'follow',
    body: options.body ? JSON.stringify(options.body) : undefined,
  }

  try {
    const response = await fetch(url, requestOptions)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`)
  }
}

export default request
