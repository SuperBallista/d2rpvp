// 이메일 주소 확인 함수
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // 폼 submit 이벤트 리스너 등록
  document.querySelector('.emailpw').addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 폼 제출 동작 막기
  
    // 폼 요소 값 가져오기
    const email = document.querySelector('.email').value;
    let nickname = document.querySelector('.nickname').value;
    nickname = nickname.toString().toLowerCase();

    
    if (isValidEmail(email)) {
      console.log('email checked');
  
      // 임시 암호 메일 변경 요청 보내기
      try {
        const response = await fetch('/process_emailpw_m', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            findpw_nickname: nickname + '_m',
            findpw_email: email,
          }),
        });
  
        if (!response.ok) {
          throw new Error('서버 응답 오류');
        }
  
        const result = await response.json();
        console.log(result); // 서버에서의 응답 로그
  
        // 이메일로 암호 요청 성공시 사용자에게 알림
        alert('임시 비밀번호를 생성했습니다. 관리자에게 문의 바랍니다.');
        window.location.href = 'm-main.html';
      } catch (error) {
        console.error('암호 전송 요청 오류', error);
        // 이메일 변경 실패 시 사용자에게 알림
        alert('닉네임 혹은 이메일이 틀렸거나 서버가 응답하지 않습니다');
      }
    } else {
      alert('올바르지 않은 이메일 형식입니다.');
    }
  });
  