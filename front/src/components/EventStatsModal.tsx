import React, { useEffect, useState } from 'react';
import { Modal, Button, Card, Row, Col, Table, ProgressBar, Spinner, Alert } from 'react-bootstrap';
import { BarChartFill, PeopleFill, Shop, ClockHistory } from 'react-bootstrap-icons'; 
import { eventsApi } from '../services/api';

interface EventStatsModalProps {
  show: boolean;
  onHide: () => void;
  eventId: number | null;
  eventName: string;
}

interface EventStats {
  total: number;
  byBatch: { batch: string; count: string }[];
  byCounter: { counter_name: string; count: string }[];
}

interface ScanLog {
  student_name: string;
  roll_number: string; 
  batch: string;
  counter_name: string;
  scanned_at: string;
}

const EventStatsModal: React.FC<EventStatsModalProps> = ({ show, onHide, eventId, eventName }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);

  useEffect(() => {
    if (show && eventId) {
      fetchStats();
    }
  }, [show, eventId]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    setStats(null);
    setScanHistory([]); 
    
    try {
      if (!eventId) return;

      const [statsData, scanHistoryData] = await Promise.all([
        eventsApi.getStats(eventId),
        eventsApi.getScanHistory(eventId)
      ]);
      
      setStats(statsData);
      setScanHistory(scanHistoryData.scanHistory || []);
    } catch (err) {
      console.error(err);
      setError('Could not load statistics.');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 ROBUST TIME HELPER
  // Handles both "2025-12-30T10:00:00Z" (Future correct DB) AND "06:53 am" (Current raw DB)
  const formatScanTime = (timeStr: string) => {
    if (!timeStr) return '-';

    // 1. Try parsing as a standard ISO Date (Future-proof)
    const standardDate = new Date(timeStr);
    if (!isNaN(standardDate.getTime()) && timeStr.includes('T')) {
       // If it's a valid full timestamp, just format it to local
       return standardDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    // 2. Fallback for your current "06:53 am" format (which is effectively UTC)
    try {
      // Parse "06:53 am" manually
      const [time, modifier] = timeStr.split(' ');
      if (!time || !modifier) return timeStr; // Return raw if structure doesn't match

      let [hours, minutes] = time.split(':').map(Number);

      // Convert 12h to 24h
      if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
      if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;

      // Create a date object treating these as UTC hours
      const date = new Date();
      date.setUTCHours(hours, minutes, 0, 0);

      // Display in User's Local Time (Browser Default)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return timeStr; // If all else fails, show raw string
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-success text-white">
        <Modal.Title className="d-flex align-items-center">
          <BarChartFill className="me-2" />
          Analytics: {eventName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light p-4">
        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" variant="success" />
            <p className="mt-2 text-muted">Crunching numbers...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : stats ? (
          <div>
            {/* 1. Total Served Card */}
            <Card className="mb-4 text-center border-0 shadow-sm">
              <Card.Body className="py-4">
                <h6 className="text-muted text-uppercase fw-bold mb-2" style={{ letterSpacing: '1px' }}>Total Students Served</h6>
                <h1 className="display-3 fw-bold text-success mb-0">{stats.total}</h1>
              </Card.Body>
            </Card>

            <Row className="g-4">
              {/* 2. Breakdown by Batch */}
              <Col md={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Header className="bg-white fw-bold py-3 border-bottom-0">
                    <PeopleFill className="me-2 text-primary" />
                    By Batch (Year)
                  </Card.Header>
                  <Card.Body>
                    {stats.byBatch.length === 0 ? (
                      <p className="text-muted small text-center my-4">No data yet.</p>
                    ) : (
                      stats.byBatch.map((item, idx) => {
                        const percent = stats.total > 0 ? (parseInt(item.count) / stats.total) * 100 : 0;
                        return (
                          <div key={idx} className="mb-3">
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                              <span>Batch {item.batch || 'Unknown'}</span>
                              <span>{item.count}</span>
                            </div>
                            <ProgressBar 
                              now={percent} 
                              variant="info" 
                              style={{ height: '6px', borderRadius: '10px' }} 
                            />
                          </div>
                        );
                      })
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* 3. Breakdown by Counter */}
              <Col md={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Header className="bg-white fw-bold py-3 border-bottom-0">
                    <Shop className="me-2 text-warning" />
                    By Counter
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table hover borderless className="mb-0 align-middle">
                      <thead className="bg-light small text-muted">
                        <tr>
                          <th className="ps-3 fw-normal">Counter Name</th>
                          <th className="text-end pe-3 fw-normal">Served</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byCounter.length === 0 ? (
                          <tr><td colSpan={2} className="text-center text-muted small py-4">No data yet.</td></tr>
                        ) : (
                          stats.byCounter.map((item, idx) => (
                            <tr key={idx}>
                              <td className="ps-3 fw-semibold text-dark">{item.counter_name}</td>
                              <td className="text-end pe-3 fw-bold text-success">{item.count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* 4. Scan History (Added Here) */}
            {scanHistory.length > 0 && (
              <Card className="mt-4 border-0 shadow-sm">
                <Card.Header className="bg-white fw-bold py-3 d-flex align-items-center">
                  <ClockHistory className="me-2 text-secondary" />
                  Recent Scans (Last 50)
                </Card.Header>
                <Card.Body className="p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <Table hover borderless className="mb-0 align-middle">
                    <thead className="bg-light sticky-top">
                      <tr>
                        <th className="ps-3">Name</th>
                        <th>Email/ID</th>
                        <th>Batch</th>
                        <th>Counter</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanHistory.map((scan, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 fw-medium">{scan.student_name}</td>
                          <td className="text-muted small">{scan.roll_number}</td>
                          <td><span className="badge bg-light text-dark border">{scan.batch}</span></td>
                          <td>{scan.counter_name}</td>
                          <td className="text-muted small">
                            {/* USE THE NEW HELPER HERE */}
                            {formatScanTime(scan.scanned_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

          </div>
        ) : (
          <Alert variant="info">No statistics available for this event yet.</Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="border-top-0 bg-light">
        <Button variant="outline-secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EventStatsModal;

