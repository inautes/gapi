
CREATE TABLE IF NOT EXISTS zangsi.T_CONTENTS_VIR_ID (
  id VARCHAR(20) PRIMARY KEY,
  sect_code VARCHAR(10) NOT NULL,
  sect_sub VARCHAR(10) DEFAULT '',
  adult_yn CHAR(1) DEFAULT 'N',
  copyright_yn CHAR(1) DEFAULT 'N',
  del_yn CHAR(1) DEFAULT 'N',
  mob_service_yn CHAR(1) DEFAULT 'Y',
  mobile_chk CHAR(1) DEFAULT 'N',
  reg_date VARCHAR(8) NOT NULL,
  reg_time VARCHAR(6) NOT NULL
);

CREATE TABLE IF NOT EXISTS zangsi.T_CONTENTS_VIR_ID2 (
  id VARCHAR(20) PRIMARY KEY,
  sect_code VARCHAR(10) NOT NULL,
  sect_sub VARCHAR(10) DEFAULT '',
  adult_yn CHAR(1) DEFAULT 'N',
  copyright_yn CHAR(1) DEFAULT 'N',
  del_yn CHAR(1) DEFAULT 'N',
  mob_service_yn CHAR(1) DEFAULT 'Y',
  mobile_chk CHAR(1) DEFAULT 'N',
  reg_date VARCHAR(8) NOT NULL,
  reg_time VARCHAR(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vir_id_sect_code ON zangsi.T_CONTENTS_VIR_ID(sect_code);
CREATE INDEX IF NOT EXISTS idx_vir_id_copyright ON zangsi.T_CONTENTS_VIR_ID(copyright_yn);
CREATE INDEX IF NOT EXISTS idx_vir_id2_sect_code ON zangsi.T_CONTENTS_VIR_ID2(sect_code);
CREATE INDEX IF NOT EXISTS idx_vir_id2_copyright ON zangsi.T_CONTENTS_VIR_ID2(copyright_yn);
