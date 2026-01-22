'use client';

import { useState } from 'react';
import ImageEditor from '@/components/ImageEditor';
import { FaCloudUploadAlt } from 'react-icons/fa';

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Removed useDropzone to keep dependencies minimal


  // Custom simple dropzone if package not installed, or I'll implement simple input
  // I did not install react-dropzone, so I'll use standard input + drag events

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-background text-foreground py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
          Watermark Remover
        </h1>
        <p className="text-muted-foreground">ข้อกำจัดนะครับอ้ายๆ!
          <br />
          แนะนำไม่เกิน 4K (3840 x 2160 pixels)
          <br />
          ขนาดไฟล์ 5MB - 10MB
          <br />
          ใช้ server ฟรีเลยทำให้ข้อจำกัดขนาดและความกว้างของรูปจำกัด เนื่องจากของฟรี RAM น้อย
        </p>
      </header>

      {!imageFile ? (
        <div className="flex flex-col items-center justify-center w-full max-w-xl p-10 border-2 border-dashed border-gray-700 rounded-xl hover:border-primary transition-colors cursor-pointer bg-card"
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <FaCloudUploadAlt className="text-6xl text-gray-500 mb-4" />
          <p className="text-xl font-semibold mb-2">Click or Drag image here</p>
          <p className="text-sm text-gray-500">Supports JPG, PNG</p>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <ImageEditor imageFile={imageFile} onReset={() => setImageFile(null)} />
      )}
    </main>
  );
}
