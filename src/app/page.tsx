"use client";
import React, { useState } from "react";
import { splitFile } from "../helpers/upload-helper";
import {
  initMultipartUpload,
  uploadPart,
  completeMultipartUpload,
} from "../services/upload-service";
import Image from "next/image";

export default function Home() {
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_API_KEY);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadResult, setUploadResult] = useState<{
    uuid: string;
    url: string;
  } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!apiKey) {
      setStatus("Please enter your API key.");
      return;
    }
    setStatus("Initializing multipart upload...");
    setUploading(true);
    setUploadProgress(0);
    let progressInterval: NodeJS.Timeout | null = null;
    try {
      // 1. Init multipart upload
      const initRes = await initMultipartUpload({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        apiKey,
      });
      setStatus("Splitting file and uploading parts...");
      // 2. Split file
      const parts = splitFile(file, initRes.numberOfParts);
      // Only upload and complete as many parts as were actually created
      const eTags: string[] = [];
      const totalParts = parts.length;
      for (let i = 0; i < parts.length; i++) {
        setStatus(`Uploading part ${i + 1} of ${parts.length}...`);
        // Start smooth progress for this part
        const partTarget = Math.round(((i + 1) / totalParts) * 100);
        const partStart = Math.round((i / totalParts) * 100);
        let fakeProgress = partStart;
        if (progressInterval) clearInterval(progressInterval);
        progressInterval = setInterval(() => {
          fakeProgress += 1;
          if (fakeProgress < partTarget) {
            setUploadProgress(fakeProgress);
          }
        }, 120);
        const eTag = await uploadPart(initRes.parts[i].url, parts[i]);
        eTags.push(eTag || "");
        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(partTarget);
      }
      setStatus("Finalizing upload...");
      // Only send the partNumbers and ETags for the parts you uploaded
      const completeRes = await completeMultipartUpload({
        uuid: initRes.uuid,
        parts: initRes.parts
          .slice(0, parts.length)
          .map((part: { partNumber: number }, idx: number) => ({
            partNumber: part.partNumber,
            eTag: eTags[idx],
          })),
        apiKey,
      });
      setStatus("Upload complete!");
      console.log("ETags:", eTags);
      console.log("Complete response:", completeRes);
      setUploadProgress(100);
      setUploadResult({ uuid: completeRes.uuid, url: completeRes.url });
    } catch (err: unknown) {
      if (typeof err === "object" && err && "message" in err) {
        setStatus("Error: " + (err as { message: string }).message);
      } else {
        setStatus("An unknown error occurred.");
      }
      setUploadResult(null);
    } finally {
      setUploading(false);
      if (progressInterval) clearInterval(progressInterval);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  }

  // Helper to generate preview/thumbnail URLs
  function getVariantUrl(baseUrl: string, prefix: string) {
    try {
      const url = new URL(baseUrl);
      const parts = url.pathname.split("/");
      const fileName = parts.pop() || "";
      const idx = fileName.lastIndexOf(".");
      if (idx === -1) return baseUrl; // no extension
      const newFileName = `${prefix}${fileName}`;
      parts.push(newFileName);
      url.pathname = parts.join("/");
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  const previewUrl = uploadResult
    ? getVariantUrl(uploadResult.url, "preview_")
    : null;
  const thumbnailUrl = uploadResult
    ? getVariantUrl(uploadResult.url, "thumbnail_")
    : null;

  return (
    <>
      <head>
        <title>Marvia API Upload client</title>
      </head>
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Header with logo and title */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/logo.svg"
              alt="Marvia Logo"
              width={106}
              height={56}
              className="mb-2"
            />
            <p className="text-base text-gray-500">
              Upload files securely via the Marvia API
            </p>
          </div>
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-6 border border-gray-100">
            <div className="flex flex-col gap-2">
              <label htmlFor="api-key" className="font-semibold text-[#1B3C7F]">
                API Key
              </label>
              <div className="relative">
                <input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B3C7F] bg-gray-50 w-full pr-10"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#1B3C7F] font-semibold focus:outline-none"
                  onClick={() => setShowApiKey((v) => !v)}
                  tabIndex={-1}
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="file-upload"
                className="font-semibold text-[#1B3C7F] text-lg"
              >
                Select a file to upload
              </label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#1B3C7F] bg-blue-50 rounded-xl py-8 px-4 transition hover:bg-blue-100 w-full">
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                  style={{ minHeight: "56px" }}
                >
                  <span className="text-sm text-gray-500">
                    Drag & drop or click to select a file
                  </span>
                </label>
                {selectedFile && (
                  <div className="mt-3 text-sm text-[#1B3C7F] font-medium text-center w-full break-words">
                    {selectedFile.name}
                  </div>
                )}
                {uploading && (
                  <div className="w-full mt-4">
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14b38b] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-center text-[#1B3C7F] mt-1">
                      {uploadProgress}%
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              className="mt-4 w-full py-2 rounded-lg font-semibold text-white bg-[#14b38b] hover:bg-[#14b38b] transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={uploading || !apiKey}
              onClick={() => document.getElementById("file-upload")?.click()}
              type="button"
            >
              {uploading ? "Uploading..." : "Start Upload"}
            </button>
            {status && (
              <div className="text-sm text-[#1B3C7F] mt-2 text-center">
                {status}
              </div>
            )}
          </div>
        </div>
        {/* Success state with SysFileUUID and Download URL */}
        {uploadResult && !uploading && (
          <div className="w-full max-w-md mt-8 mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-xl shadow p-6 flex flex-col gap-3 items-center">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-green-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                Upload Successful
              </div>
              <div className="w-full text-sm text-gray-700">
                <div className="mb-1 font-medium">SysFileUUID:</div>
                <div className="break-all bg-white rounded px-2 py-1 border border-gray-200">
                  {uploadResult.uuid}
                </div>
              </div>
              <div className="w-full text-sm text-gray-700">
                <div className="mb-1 font-medium">Original URL:</div>
                <a
                  href={uploadResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all bg-white rounded px-2 py-1 border border-gray-200 text-blue-700 hover:underline"
                >
                  {uploadResult.url}
                </a>
              </div>
              {previewUrl && (
                <div className="w-full text-sm text-gray-700">
                  <div className="mb-1 font-medium">Preview URL:</div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all bg-white rounded px-2 py-1 border border-gray-200 text-blue-700 hover:underline"
                  >
                    {previewUrl}
                  </a>
                </div>
              )}
              {thumbnailUrl && (
                <div className="w-full text-sm text-gray-700">
                  <div className="mb-1 font-medium">Thumbnail URL:</div>
                  <a
                    href={thumbnailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all bg-white rounded px-2 py-1 border border-gray-200 text-blue-700 hover:underline"
                  >
                    {thumbnailUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
