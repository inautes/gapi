# JSON 기반 업로드 API 명세서

## 개요

이 문서는 C_Source 레포지토리의 업로드 프로세스를 분석하여 새롭게 설계된 JSON 기반 업로드 API에 대한 명세서입니다. 기존의 `start_process`, `end_process`, `hashin` API를 대체하는 새로운 API 엔드포인트를 정의합니다.

## API 엔드포인트

### 0. 업로드 정책 조회 API (기존 API)

**엔드포인트**: `POST /upload/policy`

**설명**: 사용자가 업로드할 수 있는 카테고리 코드 목록을 반환합니다. 클라우드 카테고리 중에서 사용자에게 권한이 있는 카테고리만 반환합니다.

**요청 형식**:

```json
{
  "userid": "testuser"  // 사용자 ID (선택 사항)
}
```

**응답 형식**:

```json
{
  "result": "success",
  "upload_policy": ["001", "002", "100"]  // 업로드 가능한 카테고리 코드 목록
}
```

**오류 응답**:

```json
{
  "result": "error",
  "message": "Internal server error"
}
```

### 1. 파일 정보 등록 API

**엔드포인트**: `POST /upload/enrollment_fileinfo`

**설명**: 파일 업로드 전 파일 관련 데이터를 등록합니다. 기존 UPFILEINFO 및 CFUPS4001 구조체의 데이터를 JSON 형식으로 변환하여 처리합니다.

**요청 형식**:

```json
{
  "files": [
    {
      "disk_type": 1,                      // (UPFILEINFO.nTypeDisk) 디스크 타입 (1: MYDISK, 2: WEDISK)
      "file_type": 1,                      // (UPFILEINFO.nType) 파일 타입 (1: 파일, 2: 폴더)
      "fups_flag": 11,                     // (UPFILEINFO.nfupsFlag) 11: 판매 - 700, 12: 공유 - mb 당 얼마
      "reupload_flag": 0,                  // (UPFILEINFO.nReUploadFlag) 재업로드 플래그
      "server_port": 8080,                 // (UPFILEINFO.dwServerPort) 서버 포트
      "content_number": 0,                 // (UPFILEINFO.nNumber) 컨텐츠 번호
      "copyright_yn": "N",                 // (UPFILEINFO.szCopyright_yn) 저작권 여부
      "mureka_yn": "N",                    // (UPFILEINFO.szMureka_yn) 무레카 여부
      "server_id": "WD001",                // (UPFILEINFO.szServerID) 서버 ID
      "server_ip": "192.168.0.1",          // (UPFILEINFO.szServerIP) 서버 IP
      "folder_name": "test_folder",        // (UPFILEINFO.szFolderName) 폴더 이름
      "file_name": "test.mp4",             // (UPFILEINFO.szFileName) 파일 이름
      "src_path": "/home/user/files",      // (UPFILEINFO.szSrcPath) 소스 경로
      "down_path": "/raid/fdata/wedisk",   // (UPFILEINFO.szDownPath) 다운로드 경로
      "default_hash": "abcdef123456",      // (UPFILEINFO.szDefault_hash) 기본 해시
      "audio_hash": "",                    // (UPFILEINFO.szAudio_hash) 오디오 해시
      "video_hash": "",                    // (UPFILEINFO.szVideo_hash) 비디오 해시
      "webhard_hash": "xyz789",            // (추가 필드) 웹하드 해시
      "file_size": 1024000,                // (UPFILEINFO.dFileSize) 파일 크기
      "content_info": {
        "file_reso_x": 1920,               // (CFUPS4001.file_resoX) 해상도 X
        "file_reso_y": 1080,               // (CFUPS4001.file_resoY) 해상도 Y
        "dsp_file_cnt": 0,                 // (CFUPS4001.dsp_file_cnt) 조회 건수
        "down_cnt": 0,                     // (CFUPS4001.down_cnt) 다운로드 건수
        "price_amt": 0,                    // (CFUPS4001.price_amt) 희망 가격
        "won_mega": 0,                     // (CFUPS4001.won_mega) 원당 메가
        "id": 0,                           // (CFUPS4001.id) 컨텐츠 ID
        "file_size": 1024000,              // (CFUPS4001.file_size) 파일 크기
        "copyright_yn": "N",               // (CFUPS4001.copyright_yn) 저작권 여부
        "title": "테스트 비디오",           // (CFUPS4001.title) 제목
        "descript": "테스트 설명",          // (CFUPS4001.descript) 내용
        "keyword": "테스트,비디오",         // (CFUPS4001.keyword) 키워드
        "sect_code": "01",                 // (CFUPS4001.sect_code) 분류 코드
        "sect_sub": "",                    // (CFUPS4001.sect_sub) 분류 코드 서브
        "share_meth": "01",                // (CFUPS4001.share_meth) 공유 방법
        "disp_end_date": "20251231",       // (CFUPS4001.disp_end_date) 게시 종료 일자
        "disp_end_time": "235959",         // (CFUPS4001.disp_end_time) 게시 종료 시간
        "disp_stat": "Y",                  // (CFUPS4001.disp_stat) 게시 상태
        "file_del_yn": "N",                // (CFUPS4001.file_del_yn) 파일 삭제 여부
        "folder_yn": "N",                  // (CFUPS4001.folder_yn) 폴더 여부
        "server_id": "WD001",              // (CFUPS4001.server_id) 서버 ID
        "file_path": "/raid/fdata/wedisk", // (CFUPS4001.file_path) 파일 경로
        "file_name1": "server_file.mp4",   // (CFUPS4001.file_name1) 서버 파일 이름
        "file_name2": "test.mp4",          // (CFUPS4001.file_name2) 로컬 파일 이름
        "file_type": "mp4",                // (CFUPS4001.file_type) 파일 타입
        "up_st_date": "20250425",          // (CFUPS4001.up_st_date) 업로드 시작 일자
        "up_st_time": "120000",            // (CFUPS4001.up_st_time) 업로드 시작 시간
        "reg_user": "testuser",            // (CFUPS4001.reg_user) 등록자
        "reg_date": "20250425",            // (CFUPS4001.reg_date) 등록 일자
        "reg_time": "120000",              // (CFUPS4001.reg_time) 등록 시간
        "adult_yn": "N",                   // (CFUPS4001.adult_yn) 성인 자료 여부
        "temp": ""                         // (CFUPS4001.temp) 임시
      }
    }
  ],
  "user_id": "testuser"                    // 사용자 ID
}
```

**응답 형식**:

```json
{
  "result": "success",
  "message": "파일 정보가 성공적으로 등록되었습니다",
  "data": [
    {
      "temp_id": 12345,                    // 임시 ID (T_CONTENTS_TEMP.id)
      "seq_no": 1,                         // 시퀀스 번호
      "file_name": "test.mp4",             // 파일 이름
      "default_hash": "abcdef123456",      // 기본 해시
      "webhard_hash": "xyz789",            // 웹하드 해시
      "server_id": "WD001",                // 서버 ID
      "server_path": "/raid/fdata/wedisk/2025/04/25/12/temp12345" // 서버 경로
    }
  ]
}
```

**오류 응답**:

```json
{
  "result": "error",
  "message": "파일 정보 등록 중 오류가 발생했습니다",
  "error_code": "ERR_INVALID_PARAM",
  "details": "필수 파라미터가 누락되었습니다"
}
```

### 2. 필터링 정보 등록 API

**엔드포인트**: `POST /upload/enrollment_filtering`

**설명**: 파일 업로드 전 필터링 관련 데이터를 등록합니다. 기존 MUREKA_FILE_RESULT 구조체의 데이터를 JSON 형식으로 변환하여 처리합니다.

**요청 형식**:

```json
{
  "temp_id": 12345,                      // 임시 ID (enrollment_fileinfo에서 받은 값)
  "user_id": "testuser",                 // 사용자 ID
  "filtering_results": [
    {
      "file_gubun": 2,                   // (MUREKA_FILE_RESULT.nFileGubun) 파일 구분 (0: 음악/동영상 아님, 1: 음악, 2: 동영상, 8: 북파일)
      "filename": "test.mp4",            // (MUREKA_FILE_RESULT.filename) 파일명
      "mureka_hash": "abcdef123456",     // (MUREKA_FILE_RESULT.mureka_hash) 무레카 해시
      "result_code": 0,                  // (MUREKA_FILE_RESULT.nResultCode) 결과 코드
      "video_status": "00",              // (MUREKA_FILE_RESULT.video_status) 상태
      "video_id": "VID12345",            // (MUREKA_FILE_RESULT.video_id) 비디오 ID
      "video_title": "테스트 비디오",      // (MUREKA_FILE_RESULT.video_title) 제목
      "video_jejak_year": "2025",        // (MUREKA_FILE_RESULT.video_jejak_year) 제작년도
      "video_right_name": "테스트 회사",   // (MUREKA_FILE_RESULT.video_right_name) 계약사명
      "video_right_content_id": "RC123", // (MUREKA_FILE_RESULT.video_right_content_id) 계약사 컨텐츠 ID
      "video_grade": "12",               // (MUREKA_FILE_RESULT.video_grade) 등급
      "video_price": "0",                // (MUREKA_FILE_RESULT.video_price) 가격
      "video_cha": "1",                  // (MUREKA_FILE_RESULT.video_cha) 회차
      "video_osp_jibun": "100",          // (MUREKA_FILE_RESULT.video_osp_jibun) OSP 지분률
      "video_osp_etc": "",               // (MUREKA_FILE_RESULT.video_osp_etc) OSP 설정 비고값
      "video_onair_date": "20250401",    // (MUREKA_FILE_RESULT.video_onair_date) 방영일/개봉일
      "video_right_id": "RID123"         // (MUREKA_FILE_RESULT.video_right_id) 계약사 ID
    }
  ]
}
```

**응답 형식**:

```json
{
  "result": "success",
  "message": "필터링 정보가 성공적으로 등록되었습니다",
  "data": {
    "temp_id": 12345,
    "filtering_status": "completed",
    "copyright_status": "N",             // 저작권 상태 (Y: 저작권 있음, N: 저작권 없음, C: 회사 저작권)
    "filtering_results": [
      {
        "filename": "test.mp4",
        "result_code": 0,
        "status": "processed"
      }
    ]
  }
}
```

**오류 응답**:

```json
{
  "result": "error",
  "message": "필터링 정보 등록 중 오류가 발생했습니다",
  "error_code": "ERR_INVALID_TEMP_ID",
  "details": "유효하지 않은 임시 ID입니다"
}
```

### 3. 업로드 완료 API

**엔드포인트**: `POST /upload/enrollment_complete`

**설명**: 파일 업로드 완료 후 컨텐츠 등록을 완료합니다. 임시 테이블의 데이터를 영구 테이블로 이동하고 영구 컨텐츠 ID를 발급합니다.

**요청 형식**:

```json
{
  "temp_id": 12345,                    // 임시 ID (enrollment_fileinfo에서 받은 값)
  "user_id": "testuser",               // 사용자 ID
  "files": [
    {
      "seq_no": 1,                     // 시퀀스 번호
      "default_hash": "abcdef123456",  // 기본 해시
      "webhard_hash": "xyz789",        // 웹하드 해시
      "sect_code": "01",               // 분류 코드
      "sect_sub": "",                  // 분류 코드 서브
      "adult_yn": "N",                 // 성인 자료 여부
      "copyright_yn": "N"              // 저작권 여부
    }
  ]
}
```

**응답 형식**:

```json
{
  "result": "success",
  "message": "컨텐츠 등록이 성공적으로 완료되었습니다",
  "data": {
    "cont_id": 67890,                  // 영구 컨텐츠 ID (T_CONTENTS.id)
    "files": [
      {
        "seq_id": 1,                   // 시퀀스 ID
        "file_name": "test.mp4",       // 파일 이름
        "hash_code": "abcdef123456",   // 해시 코드
        "webhard_hash": "xyz789",      // 웹하드 해시
        "status": "completed"          // 상태
      }
    ],
    "upload_server": "wedisk-ftpupload.dadamcloud.com", // 업로드 서버
    "download_server": "wedisk-down.dadamcloud.com"     // 다운로드 서버
  }
}
```

**오류 응답**:

```json
{
  "result": "error",
  "message": "컨텐츠 등록 완료 중 오류가 발생했습니다",
  "error_code": "ERR_INVALID_TEMP_ID",
  "details": "유효하지 않은 임시 ID입니다"
}
```

## 데이터 타입 정의

### 1. 디스크 타입 (disk_type)
- 1: MYDISK (내 디스크)
- 2: WEDISK (위디스크)

### 2. 파일 타입 (file_type)
- 1: FT_FILE (파일)
- 2: FT_FOLDER (폴더)

### 3. 저작권 여부 (copyright_yn)
- "Y": 저작권 있음
- "N": 저작권 없음
- "C": 회사 저작권

### 4. 성인 컨텐츠 여부 (adult_yn)
- "Y": 성인 컨텐츠
- "N": 일반 컨텐츠

### 5. 폴더 여부 (folder_yn)
- "Y": 폴더
- "N": 파일

### 6. 파일 구분 (file_gubun)
- 0: 음악/동영상 아님
- 1: 음악 파일
- 2: 동영상 파일
- 8: 북파일

### 7. 비디오 상태 (video_status)
- "00": 무료
- "01": 유료
- "02": 차단
- "03": Non-License
- "04": Unknown

### 8. 비디오 등급 (video_grade)
- "12": 12세 이상
- "15": 15세 이상
- "18": 18세 이상
- "1": 전체관람가
- "0": 등급 미정

## 오류 코드

| 오류 코드 | 설명 |
|----------|------|
| ERR_INVALID_PARAM | 필수 파라미터가 누락되었거나 유효하지 않은 파라미터가 전달되었습니다 |
| ERR_INVALID_TEMP_ID | 유효하지 않은 임시 ID입니다 |
| ERR_INVALID_USER | 유효하지 않은 사용자입니다 |
| ERR_UPLOAD_LIMIT | 업로드 용량 제한을 초과했습니다 |
| ERR_COPYRIGHT | 저작권 문제로 업로드가 불가능합니다 |
| ERR_SERVER_ERROR | 서버 내부 오류가 발생했습니다 |
| ERR_DB_ERROR | 데이터베이스 오류가 발생했습니다 |
| ERR_FILE_NOT_FOUND | 파일을 찾을 수 없습니다 |

## 업로드 프로세스 흐름

1. 클라이언트가 `enrollment_fileinfo` API를 호출하여 파일 정보를 등록합니다.
2. 서버는 임시 ID를 발급하고 T_CONTENTS_TEMP 테이블에 데이터를 저장합니다.
3. 클라이언트가 발급받은 임시 ID를 사용하여 실제 파일을 FTP 서버에 업로드합니다.
4. 클라이언트가 `enrollment_filtering` API를 호출하여 필터링 정보를 등록합니다.
5. 서버는 저작권 및 회사 정보를 처리하고 필터링 결과를 저장합니다.
6. 클라이언트가 `enrollment_complete` API를 호출하여 업로드 완료를 알립니다.
7. 서버는 임시 테이블의 데이터를 영구 테이블로 이동하고 영구 컨텐츠 ID를 발급합니다.
8. 서버는 영구 컨텐츠 ID와 함께 업로드 완료 응답을 반환합니다.

### 4. 웹하드 해시 등록 API (hashin)

**엔드포인트**: `POST /upload/hashin`

**설명**: 웹하드 해시 정보를 T_CONT_DADAM_FILE_MAP 테이블에 저장합니다. 컨텐츠 ID와 파일명을 기반으로 시퀀스 ID를 조회하여 웹하드 해시 정보를 저장합니다.

**요청 형식**:

```json
{
  "info": [
    {
      "cont_id": 67890,                  // 컨텐츠 ID (T_CONTENTS.id)
      "filename": "test.mp4",            // 파일 이름
      "webhard_hash": "xyz789",          // 웹하드 해시
      "cloud_yn": "y",                   // 클라우드 여부 (y/n)
      "category_code": "01"              // 분류 코드 (선택 사항)
    }
  ]
}
```

**응답 형식**:

```json
{
  "result": "success",
  "message": "모든 웹하드 해시 정보가 저장되었습니다",
  "files": [
    {
      "cont_id": 67890,
      "seq_id": 1,
      "filename": "test.mp4",
      "webhard_hash": "xyz789"
    }
  ]
}
```

**오류 응답**:

```json
{
  "result": "error",
  "message": "필수 파라미터가 누락되었습니다: cont_id, filename, webhard_hash"
}
```

## 기존 API와의 차이점

1. 기존 API는 구조체 기반의 데이터 전송 방식을 사용했으나, 새로운 API는 JSON 기반의 데이터 전송 방식을 사용합니다.
2. 기존 API는 `start_process`, `end_process`, `hashin` 세 개의 엔드포인트로 나뉘어 있었으나, 새로운 API는 `enrollment_fileinfo`, `enrollment_filtering`, `enrollment_complete` 세 개의 엔드포인트로 재구성되었습니다.
3. 기존 `upload/policy` 엔드포인트는 유지되며, 사용자의 업로드 권한 정책을 관리하는 데 계속 사용됩니다.
4. 기존 `upload/hashin` 엔드포인트도 유지되며, 웹하드 해시 정보를 T_CONT_DADAM_FILE_MAP 테이블에 저장하는 데 사용됩니다.
5. 새로운 API는 `webhard_hash` 필드가 추가되었습니다.
6. 새로운 API는 배열 형태의 데이터 처리를 지원하여 여러 파일을 동시에 처리할 수 있습니다.
7. 새로운 API는 보다 명확한 오류 코드와 메시지를 제공합니다.
