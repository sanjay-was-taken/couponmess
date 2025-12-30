import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { PlusCircle, Trash, PencilSquare, Lock, Unlock, BarChartFill, PersonBadge } from 'react-bootstrap-icons';
import colors from '../assets/constants/colors';
import EventStatsModal from '../components/EventStatsModal';
import { eventsApi } from '../services/api';
import VolunteerManagerModal from '../components/VolunteerManagerModal';


interface FloorConfig {
  id: number;
  floorName: string;
  counterCount: number;
  capacityPerCounter: number;
}

interface EventData {
  event_id: number;
  name: string;
  description: string;
  date: string;
  status: string;
  time_start?: string;
  time_end?: string;
}

const AdminPage: React.FC = () => {
  // --- Form State ---
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('14:00');
  const [currentStatus, setCurrentStatus] = useState<string>('active');
  const defaultFloors = [{ id: 1, floorName: '1st Floor', counterCount: 2, capacityPerCounter: 50 }];
  const [floors, setFloors] = useState<FloorConfig[]>(defaultFloors);

  // --- Data State ---
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{type: 'success'|'danger'|'warning', text: string} | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // --- Stats Modal State ---
  const [showStats, setShowStats] = useState(false);
  const [selectedEventForStats, setSelectedEventForStats] = useState<{id: number, name: string} | null>(null);

  // --- Volunteer Modal State ---
  const [showVolModal, setShowVolModal] = useState(false);
  const [selectedEventForVol, setSelectedEventForVol] = useState<{id: number, name: string} | null>(null);

  // --- Helpers ---
  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-GB'); 
  };

  const getStatusBadge = (event: EventData) => {
    if (event.status === 'closed') return <Badge bg="secondary">Closed</Badge>;
    return <Badge bg="success">Active</Badge>;
  };

  const isTimeInPast = (dateStr: string, timeStr: string) => {
    const checkDate = new Date(`${dateStr}T${timeStr}:00`);
    const now = new Date();
    return checkDate < now;
  };

  // 🆕 Helper to check if event has fully expired based on its End Time
  const hasEventEnded = (event: EventData) => {
      if (!event.time_end) return false;
      const endTime = new Date(event.time_end).getTime();
      const now = new Date().getTime();
      return endTime < now;
  };

  // --- API Actions ---
  const fetchEvents = async () => {
    setFetching(true);
    try {
      const data = await eventsApi.getAll();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // --- Floor Logic ---
  const addFloor = () => setFloors([...floors, { id: Date.now(), floorName: '', counterCount: 1, capacityPerCounter: 50 }]);
  const removeFloor = (id: number) => setFloors(floors.filter(f => f.id !== id));
  const updateFloor = (id: number, field: keyof FloorConfig, value: string | number) => {
    setFloors(floors.map(f => (f.id === id ? { ...f, [field]: value } : f)));
  };

  // --- Event Actions ---
  const handleEditClick = (event: EventData) => {
    setEditingEventId(event.event_id);
    setEventName(event.name);
    setDescription(event.description);
    setCurrentStatus(event.status);
    
    const dt = new Date(event.date);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    setEventDate(`${year}-${month}-${day}`); 

    if (event.time_start) {
        const start = new Date(event.time_start);
        setStartTime(start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
    if (event.time_end) {
        const end = new Date(event.time_end);
        setEndTime(end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }

    window.scrollTo(0, 0);
    setMessage({ type: 'success', text: `Editing mode: ${event.name}` });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEventName('');
    setEventDate('');
    setDescription('');
    setMessage(null);
    setFloors(defaultFloors);
  }

  const handleToggleStatus = async () => {
    if(!editingEventId) return;
    
    if (currentStatus === 'closed') {
        if (isTimeInPast(eventDate, endTime)) {
            alert("You cannot re-open this event because the End Time has passed.\n\nPlease extend the 'End Time' below first, then click Update.");
            return;
        }
    }

    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    const confirmMsg = newStatus === 'closed' ? "Close this event manually?" : "Re-open this event?";
    
    if(!window.confirm(confirmMsg)) return;

    try {
        await eventsApi.update(editingEventId, { status: newStatus });
        
        setCurrentStatus(newStatus);
        setMessage({ type: 'success', text: `Event marked as ${newStatus}` });
        fetchEvents();
    } catch (err) {
        setMessage({ type: 'danger', text: 'Failed to update status' });
    }
  };

  const handleDelete = async (id: number) => {
    if(!window.confirm("Are you sure you want to permanently delete this event? This will remove all student registrations and logs.")) return;
    
    // Set loading state to prevent double clicks
    setLoading(true); 
    
    try {
      await eventsApi.delete(id);
      
      setMessage({ type: 'success', text: 'Event deleted successfully' });
      
      // Refresh list to show it's gone
      fetchEvents();
    } catch (err: any) {
      console.error("Delete failed:", err);
      setMessage({ 
        type: 'danger', 
        text: err.message || 'Failed to delete event. Check console for details.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; 
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedDate = new Date(eventDate);
    const today = new Date(getTodayIST());
    
    if (selectedDate < today) {
      setMessage({ 
        type: 'danger', 
        text: 'Cannot create events for past dates. Please select today or a future date.' 
      });
      return;
    }

    const fullDate = `${eventDate}T00:00:00.000Z`;
    const fullStartTime = `${eventDate} ${startTime}:00`;
    const fullEndTime = `${eventDate} ${endTime}:00`;

    setLoading(true);

    try {
      if (editingEventId) {
        await eventsApi.update(editingEventId, { 
            name: eventName, 
            description, 
            date: fullDate,
            time_start: fullStartTime, 
            time_end: fullEndTime,
            status: currentStatus 
        });

        setMessage({ type: 'success', text: 'Event updated successfully!' });
        setEditingEventId(null);
      } else {
        const eventData = await eventsApi.create({ 
            name: eventName, 
            description, 
            date: fullDate 
        });
        
        const slotPromises: Promise<any>[] = [];
        floors.forEach(floor => {
          for (let i = 1; i <= floor.counterCount; i++) {
            slotPromises.push(eventsApi.createSlots(eventData.event_id, {
                floor: floor.floorName,
                counter: i,
                capacity: floor.capacityPerCounter,
                time_start: fullStartTime,
                time_end: fullEndTime
            }));
          }
        });
        await Promise.all(slotPromises);
        setMessage({ type: 'success', text: 'Event created successfully!' });
      }
      
      setEventName(''); setDescription(''); setEventDate('');
      setFloors(defaultFloors);
      fetchEvents();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'danger', text: 'Operation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const openStats = (event: EventData) => {
      setSelectedEventForStats({ id: event.event_id, name: event.name });
      setShowStats(true);
  };

  const handleManageVolunteers = (event: EventData) => {
    setSelectedEventForVol({ id: event.event_id, name: event.name });
    setShowVolModal(true);
  };

  return (
    <Container className="py-4">
      {/* --- Header --- */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">{editingEventId ? 'Edit Event' : 'Create New Mess Event'}</h2>
        {editingEventId && <Button variant="outline-secondary" onClick={handleCancelEdit}>Cancel Edit</Button>}
      </div>
      
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      {/* --- FORM SECTION --- */}
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4 shadow-sm border-0">
          <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
            <span>Event Details</span>
            {editingEventId && (
                <Button 
                    size="sm" 
                    variant={currentStatus === 'active' ? 'outline-danger' : 'outline-success'}
                    onClick={handleToggleStatus}
                >
                    {currentStatus === 'active' ? (
                        <><Lock className="me-1"/> Close Event</>
                    ) : (
                        <><Unlock className="me-1"/> Re-open Event</>
                    )}
                </Button>
            )}
          </Card.Header>

          <Card.Body>
            {editingEventId && (
                <Alert variant={currentStatus === 'active' ? 'success' : 'secondary'} className="py-2 mb-3 small">
                    <strong>Current Status: </strong> {currentStatus.toUpperCase()}
                </Alert>
            )}

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Event Name</Form.Label>
                  <Form.Control type="text" required value={eventName} onChange={e => setEventName(e.target.value)} min={getTodayIST()} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)}  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </Form.Group>
            
            <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>End Time</Form.Label>
                    <Form.Control type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                  </Form.Group>
                </Col>
            </Row>
          </Card.Body>
        </Card>

        {!editingEventId && (
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
              <span>Floor and Hostel Configuration</span>
              <Button variant="outline-primary" size="sm" onClick={addFloor}>
                <PlusCircle className="me-1"/> Add Mess
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="fw-bold text-muted small" style={{ minWidth: '150px' }}>FLOOR NAME / HOSTEL NAME</th>
                      <th className="fw-bold text-muted small text-center">COUNTERS</th>
                      <th className="fw-bold text-muted small text-center">CAPACITY</th>
                      <th className="fw-bold text-muted small text-center" style={{ minWidth: '80px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {floors.map((floor, index) => (
                      <tr key={floor.id}>
                        <td className="align-middle">
                          <Form.Control 
                            type="text" 
                            value={floor.floorName} 
                            onChange={(e) => updateFloor(floor.id, 'floorName', e.target.value)} 
                            placeholder={`Mess ${index + 1}`}
                            required 
                            size="sm"
                            style={{ minWidth: '140px' }}
                          />
                        </td>

                        <td className="align-middle text-center">
                          <Form.Control 
                            type="number" 
                            min={1} 
                            value={floor.counterCount} 
                            onChange={(e) => updateFloor(floor.id, 'counterCount', parseInt(e.target.value))} 
                            size="sm"
                            style={{ width: '80px', margin: '0 auto' }}
                          />
                        </td>
                        <td className="align-middle text-center">
                          <Form.Control 
                            type="number" 
                            min={1}
                            value={floor.capacityPerCounter} 
                            onChange={(e) => updateFloor(floor.id, 'capacityPerCounter', parseInt(e.target.value))} 
                            size="sm"
                            style={{ width: '80px', margin: '0 auto' }}
                          />
                        </td>
                        <td className="align-middle text-center" style={{ minWidth: '80px' }}>
                        {floors.length > 1 ? (
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => removeFloor(floor.id)}
                          >
                            <Trash />
                          </Button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

        <Button variant={editingEventId ? "warning" : "success"} size="lg" type="submit" className="w-100 mb-5" disabled={loading} style={!editingEventId ? { backgroundColor: colors.primary.main } : {}}>
          {loading ? <Spinner animation="border" size="sm" /> : (editingEventId ? 'Update Event' : 'Create Event')}
        </Button>
      </Form>

      {/* --- TABLE SECTION --- */}
      <h3 className="mb-3 fw-bold mt-5 border-top pt-4">Manage Existing Events</h3>
      {fetching ? <div className="text-center p-5"><Spinner animation="border" variant="success" /></div> : 
       events.length === 0 ? <Alert variant="info">No events found.</Alert> : (
        <Card className="shadow-sm border-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Time Slot</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => {
                const isExpired = hasEventEnded(event); // Check if time has passed

                return (
                  <tr key={event.event_id}>
                    <td>
                      <div 
                          className="fw-bold text-primary" 
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => openStats(event)}
                          title="Click to view stats"
                      >
                          {event.name} <BarChartFill className="ms-1" size={14}/>
                      </div>
                      <small className="text-muted">{event.description}</small>
                    </td>
                    <td>{formatDate(event.date)}</td>
                    <td><span className="text-muted small fw-bold">{formatTime(event.time_start)} - {formatTime(event.time_end)}</span></td>
                    <td>{getStatusBadge(event)}</td>
                    
                    {/* 👇 UPDATED BUTTON CONTAINER FOR MOBILE 👇 */}
                    <td className="text-end">
                      {isExpired ? (
                        <span className="text-muted small fst-italic">Expired</span>
                      ) : (
                        // Used d-flex with column direction on mobile (flex-column) and row on desktop (flex-md-row)
                        // Added 'gap-2' for consistent spacing without margins
                        <div className="d-flex flex-column flex-md-row gap-2 justify-content-md-end align-items-stretch">
                          <Button 
                            variant="outline-dark" 
                            size="sm" 
                            title="Manage Staff"
                            onClick={() => handleManageVolunteers(event)}
                          >
                            <PersonBadge /> Staff
                          </Button>
                          <Button variant="outline-primary" size="sm" onClick={() => handleEditClick(event)}>
                            <PencilSquare /> Edit
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(event.event_id)}>
                            <Trash /> Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* --- STATS MODAL COMPONENT --- */}
      <EventStatsModal 
        show={showStats} 
        onHide={() => setShowStats(false)} 
        eventId={selectedEventForStats?.id || null} 
        eventName={selectedEventForStats?.name || ''} 
      />

      {/* --- VOLUNTEER MODAL COMPONENT --- */}
      <VolunteerManagerModal 
        show={showVolModal}
        onHide={() => setShowVolModal(false)}
        eventId={selectedEventForVol?.id || null}
        eventName={selectedEventForVol?.name || ''}
      />
    </Container>
  );
};

export default AdminPage;
