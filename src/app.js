import express from 'express';
import cors from 'cors';
import downloadRoutes from './routes/downloadRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/download', downloadRoutes);
app.use('/upload', uploadRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

export default app;
