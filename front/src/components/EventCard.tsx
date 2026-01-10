import React from 'react';
import { Card } from 'react-bootstrap';
import { CalendarEvent, Clock } from 'react-bootstrap-icons';
import QrButton from './common/QrButton';
import { useTheme } from '../context/ThemeContext'; // 1. Import Theme Hook

export interface EventData {
  id: string;
  title: string;
  description: string;
  validDate: string;
  assignedSlot?: {
    floor: string;
    time: string;
  };
  registrationStatus?: 'not_registered' | 'registered' | 'served';
  servedAt?: string | null; 
}

interface EventCardProps {
  event: EventData;
  onGetQR: (eventId: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onGetQR }) => {
  const { colors } = useTheme(); // 2. Get dynamic colors
  
  // Helper to format the served time (e.g., "12:30 PM")
  const getServedTimeStr = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return ''; 
    
    // FIX: Replace normal space with non-breaking space (\u00A0)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' , hour12: true }).replace(' ', '\u00A0');
  };

  return (
    <Card 
      className="shadow-sm mb-3 h-100" 
      style={{ 
        borderRadius: '15px', 
        backgroundColor: colors.ui.card, // Dynamic Background
        border: `1px solid ${colors.ui.border}` // Dynamic Border
      }}
    >
      <Card.Body className="p-4 d-flex flex-column">
        
        {/* Title */}
        <Card.Title className="h5 fw-bold mb-2" style={{ color: colors.text.primary }}>
          {event.title}
        </Card.Title>
        
        {/* Description */}
        <Card.Text className="small mb-3" style={{ color: colors.text.secondary }}>
          {event.description}
        </Card.Text>
        
        {/* Date Info */}
        <div className="d-flex align-items-center small mb-3" style={{ color: colors.text.secondary }}>
          <CalendarEvent className="me-2" />
          <span>Valid: {event.validDate}</span>
        </div>

        {/* GREEN BOX: Shows Time Only */}
        {/* Note: We use theme-specific 'success' or 'primary' colors here for consistency */}
        {event.assignedSlot && (
          <div 
            className="mt-auto mb-3 p-3 rounded" 
            style={{ 
                // Use a light variation of primary for bg, and main for border
                // You might want to ensure 'colors.primary.light' looks good in dark mode (usually a dark green)
                backgroundColor: colors.primary.light, 
                border: `1px solid ${colors.primary.main}` 
            }}
          >
            <div 
                className="d-flex align-items-center fw-bold" 
                style={{ fontSize: '0.9rem', color: colors.text.primary }}
            >
              <Clock className="me-2" style={{ color: colors.primary.main }} /> 
              {event.assignedSlot.time}
            </div>
          </div>
        )}
        
        {/* Button Section */}
        <div className="mt-auto">
          {(() => {
            if (event.registrationStatus === 'served') {
              const timeStr = getServedTimeStr(event.servedAt);
              const buttonText = timeStr 
                ? `You have been served at ${timeStr}` 
                : "You have been served";

              return (
                <QrButton 
                  text={buttonText} 
                  onClick={() => {}} 
                  variant="claimed"
                  disabled={true}
                />
              );
            } else if (event.registrationStatus === 'registered' || event.assignedSlot) {
              return (
                <QrButton 
                  text="Show QR Code" 
                  onClick={() => onGetQR(event.id)}
                  variant="show"
                />
              );
            } else {
              return (
                <QrButton 
                  text=" Register and show QR Code" 
                  onClick={() => onGetQR(event.id)}
                  variant="get"
                />
              );
            }
          })()}
        </div>

      </Card.Body>
    </Card>
  );
};

export default EventCard;