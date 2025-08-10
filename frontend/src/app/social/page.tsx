"use client";
import { useState, useEffect } from 'react';
import { get, post } from '@/api/client';

interface FeedItem {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  food: {
    id: number;
    name: string;
    brand: string;
    calories: number;
    protein_g: number;
  };
  caption: string;
  tags: string[];
  is_recipe: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_public: boolean;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  target_unit: string;
  start_date: string;
  end_date: string;
  participants_count: number;
  max_participants?: number;
  creator: {
    username: string;
  };
  days_remaining: number;
}

export default function SocialPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges'>('feed');
  const [message, setMessage] = useState('');

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [shareTags, setShareTags] = useState('');
  const [shareFood, setShareFood] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [feedResponse, challengesResponse] = await Promise.all([
        get('/social/feed/1'),
        get('/social/challenges')
      ]);
      
      setFeed(feedResponse.feed || []);
      setChallenges(challengesResponse.challenges || []);
    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const likePost = async (postId: number) => {
    try {
      const response = await post('/social/like', {
        shared_food_id: postId,
        user_id: 1
      });
      
      // Update the feed item locally
      setFeed(feed.map(item => {
        if (item.id === postId) {
          return {
            ...item,
            likes_count: response.liked ? item.likes_count + 1 : item.likes_count - 1
          };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShareFood = async () => {
    if (!shareFood) return;
    
    try {
      const tags = shareTags.split(/[,\s]+/).filter(tag => tag.trim()).map(tag => tag.replace(/^#/, ''));
      
      await post('/social/share', {
        user_id: 1,
        food_id: shareFood.id,
        food_name: shareFood.name,
        caption: shareCaption,
        tags: tags,
        is_public: true
      });
      
      setMessage('✅ Food shared to community!');
      setShowShareModal(false);
      setShareCaption('');
      setShareTags('');
      setShareFood(null);
      loadData(); // Refresh feed
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error sharing food: ${error?.message || 'Unknown error'}`);
    }
  };

  const joinChallenge = async (challengeId: number) => {
    try {
      await post('/social/challenges/join', {
        challenge_id: challengeId,
        user_id: 1
      });
      
      setMessage('✅ Successfully joined challenge!');
      loadData(); // Refresh challenges
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`❌ Error joining challenge: ${error?.message || 'Unknown error'}`);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const getChallengeTypeEmoji = (type: string) => {
    const emojis: { [key: string]: string } = {
      daily_protein: '💪',
      weekly_steps: '🚶',
      monthly_veggies: '🥗',
      water_intake: '💧',
      meal_prep: '🍱',
      default: '🏆'
    };
    return emojis[type] || emojis.default;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner mr-3"></div>
        <span>Loading social features...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🤝 Community
        </h1>
        <p className="text-gray-600">
          Share your nutrition journey and connect with others
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg text-center ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'feed'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📱 Social Feed
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'challenges'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🏆 Challenges
        </button>
      </div>

      {/* Social Feed Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Share Button */}
          <div className="card text-center">
            <h2 className="text-lg font-semibold mb-3">Share Your Nutrition Journey</h2>
            <p className="text-gray-600 mb-4">
              Share foods, recipes, and inspire others in the community
            </p>
            <button
              onClick={() => {
                // For demo, we'll use a sample food
                setShareFood({
                  id: 1,
                  name: 'Grilled Chicken Breast',
                  brand: 'Fresh'
                });
                setShowShareModal(true);
              }}
              className="btn btn-primary"
            >
              📤 Share Food
            </button>
          </div>

          {/* Feed Items */}
          {feed.length > 0 ? (
            <div className="space-y-4">
              {feed.map((item) => (
                <div key={item.id} className="card">
                  {/* Post Header */}
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-primary-600 font-semibold">
                        {item.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{item.user.username}</div>
                      <div className="text-sm text-gray-500">
                        {formatTimeAgo(item.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Food Info */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-1">{item.food.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{item.food.brand}</p>
                    
                    {/* Nutrition Quick View */}
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600 font-medium">
                        {item.food.calories} cal
                      </span>
                      <span className="text-red-600 font-medium">
                        {item.food.protein_g}g protein
                      </span>
                    </div>
                  </div>

                  {/* Caption */}
                  {item.caption && (
                    <p className="mb-3">{item.caption}</p>
                  )}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <button
                      onClick={() => likePost(item.id)}
                      className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <span className="text-lg">❤️</span>
                      <span className="font-medium">{item.likes_count}</span>
                    </button>
                    
                    <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                      <span className="text-lg">💬</span>
                      <span className="font-medium">{item.comments_count}</span>
                    </button>
                    
                    <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                      <span className="text-lg">🔄</span>
                      <span className="text-sm">Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-gray-600 mb-4">
                Be the first to share your nutrition journey with the community!
              </p>
              <button 
                onClick={() => setShowShareModal(true)}
                className="btn btn-primary"
              >
                Share Your First Post
              </button>
            </div>
          )}
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {challenges.length > 0 ? (
            challenges.map((challenge) => (
              <div key={challenge.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      {getChallengeTypeEmoji(challenge.challenge_type)} {challenge.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{challenge.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                      <span>🎯 Target: {challenge.target_value} {challenge.target_unit}</span>
                      <span>👥 {challenge.participants_count} participants</span>
                      <span>⏰ {challenge.days_remaining} days left</span>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Created by @{challenge.creator.username}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => joinChallenge(challenge.id)}
                    className="btn btn-primary ml-4"
                  >
                    Join Challenge
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (challenge.participants_count / (challenge.max_participants || 100)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {challenge.max_participants ? 
                    `${challenge.participants_count}/${challenge.max_participants} participants` :
                    `${challenge.participants_count} participants`
                  }
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold mb-2">No active challenges</h3>
              <p className="text-gray-600">
                Check back soon for new community challenges!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">📤 Share Food</h2>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {shareFood && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold">{shareFood.name}</div>
                <div className="text-sm text-gray-600">{shareFood.brand}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption
                </label>
                <textarea
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                  placeholder="Share your thoughts about this food..."
                  rows={3}
                  className="w-full resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={shareTags}
                  onChange={(e) => setShareTags(e.target.value)}
                  placeholder="healthy, protein, postworkout"
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Add hashtags to help others discover your post
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleShareFood}
                  className="btn btn-primary flex-1"
                >
                  Share to Community
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
