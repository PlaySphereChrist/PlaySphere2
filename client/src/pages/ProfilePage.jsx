import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  PsCard,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading
} from '../components/ui';

export default function ProfilePage() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/me');
      setAccount(res.data.user);
    } catch (err) {
      setError(err.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PsLoading />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PsPageHeader 
        title="Account Information" 
        subtitle="Your core PlaySphere account details. Email changes are not currently supported." 
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {!error && account && (
        <PsCard className="p-6">
          <dl className="space-y-6 divide-y divide-border text-sm leading-6">
            <div className="pt-2 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none sm:pr-6">Email address</dt>
              <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                <div className="text-secondary">{account?.email}</div>
              </dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none sm:pr-6">Account Status</dt>
              <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                <div className="text-secondary">
                  {account?.is_active ? (
                    <PsBadge variant="success">Active</PsBadge>
                  ) : (
                    <PsBadge variant="danger">Inactive</PsBadge>
                  )}
                </div>
              </dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none sm:pr-6">Roles</dt>
              <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                <div className="text-secondary flex flex-wrap gap-2">
                  {(account?.roles?.length ? account.roles : ['USER']).map(r => (
                    <PsBadge key={r} variant="default">{r}</PsBadge>
                  ))}
                </div>
              </dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none sm:pr-6">Member Since</dt>
              <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                <div className="text-secondary">
                  {account?.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </dd>
            </div>
          </dl>
        </PsCard>
      )}
    </div>
  );
}
