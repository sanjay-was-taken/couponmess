import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, ListGroup } from 'react-bootstrap';
import { QrScanner } from '../components/QrScanner';
import { useAuth } from '../context/AuthContext';
import ScanResult from '../components/ScanResult';
import VolunteerStatsModal from '../components/VolunteerStatsModal'; 
import { CalendarEvent} from 'react-bootstrap-icons';
import { registrationApi, eventsApi } from '../services/api';
import VolunteerAssignmentModal from '../components/VolunteerAssignmentModal';


// Add this interface
interface ScanLog {
  student_name: string;
  roll_number: string;
  batch: string;
  counter_name: string;
  scanned_at: string;
}

// Add this component
const RecentScansSection: React.FC<{ eventId: number }> = ({ eventId }) => {
  const [recentScans, setRecentScans] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
const [volunteerAssignment, setVolunteerAssignment] = useState<{floor: string, counter: string} | null>(null);


  useEffect(() => {
    const fetchRecentScans = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await eventsApi.getScanHistory(eventId);
        // Get only the last 10 scans
        setRecentScans(data.scanHistory.slice(0, 10));
      } catch (err) {
        console.error('Failed to fetch recent scans:', err);
        setError('Unable to load recent scans');
        setRecentScans([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchRecentScans();
    }
  }, [eventId]);


  if (loading) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" variant="success" />
          <p className="mt-2 mb-0 small text-muted">Loading recent scans...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-light border-0">
        <h6 className="mb-0 fw-bold text-dark">Recent Scans (Last 10)</h6>
      </Card.Header>
      <Card.Body className="p-0">
        {error ? (
          <div className="text-center py-4">
            <p className="text-muted mb-0 small">{error}</p>
            <p className="text-muted mb-0 small">Start scanning to see history</p>
          </div>
        ) : recentScans.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted mb-0 small">No scans yet</p>
          </div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <ListGroup variant="flush">
              {recentScans.map((scan, idx) => (
                <ListGroup.Item key={idx} className="py-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-semibold text-dark">{scan.student_name}</div>
                      <div className="small text-muted">{scan.roll_number}</div>
                      <span className="badge bg-light text-dark border small">Batch {scan.batch}</span>
                    </div>
                    <div className="text-end">
                      <div className="small text-success fw-semibold">{scan.counter_name}</div>
                      <div className="small text-muted">
                        {new Date(scan.scanned_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata'
                        })}
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};


interface EventData {
  event_id: number;
  name: string;
  date: string;
  status: string;
}

export const StaffPage = () => {
  const { user } = useAuth();
  
  // --- UI States ---
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // --- Result State ---
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error' | 'warning', message: string, studentId?: string } | null>(null);

  // --- Analytics State ---
  const [events, setEvents] = useState<EventData[]>([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{id: number, name: string} | null>(null);
  // --- Assignment State ---
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [volunteerAssignment, setVolunteerAssignment] = useState<{floor: string, counter: string} | null>(null);

  // 1. Fetch Active Events (Using Service Layer)
 // Replace the useEffect that fetches events with this:
// 1. Fix the useEffect
useEffect(() => {
    const fetchCurrentEvent = async () => {
        try {
            const volunteerUser = user as any;
            console.log('Fetching event for volunteer:', volunteerUser);
            
            if (volunteerUser?.event_id) {
                console.log('Looking for event_id:', volunteerUser.event_id);
                const allEvents = await eventsApi.getAll();
                console.log('All events:', allEvents);
                
                const currentEvent = allEvents.find((e: EventData) => e.event_id === volunteerUser.event_id);
                console.log('Found current event:', currentEvent);
                
                if (currentEvent) {
                    setEvents([currentEvent]);
                } else {
                    console.log('No matching event found for event_id:', volunteerUser.event_id);
                }
            } else {
                console.log('No event_id found in user object');
            }
        } catch(err) { 
            console.error("Failed to load event", err); 
        }
    };
    
    if (user) {
        fetchCurrentEvent();
    }
}, [user]);

// Check if volunteer needs assignment
useEffect(() => {
  const volunteerUser = user as any;
  if (volunteerUser && volunteerUser.role === 'volunteer') {
    // Check if volunteer has current assignment
    if (!volunteerUser.current_floor || !volunteerUser.current_counter) {
      setShowAssignmentModal(true);
    } else {
      setVolunteerAssignment({
        floor: volunteerUser.current_floor,
        counter: volunteerUser.current_counter
      });
    }
  }
}, [user]);


// Check if volunteer needs assignment
useEffect(() => {
  const volunteerUser = user as any;
  if (volunteerUser && volunteerUser.role === 'volunteer') {
    // Check if volunteer has current assignment
    if (!volunteerUser.current_floor || !volunteerUser.current_counter) {
      setShowAssignmentModal(true);
    } else {
      setVolunteerAssignment({
        floor: volunteerUser.current_floor,
        counter: volunteerUser.current_counter
      });
    }
  }
}, [user]);


{!showScanner && !loading && (
    <div className="mt-4">
        <h5 className="fw-bold mb-3 text-muted border-bottom pb-2">Current Event</h5>
        {events.length === 0 ? (
            <p className="text-muted small">Loading your assigned event...</p>
        ) : (
            <>
                <Card className="shadow-sm border-0 mb-4">
                    {/* ... existing card content ... */}
                </Card>
                
                {/* Recent Scans Section */}
                <RecentScansSection eventId={(user as any)?.event_id} />
            </>
        )}
    </div>
)}


  // 2. Open Stats Modal
  const handleOpenStats = (event: EventData) => {
      setSelectedEvent({ id: event.event_id, name: event.name });
      setShowStatsModal(true);
  };
  // 3. Handle Assignment Completion
  const handleAssignmentComplete = (assignment: {floor: string, counter: string}) => {
    setVolunteerAssignment(assignment);
    setShowAssignmentModal(false);
  };


  // 3. Handle Scan (Using Service Layer)
 const handleScanSuccess = async (decodedText: string) => {
  setShowScanner(false);
  setLoading(true);
  setScanResult(null);

  try {
    // Debug logging
    console.log('=== SCAN ATTEMPT ===');
    console.log('User object:', user);
    console.log('QR Token:', decodedText);
    
    // Get the correct volunteer ID
    const volunteerUser = user as any;
    const volunteerId = volunteerUser?.id; // For volunteers, use 'id' not 'user_id'
    
    console.log('Using volunteer ID:', volunteerId);
    
    if (!volunteerId) throw new Error("Volunteer not authenticated");

    // API CALL
    const data = await registrationApi.scan(decodedText, volunteerId);
    
    console.log('Scan response:', data);

    // Success
    setScanResult({
      status: 'success',
      message: 'Coupon Verified. You can serve the food.',
    });

  } catch (err: any) {
    console.error('Scan error:', err);
    
    // Error Handling - Fixed the typo
    const errorMessage = err.message || 'Invalid Token';
    const isWarning = errorMessage.toLowerCase().includes("already served"); // Fixed: removed 'P'

    setScanResult({
      status: isWarning ? 'warning' : 'error',
      message: errorMessage
    });
  } finally {
    setLoading(false);
  }
};

  const handleReset = () => {
    setScanResult(null);
    setShowScanner(true);
  };

  // --- RENDER: Result Screen ---
  if (scanResult) {
    let title = 'Scan Failed';
    if (scanResult.status === 'success') title = 'Scan Successful!';
    if (scanResult.status === 'warning') title = 'Already Served';

    return (
      <ScanResult 
        result={{
          status: scanResult.status,
          title: title,
          message: scanResult.studentId 
            ? `${scanResult.message} (${scanResult.studentId})` 
            : scanResult.message
        }} 
        onScanNext={handleReset} 
      />
    );
  }

  // --- RENDER: Main Dashboard ---
  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h2 className="fw-bold">Volunteer Scanner</h2>
        <p className="text-muted">Scan student QR codes to mark them as served.</p>
      </div>

      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          
          {/* INITIAL STATE: Start Button */}
          {!showScanner && !loading && (
            <Card className="text-center p-5 shadow-sm border-0 mb-5">
              <div className="mb-3 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
                  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
                </svg>
              </div>
              <h4>Ready to Serve?</h4>
              <Button variant="primary" size="lg" className="mt-3 px-5 rounded-pill" onClick={() => setShowScanner(true)}>
                Start Camera
              </Button>
            </Card>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div className="text-center p-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted fw-bold">Verifying Coupon...</p>
            </div>
          )}

          {/* SCANNER STATE */}
          {showScanner && (
            <Card className="shadow-lg border-0 overflow-hidden mb-5">
              <Card.Header className="bg-dark text-white text-center py-3 d-flex justify-content-between align-items-center">
                <span className="fw-bold">Scanning...</span>
                <Button variant="outline-light" size="sm" onClick={() => setShowScanner(false)}>Close</Button>
              </Card.Header>
              <Card.Body className="p-0 bg-black">
                <QrScanner 
                  onScanSuccess={handleScanSuccess}
                />
              </Card.Body>
            </Card>
          )}

         {/* --- CURRENT EVENT & SCAN HISTORY SECTION --- */}
          {!showScanner && !loading && (
            <div className="mt-4">
                <h5 className="fw-bold mb-3 text-muted border-bottom pb-2">Current Event</h5>
                {events.length === 0 ? (
                    <p className="text-muted small">No event assigned.</p>
                ) : (
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center mb-3">
                                <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center me-3" 
                                    style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                    <CalendarEvent size={20} />
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-1">{events[0].name}</h6>
                                    <small className="text-muted">Your assigned event</small>
                                </div>
                            </div>
                            
                            <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleOpenStats(events[0])}
                                className="w-100"
                            >
                                View Your Stats
                            </Button>
                        </Card.Body>
                    </Card>

                )}
                
                {/* Recent Scans Section */}
                <RecentScansSection eventId={(user as any)?.event_id} />
            </div>
          )}


        </Col>
      </Row>
      
      {/* STATS MODAL */}
      <VolunteerStatsModal 
        show={showStatsModal} 
        onHide={() => setShowStatsModal(false)} 
        eventId={selectedEvent?.id || null}
        eventName={selectedEvent?.name || ''}
      />

      {/* ASSIGNMENT MODAL */}
      <VolunteerAssignmentModal
        show={showAssignmentModal}
        onAssignmentComplete={handleAssignmentComplete}
        volunteerId={(user as any)?.id}
        eventId={(user as any)?.event_id}
        volunteerName={(user as any)?.name || 'Volunteer'}
      />


    </Container>
  );
};

export default StaffPage;
