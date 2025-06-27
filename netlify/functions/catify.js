// netlify/functions/catify.js

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const { imageBase64, mimeType } = JSON.parse(event.body)
    // Securely access the API key from Netlify's environment variables
    const apiKey = process.env.GOOGLE_API_KEY
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro'
    const imagenModel = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002'

    if (!apiKey) {
      throw new Error('API key is not configured on the server.')
    }
    if (!imageBase64 || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image data.' }),
      }
    }

    // --- Step 1: Call Gemini to get the scene description ---
    const geminiPrompt =
      "Provide an extremely detailed and precise description of this image, focusing on all visual elements. This includes: 1. The overall scene, environment, static objects, vehicles, background, foreground, lighting conditions, time of day, and the *exact* camera angle/point of view (e.g., 'from the passenger seat looking towards the driver's side'). 2. For any figures present, describe their *exact* posture, body language, precise position relative to the scene and other objects, ANY GESTURES (like a finger to the mouth for 'shhh'), AND THEIR BODY TYPE/BUILD (e.g., 'fat build', 'skinny build', 'muscular build', 'average build'). Also, provide an exhaustive, pixel-level list of all clothing details and accessories worn (colors, patterns, specific garment types like 'denim jacket', 'striped t-shirt', 'aviator sunglasses', 'baseball cap', 'glasses', 'watch', fabric textures, how clothes fit). Do NOT mention their species or specific roles; focus purely on a visual forensic analysis of their appearance, exact actions, posture, body type, and placement."
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`
    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: geminiPrompt },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
    }

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    })

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text()
      console.error('Gemini API Error:', errorBody)
      throw new Error(
        `Failed to analyze image. The AI service returned an error.`
      )
    }

    const geminiResult = await geminiResponse.json()
    const sceneDescription =
      geminiResult.candidates?.[0]?.content?.parts?.[0]?.text

    if (!sceneDescription) {
      console.error(
        'Failed to get scene description from Gemini:',
        JSON.stringify(geminiResult, null, 2)
      )
      throw new Error(
        'Failed to analyze image details. The response from the AI was empty.'
      )
    }

    // --- Step 2: Call Imagen to generate the new image ---
    const imagenPrompt = `Generate a photorealistic image in a CGI or animated style. The image must exclusively feature fully anthropomorphic, bipedal cats with human body sizes and upright posture. They should have distinct cat heads, cat hands, and fur as their skin.
                
The scene, environment, lighting, camera angle, and background should be *an extremely precise, pixel-level replica* of this detailed description: '${sceneDescription}'.

For any implied figures from the original scene, depict these anthropomorphic cats with the **EXACT SAME BODY TYPE/BUILD** as described for the original figures. They should also be in the **EXACT SAME POSITION, WITH THE EXACT SAME POSTURE, PERFORMING THE EXACT SAME ACTIONS AND GESTURES (e.g., finger to mouth for 'shhh'), AND WEARING CLOTHING AND ACCESSORIES that are *an exact, precise, and meticulously rendered replica* of what the corresponding figure was wearing in the original image. Every detail, color, pattern, and garment type should be meticulously rendered on the cat's human-sized body, adapted naturally to fit the cat's form.

There must be absolutely no humans present in the final image; only anthropomorphic cats. The style should be consistent throughout, leaning towards realistic CGI or high-quality animation.`

    const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imagenModel}:predict?key=${apiKey}`
    const imagenPayload = {
      instances: [{ prompt: imagenPrompt }],
      parameters: { sampleCount: 1 },
    }

    const imagenResponse = await fetch(imagenApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imagenPayload),
    })

    if (!imagenResponse.ok) {
      const errorBody = await imagenResponse.text()
      console.error('Imagen API Error:', errorBody)
      throw new Error(
        `Failed to generate image. The AI service returned an error.`
      )
    }

    const imagenResult = await imagenResponse.json()
    const imageB64 = imagenResult.predictions?.[0]?.bytesBase64Encoded

    if (!imageB64) {
      console.error(
        'Failed to generate image with Imagen:',
        JSON.stringify(imagenResult, null, 2)
      )
      throw new Error(
        'Failed to generate catified image. The response from the AI was empty.'
      )
    }

    // --- Success ---
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: imageB64 }),
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
