const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const moment = require('moment');

const app = express();
const port = 3000;


const updateuserBScoreQuery = `
  UPDATE b_user
  SET BScore = ?
  WHERE Nickname = ?;
`;




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

    // b_record 테이블 생성
    const createRecordTableQuery = `
      CREATE TABLE IF NOT EXISTS b_record (
        OrderNum INT PRIMARY KEY,
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
        LScore INT
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
  console.log(nickname)

  // MariaDB 연결 풀에서 연결 가져오기
  const connection = await pool.getConnection(); // 기존 풀에서 연결 가져오기

  try {

    // 해당 닉네임의 사용자 정보를 데이터베이스에서 조회
    const result = await connection.query(
      'SELECT * FROM b_user WHERE Nickname = ?',
      [nickname]
    );
console.log(result.length)
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
        nickname: nickname,
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

    const result = await connection.query(
      'INSERT INTO b_user (Nickname, PW, email, BScore, LScore, Class, Lastgame) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nickname, hashedPassword, email, startscore - (wgradebonus * (wgrade - 1)), wgradebonus * (wgrade - 1), wgrade, currentDate]
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

    console.log('1')

    // b_user 테이블에서 데이터 가져오기
    const rankdb = await connection.query('SELECT Nickname, BScore, LScore, Class FROM b_user ORDER BY (BScore + LScore) DESC');
    const winlose = await connection.query('SELECT winner, win2, win3, win4, loser, lose2, lose3, lose4 FROM b_record');

    console.log(rankdb)
    console.log(winlose)
    console.log('2')

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
        const losers = [record.Loser, record.lose2, record.lose3, record.lose4];

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
    const rows = await connection.query('SELECT Nickname FROM b_user');
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
    
console.log(recordData.Winner, winner)    



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
console.log(add_score, wscore, lscore)
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
    console.log(add_score, wscore, lscore)
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
  console.log(add_score, wscore, lscore)
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
    console.log(add_score, wscore, lscore)
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
    console.log(add_score, wscore, lscore)
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
      console.log(add_score, wscore, lscore)
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
        console.log(add_score, wscore, lscore)
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
    const allrecord = await connection.query('SELECT Date, Winner, win2, win3, win4, loser, lose2, lose3, lose4, wscore, lscore FROM b_record');
    connection.release();
    console.log(allrecord)
    res.json(allrecord)
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
console.log(nowpw, currentPasswordHash)
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





app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
