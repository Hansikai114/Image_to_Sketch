import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

const ImageToSketch = () => {
  const [image, setImage] = useState(null);
  const canvasRef = useRef(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/*',
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    },
  });

  const convertToSketch = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = image;
    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      const maxSize = 300;
      let width = originalWidth;
      let height = originalHeight;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.floor((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.floor((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      // Apply edge detection
      const edgeData = ctx.getImageData(0, 0, width, height);
      applyEdgeDetection(edgeData, width, height);
      ctx.putImageData(edgeData, 0, 0);
    };
  };

  const applyEdgeDetection = (imageData, width, height) => {
    const pixels = imageData.data;
    const tmpPixels = new Uint8ClampedArray(pixels.length);

    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let pixelX = 0;
        let pixelY = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const yy = Math.min(height - 1, Math.max(0, y + ky));
            const xx = Math.min(width - 1, Math.max(0, x + kx));
            const offset = (yy * width + xx) * 4;
            pixelX += pixels[offset] * sobelX[ky + 1][kx + 1];
            pixelY += pixels[offset] * sobelY[ky + 1][kx + 1];
          }
        }

        const idx = (y * width + x) * 4;
        const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
        const edge = magnitude > 100 ? 0 : 255;  // Threshold for edge detection
        tmpPixels[idx] = tmpPixels[idx + 1] = tmpPixels[idx + 2] = edge;
        tmpPixels[idx + 3] = 255;  // Full opacity
      }
    }

    for (let i = 0; i < tmpPixels.length; i++) {
      pixels[i] = tmpPixels[i];
    }
  };

  const cancelImage = () => {
    setImage(null);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div {...getRootProps()} style={{ border: '2px dashed #ddd', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop an image here, or click to select one</p>
      </div>
      {image && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={image} alt="Uploaded" style={{ maxWidth: '300px', margin: '20px' }} />
          <canvas ref={canvasRef} style={{ display: 'block', margin: '20px' }}></canvas>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={convertToSketch}>Convert to Sketch</button>
            <button onClick={cancelImage} style={{ backgroundColor: '#dc3545' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageToSketch;
