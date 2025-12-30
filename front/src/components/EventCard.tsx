import React from 'react';
import { Card } from 'react-bootstrap';
import { CalendarEvent, Clock } from 'react-bootstrap-icons';
import QrButton from './common/QrButton';

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
  
  // Helper to format the served time (e.g., "12:30 PM")
  const getServedTimeStr = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return ''; 
    
    // FIX: Replace normal space with non-breaking space (\u00A0)
    // This ensures "06:05 PM" stays together and prevents the "PM" from hanging on a new line
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' , hour12: true }).replace(' ', '\u00A0');
  };

  return (
    <Card className="shadow-sm mb-3 h-100" style={{ borderRadius: '15px', border: 'none' }}>
      <Card.Body className="p-4 d-flex flex-column">
        
        {/* Title */}
        <Card.Title className="h5 fw-bold mb-2">
          {event.title}
        </Card.Title>
        
        {/* Description */}
        <Card.Text className="text-secondary small mb-3">
          {event.description}
        </Card.Text>
        
        {/* Date Info */}
        <div className="d-flex align-items-center text-muted small mb-3">
          <CalendarEvent className="me-2" />
          <span>Valid: {event.validDate}</span>
        </div>

        {/* GREEN BOX: Shows Time Only */}
        {event.assignedSlot && (
          <div 
            className="mt-auto mb-3 p-3 rounded" 
            style={{ backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9' }}
          >
            <div className="d-flex align-items-center text-success fw-bold" style={{ fontSize: '0.9rem' }}>
              <Clock className="me-2" /> {event.assignedSlot.time}
            </div>
          </div>
        )}
        
        {/* Button Section */}
        <div className="mt-auto">
          {(() => {
            if (event.registrationStatus === 'served') {
              // Format the time if available
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
