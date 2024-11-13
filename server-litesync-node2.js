const express = require('express');
const Database = require('better-sqlite3-litesync');
const cors = require('cors');
const app = express();
const port = 8002;

// 创建 SQLite 数据库连接 / create SQLite db connection
const uri = './data/litesync-node2.db?node=secondary&connect=tcp://127.0.0.1:8001';
const options = { verbose: console.log };
const db = new Database(uri, options);

// 监听数据更新 / listening data update
db.on('sync', function(changes) {
  console.log('Received data update: ', changes);
});

db.on('ready', function() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL
    );
  `);
});

// Middleware：解析 JSON 请求体
app.use(express.json());
// 解析 URL 编码请求体
app.use(express.urlencoded({ extended: true }));
// 启用 CORS
app.use(cors());

// 1. 查询所有用户 / search all users
app.get('/users', (req, res) => {
  try {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching users');
  }
});

// 2. 查询单个用户 by id / search user by id
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching user');
  }
});

// 3. 添加用户 / insert user
app.post('/users', (req, res) => {
  const { name, age } = req.body;
  if (!name || !age) {
    return res.status(400).send('Name and age are required');
  }
  try {
    const insert = db.prepare("INSERT INTO users (name, age) VALUES (?, ?)");
    const info = insert.run(name, age);
    res.status(201).json({ id: info.lastInsertRowid, name, age });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding user');
  }
});

// 4. 更新用户 / update user
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, age } = req.body;

  if (!name || !age) {
    return res.status(400).send('Name and age are required');
  }

  try {
    const update = db.prepare("UPDATE users SET name = ?, age = ? WHERE id = ?");
    const result = update.run(name, age, id);
    if (result.changes > 0) {
      res.status(200).send('User updated successfully');
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating user');
  }
});

// 5. 删除用户 / delete user
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const remove = db.prepare("DELETE FROM users WHERE id = ?");
    const result = remove.run(id);
    if (result.changes > 0) {
      res.status(200).send('User deleted');
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting user');
  }
});

// 6. 查询所有表 / search all tables
app.get('/tables', (req, res) => {
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    res.json(tables.map(table => table.name));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching tables');
  }
});

// 7. 查询所有数据（所有表的数据） / search all data (all tables data)
app.get('/data', (req, res) => {
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    const result = {};

    tables.forEach(table => {
      const tableName = table.name;
      result[tableName] = db.prepare(`SELECT * FROM ${tableName}`).all();
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching all data');
  }
});

// 启动服务器 / launch the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
