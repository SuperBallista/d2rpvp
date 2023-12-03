// 서버에서 데이터 가져오는 함수
async function fetchDataFromServer() {
    try {
      const response = await fetch('/rankdata_m'); // 실제 서버 엔드포인트로 수정해야 함
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
    const table = document.querySelector('.main-table');
    data.forEach((rowData, index, array) => {
      // 데이터에 9번째와 10번째 열이 없을 경우 0으로 채워서 보내줍니다.
      const modifiedRowData = rowData.concat([0, 0]);
      addDataToTable(table, modifiedRowData, index, array.length);
    });
  } catch (error) {
    console.error('표 갱신 오류:', error);
    // 오류 처리를 수행할 수 있음
  }
}

// 표에 데이터 추가하는 함수
function addDataToTable(table, rowData, index, totalRows) {
  const row = table.insertRow();

  // 데이터 삽입
  rowData.forEach((cellData, columnIndex) => {
    const cell = row.insertCell();

    if (columnIndex === 6 || columnIndex === 7) {
      // 7번째 열 또는 8번째 열인 경우 합을 구하고 현재 열에 표시
      cell.textContent = cellData;
    } else if (columnIndex === 8) {
      // 9번째 열인 경우 7번째 값과 8번째 값의 합으로 설정
      const sum7th8thColumn = rowData[6] + rowData[7];
      cell.textContent = sum7th8thColumn;
    } else if (columnIndex === 9) {
      // 10번째 열인 경우 7번째 값을 9번째 값으로 나눈 것을 백분위로 표시
      const tenthCellValue = rowData[6] + rowData[7] === 0 ? 0 : (rowData[6] / (rowData[6] + rowData[7])) * 100;
      cell.textContent = tenthCellValue.toFixed(2) + "%";
    } else if (columnIndex === 0) {
      // 1번째 열의 값을 기준으로 이미지를 표시
      const img = document.createElement('img');
      const rank = index + 1; // 순위 값은 1부터 시작
      const percentage = (rank / totalRows) * 100;
      const imagePath = getRankImagePath(percentage);
      img.src = imagePath;
      img.alt = `Rank ${rank}`;
      cell.appendChild(img);
    } else if (columnIndex === 2) {
      // 3번째 열의 값을 기준으로 클래스 표시
      cell.textContent = cellData === 1 ? "질딘" : cellData === 2 ? "컨센바바" : cellData === 3 ? "늑드루" : "잽마";
    } 
   else if (columnIndex === 1) {
//2번째 열의 값에서 _m 부분 빼기
cell.textContent = cellData.replace('_m','');
  }
    else {
      cell.textContent = cellData;
    }
  });
}






// 상위 %를 기반으로 이미지 경로를 반환하는 함수
function getRankImagePath(percentage) {
  const imageFolder = '../img/'; // 이미지 폴더 경로
  const imageNames = ['5.png', '10.png', '20.png', '30.png', '50.png', '70.png', '100.png'];

  // 상위 %에 따른 이미지 인덱스 계산
  const index = Math.min(Math.floor(percentage / 10), imageNames.length - 1);
  const imageName = imageNames[index];

  return `${imageFolder}${imageName}`;
}

// 페이지 로딩 시 표 갱신
updateTableFromServer();
