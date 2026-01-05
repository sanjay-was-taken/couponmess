import React, { useEffect, useState } from 'react';
import { Modal, Button, Card, Row, Col, Table, ProgressBar, Spinner, Alert, Badge } from 'react-bootstrap';
import { BarChartFill, PeopleFill, Shop, ClockHistory, ChevronLeft, ChevronRight } from 'react-bootstrap-icons'; 
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

const ITEMS_PER_PAGE = 50;

const EventStatsModal: React.FC<EventStatsModalProps> = ({ show, onHide, eventId, eventName }) => {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false); // Separate loading for table
  const [stats, setStats] = useState<EventStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // --- Pagination State ---
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // 1. Reset on open
  useEffect(() => {
    if (show && eventId) {
      setPage(1); // Reset to first page
      fetchOverallStats();
      fetchHistory(1); // Fetch page 1
    }
  }, [show, eventId]);

  // 2. Fetch Graphs and Totals (Run once on open)
  const fetchOverallStats = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const statsData = await eventsApi.getStats(eventId);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      setError('Could not load statistics.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch History Table (Runs on page change)
  const fetchHistory = async (pageNum: number) => {
    if (!eventId) return;
    setHistoryLoading(true);
    try {
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const data = await eventsApi.getScanHistory(eventId, ITEMS_PER_PAGE, offset);
      
      setScanHistory(data.scanHistory || []);
      setHasMore(data.hasMore); // Backend tells us if there are more records
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = page + 1;
      setPage(newPage);
      fetchHistory(newPage);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchHistory(newPage);
    }
  };

  const formatScanTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const standardDate = new Date(timeStr);
    if (!isNaN(standardDate.getTime()) && (timeStr.includes('T') || timeStr.includes('-'))) {
       return standardDate.toLocaleTimeString('en-IN', { 
           hour: '2-digit', 
           minute: '2-digit', 
           hour12: true, 
           timeZone: 'Asia/Kolkata' 
       });
    }
    return timeStr;
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
            <p className="mt-2 text-muted">Loading Analytics...</p>
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

            {/* 4. Scan History with Pagination */}
            <Card className="mt-4 border-0 shadow-sm">
              <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between align-items-center">
                <span>
                  <ClockHistory className="me-2 text-secondary" />
                  Scan History
                </span>
                <Badge bg="light" text="dark" className="border">
                    Page {page}
                </Badge>
              </Card.Header>
              
              <Card.Body className="p-0" style={{ minHeight: '200px' }}>
                {historyLoading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" size="sm" variant="success"/>
                    </div>
                ) : scanHistory.length === 0 ? (
                    <div className="text-center py-5 text-muted small">No records found.</div>
                ) : (
                    <Table hover borderless className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                        <th className="ps-3">Name</th>
                        <th>Roll No</th>
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
                            <td className="text-muted small">{formatScanTime(scan.scanned_at)}</td>
                        </tr>
                        ))}
                    </tbody>
                    </Table>
                )}
              </Card.Body>

              {/* PAGINATION FOOTER */}
              <Card.Footer className="bg-white border-top-0 py-3">
                  <div className="d-flex justify-content-between align-items-center">
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={handlePrevPage} 
                        disabled={page === 1 || historyLoading}
                      >
                          <ChevronLeft className="me-1"/> Previous
                      </Button>
                      
                      <small className="text-muted">
                        Showing {(page - 1) * ITEMS_PER_PAGE + 1} - {(page - 1) * ITEMS_PER_PAGE + scanHistory.length}
                      </small>

                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={handleNextPage} 
                        disabled={!hasMore || historyLoading}
                      >
                          Next <ChevronRight className="ms-1"/>
                      </Button>
                  </div>
              </Card.Footer>
            </Card>

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
