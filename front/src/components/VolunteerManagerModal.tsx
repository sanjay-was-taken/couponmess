import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Alert, InputGroup, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { PersonPlusFill, Trash, Clipboard, Check } from 'react-bootstrap-icons';
import { eventsApi } from '../services/api';

interface VolunteerManagerModalProps {
  show: boolean;
  onHide: () => void;
  eventId: number | null;
  eventName: string;
}

interface Volunteer {
  id: number;
  name: string;
  username: string;
  is_active: boolean;
}

const VolunteerManagerModal: React.FC<VolunteerManagerModalProps> = ({ show, onHide, eventId, eventName }) => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Success State
  const [createdCreds, setCreatedCreds] = useState<{u: string, p: string} | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

  // 1. Load Volunteers
  useEffect(() => {
    if (show && eventId) {
      fetchVolunteers();
      generateSuggestedCredentials();
      setCreatedCreds(null);
    }
  }, [show, eventId]);

  const fetchVolunteers = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await eventsApi.getVolunteers(eventId);
      setVolunteers(data);
    } catch (err) {
      console.error("Failed to load volunteers");
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestedCredentials = () => {
    if (!eventName) return;
    const prefix = eventName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toLowerCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setNewUsername(`${prefix}_staff${randomSuffix}`);
    setNewPassword(Math.random().toString(36).slice(-6));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    try {
      await eventsApi.addVolunteer(eventId, {
        name: newName,
        username: newUsername,
        password: newPassword
      });

      setCreatedCreds({ u: newUsername, p: newPassword });
      fetchVolunteers();
      setNewName('');
      generateSuggestedCredentials();
      
      setToastVariant('success');
      setToastMessage('Volunteer added successfully');
      setShowToast(true);
    } catch (err: any) {
      alert(err.message || "Failed to create volunteer.");
    }
  };

  // 🔴 UPDATED DELETE FUNCTION
  const handleDelete = async (volId: number, volName: string) => {
    // 1. Optimistic Update (Remove instantly)
    const previousVolunteers = [...volunteers];
    setVolunteers(prev => prev.filter(v => v.id !== volId));

    try {
      // 2. API Call
      await eventsApi.deleteVolunteer(volId);
      
      // 3. Success Notification
      setToastVariant('success');
      setToastMessage(`Deleted ${volName} successfully.`);
      setShowToast(true);

    } catch (err: any) {
      console.error("Delete failed:", err);
      
      // 4. FAILURE: Revert UI & Show Error
      setVolunteers(previousVolunteers);
      
      setToastVariant('danger');
      // Show the actual error from backend if possible
      setToastMessage(`Could not delete: ${err.message || "Server Error"}`);
      setShowToast(true);
    }
  };

  const copyToClipboard = () => {
    if (createdCreds) {
      const text = `🔑 *Klee Volunteer Access*\nEvent: ${eventName}\nUsername: ${createdCreds.u}\nPassword: ${createdCreds.p}`;
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Manage Staff: <span className="text-primary">{eventName}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          
          {/* CREATION FORM */}
          <div className="bg-light p-3 rounded mb-4 border">
              <h6 className="fw-bold mb-3"><PersonPlusFill className="me-2"/> Add New Volunteer</h6>
              <Form onSubmit={handleCreate}>
                  <div className="row g-2">
                      <div className="col-md-4">
                          <Form.Control 
                              placeholder="Name (e.g. John)" 
                              value={newName} 
                              onChange={e => setNewName(e.target.value)} 
                              required 
                          />
                      </div>
                      <div className="col-md-3">
                          <InputGroup>
                              <InputGroup.Text className="bg-white text-muted">@</InputGroup.Text>
                              <Form.Control 
                                  placeholder="Username" 
                                  value={newUsername} 
                                  onChange={e => setNewUsername(e.target.value)} 
                                  required 
                              />
                          </InputGroup>
                      </div>
                      <div className="col-md-3">
                            <Form.Control 
                                  placeholder="Password" 
                                  value={newPassword} 
                                  onChange={e => setNewPassword(e.target.value)} 
                                  required 
                              />
                      </div>
                      <div className="col-md-2">
                          <Button variant="success" type="submit" className="w-100">Add</Button>
                      </div>
                  </div>
                  <Form.Text className="text-muted small">
                     Username and password are auto-generated for ease, but you can edit them.
                  </Form.Text>
              </Form>
          </div>

          {/* CREDENTIALS ALERT */}
          {createdCreds && (
              <Alert variant="success" className="d-flex justify-content-between align-items-center">
                  <div>
                      <strong>User Created!</strong> Share details:<br/>
                      Username: <code className="fw-bold text-dark fs-6">{createdCreds.u}</code> &nbsp;|&nbsp; 
                      Password: <code className="fw-bold text-dark fs-6">{createdCreds.p}</code>
                  </div>
                  <Button variant={copySuccess ? "outline-success" : "outline-dark"} size="sm" onClick={copyToClipboard}>
                      {copySuccess ? <><Check/> Copied</> : <><Clipboard/> Copy info</>}
                  </Button>
              </Alert>
          )}

          {/* VOLUNTEER LIST */}
          <h6 className="fw-bold mt-4">Current Volunteers ({volunteers.length})</h6>
          <Table hover size="sm" className="align-middle mt-2">
              <thead className="bg-light">
                  <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Status</th>
                      <th className="text-end">Action</th>
                  </tr>
              </thead>
              <tbody>
                  {volunteers.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted py-3">No volunteers assigned yet.</td></tr>
                  ) : (
                      volunteers.map(v => (
                          <tr key={v.id}>
                              <td>{v.name}</td>
                              <td><Badge bg="light" text="dark" className="border">@{v.username}</Badge></td>
                              <td><Badge bg="success">Active</Badge></td>
                              <td className="text-end">
                                  <Button 
                                    variant="link" 
                                    className="text-danger p-0" 
                                    onClick={() => handleDelete(v.id, v.name)}
                                  >
                                      <Trash/>
                                  </Button>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </Table>

        </Modal.Body>
      </Modal>

      {/* TOAST NOTIFICATION */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
        <Toast 
            onClose={() => setShowToast(false)} 
            show={showToast} 
            delay={4000} 
            autohide 
            bg={toastVariant} // Dynamic background color
        >
          <Toast.Header>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default VolunteerManagerModal;
