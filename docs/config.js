// 가치작명소 설정 파일
// 방문 통계 저장소(Supabase) 주소와 공개 키를 넣으면 통계 수집과 관리자 화면이 켜집니다.
// 공개 키(anon / publishable key)는 브라우저에 노출되어도 되는 키입니다. 절대 service_role(비밀) 키를 넣지 마세요.
window.GACHI_CONFIG = {
  supabaseUrl: '',      // 예: 'https://abcdefgh.supabase.co'
  supabaseAnonKey: '',  // 예: 'eyJhbGciOi...' 또는 'sb_publishable_...'
};
