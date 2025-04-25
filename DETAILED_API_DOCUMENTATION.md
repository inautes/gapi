# GAPI 업로드 API 상세 명세서

이 문서는 C_Source 레포지토리의 업로드 프로세스를 분석하여 Node.js로 구현한 GAPI 업로드 API의 상세 명세서입니다. 모든 필요한 파라미터와 응답 형식을 포함합니다.

## 목차

1. [업로드 정책 조회 API](#1-업로드-정책-조회-api)
2. [업로드 서버 주소 조회 API](#2-업로드-서버-주소-조회-api)
3. [업로드 프로세스 시작 API](#3-업로드-프로세스-시작-api)
4. [업로드 프로세스 종료 API](#4-업로드-프로세스-종료-api)
5. [해시 등록 API](#5-해시-등록-api)
6. [에러 코드 및 처리](#6-에러-코드-및-처리)
7. [데이터 타입 정의](#7-데이터-타입-정의)

## 1. 업로드 정책 조회 API

### 엔드포인트

`POST /upload/policy`

### 설명

사용자가 업로드할 수 있는 카테고리 코드 목록을 반환합니다. 사용자 권한에 따라 업로드 가능한 카테고리가 결정됩니다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 여부 | 설명 | 예시 |
|---------|------|----------|------|------|
| userid | String | 필수 | 사용자 ID | "testuser" |

### 응답

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| result | String | 처리 결과 | "success" 또는 "error" |
| upload_policy | Array | 업로드 가능한 카테고리 코드 목록 | ["001", "002", "003"] |
| message | String | 오류 메시지 (오류 시에만 반환) | "사용자를 찾을 수 없습니다" |

### 응답 예시

```json
{
  "result": "success",
  "upload_policy": ["001", "002", "003", "004", "005"]
}
```

### 오류 응답 예시

```json
{
  "result": "error",
  "message": "사용자를 찾을 수 없습니다"
}
```

## 2. 업로드 서버 주소 조회 API

### 엔드포인트

`GET /upload/address`

### 설명

파일 업로드 및 다운로드에 사용할 서버 주소를 반환합니다. C_Source의 cmds1001.cc 모듈에서 처리하는 기능을 구현합니다.

### 요청 파라미터

없음

### 응답

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| result | String | 처리 결과 | "success" 또는 "error" |
| ftp_upload_server | String | FTP 업로드 서버 주소 | "wedisk-ftpupload.dadamcloud.com" |
| download_server | String | 다운로드 서버 주소 | "https://wedisk-down.dadamcloud.com/fdown.php" |
| message | String | 오류 메시지 (오류 시에만 반환) | "서버 주소를 조회할 수 없습니다" |

### 응답 예시

```json
{
  "result": "success",
  "ftp_upload_server": "wedisk-ftpupload.dadamcloud.com",
  "download_server": "https://wedisk-down.dadamcloud.com/fdown.php"
}
```

## 3. 업로드 프로세스 시작 API

### 엔드포인트

`POST /upload/start_process`

### 설명

파일 업로드 전 필요한 처리를 수행하고 임시 ID를 발급합니다. C_Source의 dcmd9001.cc 및 com9001.cc 모듈에서 처리하는 기능을 구현합니다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 여부 | 설명 | 예시 |
|---------|------|----------|------|------|
| user_id | String | 필수 | 사용자 ID | "testuser" |
| file_name | String | 필수 | 파일명 (확장자 포함) | "test_video.mp4" |
| file_size | Number | 필수 | 파일 크기 (바이트) | 1024000 |
| sect_code | String | 필수 | 섹션 코드 | "01" |
| sect_sub | String | 선택 | 서브 섹션 코드 | "01" |
| title | String | 필수 | 컨텐츠 제목 | "테스트 비디오" |
| descript | String | 선택 | 컨텐츠 설명 | "이것은 테스트 비디오입니다" |
| default_hash | String | 필수 | 파일 해시값 | "a1b2c3d4e5f6g7h8i9j0" |
| audio_hash | String | 선택 | 오디오 해시값 | "a1b2c3d4e5f6g7h8i9j0" |
| video_hash | String | 선택 | 비디오 해시값 | "a1b2c3d4e5f6g7h8i9j0" |
| copyright_yn | String | 필수 | 저작권 여부 (Y/N/C/P/B/X) | "N" |
| adult_yn | String | 필수 | 성인 컨텐츠 여부 (Y/N) | "N" |
| folder_yn | String | 선택 | 폴더 여부 (Y/N) | "N" |
| folder_path | String | 선택 | 폴더 경로 | "/videos/" |
| depth | Number | 선택 | 폴더 깊이 | 1 |
| file_type | String | 선택 | 파일 타입 | "video/mp4" |
| mureka_hash | String | 선택 | 무레카 해시값 | "a1b2c3d4e5f6g7h8i9j0" |
| file_gubun | String | 선택 | 파일 구분 | "01" |
| result_code | String | 선택 | 결과 코드 | "00" |
| video_status | String | 선택 | 비디오 상태 | "01" |
| video_id | String | 선택 | 비디오 ID | "VID12345" |
| video_title | String | 선택 | 비디오 제목 | "테스트 비디오" |
| video_jejak_year | String | 선택 | 비디오 제작 연도 | "2025" |
| video_right_name | String | 선택 | 비디오 권리자 이름 | "테스트 회사" |
| video_right_content_id | String | 선택 | 비디오 권리 컨텐츠 ID | "RC12345" |
| video_grade | String | 선택 | 비디오 등급 | "15" |
| video_price | String | 선택 | 비디오 가격 | "1000" |
| video_cha | String | 선택 | 비디오 채널 | "01" |
| video_osp_jibun | String | 선택 | 비디오 OSP 지분 | "100" |
| video_osp_etc | String | 선택 | 비디오 OSP 기타 | "기타 정보" |
| video_onair_date | String | 선택 | 비디오 방영 날짜 | "20250101" |
| video_right_id | String | 선택 | 비디오 권리 ID | "RID12345" |
| virus_type | String | 선택 | 바이러스 타입 | "00" |
| virus_name | String | 선택 | 바이러스 이름 | "없음" |
| chi_id | Number | 선택 | CHI ID | 12345 |
| price_amt | Number | 선택 | 가격 | 1000 |
| mob_price_amt | Number | 선택 | 모바일 가격 | 800 |
| comp_cd | String | 선택 | 회사 코드 | "01" |

### 응답

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| result | String | 처리 결과 | "success" 또는 "error" |
| temp_id | Number | 임시 ID | 1234567890 |
| seq_no | Number | 시퀀스 번호 | 1 |
| message | String | 처리 메시지 | "업로드 프로세스가 시작되었습니다" |
| metadata | Object | 저장된 메타데이터 | 아래 예시 참조 |
| error_code | Number | 오류 코드 (오류 시에만 반환) | -400111 |
| error_message | String | 오류 메시지 (오류 시에만 반환) | "사용자 권한이 없습니다" |

### 응답 예시

```json
{
  "result": "success",
  "temp_id": 1234567890,
  "seq_no": 1,
  "message": "업로드 프로세스가 시작되었습니다",
  "metadata": {
    "user_id": "testuser",
    "file_name": "test_video.mp4",
    "file_size": 1024000,
    "sect_code": "01",
    "sect_sub": "01",
    "title": "테스트 비디오",
    "descript": "이것은 테스트 비디오입니다",
    "reg_date": "20250423",
    "reg_time": "070000",
    "default_hash": "a1b2c3d4e5f6g7h8i9j0",
    "audio_hash": "a1b2c3d4e5f6g7h8i9j0",
    "video_hash": "a1b2c3d4e5f6g7h8i9j0",
    "copyright_yn": "N",
    "adult_yn": "N",
    "folder_yn": "N",
    "folder_path": "/videos/",
    "depth": 1,
    "file_type": "video/mp4"
  }
}
```

### 오류 응답 예시

```json
{
  "result": "error",
  "error_code": -400111,
  "error_message": "사용자 권한이 없습니다"
}
```

## 4. 업로드 프로세스 종료 API

### 엔드포인트

`POST /upload/end_process`

### 설명

파일 업로드 후 필요한 처리를 수행하고 영구 ID를 발급합니다. C_Source의 dcmd9105.cc, com9105.cc 및 dcmdfups4001.cc 모듈에서 처리하는 기능을 구현합니다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 여부 | 설명 | 예시 |
|---------|------|----------|------|------|
| temp_id | Number | 필수 | 임시 ID | 1234567890 |
| user_id | String | 필수 | 사용자 ID | "testuser" |
| sect_code | String | 필수 | 섹션 코드 | "01" |
| sect_sub | String | 선택 | 서브 섹션 코드 | "01" |
| adult_yn | String | 필수 | 성인 컨텐츠 여부 (Y/N) | "N" |
| copyright_yn | String | 필수 | 저작권 여부 (Y/N/C/P/B/X) | "N" |
| mobservice_yn | String | 필수 | 모바일 서비스 여부 (Y/N) | "Y" |
| mobile_chk | String | 선택 | 모바일 체크 | "Y" |
| limit_yn | String | 선택 | 제한 여부 | "N" |
| event_yn | String | 선택 | 이벤트 여부 | "N" |
| event_id | Number | 선택 | 이벤트 ID | 12345 |
| cp_id | String | 선택 | CP ID | "CP12345" |
| cp_name | String | 선택 | CP 이름 | "테스트 CP" |
| cp_type | String | 선택 | CP 타입 | "01" |
| cp_rate | Number | 선택 | CP 비율 | 70 |
| cp_price | Number | 선택 | CP 가격 | 1000 |
| cp_mob_price | Number | 선택 | CP 모바일 가격 | 800 |
| cp_auth | String | 선택 | CP 권한 | "01" |
| cp_auth_date | String | 선택 | CP 권한 날짜 | "20250101" |
| cp_auth_time | String | 선택 | CP 권한 시간 | "120000" |
| cp_auth_user | String | 선택 | CP 권한 사용자 | "admin" |
| comp_cd | String | 선택 | 회사 코드 | "01" |

### 응답

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| result | String | 처리 결과 | "success" 또는 "error" |
| cont_id | Number | 컨텐츠 ID | 9876543210 |
| message | String | 처리 메시지 | "업로드 프로세스가 완료되었습니다" |
| metadata | Object | 저장된 메타데이터 | 아래 예시 참조 |
| error_code | Number | 오류 코드 (오류 시에만 반환) | -400122 |
| error_message | String | 오류 메시지 (오류 시에만 반환) | "임시 ID가 유효하지 않습니다" |

### 응답 예시

```json
{
  "result": "success",
  "cont_id": 9876543210,
  "message": "업로드 프로세스가 완료되었습니다",
  "metadata": {
    "user_id": "testuser",
    "sect_code": "01",
    "sect_sub": "01",
    "adult_yn": "N",
    "copyright_yn": "N",
    "mobservice_yn": "Y",
    "mobile_chk": "Y",
    "reg_date": "20250423",
    "reg_time": "070000"
  }
}
```

### 오류 응답 예시

```json
{
  "result": "error",
  "error_code": -400122,
  "error_message": "임시 ID가 유효하지 않습니다"
}
```

## 5. 해시 등록 API

### 엔드포인트

`POST /upload/hashin`

### 설명

파일 해시 정보를 데이터베이스에 등록합니다. 이 API는 기존 GAPI에 구현되어 있으며, 파일 다운로드 시 필요한 정보를 저장합니다.

### 요청 파라미터

| 파라미터 | 타입 | 필수 여부 | 설명 | 예시 |
|---------|------|----------|------|------|
| info.cont_id | Number/String | 필수 | 컨텐츠 ID | 9876543210 |
| info.seq_id | Number/String | 필수 | 시퀀스 ID | 1 |
| info.hash | String | 필수 | 파일 해시값 | "a1b2c3d4e5f6g7h8i9j0" |
| info.cloud_yn | String | 필수 | 클라우드 여부 (y/n) | "y" |
| info.category_code | String | 필수 | 카테고리 코드 | "01" |
| info.company_code | String | 필수 | 회사 코드 | "WEDISK" |

### 응답

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| result | String | 처리 결과 | "success" 또는 "error" |
| message | String | 처리 메시지 | "All inserted" |
| error_message | String | 오류 메시지 (오류 시에만 반환) | "필수 파라미터가 누락되었습니다" |

### 응답 예시

```json
{
  "result": "success",
  "message": "All inserted"
}
```

### 오류 응답 예시

```json
{
  "result": "error",
  "error_message": "필수 파라미터가 누락되었습니다"
}
```

## 6. 에러 코드 및 처리

C_Source의 에러 코드를 기반으로 한 에러 처리 방식입니다.

| 에러 코드 | 설명 | HTTP 상태 코드 |
|----------|------|--------------|
| -400111 | 사용자 권한이 없습니다 | 403 |
| -400112 | 사용자를 찾을 수 없습니다 | 404 |
| -400113 | 카테고리를 찾을 수 없습니다 | 404 |
| -400114 | 필수 파라미터가 누락되었습니다 | 400 |
| -400121 | 임시 ID가 유효하지 않습니다 | 404 |
| -400122 | 데이터베이스 오류가 발생했습니다 | 500 |
| -400131 | 저작권 검증에 실패했습니다 | 403 |
| -400132 | 성인 컨텐츠 검증에 실패했습니다 | 403 |
| -400133 | 모바일 서비스 검증에 실패했습니다 | 403 |
| -400134 | 중복된 파일이 존재합니다 | 409 |
| -400192 | 트랜잭션 시작 오류 | 500 |
| -400193 | 트랜잭션 커밋 오류 | 500 |

## 7. 데이터 타입 정의

### 저작권 여부 (copyright_yn)

| 값 | 설명 |
|----|------|
| Y | 저작권 있음 |
| N | 저작권 없음 |
| C | 저작권 확인 필요 |
| P | 저작권 보류 |
| B | 차단 목록에 있음 |
| X | 제한된 컨텐츠 |

### 성인 컨텐츠 여부 (adult_yn)

| 값 | 설명 |
|----|------|
| Y | 성인 컨텐츠 |
| N | 일반 컨텐츠 |

### 모바일 서비스 여부 (mobservice_yn)

| 값 | 설명 |
|----|------|
| Y | 모바일 서비스 가능 |
| N | 모바일 서비스 불가능 |

### 폴더 여부 (folder_yn)

| 값 | 설명 |
|----|------|
| Y | 폴더 |
| N | 파일 |

### 클라우드 여부 (cloud_yn)

| 값 | 설명 |
|----|------|
| y | 클라우드 스토리지 |
| n | 일반 스토리지 |

### 섹션 코드 (sect_code)

| 값 | 설명 |
|----|------|
| 01 | 영화 |
| 02 | 드라마 |
| 03 | 예능 |
| 04 | 다큐 |
| 05 | 애니메이션 |
| 06 | 스포츠 |
| 07 | 음악 |
| 08 | 교육 |
| 09 | 성인 |
| 10 | 기타 |

### 회사 코드 (company_code)

| 값 | 설명 |
|----|------|
| WEDISK | 위디스크 (일반 스토리지) |
| DADAM | 다담 (클라우드 스토리지) |
