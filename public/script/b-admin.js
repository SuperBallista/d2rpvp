let userNickname; // 전역 변수로 사용할 닉네임 변수 추가

// 로그인 후 세션 확인
const checkSession = async () => {
    const response = await fetch('/check-session'); // 서버에서 세션을 확인하는 엔드포인트
    const sdata = await response.json();
  
      console.log('사용자는 로그인 상태입니다.');
      console.log('사용자 닉네임:', sdata.user.nickname);
      userNickname = sdata.user.nickname; // 전역 변수에 닉네임 할당
      if (userNickname!=='admin'){
        
alert('이 페이지에 접근 권한이 없습니다')
window.location.href = 'b-main.html';

      }
 

    }
    fillPlayerSelectBoxes(); // 세션 확인 후 fillPlayerSelectBoxes 호출
      
  // 로그인 후 바로 세션 확인
  checkSession();
  
    
  
  
  
  // 이 함수는 서버에서 Nickname 목록을 가져오는 역할을 합니다.
  async function getNicknamesFromServer() {
      try {
        const response = await fetch('/api/getNicknames'); // 적절한 엔드포인트로 수정해야 합니다.
        if (!response.ok) {
          throw new Error('서버 응답 오류');
        }
    
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('데이터 가져오기 오류:', error);
        throw error;
      }
    }
  
  
    // 이 함수는 HTML의 승자 및 팀원 선택 셀렉트 박스를 채우는 역할을 합니다.
  async function fillPlayerSelectBoxes() {
    try {
      const nicknames = await getNicknamesFromServer();
      const myNickname = userNickname;
  
      const playerselect = document.querySelector('.player');

      // 선택 박스 채우는 함수
      const fillSelectBox = (selectBox) => {
        nicknames.forEach((nickname) => {
            const option = document.createElement('option');
            option.value = nickname;
            option.textContent = nickname;
            selectBox.appendChild(option);
        });
      };
  
      // 승자 선택 박스 채우기
      fillSelectBox(playerselect);
    } catch (error) {
      console.error('선택지 채우기 오류:', error);
      // 오류 처리를 수행할 수 있음
    }
  }
  
        // Add an event listener to the submit button
        document.querySelector('.submitScore').addEventListener('click', () => {
            // Get form values
            const player = document.querySelector('.player').value;
            const playerScore = document.querySelector('.playerScore').value;
    
            // Create JSON object
            const formData = {
              player,
              playerScore,
            };
    
            // Send data to the server using fetch
            fetch('/submit-admin-score', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
              alert('Server response: ' + JSON.stringify(data));
            })
            .catch(error => {
              alert('Error: ' + error);
            });
            
          });
  
   