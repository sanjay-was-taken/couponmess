import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { eventsApi } from '../services/api';

interface VolunteerAssignmentModalProps {
  show: boolean;
  onAssignmentComplete: (assignment: { floor: string; counter: string }) => void;
  volunteerId: number;
  eventId: number;
  volunteerName: string;
}

interface Slot {
  floor: string;
  counter: string;
}

const VolunteerAssignmentModal: React.FC<VolunteerAssignmentModalProps> = ({ 
  show, 
  onAssignmentComplete, 
  volunteerId, 
  eventId, 
  volunteerName 
}) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedCounter, setSelectedCounter] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && eventId) {
      fetchSlots();
    }
  }, [show, eventId]);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getEventSlots(eventId);
      setSlots(data.slots);
    } catch (err: any) {
      setError(err.message || 'Failed to load available positions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFloor || !selectedCounter) {
      setError('Please select both floor and counter');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await eventsApi.updateVolunteerAssignment(volunteerId, {
        floor: selectedFloor,
        counter: selectedCounter
      });

      onAssignmentComplete({
        floor: selectedFloor,
        counter: selectedCounter
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueFloors = [...new Set(slots.map(slot => slot.floor))].sort();
  const availableCounters = slots
    .filter(slot => slot.floor === selectedFloor)
    .map(slot => slot.counter)
    .sort();

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Header className="bg-primary text-white">
        <Modal.Title>Choose Your Position</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center mb-4">
          <h5>Welcome, {volunteerName}!</h5>
          <p className="text-muted">Please select your Mess for this session.</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading available positions...</p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Mess</Form.Label>
              <Form.Select 
                value={selectedFloor} 
                onChange={(e) => {
                  setSelectedFloor(e.target.value);
                  setSelectedCounter(''); // Reset counter when floor changes
                }}
                required
              >
                <option value="">Select Floor / Hostel</option>
                {uniqueFloors.map(floor => (
                  <option key={floor} value={floor}>{floor}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Counter</Form.Label>
              <Form.Select 
                value={selectedCounter} 
                onChange={(e) => setSelectedCounter(e.target.value)}
                disabled={!selectedFloor}
                required
              >
                <option value="">Select Counter</option>
                {availableCounters.map(counter => (
                  <option key={counter} value={counter}>Counter {counter}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100"
              disabled={submitting || !selectedFloor || !selectedCounter}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Start Working'
              )}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default VolunteerAssignmentModal;
