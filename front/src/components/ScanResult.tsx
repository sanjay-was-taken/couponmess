import React from 'react';
import { Button, Container } from 'react-bootstrap';
import { 
  CheckCircleFill, 
  ExclamationTriangleFill, 
  XCircleFill 
} from 'react-bootstrap-icons';

export interface ScanResult {
  status: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

interface ScanResultPageProps {
  result: ScanResult;
  onScanNext: () => void;
}

const ScanResult: React.FC<ScanResultPageProps> = ({ result, onScanNext }) => {
  
  let IconComponent;
  let iconColor = '';
  let backgroundColor = '';
  let textColor = '';

  switch (result.status) {
    case 'success':
      IconComponent = CheckCircleFill;
      iconColor = '#198754'; // Bootstrap success (Green)
      backgroundColor = '#d1e7dd'; // Light Green
      textColor = '#0f5132';
      break;

    case 'warning': // 🟡 HANDLING THE WARNING CASE
      IconComponent = ExclamationTriangleFill;
      iconColor = '#fd7e14'; // Bootstrap Orange/Yellow
      backgroundColor = '#fff3cd'; // Light Yellow
      textColor = '#664d03';
      break;

    case 'error':
    default:
      IconComponent = XCircleFill;
      iconColor = '#dc3545'; // Bootstrap danger (Red)
      backgroundColor = '#f8d7da'; // Light Red
      textColor = '#842029';
      break;
  }

  return (
    <Container 
      fluid
      className="d-flex flex-column justify-content-center align-items-center"
      style={{ 
        height: '100vh', 
        backgroundColor: backgroundColor, 
        padding: '1rem' 
      }}
    >
      {/* Icon */}
      <IconComponent 
        size={90} 
        color={iconColor}
      />

      {/* Title */}
      <h1 className="mt-4 text-center fw-bold" style={{ color: textColor }}>
        {result.title}
      </h1>

      {/* Message */}
      <p className="h5 mt-2 text-center px-3" style={{ color: textColor, opacity: 0.9 }}>
        {result.message}
      </p>

      {/* Scan Next Button */}
      <Button 
        variant={result.status === 'warning' ? 'warning' : (result.status === 'success' ? 'success' : 'danger')} 
        size="lg"
        className="mt-5 text-white fw-bold shadow-sm"
        style={{ minWidth: '200px' }}
        onClick={onScanNext} 
      >
        Scan Next
      </Button>
    </Container>
  );
};

export default ScanResult;
