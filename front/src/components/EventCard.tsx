import React from 'react';
import { Card } from 'react-bootstrap';
import { CalendarEvent, Clock } from 'react-bootstrap-icons'; // Removed GeoAlt, kept Clock
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
        <div className="d-flex align-items-center text-muted small mb-3">
          <CalendarEvent className="me-2" />
          <span>Valid: {event.validDate}</span>
        </div>

        {/* GREEN BOX: Shows Time Only (Floor removed) */}
        {event.assignedSlot && (
          <div 
            className="mt-auto mb-3 p-3 rounded" 
            style={{ backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9' }}
          >
            {/* Removed the Floor/GeoAlt section here */}
            
            <div className="d-flex align-items-center text-success fw-bold" style={{ fontSize: '0.9rem' }}>
              <Clock className="me-2" /> {event.assignedSlot.time}
            </div>
          </div>
        )}
        
        {/* Button Section */}
        <div className="mt-auto">
          {(() => {
            if (event.registrationStatus === 'served') {
              return (
                <QrButton 
                  text="You have been served" 
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
