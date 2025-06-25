const testParameterExtraction = () => {
  console.log('=== Testing sect_sub Parameter Extraction Logic ===\n');
  
  const mockRequestBody = {
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

  console.log('Mock request body:', JSON.stringify(mockRequestBody, null, 2));
  console.log('\n=== OLD EXTRACTION METHOD (BROKEN) ===');
  
  const { 
    temp_id: oldTempId, 
    user_id: oldUserId,
    sect_code: oldSectCode = '01',
    sect_sub: oldSectSub = '',
    adult_yn: oldAdultYn = 'N',
    copyright_yn: oldCopyrightYn = 'N',
    mobservice_yn: oldMobserviceYn = 'Y'
  } = mockRequestBody;
  
  console.log(`OLD - sect_code: "${oldSectCode}" (expected: "01")`);
  console.log(`OLD - sect_sub: "${oldSectSub}" (expected: "09") ❌ EMPTY!`);
  console.log(`OLD - adult_yn: "${oldAdultYn}" (expected: "N")`);
  console.log(`OLD - copyright_yn: "${oldCopyrightYn}" (expected: "")`);
  
  console.log('\n=== NEW EXTRACTION METHOD (FIXED) ===');
  
  const { 
    temp_id: newTempId, 
    user_id: newUserId,
    files = []
  } = mockRequestBody;

  const firstFile = files[0] || {};
  const {
    sect_code: newSectCode = '01',
    sect_sub: newSectSub = '',
    adult_yn: newAdultYn = 'N',
    copyright_yn: newCopyrightYn = 'N',
    mobservice_yn: newMobserviceYn = 'Y'
  } = firstFile;
  
  console.log(`NEW - sect_code: "${newSectCode}" (expected: "01")`);
  console.log(`NEW - sect_sub: "${newSectSub}" (expected: "09") ${newSectSub === '09' ? '✅ CORRECT!' : '❌ WRONG!'}`);
  console.log(`NEW - adult_yn: "${newAdultYn}" (expected: "N")`);
  console.log(`NEW - copyright_yn: "${newCopyrightYn}" (expected: "")`);
  
  console.log('\n=== VALIDATION CHECKS ===');
  
  if (!files || files.length === 0) {
    console.log('❌ files 배열이 누락되었거나 비어있습니다');
  } else {
    console.log('✅ files 배열 유효성 검사 통과');
  }
  
  console.log(`\n=== FINAL RESULT ===`);
  if (newSectSub === '09') {
    console.log('🎉 sect_sub 매핑 수정 성공! 데이터베이스에 올바른 값이 저장될 것입니다.');
  } else {
    console.log('💥 sect_sub 매핑 수정 실패! 추가 디버깅이 필요합니다.');
  }
};

testParameterExtraction();
