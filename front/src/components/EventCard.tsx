import React from 'react';
import { Card } from 'react-bootstrap';
import { CalendarEvent } from 'react-bootstrap-icons'; // Removed Clock, GeoAlt
import QrButton from './common/QrButton';

export interface EventData {
  id: string;
  title: string;
  description: string;
  validDate: string;
  // We keep this in the interface to prevent type errors if passed, 
  // but we won't render it.
  assignedSlot?: {
    floor: string;
    time: string;
  };
  registrationStatus?: 'not_registered' | 'registered' | 'served';
}

interface EventCardProps {
  event: EventData;
  onGetQR: (eventId: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onGetQR }) => {
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
        <div className="d-flex align-items-center text-muted small mb-4">
          <CalendarEvent className="me-2" />
          <span>Valid: {event.validDate}</span>
        </div>

        {/* REMOVED: The section displaying assignedSlot (Floor/Time) 
           is deleted as requested.
        */}
        
        <div className="mt-auto">
          {(() => {
            // 1. Case: Served
            if (event.registrationStatus === 'served') {
              return (
                <QrButton 
                  text="You have been served" 
                  onClick={() => {}} 
                  variant="claimed"
                  disabled={true}
                />
              );
            } 
            // 2. Case: Registered (Show QR)
            // We check status OR if a slot exists (backward compatibility)
            else if (event.registrationStatus === 'registered' || event.assignedSlot) {
              return (
                <QrButton 
                  text="Show QR Code" 
                  onClick={() => onGetQR(event.id)}
                  variant="show"
                />
              );
            } 
            // 3. Case: Not Registered (Get QR)
            else {
              return (
                <QrButton 
                  text="Get QR Code" 
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
