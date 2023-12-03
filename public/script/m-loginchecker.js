async function logoutUser() {
  try {
    const response = await fetch('/logout', { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      console.log('mpk 계정 로그아웃');


  } else {
      console.error('로그아웃 실패:', data.error);
    }
  } catch (error) {
    console.error('로그아웃 요청 오류:', error);
  }
}




// 로그인 후 세션 확인
const checkSession = async () => {
    const response = await fetch('/check-session'); // 서버에서 세션을 확인하는 엔드포인트
    const data = await response.json();
  
    if (data.isLoggedIn) {
      console.log('사용자는 로그인 상태입니다.');
      console.log('사용자 닉네임:', data.user.nickname);
const nickname = document.querySelector('.shownickname')
nickname.textContent = data.user.nickname.replace('_m','');
const hidelabel = document.querySelector('.nav__logouted');
hidelabel.style.display = 'none';

if(data.user.nickname.includes('_')){
}else{
  logoutUser()
  location.reload();
}


if(data.user.nickname=="admin_m"){

}
else{
  const adminpage = document.querySelector('.nav__logined__admin')
  adminpage.style.display='none';
}

} else {
      console.log('사용자는 로그인하지 않았습니다.');
      const hidelabel = document.querySelector('.nav__logined');
      hidelabel.style.display = 'none';


    }
  };
  
  // 로그인 후 바로 세션 확인
  checkSession();
  