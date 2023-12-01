let userNickname; // 전역 변수로 사용할 닉네임 변수 추가

// 로그인 후 세션 확인
const checkSession = async () => {
  const response = await fetch('/check-session'); // 서버에서 세션을 확인하는 엔드포인트
  const sdata = await response.json();

  if (sdata.isLoggedIn) {
    console.log('사용자는 로그인 상태입니다.');
    console.log('사용자 닉네임:', sdata.user.nickname);
    userNickname = sdata.user.nickname; // 전역 변수에 닉네임 할당
    const nickname = document.querySelector('.shownickname');
    nickname.textContent = userNickname;
    const hidelabel = document.querySelector('.nav__logouted');
    hidelabel.style.display = 'none';
    const hidetext = document.querySelector('.regi-logout');
    hidetext.style.display = 'none';

  } else {
    console.log('사용자는 로그인하지 않았습니다.');
    const hidelabel = document.querySelector('.nav__logined');
    hidelabel.style.display = 'none';
    const hideinput1 = document.querySelector('.add-record');
    hideinput1.style.display = 'none';
    const hideinput2 = document.querySelector('.record-approve');
    hideinput2.style.display = 'none';
    const hideinput3 = document.querySelector('h5');
    hideinput3.style.display = 'none';
    const hideinput4 = document.querySelector('.main_with_nav__option');
    hideinput4.style.display = 'none';

  }
  fillPlayerSelectBoxes(); // 세션 확인 후 fillPlayerSelectBoxes 호출


};

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

    const winnerSelectBox = document.querySelector('.winner');
    const win2Selectbox = document.querySelector('.winner2');
    const win3Selectbox = document.querySelector('.winner3');
    const win4Selectbox = document.querySelector('.winner4');
    const lose2Selectbox = document.querySelector('.loser2');
    const lose3Selectbox = document.querySelector('.loser3');
    const lose4Selectbox = document.querySelector('.loser4');

    // 선택 박스 채우는 함수
    const fillSelectBox = (selectBox) => {
      nicknames.forEach((nickname) => {
        // 자신의 닉네임은 제외
        if (nickname !== myNickname) {
          const option = document.createElement('option');
          option.value = nickname;
          option.textContent = nickname;
          selectBox.appendChild(option);
        }
      });
    };

    // 승자 선택 박스 채우기
    fillSelectBox(winnerSelectBox);
    fillSelectBox(win2Selectbox);
    fillSelectBox(win3Selectbox);
    fillSelectBox(win4Selectbox);
    fillSelectBox(lose2Selectbox);
    fillSelectBox(lose3Selectbox);
    fillSelectBox(lose4Selectbox);
  } catch (error) {
    console.error('선택지 채우기 오류:', error);
    // 오류 처리를 수행할 수 있음
  }
}


 




  

// 팀당 인원 선택
const teamSelect = document.querySelector('.add-record__team');

teamSelect.addEventListener('change', () => {
  // 모든 선택지를 처음에는 비활성화
  disableAllPlayers();

  // 선택된 팀의 크기
  const teamSize = parseInt(teamSelect.value);

  // 선택된 팀 크기에 따라 필요한 선택지만 활성화
  if (teamSize >= 2) {
    enablePlayer('winner2');
    enablePlayer('loser2');
  }

  if (teamSize >= 3) {
    enablePlayer('winner3');
    enablePlayer('loser3');
  }

  if (teamSize >= 4) {
    enablePlayer('winner4');
    enablePlayer('loser4');
  }
});

// 모든 선택지를 비활성화하는 함수
function disableAllPlayers() {
  const allPlayers = ['winner2', 'winner3', 'winner4', 'loser2', 'loser3', 'loser4'];

  allPlayers.forEach((player) => {
    disablePlayer(player);
  });
}

// 특정 선택지를 활성화하는 함수
function enablePlayer(player) {
  const playerSelect = document.querySelector(`.${player}`);
  if (playerSelect) {
    playerSelect.disabled = false;
  }
}

// 특정 선택지를 비활성화하는 함수
function disablePlayer(player) {
  const playerSelect = document.querySelector(`.${player}`);
  if (playerSelect) {
    playerSelect.disabled = true;
  }
}

// 미승인 기록 보내기
document.querySelector('.submitrecord').addEventListener('click', async () => {
    try {
        // 'add-record' 폼 데이터 가져오기
        console.log("a");
        const formData = new FormData(document.querySelector('.add-record'));

        // FormData를 JavaScript 객체로 변환
        const formDataObject = {};
        formData.forEach((value, key) => {
            formDataObject[key] = value;
        });

        // 추가 조건 검사: myscore가 0보다 작거나 winnerscore보다 크면 전송하지 않음
        console.log(formDataObject.myScore < 0 || formDataObject.myScore >= formDataObject.winnerScore)
        if (formDataObject.myScore < 0 || formDataObject.myScore >= formDataObject.winnerScore) {
            alert("패자 점수가 올바르지 않습니다");
            return;
        }

        // 중복된 값 검사
        const hasDuplicates = checkForDuplicates(formDataObject);
        console.log(hasDuplicates);

        if (hasDuplicates) {
            console.log("b");
            alert('선수 기록에 중복된 값이 있습니다.');
            return;
        } else {
            // JSON 형식으로 변환
            const jsonData = JSON.stringify(formDataObject);

            // 서버에 데이터 전송
            const response = await fetch('/submitrecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: jsonData,
            });

            const clonedResponse = response.clone();  // 응답을 복제

            const responseData = await response.json();  // 이미 JSON으로 읽은 상태

            if (!response.ok) {
                console.error('서버 응답 오류로 데이터를 전송하지 못했습니다');
                alert('서버 응답 오류로 데이터를 전송하지 못했습니다');
            } else {
                const responseText = await clonedResponse.text();  // 복제한 응답에 대해 text 메서드 호출
                alert(responseText);
            }
        }
    } catch (error) {
        console.error('데이터 전송 오류:', error);
        alert('데이터 전송 오류입니다');
        // 오류 처리를 수행할 수 있음
    }
});

// 중복된 값이 있는지 검사하는 함수
function checkForDuplicates(formDataObject) {
    // 중복을 체크할 필드들
    const fieldsToCheck = ['winner', 'winner2', 'winner3', 'winner4', 'loser2', 'loser3', 'loser4'];

    // 선택된 값만 필터링하여 배열로 얻기
    const selectedValues = fieldsToCheck
        .map(field => formDataObject[field])
        .filter(value => value !== null && value !== undefined);

    // 중복된 값을 찾기 위해 Set을 사용
    const valueSet = new Set(selectedValues);

    // 중복된 값이 있다면 Set의 크기가 selectedValues의 길이와 다를 것
    return valueSet.size !== selectedValues.length;
}

// 비동기적으로 서버에서 데이터를 가져오는 함수
async function fetchData() {
  try {
    const response = await fetch('no_approved_record');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}




// 데이터를 받아와서 HTML에 표시하는 함수
async function displayData() {
  const table = document.getElementById('scoreTable');
  const data = await fetchData();

  // 데이터를 반복하면서 각 행을 생성
  data.forEach(rowData => {
    const row = document.createElement('tr');

    // Object.entries를 사용하여 키-값 쌍 순회
    Object.entries(rowData).forEach(([key, value]) => {
      const cell = document.createElement('td');

      // 날짜 데이터의 경우 형식 변경
      if (key === 'Date') {
        value = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(value));
      }

      cell.textContent = value;
      row.appendChild(cell);
    });

    // '승인'과 '삭제' 버튼 컨테이너 열 추가
    const buttonsCell = document.createElement('td');

    // '승인' 버튼 추가
    const approveButton = document.createElement('button');
    approveButton.textContent = '승인';
    approveButton.addEventListener('click', () => {
      // '승인' 버튼 클릭 시 처리할 로직 추가
      approveRecord(rowData.OrderNum);
      console.log('승인 버튼 클릭:', rowData);
    });
    buttonsCell.appendChild(approveButton);

    // '삭제' 버튼 추가
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => {
      deleteRecord(rowData.OrderNum);
      console.log('삭제 버튼 클릭:', rowData);
    });
    buttonsCell.appendChild(deleteButton);

    // '승인'과 '삭제' 버튼 열 추가
    row.appendChild(buttonsCell);

    // 테이블에 행 추가
    table.appendChild(row);
  });
}


// 삭제 버튼 클릭 시 /delete-record 엔드포인트 호출하는 함수
async function deleteRecord(order) {
  try {
    console.log(order)
    const response = await fetch('/delete-record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderNum: order }),
      
    });

    if (response.ok) {
      console.log('삭제 성공');
      window.location.href = 'b-adddata.html';

    } else {
      console.error('삭제 실패');
      // 실패 시에 대한 처리
    }
  } catch (error) {
    console.error('삭제 요청 에러:', error);
  }
}


// 승인 버튼 클릭 시 /approve-record 엔드포인트 호출하는 함수
async function approveRecord(order) {
  try {
    console.log(order)
    const response = await fetch('/approve-record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderNum: order }),
      
    });

    if (response.ok) {
      console.log('승인 성공');
      window.location.href = 'b-adddata.html';

    } else {
      console.error('승인 실패');
      // 실패 시에 대한 처리
    }
  } catch (error) {
    console.error('승인 요청 에러:', error);
  }
}


// 페이지 로드 시 데이터를 표시
displayData();

