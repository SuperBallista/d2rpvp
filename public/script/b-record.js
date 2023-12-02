let userNickname;

// 로그인 후 세션 확인
const checkSession = async () => {
  try {
    const response = await fetch('/check-session');
    const data = await response.json();

    if (data.isLoggedIn) {
      console.log('사용자는 로그인 상태입니다.');
      console.log('사용자 닉네임:', data.user.nickname);
      userNickname = data.user.nickname;
      const nickname = document.querySelector('.shownickname');
      nickname.textContent = data.user.nickname;

      // UI 업데이트 함수 호출
      updateUI();
    } else {
      console.log('사용자는 로그인하지 않았습니다.');
      const hidelabel = document.querySelector('.nav__logouted');
      hidelabel.style.display = 'none';
      const admindelete = document.querySelector('.admin-remove');
      admindelete.style.display = 'none';
      const opp_view = document.querySelector('.opp-record-div');
      opp_view.style.display = 'none';

      // UI 업데이트 함수 호출
      updateUI();
    }
  } catch (error) {
    console.error('세션 확인 오류:', error);
  }
};


// UI 업데이트 함수
const updateUI = () => {


  // 테이블 업데이트 함수 호출
  updateTableFromServer();

  // 여기에 로그아웃 UI 숨김 처리를 추가
  const hidelabel = document.querySelector('.nav__logouted');
  const adminRemove = document.querySelector('.admin-remove');
  const hidelabel2 = document.querySelector('.nav__logined');
  const adminshow = document.querySelector('.nav__logined__admin');
  if (userNickname) {
    // 사용자가 로그인 상태
    hidelabel.style.display = 'none';
    adminRemove.style.display = userNickname === 'admin' ? 'block' : 'none';
    adminshow.style.display = userNickname === 'admin' ? 'block' : 'none';
  } else {
    // 사용자가 로그아웃 상태
    hidelabel.style.display = 'flex';
    hidelabel2.style.display = 'none';
    adminRemove.style.display = 'none';
  }
};



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

// 이 함수는 HTML의 상대 선택 셀렉트 박스를 채우는 역할을 합니다.
async function fillPlayerSelectBoxes() {
    try {
        const nicknames = await getNicknamesFromServer();
        const myNickname = userNickname;

        const playerSelectBox = document.querySelector('.player');

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

        // 상대 선택 박스 채우기
        fillSelectBox(playerSelectBox);
    } catch (error) {
        console.error('선택지 채우기 오류:', error);
        // 오류 처리를 수행할 수 있음
    }
}
// 함수 호출
fillPlayerSelectBoxes();

// 서버에서 레코드 데이터 가져오는 함수
async function fetchDataFromServer() {
    try {
        const response = await fetch('/recorddata'); // 서버 엔드포인트 수정
        if (!response.ok) {
            throw new Error('서버 응답 오류');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('데이터 가져오기 오류:', error);
        throw error; // 오류를 상위로 다시 던지거나 다른 처리를 수행할 수 있음
    }
}

// 서버에서 데이터 가져와서 표에 추가하는 함수
async function updateTableFromServer() {
    try {
        const data = await fetchDataFromServer();

        // 가져온 데이터를 표에 추가
        const table = document.querySelector('.record-table');
        removeAllRows(table); // 기존 행 삭제

        data.forEach((rowData) => {
            addDataToTable(table, rowData);
        });
    } catch (error) {
        console.error('표 갱신 오류:', error);
        // 오류 처리를 수행할 수 있음
    }
}
// 표에 데이터를 추가하는 함수
function addDataToTable(table, rowData) {
  const row = table.insertRow();

  // 데이터 삽입
  Object.values(rowData).forEach((cellData, index) => {
      const cell = row.insertCell();
      cell.textContent = cellData;

      // 데이터가 마지막 열이면서 마지막 행인 경우
      if (index === Object.values(rowData).length - 1) {
          // 관리자(admin)인 경우에만 삭제 버튼 열 추가
          if (userNickname === "admin") {
              addDeleteButtonToRow(row, rowData);
          }
      }
  });
}
// 삭제 버튼을 행에 추가하는 함수
function addDeleteButtonToRow(row, rowData) {
  const deleteButtonCell = row.insertCell();
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '삭제';
  deleteButton.addEventListener('click', async () => {
      try {
          // 해당 행의 OrderNum 가져오기
          const orderNum = rowData.OrderNum;

          // 서버에 삭제 요청 보내기
          const response = await fetch('/delete-row', {
              method: 'DELETE',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ orderNum }),
          });

          if (!response.ok) {
              throw new Error('서버 응답 오류');
          }

          // 서버 응답을 JSON으로 파싱
          const responseData = await response.json();

          // 여기서 필요에 따라 추가적인 동작

          console.log('삭제 성공:', responseData);

          // 삭제 버튼을 누른 행 제거 (DOM에서 삭제)
          row.remove();
      } catch (error) {
          console.error('삭제 오류:', error);
      }
  });
  deleteButtonCell.appendChild(deleteButton);
}


// 테이블 업데이트 함수 호출
updateTableFromServer();

// 여기서 세션 확인 및 UI 업데이트 시작
checkSession();
// 클릭 이벤트를 처리하는 JavaScript 코드
document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('.op-record-link').addEventListener('click', handleOpRecordClick);
});

// 'op-record-link'를 클릭했을 때 실행되는 핸들러 함수
async function handleOpRecordClick(event) {
  try {
    // 이벤트 기본 동작 취소 (링크 이동 방지)
    event.preventDefault();

    const opplayer = document.querySelector('.player').value;

    // 서버에 데이터를 전송하는 fetch API 사용
    const response = await fetch(`/opprecord?opplayer=${opplayer}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('서버 응답 오류');
    }

    // 서버 응답을 JSON 형태로 파싱
    const data = await response.json();
    console.log(data);

    // 서버에서 받은 데이터로 표 업데이트
    updateTableWithData(data);
  } catch (error) {
    console.error('서버 통신 오류:', error);
    // 오류 처리를 수행할 수 있음
  }
}

// 서버에서 받은 데이터로 표를 업데이트하는 함수
function updateTableWithData(data) {
  try {
    // 가져온 데이터를 표에 추가
    const table = document.querySelector('.record-table');

    // 기존 행 삭제
    removeAllRows(table);

    // 새로운 데이터로 표 업데이트
    data.forEach((rowData) => {
      addDataToTable(table, rowData);
    });
  } catch (error) {
    console.error('표 갱신 오류:', error);
    // 오류 처리를 수행할 수 있음
  }
}

// 표에서 모든 행을 삭제하는 함수
function removeAllRows(table) {
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }
}

// 표에 데이터를 추가하는 함수
function addDataToTable(table, rowData) {
  const row = table.insertRow();

  // 데이터 삽입
  Object.values(rowData).forEach((cellData, index) => {
    const cell = row.insertCell();
    cell.textContent = cellData;

    // 데이터가 마지막 열이면서 마지막 행인 경우
    if (index === Object.values(rowData).length - 1) {
      // 관리자(admin)인 경우에만 삭제 버튼 열 추가
      if (userNickname === 'admin') {
        addDeleteButtonToRow(row, rowData);
      }
    }
  });
}

// 테이블 업데이트 함수 호출
updateTableFromServer();

// 여기서 세션 확인 및 UI 업데이트 시작
checkSession();
