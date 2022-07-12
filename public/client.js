"use strict";

// クライアントからサーバーへの接続要求
const socket = io.connect();

let loadpast = true;

let ignoreWarn = false;

// デバイスのチーム
let ownteam = null;
let ownscore = undefined;

// 接続時の処理
socket.on("connect", () => {
  for (var i = 0; i < 32; i++) {
    console.log(
      "%c　警告　%c\n ここにコードを書かないでください。最悪の場合ゲームが進行不能になります。",
      "color:white; background-color:red; padding:2px; border-radius:4px; font-size: 32px; font-weight: 900;",
      "font-size: 24px; font-weight: 900;"
    );
    console.info("");
  }
});

// ページ離脱時の処理
window.onbeforeunload = function(e) {
  if (!ignoreWarn) {
    e.returnValue = "ページを離れようとしています。よろしいですか？"; 
  }
}

$(function() {
  // セレクトボックスの中身を生成
  socket.on("emptySelect", function(){
    $("#teamId").empty();
  });
  socket.on("generateSelect", function(rowData){
    $("#teamId").append(`<option value="${rowData}">${rowData}</option>`);
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
      $(".display").css("display", "none");
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
    //console.log(ownteam, ownscore);
    //
    $(".sinfo").text(`チーム${ownteam}のポイントは...`);
    $(".wscore").text(`${ownscore}P`);
    //
    transMove($(".welcome"), $(".waitroom"), 0);
  });

  // ログイン失敗
  socket.on("loginFailed", function(team) {
    // ログイン失敗アラート
    alert(`＊ログインに失敗しました＊\n\n${team} は既に別のデバイスでログインされています。心当たりのない場合は企画委員にお声掛けください。`);
  });

  // ログアウトリクエスト
  $("#logout").on("click", function() {
    socket.emit("logoutReq");
    //
    transMove($(".waitroom"), $(".welcome"), 1);
  });

  // ゲーム開始表示
  socket.on("startView", function() {
    transMove($(".waitroom"), $(".startview"), 0);
  });

  // ゲーム開始（問題表示）
  socket.on("voteView", function(qNum, display, options, teamscore) {
    // 毎ターンのポイント付与
    ownscore = teamscore[socket.id];
    //
    $(".tQnum").text(`-Q${qNum}-`);
    $(".tQuest").text(display);
    $(".optContainer").empty();
    for (var i = 0; i < options.length; i++) {
      let optname = options[i].name;
      let optval = options[i].id;
      let optmag = options[i].magnification;
      $(".optContainer").append(`<input type="radio" name="option" value="${optval}" id="opt${optval}"><label for="opt${optval}" class="optionLabel"><span class="tOptName">${optname}</span><span class="tOptMag">x${optmag}</span></label>`);
      if (i == 0) {
        $(`#opt${optval}`).attr("checked", true);
      }
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
    transMove($(".voteview"), $(".timeisup"), 0);
    // データ送信
    let inputData = {
      "option" : $("input:radio[name='option']:checked").val(),
      "amount" : $("#rBetVal").val()
    }
    //
    socket.emit("postAnswer", inputData);
  });

  // 結果表示内容更新
  socket.on("refreshSpan", function(isCorrect, curt, result, amount, magnif, cOption, cMagnif) {
    if (isCorrect) {
      $(".taResult").text(`おめでとう！`);
      $(".tasGetScore").text(`${amount*magnif}P`);
      $(".tasGetScore").css("color", "inherit");
    } else {
      $(".taResult").text(`残念...`);
      $(".tasGetScore").text(`-${amount}P`);
      $(".tasGetScore").css("color", "#bf0000");
    }
    $(".taTitle").text(`${cOption}`);
    $(".taMagnif").text(`x${cMagnif}`);
    $(".tasAmountVal").text(`${amount}P`);
    $(".tasMagnifVal").text(`${magnif}`);
    $(".tatScoreVal").text(`${result}P`);
  });

  // 順位更新
  socket.on("refreshRank", function(rank, correctts) {
    $(".taRank").text(`現在 ${correctts[1]} チーム中 ${rank} 位`);
    $(".taCateam").text(`${correctts[1]} チーム中 ${correctts[0]} チームが正解！`);
  });

  // 結果表示へ遷移
  socket.on("resultView", function() {
    transMove($(".timeisup"), $(".resultview"), 0);
  });

  // 最終結果表示へ遷移
  socket.on("finrView", function(data) {
    // html更新
    // 表彰台
    for (var i = 0; i < 3; i++) {
      let parent = $(`#pod${i+1}`);
      parent.find(".fpTeamname").html(data.rank[i][0]);
      parent.find(".fpScore").html(`${data.rank[i][1]}P`);
    }
    // ペアチームのスコア
    let parescore = 0;
    let pareteam = ownteam.slice(0, -1) + "1";
    if (ownteam.slice(-1) == "1") {
      pareteam = ownteam.slice(0, -1) + "2";
    }
    // 自分の順位とスコア
    for (var i = 0; i < data.rank.length; i++) {
      // 自ちーむ
      if (data.rank[i][0] == ownteam) {
        $(".tRankBig").html(`${i+1}`);
        $(".tScore").html(`${data.rank[i][1]}P`);
        parescore += parseInt(data.rank[i][1]);
      }
    }
    //
    transMove($(".resultview"), $(".finalview"), 0);
  });

  // バグ回避のためcsv更新で強制ログアウト
  socket.on("referCsvCli", function() {
    ignoreWarn = true;
    location.reload();
  });
  
  // 問題を間違えて送信した場合に強制ログアウト＋変更破棄
  socket.on("gameTerminated", function() {
    alert("ゲームが中止されました。タイトル画面に戻ります。");
    ignoreWarn = true;
    location.reload();
  });
});
