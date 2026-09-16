import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../../components/ui';
import CreatePostForm from './CreatePostForm';
import PostItem from './PostItem';

export default function CommunityPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const communityId = searchParams.get('community_id');
  const communityQuery = communityId ? `?community_id=${communityId}` : '';

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'equipment'
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const fetchCommunity = async () => {
    try {
      const res = await api.request('GET', `/community${communityQuery}`);
      if (res.success) {
        setCommunity(res.community);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async () => {
    try {
      let page = 1;
      let found = false;
      let keepGoing = true;
      while (keepGoing) {
        const querySep = communityQuery ? '&' : '?';
        const res = await api.request('GET', `/community/members${communityQuery}${querySep}limit=100&page=${page}`);
        if (!res.success) break;
        found = res.members.some(m => m.user_id === user.id);
        if (found || res.members.length < 100 || (page * 100) >= res.total) {
          keepGoing = false;
        } else {
          page++;
        }
      }
      setIsMember(found);
    } catch (err) {
      console.error('Failed to check membership', err);
    }
  };

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const endpoint = activeTab === 'equipment' ? `/community/equipment-requests${communityQuery}` : `/community/posts${communityQuery}`;
      const res = await api.request('GET', endpoint);
      if (res.success) {
        setPosts(res.posts || []);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunity();
    checkMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityQuery]);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, communityQuery]);

  const handleJoinLeave = async () => {
    setMembershipLoading(true);
    try {
      const endpoint = isMember ? `/community/leave${communityQuery}` : `/community/join${communityQuery}`;
      const res = await api.request('POST', endpoint);
      if (res.success) {
        setIsMember(!isMember);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    } finally {
      setMembershipLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  if (error) return <PsAlert variant="error">{error}</PsAlert>;
  if (!community) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PsCard className="bg-maroon overflow-hidden border-none text-surface">
        <div className="px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-6 relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #ffffff 0%, transparent 50%)' }}></div>
          <div className="relative z-10 text-center sm:text-left">
            <h2 className="text-3xl font-serif font-bold text-surface">{community.name}</h2>
            <p className="mt-2 text-surface/80">{community.description}</p>
          </div>
          <div className="relative z-10">
            <PsButton
              onClick={handleJoinLeave}
              disabled={membershipLoading}
              className={isMember ? 'bg-surface text-maroon hover:bg-pill' : 'bg-gold hover:bg-gold/90 text-surface'}
            >
              {membershipLoading ? '...' : isMember ? 'Leave Community' : 'Join Community'}
            </PsButton>
          </div>
        </div>
      </PsCard>

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('posts')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'posts'
                ? 'border-maroon text-maroon font-bold'
                : 'border-transparent text-secondary hover:border-border hover:text-primary'
            }`}
          >
            General Posts
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'equipment'
                ? 'border-maroon text-maroon font-bold'
                : 'border-transparent text-secondary hover:border-border hover:text-primary'
            }`}
          >
            Equipment Requests
          </button>
        </nav>
      </div>

      <div>
        {isMember ? (
          <CreatePostForm
            isEquipment={activeTab === 'equipment'}
            onCreated={fetchPosts}
            communityQuery={communityQuery}
          />
        ) : (
          <PsAlert variant="info" className="mb-6">
            You must join the community to post and comment.
          </PsAlert>
        )}

        {postsLoading ? (
          <PsLoading />
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map(post => (
              <PostItem
                key={post.id}
                post={post}
                currentUser={user}
                isMember={isMember}
                onUpdate={fetchPosts}
              />
            ))}
          </div>
        ) : (
          <PsEmpty
            title={activeTab === 'equipment' ? 'No equipment requests' : 'No posts yet'}
            message="Be the first to share something with the community!"
          />
        )}
      </div>
    </div>
  );
}
