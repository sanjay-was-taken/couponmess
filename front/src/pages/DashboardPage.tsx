import React, { useEffect, useState, useCallback } from 'react';
import EventCard from '../components/EventCard'; // The existing Active Card
import type { EventData } from '../components/EventCard';
import QRCodeModal from '../components/QRCodeModal'; 
import { useAuth } from '../context/AuthContext';
import { Spinner, Container, Badge, Modal, Button, Form, Card, Row, Col } from 'react-bootstrap';
import { eventsApi, registrationApi } from '../services/api';
import { ExclamationCircleFill, ClockHistory, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';

// 1. Updated Interface to include 'served_at'
interface BackendEvent {
  event_id: number;
  name: string;
  description: string;
  date: string;
  status: string;
  registration_id: number | null;
  registration_status: string | null;
  floor: string | null;
  time_start: string | null;
  time_end: string | null;
  served_at: string | null; // <--- NEW FIELD NEEDED FROM BACKEND
}

// --- NEW COMPONENT: PAST EVENT CARD ---
// --- FIXED COMPONENT: PAST EVENT CARD ---
const PastEventCard: React.FC<{ event: BackendEvent }> = ({ event }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 🔧 FIX: Use proper if-else logic instead of multiple conditions
  const renderStatus = () => {
    if (event.registration_status === 'served') {
      // Case 1: Served (Success)
      return (
        <div className="d-flex align-items-center text-success">
          <CheckCircleFill className="me-2" size={20} />
          <div>
            <div className="fw-bold">Coupon Claimed</div>
            <small className="text-muted">
              Served at {formatTime(event.served_at)}
            </small>
          </div>
        </div>
      );
    } else if (event.registration_status === 'registered') {
      // Case 2: Registered but Missed (Failure)
      return (
        <div className="d-flex align-items-center text-danger">
          <XCircleFill className="me-2" size={20} />
          <div>
            <div className="fw-bold">Coupon Unused</div>
            <small className="text-muted">You registered but didn't eat.</small>
          </div>
        </div>
      );
    } else {
      // Case 3: Did not Register
      return (
        <div className="d-flex align-items-center text-secondary">
          <ExclamationCircleFill className="me-2" size={20} />
          <div>
            <div className="fw-bold">Not Registered</div>
            <small className="text-muted">Missed this event.</small>
          </div>
        </div>
      );
    }
  };

  return (
    <Card className="h-100 border-0 shadow-sm" style={{ opacity: 0.8, backgroundColor: '#f8f9fa' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="fw-bold text-secondary mb-0">{event.name}</h5>
          <Badge bg="secondary" pill>{formatDate(event.date)}</Badge>
        </div>
        
        <p className="text-muted small mb-3">{event.description}</p>
        
        <div className="p-3 rounded-3 bg-white border">
          {renderStatus()}
        </div>
      </Card.Body>
    </Card>
  );
};



const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  
  // --- UI State ---
  const [activeEvents, setActiveEvents] = useState<EventData[]>([]);
  const [pastEvents, setPastEvents] = useState<BackendEvent[]>([]); // Store raw backend data for past
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- View Filter State (Dropdown) ---
  const [viewFilter, setViewFilter] = useState<'active' | 'past'>('active');

  // --- Modal States ---
  const [showQrModal, setShowQrModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [qrToken, setQrToken] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  
  const selectedEvent = activeEvents.find(e => e.id === selectedEventId);

  // --- Helpers ---
  const getCleanName = (fullName: string | undefined) => {
    if (!fullName) return "Student";
    return fullName.split('-')[0].trim();
  };

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // --- 1. Fetch Events ---
  const fetchEvents = useCallback(async () => {
  if (!user) return;
  try {
    setLoading(true);
    
    // 🆕 Use new endpoint that returns all events (active + past)
    const data: BackendEvent[] = await eventsApi.getAllForStudent(user.user_id);

    const activeList: EventData[] = [];
    const pastList: BackendEvent[] = [];

    data.forEach(item => {
      // 🆕 Filter by event status instead of date comparison
      if (item.status === 'active') {
        // --- Prepare Active Event Data ---
        let slotInfo = undefined;
        if (item.floor && item.time_start && item.time_end) {
          const start = new Date(item.time_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const end = new Date(item.time_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          slotInfo = { floor: item.floor, time: `${start} - ${end}` };
        }
        // In the fetchEvents function, when building activeList
        activeList.push({
          id: item.event_id.toString(),
          title: item.name,
          description: item.description,
          validDate: new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          assignedSlot: slotInfo,
          registrationStatus: item.registration_status === 'served' ? 'served' : 
                              item.registration_id ? 'registered' : 'not_registered',
          servedAt: item.served_at // <--- ADD THIS LINE to pass the data
        });

      } else if (item.status === 'closed') {
        // --- Prepare Past Event Data ---
        pastList.push(item);
      }
    });

    // Sort past events (newest first)
    pastList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setActiveEvents(activeList);
    setPastEvents(pastList);

  } catch (err) {
    console.error(err);
    setError('Could not load events.');
  } finally {
    setLoading(false);
  }
}, [user]);


  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- 2. Handle Get QR ---
  const handleGetQR = async (eventId: string) => {
    if (!user) return;
    setSelectedEventId(eventId);
    try {
      const result = await registrationApi.register(user.user_id, parseInt(eventId));
      setQrToken(result.data.qr_token);
      setShowQrModal(true);
      fetchEvents(); 
    } catch (err: any) {
      setApiErrorMessage(err.message || "Registration failed.");
      setShowErrorModal(true);
    }
  };

  const handleCloseQrModal = () => {
    setShowQrModal(false);
    setQrToken('');
    setSelectedEventId(null);
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setApiErrorMessage("");
  };

  // --- Render Loading ---
  if (loading && activeEvents.length === 0 && pastEvents.length === 0) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <Spinner animation="border" variant="success" />
    </div>
  );

  // --- Render Dashboard ---
  return (
    <Container className="py-5">
      
      {/* Welcome Banner */}
      <div 
        className="p-5 rounded-4 mb-5 shadow-sm text-center text-md-start"
        style={{ 
          background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
          borderLeft: '5px solid #4caf50' 
        }}
      >
        <h1 className="fw-bold display-6 text-dark mb-2">
          Welcome back, <span className="text-success">{getCleanName(user?.name)}!</span> 
        </h1>
        <p className="text-secondary mb-0" style={{ fontSize: '1.1rem' }}>
          {todayDate}
        </p>
      </div>

      {/* Control Header: Title + Dropdown */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <h4 className="fw-bold mb-0 me-3">
            {viewFilter === 'active' ? 'Upcoming Meals' : 'Past History'}
          </h4>
          <Badge bg={viewFilter === 'active' ? 'success' : 'secondary'} pill>
            {viewFilter === 'active' ? activeEvents.length : pastEvents.length}
          </Badge>
        </div>

        {/* 👇 THE DROPDOWN MENU */}
        <Form.Select 
          value={viewFilter} 
          onChange={(e) => setViewFilter(e.target.value as 'active' | 'past')}
          style={{ width: '180px', fontWeight: 'bold' }}
          className="shadow-sm border-success"
        >
          <option value="active">Active Events</option>
          <option value="past">Past Events</option>
        </Form.Select>
      </div>
      
      {/* CONTENT AREA */}
      {viewFilter === 'active' ? (
        // --- ACTIVE EVENTS GRID (Existing) ---
        <Row className="g-4">
          {activeEvents.length === 0 ? (
            <div className="text-center py-5 bg-light rounded-3">
              <p className="text-muted mb-0">No active events found for today.</p>
            </div>
          ) : (
            activeEvents.map((event) => (
              <Col key={event.id} md={6} lg={4}>
                <EventCard 
                  event={event} 
                  onGetQR={handleGetQR} 
                />
              </Col>
            ))
          )}
        </Row>
      ) : (
        // --- PAST EVENTS GRID (New) ---
        <Row className="g-4">
          {pastEvents.length === 0 ? (
            <div className="text-center py-5 bg-light rounded-3">
              <ClockHistory size={32} className="text-muted mb-3"/>
              <p className="text-muted mb-0">No history available yet.</p>
            </div>
          ) : (
            pastEvents.map((event) => (
              <Col key={event.event_id} md={6} lg={4}>
                <PastEventCard event={event} />
              </Col>
            ))
          )}
        </Row>
      )}

      {/* QR Success Modal */}
      <QRCodeModal 
        show={showQrModal}
        onHide={handleCloseQrModal}
        eventName={selectedEvent?.title || ''}
        qrToken={qrToken}
        slotDetails={selectedEvent?.assignedSlot}
      />

      {/* Error Modal */}
      <Modal show={showErrorModal} onHide={handleCloseErrorModal} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger d-flex align-items-center">
            <ExclamationCircleFill className="me-2" />
            Registration Issue
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4 text-center">
          <h5 className="mb-3">Could not generate QR Code</h5>
          <p className="text-muted mb-0">{apiErrorMessage}</p>
        </Modal.Body>
        <Modal.Footer className="border-0 justify-content-center pt-0 pb-4">
          <Button variant="secondary" onClick={handleCloseErrorModal} className="px-4 rounded-pill">
            Close
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default DashboardPage;
