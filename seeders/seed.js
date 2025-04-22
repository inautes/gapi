import { sequelize } from '../src/config/database.js';
import { Category, User, File, Company } from '../src/models/index.js';

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced');

    const categories = [
      { code: '00', name: '기존서버', description: '카테고리 정책무시', cloud_yn: 'N' },
      { code: '99', name: '다담서버', description: '전체 다담서버', cloud_yn: 'N' },
      { code: '000', name: 'STORAGE', description: '스토리지 서버', cloud_yn: 'N' },
      { code: '100', name: 'CLOUD', description: '클라우드 서버', cloud_yn: 'N' },
      { code: '01', name: '영화', description: '영화 카테고리', cloud_yn: 'Y' },
      { code: '02', name: '드라마', description: '드라마 카테고리', cloud_yn: 'N' },
      { code: '03', name: '동영상', description: '동영상 카테고리', cloud_yn: 'N' },
      { code: '04', name: '게임', description: '게임 카테고리', cloud_yn: 'N' },
      { code: '05', name: '애니', description: '애니 카테고리', cloud_yn: 'N' },
      { code: '06', name: '기타', description: '기타 카테고리', cloud_yn: 'N' },
      { code: '07', name: '음악', description: '음악 카테고리', cloud_yn: 'N' },
      { code: '08', name: '도서', description: '도서 카테고리', cloud_yn: 'N' },
      { code: '09', name: '문서', description: '문서 카테고리', cloud_yn: 'N' },
      { code: '10', name: '이미지', description: '이미지 카테고리', cloud_yn: 'N' },
      { code: '11', name: '성인', description: '성인 카테고리', cloud_yn: 'N' },
      { code: '12', name: '교육', description: '교육 카테고리', cloud_yn: 'N' },
      { code: '13', name: '지식', description: '지식 카테고리', cloud_yn: 'N' },
      { code: '14', name: '자작', description: '자작 카테고리', cloud_yn: 'N' },
      { code: '15', name: '휴대기기', description: '휴대기기 카테고리', cloud_yn: 'N' }
    ];
    
    await Category.bulkCreate(categories);
    console.log('Categories seeded');

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
        category_code: '01' 
      },
      { 
        cont_id: '1024001', 
        seq_id: '321044', 
        hash: 'k1l2m3n4o5p6q7r8s9t0', 
        filename: 'drama1.mp4', 
        cloud_yn: false, 
        category_code: '02' 
      },
      { 
        cont_id: '1024002', 
        seq_id: '321045', 
        hash: 'u1v2w3x4y5z6a7b8c9d0', 
        filename: 'game1.exe', 
        cloud_yn: true, 
        category_code: '04' 
      },
      { 
        cont_id: '1111', 
        seq_id: '1111', 
        hash: 'hashcode123456789', 
        filename: 'test.txt', 
        cloud_yn: true, 
        category_code: '99' 
      }
    ];
    
    await File.bulkCreate(files);
    console.log('Files seeded');

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (process.argv[1] === import.meta.url.substring(7)) {
      await sequelize.close();
    }
  }
};

if (process.argv[1] === import.meta.url.substring(7)) {
  seedDatabase();
}

export { seedDatabase };
