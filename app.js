const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const moment = require('moment');
const crypto = require('crypto');


const app = express();
const port = 3000;

let shortdate

const updateuserBScoreQuery = `
  UPDATE b_user
  SET BScore = ?
  WHERE Nickname = ?;
`;

const todaydate = moment().format('YYYY-MM-DD HH:mm:ss');



// 기본 설정
const startscore = 1000;
const wgradebonus = 70;
const k = 16;
const index = 400;
const loser_score_percent = 0.9;
const score_bonus_percent = 0.5;
const penaltyday = 2;
const penalty_percent = 0.05;



app.use(session({
  secret: 'asdlk329084', // 임의의 비밀 키
  resave: false,
  saveUninitialized: true,
}));


app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());



// MariaDB 연결 풀 생성(클라우드)
function createConnectionPool() {
  return mariadb.createPool({
    host: 'd2rpvp',
    user: 'ballista',
    password: 'd2rpvppw',
    database: 'd2rpvpdb',
    connectionLimit: 10,
  });
}





const pool = createConnectionPool(); // 전역으로 풀을 생성



// 테이블 생성 함수
async function createTables() {
  let connection;
  try {
    connection = await pool.getConnection();

    // b_user 테이블 생성
    const createUserTableQuery = `
      CREATE TABLE IF NOT EXISTS b_user (
        Nickname VARCHAR(255) PRIMARY KEY,
        PW VARCHAR(255),
        email VARCHAR(255),
        BScore FLOAT,
        LScore FLOAT,
        Class INT,
        Lastgame DATE
      )
    `;
    await connection.query(createUserTableQuery);
    console.log('b_user Table created successfully');

    // Create admin user
    const adminNickname = 'admin';
    const adminPassword = 'admin_pw'; // You can set a stronger password
    const adminEmail = 'kor8240@gmail.com';
    
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    const insertAdminUserQuery = `
      INSERT INTO b_user (Nickname, PW, email, BScore, LScore, Class, Lastgame)
      VALUES (?, ?, ?, 0, 0, 0, ?)
    `;
    await connection.query(insertAdminUserQuery, [adminNickname, hashedAdminPassword, adminEmail, todaydate]);
    console.log('Admin user created successfully');


    // b_record 테이블 생성
    const createRecordTableQuery = `
      CREATE TABLE IF NOT EXISTS b_record (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        Date DATE,
        Winner VARCHAR(255),
        Loser VARCHAR(255),
        Win2 VARCHAR(255),
        Win3 VARCHAR(255),
        Win4 VARCHAR(255),
        Lose2 VARCHAR(255),
        Lose3 VARCHAR(255),
        Lose4 VARCHAR(255),
        WScore INT,
        LScore INT,
        AddScore FLOAT
      )
    `;
    await connection.query(createRecordTableQuery);
    console.log('b_record Table created successfully');

    // b_temp 테이블 생성
    const createTempTableQuery = `
      CREATE TABLE IF NOT EXISTS b_temp (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        Date DATE,
        Winner VARCHAR(255),
        Loser VARCHAR(255),
        Win2 VARCHAR(255),
        Win3 VARCHAR(255),
        Win4 VARCHAR(255),
        Lose2 VARCHAR(255),
        Lose3 VARCHAR(255),
        Lose4 VARCHAR(255),
        WScore INT,
        LScore INT,
        Checked INT
      )
    `;
    await connection.query(createTempTableQuery);
    console.log('b_temp Table created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    if (connection) {
      connection.release();  
    }
  }
}


// 새로운 엔드포인트 추가: POST /process_login
app.post('/process_login', async (req, res) => {
  const { nickname, password } = req.body;
  console.log(nickname);

  // MariaDB 연결 풀에서 연결 가져오기
  const connection = await pool.getConnection(); // 기존 풀에서 연결 가져오기

  try {
    // 입력 받은 닉네임을 소문자로 변환
    const lowerCaseNickname = nickname.toLowerCase();

    // 해당 닉네임의 사용자 정보를 데이터베이스에서 조회
    const result = await connection.query(
      'SELECT * FROM b_user WHERE Nickname = ?',
      [lowerCaseNickname]
    );

    console.log(result.length);

    if (result.length === 0) {
      // 사용자가 존재하지 않을 경우
      res.status(401).send('사용자가 존재하지 않습니다.');
      return;
    }

    // 비밀번호 검증
    const hashedPassword = result[0].PW;
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (isPasswordValid) {
      // 로그인 성공
      req.session.user = {
        nickname: lowerCaseNickname, // 소문자로 된 닉네임 저장
      };
      res.status(200).send('로그인 성공!');
    } else {
      // 비밀번호 불일치
      res.status(401).send('비밀번호가 일치하지 않습니다.');
    }
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).send('내부 서버 오류');
  } finally {
    // 연결 반환 대신에 release만 호출
    connection.release();
  }
});


// 테이블 생성 호출
createTables();


// 회원가입 엔드포인트
app.post('/process_regi', async (req, res) => {
  const { nickname, password, email, wgrade } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    // 닉네임을 소문자로 변환
    const lowerCaseNickname = nickname.toLowerCase();

    const result = await connection.query(
      'INSERT INTO b_user (Nickname, PW, email, BScore, LScore, Class, Lastgame) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [lowerCaseNickname, hashedPassword, email, startscore - (wgradebonus * (wgrade - 1)), wgradebonus * (wgrade - 1), wgrade, currentDate]
    );

    // 연결 반환 대신에 release만 호출
    connection.release();

    res.json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// 클라이언트에서 보낸 닉네임 중복 확인 요청을 처리
app.post('/check-nickname', async (req, res) => {
  const requestedNickname = req.body.nickname;

  if (!requestedNickname) {
    res.json({ isNameAvailable: false });
    return;
  }

  let connection;
  try {
    // 기존에 생성한 전역 풀을 사용
    connection = await pool.getConnection();

    const result = await connection.query(
      `SELECT COUNT(*) AS count FROM b_user WHERE Nickname = ?`,
      [requestedNickname]
    );

    const isNameAvailable = result[0].count === 0n;
    console.log(result[0].count);
    console.log(result);
    res.json({ isNameAvailable });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connection) {
      connection.end();
    }
  }
});



// 세션 확인 엔드포인트
app.get('/check-session', (req, res) => {
  const isLoggedIn = !!req.session.user; // 세션에 사용자 정보가 있는지 확인

  res.json({
    isLoggedIn: isLoggedIn,
    user: req.session.user || null, // 사용자 정보 반환
  });
});


// 예시: /logout 엔드포인트
app.post('/logout', (req, res) => {
  // 세션 무효화 또는 사용자 로그아웃 처리
  req.session.destroy((err) => {
    if (err) {
      console.error('세션 삭제 오류:', err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } else {
      res.json({ success: true, message: '로그아웃 성공' });
    }
  });
});


// 서버 루트 엔드포인트
app.get('/rankdata', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    console.log('rankdata를 불러오기 위해 풀을 연결했습니다')

    // b_user 테이블에서 데이터 가져오기
    const rankdb = await connection.query('SELECT Nickname, BScore, LScore, Class FROM b_user WHERE Nickname != "admin" ORDER BY (BScore + LScore) DESC');
    const winlose = await connection.query('SELECT winner, win2, win3, win4, loser, lose2, lose3, lose4 FROM b_record');

    console.log('rankdata를 불러오기 위해 데이터를 가져옵니다')

    // 딕셔너리를 만드는 함수
    function createRecordWin(recordWin) {
      const recordDictionary = {};

      // recordData 배열을 순회하며 딕셔너리 생성
      recordWin.forEach(record => {
        const winners = [record.winner, record.win2, record.win3, record.win4];

        winners.forEach(winner => {
          if (winner in recordDictionary) {
            recordDictionary[winner]++;
          } else {
            recordDictionary[winner] = 1;
          }
        });
      });
      console.log('3')
      return recordDictionary;
    }

    // 딕셔너리를 만드는 함수
    function createRecordLose(recordLose) {
      const recordDictionary = {};

      // recordData 배열을 순회하며 딕셔너리 생성
      recordLose.forEach(record => {
        const losers = [record.loser, record.lose2, record.lose3, record.lose4];

        losers.forEach(loser => {
          if (loser in recordDictionary) {
            recordDictionary[loser]++;
          } else {
            recordDictionary[loser] = 1;
          }
        });
      });
      console.log('4')
      return recordDictionary;
    }

    console.log(winlose)

    const recordWin = createRecordWin(winlose);
    const recordLose = createRecordLose(winlose);

    console.log(recordWin, recordLose)

    let result = [];

    function createResultArray(rankdb, recordWin, recordLose) {
      // rankdb 배열을 순회하며 각 열의 값을 계산하고 result에 추가
      rankdb.forEach((user, index) => {
        const row = [];

        // 1. 순위 (데이터베이스에서 이미 정렬된 순서로 받았기 때문에 그대로 사용)
        row.push(index + 1);

        // 2. DB의 Nickname 값
        row.push(user.Nickname);

        // 3. DB의 Class
        row.push(user.Class);

        // 4. BScore + LScore
        const totalScore = user.BScore + user.LScore;
        row.push(totalScore);

        // 5. DB의 BScore
        row.push(user.BScore);

        // 6. DB의 LScore
        row.push(user.LScore);

        // 7. recordWin 딕셔너리에서 Nickname에 해당하는 숫자, 없으면 0
        const wins = recordWin[user.Nickname] || 0;
        row.push(wins);

        // 8. recordLose 딕셔너리에서 Nickname에 해당하는 숫자, 없으면 0
        const losses = recordLose[user.Nickname] || 0;
        row.push(losses);

        // 생성된 행을 result에 추가
        result.push(row);
      });
    }
    console.log('5')

    // createResultArray 함수 호출
    createResultArray(rankdb, recordWin, recordLose);

    // 결과 확인
    console.log(result);
    console.log('6')

    // 연결 반환
    connection.release();

    // 클라이언트에 데이터 응답
    res.json(result);
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// 서버에서 Nickname 목록을 가져오는 엔드포인트
app.get('/api/getNicknames', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();
    const rows = await connection.query('SELECT Nickname FROM b_user WHERE Nickname != "admin"');
    connection.release();

    // Nickname 목록만 추출하여 응답
    const nicknames = rows.map((row) => row.Nickname);
    res.json(nicknames);
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 미승인 기록 보내기
app.use(express.json());
app.post('/submitrecord', async (req, res) => {
    try {
        // 패자의 점수가 올바르지 않은 경우 에러 처리
        const Loserpoint = parseInt(req.body.myScore)
        if (Loserpoint < 0 || Loserpoint >= req.body.winnerScore) {
            throw new Error('패자의 점수가 올바르지 않습니다');
        }

        // 기존에 생성한 전역 풀을 사용
        const conn = await pool.getConnection();

        // 현재 날짜 구하기
        const currentDate = new Date().toISOString().slice(0, 10);

        // 세션에서 로그인된 사용자의 닉네임 가져오기
        const userNickname = req.session.user.nickname;
        console.log(userNickname);

        // 데이터 삽입 쿼리
        const query = `
          INSERT INTO b_temp (Date, Winner, Loser, Win2, Win3, Win4, Lose2, Lose3, Lose4, WScore, LScore, Checked)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        // OrderNum은 AUTO_INCREMENT로 자동 증가하므로 따로 명시하지 않음
        // Checked에는 0을 넣어줌


        const values = [
          currentDate,
            req.body.winner,
            userNickname, // 사용자의 닉네임을 Winner에 넣음
            req.body.winner2,
            req.body.winner3,
            req.body.winner4,
            req.body.loser2,
            req.body.loser3,
            req.body.loser4,
            req.body.winnerScore,
            req.body.myScore,
            0, // Checked에는 0을 넣어줌
        ];

        // 쿼리 실행
        await conn.query(query, values);

        // 커넥션 반환
        conn.release();
        console.log('ok');
        res.status(200).json({ message: '데이터 전송에 성공하였습니다' });
    } catch (error) {
        console.error('Error adding record:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});


// 백엔드에서 Mysql로부터 데이터를 불러오는 함수
async function fetchDataFromDatabase(sessionNickName) {
  const connection = await pool.getConnection(); // 기존 연결 대신 풀에서 연결 가져오기

  try {
    // 여기서 쿼리를 작성해서 데이터를 불러옵니다.
    const query = `
      SELECT OrderNum, Date, Loser, Win2, Win3, Win4, Lose2, Lose3, Lose4, WScore, LScore
      FROM b_temp
      WHERE Checked = 0 AND Winner = ?;
    `;

    console.log(sessionNickName.nickname);

    const results = await connection.query(query, [sessionNickName.nickname]);
    console.log(results);

    return results;
  } catch (error) {
    console.error('Error fetching data from database:', error);
    return [];
  } finally {
    connection.release(); // 사용이 끝난 연결을 다시 풀에 반환합니다.
  }
}

// 백엔드에서 데이터를 받아서 프론트에 전달
app.get('/no_approved_record', async (req, res) => {
  try {
    const sessionNickName = req.session.user; // 세션에 저장된 닉네임 가져오기
    const data = await fetchDataFromDatabase(sessionNickName);
    res.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Internal Server Error');
  }
});



// 미승인 기록 삭제
app.post('/delete-record', async (req, res) => {
  const orderNum = req.body.orderNum;

  if (!orderNum) {
    console.log(orderNum)

    return res.status(400).json({ error: 'Invalid OrderNum' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const updateQuery = `
      UPDATE b_temp
      SET Checked = 1
      WHERE OrderNum = ?;
    `;
    console.log('updated')
    await connection.query(updateQuery, [orderNum]);

    res.status(200).json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error updating record in database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connection) {
      connection.release(); // 연결 반환
    }
  }
});



// 승인 처리
app.post('/approve-record', async (req, res) => {
  const orderNum = req.body.orderNum;

  if (!orderNum) {
    return res.status(400).json({ error: 'Invalid OrderNum' });
  }

  const connection = await pool.getConnection();

  try {
    // b_temp 테이블에서 Checked 값을 2로 업데이트
    const updateCheckedQuery = `
      UPDATE b_temp
      SET Checked = 2
      WHERE OrderNum = ?;
    `;
    await connection.query(updateCheckedQuery, [orderNum]);

    // b_temp 테이블에서 데이터를 가져옴
    const selectQuery = `
      SELECT *
      FROM b_temp
      WHERE OrderNum = ?;
    `;
    const selectedData = await connection.query(selectQuery, [orderNum]);
    const recordData = selectedData[0];

    // b_record 테이블에 데이터 삽입
    const insertQuery = `
      INSERT INTO b_record (Date, Winner, Loser, Win2, Win3, Win4, Lose2, Lose3, Lose4, WScore, LScore)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;


    // b_record 테이블에 변화값 삽입
    const changedscorerecord = `
    UPDATE b_record
    SET AddScore = ?
    WHERE OrderNum = (
      SELECT MAX(OrderNum)
      FROM b_record
    );
    `;

    await connection.query(insertQuery, [
      recordData.Date,
      recordData.Winner,
      recordData.Loser,
      recordData.Win2,
      recordData.Win3,
      recordData.Win4,
      recordData.Lose2,
      recordData.Lose3,
      recordData.Lose4,
      recordData.WScore,
      recordData.LScore,
    ]);
    console.log('approved1')

    const winner = recordData.Winner
    const loser = recordData.Loser
    const lose2 = recordData.Lose2
    const lose3 = recordData.Lose3
    const lose4 = recordData.Lose4
    const win2 = recordData.Win2
    const win3 = recordData.Win3
    const win4 = recordData.Win4
    const wscore = recordData.WScore
    const lscore = recordData.LScore
    



    // b_user 테이블에서 Winner의 BScore 값을 불러오기
    const winnerBScoreQuery = `
      SELECT BScore
      FROM b_user
      WHERE nickname = ?;
    `;
    const winnerBScoreResult = await connection.query(winnerBScoreQuery, [recordData.Winner]);
    let winnerBScore = winnerBScoreResult[0]?.BScore || 0;
    console.log('approved2')

    // 함수를 통해 BScore 값을 가져오는 로직
    const getBScore = async (nickname) => {
      if (nickname) {
        const query = `
          SELECT BScore
          FROM b_user
          WHERE nickname = ?;
        `;
        const result = await connection.query(query, [nickname]);
        return result[0]?.BScore || 0;
      } else {
        return 0;
      }
    };

    // b_user 테이블에서 win2, win3, win4의 BScore 값을 불러오기
    let win2BScore = await getBScore(recordData.Win2);
    let win3BScore = await getBScore(recordData.Win3);
    let win4BScore = await getBScore(recordData.Win4);

    // b_user 테이블에서 loser의 BScore 값을 불러오기
    let loserBScore = await getBScore(recordData.Loser);

    // b_user 테이블에서 lose2, lose3, lose4의 BScore 값을 불러오기
    let lose2BScore = await getBScore(recordData.Lose2);
    let lose3BScore = await getBScore(recordData.Lose3);
    let lose4BScore = await getBScore(recordData.Lose4);


    
let add_score = 0
console.log('approved3')
console.log(winnerBScore+win2BScore+win3BScore+win4BScore)
switch(winnerBScore+win2BScore+win3BScore+win4BScore){
case winnerBScore:
add_score = (1+score_bonus_percent*(wscore-lscore-1))*k*(1-1/(10^((loserBScore-winnerBScore)/index)+1))
winnerBScore = winnerBScore + add_score
loserBScore = loserBScore - add_score*loser_score_percent




try {
  await connection.query(changedscorerecord, [add_score]);
  console.log(`대전기록에 변화값 기록 ${add_score}`);

} catch (error) {
  console.error('Error setting add_score:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery, [loserBScore, loser]);
  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${loserBScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}

try {
  console.log(winner)
  await connection.query(updateuserBScoreQuery, [winnerBScore, winner]);
  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${winnerBScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}

break;
case winnerBScore+win2BScore:
add_score = (1+score_bonus_percent*(wscore-lscore-1))*k*(1-1/(10^(((loserBScore+lose2BScore-winnerBScore-win2BScore)/2)/index)+1))
winnerBScore = winnerBScore + add_score
win2BScore = win2BScore + add_score
loserBScore = loserBScore - add_score*loser_score_percent
lose2BScore = lose2BScore - add_score*loser_score_percent



try {
  await connection.query(changedscorerecord, [add_score]);
  console.log(`대전기록에 변화값 기록 ${add_score}`);

} catch (error) {
  console.error('Error setting add_score:', error);
  // 에러 처리 로직 추가
}


try {
    await connection.query(updateuserBScoreQuery, [loserBScore, loser]);
    console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${loserBScore}`);
  
  } catch (error) {
    console.error('Error getting loser BScore:', error);
    // 에러 처리 로직 추가
  }
  
  try {
    await connection.query(updateuserBScoreQuery, [winnerBScore, winner]);
    console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${winnerBScore}`);
  
  } catch (error) {
    console.error('Error getting winner BScore:', error);
    // 에러 처리 로직 추가
  }
  


  try {
      await connection.query(updateuserBScoreQuery, [lose2BScore, lose2]);
      console.log(`Lose2의 BScore를 업데이트했습니다. 새로운 BScore: ${lose2BScore}`);
    
    } catch (error) {
      console.error('Error getting lose2 BScore:', error);
      // 에러 처리 로직 추가
    }
    
    try {
      await connection.query(updateuserBScoreQuery, [win2BScore, win2]);
      console.log(`Win2의 WScore를 업데이트했습니다. 새로운 BScore: ${win2BScore}`);
    
    } catch (error) {
      console.error('Error getting win2 BScore:', error);
      // 에러 처리 로직 추가
    }
    
  












break;
case winnerBScore+win2BScore+win3BScore:
add_score = (1+score_bonus_percent*(wscore-lscore-1))*k*(1-1/(10^(((loserBScore+lose2BScore+lose3BScore-winnerBScore-win2BScore-win3BScore)/3)/index)+1))

winnerBScore = winnerBScore + add_score
win2BScore = win2BScore + add_score
win3BScore = win3BScore + add_score

loserBScore = loserBScore - add_score*loser_score_percent
lose2BScore = lose2BScore - add_score*loser_score_percent
lose3BScore = lose3BScore - add_score*loser_score_percent


try {
  await connection.query(changedscorerecord, [add_score]);
  console.log(`대전기록에 변화값 기록 ${add_score}`);

} catch (error) {
  console.error('Error setting add_score:', error);
  // 에러 처리 로직 추가
}

try {
  await connection.query(updateuserBScoreQuery, [loserBScore, loser]);
  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${loserBScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}

try {
  await connection.query(updateuserBScoreQuery, [winnerBScore, winner]);
  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${winnerBScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}




try {
    await connection.query(updateuserBScoreQuery, [lose2BScore, lose2]);
    console.log(`Lose2의 BScore를 업데이트했습니다. 새로운 BScore: ${lose2BScore}`);
  
  } catch (error) {
    console.error('Error getting lose2 BScore:', error);
    // 에러 처리 로직 추가
  }
  
  try {
    await connection.query(updateuserBScoreQuery, [win2BScore, win2]);
    console.log(`Win2의 WScore를 업데이트했습니다. 새로운 BScore: ${win2BScore}`);
  
  } catch (error) {
    console.error('Error getting winn2 BScore:', error);
    // 에러 처리 로직 추가
  }
  


  try {
      await connection.query(updateuserBScoreQuery, [lose3BScore, lose3]);
      console.log(`Lose3의 BScore를 업데이트했습니다. 새로운 BScore: ${lose3BScore}`);
    
    } catch (error) {
      console.error('Error getting lose3 BScore:', error);
      // 에러 처리 로직 추가
    }
    
    try {
      await connection.query(updateuserBScoreQuery, [win3BScore, win3]);
      console.log(`Win3의 WScore를 업데이트했습니다. 새로운 BScore: ${win3BScore}`);
    
    } catch (error) {
      console.error('Error getting win3 BScore:', error);
      // 에러 처리 로직 추가
    }
    





break;
default:
  add_score = (1+score_bonus_percent*(wscore-lscore-1))*k*(1-1/(10^(((loserBScore+lose2BScore+lose3BScore+lose4BScore-winnerBScore-win2BScore-win3BScore-win4BScore)/4)/index)+1))

  winnerBScore = winnerBScore + add_score
  win2BScore = win2BScore + add_score
  win3BScore = win3BScore + add_score
  win4BScore = win4BScore + add_score

  loserBScore = loserBScore - add_score*loser_score_percent
  lose2BScore = lose2BScore - add_score*loser_score_percent
  lose3BScore = lose3BScore - add_score*loser_score_percent
  lose4BScore = lose4BScore - add_score*loser_score_percent

  
try {
  await connection.query(changedscorerecord, [add_score]);
  console.log(`대전기록에 변화값 기록 ${add_score}`);

} catch (error) {
  console.error('Error setting add_score:', error);
  // 에러 처리 로직 추가
}


  try {
    await connection.query(updateuserBScoreQuery, [loserBScore, loser]);
    console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${loserBScore}`);
  
  } catch (error) {
    console.error('Error getting loser BScore:', error);
    // 에러 처리 로직 추가
  }
  
  try {
    await connection.query(updateuserBScoreQuery, [winnerBScore, winner]);
    console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${winnerBScore}`);
  
  } catch (error) {
    console.error('Error getting winner BScore:', error);
    // 에러 처리 로직 추가
  }
  
  
  
  
  try {
      await connection.query(updateuserBScoreQuery, [lose2BScore, lose2]);
      console.log(`Lose2의 BScore를 업데이트했습니다. 새로운 BScore: ${lose2BScore}`);
    
    } catch (error) {
      console.error('Error getting lose2 BScore:', error);
      // 에러 처리 로직 추가
    }
    
    try {
      await connection.query(updateuserBScoreQuery, [win2BScore, win2]);
      console.log(`Win2의 WScore를 업데이트했습니다. 새로운 BScore: ${win2BScore}`);
    
    } catch (error) {
      console.error('Error getting winn2 BScore:', error);
      // 에러 처리 로직 추가
    }
    
  
  
    try {
        await connection.query(updateuserBScoreQuery, [lose3BScore, lose3]);
        console.log(`Lose3의 BScore를 업데이트했습니다. 새로운 BScore: ${lose3BScore}`);
      
      } catch (error) {
        console.error('Error getting lose3 BScore:', error);
        // 에러 처리 로직 추가
      }
      
      try {
        await connection.query(updateuserBScoreQuery, [win3BScore, win3]);
        console.log(`Win3의 WScore를 업데이트했습니다. 새로운 BScore: ${win3BScore}`);
      
      } catch (error) {
        console.error('Error getting win3 BScore:', error);
        // 에러 처리 로직 추가
      }
      
  
      try {
          await connection.query(updateuserBScoreQuery, [lose4BScore, lose4]);
          console.log(`Lose4의 BScore를 업데이트했습니다. 새로운 BScore: ${lose4BScore}`);
        
        } catch (error) {
          console.error('Error getting lose4 BScore:', error);
          // 에러 처리 로직 추가
        }
        
        try {
          await connection.query(updateuserBScoreQuery, [win4BScore, win4]);
          console.log(`Win4의 WScore를 업데이트했습니다. 새로운 BScore: ${win4BScore}`);
        
        } catch (error) {
          console.error('Error getting win4 BScore:', error);
          // 에러 처리 로직 추가
        }

}


res.status(200).json({ message: 'Record approved and moved to b_record successfully' });
} catch (error) {
  console.error('Error approving and moving record in database:', error);
  res.status(500).json({ error: 'Internal Server Error' });
} finally {
  connection.release();
}
});

// 서버 레코드 데이터 가져오는 엔드포인트
app.get('/recorddata', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    // b_record 테이블에서 데이터 가져오기
    const allrecord = await connection.query('SELECT OrderNum, Date, Winner, win2, win3, win4, loser, lose2, lose3, lose4, wscore, lscore, AddScore FROM b_record');
    connection.release();

    // 날짜 형식 포맷 변경
    const formattedRecords = allrecord.map(record => {
      return {
        ...record,
        Date: new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(record.Date))
      };
    });

    res.json(formattedRecords);
  } catch (error) {
    console.error('기록 불러오기 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});


// 암호 변경 엔드포인트
app.post('/process_changepw', async (req, res) => {
  try {
    console.log('암호변경 요청 확인')
    // 세션에서 사용자 정보 가져오기
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 프론트엔드에서 전송한 암호 데이터
    const { nowpw, newpw } = req.body;

    // 사용자의 현재 암호 확인
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT pw FROM b_user WHERE Nickname = ?', [user.nickname]);
    connection.release();

    if (result.length === 0) {
      console.log('사용자를 찾지 못함')
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const currentPasswordHash = result[0].pw;

    // 현재 암호 검증
    const passwordMatch = await bcrypt.compare(nowpw, currentPasswordHash);

    if (!passwordMatch) {
      return res.status(401).json({ error: '현재 암호가 일치하지 않습니다.' });
    }

    // 새로운 암호 해시 생성
    const newPasswordHash = await bcrypt.hash(newpw, 10);

    // 새로운 암호로 업데이트
    const updateResult = await connection.query('UPDATE b_user SET pw = ? WHERE Nickname = ?', [newPasswordHash, user.nickname]);

    if (updateResult.affectedRows === 1) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: '암호 업데이트에 실패했습니다.' });
    }
  } catch (error) {
    console.error('암호 변경 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});



// 이메일 변경 엔드 포인트
app.post('/process_changeemail', async (req, res) => {
  try {
    console.log('이메일변경 요청 확인');

    // 세션에서 사용자 정보 가져오기
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 프론트엔드에서 전송한 이메일 및 암호 데이터
    const { nowpw, newemail } = req.body;

// 사용자의 현재 암호 확인
const connection = await pool.getConnection();
const result = await connection.query('SELECT pw FROM b_user WHERE Nickname = ?', [user.nickname]);
connection.release();

if (result.length === 0) {
  console.log('사용자를 찾지 못함');
  return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
}

const currentPasswordHash = result[0].pw;

// 현재 암호 검증
const passwordMatch = await bcrypt.compare(nowpw, currentPasswordHash);

if (!passwordMatch) {
  return res.status(401).json({ error: '현재 암호가 일치하지 않습니다.' });
}


    // 새로운 이메일로 업데이트
    const updateResult = await connection.query('UPDATE b_user SET email = ? WHERE Nickname = ?', [newemail, user.nickname]);

    if (updateResult.affectedRows === 1) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: '이메일 업데이트에 실패했습니다.' });
    }
  } catch (error) {
    console.error('이메일 변경 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});




// 임시 비밀번호 요청 엔드 포인트
app.post('/process_emailpw', async (req, res) => {
  try {
    console.log('임시 암호 전송 확인 요청');


    // 프론트엔드에서 전송한 이메일 및 암호 데이터
    const { findpw_nickname, findpw_email } = req.body;


// 사용자의 현재 이메일
const connection = await pool.getConnection();
const result = await connection.query('SELECT email FROM b_user WHERE Nickname = ?', [findpw_nickname]);
connection.release();

if (result.length === 0) {
  console.log('사용자를 찾지 못함');
  return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
}

const correctemail = result[0].pw;

// 이메일 비교

if (!correctemail==findpw_email) {
  return res.status(401).json({ error: 'Email error' });
}


    // 임시 비밀번호 발급
    function generateRandomPassword(length) {
      // 가능한 문자셋
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
      let password = '';
      for (let i = 0; i < length; i++) {
        // charset에서 무작위 문자 선택
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }
    
      return password;
    }
    
    // 10자리의 무작위 임시 비밀번호 생성
    const temporaryPassword = generateRandomPassword(10);
    

    // 새로운 암호 해시 생성
    const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 10);

    // 새로운 암호로 업데이트
    const temp_password_input = await connection.query('UPDATE b_user SET pw = ? WHERE Nickname = ?', [temporaryPasswordHash, findpw_nickname]);


    if (temp_password_input.affectedRows === 1) {
      console.log(findpw_nickname, temporaryPassword);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: '암호 업데이트에 실패했습니다.' });
    }

      } catch (error) {
    console.error('서버 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});


// 사용자 정보를 반환하는 엔드포인트
app.get('/user_data', async (req, res) => {
  try {
    // 세션에서 사용자 정보 가져오기
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 사용자 정보 쿼리
    const connection = await pool.getConnection();
    const userResult = await connection.query('SELECT * FROM b_user WHERE Nickname = ?', [user.nickname]);

    if (userResult.length === 0) {
      connection.release();
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 사용자 전적 쿼리
    const recordResult = await connection.query(`
      SELECT
        COUNT(*) AS countwin,
        (SELECT COUNT(*) FROM b_record WHERE loser = ? OR lose2 = ? OR lose3 = ? OR lose4 = ?) AS countlose
      FROM b_record
      WHERE winner = ? OR win2 = ? OR win3 = ? OR win4 = ?
    `, [user.nickname, user.nickname, user.nickname, user.nickname, user.nickname, user.nickname, user.nickname, user.nickname]);

    connection.release();

    
    // BigInt를 문자열로 변환
    const userData = {
      nickname: user.nickname,
      email: userResult[0].email,
      tscore: (userResult[0].BScore + userResult[0].LScore).toString(),
      bscore: userResult[0].BScore.toString(),
      lscore: userResult[0].LScore.toString(),
      lastdate: userResult[0].Lastgame,
      weapon: userResult[0].Class,
      countwin: recordResult[0].countwin.toString(),
      countlose: recordResult[0].countlose.toString(),
      countrecord: (recordResult[0].countwin + recordResult[0].countlose).toString(),
    };
    
    res.json(userData);
  } catch (error) {
    console.error('사용자 정보 가져오기 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});




// 어드민 점수 부여 엔드포인트
app.post('/submit-admin-score', async (req, res) => {
  const adminright = req.session.user.nickname; // 세션에 저장된 닉네임이 관리자인지 확인
  const player = req.body.player;
  const adminscore = req.body.playerScore;
  console.log(adminright)

  if (adminright!=='admin') {

    return res.status(400).json({ message: '권한이 없습니다' });
  }


  let connection;
  try {
    connection = await pool.getConnection();

    const updateScoreQuery = `
      UPDATE b_user
      SET LScore = LScore + ?
      WHERE Nickname = ?;
    `;
    console.log('updated')
    await connection.query(updateScoreQuery, [adminscore, player]);

    res.status(200).json({ message: 'Lscore update successfully' });
  } catch (error) {
    console.error('Error updating record in database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connection) {
      connection.release(); // 연결 반환
    }
  }
});





// 정의되지 않은 변수를 상단에 추가
const updateBScoreQuery1 = `
  UPDATE b_user
  SET BScore = BScore - ?  -- subtract AddScore for winners
  WHERE Nickname IN (?, ?, ?, ?);
`;

const updateBScoreQuery2 = `
  UPDATE b_user
  SET BScore = BScore + ?  -- add AddScore for losers
  WHERE Nickname IN (?, ?, ?, ?);
`;

//승인된 기록 삭제하기

app.delete('/delete-row', async (req, res) => {

  const adminright = req.session.user.nickname; // 세션에 저장된 닉네임이 관리자인지 확인
  const player = req.body.player;
  const adminscore = req.body.playerScore;
  console.log(adminright)

  if (adminright!=='admin') {

    return res.status(400).json({ message: '권한이 없습니다' });
  }




  try {
    const orderNum = req.body.orderNum;

    // Fetch the row data from b_record using OrderNum
    const connection = await pool.getConnection();
    const selectRecordQuery = `
      SELECT Winner, Win2, Win3, Win4, Loser, Lose2, Lose3, Lose4, AddScore
      FROM b_record
      WHERE OrderNum = ?;
    `;
    const recordRow = await connection.query(selectRecordQuery, [orderNum]);
    connection.release();

    if (recordRow.length === 0) {
      return res.status(404).json({ error: 'Row not found' });
    }

    // Start a transaction
    const connection2 = await pool.getConnection();
    await connection2.beginTransaction();

    try {
      const winnerNicknames = [recordRow[0].Winner, recordRow[0].Win2, recordRow[0].Win3, recordRow[0].Win4];
      const loserNicknames = [recordRow[0].Loser, recordRow[0].Lose2, recordRow[0].Lose3, recordRow[0].Lose4];

      // Execute the first update query within the transaction for winners
      await connection2.query(updateBScoreQuery1, [
        recordRow[0].AddScore,
        ...winnerNicknames,
      ]);

      // Execute the second update query within the transaction for losers
      await connection2.query(updateBScoreQuery2, [
        // Modify the calculation for losers using loser_score_percent
        recordRow[0].AddScore * loser_score_percent,
        ...loserNicknames,
      ]);

      // Delete the row from b_record
      const deleteRecordQuery = `
        DELETE FROM b_record
        WHERE OrderNum = ?;
      `;
      await connection2.query(deleteRecordQuery, [orderNum]);

      // Commit the transaction
      await connection2.commit();
      connection2.release();

      res.status(200).json({ message: 'Row deleted successfully' });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection2.rollback();
      connection2.release();
      throw error;
    }

  } catch (error) {
    console.error('삭제 오류:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// 서버 레코드 상대전적 데이터 가져오는 엔드포인트
app.get('/opprecord', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    const user = req.session.user.nickname;
    const op_player_nickname = req.query.opplayer;
console.log(user, op_player_nickname)

    // b_record 테이블에서 데이터 가져오기
    const opprecordQuery = `
    SELECT OrderNum, Date, Winner, win2, win3, win4, loser, lose2, lose3, lose4, wscore, lscore, AddScore
    FROM b_record
    WHERE
      (win2 IS NULL AND Winner = ? AND loser = ? )
      OR
      (win2 IS NULL AND loser = ? AND Winner = ? )
    ORDER BY OrderNum;
    `
    const opprecord = await connection.query(opprecordQuery, [user, op_player_nickname, user, op_player_nickname])

    connection.release();

    // 날짜 형식 포맷 변경
    const formattedRecords = opprecord.map(record => {
      return {
        ...record,
        Date: new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(record.Date))
      };
    });
console.log('상대전적 보내기 확인')
    res.json(formattedRecords);
  } catch (error) {
    console.error('기록 불러오기 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});


// 대전 점수를 리셋하는 엔드포인트
app.post('/reset-score-endpoint', async (req, res) => {
  try {
    // MariaDB 연결 풀에서 연결 가져오기
    const connection = await pool.getConnection();

    // Class가 1인 경우 BScore를 1000으로, Class가 2인 경우 BScore를 930으로 업데이트
    await connection.query('UPDATE b_user SET BScore = CASE WHEN Class = 1 THEN 1000 WHEN Class = 2 THEN 930 END');

    // B_record에서 winner에 해당하는 행을 찾아 BScore 업데이트
    await connection.query(`
      UPDATE b_user
      SET BScore = BScore + IFNULL(
        (SELECT SUM(AddScore) FROM b_record WHERE winner = b_user.Nickname OR win2 = b_user.Nickname OR win3 = b_user.Nickname OR win4 = b_user.Nickname),
        0
      )
    `);

    // B_record에서 loser에 해당하는 행을 찾아 BScore 업데이트
    await connection.query(`
      UPDATE b_user
      SET BScore = BScore - IFNULL(
        (SELECT SUM(AddScore * ?) FROM b_record WHERE loser = b_user.Nickname OR lose2 = b_user.Nickname OR lose3 = b_user.Nickname OR lose4 = b_user.Nickname),
        0
      )
    `, [loser_score_percent]);

    // 연결 반환 대신에 release만 호출
   
    connection.release();

    res.json({ success: true, message: '대전점수가 재계산되었습니다.' });
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});



// 서버 시작
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
