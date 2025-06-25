import fetch from 'node-fetch';

const testEnrollmentComplete = async () => {
  const requestData = {
    "files": [
      {
        "adult_yn": "N",
        "copyright_yn": "",
        "default_hash": "01df3132676e670ab9df4f5d327a9527",
        "sect_code": "01",
        "sect_sub": "09",
        "seq_no": 1,
        "webhard_hash": "615286b0a841b855e44573219727d4ec_231763258"
      }
    ],
    "temp_id": 1016821214,
    "user_id": "uploadtest"
  };

  try {
    console.log('Testing enrollment_complete with sect_sub fix...');
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    const response = await fetch('http://localhost:3000/upload/enrollment_complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(result, null, 2));
    
    if (result.metadata) {
      console.log('\n=== METADATA VERIFICATION ===');
      console.log(`sect_code: ${result.metadata.sect_code} (expected: 01)`);
      console.log(`sect_sub: ${result.metadata.sect_sub} (expected: 09)`);
      console.log(`adult_yn: ${result.metadata.adult_yn} (expected: N)`);
      console.log(`copyright_yn: ${result.metadata.copyright_yn} (expected: )`);
      
      if (result.metadata.sect_sub === '09') {
        console.log('✅ sect_sub fix SUCCESSFUL - value correctly extracted from files array');
      } else {
        console.log('❌ sect_sub fix FAILED - value not correctly extracted');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testEnrollmentComplete();
