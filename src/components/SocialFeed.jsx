import React, { useState, useEffect, useRef } from "react";
import RecipePost from "./RecipePost";
import "./SocialFeed.css";

function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const pageRef = useRef(1);

  // Load posts from localStorage (simulating API)
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      try {
        const savedPosts = localStorage.getItem("halalKitchenPosts");
        const allPosts = savedPosts ? JSON.parse(savedPosts) : [];
        
        // For demo, add some sample posts if empty
        if (allPosts.length === 0) {
          const samplePosts = generateSamplePosts();
          setPosts(samplePosts);
          localStorage.setItem("halalKitchenPosts", JSON.stringify(samplePosts));
        } else {
          // Filter to only show public posts (isPublic === true or undefined for backward compatibility)
          // For backward compatibility, treat undefined isPublic as public
          const publicPosts = allPosts.filter(post => post.isPublic === true || post.isPublic === undefined);
          setPosts(publicPosts);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading posts:", error);
        setLoading(false);
      }
    }, 500);
  };

  const generateSamplePosts = () => {
    return [
      {
        id: "1",
        userId: "demo_user",
        username: "HalalChef",
        avatar: null,
        title: "Chicken Biryani - Halal Style",
        description: "Converted this amazing biryani recipe to be fully halal! Used halal chicken stock instead of wine. 🍗✨",
        originalRecipe: "Chicken, rice, spices, white wine",
        convertedRecipe: "Chicken, rice, spices, halal chicken stock",
        mediaUrls: [],
        mediaType: "image",
        likes: 42,
        comments: 8,
        shares: 5,
        confidenceScore: 98,
        createdAt: new Date().toISOString(),
        category: "Main Course",
        hashtags: ["#HalalBiryani", "#HalalCooking"],
        isLiked: false,
        isSaved: false
      },
      {
        id: "2",
        userId: "demo_user2",
        username: "HalalBaker",
        avatar: null,
        title: "Vanilla Cake - Alcohol-Free",
        description: "Perfect halal vanilla cake using vanilla powder instead of extract! 🎂",
        originalRecipe: "Flour, sugar, eggs, vanilla extract",
        convertedRecipe: "Flour, sugar, eggs, vanilla powder",
        mediaUrls: [],
        mediaType: "image",
        likes: 67,
        comments: 12,
        shares: 9,
        confidenceScore: 95,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        category: "Dessert",
        hashtags: ["#HalalDessert", "#NoAlcohol"],
        isLiked: false,
        isSaved: false
      }
    ];
  };

  const handleLike = (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
    // Save to localStorage
    savePostsToStorage();
  };

  const handleSave = (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, isSaved: !post.isSaved }
          : post
      )
    );
    savePostsToStorage();
  };

  const handleComment = (postId, commentText) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, comments: post.comments + 1 }
          : post
      )
    );
    savePostsToStorage();
  };

  const savePostsToStorage = () => {
    try {
      localStorage.setItem("halalKitchenPosts", JSON.stringify(posts));
    } catch (error) {
      console.error("Error saving posts:", error);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="social-feed">
        <div className="feed-loading">
          <div className="loading-skeleton"></div>
          <div className="loading-skeleton"></div>
          <div className="loading-skeleton"></div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="social-feed">
        <div className="empty-feed">
          <div className="empty-feed-icon">🍽️</div>
          <h2>No recipes yet</h2>
          <p>Be the first to share a halal recipe conversion!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="social-feed">
      <div className="feed-header">
        <h2>Halal Kitchen Feed</h2>
        <button className="refresh-feed-btn" onClick={loadPosts} aria-label="Refresh feed">
          ↻
        </button>
      </div>
      
      <div className="posts-container">
        {posts.map((post) => (
          <RecipePost
            key={post.id}
            post={post}
            onLike={handleLike}
            onSave={handleSave}
            onComment={handleComment}
          />
        ))}
      </div>

      {loading && (
        <div className="feed-loading-more">
          <div className="loading-spinner"></div>
          <p>Loading more recipes...</p>
        </div>
      )}
    </div>
  );
}

export default SocialFeed;
