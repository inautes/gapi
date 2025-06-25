
CREATE TABLE IF NOT EXISTS zangsi.T_CONTENTS_VIR_ID (
  vir_id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  id INT(11) UNSIGNED NOT NULL DEFAULT '0',
  sect_code CHAR(2) DEFAULT NULL,
  sect_sub CHAR(2) DEFAULT NULL,
  adult_yn CHAR(1) DEFAULT NULL,
  copyright_yn CHAR(1) NOT NULL DEFAULT 'N',
  del_yn CHAR(1) NOT NULL DEFAULT 'N',
  strm_yn CHAR(1) DEFAULT 'N',
  mob_service_yn CHAR(1) DEFAULT 'N',
  hd_yn CHAR(1) DEFAULT 'N',
  sd_yn CHAR(1) DEFAULT 'N',
  thumb_yn CHAR(1) DEFAULT 'N',
  mobile_chk CHAR(1) DEFAULT 'N',
  PRIMARY KEY (vir_id),
  KEY T_CONTENTS_VIR_ID_I1 (id),
  KEY T_CONTENTS_VIR_ID_I2 (sect_code, sect_sub)
) ENGINE=InnoDB DEFAULT CHARSET=euckr;

CREATE TABLE IF NOT EXISTS zangsi.T_CONTENTS_VIR_ID2 (
  vir_id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  id INT(11) UNSIGNED NOT NULL DEFAULT '0',
  sect_code CHAR(2) DEFAULT NULL,
  sect_sub CHAR(2) DEFAULT NULL,
  adult_yn CHAR(1) DEFAULT NULL,
  copyright_yn CHAR(1) NOT NULL DEFAULT 'N',
  del_yn CHAR(1) NOT NULL DEFAULT 'N',
  strm_yn CHAR(1) DEFAULT 'N',
  mob_service_yn CHAR(1) DEFAULT 'N',
  hd_yn CHAR(1) DEFAULT 'N',
  sd_yn CHAR(1) DEFAULT 'N',
  thumb_yn CHAR(1) DEFAULT 'N',
  mobile_chk CHAR(1) DEFAULT 'N',
  PRIMARY KEY (vir_id),
  KEY T_CONTENTS_VIR_ID2_I1 (id),
  KEY T_CONTENTS_VIR_ID2_I2 (sect_code, sect_sub)
) ENGINE=InnoDB DEFAULT CHARSET=euckr;
