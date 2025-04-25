# GAPI 업로드 API 상세 명세서

## 목차
1. [개요](#개요)
2. [API 엔드포인트](#api-엔드포인트)
   - [업로드 정책 조회](#1-업로드-정책-조회)
   - [업로드 서버 주소 조회](#2-업로드-서버-주소-조회)
   - [업로드 프로세스 시작](#3-업로드-프로세스-시작)
   - [업로드 프로세스 종료](#4-업로드-프로세스-종료)
   - [해시 등록](#5-해시-등록)

## 개요

이 문서는 C_Source 레포지토리의 업로드 프로세스를 Node.js로 재구현한 GAPI의 업로드 관련 API 엔드포인트에 대한 상세 명세를 제공합니다.

## API 엔드포인트

### 1. 업로드 정책 조회

**엔드포인트**: `POST /upload/policy`

**요청 형식**:
```json
{
  "userid": "string"
}
```

**응답 형식**:
```json
{
  "result": "success",
  "message": "업로드 정책 조회 성공",
  "data": {
    "upload_policy": ["001", "002", "003"]
  }
}
```

### 2. 업로드 서버 주소 조회

**엔드포인트**: `GET /upload/address`

**응답 형식**:
```json
{
  "result": "success",
  "message": "업로드 서버 주소 조회 성공",
  "data": {
    "ftp_upload_server": "wedisk-ftpupload.dadamcloud.com",
    "download_server": "https://wedisk-down.dadamcloud.com/fdown.php"
  }
}
```

### 3. 업로드 프로세스 시작

**엔드포인트**: `POST /upload/start_process`

**요청 형식**:
```json
{
  "user_id": "string",           // 필수: 사용자 ID
  "file_name": "string",         // 필수: 파일명
  "file_size": number,           // 필수: 파일 크기(바이트)
  "sect_code": "string",         // 필수: 섹션 코드
  "sect_sub": "string",          // 서브 섹션 코드
  "title": "string",             // 필수: 컨텐츠 제목
  "descript": "string",          // 컨텐츠 설명
  "keyword": "string",           // 키워드
  "default_hash": "string",      // 필수: 기본 해시값
  "audio_hash": "string",        // 오디오 해시값
  "video_hash": "string",        // 비디오 해시값
  "file_resoX": number,          // 해상도 X
  "file_resoY": number,          // 해상도 Y
  "copyright_yn": "string",      // 저작권 여부(Y/N)
  "adult_yn": "string",          // 성인 컨텐츠 여부(Y/N)
  "folder_yn": "string",         // 폴더 여부(Y/N)
  "server_id": "string",         // 서버 ID
  "file_path": "string",         // 파일 경로
  "file_type": "string",         // 파일 타입
  "share_meth": "string",        // 공유 방식
  "disp_end_date": "string",     // 게시 종료 날짜(YYYYMMDD)
  "disp_end_time": "string",     // 게시 종료 시간(HHMMSS)
  "disp_stat": "string",         // 게시 상태
  "file_del_yn": "string",       // 파일 삭제 여부(Y/N)
  "cont_gu": "string",           // 컨텐츠 구분(WE:위디스크, MY:마이자료실, MD:모바일자료실)
  "conn_ip": "string",           // 접속 IP
  "version_data": "string",      // 버전 데이터
  "price_amt": number,           // 판매 금액
  "won_mega": number,            // 원/메가
  "dsp_file_cnt": number,        // 조회 횟수
  "down_cnt": number,            // 다운로드 횟수
  "mobservice_yn": "string",     // 모바일 서비스 여부(Y/N)
  "cloud_yn": "string",          // 클라우드 여부(Y/N)
  "company_code": "string",      // 회사 코드
  "auth_num": "string",          // 인증 번호
  "client_port": number          // 클라이언트 포트
}
```

**응답 형식**:
```json
{
  "result": "success",
  "message": "업로드 프로세스가 시작되었습니다",
  "data": {
    "temp_id": 1234567890,
    "seq_no": 1,
    "metadata": {
      // 요청 파라미터와 동일한 구조에 추가 정보 포함
      "reg_date": "20250423",
      "reg_time": "070000"
    }
  }
}
```

### 4. 업로드 프로세스 종료

**엔드포인트**: `POST /upload/end_process`

**요청 형식**:
```json
{
  "temp_id": number,             // 필수: 임시 ID
  "user_id": "string",           // 필수: 사용자 ID
  "sect_code": "string",         // 필수: 섹션 코드
  "sect_sub": "string",          // 서브 섹션 코드
  "adult_yn": "string",          // 성인 컨텐츠 여부(Y/N)
  "copyright_yn": "string",      // 저작권 여부(Y/N)
  "mobservice_yn": "string",     // 모바일 서비스 여부(Y/N)
  "folder_yn": "string",         // 폴더 여부(Y/N)
  "cloud_yn": "string",          // 클라우드 여부(Y/N)
  "company_code": "string",      // 회사 코드
  "server_id": "string",         // 서버 ID
  "file_path": "string",         // 파일 경로
  "file_name": "string",         // 파일명
  "mureka_filter_yn": "string",  // 무레카 필터 여부(Y/N)
  "mureka_filter_type": "string", // 무레카 필터 타입
  "mureka_filter_data": "string", // 무레카 필터 데이터
  "mureka_cnt": number,          // 무레카 패킷 개수
  "mureka_vinfo": {              // 무레카 필터링 정보
    "nFileGubun": number,        // 파일 구분(0:일반, 1:음악, 2:비디오)
    "filename": "string",        // 파일명
    "mureka_hash": "string",     // 무레카 해시값
    "nResultCode": number,       // 검사결과코드
    "music_status": "string",    // 상태(00:정상, 01:차단, 02:삭제, 03:Non-License, 04:Unknown)
    "music_id": "string",        // 음악ID
    "music_title": "string",     // 제목
    "music_artist": "string",    // 아티스트
    "music_album": "string",     // 앨범
    "music_prod_code": "string", // 상품코드
    "music_price": "string",     // 금액
    "music_injeob_com": "string", // 인접권 업체명
    "music_injeob_music_id": "string", // 인접권 업체 MUSIC_ID
    "video_status": "string",    // 상태(00:정상, 01:차단, 02:삭제, 03:Non-License, 04:Unknown)
    "video_id": "string",        // 비디오ID
    "video_title": "string",     // 제목
    "video_jejak_year": "string", // 제작년도
    "video_right_name": "string", // 권리사
    "video_right_content_id": "string", // 권리 컨텐츠ID
    "video_grade": "string",     // 등급(12:12세 이상, 15:15세 이상, 18:18세 이상, 1:전체관람가, 0:등급 없음)
    "video_price": "string",     // 가격
    "video_cha": "string",       // 회차
    "video_osp_jibun": "string", // OSP 지분율
    "video_osp_etc": "string",   // OSP 기타 정보
    "video_onair_date": "string", // 방영일/개봉일
    "video_right_id": "string"   // 권리 ID
  },
  "mureka_hash_1m": "string",    // wedisk 1mb 해시
  "mureka_hash_1m_mureka": "string", // mureka 1mb 해시
  "event_cp_yn": "string",       // 이벤트 CP 여부(Y/N)
  "event_cp_data": "string",     // 이벤트 CP 데이터
  "depth": number,               // 깊이
  "cont_gu": "string",           // 컨텐츠 구분(WE:위디스크, FD:파일로그)
  "seq_no": number,              // 시퀀스 번호
  "file_size": number,           // 파일 크기(바이트)
  "default_hash": "string",      // 기본 해시값
  "audio_hash": "string",        // 오디오 해시값
  "video_hash": "string"         // 비디오 해시값
}
```

**응답 형식**:
```json
{
  "result": "success",
  "message": "업로드 프로세스가 완료되었습니다",
  "data": {
    "cont_id": 9876543210,
    "metadata": {
      // 요청 파라미터와 동일한 구조에 추가 정보 포함
      "reg_date": "20250423",
      "reg_time": "070000"
    }
  }
}
```

### 5. 해시 등록

**엔드포인트**: `POST /upload/hashin`

**요청 형식**:
```json
{
  "info": {
    "cont_id": "string",         // 필수: 컨텐츠 ID
    "seq_id": "string",          // 필수: 시퀀스 ID
    "hash": "string",            // 필수: 파일 해시값
    "cloud_yn": "string",        // 클라우드 여부(y/n)
    "category_code": "string",   // 필수: 카테고리 코드
    "company_code": "string"     // 필수: 회사 코드
  }
}
```

**응답 형식**:
```json
{
  "result": "success",
  "message": "All inserted",
  "data": {
    "file_id": 12345
  }
}
```
