/**
 * IP 주소 유틸리티 함수
 * C 소스의 conn_ip 필드 크기 제한(19자)에 맞춰 IP 주소를 처리
 */

/**
 * IP 주소를 데이터베이스 conn_ip 필드에 맞게 변환
 * @param {string} ip - 원본 IP 주소 (IPv4 또는 IPv6)
 * @returns {string} - 19자 이내로 제한된 IP 주소
 */
export const formatIpForDatabase = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return '127.0.0.1';
  }

  if (ip.startsWith('::ffff:')) {
    const ipv4 = ip.substring(7);
    if (ipv4.length <= 19) {
      return ipv4;
    }
  }

  if (ip.includes(':') && ip.length > 19) {
    const parts = ip.split(':');
    let truncated = '';
    
    for (const part of parts) {
      if ((truncated + ':' + part).length <= 19) {
        truncated = truncated ? truncated + ':' + part : part;
      } else {
        break;
      }
    }
    
    return truncated || ip.substring(0, 19);
  }

  if (ip.length > 19) {
    return ip.substring(0, 19);
  }

  return ip;
};

/**
 * IP 주소 유효성 검증
 * @param {string} ip - 검증할 IP 주소
 * @returns {boolean} - 유효한 IP 주소인지 여부
 */
export const isValidIp = (ip) => {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  const ipv6MappedPattern = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip) || ipv6MappedPattern.test(ip);
};
