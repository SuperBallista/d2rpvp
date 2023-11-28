// 예시: 로그아웃 요청 함수
async function logoutUser() {
    try {
      const response = await fetch('/logout', { method: 'POST' });
      const data = await response.json();
  
      if (data.success) {
        console.log('로그아웃 성공');
        window.location.href = 'b-main.html';


    } else {
        console.error('로그아웃 실패:', data.error);
      }
    } catch (error) {
      console.error('로그아웃 요청 오류:', error);
    }
  }
  

  logoutUser()