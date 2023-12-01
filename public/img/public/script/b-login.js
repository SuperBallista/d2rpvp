// 로그인 후 세션 확인
const checkSession = async () => {
    const response = await fetch('/check-session'); // 서버에서 세션을 확인하는 엔드포인트
    const data = await response.json();
  
    if (data.isLoggedIn) {
      console.log('사용자는 로그인 상태입니다.');
      console.log('사용자 닉네임:', data.user.nickname);
        window.location.href = 'b-main.html';

}   };
  
  // 로그인 후 바로 세션 확인
  checkSession();


// JavaScript 부분 수정
function loginUser() {
    // 로그인 폼 요소 가져오기
    const loginForm = document.getElementById('loginForm');
  
    // 닉네임과 암호 가져오기
    const nickname = loginForm.querySelector('.nickname').value;
    const password = loginForm.querySelector('.newpw').value;
  
    // AJAX를 사용하여 백엔드로 로그인 요청 보내기
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/process_login', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
  
    xhr.onload = function () {
      if (xhr.status === 200) {
        // 로그인이 성공하면 다음 동작을 수행
        console.log('로그인 성공!');
        window.location.href = 'b-main.html';
        // 여기에 로그인 성공 후의 동작을 추가하세요.
      } else {
        // 로그인이 실패하면 다음 동작을 수행
        console.error('로그인 실패:', xhr.responseText);
        alert(xhr.responseText)
      }
    };
  
    xhr.onerror = function () {
      console.error('서버 오류');
    };
  
    // JSON 형태로 데이터 전송
    const data = {
      nickname: nickname,
      password: password,
    };
  
    xhr.send(JSON.stringify(data));
  
    // 폼 전송 막기
    return false;
  }
  
