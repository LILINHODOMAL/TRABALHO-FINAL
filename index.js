import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import fs from 'fs';
import path from 'path';

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: 'chat-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 30 * 60 * 1000 } 
}));

function carregarUsuarios() {
  try {
    return JSON.parse(fs.readFileSync(path.join(path.dirname(''), 'users.json')));
  } catch (error) {
    return []; 
  }
}

function carregarMensagens() {
  try {
    return JSON.parse(fs.readFileSync(path.join(path.dirname(''), 'messages.json')));
  } catch (error) {
    return []; 
  }
}

function salvarUsuarios(usuarios) {
  fs.writeFileSync(path.join(path.dirname(''), 'users.json'), JSON.stringify(usuarios, null, 2));
}

function salvarMensagens(mensagens) {
  fs.writeFileSync(path.join(path.dirname(''), 'messages.json'), JSON.stringify(mensagens, null, 2));
}


app.get('/', (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }

  const usuarios = carregarUsuarios();
  const ultimoAcesso = req.cookies.ultimoAcesso || 'Nunca';
  res.cookie('ultimoAcesso', new Date().toLocaleString(), { maxAge: 1000 * 60 * 60 * 24 });

  res.send(`
    
    <html>
        <head>
        <h1>Menu</h1>
            <p>Bem-vindo, ${req.session.usuario.nome}!</p>
            <p>Último acesso: ${ultimoAcesso}</p>
            <a href="/cadastro">Cadastro de Usuários</a><br>
            <a href="/batepapo">Bate-papo</a><br>
            <a href="/usuarios">Visualizar Usuários</a><br>
            <a href="/logout">Logout</a>
        </head>
    </html>
  `);
});


app.get('/login', (req, res) => {
  res.send(`
    <html>
        <head>
            <h1>Login</h1>
            <form action="/login" method="POST">
            <input type="text" name="email" placeholder="E-mail" required><br>
            <input type="password" name="senha" placeholder="Senha" required><br>
            <button type="submit">Entrar</button>
            </form>
        </head>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const usuarios = carregarUsuarios();
  const usuario = usuarios.find(u => u.email === email && u.senha === senha);

  if (usuario) {
    req.session.usuario = usuario;
    return res.redirect('/');
  }

  res.send('Usuário ou senha incorretos. <a href="/login">Tente novamente</a>');
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});


app.get('/cadastro', (req, res) => {
  res.send(`
    <html>
        <head>
            <h1>Cadastro de Usuário</h1>
            <form action="/cadastro" method="POST">
            <input type="text" name="nome" placeholder="Nome" required><br>
            <input type="date" name="dataNascimento" placeholder="Data de Nascimento" required><br>
            <input type="text" name="nickname" placeholder="Nickname" required><br>
            <input type="email" name="email" placeholder="E-mail" required><br>
            <input type="password" name="senha" placeholder="Senha" required><br>
            <button type="submit">Cadastrar</button>
    </form>
        </head>
    </html>
  `);
});

app.post('/cadastro', (req, res) => {
  const { nome, dataNascimento, nickname, email, senha } = req.body;
  const usuarios = carregarUsuarios();

  
  if (usuarios.some(u => u.email === email)) {
    return res.send('E-mail já cadastrado. <a href="/cadastro">Tente novamente</a>');
  }

  const novoUsuario = { nome, dataNascimento, nickname, email, senha };
  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);

  res.redirect('/');
});


app.get('/usuarios', (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }

  const usuarios = carregarUsuarios();

  res.send(`
    
   <html>
        <head>
                <h1>Usuarios Cadastrados</h1>
            <table border="1">
            <thead>
                <tr>
                <th>Nome</th>
                <th>Nickname</th>
                <th>E-mail</th>
                <th>Data de Nascimento</th>
                </tr>
            </thead>
            <tbody>
                ${usuarios.map(u => `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.nickname}</td>
                    <td>${u.email}</td>
                    <td>${u.dataNascimento}</td>
                </tr>
                `).join('')}
            </tbody>
            
            </table>
            <br>
            <a href="/">Voltar ao Menu</a>
        </head>
    </html>
  `);
});


app.get('/batepapo', (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }

  const usuarios = carregarUsuarios();
  const mensagens = carregarMensagens();

  res.send(`
    <html>
        <head>
        <link rel="stylesheet" type="text/css" href="/style.css">
            <h1>Bate-papo</h1>
            <form action="/batepapo" method="POST">
            <select name="usuarioDestino" required>
                ${usuarios.map(u => `<option value="${u.nickname}">${u.nickname}</option>`).join('')}
            </select><br>
            <textarea name="mensagem" placeholder="Digite sua mensagem" required></textarea><br>
            <button type="submit">Enviar</button>
            </form>

            <h2>Mensagens:</h2>
            <ul>
            ${mensagens.map(m => `
                <li><strong>${m.usuarioDe}</strong> para <strong>${m.usuarioPara}</strong>: ${m.mensagem} (${m.data})</li>
            `).join('')}
            </ul>
        </head>
    </html>
  `);
});

app.post('/batepapo', (req, res) => {
  const { usuarioDestino, mensagem } = req.body;
  const usuarioDe = req.session.usuario.nickname;
  const data = new Date().toLocaleString();
  const novasMensagens = carregarMensagens();

  novasMensagens.push({ usuarioDe, usuarioPara: usuarioDestino, mensagem, data });
  salvarMensagens(novasMensagens);

  res.redirect('/batepapo');
});


app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
