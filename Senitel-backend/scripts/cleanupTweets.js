import mongoose from 'mongoose';
import Tweet from '../models/tweet.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupInvalidTweets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find tweets with missing or empty displayName
    const invalidTweets = await Tweet.find({
      $or: [
        { displayName: { $exists: false } },
        { displayName: '' },
        { displayName: null }
      ]
    });
    
    console.log(`Found ${invalidTweets.length} tweets with invalid displayName`);
    
    // Update them
    for (const tweet of invalidTweets) {
      tweet.displayName = tweet.username || tweet.user?.name || '';
      await tweet.save();
    }
    
    console.log('✅ Cleanup completed');
    process.exit(0);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupInvalidTweets();