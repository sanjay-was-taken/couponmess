import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Alert, InputGroup, Badge } from 'react-bootstrap';
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
  
  // Success State (To show credentials after creation)
  const [createdCreds, setCreatedCreds] = useState<{u: string, p: string} | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // 1. Load Volunteers when modal opens
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

  // 2. Helper to auto-generate a username like "xmas_counter1"
  const generateSuggestedCredentials = () => {
    if (!eventName) return;
    // Take first 4 chars of event name + random 3 digits
    const prefix = eventName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toLowerCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setNewUsername(`${prefix}_staff${randomSuffix}`);
    setNewPassword(Math.random().toString(36).slice(-6)); // Random 6 char password
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

      // Show the green box with credentials
      setCreatedCreds({ u: newUsername, p: newPassword });
      
      // Refresh list and reset form
      fetchVolunteers();
      setNewName('');
      generateSuggestedCredentials(); // Prep for next one
    } catch (err: any) {
      alert(err.message || "Failed to create volunteer. Username might be taken.");
    }
  };

  const handleDelete = async (volId: number) => {
    if(!window.confirm("Remove this volunteer? They won't be able to login.")) return;
    try {
      await eventsApi.deleteVolunteer(volId);
      fetchVolunteers();
    } catch (err) {
      console.error(err);
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
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Manage Staff: <span className="text-primary">{eventName}</span></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        
        {/* --- CREATION FORM --- */}
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

        {/* --- SUCCESS MESSAGE (Copy Credentials) --- */}
        {createdCreds && (
            <Alert variant="success" className="d-flex justify-content-between align-items-center">
                <div>
                    <strong>User Created!</strong> Share these details immediately:<br/>
                    Username: <code className="fw-bold text-dark fs-6">{createdCreds.u}</code> &nbsp;|&nbsp; 
                    Password: <code className="fw-bold text-dark fs-6">{createdCreds.p}</code>
                </div>
                <Button variant={copySuccess ? "outline-success" : "outline-dark"} size="sm" onClick={copyToClipboard}>
                    {copySuccess ? <><Check/> Copied</> : <><Clipboard/> Copy info</>}
                </Button>
            </Alert>
        )}

        {/* --- EXISTING LIST --- */}
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
                                <Button variant="link" className="text-danger p-0" onClick={() => handleDelete(v.id)}>
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
  );
};

export default VolunteerManagerModal;