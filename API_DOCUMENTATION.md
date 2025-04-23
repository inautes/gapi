# GAPI API 명세서

## 업로드 API

### 1. 업로드 정책 조회 (기존)

**엔드포인트**: `POST /upload/policy`

**설명**: 사용자가 업로드할 수 있는 카테고리 코드 목록을 반환합니다.

**요청 파라미터**:
```json
{
  "userid": "사용자ID"
}
```

**응답**:
```json
{
  "result": "success",
  "upload_policy": ["001", "002", "003"]
}
```

### 2. 업로드 서버 주소 조회 (신규)

**엔드포인트**: `GET /upload/address`

**설명**: 파일 업로드 및 다운로드에 사용할 서버 주소를 반환합니다.

**요청 파라미터**: 없음

**응답**:
```json
{
  "result": "success",
  "ftp_upload_server": "wedisk-ftpupload.dadamcloud.com",
  "download_server": "https://wedisk-down.dadamcloud.com/fdown.php"
}
```

### 3. 업로드 프로세스 시작 (신규)

**엔드포인트**: `POST /upload/start_process`

**설명**: 파일 업로드 전 필요한 처리를 수행하고 임시 ID를 발급합니다.

**요청 파라미터**:
```json
{
  "user_id": "사용자ID",
  "file_name": "파일명.확장자",
  "file_size": 1024000,
  "sect_code": "01",
  "sect_sub": "서브카테고리",
  "title": "컨텐츠 제목",
  "descript": "컨텐츠 설명",
  "default_hash": "파일 해시값",
  "audio_hash": "오디오 해시값",
  "video_hash": "비디오 해시값",
  "copyright_yn": "N",
  "adult_yn": "N"
}
```

**응답**:
```json
{
  "result": "success",
  "temp_id": 1234567890,
  "seq_no": 1,
  "message": "업로드 프로세스가 시작되었습니다",
  "metadata": {
    "user_id": "사용자ID",
    "file_name": "파일명.확장자",
    "file_size": 1024000,
    "sect_code": "01",
    "sect_sub": "서브카테고리",
    "title": "컨텐츠 제목",
    "descript": "컨텐츠 설명",
    "reg_date": "20250423",
    "reg_time": "070000",
    "default_hash": "파일 해시값",
    "audio_hash": "오디오 해시값",
    "video_hash": "비디오 해시값",
    "copyright_yn": "N",
    "adult_yn": "N"
  }
}
```

### 4. 업로드 프로세스 종료 (신규)

**엔드포인트**: `POST /upload/end_process`

**설명**: 파일 업로드 후 필요한 처리를 수행하고 영구 ID를 발급합니다.

**요청 파라미터**:
```json
{
  "temp_id": 1234567890,
  "user_id": "사용자ID",
  "sect_code": "01",
  "sect_sub": "서브카테고리",
  "adult_yn": "N",
  "copyright_yn": "N",
  "mobservice_yn": "Y"
}
```

**응답**:
```json
{
  "result": "success",
  "cont_id": 9876543210,
  "message": "업로드 프로세스가 완료되었습니다",
  "metadata": {
    "user_id": "사용자ID",
    "sect_code": "01",
    "sect_sub": "서브카테고리",
    "adult_yn": "N",
    "copyright_yn": "N",
    "mobservice_yn": "Y",
    "reg_date": "20250423",
    "reg_time": "070000"
  }
}
```

### 5. 해시 등록 (기존)

**엔드포인트**: `POST /upload/hashin`

**설명**: 파일 해시 정보를 데이터베이스에 등록합니다.

**요청 파라미터**:
```json
{
  "info": {
    "cont_id": "컨텐츠ID",
    "seq_id": "시퀀스ID",
    "hash": "파일 해시값",
    "cloud_yn": "y",
    "category_code": "01",
    "company_code": "WEDISK"
  }
}
```

**응답**:
```json
{
  "result": "success",
  "message": "All inserted"
}
```

## 구현 상세

### 업로드 프로세스 흐름

1. **업로드 정책 조회**: 클라이언트가 업로드 가능한 카테고리 확인
2. **업로드 서버 주소 조회**: 클라이언트가 업로드할 서버 주소 확인
3. **업로드 프로세스 시작**: 
   - 임시 ID 발급 (temp_id)
   - 파일 메타데이터 임시 저장 (T_CONTENTS_TEMP, T_CONTENTS_TEMPLIST, T_CONTENTS_TEMPLIST_SUB)
   - 사용자 권한 및 카테고리 검증
4. **파일 전송**: 클라이언트가 FTP 서버에 파일 전송 (API 구현 범위 외)
5. **업로드 프로세스 종료**:
   - 영구 ID 발급 (cont_id)
   - 임시 데이터를 영구 데이터로 이동 (T_CONTENTS_INFO, T_CONTENTS_FILELIST, T_CONTENTS_UPDN)
   - 임시 데이터 삭제

### 데이터베이스 처리

1. **임시 데이터 저장**:
   - T_CONTENTS_TEMP: 컨텐츠 기본 정보 저장
   - T_CONTENTS_TEMPLIST: 파일 목록 정보 저장
   - T_CONTENTS_TEMPLIST_SUB: 파일 세부 정보 저장

2. **영구 데이터 저장**:
   - T_CONTENTS_INFO: 컨텐츠 기본 정보 저장
   - T_CONTENTS_FILELIST: 파일 목록 정보 저장
   - T_CONTENTS_UPDN: 업로드 정보 저장

3. **ID 생성 방식**:
   - temp_id: 타임스탬프 기반 생성 (Date.now())
   - cont_id: 타임스탬프 기반 생성 (Date.now())
   - seq_no: 파일 순서에 따라 증가 (기본값 1)

### 에러 처리

- 필수 파라미터 누락 시 400 에러 반환
- 사용자 또는 카테고리가 존재하지 않을 경우 404 에러 반환
- 업로드 권한이 없을 경우 403 에러 반환
- 임시 ID가 유효하지 않을 경우 404 에러 반환
- 데이터베이스 오류 발생 시 500 에러 반환
