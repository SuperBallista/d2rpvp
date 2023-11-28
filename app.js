const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const moment = require('moment');

const app = express();
const port = 3000;


app.use(session({
  secret: 'asdlk329084', // 임의의 비밀 키
  resave: false,
  saveUninitialized: true,
}));


app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());


// MariaDB 연결 풀 생성(로컬)
function createConnectionPool() {
  return mariadb.createPool({
    host: 'svc.sel3.cloudtype.app:30907',
    user: 'root',
    password: 'd2rbvbpk',
    database: 'd2rpvp',
    connectionLimit: 10,
  });
}

// 테이블 생성 함수
async function createTables(pool) {
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
    pool.end();
  }
}





// 새로운 엔드포인트 추가: POST /process_login
app.post('/process_login', async (req, res) => {
  const { nickname, password } = req.body;
  console.log(nickname)

  // MariaDB 연결 풀에서 연결 가져오기
  const pool = createConnectionPool();
  const connection = await pool.getConnection();

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
    // 연결 반환
    connection.release();
  }
});

// 테이블 생성 호출
const poolForTables = createConnectionPool();
createTables(poolForTables);



// 회원가입 엔드포인트
app.post('/process_regi', async (req, res) => {
  const { nickname, password, email, wgrade } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

    const pool = createConnectionPool();
    const connection = await pool.getConnection();

    const result = await connection.query(
      'INSERT INTO b_user (Nickname, PW, email, BScore, LScore, Class, Lastgame) VALUES (?, ?, ?, 1000, 0, ?, ?)',
      [nickname, hashedPassword, email, wgrade, currentDate]
    );

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
    connection = await createConnectionPool();
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
    // MariaDB 연결 풀에서 연결 가져오기
    const pool = createConnectionPool();
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
    const connection = await createConnectionPool().getConnection();
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

        // 데이터베이스 연결 풀에서 커넥션을 가져옴
        const conn = await createConnectionPool();

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
        conn.end();
        console.log('ok');
        res.status(200).json({ message: '데이터 전송에 성공하였습니다' });
    } catch (error) {
        console.error('Error adding record:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});






app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
