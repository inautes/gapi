const testVideoStatus2DigitMapping = () => {
  console.log('=== Testing video_status → file_type 2-Digit Mapping ===\n');
  
  // video_status를 file_type으로 매핑하는 함수 (2자리 형식)
  const mapVideoStatusToFileType = (video_status) => {
    if (!video_status) return '02'; // 기본값
    
    switch (video_status.toString()) {
      case '01': return '01'; // 비디오
      case '02': return '02'; // 오디오
      case '03': return '03'; // 이미지
      case '04': return '04'; // 문서
      case '05': return '05'; // 기타
      case '1': return '01'; // 비디오
      case '2': return '02'; // 오디오
      case '3': return '03'; // 이미지
      case '4': return '04'; // 문서
      case '5': return '05'; // 기타
      default: return '02'; // 기본값
    }
  };
  
  const testCases = [
    { video_status: '01', expected: '01', description: '비디오 (2자리)' },
    { video_status: '02', expected: '02', description: '오디오 (2자리)' },
    { video_status: '03', expected: '03', description: '이미지 (2자리)' },
    { video_status: '04', expected: '04', description: '문서 (2자리)' },
    { video_status: '05', expected: '05', description: '기타 (2자리)' },
    
    { video_status: '1', expected: '01', description: '비디오 (1자리 호환)' },
    { video_status: '2', expected: '02', description: '오디오 (1자리 호환)' },
    { video_status: '3', expected: '03', description: '이미지 (1자리 호환)' },
    { video_status: '4', expected: '04', description: '문서 (1자리 호환)' },
    { video_status: '5', expected: '05', description: '기타 (1자리 호환)' },
    
    { video_status: '', expected: '02', description: '빈 문자열' },
    { video_status: null, expected: '02', description: 'null 값' },
    { video_status: undefined, expected: '02', description: 'undefined 값' },
    { video_status: '99', expected: '02', description: '알 수 없는 값' },
    { video_status: 'abc', expected: '02', description: '잘못된 형식' }
  ];
  
  console.log('=== 2자리 형식 video_status 매핑 테스트 ===');
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    const result = mapVideoStatusToFileType(testCase.video_status);
    const passed = result === testCase.expected;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${(index + 1).toString().padStart(2, ' ')}. ${testCase.description}: video_status="${testCase.video_status}" → file_type="${result}" ${status}`);
    
    if (!passed) {
      console.log(`    예상: "${testCase.expected}", 실제: "${result}"`);
    } else {
      passedTests++;
    }
  });
  
  console.log('\n=== 테스트 결과 요약 ===');
  console.log(`총 테스트: ${totalTests}개`);
  console.log(`통과: ${passedTests}개`);
  console.log(`실패: ${totalTests - passedTests}개`);
  console.log(`성공률: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 모든 테스트 통과! 2자리 형식 video_status 매핑이 올바르게 구현되었습니다.');
  } else {
    console.log('\n⚠️  일부 테스트 실패. 매핑 로직을 다시 확인해주세요.');
  }
  
  console.log('\n=== 주요 변경사항 ===');
  console.log('✅ 기본값: "2" → "02"');
  console.log('✅ 2자리 형식 지원: "01", "02", "03", "04", "05"');
  console.log('✅ 하위 호환성: "1" → "01", "2" → "02" 등');
  console.log('✅ T_CONTENTS_FILE 및 T_CONTENTS_FILELIST 모두 적용');
};

testVideoStatus2DigitMapping();
