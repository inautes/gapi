# GAPI 다운로드 API 명세서

## 목차

1. [개요](#개요)
2. [API 엔드포인트](#api-엔드포인트)
   - [다운로드 해시 조회](#1-다운로드-해시-조회-기존)
   - [다운로드 서버 주소 조회](#2-다운로드-서버-주소-조회-신규)
   - [다운로드 정보 조회](#3-다운로드-정보-조회-신규)
   - [다운로드 통계 업데이트](#4-다운로드-통계-업데이트-신규)
3. [데이터 타입 정의](#데이터-타입-정의)
4. [에러 코드](#에러-코드)
5. [예제](#예제)

## 개요

GAPI 다운로드 API는 파일 다운로드에 필요한 정보를 제공하고 다운로드 통계를 관리하는 기능을 제공합니다. 이 API는 C_Source 레포지토리의 다운로드 프로세스를 기반으로 구현되었습니다.

## API 엔드포인트

### 1. 다운로드 해시 조회 (기존)

**엔드포인트**: `POST /download/gethash`

**설명**: 파일 다운로드에 필요한 해시 정보를 조회합니다.

**요청 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| filename | String | 조건부 | 파일명 (cont_no가 없을 경우 필수) | "example.mp4" |
| cont_no | Number | 조건부 | 컨텐츠 ID (filename이 없을 경우 필수) | 1234567890 |
| seq_no | Number | 아니오 | 시퀀스 ID (여러 파일이 있는 경우) | 1 |

**요청 예시**:
```json
{
  "cont_no": 1234567890,
  "seq_no": 1
}
```

**응답 파라미터**:

| 파라미터 | 타입 | 설명 | 예시 |
|----------|------|------|------|
| result | String | 요청 처리 결과 | "success" |
| hash_code | String | 파일 해시 코드 | "a1b2c3d4e5f6g7h8i9j0" |
| upload_server_domain | String | 업로드 서버 도메인 | "gapi.wedisk.co.kr" |
| company_code | String | 회사 코드 | "WEDISK" |

**응답 예시**:
```json
{
  "result": "success",
  "hash_code": "a1b2c3d4e5f6g7h8i9j0",
  "upload_server_domain": "gapi.wedisk.co.kr",
  "company_code": "WEDISK"
}
```

**에러 응답**:
```json
{
  "result": "error",
  "message": "Internal server error"
}
```

### 2. 다운로드 서버 주소 조회 (신규)

**엔드포인트**: `GET /download/address`

**설명**: 다운로드에 사용할 서버 주소를 조회합니다.

**요청 파라미터**: 없음

**응답 파라미터**:

| 파라미터 | 타입 | 설명 | 예시 |
|----------|------|------|------|
| result | String | 요청 처리 결과 | "success" |
| download_server | String | 다운로드 서버 주소 | "wedisk-down.dadamcloud.com" |
| download_port | Number | 다운로드 서버 포트 | 8080 |

**응답 예시**:
```json
{
  "result": "success",
  "download_server": "wedisk-down.dadamcloud.com",
  "download_port": 8080
}
```

**에러 응답**:
```json
{
  "result": "error",
  "message": "서버 주소 조회 실패"
}
```

### 3. 다운로드 정보 조회 (신규)

**엔드포인트**: `POST /download/info`

**설명**: 파일 다운로드에 필요한 상세 정보를 조회합니다.

**요청 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| cont_id | Number | 예 | 컨텐츠 ID | 1234567890 |
| seq_id | Number | 아니오 | 시퀀스 ID | 1 |
| user_id | String | 예 | 사용자 ID | "testuser" |
| client_ip | String | 아니오 | 클라이언트 IP 주소 | "192.168.1.1" |
| client_port | Number | 아니오 | 클라이언트 포트 | 12345 |

**요청 예시**:
```json
{
  "cont_id": 1234567890,
  "seq_id": 1,
  "user_id": "testuser",
  "client_ip": "192.168.1.1",
  "client_port": 12345
}
```

**응답 파라미터**:

| 파라미터 | 타입 | 설명 | 예시 |
|----------|------|------|------|
| result | String | 요청 처리 결과 | "success" |
| file_info | Object | 파일 정보 객체 | 아래 참조 |

**file_info 객체**:

| 파라미터 | 타입 | 설명 | 예시 |
|----------|------|------|------|
| cont_id | Number | 컨텐츠 ID | 1234567890 |
| seq_id | Number | 시퀀스 ID | 1 |
| file_name | String | 파일명 | "example.mp4" |
| file_size | Number | 파일 크기 (바이트) | 1024000 |
| hash_code | String | 파일 해시 코드 | "a1b2c3d4e5f6g7h8i9j0" |
| upload_server_domain | String | 업로드 서버 도메인 | "gapi.wedisk.co.kr" |
| company_code | String | 회사 코드 | "WEDISK" |
| sect_code | String | 섹션 코드 | "01" |
| sect_sub | String | 서브 섹션 코드 | "" |
| reg_date | String | 등록 일자 | "20250423" |
| reg_time | String | 등록 시간 | "070000" |
| download_count | Number | 다운로드 횟수 | 5 |
| last_download_date | String | 마지막 다운로드 일자 | "20250425" |

**응답 예시**:
```json
{
  "result": "success",
  "file_info": {
    "cont_id": 1234567890,
    "seq_id": 1,
    "file_name": "example.mp4",
    "file_size": 1024000,
    "hash_code": "a1b2c3d4e5f6g7h8i9j0",
    "upload_server_domain": "gapi.wedisk.co.kr",
    "company_code": "WEDISK",
    "sect_code": "01",
    "sect_sub": "",
    "reg_date": "20250423",
    "reg_time": "070000",
    "download_count": 5,
    "last_download_date": "20250425"
  }
}
```

**에러 응답**:
```json
{
  "result": "error",
  "message": "파일 정보를 찾을 수 없습니다"
}
```

### 4. 다운로드 통계 업데이트 (신규)

**엔드포인트**: `POST /download/update_stats`

**설명**: 파일 다운로드 통계를 업데이트합니다.

**요청 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| cont_id | Number | 예 | 컨텐츠 ID | 1234567890 |
| seq_id | Number | 아니오 | 시퀀스 ID | 1 |
| user_id | String | 예 | 사용자 ID | "testuser" |
| server_id | String | 아니오 | 서버 ID | "server001" |
| download_size | Number | 아니오 | 다운로드 크기 (바이트) | 1024000 |
| download_status | String | 아니오 | 다운로드 상태 | "completed" |
| client_ip | String | 아니오 | 클라이언트 IP 주소 | "192.168.1.1" |
| client_port | Number | 아니오 | 클라이언트 포트 | 12345 |
| download_date | String | 아니오 | 다운로드 일자 (자동 생성) | "20250425" |
| download_time | String | 아니오 | 다운로드 시간 (자동 생성) | "070000" |

**요청 예시**:
```json
{
  "cont_id": 1234567890,
  "seq_id": 1,
  "user_id": "testuser",
  "server_id": "server001",
  "download_size": 1024000,
  "download_status": "completed",
  "client_ip": "192.168.1.1",
  "client_port": 12345
}
```

**응답 파라미터**:

| 파라미터 | 타입 | 설명 | 예시 |
|----------|------|------|------|
| result | String | 요청 처리 결과 | "success" |
| message | String | 처리 결과 메시지 | "다운로드 통계가 업데이트되었습니다" |
| download_count | Number | 업데이트된 다운로드 횟수 | 6 |

**응답 예시**:
```json
{
  "result": "success",
  "message": "다운로드 통계가 업데이트되었습니다",
  "download_count": 6
}
```

**에러 응답**:
```json
{
  "result": "error",
  "message": "다운로드 통계 업데이트 실패"
}
```

## 데이터 타입 정의

### 다운로드 상태 (download_status)

| 값 | 설명 |
|------|------|
| "started" | 다운로드 시작됨 |
| "completed" | 다운로드 완료됨 |
| "failed" | 다운로드 실패 |
| "canceled" | 다운로드 취소됨 |

### 섹션 코드 (sect_code)

| 값 | 설명 |
|------|------|
| "00" | 기존서버 |
| "01" | 영화 |
| "02" | 드라마 |
| "03" | 예능 |
| "04" | 다큐 |
| "05" | 스포츠 |
| "06" | 음악 |
| "07" | 애니 |
| "08" | 교육 |
| "09" | 성인 |
| "10" | 다담서버 |

### 회사 코드 (company_code)

| 값 | 설명 |
|------|------|
| "WEDISK" | 위디스크 (기본값) |
| "DADAM" | 다담클라우드 |

## 에러 코드

| HTTP 상태 코드 | 설명 |
|----------------|------|
| 400 | 잘못된 요청 (필수 파라미터 누락 등) |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스를 찾을 수 없음 |
| 500 | 서버 내부 오류 |

## 예제

### 다운로드 해시 조회 예제

**요청**:
```
POST /download/gethash
Content-Type: application/json

{
  "cont_no": 1234567890,
  "seq_no": 1
}
```

**응답**:
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "hash_code": "a1b2c3d4e5f6g7h8i9j0",
  "upload_server_domain": "gapi.wedisk.co.kr",
  "company_code": "WEDISK"
}
```

### 다운로드 정보 조회 예제

**요청**:
```
POST /download/info
Content-Type: application/json

{
  "cont_id": 1234567890,
  "seq_id": 1,
  "user_id": "testuser"
}
```

**응답**:
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "success",
  "file_info": {
    "cont_id": 1234567890,
    "seq_id": 1,
    "file_name": "example.mp4",
    "file_size": 1024000,
    "hash_code": "a1b2c3d4e5f6g7h8i9j0",
    "upload_server_domain": "gapi.wedisk.co.kr",
    "company_code": "WEDISK",
    "sect_code": "01",
    "sect_sub": "",
    "reg_date": "20250423",
    "reg_time": "070000",
    "download_count": 5,
    "last_download_date": "20250425"
  }
}
```
