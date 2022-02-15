"use strict";

// モジュール
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const moment = require("moment");
const fs = require("fs");
// パス指定用モジュール
const path = require('path');

// オブジェクト
const app = express();
const server = http.Server(app);
const io = socketIO(server);

// 定数
const PORT = process.env.PORT || 3000;

// ログイン状況
let loginStatus = [];
let loginId = [];

let teamrank = [];
let teamscore = {};

let anslgt = 0;

let correctTeams = 0;

let correspo = {};

// タイマー管理用
let left;

// 問題情報
let gqObj;

// csv読み込み
let srccsv = fs.readFileSync("./data/teamdata.csv", "utf8");
let teamdata = srccsv.split(/\r\n|\n/g);
for (var i = 0; i < teamdata.length; i++) {
  teamdata[i] = teamdata[i].split(/,/);
}
console.log("Array!", srccsv, teamdata);

let newCsv = teamdata;

// 問題文読み込み
let quest = JSON.parse(fs.readFileSync("./data/question.json", "utf8"))[0];
console.log(quest);

// タイマー読み込み
let adtimer = JSON.parse(fs.readFileSync("./data/timer.json", "utf8"))[0];
console.log(adtimer);

// アドミンログイン情報読み込み
let addata = JSON.parse(fs.readFileSync("./data/userdata.json", "utf8"))[0];
console.log(addata);

// 接続時の処理
io.on("connection", (socket) => {
  console.log(`connection    : ${socket.id}`);

  // セレクトボックスの中身を生成
  io.to(socket.id).emit("emptySelect");
  for (let i = 0; i < teamdata.length; i++) {
    io.to(socket.id).emit("generateSelect", teamdata[i][0]);
  }

  // ログインリクエスト
  socket.on("loginReq", function(team) {
    // 既存のログインユーザーがいるか確認
    if (loginStatus.indexOf(team) == -1) {
      //
      correspo[socket.id] = team;
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
      teamscore[socket.id] = score;
      io.to(socket.id).emit("loginSuccess", team, score);
      console.log(`\x1b[42mLOGIN \x1b[49m : ${team}(${socket.id})`);
      //
      io.emit("resLoginStatus", loginStatus);
    } else {
      io.to(socket.id).emit("loginFailed", team);
      console.log("LOGIN FAILED.");
    }
  });

  // ログイン済みのみ向けio.emit()
  function limIoEmit(postId, arg1, arg2, arg3, arg4) {
    for (var i = 0; i < loginId.length; i++) {
      io.to(loginId[i]).emit(postId, arg1, arg2, arg3, arg4);
    }
  }

  // ゲーム開始
  socket.on("startReq", function(qNum) {
    anslgt = 0;
    //
    if (true) {
      console.log("Game start!");
      limIoEmit("startView"); // GO!の画面
      io.emit("unrestartable");
      // 問題情報取得
      let qObj = quest[`q${qNum}`];
      gqObj = qObj;
      let display = qObj.title;
      let options = qObj.options;
      //
      let timer;
      clearInterval(timer);
      // 問題表示
      setTimeout(function() {
        // ポイント付与
        for (var i = 0; i < Object.keys(teamscore).length; i++) {
          teamscore[Object.keys(teamscore)[i]] = parseInt(teamscore[Object.keys(teamscore)[i]]) + 10;
        }
        //
        limIoEmit("voteView", qNum, display, options, teamscore);
        // タイマー設定
        left = adtimer.default;
        //
        timer = setInterval(() =>{
          left--;
          let mLeft = ("00" + Math.floor(left/60)).slice(-2);
          let sLeft = ("00" + left % 60).slice(-2);
          limIoEmit("refTimer", mLeft, sLeft);
          //
          if(left <= 0){
            clearInterval(timer);
            limIoEmit("timeIsUp");
          }
        }, 1000);
      }, 1000);
      // 順位計算用配列用意
      teamrank = [];
      for (var i = 0; i < teamdata.length; i++) {
        // 順位割り出し
        teamrank.push([undefined, -1]);
      }
      correctTeams = 0;
    } else {
      io.emit("failedLaunch");
    }
  });

  // 解答集計
  socket.on("postAnswer", function(data) {
    let teamName = loginStatus[loginId.indexOf(socket.id)];
    let newData = [teamName, NaN];
    let teamIdx = 0;
    for (var i = 0; i < teamdata.length; i++) {
      if (teamdata[i][0] == teamName) {
        newData[1] = parseInt(teamdata[i][1], 10);
        teamIdx = i;
      }
    }
    //
    if (data.amount > teamscore[socket.id]) {
      data.amount = teamscore[socket.id];
    }
    // 例外処理
    if (newData[1] == NaN) {
      console.log(`\x1b[41mERROR\x1b[49m : Teamdata(${teamName}) is missing.`);
    }
    //
    let isCorrect = false;
    let curt = teamscore[socket.id];
    let result = curt - data.amount;  // 掛け金差し引き
    let magnif = 0;
    let cOption = gqObj.options[gqObj.answer].name;
    let cMagnif = gqObj.options[gqObj.answer].magnification;
    //
    if (data.option == gqObj.answer) {
      // correct
      magnif = gqObj.options[gqObj.answer].magnification;
      //
      isCorrect = true;
      correctTeams++;
    } else {
      // incorrect
      magnif = 0.0;
    }
    result += data.amount * magnif;
    if (result < 0) {
      result = 0;
    }
    teamrank[teamIdx] = [socket.id, result];
    // csvに保存
    newCsv[teamIdx][1] = result;
    teamscore[socket.id] = result;
    //
    io.to(socket.id).emit("refreshSpan", isCorrect, curt, result, data.amount, magnif, cOption, cMagnif);
    //
    if (anslgt == 0) {
      io.emit("resetList");
    }
    io.emit("refreshList", [correspo[socket.id], curt, result]);
    // すべてのクライアントから収集完了
    anslgt++;
    if (anslgt == loginId.length) {
      // 順位確定 - 久しぶりのバブルソート
      for (var i = 0; i < teamrank.length; i++) {
        for (var j = teamrank.length - 1; j > i; j--) {
          if (parseInt(teamrank[j][1]) < parseInt(teamrank[j-1][1])) {
            let tmp = teamrank[j];
            teamrank[j] = teamrank[j-1];
            teamrank[j-1] = tmp;
          }
        }
      }
      teamrank.reverse();
      //
      for (var i = 0; i < teamrank.length; i++) {
        if (teamrank[i][0] !== undefined) {
          io.to(teamrank[i][0]).emit("refreshRank", i+1, [correctTeams, loginStatus.length]);
        }
      }
      // csv書き込み
      newCsv = newCsv.join("\r\n");
      fs.writeFileSync("./data/teamdata.csv", newCsv);
      console.log(`\x1b[44mAD_CSV \x1b[49m : Updated teamdata.csv by ${socket.id}`);
      //
      srccsv = fs.readFileSync("./data/teamdata.csv", "utf8");
      teamdata = srccsv.split(/\r\n|\n/g);
      for (var i = 0; i < teamdata.length; i++) {
        teamdata[i] = teamdata[i].split(/,/);
      }
      //
      io.emit("referCsv", srccsv);
      //
      newCsv = teamdata;
      //
      setTimeout(function() {
        limIoEmit("resultView");
        io.emit("restartable");
      }, 1000);
    }
  });

  // ログアウト処理
  function logout(id) {
    // ログイン中のチームから削除
    let teamIdx = loginId.indexOf(id);
    console.log(`\x1b[43mLOGOUT\x1b[49m : ${loginStatus[teamIdx]}(${id})`);
    if (teamIdx !== -1) {
      loginStatus.splice(teamIdx, 1);
      loginId.splice(teamIdx, 1);
    }
    //
    io.emit("resLoginStatus", loginStatus);
  }

  // 切断時の処理
  socket.on("disconnect", () => {
    logout(socket.id);
  });

  // ログアウトリクエスト
  socket.on("logoutReq", function() {
    logout(socket.id);
  });

  // 以下アドミン

  // ログインリクエスト
  socket.on("loginReqAd", function(user, pass) {
    if (addata[user]) {
      if (addata[user].password == pass) {
        console.log(`\x1b[42mAD_SUCCESS\x1b[49m : ${socket.id}`);
          io.to(socket.id).emit("lgSccAd");
      } else {
        console.log(`\x1b[43mAD_FAILED \x1b[49m : ${socket.id}`);
        io.to(socket.id).emit("lgFalAd");
      }
    } else {
      console.log(`\x1b[43mAD_FAILED \x1b[49m : ${socket.id}`);
      io.to(socket.id).emit("lgFalAd");
    }
  });

  // 問題取得
  socket.on("getQjsonAd", function() {
    io.to(socket.id).emit("getQjsonAd", quest, adtimer, teamdata);
  });

  // 問題JSON更新
  socket.on("saveQuestJson", function(data) {
    fs.writeFileSync("./data/question.json", `[${JSON.stringify(data)}]`);
    console.log(`\x1b[44mAD_JSON\x1b[49m : Updated question.json by ${socket.id}`);
    // 問題文再読み込み
    quest = JSON.parse(fs.readFileSync("./data/question.json", "utf8"))[0];
    console.log(quest);
    //
    io.emit("savescc");
  });

  // タイマーJSON更新
  socket.on("saveTimerJson", function(data) {
    fs.writeFileSync("./data/timer.json", `[${JSON.stringify(data)}]`);
    console.log(`\x1b[44mAD_JSON\x1b[49m : Updated timer.json by ${socket.id}`);
    // 問題文再読み込み
    adtimer = JSON.parse(fs.readFileSync("./data/timer.json", "utf8"))[0];
    console.log(adtimer);
    //
    io.emit("savescc");
  });

  // ゲーム終了
  socket.on("terminateReq", function() {
    left = 0;
  });

  // csv取得
  socket.on("referCsv", function() {
    io.emit("referCsv", srccsv);
  });

  // csv更新
  socket.on("refreshCvs", function(file) {
    srccsv = file;
    teamdata = srccsv.split(/\r\n|\n/g);
    for (var i = 0; i < teamdata.length; i++) {
      teamdata[i] = teamdata[i].split(/,/);
    }
    //
    io.emit("referCsv", srccsv);
    io.emit("referCsvCli");
    //
    newCsv = teamdata;
  });

  // ログイン状況取得
  socket.on("getLoginStatus", function() {
    io.emit("resLoginStatus", loginStatus);
  });

  // 最終結果表示
  socket.on("finrView", function() {
    //
    let data = {};
    // チーム名と得点を得点順にソート
    let ranking = teamdata.slice(0, -1);
    for (var i = 0; i < ranking.length; i++) {
      for (var j = ranking.length - 1; j > i; j--) {
        if (parseInt(ranking[j][1]) < parseInt(ranking[j-1][1])) {
          let tmp = ranking[j];
          ranking[j] = ranking[j-1];
          ranking[j-1] = tmp;
        }
      }
    }
    ranking.reverse();
    data.rank = ranking;
    //
    console.log(data);
    //
    io.emit("finrView", data);
  });

  // 暫定順位更新
  // 上からコピーしたので冗長です
  socket.on("refreshPod", function() {
    //
    let data = {};
    // チーム名と得点を得点順にソート
    let ranking = teamdata.slice(0, -1);
    for (var i = 0; i < ranking.length; i++) {
      for (var j = ranking.length - 1; j > i; j--) {
        if (parseInt(ranking[j][1]) < parseInt(ranking[j-1][1])) {
          let tmp = ranking[j];
          ranking[j] = ranking[j-1];
          ranking[j-1] = tmp;
        }
      }
    }
    ranking.reverse();
    data.rank = ranking;
    //
    console.log(data);
    //
    io.to(socket.id).emit("refreshPod", data);
  });
});

// 公開フォルダの指定
app.use(express.static(path.join(__dirname, "public")));

// サーバーの起動
server.listen(PORT, () => {
  console.log("server starts on port: %d", PORT);
});
