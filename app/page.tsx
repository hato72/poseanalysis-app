'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/app/component/ui/Button'; // Assuming you have a Button component in this path
import { useToast } from '@/app/component/ui/UseToast'; // Assuming you have a useToast hook

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [angles, setAngles] = useState<{ upperBodyAngle: number; backLegAngle: number; frontLegAngle: number; } | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
      }
    }
  };

  const sendImage = async () => {
    if (!capturedImage) return;

    try {
      const formData = new FormData();
      const blob = await (await fetch(capturedImage)).blob();
      formData.append('image', blob, 'captured_image.jpg');

      const response = await fetch('/api/analyze-pose', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze pose');
      }

      const result = await response.json();
      setProcessedImage(`data:image/jpeg;base64,${result.processedImage}`);
      setAngles({
        upperBodyAngle: result.upperBodyAngle,
        backLegAngle: result.backLegAngle,
        frontLegAngle: result.frontLegAngle
      });
    } catch (error) {
      console.error('Error sending image:', error);
      toast({
        title: "Error",
        description: "Failed to analyze pose",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pose Analysis App</h1>
      <div className="mb-4">
        <Button onClick={startCamera} className="mr-2">Start Camera</Button>
        <Button onClick={stopCamera} variant="secondary">Stop Camera</Button>
      </div>
      <div className="mb-4">
        <video ref={videoRef} autoPlay playsInline className="w-full max-w-md mx-auto" />
      </div>
      <div className="mb-4">
        <Button onClick={captureImage}>Capture Image</Button>
      </div>
      <div className="mb-4">
        <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480" />
        {capturedImage && (
          <img src={capturedImage} alt="Captured" className="w-full max-w-md mx-auto" />
        )}
      </div>
      <div className="mb-4">
        <Button onClick={sendImage}>Analyze Pose</Button>
      </div>
      {processedImage && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Analyzed Result</h2>
          <img src={processedImage} alt="Processed" className="w-full max-w-md mx-auto" />
          {angles && (
            <div className="mt-4">
              <p>Upper Body Angle: {angles.upperBodyAngle.toFixed(2)}°</p>
              <p>Back Leg Angle: {angles.backLegAngle.toFixed(2)}°</p>
              <p>Front Leg Angle: {angles.frontLegAngle.toFixed(2)}°</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
