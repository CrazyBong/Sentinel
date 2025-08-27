import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: ".env.development.local" });

// Use environment variable with fallback
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/senitelAI';
if(!DB_URI){
    throw new Error("DB_URI is not defined");
}

const connectToDatabase = async () => {
    try {
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

// Export both the connection function and mongoose instance
export { connectToDatabase, mongoose as default };