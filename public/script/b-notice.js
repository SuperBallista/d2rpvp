    // 텍스트 파일 경로
    const filePath = '../txt/b-notice.txt';

    // XMLHttpRequest를 사용하여 파일 읽기
    const xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const paragraphs = xhr.responseText.split('\n\n'); // 문단 구분은 개행 두 번으로 가정

        // HTML 문서에 삽입
        const paragraphsContainer = document.getElementById('b-rules');
        paragraphs.forEach(paragraph => {
          const pElement = document.createElement('p');
          pElement.innerHTML = paragraph.replace(/\n/g, '<br>'); // 개행을 <br> 태그로 변경
          paragraphsContainer.appendChild(pElement);
        });
      }
    };
    xhr.send();
