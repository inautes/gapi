# 다운로드 API 매뉴얼

## 개요
이 문서는 GAPI 다운로드 API의 사용 방법을 설명합니다. 다운로드 API를 통해 파일 해시 정보, 다운로드 서버 주소, 파일 정보 조회 및 통계 업데이트 등의 기능을 사용할 수 있습니다.

## API 목록

### 1. 파일 해시 정보 조회
- **Endpoint**: `/download/gethash`
- **Method**: POST
- **설명**: 파일명 또는 컨텐츠 ID로 파일 해시 정보를 조회합니다.
- **요청 파라미터**:
  ```json
  {
    "filename": "example.mp4",
    "cont_no": 123456,
    "seq_no": 1
  }
  ```
- **응답 결과**:
  ```json
  {
    "result": "success",
    "hash_code": "a1b2c3d4e5f6g7h8i9j0",
    "upload_server_domain": "gapi.wedisk.co.kr",
    "company_code": "WEDISK"
  }
  ```

### 2. 다운로드 서버 주소 조회
- **Endpoint**: `/download/address`
- **Method**: GET
- **설명**: 다운로드 서버 주소 및 포트 정보를 조회합니다.
- **응답 결과**:
  ```json
  {
    "result": "success",
    "download_server": "wedisk-down.dadamcloud.com",
    "download_port": 8080
  }
  ```

### 3. 다운로드 정보 조회
- **Endpoint**: `/download/info`
- **Method**: POST
- **설명**: 컨텐츠 ID와 사용자 ID로 다운로드 정보를 조회합니다.
- **요청 파라미터**:
  ```json
  {
    "cont_id": 123456,
    "seq_id": 1,
    "user_id": "user123",
    "client_ip": "192.168.0.1",
    "client_port": 12345
  }
  ```
- **응답 결과**:
  ```json
  {
    "result": "success",
    "file_info": {
      "cont_id": 123456,
      "seq_id": 1,
      "file_name": "example.mp4",
      "file_size": 1024000,
      "hash_code": "a1b2c3d4e5f6g7h8i9j0",
      "upload_server_domain": "gapi.wedisk.co.kr",
      "company_code": "WEDISK",
      "sect_code": "01",
      "sect_sub": "",
      "reg_date": "20250101",
      "reg_time": "120000",
      "download_count": 5,
      "last_download_date": "20250110"
    }
  }
  ```

### 4. 다운로드 통계 업데이트
- **Endpoint**: `/download/update_stats`
- **Method**: POST
- **설명**: 다운로드 횟수 및 마지막 다운로드 날짜를 업데이트합니다.
- **요청 파라미터**:
  ```json
  {
    "cont_id": 123456,
    "seq_id": 1,
    "user_id": "user123",
    "server_id": "WD001",
    "download_size": 1024000,
    "download_status": "SUCCESS",
    "client_ip": "192.168.0.1",
    "client_port": 12345
  }
  ```
- **응답 결과**:
  ```json
  {
    "result": "success",
    "message": "다운로드 통계가 업데이트되었습니다",
    "download_count": 6
  }
  ```

### 5. 컨텐츠 ID로 클라우드 해시 정보 조회
- **Endpoint**: `/download/contents`
- **Method**: POST
- **설명**: 컨텐츠 ID로 클라우드 해시 정보를 조회합니다.
- **요청 파라미터**:
  ```json
  {
    "cont_id": 123456
  }
  ```
- **응답 결과**:
  ```json
  {
    "result": "success",
    "id": 123456,
    "cloud_yn": "Y",
    "files": [
      {
        "seq_no": 1,
        "cld_hash": "a1b2c3d4e5f6g7h8i9j0",
        "option1": 1,
        "value1": "option1_value"
      },
      {
        "seq_no": 2,
        "cld_hash": "b2c3d4e5f6g7h8i9j0k1",
        "option1": 2,
        "value1": "option2_value"
      }
    ]
  }
  ```
- **cloud_yn 값 설명**:
  - **Y**: 클라우드 서버에 파일이 저장되어 있음
  - **N**: IDC 서버에 파일이 저장되어 있음
