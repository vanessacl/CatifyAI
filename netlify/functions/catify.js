// netlify/functions/catify.js

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    console.log('Netlify function received request!')
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      // A tiny transparent pixel as a placeholder image
      body: JSON.stringify({
        imageBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      }),
    }
  } catch (error) {
    console.error('Error in catify function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'An internal server error occurred.',
      }),
    }
  }
}
