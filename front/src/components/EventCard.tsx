import React from 'react';
import { Card } from 'react-bootstrap';
import { CalendarEvent, Clock, GeoAlt } from 'react-bootstrap-icons'; // Import extra icons
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
  // 🆕 Add registration status
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

        {/* Only show this green box if the student has a slot */}
        {event.assignedSlot && (
          <div 
            className="mt-auto mb-3 p-3 rounded" 
            style={{ backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9' }}
          >
            <div className="d-flex align-items-center mb-1 text-success fw-bold" style={{ fontSize: '0.9rem' }}>
              <GeoAlt className="me-2" /> {event.assignedSlot.floor}
            </div>
            <div className="d-flex align-items-center text-success" style={{ fontSize: '0.9rem' }}>
              <Clock className="me-2" /> {event.assignedSlot.time}
            </div>
          </div>
        )}
        
        <div className="mt-auto">
  {(() => {
    // Determine button state based on registration status
    if (event.registrationStatus === 'served') {
      return (
        <QrButton 
          text="You have been served " 
          onClick={() => {}} // No action needed
          variant="claimed"
          disabled={true}
        />
      );
    } else if (event.assignedSlot) {
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

{/*
    to use this component

import this inside

import EventCard from './components/EventCard';
import type { EventData } from './components/EventCard';
    
inside app function
const mockEvent: EventData = {
    id: "1",
    title: "Onam Special Lunch",
    description: "Traditional Onam Sadhya with special dishes",
    validDate: "Sep 10, 2025"
  };

  // 3. Create a mock function for the button
  const handleTestClick = (eventId: string) => {
    alert(`Button clicked for event ID: ${eventId}`);
  };


  inside return
  <EventCard event={mockEvent} onGetQR={handleTestClick} />
  
    */}
