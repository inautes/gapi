import { sequelize } from '../src/config/database.js';
import { User, File, Company } from '../src/models/index.js';

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding');

    const companies = [
      { 
        code: 'WEDISK', 
        name: '위디스크', 
        domain: 'gapi.wedisk.co.kr', 
        is_cloud: false 
      },
      { 
        code: 'FILENORI', 
        name: '파일노리', 
        domain: 'gapi.filenori.com', 
        is_cloud: false 
      },
      { 
        code: 'DADAM', 
        name: '다담클라우드', 
        domain: 'cloud.dadam.com', 
        is_cloud: true 
      }
    ];
    
    await Company.bulkCreate(companies);
    console.log('Companies seeded');

    const users = [
      { 
        userid: 'user1234', 
        upload_policy: ['01', '02'] 
      },
      { 
        userid: 'admin5678', 
        upload_policy: ['01', '02', '03', '04', '05'] 
      },
      { 
        userid: 'test9012', 
        upload_policy: ['00'] 
      },
      { 
        userid: 'cloud3456', 
        upload_policy: ['99'] 
      }
    ];
    
    await User.bulkCreate(users);
    console.log('Users seeded');

    const files = [
      { 
        cont_id: '1024000', 
        seq_id: '321043', 
        hash: 'a1b2c3d4e5f6g7h8i9j0', 
        filename: 'movie1.mp4', 
        cloud_yn: false, 
        sect_code: '01' 
      },
      { 
        cont_id: '1024001', 
        seq_id: '321044', 
        hash: 'k1l2m3n4o5p6q7r8s9t0', 
        filename: 'drama1.mp4', 
        cloud_yn: false, 
        sect_code: '02' 
      },
      { 
        cont_id: '1024002', 
        seq_id: '321045', 
        hash: 'u1v2w3x4y5z6a7b8c9d0', 
        filename: 'game1.exe', 
        cloud_yn: true, 
        sect_code: '04' 
      },
      { 
        cont_id: '1111', 
        seq_id: '1111', 
        hash: 'hashcode123456789', 
        filename: 'test.txt', 
        cloud_yn: true, 
        sect_code: '99' 
      }
    ];
    
    await File.bulkCreate(files);
    console.log('Files seeded');

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (process.argv[1] === import.meta.url.substring(7)) {
      console.log('직접 실행 모드: 데이터베이스 연결을 닫습니다.');
      await sequelize.close();
    } else {
      console.log('모듈 가져오기 모드: 데이터베이스 연결을 유지합니다.');
    }
  }
};

if (process.argv[1] === import.meta.url.substring(7)) {
  seedDatabase();
}

export { seedDatabase };
