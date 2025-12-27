import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Spinner, Alert, Button } from 'react-bootstrap';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (errorMessage: string) => void;
}

const scannerRegionId = 'qr-scanner-region';

export const QrScanner = ({ onScanSuccess, onScanFailure }: QrScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success Callback
            // We pause immediately to stop multiple scans of the same code
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
  }, []); // Run once on mount

  const handleRetry = () => {
     if (scannerRef.current && scannerRef.current.isScanning === false) {
         scannerRef.current.resume();
     } else {
         window.location.reload(); 
     }
  }

  return (
    <div className="qr-scanner-container position-relative bg-black rounded-3 overflow-hidden" style={{ minHeight: '300px' }}>
      
      {/* The actual video element container */}
      <div id={scannerRegionId} className="w-100 h-100" />

      {/* Loading Overlay */}
      {!hasPermission && !startError && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white bg-dark">
            <Spinner animation="border" variant="light" className="mb-3"/>
            <p>Starting Camera...</p>
        </div>
      )}

      {/* Error Overlay */}
      {startError && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-dark p-4 text-center">
              <Alert variant="danger">{startError}</Alert>
              <Button variant="light" size="sm" onClick={handleRetry}>Try Again</Button>
          </div>
      )}

      {/* Guide Box */}
      {hasPermission && (
          <div className="position-absolute top-50 start-50 translate-middle pointer-events-none" 
               style={{ 
                   width: '250px', 
                   height: '250px', 
                   border: '2px solid rgba(255,255,255,0.6)', 
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