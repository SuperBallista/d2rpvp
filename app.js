const express = require('express');
const bodyParser = require('body-parser');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const moment = require('moment');

const app = express();
const port = 3000;

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


// 테이블 생성 함수
async function createTables() {
  const pool = createConnectionPool();
  const connection = await pool.getConnection();

  try {
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
        LScore INT,
        Checked INT
      )
    `;
    await connection.query(createTempTableQuery);
    console.log('b_temp Table created successfully');
  }catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    connection.release();  // 수정된 부분: connection.release() 사용
    pool.end();
  }
}

// 테이블 생성 호출
createTables();


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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
