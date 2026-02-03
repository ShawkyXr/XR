import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const URI = process.env.MONGO_URI;

const connectToDatabase = async (): Promise<void> =>{
    if (!URI) {
        throw new Error('MONGO_URI environment variable is not defined');
    }
    await mongoose.connect(URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });
};

export default connectToDatabase;