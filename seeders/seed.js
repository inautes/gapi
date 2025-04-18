import { sequelize } from '../src/config/database.js';
import { Category, User, File, Company } from '../src/models/index.js';

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced');

    const categories = [
      { code: '000', name: '기존서버', description: '카테고리 정책무시' },
      { code: '100', name: '다담서버', description: '전체 다담서버' },
      { code: '001', name: '영화', description: '영화 카테고리' },
      { code: '002', name: '드라마', description: '드라마 카테고리' },
      { code: '003', name: '동영상', description: '동영상 카테고리' },
      { code: '004', name: '게임', description: '게임 카테고리' },
      { code: '005', name: '애니', description: '애니 카테고리' },
      { code: '006', name: '도서', description: '도서 카테고리' },
      { code: '007', name: '교육', description: '교육 카테고리' },
      { code: '008', name: '기타', description: '기타 카테고리' },
      { code: '009', name: '성인', description: '성인 카테고리' }
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
        upload_policy: ['001', '002'] 
      },
      { 
        userid: 'admin5678', 
        upload_policy: ['001', '002', '003', '004', '005'] 
      },
      { 
        userid: 'test9012', 
        upload_policy: ['000'] 
      },
      { 
        userid: 'cloud3456', 
        upload_policy: ['100'] 
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
        category_code: '001' 
      },
      { 
        cont_id: '1024001', 
        seq_id: '321044', 
        hash: 'k1l2m3n4o5p6q7r8s9t0', 
        filename: 'drama1.mp4', 
        cloud_yn: false, 
        category_code: '002' 
      },
      { 
        cont_id: '1024002', 
        seq_id: '321045', 
        hash: 'u1v2w3x4y5z6a7b8c9d0', 
        filename: 'game1.exe', 
        cloud_yn: true, 
        category_code: '004' 
      },
      { 
        cont_id: '1111', 
        seq_id: '1111', 
        hash: 'hashcode123456789', 
        filename: 'test.txt', 
        cloud_yn: true, 
        category_code: '100' 
      }
    ];
    
    await File.bulkCreate(files);
    console.log('Files seeded');

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

seedDatabase();
