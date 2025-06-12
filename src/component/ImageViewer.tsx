import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

/**
 * Interface defining props for the ImageViewer component
 * 
 * @interface ImageViewerProps
 * @property {boolean} isOpen - Controls the visibility of the image viewer
 * @property {() => void} onClose - Function to call when viewer should close
 * @property {string} [imageUrl] - URL of the image to display
 * @property {string} [title] - Optional title for the image
 */
interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
}

/**
 * Full-screen image viewer component with black theme
 * Displays images in full size with zoom and download capabilities
 * 
 * @param {ImageViewerProps} props - The props for the ImageViewer component
 * @returns {JSX.Element | null} - The rendered ImageViewer or null if closed
 */
export default function ImageViewer({ isOpen, onClose, imageUrl, title }: ImageViewerProps) {
  /**
   * Effect hook to handle keyboard events and body scrolling
   * Sets up event listener for ESC key to close the viewer
   * Prevents scrolling of background content while viewer is open
   */
  useEffect(() => {
    /**
     * Event handler for keyboard events, closes viewer on ESC key
     * 
     * @param {KeyboardEvent} event - The keyboard event
     */
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent scrolling of background content when viewer is open
      document.body.style.overflow = 'hidden';
    }

    // Clean up event listeners and restore scrolling when component unmounts
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  /**
   * Handles clicks on the backdrop (area outside the image)
   * Closes the viewer when clicking outside the image
   * 
   * @param {React.MouseEvent<HTMLDivElement>} e - The mouse event
   */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handles the download of the displayed image
   * Creates a download link and triggers the download
   */
  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `generated-face-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Background overlay with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-50"></div>
      
      {/* Close button - positioned at top right */}
      <button
        className="absolute top-4 right-4 z-50 p-3 bg-black/80 hover:bg-black text-white rounded-full transition-all duration-200 hover:scale-110 border border-gray-700 hover:border-gray-500"
        onClick={onClose}
        title="Close (ESC)"
      >
        <X size={24} />
      </button>

      {/* Action buttons - positioned at top left */}
      <div className="absolute top-4 left-4 z-50 flex space-x-2">
        <button
          className="p-3 bg-black/80 hover:bg-black text-white rounded-full transition-all duration-200 hover:scale-110 border border-gray-700 hover:border-gray-500"
          onClick={handleDownload}
          title="Download Image"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Main image container */}
      <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
        {/* Title */}
        {title && (
          <div className="mb-4 text-center">
            <h2 className="text-white text-xl font-semibold bg-black/50 px-4 py-2 rounded-lg border border-gray-700">
              {title}
            </h2>
          </div>
        )}        {/* Image container with border and shadow */}
        <div className="relative bg-black border-2 border-gray-700 rounded-lg overflow-hidden shadow-2xl">
          {/* Main image */}
          <img
            src={imageUrl}
            alt={title || "Generated face"}
            className="max-w-[90vw] max-h-[85vh] object-contain transition-opacity duration-300"
            style={{ 
              minWidth: '300px',
              minHeight: '300px'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-face.jpg';
            }}
          />

          {/* Image overlay with subtle glow effect */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-black/20"></div>
        </div>

        {/* Bottom action bar */}
        <div className="mt-4 flex items-center space-x-4 bg-black/80 px-6 py-3 rounded-lg border border-gray-700">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600 hover:border-gray-500"
            onClick={handleDownload}
          >
            <Download size={16} />
            <span className="text-sm font-medium">Download</span>
          </button>
          
          <div className="text-gray-400 text-xs">
            Press <kbd className="px-2 py-1 bg-gray-700 rounded text-white">ESC</kbd> or click outside to close
          </div>
        </div>
      </div>

      {/* Floating particles for visual enhancement */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: '3s'
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
