import React from 'react';
import { Button } from 'react-bootstrap';
import { QrCodeScan, CheckCircleFill } from 'react-bootstrap-icons';
import colors from '../../assets/constants/colors'; 

interface QrButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'get' | 'show' | 'claimed';
  disabled?: boolean;
}

const QrButton: React.FC<QrButtonProps> = ({ text, onClick, variant = 'get', disabled = false }) => {
  
  // Define styles for each state
  const getButtonStyle = () => {
    switch (variant) {
      case 'get':
      case 'show':
        return {
          backgroundColor: colors.primary.main, // Same light green as before
          border: 'none',
          color: 'white'
        };
      case 'claimed':
        return {
          backgroundColor: '#ffffffff', // Light gray background
          border: '1px solid #2b8c46ff', // Subtle border
          color: '#37931bff' // Professional gray text
        };
      default:
        return {
          backgroundColor: colors.primary.main,
          border: 'none',
          color: 'white'
        };
    }
  };

  const getIcon = () => {
    if (variant === 'claimed') {
      return <CheckCircleFill className="me-2" />;
    }
    return <QrCodeScan className="me-2" />;
  };

  return (
    <Button
      variant="success"
      size="lg"
      className="w-100 d-flex align-items-center justify-content-center"
      style={getButtonStyle()}
      onClick={onClick}
      disabled={disabled}
    >
      {getIcon()}
      <span>{text}</span>
    </Button>
  );
};

export default QrButton;
