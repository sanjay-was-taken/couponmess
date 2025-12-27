import React from 'react';
import { Button, Container } from 'react-bootstrap';
import colors from '../assets/constants/colors';

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

  switch (result.status) {
    case 'success':
      IconComponent = CheckCircleFill;
      iconColor = colors.success.main;
      backgroundColor = colors.success.background;
      break;
    case 'warning':
      IconComponent = ExclamationTriangleFill;
      iconColor = colors.warning.main;
      backgroundColor = colors.warning.background;
      break;
    case 'error':
    default:
      IconComponent = XCircleFill;
      iconColor = colors.error.main;
      backgroundColor = colors.error.background;
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
      <h1 className="mt-4" style={{ fontWeight: 'bold' }}>
        {result.title}
      </h1>

      {/* Message */}
      <p className="text-secondary h5 mt-2">
        {result.message}
      </p>

      {/* Scan Next Button */}
      <Button 
        variant="success" 
        size="lg"
        className="mt-5"
        onClick={onScanNext} // This calls the function from the parent
      >
        Scan Next
      </Button>
    </Container>
  );
};

export default ScanResult;



{/*
to use this component 
first import it 

import ScanResult from './components/ScanResult';
import type { ScanResult as ScanResultType } from './components/ScanResult';

inside App function
    const mockResult: ScanResultType = {
        status: 'error', // Try 'error' or 'warning' to see different styles
        title: 'Invalid Coupon!',
        message: 'This is just a test'
    };

    const mockScanNext = () => {
        alert("Clicked 'Scan Next'");
    };


inside return
    <ScanResult result={mockResult} onScanNext={mockScanNext} />


*/}