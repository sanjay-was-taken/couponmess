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
  let btnVariant = '';

  switch (result.status) {
    case 'success':
      IconComponent = CheckCircleFill;
      iconColor = '#198754'; // Green
      backgroundColor = '#d1e7dd'; 
      textColor = '#0f5132';
      btnVariant = 'success';
      break;

    case 'warning': 
      // 🟡 WARNING STATE (Yellow)
      IconComponent = ExclamationTriangleFill;
      iconColor = '#fd7e14'; // Orange/Yellow
      backgroundColor = '#fff3cd'; // Light Yellow Background
      textColor = '#664d03'; // Dark Yellow Text
      btnVariant = 'warning'; // Bootstrap yellow button
      break;

    case 'error':
    default:
      IconComponent = XCircleFill;
      iconColor = '#dc3545'; // Red
      backgroundColor = '#f8d7da'; 
      textColor = '#842029';
      btnVariant = 'danger';
      break;
  }

  return (
    <Container 
      fluid
      className="d-flex flex-column justify-content-center align-items-center"
      style={{ 
        height: '100vh', 
        backgroundColor: backgroundColor, 
        padding: '1rem',
        transition: 'background-color 0.3s ease'
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
        variant={btnVariant} 
        size="lg"
        className="mt-5 text-white fw-bold shadow-sm"
        style={{ minWidth: '200px' }}
        onClick={onScanNext} 
      >
        {result.status === 'warning' ? 'Scan Next' : 'Scan Next'}
      </Button>
    </Container>
  );
};

export default ScanResult;
