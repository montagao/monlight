// Import required libraries
import express, { json} from 'express';
import cors from 'cors';
import { join } from 'path';
import apiRouter from './api.js';
import { getText as _getText, createHighlight as _createHighlight } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(json());
app.use(cors());

// Route handlers
app.use('/api', apiRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, '../../client/public')));
    app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../../client/public/index.html'));
    });
}

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});

// Expose database functionality for external use
export const getText = _getText;
export const createHighlight = _createHighlight;
