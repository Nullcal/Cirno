"use strict";

// クライアントからサーバーへの接続要求
const socket = io.connect();

let loadpast = true;

// デバイスのチーム
let ownteam = null;
let ownscore = undefined;

// 接続時の処理
socket.on("connect", () => {
  console.log("connect");
});

$(function() {
  // セレクトボックスの中身を生成
  socket.on("generateSelect", function(rowData){
    $("#teamId").append(`<option value="${rowData}">${rowData}</option>`)
  });

  // ログインリクエスト
  $("#login").on("click", function() {
    socket.emit("loginReq", $("#teamId").val());
  });

  // トランジション
  function transMove(eFrom, eTo, dir) {
    let asset = ["move", "back"];
    $(".transitionPanels").css("display", "block");
    //
    $(".dto").removeClass(`${asset[1-dir]}to`);
    $(".dto").removeClass(`${asset[1-dir]}from`);
    //
    $(".dto").removeClass(`${asset[dir]}to`);
    $(".dfrom").addClass(`${asset[dir]}from`);
    //
    setTimeout(function() {
      eFrom.css("display", "none");
      eTo.css("display", "flex");
      //
      $(".dfrom").removeClass(`${asset[dir]}from`);
      $(".dto").addClass(`${asset[dir]}to`);
      setTimeout(function() {
        $(".transitionPanels").css("display", "none");
      }, 400);
    }, 400);
  }

  // ログイン成功
  socket.on("loginSuccess", function(team, score) {
    // ログインしたチームを記録
    ownteam = team;
    ownscore = score;
    console.log(ownteam, ownscore);
    //
    $(".sinfo").text(`チーム${ownteam}のポイントは...`);
    $(".wscore").text(`${ownscore}P`);
    //
    transMove($(".welcome"), $(".waitroom"), 0);
  });

  // エラー表示
  function showErrorPopup() {
    $(".loginFailed").css("display", "block");
    $(".loginFailed").removeClass("bgblurhide");
    $(".loginFailed").addClass("bgblursnow");
    $(".popup").css("display", "none");
    setTimeout(function() {
      $(".popup").css("display", "flex");
      $(".popup").removeClass("popupscalehide");
      $(".popup").addClass("popupscaleshow");
    }, 200);
    setTimeout(function() {
      $(".loginFailed").addClass("bgblur");
    }, 400);
  }

  // ログイン失敗
  socket.on("loginFailed", function(team) {
    // ログイン失敗ポップアップ
    showErrorPopup();
  });
  // ポップアップ閉じる
  $(".closepopup").on("click", function() {
    $(".popup").removeClass("popupscaleshow");
    $(".popup").addClass("popupscalehide");
    $(".loginFailed").removeClass("bgblursnow");
    $(".loginFailed").addClass("bgblurhide");
    setTimeout(function() {
      $(".popup").css("display", "none");
    }, 200);
    setTimeout(function() {
      $(".loginFailed").css("display", "none");
      $(".loginFailed").removeClass("bgblur");
    }, 400);
  });

  // ログアウトリクエスト
  $("#logout").on("click", function() {
    socket.emit("logoutReq");
    //
    transMove($(".waitroom"), $(".welcome"), 1);
  });

  // ゲーム開始（ユーザー用仮）
  $("#tmpStart").on("click", function() {
    socket.emit("startReq", 2);
  });

  // ゲーム開始表示
  socket.on("failedLaunch", function() {
    // ログイン失敗ポップアップ
    showErrorPopup();
  });

  // ゲーム開始表示
  socket.on("startView", function() {
    transMove($(".waitroom"), $(".startview"), 0);
  });

  // ゲーム開始（問題表示）
  socket.on("voteView", function(qNum, display, options) {
    // 毎ターンのポイント付与
    ownscore *= 1;
    ownscore += 10;
    //
    $(".tQnum").text(`-Q${qNum}-`);
    $(".tQuest").text(display);
    for (var i = 0; i < options.length; i++) {
      let optname = options[i].name;
      let optval = options[i].id;
      let optmag = options[i].magnification;
      $(".optContainer").append(`<input type="radio" name="option" value="${optval}" id="opt${optval}"><label for="opt${optval}" class="optionLabel"><span class="tOptName">${optname}</span><span class="tOptMag">x${optmag}</span></label>`)
    }
    $("#rBetVal").attr("max", ownscore);
    $(".tBetVal").text(`${$("#rBetVal").val()}P`);
    $(".tScoreVal").text(`${ownscore}P`);
    //
    transMove($(".startview"), $(".voteview"), 0);
  });

  // レンジ内容反映
  $("#rBetVal").on("input", function() {
    $(".tBetVal").text(`${$("#rBetVal").val()}P`);
  });

  // タイマー更新
  socket.on("refTimer", function(mLeft, sLeft) {
    $(".tTimerVal").text(`${mLeft}:${sLeft}`);
  });

  // ゲーム終了
  socket.on("timeIsUp", function() {
    //
    $(".voteview").css("display", "none");
    $(".timeisup").css("display", "flex");
  });
});
