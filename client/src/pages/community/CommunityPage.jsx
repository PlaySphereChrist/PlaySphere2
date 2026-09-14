import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../store/AuthContext';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import CreatePostForm from './CreatePostForm';
import PostItem from './PostItem';

export default function CommunityPage() {
  const { user } = useAuth();
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
      const res = await api.request('GET', '/community');
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
      // The server caps limit at 100. Paginate if total > 100.
      let page = 1;
      let found = false;
      let keepGoing = true;
      while (keepGoing) {
        const res = await api.request('GET', `/community/members?limit=100&page=${page}`);
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
      const endpoint = activeTab === 'equipment' ? '/community/equipment-requests' : '/community/posts';
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
  }, []);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleJoinLeave = async () => {
    setMembershipLoading(true);
    try {
      const endpoint = isMember ? '/community/leave' : '/community/join';
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

  if (loading) return <div className="py-12"><Spinner /></div>;
  if (error) return <div className="py-12"><ErrorMessage message={error} /></div>;
  if (!community) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-indigo-600 text-white">
          <div>
            <h2 className="text-xl font-bold">{community.name}</h2>
            <p className="mt-1 max-w-2xl text-sm opacity-90">{community.description}</p>
          </div>
          <button
            onClick={handleJoinLeave}
            disabled={membershipLoading}
            className={`px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors ${
              isMember
                ? 'bg-white text-indigo-700 hover:bg-gray-100'
                : 'bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400'
            }`}
          >
            {membershipLoading ? '...' : isMember ? 'Leave Community' : 'Join Community'}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('posts')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'posts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            General Posts
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'equipment'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500 border border-gray-200 mb-6">
            You must join the community to post and comment.
          </div>
        )}

        {postsLoading ? (
          <div className="py-8"><Spinner /></div>
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
          <EmptyState
            title={activeTab === 'equipment' ? 'No equipment requests' : 'No posts yet'}
            description="Be the first to share something with the community!"
          />
        )}
      </div>
    </div>
  );
}
