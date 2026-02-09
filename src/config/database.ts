import mongoose from 'mongoose';
import { MONGODB_URI } from './constants';

const connectToDatabase = async (): Promise<void> =>{
    await mongoose.connect(MONGODB_URI!)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });
};

export default connectToDatabase;