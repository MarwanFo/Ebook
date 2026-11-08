import React, { useRef, useState } from 'react';
import { BookUploadResponseDto } from '@bookflow/shared-types';
import { useUploadBook } from '../hooks/useUploadBook';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: BookUploadResponseDto) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadBook();

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);

    // Client-side quick validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'epub' && ext !== 'pdf') {
      setErrorMessage('Please select a valid .epub or .pdf ebook file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('File exceeds the 100MB size limit.');
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync(file);
      onSuccess(result);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Upload failed. Please try again.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileProcess(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-xl overflow-hidden p-6 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 id="upload-modal-title" className="text-lg font-bold text-text">
            Upload Ebook to Library
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            className="text-text-muted hover:text-text p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
          className={`mt-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/60 bg-surface-muted/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
            accept=".epub,.pdf,application/epub+zip,application/pdf"
            className="hidden"
            disabled={uploadMutation.isPending}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-medium text-text">
                <span className="text-primary hover:underline">Click to browse</span> or drag and
                drop
              </p>
              <p className="text-xs text-text-muted mt-1">
                Supported formats: <strong className="text-text">EPUB</strong> and{' '}
                <strong className="text-text">PDF</strong> (up to 100MB)
              </p>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload Progress State */}
        {uploadMutation.isPending && (
          <div className="mt-4 p-4 rounded-xl bg-surface-muted border border-border">
            <div className="flex items-center justify-between text-xs font-medium text-text mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Processing & extracting metadata...
              </span>
              <span>Please wait</span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            className="px-4 py-2 border rounded-lg text-sm text-text-muted hover:text-text border-border transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
