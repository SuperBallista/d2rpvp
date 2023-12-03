// 로그인 후 세션 확인
const checkSession = async () => {
    const response = await fetch('/check-session'); // 서버에서 세션을 확인하는 엔드포인트
    const data = await response.json();
  
    if (data.isLoggedIn) {
      console.log('사용자는 로그인 상태입니다.');
      console.log('사용자 닉네임:', data.user.nickname);

} else {
      console.log('사용자는 로그인하지 않았습니다.');
      alert('로그인을 해주세요')
      window.location.href = 'm-login.html';

    }
  };
  
  // 로그인 후 바로 세션 확인
  checkSession();
  