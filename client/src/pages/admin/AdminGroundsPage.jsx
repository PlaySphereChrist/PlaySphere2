import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsTextarea,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../../components/ui';

export default function AdminGroundsPage() {
  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', city: '', state: '', contact_phone: '', description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchGrounds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grounds/admin/all');
      setGrounds(res.data.grounds || []);
    } catch (err) {
      setError(err.message || 'Failed to load grounds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrounds();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError('');
      await api.post('/grounds', formData);
      setShowForm(false);
      setFormData({ name: '', address: '', city: '', state: '', contact_phone: '', description: '' });
      fetchGrounds();
    } catch (err) {
      setFormError(err.message || 'Failed to create ground');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PsLoading />;

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Admin Grounds Management" 
        subtitle="Manage grounds, sports, and availability."
        actions={
          <PsButton onClick={() => setShowForm(!showForm)} variant={showForm ? 'ghost' : 'primary'}>
            {showForm ? 'Cancel' : 'Add New Ground'}
          </PsButton>
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {showForm && (
        <PsCard className="p-6 border-maroon/20">
          <h3 className="text-xl font-serif font-bold text-primary mb-6">Create New Ground</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PsInput label="Name *" required name="name" value={formData.name} onChange={handleChange} />
              <PsInput label="Contact Phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
              <PsInput label="Address *" required name="address" value={formData.address} onChange={handleChange} />
              <PsInput label="City *" required name="city" value={formData.city} onChange={handleChange} />
              <PsInput label="State" name="state" value={formData.state} onChange={handleChange} />
              <div className="sm:col-span-2">
                <PsTextarea label="Description" name="description" rows={3} value={formData.description} onChange={handleChange} />
              </div>
            </div>
            
            {formError && <PsAlert variant="error" className="mt-4">{formError}</PsAlert>}
            
            <div className="flex justify-end pt-4">
              <PsButton type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Ground'}
              </PsButton>
            </div>
          </form>
        </PsCard>
      )}

      <PsCard>
        <ul className="divide-y divide-border">
          {grounds.map(ground => (
            <li key={ground.id}>
              <Link to={`/admin/grounds/${ground.id}`} className="block hover:bg-pill-hover transition p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-lg font-serif font-bold text-primary truncate">{ground.name}</p>
                      <p className="mt-1 flex items-center text-sm text-secondary">
                        {ground.city}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-primary flex items-center gap-2">
                          Status: 
                          <PsBadge variant={ground.is_active ? 'success' : 'danger'}>
                            {ground.is_active ? 'Active' : 'Inactive'}
                          </PsBadge>
                        </p>
                        <p className="mt-2 text-sm text-secondary">
                          {ground.sports?.length || 0} sports configured
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted">➔</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {grounds.length === 0 && (
            <div className="p-12">
              <PsEmpty title="No grounds found" message="Add a ground to start managing your facilities." />
            </div>
          )}
        </ul>
      </PsCard>
    </div>
  );
}
