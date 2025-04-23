import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config();

program
  .version('1.0.0')
  .description('GAPI - 업로드/다운로드 데몬 통합 API 서버');

program
  .option('-e, --env <environment>', '환경 설정 (REAL 또는 QC)', 'REAL')
  .action((options) => {
    const env = options.env.toUpperCase();
    
    if (env !== 'REAL' && env !== 'QC') {
      console.error('유효하지 않은 환경입니다. REAL 또는 QC를 사용하세요.');
      process.exit(1);
    }
    
    const envPath = path.join(rootDir, '.env');
    
    try {
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        if (envContent.includes('NODE_ENV=')) {
          envContent = envContent.replace(/NODE_ENV=.*/g, `NODE_ENV=${env}`);
        } else {
          envContent = `NODE_ENV=${env}\n${envContent}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`환경이 ${env}(으)로 설정되었습니다.`);
        
        console.log(`메인 데이터베이스 호스트: ${process.env[`MAIN_DB_HOST_${env}`]}`);
        console.log(`저작권 데이터베이스 호스트: ${process.env[`CPR_DB_HOST_${env}`]}`);
        console.log(`로그 데이터베이스 호스트: ${process.env[`LOG_DB_HOST_${env}`]}`);
      } else {
        const envExamplePath = path.join(rootDir, '.env.example');
        
        if (fs.existsSync(envExamplePath)) {
          let envContent = fs.readFileSync(envExamplePath, 'utf8');
          envContent = envContent.replace(/NODE_ENV=.*/g, `NODE_ENV=${env}`);
          
          fs.writeFileSync(envPath, envContent);
          console.log(`.env.example 파일을 기반으로 .env 파일을 생성했습니다.`);
          console.log(`환경이 ${env}(으)로 설정되었습니다.`);
        } else {
          const defaultEnvContent = `# Environment selection (REAL or QC)
NODE_ENV=${env}

# Main Database Configuration (zangsi)
MAIN_DB_HOST_REAL=49.236.131.20
MAIN_DB_HOST_QC=192.168.0.38
MAIN_DB_PORT=3306
MAIN_DB_NAME=zangsi
MAIN_DB_USER=dmondcmd
MAIN_DB_PASSWORD=fnehfvm)*^

# Copyright Database Configuration (zangsi_cpr)
CPR_DB_HOST_REAL=49.236.131.28
CPR_DB_HOST_QC=192.168.0.129
CPR_DB_PORT=3306
CPR_DB_NAME=zangsi_cpr
CPR_DB_USER=dmondcmd
CPR_DB_PASSWORD=fnehfvm)*^

# Log Database Configuration (zangsi_log)
LOG_DB_HOST_REAL=49.236.131.33
LOG_DB_HOST_QC=183.110.44.33
LOG_DB_PORT=3306
LOG_DB_NAME=zangsi_log
LOG_DB_USER=dmondcmd
LOG_DB_PASSWORD=fnehfvm)*^

# API Server Configuration
PORT=8000
`;
          
          fs.writeFileSync(envPath, defaultEnvContent);
          console.log(`.env 파일이 없어 새로 생성했습니다.`);
          console.log(`환경이 ${env}(으)로 설정되었습니다.`);
        }
      }
      
      console.log(`\n서버를 시작하려면 다음 명령어를 실행하세요:`);
      console.log(`npm start`);
    } catch (error) {
      console.error('환경 설정 중 오류가 발생했습니다:', error);
      process.exit(1);
    }
  });

if (process.argv.length <= 2) {
  const env = process.env.NODE_ENV || 'REAL';
  console.log(`현재 환경: ${env}`);
  console.log(`환경을 변경하려면 다음 명령어를 사용하세요:`);
  console.log(`node src/cli.js --env REAL`);
  console.log(`node src/cli.js --env QC`);
}

program.parse(process.argv);
