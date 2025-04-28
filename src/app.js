import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import downloadRoutes from './routes/downloadRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();
const LOG_DIR = path.join(process.cwd(), 'logs');
const SERVER_LOG_FILE = path.join(LOG_DIR, 'server_restart.log');
const SERVER_ACTIVITY_LOG_FILE = path.join(LOG_DIR, 'server_activity.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logServerActivity = (message) => {
  const now = new Date();
  const logMessage = `[${now.toISOString()}] ${message}\n`;
  
  fs.appendFileSync(SERVER_ACTIVITY_LOG_FILE, logMessage);
  
  console.log(message);
};

const serverStartTime = new Date();
logServerActivity(`서버 활동 로깅 시작 (서버 시작 시간: ${serverStartTime.toISOString()})`);

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
    
    const uptime = Math.floor((endTime - serverStartTime) / 1000);
    logServerActivity(`요청 처리 완료: ${method} ${url} (상태: ${res.statusCode}, 소요시간: ${duration}ms, 서버 가동시간: ${uptime}초)`);
    
    return originalSend.apply(res, arguments);
  };
  
  next();
});

app.get('/server-status', (req, res) => {
  const now = new Date();
  const uptime = Math.floor((now - serverStartTime) / 1000);
  
  try {
    let restartLogs = [];
    if (fs.existsSync(SERVER_LOG_FILE)) {
      restartLogs = fs.readFileSync(SERVER_LOG_FILE, 'utf8').trim().split('\n');
    }
    
    res.json({
      status: 'running',
      started_at: serverStartTime.toISOString(),
      uptime_seconds: uptime,
      restart_count: restartLogs.length,
      last_restart: restartLogs.length > 0 ? restartLogs[restartLogs.length - 1] : null
    });
    
    logServerActivity(`서버 상태 확인 요청 처리 (가동시간: ${uptime}초)`);
  } catch (error) {
    console.error('서버 상태 확인 중 오류 발생:', error.message);
    res.status(500).json({ error: '서버 상태 확인 중 오류가 발생했습니다.' });
  }
});

app.use('/download', downloadRoutes);
app.use('/upload', uploadRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

export default app;
