// 사용자 정보를 서버에서 가져오는 함수
async function fetchUserData() {
    try {
      const response = await fetch('/user_data_m'); // 실제 서버 엔드포인트로 수정해야 함
  
      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }
  
      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
      throw error;
    }
  }


  // HTML 요소에 사용자 정보 채우기
async function fillUserData() {

  try {
    const userData = await fetchUserData();

    let showname = userData.nickname;
    if (showname) {
      showname = showname.replace('_m', '');
    }
    
    // 각 HTML 요소에 데이터 채우기
    document.querySelector('.mydata__table__nickname').textContent = showname;
    document.querySelector('.mydata__table__email').textContent = userData.email;
    document.querySelector('.mydata__table__tscore').textContent = userData.tscore;
    document.querySelector('.mydata__table__bscore').textContent = userData.bscore;
    document.querySelector('.mydata__table__lscore').textContent = userData.lscore;

    // 날짜 형식 변경
    const lastDate = new Date(userData.lastdate);
    const formattedLastDate = `${lastDate.getFullYear()}/${(lastDate.getMonth() + 1).toString().padStart(2, '0')}/${lastDate.getDate().toString().padStart(2, '0')}`;
    document.querySelector('.mydata__table__lastdate').textContent = formattedLastDate;

    document.querySelector('.mydata__table__countwin').textContent = userData.countwin;
    document.querySelector('.mydata__table__countlose').textContent = userData.countlose;
    document.querySelector('.mydata__table__countrecord').textContent = userData.countrecord;

    if (userData.weapon == 1) {
      document.querySelector('.mydata__table__weapon').textContent = "질딘";
    } else if (userData.weapon == 2) {
      document.querySelector('.mydata__table__weapon').textContent = "컨센바바";
    } else if (userData.weapon == 3) {
      document.querySelector('.mydata__table__weapon').textContent = "늑드루";
    } else if (userData.weapon == 4) {
      document.querySelector('.mydata__table__weapon').textContent = "잽마";
    } else {
      document.querySelector('.mydata__table__weapon').textContent = "기타";
    }
  
  } catch (error) {
    console.error('사용자 정보 채우기 오류:', error);
    // 오류 처리를 수행할 수 있음
  }
}

// 페이지 로딩 시 사용자 정보 채우기
fillUserData();

