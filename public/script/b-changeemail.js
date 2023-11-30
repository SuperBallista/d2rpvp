// JavaScript
// 이메일 주소 확인 함수
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // 폼 submit 이벤트 리스너 등록
  document.querySelector('.changeemail').addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 폼 제출 동작 막기
  
    // 폼 요소 값 가져오기
    const currentPassword = document.querySelector('.nowpw').value;
    const newemail = document.querySelector('.newemail').value;
  
    if (isValidEmail(newemail)) {
      console.log('email checked');
      console.log(currentPassword);
  
      // 서버로 이메일 변경 요청 보내기
      try {
        const response = await fetch('/process_changeemail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nowpw: currentPassword,
            newemail: newemail,
          }),
        });
  
        if (!response.ok) {
          throw new Error('서버 응답 오류');
        }
  
        const result = await response.json();
        console.log(result); // 서버에서의 응답 로그
  
        // 이메일 변경 성공 시 사용자에게 알림
        alert('이메일이 성공적으로 변경되었습니다.');
        window.location.href = 'b-mypage.html';
      } catch (error) {
        console.error('이메일 변경 오류:', error);
        // 이메일 변경 실패 시 사용자에게 알림
        alert('이메일 변경에 실패했습니다. 다시 시도해주세요.');
      }
    } else {
      alert('올바르지 않은 이메일 형식입니다.');
    }
  });
  