const { Client } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const fs = require('fs');  
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended: true }));

app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PATCH, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });

app.get('/', (req, res) => {
    res.sendFile('index.html', {root:__dirname});
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});

client.initialize();

//socket io
io.on('connection', function(socket){
    socket.emit('message', 'Connecting.....');

    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr,{small: true});
        qrcode.toDataURL(qr, (err, url)=>{
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, silahkan scan');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp is ready'); 
        socket.emit('message', 'Whatsapp is ready'); 
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Whatsapp is authenticated'); 
        socket.emit('message', 'Whatsapp is authenticated'); 
        console.log('AUTHENTICATED', session);
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });
})

app.get('/qrcode', (req, res) => {
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr,{small: true});
        qrcode.toDataURL(qr, (err, url)=>{
            res.send(url)
        });
    });
});
// sdasdasd
//send message
app.post('/send-message', (req, res) => {
    const number = req.body.number;
    const message = req.body.message;

    client.sendMessage(number, message).then(response =>{
        res.status(200).json({
            status : true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status:false,
            response: err
        });
    });
});


server.listen(8000, function(){
    console.log("Apps ini sudah runing on *:" + 8000);
})