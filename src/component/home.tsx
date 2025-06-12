import { useState, useEffect } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Upload, Download, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import LoadingScreen from './LoadingScreen';
import ImageViewer from './ImageViewer';

/**
 * Main component for the Sketch to Face application.
 * This interface allows users to upload sketch images, provide descriptions,
 * select a gender, and generate realistic AI-based faces.
 * 
 * @returns {JSX.Element} The complete Sketch to Face interface
 */
export default function SketchToFaceInterface() {
  // State for drag and drop functionality
  const [dragOver, setDragOver] = useState(false);
  // State to store the uploaded sketch file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // State for the user's description input
  const [description, setDescription] = useState('');
  // State for gender selection (male/female)
  const [selectedGender, setSelectedGender] = useState('');  // State to track loading/processing status
  const [isLoading, setIsLoading] = useState(false);
  // State to control loading progress (0-100)
  const [loadingProgress, setLoadingProgress] = useState(0);
  // State for storing error messages
  const [errorMessage, setErrorMessage] = useState('');
  // State to store the generated face result
  const [result, setResult] = useState<{ imageUrl?: string; message?: string } | null>(null);  // State for displaying notification messages
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  // State to control the visibility of the result modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to control the visibility of the full-size image viewer
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  /**
   * Effect hook to automatically hide notifications after a delay
   * Clears the notification after 5 seconds
   */
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000); // 5 seconds instead of 100 seconds
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  /**
   * Effect hook to cleanup blob URLs when component unmounts or result changes
   * Prevents memory leaks from generated image URLs
   */
  useEffect(() => {
    return () => {
      // Cleanup any existing blob URLs when component unmounts
      if (result?.imageUrl && result.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(result.imageUrl);
      }
    };
  }, [result]);/**
   * Handles the dragover event for the file upload area
   * Prevents default browser behavior and updates UI state
   * 
   * @param {DragEvent<HTMLDivElement>} e - The drag event
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  /**
   * Handles the dragleave event for the file upload area
   * Prevents default browser behavior and resets UI state
   * 
   * @param {DragEvent<HTMLDivElement>} e - The drag event
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };
  
  /**
   * Handles the drop event when a user drops a file onto the upload area
   * Processes the dropped file if it's a valid image format
   * 
   * @param {DragEvent<HTMLDivElement>} e - The drop event
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.match(/^image\/(jpg|jpeg|png|gif)$/)) {
        // Use the same image processing function for drag and drop
        processImage(file);
      } else {
        setNotification({
          type: 'error',
          message: 'Please drop a valid image file (JPG, PNG or GIF)'
        });
      }
    }
  };  /**
   * Handles the file selection event when a user chooses a file through the file input
   * Validates the selected file format and processes it if valid
   * 
   * @param {ChangeEvent<HTMLInputElement>} e - The change event from the file input
   */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.match(/^image\/(jpg|jpeg|png|gif)$/)) {
        // Process image before setting it
        processImage(file);
      } else {
        setNotification({
          type: 'error',
          message: 'Please select a valid image file (JPG, PNG or GIF)'
        });
      }
    }
  };
    /**
   * Processes and optimizes an image file before uploading
   * Resizes the image to acceptable dimensions while maintaining aspect ratio
   * Converts the image to a more efficient format/size
   * 
   * @param {File} file - The image file to process
   */
  const processImage = (file: File) => {
    // Create an image element to load the file
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      // Release object URL after image is loaded
      URL.revokeObjectURL(objectUrl);
      
      // Set max dimensions for the image
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }
      
      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image on the canvas with the new dimensions
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a new File object from the blob
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: new Date().getTime()
            });
            
            setSelectedFile(resizedFile);
            setNotification({
              type: 'success',
              message: 'Image uploaded and optimized successfully!'
            });
          }
        }, file.type);
      } else {
        // Fallback if canvas context is not available
        setSelectedFile(file);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setNotification({
        type: 'error',
        message: 'Error loading image. Please try another file.'
      });
    };
    
    img.src = objectUrl;
  };  /**
   * Handles the submission of the sketch and associated data for processing
   * Validates all required inputs, prepares form data, and submits to the API
   * Shows appropriate loading states and error handling
   * 
   * @returns {Promise<void>} A promise that resolves when submission is complete
   */
  const handleSubmit = async () => {
    // Reset states before starting new submission
    setErrorMessage('');
    setNotification(null);
    
    // Validate inputs - check if sketch is uploaded
    if (!selectedFile) {
      setNotification({
        type: 'error',
        message: 'Please upload a sketch first'
      });
      return;
    }
    
    if (!description.trim()) {
      setNotification({
        type: 'error',
        message: 'Please provide a description'
      });
      return;
    }
    
    if (!selectedGender) {
      setNotification({
        type: 'error',
        message: 'Please select a gender'
      });
      return;
    }
      // Set loading state and start progress
    setIsLoading(true);
    setLoadingProgress(0);
    
    // Simulate progress while waiting for API response
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev < 85) {
          return prev + Math.random() * 3; // Random increment up to 85%
        }
        return prev;
      });
    }, 200);

    try {
      // Create a FormData instance to send the file and other data to the API
      const formData = new FormData();
      formData.append('file', selectedFile);  // The user's sketch image file (API expects 'file')
      // Create a combined prompt with description and gender
      const combinedPrompt = `${description} (${selectedGender})`;
      formData.append('prompt', combinedPrompt);  // The text prompt for the API
      
      // Make the API call to generate the face image
      const response = await fetch('http://216.81.248.20:8000/generate-image', {
        method: 'POST',
        body: formData,
        // Note: Don't set Content-Type header for FormData, let the browser set it automatically
      });
      
      // Check if the response was successful (status code 2xx)
      if (!response.ok) {
        // Extract error message if available in response or use default
        let errorMessage = 'Failed to process the sketch';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // The API returns the image directly as a blob/file download
      const imageBlob = await response.blob();
      
      // Create a URL for the generated image blob
      const imageUrl = URL.createObjectURL(imageBlob);
        // Create the result object with the generated image
      const apiResult = {
        imageUrl: imageUrl,  // URL to the AI-generated face image
        message: 'Face successfully generated!'  // Success message
      };        
      
      // Clear the progress interval and set to 100%
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      // Store the generated face result in component state
      setResult(apiResult);
      
      // Display a success notification to inform the user
      setNotification({
        type: 'success',
        message: 'Face was successfully generated from your sketch!'
      });
      
      // Display the result modal to show the generated face
      setIsModalOpen(true);
      
      // Add a small delay to ensure smooth loading completion visual feedback
      setTimeout(() => {
        setIsLoading(false);
      }, 500); // Half second delay for smooth transition
        } catch (error) {
      // Log the error to console for debugging purposes
      console.error('Error processing sketch:', error);
      
      // Clear the progress interval on error
      clearInterval(progressInterval);
      
      // Show user-friendly error notification
      setNotification({
        type: 'error',
        message: 'Failed to process the sketch. Please try again.'
      });
      
      // Add a small delay for smooth transition even on error
      setTimeout(() => {
        setIsLoading(false);
      }, 500); // Half second delay for consistent UX
    }};
  return (    <div 
      className="min-h-screen w-full flex flex-col relative overflow-x-hidden"
      style={{
        backgroundImage: `url('./src/assets/Backgroundimg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/70 z-0"></div>
      
      {/* Content wrapper with relative positioning */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Section */}
      <header className="w-full bg-gray-800/95 backdrop-blur-sm py-2 sm:py-3 md:py-4 px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 shadow-lg border-b border-gray-700">
        <a href='#'>
        <div className="w-full flex items-center justify-between">          
            <div className="flex items-center">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 mr-2 sm:mr-3 md:mr-4 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 p-1">
              <img src="./logo.png" alt="FaceTrace Logo" className="w-full h-full object-contain rounded-full" />
            
            </div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">FaceTrace</h1>
          </div>
          
          {/* Optional: Add a tagline for larger screens */}
          <div className="hidden lg:block">
            <p className="text-gray-300 text-sm xl:text-base">Transform sketches into realistic faces with AI</p>
          </div>
        </div>
        </a>
      </header>      {/* Main Content */}
      <main className="flex-1 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-16 2xl:px-20 py-2 sm:py-4 md:py-6 lg:py-8">
        <div className="w-full max-w-none space-y-4 sm:space-y-6 md:space-y-8">
          {/* Two Column Layout for Upload and Description */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8 lg:gap-10 items-start">
            {/* Left Column - Upload Sketch Section - Takes 3 columns on XL screens */}
          <div className="xl:col-span-3 text-left">
            <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">Upload Your Sketch</h2>
            {/* Upload Area - Responsive Height */}
            <div
              className={`w-full border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer h-64 sm:h-80 md:h-96 lg:h-[32rem] xl:h-[36rem] 2xl:h-[40rem] ${
                selectedFile
                  ? 'border-green-400 bg-gray-800/50'
                  : dragOver 
                    ? 'border-cyan-400 bg-cyan-400/10' 
                    : 'border-gray-600 hover:border-cyan-400 hover:bg-gray-800/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
                className="hidden"
              />                {selectedFile ? (
                /* Image Display - Larger size to better fill the container */
                <div className="relative h-full p-1 sm:p-2 md:p-3 flex flex-col">
                  <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                    <img 
                      src={URL.createObjectURL(selectedFile)} 
                      alt="Selected sketch" 
                      className="w-full h-full object-cover rounded-lg shadow-2xl border-2 border-gray-600 hover:border-cyan-400 transition-all duration-300"
                      style={{
                        minWidth: '100%',
                        minHeight: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%'
                      }}
                    />
                  </div>
                  
                  {/* Image Info Overlay - Fixed at Bottom */}
                  <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2 bg-gray-900/90 backdrop-blur-sm p-1 sm:p-2 md:p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-white text-xs sm:text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-gray-400 text-xs">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Ready
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1 sm:space-x-2 ml-1 sm:ml-3 flex-shrink-0">
                        <button 
                          className="bg-cyan-600/80 hover:bg-cyan-600 p-1 sm:p-2 rounded-full text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('fileInput')?.click();
                          }}
                          title="Replace image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                            <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                          </svg>
                        </button>
                        <button 
                          className="bg-red-600/80 hover:bg-red-600 p-1 sm:p-2 rounded-full text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          title="Remove image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button></div>
                    </div>
                  </div>
                </div>              ) : (                /* Upload Placeholder - Fixed Height */
                <div className="h-full flex flex-col items-center justify-center space-y-2 sm:space-y-4 p-2 sm:p-4 md:p-8">
                  <Upload className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-gray-400" />
                  <div className="text-center">
                    <p className="text-white text-sm sm:text-base md:text-lg lg:text-xl mb-1 sm:mb-2">
                      Drag and drop your sketch here
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm md:text-base">JPG, PNG, GIF accepted</p>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2 hidden sm:block">Image will fit within the upload area</p>
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Right Column - Description and Controls - Takes 2 columns on XL screens */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
            {/* Description Input Section */}
            <div className="text-left">
              <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">Describe the Subject</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Type your prompt or description here..."
                className="w-full h-24 sm:h-32 md:h-40 lg:h-48 bg-gray-800/70 backdrop-blur-sm border border-gray-600 rounded-xl px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-200 text-sm sm:text-base md:text-lg"
              />
            </div>

            {/* Gender Selection Section */}
            <div className="text-left">
              <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">Select Gender</h2>
              <div className="flex justify-start space-x-6 sm:space-x-8 md:space-x-10 lg:space-x-12">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={selectedGender === 'male'}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 group-hover:scale-110 ${
                    selectedGender === 'male' 
                      ? 'border-cyan-400 bg-cyan-400 shadow-lg shadow-cyan-400/30' 
                      : 'border-gray-500 hover:border-cyan-300'
                  }`}>
                    {selectedGender === 'male' && (
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-white text-base sm:text-lg md:text-xl lg:text-2xl font-medium">Male</span>
                </label>
                
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={selectedGender === 'female'}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 group-hover:scale-110 ${
                    selectedGender === 'female' 
                      ? 'border-cyan-400 bg-cyan-400 shadow-lg shadow-cyan-400/30' 
                      : 'border-gray-500 hover:border-cyan-300'
                  }`}>
                    {selectedGender === 'female' && (
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-white"></div>
                    )} 
                  </div>
                  <span className="text-white text-base sm:text-lg md:text-xl lg:text-2xl font-medium">Female</span>
                </label>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="text-left">
                <p className="text-red-400 text-sm sm:text-base md:text-lg">{errorMessage}</p>
              </div>
            )}

            {/* Submit Button Section */}
            <div className="flex flex-col items-start pt-4 sm:pt-6 md:pt-8 w-full">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`w-full py-4 sm:py-5 md:py-6 rounded-xl text-base sm:text-lg md:text-xl lg:text-2xl font-semibold transition-all duration-300 flex items-center justify-center shadow-xl relative overflow-hidden ${
                  isLoading
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-black to-gray-900 border-2 border-gray-700 hover:from-gray-900 hover:to-black hover:border-cyan-500 text-white transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20'
                }`}
              >
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                )}
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 mr-3 relative">
                      <div className="absolute inset-0 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                    </div>
                    <span className="hidden sm:inline">Generating Your Face...</span>
                    <span className="sm:hidden">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 mr-3 transition-transform group-hover:scale-110" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    </svg>
                    <span className="hidden sm:inline">Generate Face</span>
                    <span className="sm:hidden">Generate</span>
                  </>
                )}
              </button>
              <p className="mt-3 sm:mt-4 md:mt-6 text-gray-400 text-sm sm:text-base md:text-lg text-left leading-relaxed">
                <span className="hidden sm:inline">Our advanced AI will transform your sketch into a photorealistic face in seconds</span>
                <span className="sm:hidden">AI will transform your sketch into a realistic face</span>
              </p>
            </div>
          </div>
        </div>          {/* Notification Display */}
        {notification && (
          <div className={`mt-2 sm:mt-4 p-2 sm:p-4 rounded-lg text-center animate-fadeIn flex items-center justify-center ${
            notification.type === 'success' ? 'bg-green-800/50 text-green-300 border border-green-500/30' : 'bg-red-800/50 text-red-300 border border-red-500/30'
          }`}>
            <div className="mr-2 sm:mr-3">
              {notification.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>            <p className="font-medium text-xs sm:text-sm">{notification.message}</p>
          </div>
        )}        {/* Result Display Section */}
        {result && !isModalOpen && (
          <div className="mt-4 sm:mt-6 md:mt-8 p-4 sm:p-6 md:p-8 bg-gray-800/90 backdrop-blur-sm rounded-xl text-center animate-fadeIn shadow-lg border border-gray-700">
            {/* Success Message */}
            <div className="mb-6">
              <h2 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3">🎉 Face Successfully Generated!</h2>
              <p className="text-green-400 text-sm sm:text-base md:text-lg font-medium">{result.message}</p>
              <p className="text-gray-300 text-sm md:text-base mt-2">Click the image below to view in full screen or download it</p>
            </div>

            {/* Responsive Layout for Image and Controls */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 items-start">
              
              {/* Large Generated Image Display - Takes 2 columns on XL screens */}
              <div className="xl:col-span-2">
                <div 
                  className="relative w-full bg-gray-700 rounded-xl overflow-hidden shadow-2xl ring-4 ring-cyan-500/50 cursor-pointer hover:ring-cyan-400 transition-all duration-300 hover:scale-[1.02] group"
                  onClick={() => setIsImageViewerOpen(true)}
                  title="Click to view full size"
                >                  <img 
                    src={result.imageUrl} 
                    alt="Generated face" 
                    className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                    style={{ minHeight: '300px', maxHeight: '85vh', minWidth: '100%' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-face.jpg';
                    }}
                  />
                  {/* Hover overlay with zoom icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white font-medium flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      <span className="hidden sm:inline">Click to view full size</span>
                      <span className="sm:hidden">View</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Panel - Takes 1 column on XL screens */}
              <div className="xl:col-span-1 space-y-6">
                {/* Description */}
                <div className="text-center xl:text-left">
                  <h3 className="text-white text-lg sm:text-xl lg:text-2xl font-semibold mb-3">Excellent Results!</h3>
                  <p className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed">
                    Our AI has successfully transformed your sketch into a realistic face based on your provided description.
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-4">
                  <button 
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all duration-300 flex items-center justify-center font-medium shadow-lg hover:shadow-xl text-sm sm:text-base lg:text-lg transform hover:scale-105"
                    onClick={() => {
                      // Download the generated image
                      if (result.imageUrl) {
                        const link = document.createElement('a');
                        link.href = result.imageUrl;
                        link.download = `generated-face-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Download High Quality Image</span>
                    <span className="sm:hidden">Download</span>
                  </button>

                  <button 
                    className="w-full py-3 sm:py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-300 flex items-center justify-center font-medium border border-gray-600 hover:border-gray-500 text-sm sm:text-base lg:text-lg transform hover:scale-105"
                    onClick={() => {
                      // Cleanup blob URL before resetting
                      if (result?.imageUrl && result.imageUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(result.imageUrl);
                      }
                      setResult(null);
                      setSelectedFile(null);
                      setDescription('');
                      setSelectedGender('');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Create New Image</span>
                    <span className="sm:hidden">New Image</span>
                  </button>
                </div>

                {/* Additional Info */}
                <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                  <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Image Details:</h4>
                  <ul className="text-gray-300 text-xs sm:text-sm space-y-1">
                    <li>• High-resolution AI generated image</li>
                    <li>• Based on your sketch and description</li>
                    <li>• Ready for download and use</li>
                    <li>• Click image for full-screen view</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>)}
          </div>
      </main>
        {/* Modal for displaying the generated face */}
      {result && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          imageUrl={result.imageUrl} // Pass the URL of the generated face image
          // Create an object URL from the selected file for display in the modal
          // This allows comparing the original sketch with the generated result
          sketchUrl={selectedFile ? URL.createObjectURL(selectedFile) : undefined}
          message={result.message} // Pass any success/info message from the API
        >          
        <div className="flex flex-col space-y-4 mt-4">            <button 
              className="py-3 bg-[#06B6D4] hover:bg-[#0891b2] text-white rounded-lg transition-colors flex items-center justify-center shadow-md"
              onClick={() => {
                // Create a download link for the generated face image
                if (result.imageUrl) {
                  const link = document.createElement('a');
                  link.href = result.imageUrl;
                  link.download = `generated-face-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click(); // Programmatically trigger the download
                  document.body.removeChild(link);
                }
              }}
            >
              <Download className="w-5 h-5 mr-2" />
              Download Image
            </button>              <button 
              className="py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center border border-gray-600"
              onClick={() => {
                // Reset the entire application state to create a new image:
                // Cleanup blob URL before resetting
                if (result?.imageUrl && result.imageUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(result.imageUrl);
                }
                setIsModalOpen(false);       // Close the modal
                setResult(null);             // Clear the generated result
                setSelectedFile(null);       // Clear the uploaded sketch
                setDescription('');          // Reset description input
                setSelectedGender('');       // Reset gender selection
              }}
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Create New Image
            </button>          </div>
        </Modal>
      )}      {/* Loading Screen */}
      <LoadingScreen isVisible={isLoading} externalProgress={loadingProgress} />
        {/* Full-size Image Viewer */}
      <ImageViewer 
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        imageUrl={result?.imageUrl}
        title="Generated Face"
      />
      </div>
    </div>
  );
}