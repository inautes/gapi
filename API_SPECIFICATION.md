# GAPI 업로드 API 상세 명세서

## 목차
1. [개요](#개요)
2. [공통 사항](#공통-사항)
   - [기본 URL](#기본-url)
   - [인증](#인증)
   - [응답 형식](#응답-형식)
   - [에러 코드](#에러-코드)
3. [API 엔드포인트](#api-엔드포인트)
   - [업로드 정책 조회](#업로드-정책-조회)
   - [업로드 서버 주소 조회](#업로드-서버-주소-조회)
   - [업로드 프로세스 시작](#업로드-프로세스-시작)
   - [업로드 프로세스 종료](#업로드-프로세스-종료)
   - [해시 등록](#해시-등록)
4. [데이터 타입](#데이터-타입)
5. [예제](#예제)

## 개요

이 문서는 GAPI의 업로드 관련 API 엔드포인트에 대한 상세 명세를 제공합니다. 각 API의 요청 및 응답 형식, 파라미터, 에러 처리 방법 등을 포함합니다.

## 공통 사항

### 기본 URL

모든 API 요청은 다음 기본 URL에서 시작합니다:

```
https://api.example.com/v1
```

### 인증

API 요청에는 HTTP 헤더에 API 키를 포함해야 합니다:

```
Authorization: Bearer YOUR_API_KEY
```

### 응답 형식

모든 API 응답은 JSON 형식으로 반환됩니다. 성공 응답의 기본 구조는 다음과 같습니다:

```json
{
  "result": "success",
  "message": "작업이 성공적으로 완료되었습니다",
  "data": {
    // 응답 데이터
  }
}
```

### 에러 코드

에러 발생 시 응답 구조는 다음과 같습니다:

```json
{
  "result": "error",
  "error_code": "ERROR_CODE",
  "message": "에러 메시지"
}
```

| 에러 코드 | HTTP 상태 코드 | 설명 |
|-----------|---------------|------|
| INVALID_PARAMETER | 400 | 필수 파라미터가 누락되었거나 유효하지 않은 값이 전달됨 |
| UNAUTHORIZED | 401 | 인증 실패 |
| FORBIDDEN | 403 | 권한 없음 |
| NOT_FOUND | 404 | 요청한 리소스를 찾을 수 없음 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |
| DB_ERROR | 500 | 데이터베이스 오류 |
| DUPLICATE_ENTRY | 409 | 중복된 데이터 |
| INVALID_FILE | 400 | 유효하지 않은 파일 |
| QUOTA_EXCEEDED | 403 | 할당량 초과 |
| FILE_SIZE_EXCEEDED | 400 | 파일 크기 초과 |
| INVALID_CATEGORY | 400 | 유효하지 않은 카테고리 |
| INVALID_USER | 400 | 유효하지 않은 사용자 |
| INVALID_TEMP_ID | 400 | 유효하지 않은 임시 ID |
| UPLOAD_FAILED | 500 | 업로드 실패 |

## API 엔드포인트

### 업로드 정책 조회

**엔드포인트**: `POST /upload/policy`

**설명**: 사용자가 업로드할 수 있는 카테고리 코드 목록을 반환합니다.

**요청 파라미터**:

```json
{
  "userid": "string" // 필수: 사용자 ID
}
```

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| userid | string | 예 | 사용자 ID | "testuser" |

**응답**:

```json
{
  "result": "success",
  "message": "업로드 정책 조회 성공",
  "data": {
    "upload_policy": ["001", "002", "003"]
  }
}
```

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| upload_policy | array | 업로드 가능한 카테고리 코드 목록 | ["001", "002", "003"] |

**에러 응답**:

```json
{
  "result": "error",
  "error_code": "INVALID_USER",
  "message": "사용자를 찾을 수 없습니다"
}
```

### 업로드 서버 주소 조회

**엔드포인트**: `GET /upload/address`

**설명**: 파일 업로드 및 다운로드에 사용할 서버 주소를 반환합니다.

**요청 파라미터**: 없음

**응답**:

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

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| ftp_upload_server | string | FTP 업로드 서버 주소 | "wedisk-ftpupload.dadamcloud.com" |
| download_server | string | 다운로드 서버 주소 | "https://wedisk-down.dadamcloud.com/fdown.php" |

### 업로드 프로세스 시작

**엔드포인트**: `POST /upload/start_process`

**설명**: 파일 업로드 전 필요한 처리를 수행하고 임시 ID를 발급합니다.

**요청 파라미터**:

```json
{
  "user_id": "string",           // 필수: 사용자 ID
  "file_name": "string",         // 필수: 파일명
  "file_size": number,           // 필수: 파일 크기(바이트)
  "sect_code": "string",         // 필수: 섹션 코드
  "sect_sub": "string",          // 선택: 서브 섹션 코드
  "title": "string",             // 필수: 컨텐츠 제목
  "descript": "string",          // 선택: 컨텐츠 설명
  "default_hash": "string",      // 필수: 기본 해시값
  "audio_hash": "string",        // 선택: 오디오 해시값
  "video_hash": "string",        // 선택: 비디오 해시값
  "copyright_yn": "string",      // 선택: 저작권 여부(Y/N)
  "adult_yn": "string",          // 선택: 성인 컨텐츠 여부(Y/N)
  "mobservice_yn": "string",     // 선택: 모바일 서비스 여부(Y/N)
  "folder_yn": "string",         // 선택: 폴더 여부(Y/N)
  "cloud_yn": "string",          // 선택: 클라우드 여부(Y/N)
  "company_code": "string",      // 선택: 회사 코드
  "version_data": "string",      // 선택: 버전 데이터
  "client_ip": "string",         // 선택: 클라이언트 IP
  "client_port": number          // 선택: 클라이언트 포트
}
```

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| user_id | string | 예 | 사용자 ID | "testuser" |
| file_name | string | 예 | 파일명 | "test.mp4" |
| file_size | number | 예 | 파일 크기(바이트) | 1024000 |
| sect_code | string | 예 | 섹션 코드 | "01" |
| sect_sub | string | 아니오 | 서브 섹션 코드 | "01-01" |
| title | string | 예 | 컨텐츠 제목 | "테스트 비디오" |
| descript | string | 아니오 | 컨텐츠 설명 | "테스트 설명" |
| default_hash | string | 예 | 기본 해시값 | "abcdef123456" |
| audio_hash | string | 아니오 | 오디오 해시값 | "abcdef123456" |
| video_hash | string | 아니오 | 비디오 해시값 | "abcdef123456" |
| copyright_yn | string | 아니오 | 저작권 여부(Y/N) | "N" |
| adult_yn | string | 아니오 | 성인 컨텐츠 여부(Y/N) | "N" |
| mobservice_yn | string | 아니오 | 모바일 서비스 여부(Y/N) | "Y" |
| folder_yn | string | 아니오 | 폴더 여부(Y/N) | "N" |
| cloud_yn | string | 아니오 | 클라우드 여부(Y/N) | "N" |
| company_code | string | 아니오 | 회사 코드 | "WEDISK" |
| version_data | string | 아니오 | 버전 데이터 | "1.0.0" |
| client_ip | string | 아니오 | 클라이언트 IP | "192.168.1.1" |
| client_port | number | 아니오 | 클라이언트 포트 | 8080 |

**응답**:

```json
{
  "result": "success",
  "message": "업로드 프로세스가 시작되었습니다",
  "data": {
    "temp_id": 1234567890,
    "seq_no": 1,
    "metadata": {
      "user_id": "testuser",
      "file_name": "test.mp4",
      "file_size": 1024000,
      "sect_code": "01",
      "sect_sub": "01-01",
      "title": "테스트 비디오",
      "descript": "테스트 설명",
      "reg_date": "20250423",
      "reg_time": "070000",
      "default_hash": "abcdef123456",
      "audio_hash": "abcdef123456",
      "video_hash": "abcdef123456",
      "copyright_yn": "N",
      "adult_yn": "N",
      "mobservice_yn": "Y",
      "folder_yn": "N",
      "cloud_yn": "N",
      "company_code": "WEDISK",
      "version_data": "1.0.0"
    }
  }
}
```

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| temp_id | number | 임시 ID | 1234567890 |
| seq_no | number | 시퀀스 번호 | 1 |
| metadata | object | 메타데이터 | (객체) |

**에러 응답**:

```json
{
  "result": "error",
  "error_code": "INVALID_PARAMETER",
  "message": "필수 파라미터가 누락되었습니다: file_name"
}
```

### 업로드 프로세스 종료

**엔드포인트**: `POST /upload/end_process`

**설명**: 파일 업로드 후 필요한 처리를 수행하고 영구 ID를 발급합니다.

**요청 파라미터**:

```json
{
  "temp_id": number,             // 필수: 임시 ID
  "user_id": "string",           // 필수: 사용자 ID
  "sect_code": "string",         // 필수: 섹션 코드
  "sect_sub": "string",          // 선택: 서브 섹션 코드
  "adult_yn": "string",          // 선택: 성인 컨텐츠 여부(Y/N)
  "copyright_yn": "string",      // 선택: 저작권 여부(Y/N)
  "mobservice_yn": "string",     // 선택: 모바일 서비스 여부(Y/N)
  "folder_yn": "string",         // 선택: 폴더 여부(Y/N)
  "cloud_yn": "string",          // 선택: 클라우드 여부(Y/N)
  "company_code": "string",      // 선택: 회사 코드
  "mureka_filter_yn": "string",  // 선택: 무레카 필터 여부(Y/N)
  "mureka_filter_type": "string",// 선택: 무레카 필터 타입
  "mureka_filter_data": "string",// 선택: 무레카 필터 데이터
  "event_cp_yn": "string",       // 선택: 이벤트 CP 여부(Y/N)
  "event_cp_data": "string"      // 선택: 이벤트 CP 데이터
}
```

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| temp_id | number | 예 | 임시 ID | 1234567890 |
| user_id | string | 예 | 사용자 ID | "testuser" |
| sect_code | string | 예 | 섹션 코드 | "01" |
| sect_sub | string | 아니오 | 서브 섹션 코드 | "01-01" |
| adult_yn | string | 아니오 | 성인 컨텐츠 여부(Y/N) | "N" |
| copyright_yn | string | 아니오 | 저작권 여부(Y/N) | "N" |
| mobservice_yn | string | 아니오 | 모바일 서비스 여부(Y/N) | "Y" |
| folder_yn | string | 아니오 | 폴더 여부(Y/N) | "N" |
| cloud_yn | string | 아니오 | 클라우드 여부(Y/N) | "N" |
| company_code | string | 아니오 | 회사 코드 | "WEDISK" |
| mureka_filter_yn | string | 아니오 | 무레카 필터 여부(Y/N) | "N" |
| mureka_filter_type | string | 아니오 | 무레카 필터 타입 | "0" |
| mureka_filter_data | string | 아니오 | 무레카 필터 데이터 | "" |
| event_cp_yn | string | 아니오 | 이벤트 CP 여부(Y/N) | "N" |
| event_cp_data | string | 아니오 | 이벤트 CP 데이터 | "" |

**응답**:

```json
{
  "result": "success",
  "message": "업로드 프로세스가 완료되었습니다",
  "data": {
    "cont_id": 9876543210,
    "metadata": {
      "user_id": "testuser",
      "sect_code": "01",
      "sect_sub": "01-01",
      "adult_yn": "N",
      "copyright_yn": "N",
      "mobservice_yn": "Y",
      "folder_yn": "N",
      "cloud_yn": "N",
      "company_code": "WEDISK",
      "mureka_filter_yn": "N",
      "mureka_filter_type": "0",
      "mureka_filter_data": "",
      "event_cp_yn": "N",
      "event_cp_data": "",
      "reg_date": "20250423",
      "reg_time": "070000"
    }
  }
}
```

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| cont_id | number | 컨텐츠 ID | 9876543210 |
| metadata | object | 메타데이터 | (객체) |

**에러 응답**:

```json
{
  "result": "error",
  "error_code": "INVALID_TEMP_ID",
  "message": "유효하지 않은 임시 ID입니다"
}
```

### 해시 등록

**엔드포인트**: `POST /upload/hashin`

**설명**: 파일 해시 정보를 데이터베이스에 등록합니다.

**요청 파라미터**:

```json
{
  "info": {
    "cont_id": "string",         // 필수: 컨텐츠 ID
    "seq_id": "string",          // 필수: 시퀀스 ID
    "hash": "string",            // 필수: 파일 해시값
    "cloud_yn": "string",        // 선택: 클라우드 여부(y/n)
    "category_code": "string",   // 필수: 카테고리 코드
    "company_code": "string"     // 필수: 회사 코드
  }
}
```

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| info.cont_id | string | 예 | 컨텐츠 ID | "9876543210" |
| info.seq_id | string | 예 | 시퀀스 ID | "1" |
| info.hash | string | 예 | 파일 해시값 | "abcdef123456" |
| info.cloud_yn | string | 아니오 | 클라우드 여부(y/n) | "y" |
| info.category_code | string | 예 | 카테고리 코드 | "001" |
| info.company_code | string | 예 | 회사 코드 | "WEDISK" |

**응답**:

```json
{
  "result": "success",
  "message": "All inserted",
  "data": {
    "file_id": 12345
  }
}
```

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| file_id | number | 파일 ID | 12345 |

**에러 응답**:

```json
{
  "result": "error",
  "error_code": "INVALID_PARAMETER",
  "message": "필수 파라미터가 누락되었습니다: hash"
}
```

## 데이터 타입

### 저작권 여부 (copyright_yn)

| 값 | 설명 |
|----|------|
| Y | 저작권 있음 |
| N | 저작권 없음 |

### 성인 컨텐츠 여부 (adult_yn)

| 값 | 설명 |
|----|------|
| Y | 성인 컨텐츠 |
| N | 일반 컨텐츠 |

### 모바일 서비스 여부 (mobservice_yn)

| 값 | 설명 |
|----|------|
| Y | 모바일 서비스 제공 |
| N | 모바일 서비스 미제공 |

### 폴더 여부 (folder_yn)

| 값 | 설명 |
|----|------|
| Y | 폴더 |
| N | 파일 |

### 클라우드 여부 (cloud_yn)

| 값 | 설명 |
|----|------|
| Y | 클라우드 저장소 사용 |
| N | 일반 저장소 사용 |

### 섹션 코드 (sect_code)

| 코드 | 설명 |
|------|------|
| 00 | 기존 서버 |
| 01 | 영화 |
| 02 | 드라마 |
| 03 | 예능 |
| 04 | 다큐 |
| 05 | 애니 |
| 06 | 스포츠 |
| 07 | 음악 |
| 08 | 교육 |
| 09 | 성인 |
| 10 | 다담 서버 |

### 회사 코드 (company_code)

| 코드 | 설명 | 클라우드 여부 |
|------|------|--------------|
| WEDISK | 위디스크 | N |
| DADAM | 다담 | Y |

## 예제

### 업로드 정책 조회 예제

**요청**:

```http
POST /upload/policy HTTP/1.1
Host: api.example.com
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "userid": "testuser"
}
```

**응답**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "message": "업로드 정책 조회 성공",
  "data": {
    "upload_policy": ["001", "002", "003"]
  }
}
```

### 업로드 서버 주소 조회 예제

**요청**:

```http
GET /upload/address HTTP/1.1
Host: api.example.com
Authorization: Bearer YOUR_API_KEY
```

**응답**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "message": "업로드 서버 주소 조회 성공",
  "data": {
    "ftp_upload_server": "wedisk-ftpupload.dadamcloud.com",
    "download_server": "https://wedisk-down.dadamcloud.com/fdown.php"
  }
}
```

### 업로드 프로세스 시작 예제

**요청**:

```http
POST /upload/start_process HTTP/1.1
Host: api.example.com
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "user_id": "testuser",
  "file_name": "test.mp4",
  "file_size": 1024000,
  "sect_code": "01",
  "sect_sub": "01-01",
  "title": "테스트 비디오",
  "descript": "테스트 설명",
  "default_hash": "abcdef123456",
  "audio_hash": "",
  "video_hash": "",
  "copyright_yn": "N",
  "adult_yn": "N"
}
```

**응답**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "message": "업로드 프로세스가 시작되었습니다",
  "data": {
    "temp_id": 1234567890,
    "seq_no": 1,
    "metadata": {
      "user_id": "testuser",
      "file_name": "test.mp4",
      "file_size": 1024000,
      "sect_code": "01",
      "sect_sub": "01-01",
      "title": "테스트 비디오",
      "descript": "테스트 설명",
      "reg_date": "20250423",
      "reg_time": "070000",
      "default_hash": "abcdef123456",
      "audio_hash": "",
      "video_hash": "",
      "copyright_yn": "N",
      "adult_yn": "N"
    }
  }
}
```

### 업로드 프로세스 종료 예제

**요청**:

```http
POST /upload/end_process HTTP/1.1
Host: api.example.com
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "temp_id": 1234567890,
  "user_id": "testuser",
  "sect_code": "01",
  "sect_sub": "01-01",
  "adult_yn": "N",
  "copyright_yn": "N",
  "mobservice_yn": "Y"
}
```

**응답**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "message": "업로드 프로세스가 완료되었습니다",
  "data": {
    "cont_id": 9876543210,
    "metadata": {
      "user_id": "testuser",
      "sect_code": "01",
      "sect_sub": "01-01",
      "adult_yn": "N",
      "copyright_yn": "N",
      "mobservice_yn": "Y",
      "reg_date": "20250423",
      "reg_time": "070000"
    }
  }
}
```

### 해시 등록 예제

**요청**:

```http
POST /upload/hashin HTTP/1.1
Host: api.example.com
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "info": {
    "cont_id": "9876543210",
    "seq_id": "1",
    "hash": "abcdef123456",
    "cloud_yn": "y",
    "category_code": "001",
    "company_code": "WEDISK"
  }
}
```

**응답**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "message": "All inserted",
  "data": {
    "file_id": 12345
  }
}
```
