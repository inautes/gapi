# 데이터베이스 스키마 및 데이터 흐름

이 문서는 JSON 기반 업로드 API 구현에 필요한 데이터베이스 테이블 스키마와 로컬 DB와 원격 DB 간의 데이터 흐름을 설명합니다.

## 필요한 테이블 스키마

### 로컬 데이터베이스 테이블

1. **WebhardHash (T_CONT_DADAM_FILE_MAP)**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONT_DADAM_FILE_MAP (
     seq_no INTEGER,
     cld_hash VARCHAR(128) NOT NULL,
     id VARCHAR(20) NOT NULL,
     cloud_yn CHAR(1) NOT NULL DEFAULT 'N',
     reg_date VARCHAR(8) NOT NULL,
     reg_time VARCHAR(6) NOT NULL,
     PRIMARY KEY (seq_no, id)
   );
   ```

### 원격 데이터베이스 테이블

1. **T_CONTENTS_TEMP**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONTENTS_TEMP (
     id VARCHAR(20) PRIMARY KEY,
     title VARCHAR(255),
     descript TEXT,
     descript2 TEXT,
     descript3 TEXT,
     keyword TEXT,
     sect_code VARCHAR(10),
     sect_sub VARCHAR(10),
     adult_yn CHAR(1),
     share_meth CHAR(1),
     price_amt INTEGER,
     won_mega INTEGER,
     reg_user VARCHAR(20),
     reg_date VARCHAR(8),
     reg_time VARCHAR(6),
     disp_end_date VARCHAR(8),
     disp_end_time VARCHAR(6),
     item_bold_yn CHAR(1),
     item_color CHAR(1),
     req_id INTEGER,
     editor_type INTEGER
   );
   ```

2. **T_CONTENTS_TEMPLIST**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONTENTS_TEMPLIST (
     id VARCHAR(20) PRIMARY KEY,
     file_name VARCHAR(255),
     file_size BIGINT,
     file_type INTEGER,
     file_ext VARCHAR(10),
     file_path VARCHAR(255),
     reg_date VARCHAR(8),
     reg_time VARCHAR(6),
     copyright_yn CHAR(1),
     mobservice_yn CHAR(1),
     mureka_yn CHAR(1),
     mureka_id VARCHAR(50),
     mureka_name VARCHAR(255),
     mureka_album VARCHAR(255),
     mureka_artist VARCHAR(255),
     copyright_id VARCHAR(50),
     copyright_name VARCHAR(255)
   );
   ```

3. **T_CONTENTS_TEMPLIST_SUB**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONTENTS_TEMPLIST_SUB (
     id VARCHAR(20),
     seq_no INTEGER,
     file_name VARCHAR(255),
     file_size BIGINT,
     file_type INTEGER,
     file_ext VARCHAR(10),
     default_hash VARCHAR(128),
     audio_hash VARCHAR(128),
     video_hash VARCHAR(128),
     comp_cd VARCHAR(10),
     chi_id INTEGER,
     price_amt INTEGER,
     mob_price_amt INTEGER,
     reg_date VARCHAR(8),
     reg_time VARCHAR(6),
     PRIMARY KEY (id, seq_no)
   );
   ```

4. **T_CONTENTS_INFO**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONTENTS_INFO (
     id VARCHAR(20) PRIMARY KEY,
     title VARCHAR(255),
     descript TEXT,
     descript2 TEXT,
     descript3 TEXT,
     keyword TEXT,
     sect_code VARCHAR(10),
     sect_sub VARCHAR(10),
     adult_yn CHAR(1),
     share_meth CHAR(1),
     price_amt INTEGER,
     won_mega INTEGER,
     reg_user VARCHAR(20),
     reg_date VARCHAR(8),
     reg_time VARCHAR(6),
     disp_end_date VARCHAR(8),
     disp_end_time VARCHAR(6),
     item_bold_yn CHAR(1),
     item_color CHAR(1),
     bomul_id INTEGER,
     bomul_stat INTEGER,
     req_id INTEGER,
     editor_type INTEGER,
     nmnt_cnt INTEGER,
     disp_cnt_inc INTEGER
   );
   ```

5. **T_CONTENTS_FILELIST**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONTENTS_FILELIST (
     id VARCHAR(20),
     seq_no INTEGER,
     file_name VARCHAR(255),
     file_size BIGINT,
     file_type INTEGER,
     file_ext VARCHAR(10),
     default_hash VARCHAR(128),
     audio_hash VARCHAR(128),
     video_hash VARCHAR(128),
     comp_cd VARCHAR(10),
     chi_id INTEGER,
     price_amt INTEGER,
     mob_price_amt INTEGER,
     reg_date VARCHAR(8),
     reg_time VARCHAR(6),
     PRIMARY KEY (id, seq_no)
   );
   ```

6. **T_CONTENTS_UPDN**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONTENTS_UPDN (
     id VARCHAR(20) PRIMARY KEY,
     cont_gu VARCHAR(2),
     copyright_yn CHAR(1),
     mobservice_yn CHAR(1),
     reg_date VARCHAR(8),
     reg_time VARCHAR(6)
   );
   ```

7. **T_CONT_DADAM_FILE_MAP (원격)**
   ```sql
   CREATE TABLE IF NOT EXISTS T_CONT_DADAM_FILE_MAP (
     seq_no INTEGER,
     cld_hash VARCHAR(128),
     id VARCHAR(20),
     cloud_yn CHAR(1),
     reg_date VARCHAR(8),
     reg_time VARCHAR(6),
     PRIMARY KEY (seq_no, id)
   );
   ```

## 로컬 DB와 원격 DB 간의 데이터 흐름

### 1. 업로드 정책 조회 (`/upload/policy`)

- **데이터 흐름**: 로컬 DB만 사용
- **사용 테이블**: User, Category
- **처리 과정**:
  1. 로컬 DB에서 사용자 정보 조회
  2. 사용자의 업로드 권한 확인
  3. 업로드 가능한 카테고리 목록 반환

### 2. 파일 정보 등록 (`/upload/enrollment_fileinfo`)

- **데이터 흐름**: 로컬 DB → 원격 DB
- **사용 테이블**:
  - 로컬: User, Category, WebhardHash
  - 원격: T_CONTENTS_TEMP, T_CONTENTS_TEMPLIST, T_CONTENTS_TEMPLIST_SUB
- **처리 과정**:
  1. 로컬 DB에서 사용자 정보 및 카테고리 정보 조회
  2. 사용자의 업로드 권한 확인
  3. 임시 ID(temp_id) 생성
  4. 원격 DB의 임시 테이블에 데이터 저장
  5. 웹하드 해시 정보가 있는 경우 로컬 DB에 저장

### 3. 파일 필터링 (`/upload/enrollment_filtering`)

- **데이터 흐름**: 원격 DB
- **사용 테이블**: T_CONTENTS_TEMPLIST
- **처리 과정**:
  1. 원격 DB에서 임시 파일 정보 조회
  2. 뮤레카 정보 업데이트
  3. 저작권 정보 업데이트

### 4. 업로드 완료 (`/upload/enrollment_complete`)

- **데이터 흐름**: 로컬 DB → 원격 DB
- **사용 테이블**:
  - 로컬: WebhardHash
  - 원격: T_CONTENTS_TEMP, T_CONTENTS_TEMPLIST, T_CONTENTS_TEMPLIST_SUB, T_CONTENTS_INFO, T_CONTENTS_FILELIST, T_CONTENTS_UPDN, T_CONT_DADAM_FILE_MAP
- **처리 과정**:
  1. 원격 DB에서 임시 파일 정보 조회
  2. 로컬 DB에서 웹하드 해시 정보 조회
  3. 영구 ID(cont_id) 생성
  4. 원격 DB의 영구 테이블에 데이터 저장
  5. 웹하드 해시 정보가 있는 경우 원격 DB에 저장
  6. 원격 DB의 임시 테이블에서 데이터 삭제
  7. 로컬 DB의 웹하드 해시 정보 삭제

## 각 API 단계별 필요한 쿼리 목록

### 1. 파일 정보 등록 (`/upload/enrollment_fileinfo`)

```sql
-- 사용자 정보 조회
SELECT * FROM User WHERE userid = ?;

-- 카테고리 정보 조회
SELECT * FROM Category WHERE code = ?;

-- T_CONTENTS_TEMP 테이블에 데이터 삽입
INSERT INTO T_CONTENTS_TEMP (
  id, title, descript, descript2, descript3, keyword,
  sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
  reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
  item_color, req_id, editor_type
) VALUES (
  ?, ?, ?, '', '', '',
  ?, ?, ?, 'N', 0, 0,
  ?, ?, ?, '', '', 'N',
  'N', 0, 0
);

-- T_CONTENTS_TEMPLIST 테이블에 데이터 삽입
INSERT INTO T_CONTENTS_TEMPLIST (
  id, file_name, file_size, file_type, file_ext, file_path,
  reg_date, reg_time, copyright_yn, mobservice_yn
) VALUES (
  ?, ?, ?, 0, ?, '',
  ?, ?, ?, 'Y'
);

-- T_CONTENTS_TEMPLIST_SUB 테이블에 데이터 삽입
INSERT INTO T_CONTENTS_TEMPLIST_SUB (
  id, seq_no, file_name, file_size, file_type, file_ext,
  default_hash, audio_hash, video_hash, comp_cd, chi_id, price_amt,
  mob_price_amt, reg_date, reg_time
) VALUES (
  ?, ?, ?, ?, 0, ?,
  ?, ?, ?, 'WEDISK', 0, 0,
  0, ?, ?
);

-- 웹하드 해시 정보 저장 (로컬 DB)
INSERT INTO WebhardHash (
  seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
) VALUES (
  ?, ?, ?, 'Y', ?, ?
);
```

### 2. 파일 필터링 (`/upload/enrollment_filtering`)

```sql
-- 임시 파일 정보 조회
SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?;

-- 뮤레카 정보 업데이트
UPDATE T_CONTENTS_TEMPLIST SET
  mureka_yn = ?,
  mureka_id = ?,
  mureka_name = ?,
  mureka_album = ?,
  mureka_artist = ?
WHERE id = ?;

-- 저작권 정보 업데이트
UPDATE T_CONTENTS_TEMPLIST SET
  copyright_yn = ?,
  copyright_id = ?,
  copyright_name = ?
WHERE id = ?;
```

### 3. 업로드 완료 (`/upload/enrollment_complete`)

```sql
-- 임시 파일 정보 조회
SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?;
SELECT * FROM T_CONTENTS_TEMPLIST_SUB WHERE id = ?;
SELECT * FROM T_CONTENTS_TEMP WHERE id = ?;

-- 웹하드 해시 정보 조회 (로컬 DB)
SELECT * FROM WebhardHash WHERE id = ?;

-- T_CONTENTS_INFO 테이블에 데이터 삽입
INSERT INTO T_CONTENTS_INFO (
  id, title, descript, descript2, descript3, keyword,
  sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
  reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
  item_color, bomul_id, bomul_stat, req_id, editor_type, nmnt_cnt, disp_cnt_inc
) SELECT 
  ?, title, descript, descript2, descript3, keyword,
  ?, ?, ?, share_meth, price_amt, won_mega,
  reg_user, ?, ?, disp_end_date, disp_end_time, item_bold_yn,
  item_color, 0, 0, req_id, editor_type, 0, 0
FROM T_CONTENTS_TEMP
WHERE id = ?;

-- T_CONTENTS_FILELIST 테이블에 데이터 삽입
INSERT INTO T_CONTENTS_FILELIST (
  id, seq_no, file_name, file_size, file_type, file_ext,
  default_hash, audio_hash, video_hash, comp_cd, chi_id, price_amt,
  mob_price_amt, reg_date, reg_time
) VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?
);

-- T_CONT_DADAM_FILE_MAP 테이블에 데이터 삽입 (원격 DB)
INSERT INTO T_CONT_DADAM_FILE_MAP (
  seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
) VALUES (
  ?, ?, ?, ?, ?, ?
);

-- T_CONTENTS_UPDN 테이블에 데이터 삽입
INSERT INTO T_CONTENTS_UPDN (
  id, cont_gu, copyright_yn, mobservice_yn, reg_date, reg_time
) VALUES (
  ?, 'UP', ?, ?, ?, ?
);

-- 임시 데이터 삭제
DELETE FROM T_CONTENTS_TEMPLIST_SUB WHERE id = ?;
DELETE FROM T_CONTENTS_TEMPLIST WHERE id = ?;
DELETE FROM T_CONTENTS_TEMP WHERE id = ?;

-- 웹하드 해시 정보 삭제 (로컬 DB)
DELETE FROM WebhardHash WHERE id = ?;
```
