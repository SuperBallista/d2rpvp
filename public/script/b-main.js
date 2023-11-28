// 서버에서 데이터 가져오는 함수
async function fetchDataFromServer() {
    try {
      const response = await fetch('/rankdata'); // 실제 서버 엔드포인트로 수정해야 함
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
      data.forEach((rowData) => {
        addDataToTable(table, rowData);
      });
    } catch (error) {
      console.error('표 갱신 오류:', error);
      // 오류 처리를 수행할 수 있음
    }
  }
  
  // 표에 데이터 추가하는 함수
  function addDataToTable(table, rowData) {
    const row = table.insertRow();
  
    // 데이터 삽입
    rowData.forEach((cellData) => {
      const cell = row.insertCell();
      cell.textContent = cellData;
    });
  }
  
  // 페이지 로딩 시 표 갱신
  updateTableFromServer();
  