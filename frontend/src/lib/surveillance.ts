export const captureSurveillance = async (targetElementId?: string): Promise<{ webcam: string | null; screenshot: string | null }> => {
  let webcam: string | null = null;
  let screenshot: string | null = null;
  const retries = 3;

  // Pre-check permissions
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    throw new Error('Camera permissions denied. Security surveillance requires camera access.');
  }

  // Add 500ms initial delay for UI/modal animation
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log("Starting capture..");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 1. Silent Screenshot using html2canvas
      if (!screenshot) {
        await new Promise(resolve => requestAnimationFrame(resolve)); // Wait for repaint
        const { toJpeg } = await import('html-to-image');
        
        // Target the specific modal if provided, fallback to document.body
        const targetElement = targetElementId ? document.getElementById(targetElementId) : null;
        const elementToCapture = targetElement || document.body;

        screenshot = await toJpeg(elementToCapture, { 
          quality: 0.5,
          backgroundColor: '#ffffff',
          skipFonts: true, // Prevents loading external fonts which might cause CORS issues
        });
      }
    } catch (err) {
      console.error(`Screenshot capture failed (attempt ${attempt})`, err);
    }

    try {
      // 2. Silent Webcam Capture
      if (!webcam) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        const video = document.createElement('video');
        video.srcObject = stream;
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = reject;
        });

        // Give camera 500ms to adjust exposure and render
        await new Promise(resolve => setTimeout(resolve, 500));

        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = video.videoWidth;
        videoCanvas.height = video.videoHeight;
        const ctx = videoCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
          
          // Basic validation to ensure the canvas isn't entirely blank/black
          const dataUrl = videoCanvas.toDataURL('image/jpeg', 0.5);
          if (dataUrl.length > 100) {
              webcam = dataUrl;
          }
        }
        
        // Stop tracks
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      console.error(`Webcam capture failed (attempt ${attempt})`, err);
    }

    if (webcam && screenshot) {
      break;
    }

    if (attempt < retries) {
      // Exponential backoff before retry (1000ms, 2000ms)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  console.log("Webcam status:", !!webcam);
  console.log("Screenshot status:", !!screenshot);

  if (!webcam || !screenshot) {
    console.error(`Missing: ${!webcam ? 'Webcam' : ''} ${!screenshot ? 'Screenshot' : ''}`.trim());
    throw new Error('Failed to capture complete surveillance payload.');
  }

  return { webcam, screenshot };
};
