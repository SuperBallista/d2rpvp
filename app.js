const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { connect } = require('http2');
const { error } = require('console');

const nodemailer = require('nodemailer');

// 생성한 App Password
const appPassword = 'uruq bvpd okbl gzax';

// 메일 전송 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kor8240@gmail.com', // 발신자 이메일 주소
    pass: appPassword, // 생성한 App Password
  },
});



const teams2ScoreB = {Championship: 15};
const teams4ScoreB = {Championship: 30};
const teams8ScoreB = {Championship: 40, Runner_up: 30, Place3rd: 15};
const teams16ScoreB = {Championship: 60, Runner_up: 40, Place3rd: 30, Semifinalist: 15};
const teams24ScoreB = {Championship: 70, Runner_up: 50, Place3rd: 35, Semifinalist: 15, Quarterfinalist: 5};
const teams32ScoreB = {Championship: 80, Runner_up: 60, Place3rd: 40, Semifinalist: 30, Quarterfinalist: 15};

const teams2ScoreM = {Championship: 10};
const teams4ScoreM = {Championship: 15};
const teams8ScoreM = {Championship: 30, Runner_up: 23, Place3rd: 16};
const teams16ScoreM = {Championship: 63, Runner_up: 27, Place3rd: 21, Semifinalist: 14};
const teams24ScoreM = {Championship: 75, Runner_up: 34, Place3rd: 24, Semifinalist: 17, Quarterfinalist: 8};
const teams32ScoreM = {Championship: 90, Runner_up: 60, Place3rd: 29, Semifinalist: 19, Quarterfinalist: 11};


const app = express();

const updateuserBScoreQuery = `
  UPDATE b_user
  SET BScore = ?
  WHERE Nickname = ?;
`;

const updateuserBScoreQuery_m = `
UPDATE m_user
SET BScore = ?
WHERE Nickname = ?;
`;

const todaydate = moment().format('YYYY-MM-DD HH:mm:ss');



// 기본 설정
const startscore = 2000;
let add_score;
let subtractScore;

const startscore_b = 1000
const wintimes = 5
const losetimes = 4.5


app.use(session({
  secret: 'asdlk329084', // 임의의 비밀 키
  resave: false,
  saveUninitialized: true,
}));


app.use(express.static(path.join(__dirname, 'frontend/build')));
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






function getCurrentTime() {
  return new Date();
}





const pool = createConnectionPool(); // 전역으로 풀을 생성


// 어드민 계정 생성
async function createAdmin() {
let connection;
  try{
connection = await pool.getConnection();

    // Create admin user
    const adminNickname = 'admin';
    const adminPassword = 'admin_pw'; // You can set a stronger password
    const adminEmail = 'kor8240@gmail.com';
    
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    const insertAdminUserQuery = `
      INSERT INTO b_user (Nickname, PW, email, BScore, LScore, Class, Lastgame)
      VALUES (?, ?, ?, 0, 0, 0, ?)
    `;
    const insertAdminUserQuery_m = `
      INSERT INTO m_user (Nickname, PW, email, BScore, LScore, Class, Lastgame)
      VALUES (?, ?, ?, 0, 0, 0, ?)
    `;
    
    // Create admin user
    await connection.query(insertAdminUserQuery_m, [adminNickname + "_m", hashedAdminPassword, adminEmail, todaydate]);
    console.log('Admin_m user created successfully');
    await connection.query(insertAdminUserQuery, [adminNickname, hashedAdminPassword, adminEmail, todaydate]);
    console.log('Admin_b user created successfully');


}  catch (error) {
  console.error('Error creating admin:', error);
} finally {
  if (connection) {
    connection.release();  
  }
}
}




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
        LScore FLOAT NOT NULL,
        Class INT,
        Lastgame DATE
      )
    `;
    await connection.query(createUserTableQuery);
    console.log('b_user Table created successfully');

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

    // m_user 테이블 생성
    const createUserTableQuery_m = `
      CREATE TABLE IF NOT EXISTS m_user (
        Nickname VARCHAR(255) PRIMARY KEY,
        PW VARCHAR(255),
        email VARCHAR(255),
        BScore FLOAT,
        LScore FLOAT NOT NULL,
        Class INT,
        Lastgame DATE
      )
    `;
    await connection.query(createUserTableQuery_m);
    console.log('m_user Table created successfully');

    // m_record 테이블 생성
    const createRecordTableQuery_m = `
      CREATE TABLE IF NOT EXISTS m_record (
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
    await connection.query(createRecordTableQuery_m);
    console.log('m_record Table created successfully');

    // m_temp 테이블 생성
    const createTempTableQuery_m = `
      CREATE TABLE IF NOT EXISTS m_temp (
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
    await connection.query(createTempTableQuery_m);
    console.log('m_temp Table created successfully');

    // bet_info 테이블 생성
    const createbet_infoTableQuery = `
    CREATE TABLE IF NOT EXISTS bet_info (
      nicknamelist VARCHAR(255) PRIMARY KEY,
      place VARCHAR(255),
      endtime DATETIME
      )
    `;
    await connection.query(createbet_infoTableQuery);
    console.log('bet_info Table created successfully');

    // b_betting 테이블 생성
    const createb_bettingTableQuery = `
      CREATE TABLE IF NOT EXISTS b_betting (
        nickname VARCHAR(255) PRIMARY KEY,
        betnickname VARCHAR(255) NOT NULL,
        point INT NOT NULL
      )
    `;
    await connection.query(createb_bettingTableQuery);
    console.log('b_betting Table created successfully');

    // m_betting 테이블 생성
    const createm_bettingTableQuery = `
      CREATE TABLE IF NOT EXISTS m_betting (
        nickname VARCHAR(255) PRIMARY KEY,
        betnickname VARCHAR(255) NOT NULL,
        point INT NOT NULL
      )
    `;

    await connection.query(createm_bettingTableQuery);
    console.log('m_betting Table created successfully');

    // b_oldrecord 테이블 생성
    const createb_oldrecordTableQuery = `
      CREATE TABLE IF NOT EXISTS b_oldrecord (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        Month DATE NOT NULL,
        Nickname VARCHAR(255) NOT NULL,
        BScore FLOAT NOT NULL,
        LScore FLOAT NOT NULL,
        CLASS INT NOT NULL
      )
    `;

    await connection.query(createb_oldrecordTableQuery);
    console.log('b_oldrecord Table created successfully');


    // m_oldrecord 테이블 생성
    const createm_oldrecordTableQuery = `
      CREATE TABLE IF NOT EXISTS m_oldrecord (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        Month DATE NOT NULL,
        Nickname VARCHAR(255) NOT NULL,
        BScore FLOAT NOT NULL,
        LScore FLOAT NOT NULL,
        CLASS INT NOT NULL
      )
    `;

    await connection.query(createm_oldrecordTableQuery);
    console.log('m_oldrecord Table created successfully');


    // b_eventrecordTable 테이블 생성
    const createb_eventrecordTableQuery = `
      CREATE TABLE IF NOT EXISTS b_eventrecord (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        eventname VARCHAR(255) UNIQUE NOT NULL,
        Championship1 VARCHAR(255) NOT NULL,
        Championship2 VARCHAR(255),
        Championship3 VARCHAR(255),
        Championship4 VARCHAR(255),
        Runner_up1 VARCHAR(255),
        Runner_up2 VARCHAR(255),
        Runner_up3 VARCHAR(255),
        Runner_up4 VARCHAR(255),
        Place3rd1 VARCHAR(255),
        Place3rd2 VARCHAR(255),
        Place3rd3 VARCHAR(255),
        Place3rd4 VARCHAR(255),
        Semifinalist1 VARCHAR(255),
        Semifinalist2 VARCHAR(255),
        Semifinalist3 VARCHAR(255),
        Semifinalist4 VARCHAR(255),
        Quarterfinalist1 VARCHAR(255),
        Quarterfinalist2 VARCHAR(255),
        Quarterfinalist3 VARCHAR(255),
        Quarterfinalist4 VARCHAR(255),
        Quarterfinalist5 VARCHAR(255),
        Quarterfinalist6 VARCHAR(255),
        Quarterfinalist7 VARCHAR(255),
        Quarterfinalist8 VARCHAR(255),
        Quarterfinalist9 VARCHAR(255),
        Quarterfinalist10 VARCHAR(255),
        Quarterfinalist11 VARCHAR(255),
        Quarterfinalist12 VARCHAR(255),
        Quarterfinalist13 VARCHAR(255),
        Quarterfinalist14 VARCHAR(255),
        Quarterfinalist15 VARCHAR(255),
        Quarterfinalist16 VARCHAR(255),
        teamSize INT NOT NULL,
        numberteams INT NOT NULL,
        accept INT NOT NULL
      )
    `;

    await connection.query(createb_eventrecordTableQuery);
    console.log('b_eventrecord Table created successfully');

    
    // m_eventrecordTable 테이블 생성
    const createm_eventrecordTableQuery = `
      CREATE TABLE IF NOT EXISTS m_eventrecord (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        eventname VARCHAR(255) UNIQUE NOT NULL,
        Championship1 VARCHAR(255) NOT NULL,
        Championship2 VARCHAR(255),
        Championship3 VARCHAR(255),
        Championship4 VARCHAR(255),
        Runner_up1 VARCHAR(255),
        Runner_up2 VARCHAR(255),
        Runner_up3 VARCHAR(255),
        Runner_up4 VARCHAR(255),
        Place3rd1 VARCHAR(255),
        Place3rd2 VARCHAR(255),
        Place3rd3 VARCHAR(255),
        Place3rd4 VARCHAR(255),
        Semifinalist1 VARCHAR(255),
        Semifinalist2 VARCHAR(255),
        Semifinalist3 VARCHAR(255),
        Semifinalist4 VARCHAR(255),
        Quarterfinalist1 VARCHAR(255),
        Quarterfinalist2 VARCHAR(255),
        Quarterfinalist3 VARCHAR(255),
        Quarterfinalist4 VARCHAR(255),
        Quarterfinalist5 VARCHAR(255),
        Quarterfinalist6 VARCHAR(255),
        Quarterfinalist7 VARCHAR(255),
        Quarterfinalist8 VARCHAR(255),
        Quarterfinalist9 VARCHAR(255),
        Quarterfinalist10 VARCHAR(255),
        Quarterfinalist11 VARCHAR(255),
        Quarterfinalist12 VARCHAR(255),
        Quarterfinalist13 VARCHAR(255),
        Quarterfinalist14 VARCHAR(255),
        Quarterfinalist15 VARCHAR(255),
        Quarterfinalist16 VARCHAR(255),
        teamSize INT NOT NULL,
        numberteams INT NOT NULL,
        accept INT NOT NULL
      )
    `;

    await connection.query(createm_eventrecordTableQuery);
    console.log('m_eventrecord Table created successfully');

    // b_posts 테이블 생성
    const createb_postsTableQuery = `
      CREATE TABLE IF NOT EXISTS b_posts (
        post_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        Nickname VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        views INT DEFAULT 0,
        comments_count INT DEFAULT 0,
          )
    `;

    await connection.query(createb_postsTableQuery);
    console.log('b_posts Table created successfully');
    
    // b_comments 테이블 생성
    const createb_commentsTableQuery = `
      CREATE TABLE IF NOT EXISTS b_comments (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        Nickname VARCHAR(255) NOT NULL,
        content TINYTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES b_posts(post_id),
                  )
    `;

    await connection.query(createb_commentsTableQuery);
    console.log('b_comments Table created successfully');


    // m_posts 테이블 생성
    const createm_postsTableQuery = `
      CREATE TABLE IF NOT EXISTS m_posts (
        post_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        Nickname VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        views INT DEFAULT 0,
        comments_count INT DEFAULT 0,
          )
    `;

    await connection.query(createm_postsTableQuery);
    console.log('m_posts Table created successfully');
    
    // m_comments 테이블 생성
    const createm_commentsTableQuery = `
      CREATE TABLE IF NOT EXISTS m_comments (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        Nickname VARCHAR(255) NOT NULL,
        content TINYTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES b_posts(post_id),
                  )
    `;

    await connection.query(createm_commentsTableQuery);
    console.log('m_comments Table created successfully');



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

    if (result.length === 0) {
      // 사용자가 존재하지 않을 경우
      res.status(401).send('There is no ID in DB');
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
      res.status(401).send('Password is Uncorrected');
    }
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).send('Server Error');
  } finally {
    // 연결 반환 대신에 release만 호출
    connection.release();
  }
});




// 새로운 엔드포인트 추가: POST /process_login_m
app.post('/process_login_m', async (req, res) => {
  const { nickname, password } = req.body;

  // MariaDB 연결 풀에서 연결 가져오기
  const connection = await pool.getConnection(); // 기존 풀에서 연결 가져오기

  try {
    // 입력 받은 닉네임을 소문자로 변환
    const lowerCaseNickname = nickname.toLowerCase() + '_m';

    // 해당 닉네임의 사용자 정보를 데이터베이스에서 조회
    const result = await connection.query(
      'SELECT * FROM m_user WHERE Nickname = ?',
      [lowerCaseNickname]
    );


    if (result.length === 0) {
      // 사용자가 존재하지 않을 경우
      res.status(401).send('There is no ID in DB');
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
      res.status(401).send('Password is Uncorrected');
    }
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).send('Server Error');
  } finally {
    // 연결 반환 대신에 release만 호출
    connection.release();
  }
});



// 테이블 생성 호출
createTables();
createAdmin();



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
      [lowerCaseNickname, hashedPassword, email, startscore, 0, wgrade, currentDate]
    );

    // 연결 반환 대신에 release만 호출
    connection.release();

    res.json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// 회원가입 엔드포인트
app.post('/process_regi_m', async (req, res) => {
  const { nickname, password, email, wgrade } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    // 닉네임을 소문자로 변환
    const lowerCaseNickname = nickname.toLowerCase()+ '_m';

    const result = await connection.query(
      'INSERT INTO m_user (Nickname, PW, email, BScore, LScore, Class, Lastgame) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [lowerCaseNickname, hashedPassword, email, startscore_b, 0, wgrade, currentDate]
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


// 클라이언트에서 보낸 닉네임 중복 확인 요청을 처리
app.post('/check-nickname_m', async (req, res) => {
  const requestedNickname = req.body.nickname + '_m';

  if (!requestedNickname) {
    res.json({ isNameAvailable: false });
    return;
  }

  let connection;
  try {
    // 기존에 생성한 전역 풀을 사용
    connection = await pool.getConnection();

    const result = await connection.query(
      `SELECT COUNT(*) AS count FROM m_user WHERE Nickname = ?`,
      [requestedNickname]
    );

    const isNameAvailable = result[0].count === 0n;
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



// 세션 확인 엔드포인트
app.get('/check-session_m', (req, res) => {
  const isLoggedIn = !!req.session.user; // 세션에 사용자 정보가 있는지 확인

  res.json({
    isLoggedIn: isLoggedIn,
    user: req.session.user || null, // 사용자 정보 반환
  });
});



//logout 엔드포인트
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

    console.log('babapk rankdata를 불러오기 위해 풀을 연결했습니다')

    // b_user 테이블에서 데이터 가져오기
    const rankdb = await connection.query('SELECT Nickname, BScore, LScore, Class, Lastgame FROM b_user WHERE Nickname != "admin" ORDER BY (BScore + LScore) DESC');
    
    console.log('babapk rankdata를 불러오기 위해 데이터를 가져옵니다')

    // b_record 테이블에서 닉네임이 몇 번 나왔는지 세는 쿼리문
    const winCountQuery = `
    SELECT
    bu.Nickname,
    COALESCE(SUM(CASE WHEN bu.Nickname IN (br.Winner, br.win2, br.win3, br.win4) THEN 1 ELSE 0 END), 0) AS TotalWins
FROM
    b_user bu
LEFT JOIN
    b_record br ON bu.Nickname IN (br.Winner, br.win2, br.win3, br.win4)
GROUP BY
    bu.Nickname;

    `;

    const loseCountQuery = `
    SELECT
    bu.Nickname,
    COALESCE(SUM(CASE WHEN bu.Nickname IN (br.Loser, br.lose2, br.lose3, br.lose4) THEN 1 ELSE 0 END), 0) AS TotalLoses
FROM
    b_user bu
LEFT JOIN
    b_record br ON bu.Nickname IN (br.Loser, br.lose2, br.lose3, br.lose4)
GROUP BY
    bu.Nickname;
    `;

    const [recordWin, recordLose] = await Promise.all([
      connection.query(winCountQuery),
      connection.query(loseCountQuery)
    ]);

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

        // 7. recordWin에서 Nickname에 해당하는 숫자, 없으면 0
        const wins = Number(recordWin.find(record => record.Nickname === user.Nickname)?.TotalWins) || 0;
        row.push(wins);

        // 8. recordLose에서 Nickname에 해당하는 숫자, 없으면 0
        const losses = Number(recordLose.find(record => record.Nickname === user.Nickname)?.TotalLoses) || 0;
        row.push(losses);

        // 9. DB의 Lastgame
        const LastgameDate = user.Lastgame.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

        row.push(LastgameDate);
        // 생성된 행을 result에 추가
        result.push(row);
      });
    }
    // createResultArray 함수 호출
    createResultArray(rankdb, recordWin, recordLose);


    // 결과 확인
    console.log(result);

    // 연결 반환
    connection.release();

    // 클라이언트에 데이터 응답
    res.json(result);
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ error: 'DB Error' });
  }
});



// 서버 루트 엔드포인트
app.get('/rankdata_m', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    console.log('rankdata를 불러오기 위해 풀을 연결했습니다')

    // m_user 테이블에서 데이터 가져오기
    const rankdb = await connection.query('SELECT Nickname, BScore, LScore, Class Lastgame FROM m_user WHERE Nickname != "admin_m" ORDER BY (BScore + LScore) DESC');
    
    console.log('rankdata를 불러오기 위해 데이터를 가져옵니다')

    // m_record 테이블에서 닉네임이 몇 번 나왔는지 세는 쿼리문
    const winCountQuery = `
      SELECT Winner AS Nickname, COUNT(*) AS WinCount FROM m_record WHERE Winner != "admin_m" GROUP BY Winner
      UNION
      SELECT win2 AS Nickname, COUNT(*) AS WinCount FROM m_record WHERE win2 != "admin_m" GROUP BY win2
      UNION
      SELECT win3 AS Nickname, COUNT(*) AS WinCount FROM m_record WHERE win3 != "admin_m" GROUP BY win3
      UNION
      SELECT win4 AS Nickname, COUNT(*) AS WinCount FROM m_record WHERE win4 != "admin_m" GROUP BY win4
    `;

    const loseCountQuery = `
      SELECT Loser AS Nickname, COUNT(*) AS LoseCount FROM m_record WHERE Loser != "admin_m" GROUP BY Loser
      UNION
      SELECT lose2 AS Nickname, COUNT(*) AS LoseCount FROM m_record WHERE lose2 != "admin_m" GROUP BY lose2
      UNION
      SELECT lose3 AS Nickname, COUNT(*) AS LoseCount FROM m_record WHERE lose3 != "admin_m" GROUP BY lose3
      UNION
      SELECT lose4 AS Nickname, COUNT(*) AS LoseCount FROM m_record WHERE lose4 != "admin_m" GROUP BY lose4
    `;

    const [recordWin, recordLose] = await Promise.all([
      connection.query(winCountQuery),
      connection.query(loseCountQuery)
    ]);

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

        // 7. recordWin에서 Nickname에 해당하는 숫자, 없으면 0
        const wins = Number(recordWin.find(record => record.Nickname === user.Nickname)?.WinCount) || 0;
        row.push(wins);

        // 8. recordLose에서 Nickname에 해당하는 숫자, 없으면 0
        const losses = Number(recordLose.find(record => record.Nickname === user.Nickname)?.LoseCount) || 0;
        row.push(losses);

        // 생성된 행을 result에 추가
        result.push(row);
      });
    }

    // createResultArray 함수 호출
    createResultArray(rankdb, recordWin, recordLose);

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



// 서버에서 Nickname 목록을 가져오는 엔드포인트
app.get('/api/getNicknames_m', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();
    const rows = await connection.query('SELECT Nickname FROM m_user WHERE Nickname != "admin_m"');
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
        res.status(200).json({ message: 'Send Data to Server Success' });
    } catch (error) {
        console.error('Error adding record:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});




// 미승인 기록 보내기
app.use(express.json());
app.post('/submitrecord_m', async (req, res) => {
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

        // 데이터 삽입 쿼리
        const query = `
          INSERT INTO m_temp (Date, Winner, Loser, Win2, Win3, Win4, Lose2, Lose3, Lose4, WScore, LScore, Checked)
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
        res.status(200).json({ message: 'Send Data to Server Success' });
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


    const results = await connection.query(query, [sessionNickName.nickname]);

    return results;
  } catch (error) {
    console.error('Error fetching data from database:', error);
    return [];
  } finally {
    connection.release(); // 사용이 끝난 연결을 다시 풀에 반환합니다.
  }
}

// 백엔드에서 Mysql로부터 데이터를 불러오는 함수
async function fetchDataFromDatabase_m(sessionNickName) {
  const connection = await pool.getConnection(); // 기존 연결 대신 풀에서 연결 가져오기

  try {
    // 여기서 쿼리를 작성해서 데이터를 불러옵니다.
    const query = `
      SELECT OrderNum, Date, Loser, Win2, Win3, Win4, Lose2, Lose3, Lose4, WScore, LScore
      FROM m_temp
      WHERE Checked = 0 AND Winner = ?;
    `;


    const results = await connection.query(query, [sessionNickName.nickname]);

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



// 백엔드에서 데이터를 받아서 프론트에 전달
app.get('/no_approved_record_m', async (req, res) => {
  try {
    const sessionNickName = req.session.user; // 세션에 저장된 닉네임 가져오기
    const data = await fetchDataFromDatabase_m(sessionNickName);
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




// 미승인 기록 삭제
app.post('/delete-record_m', async (req, res) => {
  const orderNum = req.body.orderNum;

  if (!orderNum) {

    return res.status(400).json({ error: 'Invalid OrderNum' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const updateQuery = `
      UPDATE m_temp
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


    // b_user 테이블의 Lastgame 업데이트
    const lastgameUpdate = `
    UPDATE b_user
    SET Lastgame = ?
    Where Nickname = ?;
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
    const date = recordData.Date


    // b_user 테이블에서 Winner의 BScore 값을 불러오기
    const winnerBScoreQuery = `
      SELECT BScore
      FROM b_user
      WHERE nickname = ?;
    `;
    const winnerBScoreResult = await connection.query(winnerBScoreQuery, [recordData.Winner]);
    let winnerBScore = winnerBScoreResult[0]?.BScore || 0;

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

    const Weaponvalue = async (nickname) => {
      if (nickname) {
        const weaponquery = `
          SELECT Class
          FROM b_user
          WHERE nickname = ?;
        `;
        const result = await connection.query(weaponquery, [nickname]);
        return result[0]?.Class || 0;
      } else {
        return null;
      }
    };

let winnerWeapon = await Weaponvalue(winner)
let loserWeapon = await Weaponvalue(loser)

add_score = (winnerWeapon - loserWeapon === 2 && win2 === null) ? 5.4*(5-lscore) : 5*(5-lscore);

let currentDate = recordData.Date;
let currentDay = currentDate.getDate();
let nextMonth = new Date(currentDate);
nextMonth.setMonth(currentDate.getMonth() + 1, 1);
let lastDayOfMonth = new Date(nextMonth - 1);


console.log('check' ,currentDay, currentDate, lastDayOfMonth)

if (currentDay >= 20 && currentDate <= lastDayOfMonth) {
console.log('bonus score')
if (win2===null)
{
add_score = loserBScore - winnerBScore > 0 ? (loserBScore - winnerBScore) * (5 - lscore) * 0.05 + add_score : add_score ;

console.log('bonus score added')
}

}

subtractScore = (5-lscore)*4.5
winnerBScore = winnerBScore + add_score
win2BScore = win2BScore + add_score
win3BScore = win3BScore + add_score
win4BScore = win4BScore + add_score

loserBScore = loserBScore - subtractScore
lose2BScore = lose2BScore - subtractScore
lose3BScore = lose3BScore - subtractScore
lose4BScore = lose4BScore - subtractScore



try {
  await connection.query(changedscorerecord, [add_score]);
  console.log(`대전기록에 변화값 기록 ${add_score}`);

} catch (error) {
  console.error('Error setting add_score:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery, [loserBScore, loser]);
  await connection.query(lastgameUpdate, [date, loser]);
  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${loserBScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}


try {
  console.log(winner)
  await connection.query(updateuserBScoreQuery, [winnerBScore, winner]);
  await connection.query(lastgameUpdate, [date, winner]);
  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${winnerBScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}

if (win2!=null) {
try {
  await connection.query(updateuserBScoreQuery, [lose2BScore, lose2]);
  await connection.query(lastgameUpdate, [date, lose2]);
  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${lose2BScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}

try {
  console.log(winner)
  await connection.query(updateuserBScoreQuery, [win2BScore, win2]);
  await connection.query(lastgameUpdate, [date, win2]);
  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${win2BScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}
}
if (win3!=null) {

try {
  await connection.query(updateuserBScoreQuery, [lose3BScore, lose3]);
  await connection.query(lastgameUpdate, [date, lose3]);

  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${lose3BScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}

try {
  console.log(winner)
  await connection.query(updateuserBScoreQuery, [win3BScore, win3]);
  await connection.query(lastgameUpdate, [date, win3]);

  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${win3BScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}
}

if (win4!=null) {

try {
  await connection.query(updateuserBScoreQuery, [lose4BScore, lose4]);
  await connection.query(lastgameUpdate, [date, lose4]);

  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${lose4BScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}

try {
  console.log(winner)
  await connection.query(updateuserBScoreQuery, [win4BScore, win4]);
  await connection.query(lastgameUpdate, [date, win4]);
  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${win4BScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}

}



await connection.commit();
res.status(200).json({ message: 'Record approved and moved to b_record successfully' });
} catch (error) {
  console.error('Error approving and moving record in database:', error);
  res.status(500).json({ error: 'Internal Server Error' });
} finally {
  connection.release();
}
});



// 승인 처리
app.post('/approve-record_m', async (req, res) => {
  const orderNum = req.body.orderNum;

  if (!orderNum) {
    return res.status(400).json({ error: 'Invalid OrderNum' });
  }

  const connection = await pool.getConnection();

  try {
    // m_temp 테이블에서 Checked 값을 2로 업데이트
    const updateCheckedQuery = `
      UPDATE m_temp
      SET Checked = 2
      WHERE OrderNum = ?;
    `;
    await connection.query(updateCheckedQuery, [orderNum]);

    // m_temp 테이블에서 데이터를 가져옴
    const selectQuery = `
      SELECT *
      FROM m_temp
      WHERE OrderNum = ?;
    `;
    const selectedData = await connection.query(selectQuery, [orderNum]);
    const recordData = selectedData[0];

    // m_record 테이블에 데이터 삽입
    const insertQuery = `
      INSERT INTO m_record (Date, Winner, Loser, Win2, Win3, Win4, Lose2, Lose3, Lose4, WScore, LScore)
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
    



    // m_user 테이블에서 Winner의 BScore 값을 불러오기
    const winnerBScoreQuery = `
      SELECT BScore
      FROM m_user
      WHERE nickname = ?;
    `;
    const winnerBScoreResult = await connection.query(winnerBScoreQuery, [recordData.Winner]);
    let winnerBScore = winnerBScoreResult[0]?.BScore || 0;

    // 함수를 통해 BScore 값을 가져오는 로직
    const getBScore = async (nickname) => {
      if (nickname) {
        const query = `
          SELECT BScore
          FROM m_user
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


    


winnerBScore = winnerBScore + wscore*wintimes
loserBScore = loserBScore + lscore*losetimes
win2BScore = win2BScore + wscore*wintimes
lose2BScore = lose2BScore + lscore*losetimes
win3BScore = win3BScore + wscore*wintimes
lose3BScore = lose3BScore + lscore*losetimes
win4BScore = win4BScore + wscore*wintimes
lose4BScore = lose4BScore + lscore*losetimes




try {
  await connection.query(changedscorerecord, [lscore]);
  console.log(`대전기록에 변화값 기록 ${lscore}`);

} catch (error) {
  console.error('Error setting add_score:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery_m, [loserBScore, loser]);
  console.log(`Loser의 BScore를 업데이트했습니다. 새로운 BScore: ${loserBScore}`);

} catch (error) {
  console.error('Error getting loser BScore:', error);
  // 에러 처리 로직 추가
}

try {
  await connection.query(updateuserBScoreQuery_m, [lose2BScore, lose2]);
  console.log(`Lose2의 BScore를 업데이트했습니다. 새로운 BScore: ${lose2BScore}`);

} catch (error) {
  console.error('Error getting lose2 BScore:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery_m, [lose3BScore, lose3]);
  console.log(`Lose3의 BScore를 업데이트했습니다. 새로운 BScore: ${lose3BScore}`);

} catch (error) {
  console.error('Error getting lose3 BScore:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery_m, [lose4BScore, lose4]);
  console.log(`Lose4의 BScore를 업데이트했습니다. 새로운 BScore: ${lose4BScore}`);

} catch (error) {
  console.error('Error getting lose4 BScore:', error);
  // 에러 처리 로직 추가
}

try {
  console.log(winner)
  await connection.query(updateuserBScoreQuery_m, [winnerBScore, winner]);
  console.log(`Winner의 WScore를 업데이트했습니다. 새로운 BScore: ${winnerBScore}`);

} catch (error) {
  console.error('Error getting winner BScore:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery_m, [win2BScore, win2]);
  console.log(`win2의 BScore를 업데이트했습니다. 새로운 BScore: ${win2BScore}`);

} catch (error) {
  console.error('Error getting win2 BScore:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery_m, [win3BScore, win3]);
  console.log(`win3의 BScore를 업데이트했습니다. 새로운 BScore: ${win3BScore}`);

} catch (error) {
  console.error('Error getting win3 BScore:', error);
  // 에러 처리 로직 추가
}


try {
  await connection.query(updateuserBScoreQuery, [win4BScore, win4]);
  console.log(`win4의 BScore를 업데이트했습니다. 새로운 BScore: ${win4BScore}`);

} catch (error) {
  console.error('Error getting win4 BScore:', error);
  // 에러 처리 로직 추가
}

res.status(200).json({ message: 'Record approved and moved to m_record successfully' });
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
    const allrecord = await connection.query(`
    SELECT OrderNum, Date, Winner, win2, win3, win4, Loser, lose2, lose3, lose4, wscore, lscore
    FROM b_record
    ORDER BY OrderNum DESC;
    `);
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




// 서버 레코드 데이터 가져오는 엔드포인트
app.get('/recorddata_m', async (req, res) => {
  try {
    // 기존에 생성한 전역 풀을 사용
    const connection = await pool.getConnection();

    // b_record 테이블에서 데이터 가져오기
    const allrecord = await connection.query(`SELECT OrderNum, Date, Winner, win2, win3, win4, Loser, lose2, lose3, lose4, wscore, lscore
    FROM m_record
    ORDER BY OrderNum DESC;
    `);
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



// 암호 변경 엔드포인트
app.post('/process_changepw_m', async (req, res) => {
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
    const result = await connection.query('SELECT pw FROM m_user WHERE Nickname = ?', [user.nickname]);
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
    const updateResult = await connection.query('UPDATE m_user SET pw = ? WHERE Nickname = ?', [newPasswordHash, user.nickname]);

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

      const mailOptions = {
        from: 'kor8240@gmail.com', // 발신자 이메일 주소
        to: findpw_email, // 수신자 이메일 주소
        subject: 'D2R PvP New Password', // 이메일 제목
        text: 'Your New Password : ' + temporaryPassword, // 이메일 본문
      };
      
// 이메일 전송
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});


      res.json({ success: true });
    } else {
      res.status(500).json({ error: '암호 업데이트에 실패했습니다.' });
    }

      } catch (error) {
    console.error('서버 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});



// 임시 비밀번호 요청 엔드 포인트
app.post('/process_emailpw_m', async (req, res) => {
  try {
    console.log('임시 암호 전송 확인 요청');


    // 프론트엔드에서 전송한 이메일 및 암호 데이터
    let { findpw_nickname, findpw_email } = req.body;
    findpw_nickname = findpw_nickname+'_m'
console.log(findpw_nickname)

// 사용자의 현재 이메일
const connection = await pool.getConnection();
const result = await connection.query('SELECT email FROM m_user WHERE Nickname = ?', [findpw_nickname]);
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
    const temp_password_input = await connection.query('UPDATE m_user SET pw = ? WHERE Nickname = ?', [temporaryPasswordHash, findpw_nickname]);


    if (temp_password_input.affectedRows === 1) {
      const mailOptions = {
        from: 'kor8240@gmail.com', // 발신자 이메일 주소
        to: findpw_email, // 수신자 이메일 주소
        subject: 'D2R PvP New Password', // 이메일 제목
        text: 'Your New Password : ' + temporaryPassword, // 이메일 본문
      };
      
// 이메일 전송
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
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
        (SELECT COUNT(*) FROM b_record WHERE Loser = ? OR lose2 = ? OR lose3 = ? OR lose4 = ?) AS countlose
      FROM b_record
      WHERE Winner = ? OR win2 = ? OR win3 = ? OR win4 = ?
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



// 사용자 정보를 반환하는 엔드포인트
app.get('/user_data_m', async (req, res) => {
  try {
    // 세션에서 사용자 정보 가져오기
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 사용자 정보 쿼리
    const connection = await pool.getConnection();
    const userResult = await connection.query('SELECT * FROM m_user WHERE Nickname = ?', [user.nickname]);

    if (userResult.length === 0) {
      connection.release();
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 사용자 전적 쿼리
    const recordResult = await connection.query(`
      SELECT
        COUNT(*) AS countwin,
        (SELECT COUNT(*) FROM m_record WHERE Loser = ? OR lose2 = ? OR lose3 = ? OR lose4 = ?) AS countlose
      FROM m_record
      WHERE Winner = ? OR win2 = ? OR win3 = ? OR win4 = ?
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



// 어드민 점수 부여 엔드포인트
app.post('/submit-admin-score_m', async (req, res) => {
  const adminright = req.session.user.nickname; // 세션에 저장된 닉네임이 관리자인지 확인
  const player = req.body.player;
  const adminscore = req.body.playerScore;

  if (adminright!=='admin_m') {

    return res.status(400).json({ message: '권한이 없습니다' });
  }


  let connection;
  try {
    connection = await pool.getConnection();

    const updateScoreQuery = `
      UPDATE m_user
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








//승인된 기록 삭제하기

app.delete('/delete-row', async (req, res) => {
  const adminright = req.session.user.nickname; // 세션에 저장된 닉네임이 관리자인지 확인

  if (adminright!=='admin') {
     return res.status(400).json({ message: '권한이 없습니다' });   
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    console.log('삭제 절차 진행');

    const OrderNum = req.body.OrderNum;
    // Fetch the row data from b_record using OrderNum
    console.log(OrderNum);

    const selectRecordQuery = `
      SELECT Winner, Win2, Win3, Win4, Loser, Lose2, Lose3, Lose4, AddScore
      FROM b_record
      WHERE OrderNum = ?;
    `;
    const recordRow = await connection.query(selectRecordQuery, [OrderNum]);
    console.log(recordRow);

    if (recordRow.length === 0) {
      return res.status(404).json({ error: 'Row not found' });
    }

    const winnerNicknames = [recordRow[0].Winner, recordRow[0].Win2, recordRow[0].Win3, recordRow[0].Win4];
    const loserNicknames = [recordRow[0].Loser, recordRow[0].Lose2, recordRow[0].Lose3, recordRow[0].Lose4];
    const WScore = [recordRow[0].WScore]
    const LScore = [recordRow[0].LScore]

    const updateBScoreQuery3 = `
UPDATE b_user
SET BScore = BScore - ?
WHERE Nickname IN (?, ?, ?, ?);
`;


const Weaponvalue = async (nickname) => {
  if (nickname) {
    const weaponquery = `
      SELECT Class
      FROM b_user
      WHERE Nickname = ?;
    `;
    const result = await connection.query(weaponquery, [nickname]);
    return result[0]?.Class || 0;
  } else {
    return null;
  }
};

let winnerWeapon = await Weaponvalue(recordRow[0].Winner)
let loserWeapon = await Weaponvalue(recordRow[0].Loser)


add_score = recordRow[0].AddScore

subtractScore = (LScore-5)*4.5;

console.log(add_score, subtractScore);

      // Execute the first update query within the transaction for winners
      await connection.query(updateBScoreQuery3, [
        add_score,
        ...winnerNicknames,
      ]);

      // Execute the second update query within the transaction for losers
      await connection.query(updateBScoreQuery3, [
        // Modify the calculation for losers using loser_score_percent
        subtractScore,
,        ...loserNicknames,
      ]);



      // Delete the row from b_record
      const deleteRecordQuery = `
        DELETE FROM b_record
        WHERE OrderNum = ?;
      `;

      await connection.query(deleteRecordQuery, OrderNum);
      console.log('complete');
      await connection.commit(); // 트랜잭션 커밋

      res.status(200).json({ message: 'Row deleted successfully' });

  } catch (error) {
    console.error('삭제 오류:', error);
    res.status(500).json({ error: 'Internal Server Error' });
    await connection.rollback();
  } finally{
    connection.release();
  }
});






//승인된 기록 삭제하기

app.delete('/delete-row_m', async (req, res) => {

  const adminright = req.session.user.nickname; // 세션에 저장된 닉네임이 관리자인지 확인

  if (adminright!=='admin_m') {

    return res.status(400).json({ message: '권한이 없습니다' });
  }


  try {
    const OrderNum = req.body.OrderNum;


    // Fetch the row data from m_record using OrderNum
    const connection = await pool.getConnection();
    const selectRecordQuery = `
      SELECT Winner, Win2, Win3, Win4, Loser, Lose2, Lose3, Lose4, WScore, LScore
      FROM m_record
      WHERE OrderNum = ?;
    `;
    const recordRow = await connection.query(selectRecordQuery, [OrderNum]);
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
      const WScore = [recordRow[0].WScore]
      const LScore = [recordRow[0].LScore]

      const updateBScoreQuery3 = `
  UPDATE m_user
  SET BScore = BScore - ?
  WHERE Nickname IN (?, ?, ?, ?);
`;

;
      // Execute the first update query within the transaction for winners
      await connection2.query(updateBScoreQuery3, [
        WScore*wintimes,
        ...winnerNicknames,
      ]);

      // Execute the second update query within the transaction for losers
      await connection2.query(updateBScoreQuery3, [
        // Modify the calculation for losers using loser_score_percent
        LScore*losetimes,
,        ...loserNicknames,
      ]);

      // Delete the row from m_record
      const deleteRecordQuery = `
        DELETE FROM m_record
        WHERE OrderNum = ?;
      `;
      await connection2.query(deleteRecordQuery, [OrderNum]);

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





// 대전 점수를 리셋하는 엔드포인트
app.post('/reset-score-endpoint', async (req, res) => {
  // MariaDB 연결 풀에서 연결 가져오기
  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    // BScore를 2000으로 변경
    await connection.query('UPDATE b_user SET BScore = 2000');

    const recordcheckquery = `
      SELECT *
      FROM b_record
      WHERE OrderNum = ?
    `;
    const classscorecheckquery = `
      SELECT Class, BScore
      FROM b_user
      WHERE Nickname = ?
    `;

    const maxrecord = await connection.query(`
      SELECT COUNT(*) AS count
      FROM b_record
    `);

    const updateScoreQuery = `
      UPDATE b_user
      SET BScore = BScore + ?
      WHERE Nickname = ?
    `;

    console.log('maxrecord', Number(maxrecord[0].count));

    // 1. 기존 OrderNum 열을 삭제
    await connection.query(`IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'b_record' AND COLUMN_NAME = 'OrderNum')
THEN
    ALTER TABLE b_record DROP COLUMN OrderNum;
END IF`);

    // 2. OrderNumbackup 컬럼을 새로 만들고 AUTO_INCREMENT로 설정
    await connection.query('ALTER TABLE b_record ADD COLUMN IF NOT EXISTS OrderNumbackup INT AUTO_INCREMENT PRIMARY KEY');

await connection.query('ALTER TABLE b_record CHANGE COLUMN OrderNumbackup OrderNum INT auto_increment');

    for (let number = 1; number < Number(maxrecord[0].count) + 1; number++) {
      console.log('count', number, maxrecord);

      const recordData = await connection.query(recordcheckquery, [number]);
      const teamcheck = recordData[0]?.Win2;


      if (teamcheck === null || teamcheck === undefined) {
        console.log('checked');
        const winnerData = await connection.query(classscorecheckquery, [recordData[0].Winner]);
        const loserData = await connection.query(classscorecheckquery, [recordData[0].Loser]);

        add_score = (winnerData[0].Class - loserData[0].Class === 2) ? 5.4 * (recordData[0].WScore - recordData[0].LScore) : 5 * (recordData[0].WScore - recordData[0].LScore);

        const recordDay = recordData[0].Date.getDate();
        let nextMonth = new Date(recordData[0].Date);
        nextMonth.setMonth(recordData[0].Date.getMonth() + 1, 1);
        const lastDayOfMonth = new Date(nextMonth - 1);

        if (recordDay >= 20 && recordDay <= lastDayOfMonth) {
          add_score = loserData[0].BScore - winnerData[0].BScore > 0 ? add_score + (recordData[0].WScore - recordData[0].LScore) * (loserData[0].BScore - winnerData[0].BScore) * 0.05 : add_score;
          console.log('dateChecked', add_score);
        }
      } else {
        add_score = 5 * (recordData[0].WScore - recordData[0].LScore);
      }

      subtractScore = 4.5 * (recordData[0].LScore - recordData[0].WScore);

      await connection.query(updateScoreQuery, [add_score, recordData[0].Winner]);
      await connection.query(updateScoreQuery, [add_score, recordData[0].Win2]);
      await connection.query(updateScoreQuery, [add_score, recordData[0].Win3]);
      await connection.query(updateScoreQuery, [add_score, recordData[0].Win4]);

      await connection.query(updateScoreQuery, [subtractScore, recordData[0].Loser]);
      await connection.query(updateScoreQuery, [subtractScore, recordData[0].Lose2]);
      await connection.query(updateScoreQuery, [subtractScore, recordData[0].Lose3]);
      await connection.query(updateScoreQuery, [subtractScore, recordData[0].Lose4]);
    }
    await connection.commit();
    res.json({ success: true, message: '대전점수가 재계산되었습니다.' });
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    await connection.rollback();
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});






// 대전 점수를 리셋하는 엔드포인트
app.post('/reset-score-endpoint_m', async (req, res) => {
  try {
    // MariaDB 연결 풀에서 연결 가져오기
    const connection = await pool.getConnection();

    // BScore를 1000으로 업데이트
    await connection.query('UPDATE m_user SET BScore = ?',[startscore]);

    // B_record에서 winner에 해당하는 행을 찾아 BScore 업데이트
    await connection.query(`
      UPDATE m_user
      SET BScore = BScore + IFNULL(
        (SELECT SUM(WScore * ?) FROM m_record WHERE Winner = m_user.Nickname OR win2 = m_user.Nickname OR win3 = m_user.Nickname OR win4 = m_user.Nickname),
        0
      )
    `,[wintimes]);

    // B_record에서 loser에 해당하는 행을 찾아 BScore 업데이트
    await connection.query(`
      UPDATE m_user
      SET BScore = BScore + IFNULL(
        (SELECT SUM(LScore * ?) FROM m_record WHERE Loser = m_user.Nickname OR lose2 = m_user.Nickname OR lose3 = m_user.Nickname OR lose4 = m_user.Nickname),
        0
      )
    `, [losetimes]);

    // 연결 반환 대신에 release만 호출
   
    connection.release();

    res.json({ success: true, message: '대전점수가 재계산되었습니다.' });
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// 승부예측 경기정보 제출하기
app.post('/bet_info', async (req, res) => {
const endtime = req.body.endtime
const gamename = req.body.gamename
const playername = req.body.playername

  try {
    // MariaDB 연결 풀에서 연결 가져오기
    const connection = await pool.getConnection();
const new_bet_info_query = `
INSERT INTO bet_info (endtime, place, nicknamelist)
VALUES (?, ?, ?);
`

console.log(endtime, gamename, playername);

// 승부예측 경기 정보 제출하기
await connection.query(new_bet_info_query,[endtime, gamename, playername]);


    connection.release();
    res.json({ success: true, message: '승자예측경기 등록 완료' });

  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ success: false, error: '데이터베이스가 오류입니다' });
  }

});


// 승부예측 닉네임 선택지 채우기
app.get('/filledbetNickname', async (req, res) => {
  try {

    const connection = await pool.getConnection();


    // 쿼리 실행
    const queryResult = await connection.query('SELECT nicknamelist AS label, nicknamelist AS value FROM bet_info');

    // 연결 반환
    connection.release();

        // 결과를 클라이언트에 전송
        res.json(queryResult); 
      } catch (error) {
    console.error('데이터 가져오기 오류:', error);
    res.status(500).json({ error: '데이터 가져오기 오류' });
  }
});



// 배팅 기록하기
app.post('/placeBet', async (req, res) => {
  try {
    // MariaDB 연결
    const connection = await pool.getConnection();

    // endtime 컬럼 값 가져오기
    const endTimeQuery = 'SELECT MAX(endtime) AS endTime FROM bet_info'; // 또는 적절한 쿼리를 사용하여 endtime을 가져오세요.
    const endTimeResult = await connection.query(endTimeQuery);
    const targetTime =  new Date(endTimeResult[0].endTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const currentTime = new Date(getCurrentTime().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    console.log(currentTime, targetTime);
    if (currentTime < targetTime) {



    const nickname = req.session.user.nickname;
    const betnickname = req.body.betselect;
    if (betnickname ===''){
throw error

    }
    const point = req.body.betscore;
const insertbetQuery = `INSERT INTO b_betting (nickname, betnickname, point) values (?, ?, ?)`

const inputbet = await connection.query(insertbetQuery,[nickname, betnickname, point]);

connection.release();

res.json({ success: true});

    }
    else{
res.json({success: false});

    }

}catch (error) {
  console.error('데이터 가져오기 오류:', error);
  res.status(500).json({ error: '데이터 가져오기 오류' });
}

});



// 배팅 기록하기
app.post('/placeBet_m', async (req, res) => {
  try {
    // MariaDB 연결
    const connection = await pool.getConnection();

    // endtime 컬럼 값 가져오기
    const endTimeQuery = 'SELECT MAX(endtime) AS endTime FROM bet_info'; // 또는 적절한 쿼리를 사용하여 endtime을 가져오세요.
    const endTimeResult = await connection.query(endTimeQuery);
    const targetTime = endTimeResult[0].endTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });;
    const currentTime = getCurrentTime().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    console.log(currentTime, targetTime);
    if (currentTime < targetTime) {



    const nickname = req.session.user.nickname;
    const betnickname = req.body.betselect;
    if (betnickname ===''){
throw error

    }
    const point = req.body.betscore;
const insertbetQuery = `INSERT INTO m_betting (nickname, betnickname, point) values (?, ?, ?)`

const inputbet = await connection.query(insertbetQuery,[nickname, betnickname, point]);

connection.release();

res.json({ success: true});

    }
    else{
res.json({success: false});

    }

}catch (error) {
  console.error('데이터 가져오기 오류:', error);
  res.status(500).json({ error: '데이터 가져오기 오류' });
}

});






app.get('/loadbettingtable', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // 닉네임 리스트 가져오기
    const nicknamesQueryResult = await connection.query('SELECT nicknamelist FROM bet_info');
    const nicknames = nicknamesQueryResult.map((row) => row.nicknamelist);

    // 각 닉네임에 대한 포인트 합 및 전체 포인트 합 구하기
    let totalPointsSum = 0;
    const pointList = [];

    for (const nickname of nicknames) {
      const totalPointQuery = `
        SELECT
          (SELECT COALESCE(SUM(point), 0) FROM b_betting WHERE betnickname = ?) +
          (SELECT COALESCE(SUM(point), 0) FROM m_betting WHERE betnickname = ?) AS totalPoint
      `;
      const totalPointResult = await connection.query(totalPointQuery, [nickname, nickname]);
      const totalPoint = totalPointResult[0].totalPoint;

      totalPointsSum += parseInt(totalPoint, 10);
      pointList.push({ nickname, totalPoint });
    }

// 각 닉네임에 대한 포인트 비율 계산
for (const pointItem of pointList) {
  pointItem.pointRatio = totalPointsSum !== 0 ? totalPointsSum / pointItem.totalPoint + 1  : 2; // 변경된 부분
}

    // 결과를 클라이언트에 전송
    res.json({ pointList, totalPointsSum });
    connection.release();

  } catch (error) {
    console.error('데이터 가져오기 오류:', error);
    res.status(500).json({ error: '데이터 가져오기 오류' });
  }
});



// 승자 세팅하기

app.post('/setwinner', async (req, res) => {
  const connection = await pool.getConnection();

  try {

    const winnernickname = req.body.selectedwinner;


// 닉네임 리스트 가져오기
const nicknamesQueryResult_b = await connection.query('SELECT nickname FROM b_betting');
const nicknamesQueryResult_m = await connection.query('SELECT nickname FROM m_betting');

// 각 결과에서 nickname만 추출
const betternicknames_b = nicknamesQueryResult_b.map((row) => row.nickname);
const betternicknames_m = nicknamesQueryResult_m.map((row) => row.nickname);

// 두 배열 합치기
const betternicknames = [...betternicknames_b, ...betternicknames_m];



// 트랜잭션 시작
await connection.beginTransaction();

// 닉네임 리스트 가져오기
const nicknamesQueryResult = await connection.query('SELECT nicknamelist FROM bet_info');



// 각 닉네임에 대한 포인트 합 및 전체 포인트 합 구하기
let totalPointsSum = 0;
const pointList = [];

for (const nicknameData of nicknamesQueryResult) {
  const nickname = nicknameData.nicknamelist; // 각 닉네임 데이터에서 실제 닉네임 추출
  const totalPointQuery = `
    SELECT
      (SELECT COALESCE(SUM(point), 0) FROM b_betting WHERE betnickname = ?) +
      (SELECT COALESCE(SUM(point), 0) FROM m_betting WHERE betnickname = ?) AS totalPoint
  `;
  const totalPointResult = await connection.query(totalPointQuery, [nickname, nickname]);
  const totalPoint = totalPointResult[0].totalPoint;


  totalPointsSum += parseInt(totalPoint, 10);
}



// winnerNickname에 대한 포인트 총합 구하기
const winnerTotalPointQuery = `
  SELECT
    (SELECT COALESCE(SUM(point), 0) FROM b_betting WHERE betnickname = ?) +
    (SELECT COALESCE(SUM(point), 0) FROM m_betting WHERE betnickname = ?) AS totalPoint
`;
const winnerTotalPointResult = await connection.query(winnerTotalPointQuery, [winnernickname, winnernickname]);
const winnerTotalPoint = parseInt(winnerTotalPointResult[0].totalPoint, 10);

let winnergetpointratio;

if (winnerTotalPoint === 0) {
  winnergetpointratio = 0;
} else {
  winnergetpointratio = totalPointsSum / winnerTotalPoint + 1;
}

console.log(totalPointsSum, winnerTotalPoint, winnergetpointratio);


// winnerNickname에 대한 각 행에 대해 개별적으로 처리
const winnerUpdateLScoreQuery = `
UPDATE b_user
SET LScore = LScore + (
  ? * COALESCE((SELECT point FROM b_betting WHERE betnickname = ? AND nickname = ?), 0)
)
WHERE Nickname = ?;
`;

for (const betternickname of betternicknames) {
  await connection.query(winnerUpdateLScoreQuery, [winnergetpointratio-1, winnernickname, betternickname, betternickname]);
  console.log(winnergetpointratio-1, winnernickname, betternickname)
}

// b_user에서 LScore 값을 갱신
const updateLScoreQuery = `
UPDATE b_user
SET LScore = LScore - (COALESCE((SELECT point FROM b_betting WHERE betnickname != ? AND nickname = ?), 0)
)
WHERE Nickname = ?;
`;
for (const betternickname of betternicknames) {
  console.log("Before Query - LScore, winnernickname, betternickname:", winnernickname, betternickname);
  await connection.query(updateLScoreQuery, [winnernickname, betternickname, betternickname]);
  console.log("After Query - LScore, winnernickname, betternickname:", winnernickname, betternickname);
}




// winnerNickname에 대한 각 행에 대해 개별적으로 처리
const winnerUpdateLScoreQuery_m = `
UPDATE m_user
SET LScore = LScore + (
  ? * COALESCE((SELECT point FROM m_betting WHERE betnickname = ? AND nickname = ?), 0)
)
WHERE Nickname = ?;
`;

for (const betternickname of betternicknames) {
  await connection.query(winnerUpdateLScoreQuery_m, [winnergetpointratio-1, winnernickname, betternickname, betternickname]);
  console.log(winnergetpointratio-1, winnernickname, betternickname)
}

// m_user에서 LScore 값을 갱신
const updateLScoreQuery_m = `
UPDATE m_user
SET LScore = LScore - (COALESCE((SELECT point FROM m_betting WHERE betnickname != ? AND nickname = ?), 0)
)
WHERE Nickname = ?;
`;
for (const betternickname of betternicknames) {
  console.log("Before Query - LScore, winnernickname, betternickname:", winnernickname, betternickname);
  await connection.query(updateLScoreQuery_m, [winnernickname, betternickname, betternickname]);
  console.log("After Query - LScore, winnernickname, betternickname:", winnernickname, betternickname);
}




const deleteinfo = await connection.query('DELETE from bet_info')
const b_betting = await connection.query('DELETE from b_betting')
const m_betting = await connection.query('DELETE from m_betting')







    // 트랜잭션 커밋
    await connection.commit();

    // 연결 반환
    connection.release();

    res.json({ success: true });
  } catch (error) {
    // 에러 발생 시 트랜잭션 롤백
    await connection.rollback();

    console.error('데이터 가져오기 오류:', error);
    res.status(500).json({ error: '데이터 가져오기 오류' });
  }
});


app.get('/getEndtime', async (req, res) => {
  try {
    // MariaDB 연결
    const connection = await pool.getConnection();

    // endtime 컬럼 값 가져오기
    const endTimeQuery = 'SELECT MAX(endtime) AS endTime FROM bet_info';
    const endTimeResult = await connection.query(endTimeQuery);
    const endTime = endTimeResult[0].endTime;

    console.log('endTime:', endTime);

    const formattedEndTime = new Date(endTime);
    console.log('formattedEndTime', formattedEndTime);

    const localFormattedEndTime = formattedEndTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    console.log('localFormattedEndTime', localFormattedEndTime);

    connection.release();

    // 올바른 응답 전송 방법 사용
    res.json({ endTime: localFormattedEndTime });
    
  } catch (error) {
    console.log('날짜 가져오기 오류');
    res.status(500).json({ error: '날짜 가져오기 오류' }); // 오류 응답 전송
  }
});


// 랭킹리셋 엔드포인트
app.post('/reset-rank', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

  // Insert into b_oldrecord
  const insertQuery = `
    INSERT INTO b_oldrecord (Nickname, BScore, LScore, Class, Month)
    SELECT Nickname, BScore, LScore, Class, DATE_FORMAT(NOW(), '%Y-%m-01')
    FROM b_user;
  `;
  await connection.query(insertQuery);

  // Delete from b_user
  const deleteBUserQuery = `
    DELETE FROM b_user;
  `;
  await connection.query(deleteBUserQuery);

  // Delete from b_record
  const deleteBRecordQuery = `
    DELETE FROM b_record;
  `;
  await connection.query(deleteBRecordQuery);

  // Delete from b_temp
  const deleteBTempQuery = `
    DELETE FROM b_temp;
  `;
  await connection.query(deleteBTempQuery);

  // Delete from b_eventrecord
  const deleteBEventrecordQuery = `
  DELETE FROM b_eventrecord;
`;
await connection.query(deleteBEventrecordQuery);


  // Insert into m_oldrecord
  const insertMOldrecordQuery = `
    INSERT INTO m_oldrecord (Nickname, BScore, LScore, Class, Month)
    SELECT Nickname, BScore, LScore, Class, DATE_FORMAT(NOW(), '%Y-%m-01')
    FROM m_user;
  `;
  await connection.query(insertMOldrecordQuery);

  // Delete from m_user
  const deleteMUserQuery = `
    DELETE FROM m_user;
  `;
  await connection.query(deleteMUserQuery);

  // Delete from m_record
  const deleteMRecordQuery = `
    DELETE FROM m_record;
  `;
  await connection.query(deleteMRecordQuery);

  // Delete from m_temp
  const deleteMTempQuery = `
    DELETE FROM m_temp;
  `;
  await connection.query(deleteMTempQuery);

  // Delete from m_eventrecord
  const deleteMEventrecordQuery = `
  DELETE FROM m_eventrecord;
`;
await connection.query(deleteMEventrecordQuery);


createAdmin(); // 어드민 계정 생성함수
await connection.commit();
res.json({ success: true });
} catch (error) {
await connection.rollback();
console.error('랭킹 초기화 실패', error);
res.status(500).json({ error: '랭킹 초기화 실패' });
} finally {
connection.release();
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



// 이메일 변경 엔드 포인트
app.post('/process_changeemail_m', async (req, res) => {
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
const result = await connection.query('SELECT pw FROM m_user WHERE Nickname = ?', [user.nickname]);
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
    const updateResult = await connection.query('UPDATE m_user SET email = ? WHERE Nickname = ?', [newemail, user.nickname]);

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



// 리그 데이터 제출하기

app.post('/submitevent', async (req, res)=> {
try {
const eventdata = req.body;
const eventname = eventdata.eventname;
const numberteams = eventdata.numberteams;
const teamSize = eventdata.teamSize;
const Championship1 = eventdata.Championship1;
const Championship2 = eventdata.Championship2;
const Championship3 = eventdata.Championship3;
const Championship4 = eventdata.Championship4;
const Runner_up1 = eventdata.Runner_up1;
const Runner_up2 = eventdata.Runner_up2;
const Runner_up3 = eventdata.Runner_up3;
const Runner_up4 = eventdata.Runner_up4;
const Place3rd1 = eventdata.Place3rd1;
const Place3rd2 = eventdata.Place3rd2;
const Place3rd3 = eventdata.Place3rd3;
const Place3rd4 = eventdata.Place3rd4;
const Semifinalist1 = eventdata.Semifinalist1;
const Semifinalist2 = eventdata.Semifinalist2;
const Semifinalist3 = eventdata.Semifinalist3;
const Semifinalist4 = eventdata.Semifinalist4;
const Quarterfinalist1 = eventdata.Quarterfinalist1;
const Quarterfinalist2 = eventdata.Quarterfinalist2;
const Quarterfinalist3 = eventdata.Quarterfinalist3;
const Quarterfinalist4 = eventdata.Quarterfinalist4;
const Quarterfinalist5 = eventdata.Quarterfinalist5;
const Quarterfinalist6 = eventdata.Quarterfinalist6;
const Quarterfinalist7 = eventdata.Quarterfinalist7;
const Quarterfinalist8 = eventdata.Quarterfinalist8;
const Quarterfinalist9 = eventdata.Quarterfinalist9;
const Quarterfinalist10 = eventdata.Quarterfinalist10;
const Quarterfinalist11 = eventdata.Quarterfinalist11;
const Quarterfinalist12 = eventdata.Quarterfinalist12;
const Quarterfinalist13 = eventdata.Quarterfinalist13;
const Quarterfinalist14 = eventdata.Quarterfinalist14;
const Quarterfinalist15 = eventdata.Quarterfinalist15;
const Quarterfinalist16 = eventdata.Quarterfinalist16;

const inputeventdata = `
  INSERT INTO b_eventrecord (
    accept,
    eventname,
    numberteams,
    teamSize,
    Championship1,
    Championship2,
    Championship3,
    Championship4,
    Runner_up1,
    Runner_up2,
    Runner_up3,
    Runner_up4,
    Place3rd1,
    Place3rd2,
    Place3rd3,
    Place3rd4,
    Semifinalist1,
    Semifinalist2,
    Semifinalist3,
    Semifinalist4,
    Quarterfinalist1,
    Quarterfinalist2,
    Quarterfinalist3,
    Quarterfinalist4,
    Quarterfinalist5,
    Quarterfinalist6,
    Quarterfinalist7,
    Quarterfinalist8,
    Quarterfinalist9,
    Quarterfinalist10,
    Quarterfinalist11,
    Quarterfinalist12,
    Quarterfinalist13,
    Quarterfinalist14,
    Quarterfinalist15,
    Quarterfinalist16
  )
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const connection = await pool.getConnection();
const result = await connection.query(inputeventdata, [
  eventname,
  numberteams,
  teamSize,
  Championship1,
  Championship2,
  Championship3,
  Championship4,
  Runner_up1,
  Runner_up2,
  Runner_up3,
  Runner_up4,
  Place3rd1,
  Place3rd2,
  Place3rd3,
  Place3rd4,
  Semifinalist1,
  Semifinalist2,
  Semifinalist3,
  Semifinalist4,
  Quarterfinalist1,
  Quarterfinalist2,
  Quarterfinalist3,
  Quarterfinalist4,
  Quarterfinalist5,
  Quarterfinalist6,
  Quarterfinalist7,
  Quarterfinalist8,
  Quarterfinalist9,
  Quarterfinalist10,
  Quarterfinalist11,
  Quarterfinalist12,
  Quarterfinalist13,
  Quarterfinalist14,
  Quarterfinalist15,
  Quarterfinalist16
]);

connection.release();
res.status(200).json({ message: 'Send Tournament Record to Server Success' });

} catch (error) {
console.error('Error adding record:', error);
res.status(500).json({ error: error.message || 'Internal Server Error' });
}
});



// 리그 데이터 제출하기

app.post('/submitevent_m', async (req, res)=> {
  try {
  const eventdata = req.body;
  const eventname = eventdata.eventname;
  const numberteams = eventdata.numberteams;
  const teamSize = eventdata.teamSize;
  const Championship1 = eventdata.Championship1;
  const Championship2 = eventdata.Championship2;
  const Championship3 = eventdata.Championship3;
  const Championship4 = eventdata.Championship4;
  const Runner_up1 = eventdata.Runner_up1;
  const Runner_up2 = eventdata.Runner_up2;
  const Runner_up3 = eventdata.Runner_up3;
  const Runner_up4 = eventdata.Runner_up4;
  const Place3rd1 = eventdata.Place3rd1;
  const Place3rd2 = eventdata.Place3rd2;
  const Place3rd3 = eventdata.Place3rd3;
  const Place3rd4 = eventdata.Place3rd4;
  const Semifinalist1 = eventdata.Semifinalist1;
  const Semifinalist2 = eventdata.Semifinalist2;
  const Semifinalist3 = eventdata.Semifinalist3;
  const Semifinalist4 = eventdata.Semifinalist4;
  const Quarterfinalist1 = eventdata.Quarterfinalist1;
  const Quarterfinalist2 = eventdata.Quarterfinalist2;
  const Quarterfinalist3 = eventdata.Quarterfinalist3;
  const Quarterfinalist4 = eventdata.Quarterfinalist4;
  const Quarterfinalist5 = eventdata.Quarterfinalist5;
  const Quarterfinalist6 = eventdata.Quarterfinalist6;
  const Quarterfinalist7 = eventdata.Quarterfinalist7;
  const Quarterfinalist8 = eventdata.Quarterfinalist8;
  const Quarterfinalist9 = eventdata.Quarterfinalist9;
  const Quarterfinalist10 = eventdata.Quarterfinalist10;
  const Quarterfinalist11 = eventdata.Quarterfinalist11;
  const Quarterfinalist12 = eventdata.Quarterfinalist12;
  const Quarterfinalist13 = eventdata.Quarterfinalist13;
  const Quarterfinalist14 = eventdata.Quarterfinalist14;
  const Quarterfinalist15 = eventdata.Quarterfinalist15;
  const Quarterfinalist16 = eventdata.Quarterfinalist16;
  
  const inputeventdata = `
    INSERT INTO m_eventrecord (
      accept,
      eventname,
      numberteams,
      teamSize,
      Championship1,
      Championship2,
      Championship3,
      Championship4,
      Runner_up1,
      Runner_up2,
      Runner_up3,
      Runner_up4,
      Place3rd1,
      Place3rd2,
      Place3rd3,
      Place3rd4,
      Semifinalist1,
      Semifinalist2,
      Semifinalist3,
      Semifinalist4,
      Quarterfinalist1,
      Quarterfinalist2,
      Quarterfinalist3,
      Quarterfinalist4,
      Quarterfinalist5,
      Quarterfinalist6,
      Quarterfinalist7,
      Quarterfinalist8,
      Quarterfinalist9,
      Quarterfinalist10,
      Quarterfinalist11,
      Quarterfinalist12,
      Quarterfinalist13,
      Quarterfinalist14,
      Quarterfinalist15,
      Quarterfinalist16
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const connection = await pool.getConnection();
  const result = await connection.query(inputeventdata, [
    eventname,
    numberteams,
    teamSize,
    Championship1,
    Championship2,
    Championship3,
    Championship4,
    Runner_up1,
    Runner_up2,
    Runner_up3,
    Runner_up4,
    Place3rd1,
    Place3rd2,
    Place3rd3,
    Place3rd4,
    Semifinalist1,
    Semifinalist2,
    Semifinalist3,
    Semifinalist4,
    Quarterfinalist1,
    Quarterfinalist2,
    Quarterfinalist3,
    Quarterfinalist4,
    Quarterfinalist5,
    Quarterfinalist6,
    Quarterfinalist7,
    Quarterfinalist8,
    Quarterfinalist9,
    Quarterfinalist10,
    Quarterfinalist11,
    Quarterfinalist12,
    Quarterfinalist13,
    Quarterfinalist14,
    Quarterfinalist15,
    Quarterfinalist16
  ]);
  
  connection.release();
  res.status(200).json({ message: 'Send Tournament Record to Server Success' });
  
  } catch (error) {
  console.error('Error adding record:', error);
  res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
  });



// 토너먼트 히스토리 보기
  app.get('/eventhistory', async (req, res) => {
    try{
      const connection = await pool.getConnection();

    const eventdata = await connection.query(`
    SELECT
    eventname, numberteams, teamSize,
    Championship1, Championship2, Championship3, Championship4,
    Runner_up1, Runner_up2, Runner_up3, Runner_up4,
    Place3rd1, Place3rd2, Place3rd3, Place3rd4,
    Semifinalist1, Semifinalist2, Semifinalist3, Semifinalist4,
    Quarterfinalist1, Quarterfinalist2, Quarterfinalist3, Quarterfinalist4,
    Quarterfinalist5, Quarterfinalist6, Quarterfinalist7, Quarterfinalist8,
    Quarterfinalist9, Quarterfinalist10, Quarterfinalist11, Quarterfinalist12,
    Quarterfinalist13, Quarterfinalist14, Quarterfinalist15, Quarterfinalist16,
    accept 
    FROM b_eventrecord
    `);

    res.status(200).json(eventdata);
    connection.release();

  } catch (error) {
    console.error('데이터베이스 오류:', error);
    res.status(500).json({ error: 'DB Error' });
  }
  });


// 토너먼트 히스토리 보기
app.get('/eventhistory_m', async (req, res) => {
  try{
    const connection = await pool.getConnection();

  const eventdata = await connection.query(`
  SELECT
  eventname, numberteams, teamSize,
  Championship1, Championship2, Championship3, Championship4,
  Runner_up1, Runner_up2, Runner_up3, Runner_up4,
  Place3rd1, Place3rd2, Place3rd3, Place3rd4,
  Semifinalist1, Semifinalist2, Semifinalist3, Semifinalist4,
  Quarterfinalist1, Quarterfinalist2, Quarterfinalist3, Quarterfinalist4,
  Quarterfinalist5, Quarterfinalist6, Quarterfinalist7, Quarterfinalist8,
  Quarterfinalist9, Quarterfinalist10, Quarterfinalist11, Quarterfinalist12,
  Quarterfinalist13, Quarterfinalist14, Quarterfinalist15, Quarterfinalist16,
  accept 
  FROM m_eventrecord
  `);

  res.status(200).json(eventdata);
  connection.release();

} catch (error) {
  console.error('데이터베이스 오류:', error);
  res.status(500).json({ error: 'DB Error' });
}
});



// 토너먼트 히스토리 삭제
app.delete('/delete-event', async (req, res) => {
  const eventname = req.body.eventname;

  if (!eventname) {

    return res.status(400).json({ error: 'Invalid eventname' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const updateQuery = `
      Delete from b_eventrecord
      WHERE eventname = ?;
    `;
    console.log('updated')
    await connection.query(updateQuery, [eventname, ]);

    res.status(200).json({ message: 'Tournament Record deleted successfully' });
  } catch (error) {
    console.error('Error updating record in database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connection) {
      connection.release(); // 연결 반환
    }
  }
});




// 토너먼트 히스토리 삭제
app.delete('/delete-event_m', async (req, res) => {
  const eventname = req.body.eventname;

  if (!eventname) {

    return res.status(400).json({ error: 'Invalid eventname' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const updateQuery = `
      Delete from m_eventrecord
      WHERE eventname = ?;
    `;
    console.log('updated')
    await connection.query(updateQuery, [eventname, ]);

    res.status(200).json({ message: 'Tournament Record deleted successfully' });
  } catch (error) {
    console.error('Error updating record in database:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connection) {
      connection.release(); // 연결 반환
    }
  }
});






// 토너먼트 히스토리 승인
app.post('/accept-event', async (req, res) => {

  const eventname = req.body.eventname;
  const Championship1 = req.body.Championship1;
  const Championship2 = req.body.Championship2;
  const Championship3 = req.body.Championship3;
  const Championship4 = req.body.Championship4;
  const Runner_up1 = req.body.Runner_up1;
  const Runner_up2 = req.body.Runner_up2;
  const Runner_up3 = req.body.Runner_up3;
  const Runner_up4 = req.body.Runner_up4;
  const Place3rd1 = req.body.Place3rd1;
  const Place3rd2 = req.body.Place3rd2;
  const Place3rd3 = req.body.Place3rd3;
  const Place3rd4 = req.body.Place3rd4;
  const Semifinalist1 = req.body.Semifinalist1;
  const Semifinalist2 = req.body.Semifinalist2;
  const Semifinalist3 = req.body.Semifinalist3;
  const Semifinalist4 = req.body.Semifinalist4;

  const Quarterfinalist1 = req.body.Quarterfinalist1;
  const Quarterfinalist2 = req.body.Quarterfinalist2;
  const Quarterfinalist3 = req.body.Quarterfinalist3;
  const Quarterfinalist4 = req.body.Quarterfinalist4;

  const Quarterfinalist5 = req.body.Quarterfinalist5;
  const Quarterfinalist6 = req.body.Quarterfinalist6;
  const Quarterfinalist7 = req.body.Quarterfinalist7;
  const Quarterfinalist8 = req.body.Quarterfinalist8;

  const Quarterfinalist9 = req.body.Quarterfinalist9;
  const Quarterfinalist10 = req.body.Quarterfinalist10;
  const Quarterfinalist11 = req.body.Quarterfinalist11;
  const Quarterfinalist12 = req.body.Quarterfinalist12;

  const Quarterfinalist13 = req.body.Quarterfinalist13;
  const Quarterfinalist14 = req.body.Quarterfinalist14;
  const Quarterfinalist15 = req.body.Quarterfinalist15;
  const Quarterfinalist16 = req.body.Quarterfinalist16;
  const numberteams = req.body.numberteams;


  const updateQueriesCham = [Championship1, Championship2, Championship3, Championship4];
  const updateQueriesRunner = [Runner_up1, Runner_up2, Runner_up3, Runner_up4];
  const updateQueries3rd = [Place3rd1, Place3rd2, Place3rd3, Place3rd4];
  const updateQueriesSemifinalist = [Semifinalist1, Semifinalist2, Semifinalist3, Semifinalist4];
  const updateQueriesQuarterfinalist = [Quarterfinalist1, Quarterfinalist2, Quarterfinalist3, Quarterfinalist4, Quarterfinalist5, Quarterfinalist6, Quarterfinalist7, Quarterfinalist8, Quarterfinalist9, Quarterfinalist10, Quarterfinalist11, Quarterfinalist12, Quarterfinalist13, Quarterfinalist14, Quarterfinalist15, Quarterfinalist16];
const updateLScoreQuery = `
  UPDATE b_user
  SET LScore = LScore + ?
  WHERE Nickname = ?
`;


  if (!eventname) {
    return res.status(400).json({ error: 'Invalid eventname' });
  }  let connection;
try{
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const updateQuery = `
    UPDATE b_eventrecord
    SET accept = 2
    WHERE eventname = ?
  `;
    await connection.query(updateQuery, [eventname]);

        switch (numberteams) {
          case 2:
            for (const updateValue of updateQueriesCham) {
                await connection.query(updateLScoreQuery, [teams2ScoreB.Championship, updateValue]);
            }
            break;
          
case 4:
  for (const updateValue of updateQueriesCham) {
      await connection.query(updateLScoreQuery, [teams4ScoreB.Championship, updateValue]);
    }
      break;


case 8:
for (const updateValue of updateQueriesCham) {
  await connection.query(updateLScoreQuery, [teams8ScoreB.Championship, updateValue]);
}

for (const updateValue of updateQueriesRunner) {
  await connection.query(updateLScoreQuery, [teams8ScoreB.Runner_up, updateValue]);
}

for (const updateValue of updateQueries3rd) {
  await connection.query(updateLScoreQuery, [teams8ScoreB.Place3rd, updateValue]);
}

break;

case 16:

  for (const updateValue of updateQueriesCham) {
    await  connection.query(updateLScoreQuery, [teams16ScoreB.Championship, updateValue]);
  }
  for (const updateValue of updateQueriesRunner) {
    await  connection.query(updateLScoreQuery, [teams16ScoreB.Runner_up, updateValue]);
  }
    for (const updateValue of updateQueries3rd) {
    await  connection.query(updateLScoreQuery, [teams16ScoreB.Place3rd, updateValue]);
  }
  
  for (const updateValue of updateQueriesSemifinalist) {
    await   connection.query(updateLScoreQuery, [teams16ScoreB.Semifinalist, updateValue]);
  }
  
  for (const updateValue of updateQueriesQuarterfinalist) {
    await  connection.query(updateLScoreQuery, [teams16ScoreB.Quarterfinalist, updateValue]);
  }
  break;

case 24:

for (const updateValue of updateQueriesCham) {
  await connection.query(updateLScoreQuery, [teams24ScoreB.Championship, updateValue]);
}
for (const updateValue of updateQueriesRunner) {
  await connection.query(updateLScoreQuery, [teams24ScoreB.Runner_up, updateValue]);
}
for (const updateValue of updateQueries3rd) {
  await connection.query(updateLScoreQuery, [teams24ScoreB.Place3rd, updateValue]);
}
for (const updateValue of updateQueriesSemifinalist) {
  await  connection.query(updateLScoreQuery, [teams24ScoreB.Semifinalist, updateValue]);
}
for (const updateValue of updateQueriesQuarterfinalist) {
  await connection.query(updateLScoreQuery, [teams24ScoreB.Quarterfinalist, updateValue]);
}
break;

case 32:

for (const updateValue of updateQueriesCham) {
  await  connection.query(updateLScoreQuery, [teams32ScoreB.Championship, updateValue]);
}
for (const updateValue of updateQueriesRunner) {
  await connection.query(updateLScoreQuery, [teams32ScoreB.Runner_up, updateValue]);
}



for (const updateValue of updateQueries3rd) {
  await connection.query(updateLScoreQuery, [teams32ScoreB.Place3rd, updateValue]);
}

for (const updateValue of updateQueriesSemifinalist) {
  await connection.query(updateLScoreQuery, [teams32ScoreB.Semifinalist, updateValue]);
}

for (const updateValue of updateQueriesQuarterfinalist) {
  await connection.query(updateLScoreQuery, [teams32ScoreB.Quarterfinalist, updateValue]);
}
break;}

await connection.commit();

console.log('Transaction completed successfully');
res.status(200).json({ message: 'Accept successfully' });
} catch (error) {
  // 쿼리 실행 중 오류가 발생하면 롤백
  console.error('Error during transaction:', error);
  await connection.rollback();
} finally {
  // 연결 반환
  if (connection) {
    connection.release();
  }
}
});



// 토너먼트 히스토리 승인
app.post('/accept-event_m', async (req, res) => {

  const eventname = req.body.eventname;
  const Championship1 = req.body.Championship1;
  const Championship2 = req.body.Championship2;
  const Championship3 = req.body.Championship3;
  const Championship4 = req.body.Championship4;
  const Runner_up1 = req.body.Runner_up1;
  const Runner_up2 = req.body.Runner_up2;
  const Runner_up3 = req.body.Runner_up3;
  const Runner_up4 = req.body.Runner_up4;
  const Place3rd1 = req.body.Place3rd1;
  const Place3rd2 = req.body.Place3rd2;
  const Place3rd3 = req.body.Place3rd3;
  const Place3rd4 = req.body.Place3rd4;
  const Semifinalist1 = req.body.Semifinalist1;
  const Semifinalist2 = req.body.Semifinalist2;
  const Semifinalist3 = req.body.Semifinalist3;
  const Semifinalist4 = req.body.Semifinalist4;

  const Quarterfinalist1 = req.body.Quarterfinalist1;
  const Quarterfinalist2 = req.body.Quarterfinalist2;
  const Quarterfinalist3 = req.body.Quarterfinalist3;
  const Quarterfinalist4 = req.body.Quarterfinalist4;

  const Quarterfinalist5 = req.body.Quarterfinalist5;
  const Quarterfinalist6 = req.body.Quarterfinalist6;
  const Quarterfinalist7 = req.body.Quarterfinalist7;
  const Quarterfinalist8 = req.body.Quarterfinalist8;

  const Quarterfinalist9 = req.body.Quarterfinalist9;
  const Quarterfinalist10 = req.body.Quarterfinalist10;
  const Quarterfinalist11 = req.body.Quarterfinalist11;
  const Quarterfinalist12 = req.body.Quarterfinalist12;

  const Quarterfinalist13 = req.body.Quarterfinalist13;
  const Quarterfinalist14 = req.body.Quarterfinalist14;
  const Quarterfinalist15 = req.body.Quarterfinalist15;
  const Quarterfinalist16 = req.body.Quarterfinalist16;
  const numberteams = req.body.numberteams;


  const updateQueriesCham = [Championship1, Championship2, Championship3, Championship4];
  const updateQueriesRunner = [Runner_up1, Runner_up2, Runner_up3, Runner_up4];
  const updateQueries3rd = [Place3rd1, Place3rd2, Place3rd3, Place3rd4];
  const updateQueriesSemifinalist = [Semifinalist1, Semifinalist2, Semifinalist3, Semifinalist4];
  const updateQueriesQuarterfinalist = [Quarterfinalist1, Quarterfinalist2, Quarterfinalist3, Quarterfinalist4, Quarterfinalist5, Quarterfinalist6, Quarterfinalist7, Quarterfinalist8, Quarterfinalist9, Quarterfinalist10, Quarterfinalist11, Quarterfinalist12, Quarterfinalist13, Quarterfinalist14, Quarterfinalist15, Quarterfinalist16];
const updateLScoreQuery = `
  UPDATE m_user
  SET LScore = LScore + ?
  WHERE Nickname = ?
`;


  if (!eventname) {
    return res.status(400).json({ error: 'Invalid eventname' });
  }  let connection;
try{
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const updateQuery = `
    UPDATE m_eventrecord
    SET accept = 2
    WHERE eventname = ?
  `;
    await connection.query(updateQuery, [eventname]);

        switch (numberteams) {
          case 2:
            for (const updateValue of updateQueriesCham) {
                await connection.query(updateLScoreQuery, [teams2ScoreM.Championship, updateValue]);
            }
            break;
          
case 4:
  for (const updateValue of updateQueriesCham) {
      await connection.query(updateLScoreQuery, [teams4ScoreM.Championship, updateValue]);
    }
      break;


case 8:
for (const updateValue of updateQueriesCham) {
  await connection.query(updateLScoreQuery, [teams8ScoreM.Championship, updateValue]);
}

for (const updateValue of updateQueriesRunner) {
  await connection.query(updateLScoreQuery, [teams8ScoreM.Runner_up, updateValue]);
}

for (const updateValue of updateQueries3rd) {
  await connection.query(updateLScoreQuery, [teams8ScoreM.Place3rd, updateValue]);
}

break;

case 16:

  for (const updateValue of updateQueriesCham) {
    await  connection.query(updateLScoreQuery, [teams16ScoreM.Championship, updateValue]);
  }
  for (const updateValue of updateQueriesRunner) {
    await  connection.query(updateLScoreQuery, [teams16ScoreM.Runner_up, updateValue]);
  }
    for (const updateValue of updateQueries3rd) {
    await  connection.query(updateLScoreQuery, [teams16ScoreM.Place3rd, updateValue]);
  }
  
  for (const updateValue of updateQueriesSemifinalist) {
    await   connection.query(updateLScoreQuery, [teams16ScoreM.Semifinalist, updateValue]);
  }
  
  for (const updateValue of updateQueriesQuarterfinalist) {
    await  connection.query(updateLScoreQuery, [teams16ScoreM.Quarterfinalist, updateValue]);
  }
  break;

case 24:

for (const updateValue of updateQueriesCham) {
  await connection.query(updateLScoreQuery, [teams24ScoreM.Championship, updateValue]);
}
for (const updateValue of updateQueriesRunner) {
  await connection.query(updateLScoreQuery, [teams24ScoreM.Runner_up, updateValue]);
}
for (const updateValue of updateQueries3rd) {
  await connection.query(updateLScoreQuery, [teams24ScoreM.Place3rd, updateValue]);
}
for (const updateValue of updateQueriesSemifinalist) {
  await  connection.query(updateLScoreQuery, [teams24ScoreM.Semifinalist, updateValue]);
}
for (const updateValue of updateQueriesQuarterfinalist) {
  await connection.query(updateLScoreQuery, [teams24ScoreM.Quarterfinalist, updateValue]);
}
break;

case 32:

for (const updateValue of updateQueriesCham) {
  await  connection.query(updateLScoreQuery, [teams32ScoreM.Championship, updateValue]);
}
for (const updateValue of updateQueriesRunner) {
  await connection.query(updateLScoreQuery, [teams32ScoreM.Runner_up, updateValue]);
}



for (const updateValue of updateQueries3rd) {
  await connection.query(updateLScoreQuery, [teams32ScoreM.Place3rd, updateValue]);
}

for (const updateValue of updateQueriesSemifinalist) {
  await connection.query(updateLScoreQuery, [teams32ScoreM.Semifinalist, updateValue]);
}

for (const updateValue of updateQueriesQuarterfinalist) {
  await connection.query(updateLScoreQuery, [teams32ScoreM.Quarterfinalist, updateValue]);
}
break;}

await connection.commit();

console.log('Transaction completed successfully');
res.status(200).json({ message: 'Accept successfully' });
} catch (error) {
  // 쿼리 실행 중 오류가 발생하면 롤백
  console.error('Error during transaction:', error);
  await connection.rollback();
} finally {
  // 연결 반환
  if (connection) {
    connection.release();
  }
}
});




// 배팅 기록 보내기
app.get('/takebetdata', async (req, res) =>{
const userNickname = req.session.user.nickname;

  try{
const connection = await pool.getConnection();
const takebetdataquery = `Select * from b_betting where nickname = ?`;
const answer = await connection.query(takebetdataquery,[userNickname])
console.log('answer', answer);
res.status(200).json(answer);
connection.release();
} catch (error){
res.status(500).json({ message: 'DB Error'});
} 

})




// 배팅 기록 보내기
app.get('/takebetdata_m', async (req, res) =>{
  const userNickname = req.session.user.nickname;
  
    try{
  const connection = await pool.getConnection();
  const takebetdataquery = `Select * from m_betting where nickname = ?`;
  const answer = await connection.query(takebetdataquery,[userNickname])
  console.log('answer', answer);
  res.status(200).json(answer);
  connection.release();
  } catch (error){
  res.status(500).json({ message: 'DB Error'});
  } 
  
  })
  


// 글 목록을 보여주는 엔드포인트
app.get('/posts', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT post_id, Nickname, title, created_at, views FROM b_posts ORDER BY post_id DESC');
    connection.release();

    res.json(result);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Internal Server Error');
  }
});


// 글 목록을 보여주는 엔드포인트
app.get('/posts_m', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT post_id, Nickname, title, created_at, views FROM m_posts ORDER BY post_id DESC');
    connection.release();

    res.json(result);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Internal Server Error');
  }
});




// 글 생성 엔드포인트
app.post('/writeposts', async (req, res) => {
  const { title, content, nickname, postId } = req.body;

  if (!title || !content || !nickname) {
    return res.status(400).json({ error: 'Title, content, and nickname are required.' });
  }

  const connection = await pool.getConnection();

  try {
    if (postId) {
// 글 수정
      const modifyQuery = `
      UPDATE b_posts
      SET title = ?,
          content = ?,
          updated_at = NOW()
      WHERE post_id = ? AND Nickname = ?      
      `;

    connection.query(modifyQuery, [title, content, postId, nickname], (error, results) => {
      connection.release(); // 연결 해제

      if (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      console.log('Post created successfully!');
      res.status(201).json({ message: 'Post created successfully', postId: results.insertId });
    });

    } else{
      // 글 생성
const writeQuery = `
INSERT INTO b_posts
(title, content, Nickname)
VALUES (?, ?, ?)
`;

    connection.query(writeQuery, [title, content, nickname], (error, results) => {
      connection.release(); // 연결 해제

      if (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      console.log('Post created successfully!');
      res.status(201).json({ message: 'Post created successfully', postId: results.insertId });
    });}


  } catch (error) {
    console.error('Error saving post and comments:', error);
    res.status(500).send('DB error');
  } finally{
    connection.release();
  }
});



// 글 생성 엔드포인트
app.post('/writeposts_m', async (req, res) => {
  const { title, content, nickname, postId } = req.body;

  if (!title || !content || !nickname) {
    return res.status(400).json({ error: 'Title, content, and nickname are required.' });
  }

  const connection = await pool.getConnection();

  try {
    if (postId) {
// 글 수정
      const modifyQuery = `
      UPDATE m_posts
      SET title = ?,
          content = ?,
          updated_at = NOW()
      WHERE post_id = ? AND Nickname = ?      
      `;

    connection.query(modifyQuery, [title, content, postId, nickname], (error, results) => {
      connection.release(); // 연결 해제

      if (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      console.log('Post created successfully!');
      res.status(201).json({ message: 'Post created successfully', postId: results.insertId });
    });

    } else{
      // 글 생성
const writeQuery = `
INSERT INTO m_posts
(title, content, Nickname)
VALUES (?, ?, ?)
`;

    connection.query(writeQuery, [title, content, nickname], (error, results) => {
      connection.release(); // 연결 해제

      if (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      console.log('Post created successfully!');
      res.status(201).json({ message: 'Post created successfully', postId: results.insertId });
    });}


  } catch (error) {
    console.error('Error saving post and comments:', error);
    res.status(500).send('DB error');
  } finally{
    connection.release();
  }
});





// 엔드포인트: /babapk/notice/:postId
app.get('/notice/:postId', async (req, res) => {
  const postId = req.params.postId;
  const connection = await pool.getConnection();

  try {
    // 1. 특정 게시물 가져오기
    const postQuery = 'SELECT title, Nickname, content, created_at, updated_at, views FROM b_posts WHERE post_id = ?';
    const [postResults] = await connection.query(postQuery, [postId]);


    if (postResults.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = {
      title: postResults.title,
      Nickname: postResults.Nickname,
      content: postResults.content,
      created_at: postResults.created_at,
      updated_at: postResults.updated_at,
      views: postResults.views,
    };

    // 2. UPDATE 쿼리 실행 (조회수 증가)
    await connection.query(`
      UPDATE b_posts
      SET views = views + 1
      WHERE post_id = ?`,
      [postId]
    );

    // 3. 댓글 가져오기
    const commentsQuery = 'SELECT Nickname, content, created_at, comment_id FROM b_comments WHERE post_id = ?';
const commentsResults = await connection.query(commentsQuery, [postId]);
const commentsArray = Array.isArray(commentsResults) ? commentsResults : [commentsResults];


    // 4. 결과 전송
res.json({
  post: post,
  comments: commentsArray,
});

  } catch (error) {
    console.error('Error fetching post and comments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});



// 엔드포인트: /mpk/notice/:postId
app.get('/m/notice/:postId', async (req, res) => {
  const postId = req.params.postId;
  const connection = await pool.getConnection();

  try {
    // 1. 특정 게시물 가져오기
    const postQuery = 'SELECT title, Nickname, content, created_at, updated_at, views FROM m_posts WHERE post_id = ?';
    const [postResults] = await connection.query(postQuery, [postId]);


    if (postResults.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = {
      title: postResults.title,
      Nickname: postResults.Nickname,
      content: postResults.content,
      created_at: postResults.created_at,
      updated_at: postResults.updated_at,
      views: postResults.views,
    };

    // 2. UPDATE 쿼리 실행 (조회수 증가)
    await connection.query(`
      UPDATE m_posts
      SET views = views + 1
      WHERE post_id = ?`,
      [postId]
    );

    // 3. 댓글 가져오기
    const commentsQuery = 'SELECT Nickname, content, created_at, comment_id FROM m_comments WHERE post_id = ?';
const commentsResults = await connection.query(commentsQuery, [postId]);
const commentsArray = Array.isArray(commentsResults) ? commentsResults : [commentsResults];


    // 4. 결과 전송
res.json({
  post: post,
  comments: commentsArray,
});

  } catch (error) {
    console.error('Error fetching post and comments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});




// 공지 게시물 삭제
app.delete('/deletenoticepost/:postId', async (req, res) => {
  const mode = req.body.mode; // req.body에서 mode 값을 직접 추출
  const postId = req.params.postId; // URL 파라미터로부터 postId 값을 추출
  const connection = await pool.getConnection();

  let deleteQuery = '';
  if (mode) {
    deleteQuery = `DELETE FROM m_posts WHERE post_id = ?`;
  } else {
    deleteQuery = `DELETE FROM b_posts WHERE post_id = ?`;
  }

  try {
    await connection.query(deleteQuery, [postId]);
    res.status(200).send('Delete Success'); // 성공 시 응답
  } catch (error) {
    console.error(error);
    res.status(500).send('DB error Delete Fail');
  } finally {
    connection.release();
  }
});


// 댓글 달기
app.post('/addcomment/:postId', async (req, res) => {
  const mode = req.body.mode; // req.body에서 mode 값을 직접 추출
  const postId = req.params.postId; // URL 파라미터로부터 postId 값을 추출
  const nickname = req.body.nickname;
  const content = req.body.content;
  const connection = await pool.getConnection();
  let addcommentQuery = '';

  if (mode) {
    addcommentQuery = `INSERT INTO m_comments (content, post_id, Nickname) VALUES (?, ?, ?)`;
  } else {
    addcommentQuery =  `INSERT INTO b_comments (content, post_id, Nickname) VALUES (?, ?, ?)`;
  }

  try {
    await connection.query(addcommentQuery, [content, postId, nickname]);
    res.status(200).send('Add Comment Success'); // 성공 시 응답
  } catch (error) {
    res.status(500).send('DB error Add Comment Fail');
  } finally {
    connection.release();
  }
});


// 엔드포인트: /deletecomment/:commentId
app.delete('/deletecomment/:commentId', async (req, res) => {
  const commentId = req.params.commentId;
  const mode = req.body.mode; // req.body에서 mode 값을 직접 추출
  const connection = await pool.getConnection();

  try {
    let deleteCommentQuery = '';
    if (mode) {
      // mode가 true이면 m_comment 테이블에서 삭제
      deleteCommentQuery = 'DELETE FROM m_comments WHERE comment_id = ?';
    } else {
      // mode가 false이면 b_comment 테이블에서 삭제
      deleteCommentQuery = 'DELETE FROM b_comments WHERE comment_id = ?';
    }

    await connection.query(deleteCommentQuery, [commentId]);
    res.status(200).send('Comment deleted successfully'); // 성공 시 응답
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).send('DB error: Comment delete failed');
  } finally {
    connection.release();
  }
});




app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
