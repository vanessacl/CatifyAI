const imageUpload = document.getElementById('imageUpload')
const uploadedImagePreview = document.getElementById('uploadedImagePreview')
const catifyButton = document.getElementById('catifyButton')
const catifiedImage = document.getElementById('catifiedImage')
const loadingSpinner = document.getElementById('loading')
const saveImageButton = document.getElementById('saveImageButton')
const catifiedImageWrapper = document.getElementById('catifiedImageWrapper')

const customAlert = document.getElementById('customAlert')
const alertMessage = document.getElementById('alertMessage')
const alertCloseButton = document.getElementById('alertCloseButton')

let uploadedImageBase64 = null
let uploadedImageMimeType = null

// Function to show custom alert modal
function showAlert(message) {
  alertMessage.textContent = message
  customAlert.classList.remove('hidden')
}

// Close custom alert modal
alertCloseButton.addEventListener('click', () => {
  customAlert.classList.add('hidden')
  console.log('clicking clicking')
})

// Handle image upload
imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0]
  if (file) {
    // Netlify functions have a 6MB payload limit. Base64 encoding increases
    // file size by ~33%, so we'll set a client-side limit of 4MB to be safe.
    const MAX_SIZE_MB = 4
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showAlert(
        `Image is too large. Please select a file smaller than ${MAX_SIZE_MB}MB.`
      )
      // Reset the input so the user can select a different file
      imageUpload.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImagePreview.src = e.target.result
      // Get base64 part and store mime type
      uploadedImageBase64 = e.target.result.split(',')[1]
      uploadedImageMimeType = file.type
      // Reset catified image display
      catifiedImage.src =
        'https://placehold.co/250x200/e2e8f0/64748b?text=Catified+Image'
      catifiedImage.classList.add('hidden')
      loadingSpinner.classList.add('hidden')
      saveImageButton.classList.add('hidden')
      catifiedImageWrapper.classList.remove('hidden')
    }
    reader.readAsDataURL(file)
  } else {
    uploadedImagePreview.src =
      'https://placehold.co/250x200/e2e8f0/64748b?text=Upload+Image'
    uploadedImageBase64 = null
    uploadedImageMimeType = null
  }
})

// Handle Catify button click
catifyButton.addEventListener('click', async () => {
  if (!uploadedImageBase64) {
    showAlert('Please upload an image first!')
    return
  }

  // Show loading spinner and hide previous images
  loadingSpinner.classList.remove('hidden')
  catifiedImage.classList.add('hidden')
  saveImageButton.classList.add('hidden')

  try {
    // This now calls your secure Netlify Function
    const response = await fetch('/.netlify/functions/catify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: uploadedImageBase64,
        mimeType: uploadedImageMimeType,
      }),
    })

    if (!response.ok) {
      // If the response is not OK, it might not be JSON.
      // We try to parse it as JSON, but fall back to status text if that fails.
      let errorMessage = `Request failed: ${response.status} ${response.statusText}`
      try {
        const errorResult = await response.json()
        // Use the specific error from the server if available
        errorMessage = errorResult.error || errorMessage
      } catch (e) {
        // The error response wasn't JSON. The server might have crashed.
        console.error('Could not parse error response as JSON.')
      }
      throw new Error(errorMessage)
    }

    // If we get here, the response was successful and we can safely parse the body.
    const result = await response.json()
    if (result.imageBase64) {
      const imageUrl = `data:image/png;base64,${result.imageBase64}`
      catifiedImage.src = imageUrl
      catifiedImage.classList.remove('hidden')
      saveImageButton.classList.remove('hidden')
    } else {
      throw new Error('Image data was not returned from the server.')
    }
  } catch (error) {
    console.error('Error during catify process:', error)
    showAlert(
      error.message ||
        'An error occurred during image processing. Please try again.'
    )
    catifiedImage.src = 'https://placehold.co/250x200/FF0000/FFFFFF?text=Error'
    catifiedImage.classList.remove('hidden')
  } finally {
    loadingSpinner.classList.add('hidden')
  }
})

// Handle Save Image button click
saveImageButton.addEventListener('click', () => {
  const link = document.createElement('a')
  link.href = catifiedImage.src
  link.download = 'catified_image.png' //Suggested filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
})
