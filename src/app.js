import express from 'express';
import cors from 'cors';
import downloadRoutes from './routes/downloadRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const startTime = new Date();
  const { method, url, body, query, params } = req;
  
  console.log('='.repeat(50));
  console.log(`[${startTime.toISOString()}] ${method} ${url}`);
  
  if (Object.keys(query).length > 0) {
    console.log('쿼리 파라미터:', JSON.stringify(query, null, 2));
  }
  
  if (Object.keys(params).length > 0) {
    console.log('라우트 파라미터:', JSON.stringify(params, null, 2));
  }
  
  if (method !== 'GET' && Object.keys(body).length > 0) {
    console.log('요청 본문:', JSON.stringify(body, null, 2));
  }
  
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log(`응답 상태 코드: ${res.statusCode}`);
    console.log(`응답 시간: ${duration}ms`);
    console.log('='.repeat(50));
    
    return originalSend.apply(res, arguments);
  };
  
  next();
});

app.use('/download', downloadRoutes);
app.use('/upload', uploadRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

export default app;
