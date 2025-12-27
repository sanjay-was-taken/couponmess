import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react'; 
import { GeoAltFill, ClockFill } from 'react-bootstrap-icons'; 

interface QRCodeModalProps {
  show: boolean;
  onHide: () => void;
  eventName: string;
  qrToken: string;
  slotDetails?: {
    floor: string;
    time: string;
  };
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ show, onHide, eventName, qrToken, slotDetails }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Your Entry Pass</Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="text-center p-4">
        <h5 className="mb-4 text-success fw-bold">{eventName}</h5>
        
        {/* QR Code Container - Added 'mb-4' for spacing below */}
        <div className="p-3 border rounded d-inline-block bg-white shadow-sm mb-4">
          <QRCodeSVG 
            value={qrToken} 
            size={200}
            level="H" 
            includeMargin={true}
          />
        </div>
        
        {/* Slot Details Box */}
        {slotDetails && (
          <div className="bg-light p-3 rounded mb-3 border d-inline-block w-100">
            <div className="row">
              <div className="col-6 border-end">
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Floor</small>
                <div className="text-dark fw-bold">
                  <GeoAltFill className="me-1 text-primary" /> 
                  {slotDetails.floor}
                </div>
              </div>
              <div className="col-6">
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Time</small>
                <div className="text-dark fw-bold">
                  <ClockFill className="me-1 text-primary" /> 
                  {slotDetails.time}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-muted small mb-2">
          Show this QR code at the counter.
        </p>
        
        <div className="p-1 bg-white rounded text-muted" style={{ fontSize: '0.75rem' }}>
          Valid for one-time use only.
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QRCodeModal;