import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Spinner, Alert, Button } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext'; 

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (errorMessage: string) => void;
}

const scannerRegionId = 'qr-scanner-region';

export const QrScanner = ({ onScanSuccess, onScanFailure }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { colors } = useTheme(); 

  useEffect(() => {
    // 1. Initialize the Core Scanner
    const html5QrCode = new Html5Qrcode(scannerRegionId, {
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        verbose: false
    });
    
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        // 2. Start Camera Automatically
        await html5QrCode.start(
          { facingMode: "environment" }, 
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            // FIX: Removed aspectRatio: 1.0 
            // This allows the camera to use its native aspect ratio (usually 4:3 or 16:9 on phones)
            // preventing the black bars from appearing on iOS.
          },
          (decodedText) => {
            // Success Callback
            html5QrCode.pause();
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Error Callback (Scanning...)
          }
        );
        setHasPermission(true);
      } catch (err: any) {
        console.error("Camera Start Error:", err);
        setStartError("Camera permission denied or camera not found.");
        if (onScanFailure) onScanFailure(err.message);
      }
    };

    // Kick off the start process
    startScanner();

    // 3. Cleanup on Unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
        }).catch(err => console.error("Stop failed", err));
      }
    };
  }, []); 

  const handleRetry = () => {
     if (scannerRef.current && scannerRef.current.isScanning === false) {
         scannerRef.current.resume();
     } else {
         window.location.reload(); 
     }
  }

  return (
    <div 
        className="qr-scanner-container position-relative rounded-3 overflow-hidden" 
        style={{ minHeight: '300px', backgroundColor: '#000' }} 
    >
      
      {/* The actual video element container */}
      <div id={scannerRegionId} className="w-100 h-100" />

      {/* Loading Overlay */}
      {!hasPermission && !startError && (
        <div 
            className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
            style={{ 
                backgroundColor: colors.ui.card, 
                color: colors.text.primary      
            }}
        >
            <Spinner animation="border" style={{ color: colors.primary.main }} className="mb-3"/>
            <p>Starting Camera...</p>
        </div>
      )}

      {/* Error Overlay */}
      {startError && (
          <div 
            className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center"
            style={{ backgroundColor: colors.ui.card }}
          >
              <Alert variant="danger">{startError}</Alert>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={handleRetry}
                style={{ color: colors.text.primary, borderColor: colors.ui.border }}
              >
                Try Again
              </Button>
          </div>
      )}

      {/* Guide Box */}
      {hasPermission && (
          <div className="position-absolute top-50 start-50 translate-middle pointer-events-none" 
               style={{ 
                   width: '250px', 
                   height: '250px', 
                   border: `2px solid ${colors.primary.main}`, 
                   borderRadius: '12px',
                   boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
               }}>
          </div>
      )}
      
      <style>{`
        #qr-scanner-region video { object-fit: cover; width: 100% !important; height: 100% !important; }
      `}</style>
    </div>
  );
};
