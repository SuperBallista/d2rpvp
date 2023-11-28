document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.querySelector('.nickname');
    const nameCheckButton = document.querySelector('.namecheck');
    const registerButton = document.querySelector('.register');
    const pw = document.querySelector('.newpw');
    const pwcheck = document.querySelector('.newpwcheck');
    const emailinput = document.querySelector('.email');
    const wgrade = document.querySelector('.wgrade');



    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }


    function regi() {
        const formData = {
            nickname: nameInput.value,
            password: pw.value,
            email: emailinput.value,
            wgrade: wgrade.value
        };

        fetch('/process_regi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);

                // 예시: 성공했을 때의 처리
                if (data.success) {
                    alert('계정 등록이 완료되었습니다.');
window.location.href = 'b-main.html';


                } else {
                    alert('계정 등록에 실패하였습니다.');
                    window.location.href = 'b-regi.html';
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }



    nameCheckButton.addEventListener('click', function () {
      const nickname = nameInput.value;
  
      if (!nickname) {
        alert('닉네임을 입력하세요.');
        return;
      }
  
      // 서버로 닉네임 중복 확인 요청 보내기
      fetch('/check-nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname }),
      })
        .then(response => response.json())
        .then(data => {
            console.log(data.isNameAvailable);
          if (data.isNameAvailable) {
            alert('사용 가능한 닉네임입니다.');
            registerButton.disabled = false; // 등록 버튼 활성화
            nameInput.readOnly = true;
            nameCheckButton.disabled = true;

          } else {
            alert('이미 사용 중인 닉네임입니다.');
            registerButton.disabled = true; // 등록 버튼 비활성화
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    });
  
    registerButton.addEventListener('click', function (event) {
        event.preventDefault();
    
        if (pw.value === pwcheck.value) {
            console.log('pw checked');
    
            if (isValidEmail(emailinput.value)) {
                console.log('email checked');
                regi();
            } else {
                alert('올바르지 않은 이메일 형식입니다.');
            }
        } else {
            alert('암호가 일치하지 않습니다.');
        }
    });
    
    });
    