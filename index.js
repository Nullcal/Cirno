"use strict";

// モジュール
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const moment = require("moment");
const fs = require("fs");

// オブジェクト
const app = express();
const server = http.Server(app);
const io = socketIO(server);

// 定数
const PORT = process.env.PORT || 3000;

// ログイン状況
let loginStatus = [];
let loginId = [];

// csv読み込み
let teamdata = fs.readFileSync("./data/teamdata.csv", "utf8").split("\r\n");
for (var i = 0; i < teamdata.length; i++) {
  teamdata[i] = teamdata[i].split(",");
}

// 問題文読み込み
let quest = JSON.parse(fs.readFileSync("./data/question.json", "utf8"))[0];
console.log(quest);

// 接続時の処理
io.on("connection", (socket) => {
  console.log(`connection    : ${socket.id}`);

  // セレクトボックスの中身を生成
  for (let i = 0; i < teamdata.length; i++) {
    io.emit("generateSelect", teamdata[i][0]);
  }

  // ログインリクエスト
  socket.on("loginReq", function(team) {
    // 既存のログインユーザーがいるか確認
    if (loginStatus.indexOf(team) == -1) {
      // 配列整理
      loginStatus.push(team);
      loginId.push(socket.id);
      // テームのスコア取得
      let score = NaN;
      for (let i = 0; i < teamdata.length; i++) {
        if(team == teamdata[i][0]) {
          score = teamdata[i][1];
        }
      }
      io.to(socket.id).emit("loginSuccess", team, score);
      console.log(`\x1b[42mLOGIN \x1b[49m : ${team}(${socket.id})`);
    } else {
      io.to(socket.id).emit("loginFailed", team);
      console.log("LOGIN FAILED.");
    }
    console.log(team, loginStatus, loginId);
  });

  // ゲーム開始
  socket.on("startReq", function(qNum) {
    if (false) {
      console.log("Game start!");
      io.emit("startView");
      // 問題情報取得
      let qObj = quest[`q${qNum}`];
      let display = qObj.title;
      let options = qObj.options;
      //
      let timer;
      clearInterval(timer);
      // 問題表示
      setTimeout(function() {
        io.emit("voteView", qNum, display, options);
        // タイマー設定
        let left = 10;
        //
        timer = setInterval(() =>{
          left--;
          let mLeft = ("00" + Math.floor(left/60)).slice(-2);
          let sLeft = ("00" + left % 60).slice(-2);
          io.emit("refTimer", mLeft, sLeft);
          //
          if(left <= 0){
            clearInterval(timer);
            io.emit("timeIsUp");
          }
        }, 1000);
      }, 1000);
    } else {
      io.emit("failedLaunch");
    }
  });

  // ログアウト処理
  function logout(id) {
    // ログイン中のチームから削除
    let teamIdx = loginId.indexOf(id);
    console.log(`\x1b[43mLOGOUT\x1b[49m : ${loginStatus[teamIdx]}(${id})`);
    console.log(id, loginStatus, loginId);
    if (teamIdx !== -1) {
      loginStatus.splice(teamIdx, 1);
      loginId.splice(teamIdx, 1);
    }
  }

  // 切断時の処理
  socket.on("disconnect", () => {
    logout(socket.id);
  });

  // ログアウトリクエスト
  socket.on("logoutReq", function() {
    logout(socket.id);
  });
});

// 公開フォルダの指定
app.use(express.static(__dirname + "/public"));

// サーバーの起動
server.listen(PORT, () => {
  console.log("server starts on port: %d", PORT);
});
