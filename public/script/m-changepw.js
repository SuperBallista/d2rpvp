// 폼 submit 이벤트 리스너 등록
document.querySelector('.changepwform').addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 폼 제출 동작 막기
  
    // 폼 요소 값 가져오기
    const currentPassword = document.querySelector('.nowpw').value;
    const newPassword = document.querySelector('.newpw').value;
    const confirmNewPassword = document.querySelector('.newpw-check').value;
  
    // 간단한 클라이언트 측 유효성 검사
    if (newPassword !== confirmNewPassword) {
      alert('새 암호와 확인 암호가 일치해야 합니다.');
      return;
    }
  
    // 서버로 암호 변경 요청 보내기
    try {
      const response = await fetch('/process_changepw_m', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nowpw: currentPassword,
          newpw: newPassword,
        }),
      });
  
      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }
  
      const result = await response.json();
      console.log(result); // 서버에서의 응답 로그
  
      // 암호 변경 성공 시 사용자에게 알림
      alert('암호가 성공적으로 변경되었습니다.');
      window.location.href = 'm-mypage.html';

    } catch (error) {
        console.error('암호 변경 오류:', error);
        // 암호 변경 실패 시 사용자에게 알림
        alert('암호 변경에 실패했습니다. 다시 시도해주세요.');
      }
    });
  
  