import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Form states
  const [formData, setFormData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const tabs = [
    { id: 'clients', name: 'Clients' },
    { id: 'departments', name: 'Departments' },
    { id: 'locations', name: 'Locations' },
    { id: 'sensors', name: 'Sensors' },
    { id: 'sensor-types', name: 'Sensor Types' },
    { id: 'shifts', name: 'Shifts' },
    { id: 'users', name: 'Users' }
  ];

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'clients':
          const clientsRes = await api.get('/clients');
          setClients(clientsRes.data);
          break;
        case 'departments':
          const deptRes = await api.get('/departments');
          setDepartments(deptRes.data);
          // Fetch clients for dropdown
          const clientsForDept = await api.get('/clients');
          setClients(clientsForDept.data);
          break;
        case 'locations':
          const locRes = await api.get('/locations');
          setLocations(locRes.data);
          // Fetch departments for dropdown
          const deptForLoc = await api.get('/departments');
          setDepartments(deptForLoc.data);
          break;
        case 'sensors':
          const sensRes = await api.get('/sensors');
          setSensors(sensRes.data);
          // Fetch locations and sensor types for dropdowns
          const locForSens = await api.get('/locations');
          setLocations(locForSens.data);
          const stRes = await api.get('/sensor-types');
          setSensorTypes(stRes.data);
          break;
        case 'sensor-types':
          const stForList = await api.get('/sensor-types');
          setSensorTypes(stForList.data);
          break;
        case 'shifts':
          const shiftsRes = await api.get('/shifts');
          setShifts(shiftsRes.data);
          break;
        case 'users':
          const usersRes = await api.get('/users');
          setUsers(usersRes.data);
          // Fetch clients and shifts for dropdowns
          const clientsForUsers = await api.get('/clients');
          setClients(clientsForUsers.data);
          const shiftsForUsers = await api.get('/shifts');
          setShifts(shiftsForUsers.data);
          break;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(getInitialFormData());
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    // Ensure all required fields are properly set, especially for sensors
    const editData = { ...item };
    // For sensors, make sure location_id and sensor_type_id are properly set
    if (activeTab === 'sensors') {
      editData.location_id = item.location_id || editData.location_id;
      editData.sensor_type_id = item.sensor_type_id || editData.sensor_type_id;
    }
    setFormData(editData);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setLoading(true);
      switch (activeTab) {
        case 'clients':
          await api.delete(`/clients/${id}`);
          break;
        case 'departments':
          await api.delete(`/departments/${id}`);
          break;
        case 'locations':
          await api.delete(`/locations/${id}`);
          break;
        case 'sensors':
          await api.delete(`/sensors/${id}`);
          break;
        case 'sensor-types':
          await api.delete(`/sensor-types/${id}`);
          break;
        case 'shifts':
          await api.delete(`/shifts/${id}`);
          break;
        case 'users':
          await api.delete(`/users/${id}`);
          break;
      }
      setSuccess('Item deleted successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let submitData = { ...formData };
      
      // For users, handle password field (only send if provided when editing)
      if (activeTab === 'users') {
        if (editingId && !submitData.password) {
          // Remove password from update if not provided
          delete submitData.password;
        }
        // Convert empty strings to null for optional fields
        if (submitData.client_id === '') submitData.client_id = null;
        if (submitData.shift_id === '' || submitData.role !== 'operator') submitData.shift_id = null;
      }

      if (editingId) {
        // Update
        switch (activeTab) {
          case 'clients':
            await api.put(`/clients/${editingId}`, submitData);
            break;
          case 'departments':
            await api.put(`/departments/${editingId}`, submitData);
            break;
          case 'locations':
            await api.put(`/locations/${editingId}`, submitData);
            break;
          case 'sensors':
            await api.put(`/sensors/${editingId}`, submitData);
            break;
          case 'sensor-types':
            await api.put(`/sensor-types/${editingId}`, submitData);
            break;
          case 'shifts':
            await api.put(`/shifts/${editingId}`, submitData);
            break;
          case 'users':
            await api.put(`/users/${editingId}`, submitData);
            break;
        }
        setSuccess('Item updated successfully');
      } else {
        // Create
        switch (activeTab) {
          case 'clients':
            await api.post('/clients', submitData);
            break;
          case 'departments':
            await api.post('/departments', submitData);
            break;
          case 'locations':
            await api.post('/locations', submitData);
            break;
          case 'sensors':
            await api.post('/sensors', submitData);
            break;
          case 'sensor-types':
            await api.post('/sensor-types', submitData);
            break;
          case 'shifts':
            await api.post('/shifts', submitData);
            break;
          case 'users':
            await api.post('/users', submitData);
            break;
        }
        setSuccess('Item created successfully');
      }
      setShowForm(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const getInitialFormData = () => {
    switch (activeTab) {
      case 'clients':
        return { name: '', site_address: '', contact_email: '' };
      case 'departments':
        return { client_id: '', name: '', description: '' };
      case 'locations':
        return { department_id: '', name: '', floor_level: '' };
      case 'sensors':
        return { location_id: '', sensor_type_id: '', name: '', mqtt_topic: '', sensor_count: 1, status: 'active', device_id: '', channel_code: '', mqtt_payload_topic: '' };
      case 'sensor-types':
        return { name: '', unit: '', description: '', min_value: '', max_value: '' };
      case 'shifts':
        return { name: '', start_time: '', end_time: '', description: '', is_active: true };
      case 'users':
        return { username: '', email: '', password: '', role: 'viewer', client_id: '', shift_id: '' };
      default:
        return {};
    }
  };

  const renderForm = () => {
    if (!showForm) return null;

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit' : 'Create'} {tabs.find(t => t.id === activeTab)?.name.slice(0, -1)}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'clients' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
                <input
                  type="text"
                  value={formData.site_address || ''}
                  onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {activeTab === 'departments' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  required
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  rows="3"
                />
              </div>
            </>
          )}

          {activeTab === 'locations' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select
                  required
                  value={formData.department_id || ''}
                  onChange={(e) => setFormData({ ...formData, department_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                <input
                  type="text"
                  value={formData.floor_level || ''}
                  onChange={(e) => setFormData({ ...formData, floor_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {activeTab === 'sensors' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <select
                  required
                  value={formData.location_id || ''}
                  onChange={(e) => setFormData({ ...formData, location_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sensor Type *</label>
                <select
                  required
                  value={formData.sensor_type_id || ''}
                  onChange={(e) => setFormData({ ...formData, sensor_type_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select a sensor type</option>
                  {sensorTypes.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Topic</label>
                <input
                  type="text"
                  value={formData.mqtt_topic || ''}
                  onChange={(e) => setFormData({ ...formData, mqtt_topic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              {/* MQTT Payload Configuration Section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">MQTT Payload Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device ID (did) 
                    <span className="text-xs text-gray-500 ml-1">e.g., "00002"</span>
                  </label>
                  <input
                    type="text"
                    value={formData.device_id || ''}
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    placeholder="00002"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Device ID from MQTT payload "did" field</p>
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Code 
                    <span className="text-xs text-gray-500 ml-1">e.g., "s1", "s2", "s3"</span>
                  </label>
                  <select
                    value={formData.channel_code || ''}
                    onChange={(e) => setFormData({ ...formData, channel_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  >
                    <option value="">Select channel code</option>
                    <option value="s1">s1 (Channel 1)</option>
                    <option value="s2">s2 (Channel 2)</option>
                    <option value="s3">s3 (Channel 3)</option>
                    <option value="s4">s4 (Channel 4)</option>
                    <option value="s5">s5 (Channel 5)</option>
                    <option value="s6">s6 (Channel 6)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Channel code in payload data array (s1-s6)</p>
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MQTT Payload Topic 
                    <span className="text-xs text-gray-500 ml-1">e.g., "voltas"</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mqtt_payload_topic || ''}
                    onChange={(e) => setFormData({ ...formData, mqtt_payload_topic: e.target.value })}
                    placeholder="voltas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">MQTT topic name for payload subscription</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'sensor-types' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.min_value || ''}
                    onChange={(e) => setFormData({ ...formData, min_value: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.max_value || ''}
                    onChange={(e) => setFormData({ ...formData, max_value: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'shifts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  placeholder="e.g., Morning Shift"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time || ''}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: HH:mm (24-hour)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time || ''}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: HH:mm (24-hour)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  rows="3"
                  placeholder="e.g., Morning shift from 6 AM to 2 PM"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Only active shifts can be assigned to operators</p>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingId ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  placeholder={editingId ? 'Leave blank to keep current password' : 'Enter password'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  required
                  value={formData.role || 'viewer'}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({ 
                      ...formData, 
                      role: newRole,
                      // Clear shift_id if role is not operator
                      shift_id: newRole === 'operator' ? formData.shift_id : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client (Optional)</label>
                <select
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                >
                  <option value="">No client assigned</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Leave blank for admins or users with full access</p>
              </div>
              {formData.role === 'operator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift *</label>
                  <select
                    required
                    value={formData.shift_id || ''}
                    onChange={(e) => setFormData({ ...formData, shift_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  >
                    <option value="">Select a shift</option>
                    {shifts.filter(s => s.is_active).map(shift => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Shift is required for operator role</p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderTable = () => {
    let data = activeTab === 'clients' ? clients :
                activeTab === 'departments' ? departments :
                activeTab === 'locations' ? locations :
                activeTab === 'sensors' ? sensors :
                activeTab === 'sensor-types' ? sensorTypes :
                activeTab === 'shifts' ? shifts :
                users;
    
    // Sort by ID ascending as a safeguard
    data = [...data].sort((a, b) => a.id - b.id);

    if (loading && data.length === 0) {
      return <div className="text-center py-8">Loading...</div>;
    }

    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No items found. Click "Create" to add one.</div>;
    }

    const getColumns = () => {
      switch (activeTab) {
        case 'clients':
          return ['ID', 'Name', 'Site Address', 'Contact Email', 'Actions'];
        case 'departments':
          return ['ID', 'Client', 'Name', 'Description', 'Actions'];
        case 'locations':
          return ['ID', 'Department', 'Name', 'Floor Level', 'Actions'];
        case 'sensors':
          return ['ID', 'Name', 'Location', 'Sensor Type', 'Status', 'Actions'];
        case 'sensor-types':
          return ['ID', 'Name', 'Unit', 'Min Value', 'Max Value', 'Actions'];
        case 'shifts':
          return ['ID', 'Name', 'Start Time', 'End Time', 'Status', 'Actions'];
        case 'users':
          return ['ID', 'Username', 'Email', 'Role', 'Client', 'Shift', 'Actions'];
        default:
          return [];
      }
    };

    const renderRow = (item) => {
      switch (activeTab) {
        case 'clients':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.site_address || '-'}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.contact_email || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        case 'departments':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.client_name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.description || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        case 'locations':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department_name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.floor_level || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        case 'sensors':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location_name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sensor_type || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'active' ? 'bg-green-100 text-green-800' :
                  item.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        case 'sensor-types':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.min_value ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.max_value ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        case 'shifts':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.start_time?.slice(0, 5) || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.end_time?.slice(0, 5) || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        case 'users':
          return (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.username}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  item.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  item.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                  item.role === 'operator' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.client_name || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.shift_name ? `${item.shift_name} (${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)})` : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          );
        default:
          return null;
      }
    };

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {getColumns().map((col) => (
                <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(renderRow)}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        {!showForm && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>+</span>
            <span>Create New Entry</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowForm(false);
                setError('');
                setSuccess('');
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {renderForm()}
      {renderTable()}
    </div>
  );
};

export default Settings;
