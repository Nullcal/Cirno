"use strict";

const socket = io.connect();

let quse = 1;

$(function() {
  //
  for (var i = 0; i < 32; i++) {
    console.log(
      "%c　警告　%c\n ここにコードを書かないでください。最悪の場合ゲームが進行不能になります。",
      "color:white; background-color:red; padding:2px; border-radius:4px; font-size: 32px; font-weight: 900;",
      "font-size: 24px; font-weight: 900;"
    );
    console.info("");
  }

  // ログインリクエスト
  $("#login").on("click", function() {
    socket.emit("loginReqAd", $("#lgUser").val(), $("#lgPass").val());
  });

  // ログイン失敗
  socket.on("lgFalAd", function() {
    $(".login").children("input, span").addClass("error");
  });
  //エラー解除
  $(".login").children("input").on("input", function(e) {
    $(".error").removeClass("error");
  });

  // ログイン成功
  socket.on("lgSccAd", function() {
    $(".loginPanel").css({"opacity":"0", "pointer-events":"none"});
    $("title").html("ゲーム設定");
    // 問題読み出し
    socket.emit("getQjsonAd");
  });

  // 問題読み出し続き
  let qBox = '<div class="qBox vertflex"></div>';
  let oBox = '<div class="oBox vertflex"></div>';
  let obBox = '<div class="obBox vertflex"></div>';
  //
  socket.on("getQjsonAd", function(data, timelim, teamNames) {
    let keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      let quest = data[keys[i]];
      $(".qoBox").append(qBox);
      $(".qBox").eq(i).append(`<div class="qtBox"><input class="qTitle" type="text" value="${quest.title}"><button class="delQuest vertflex" type="button" name="button"><span>×</span></button></div>`)
        .append(obBox)
        .append(`<button class="addOpt" type="button" name="button">選択肢を追加</button>`)
        .append(`<button class="useQuest" type="button" name="button">この問題を使用</button>`);
      for (var j = 0; j < quest.options.length; j++) {
        let qoCont = quest.options[j];
        $(".obBox").eq(i).append(oBox);
        if (j == quest.answer) {
          $(".qBox").eq(i).find(".oBox").eq(j).addClass("answer")
            .append(`<button class="delOpt vertflex" type="button" name="button" disabled><span>×</span></button>`);
        } else {
          $(".qBox").eq(i).find(".oBox").eq(j).append(`<button class="delOpt vertflex" type="button" name="button"><span>×</span></button>`);
        }
        $(".qBox").eq(i).find(".oBox").eq(j).append(`<input class="qOption" type="text" value="${qoCont.name}">`)
          .append(`<button class="setAns" type="button" name="button"></button>`)
          .append(`<span>x</span><input class="qMagnif" type="number" value="${qoCont.magnification}">`);
      }
    }
    $(".qTimer").val(timelim.default);
    //
    for (var i = 0; i < teamNames.length - 1; i++) {
      $(".slBox").append(`<div id="tBox${teamNames[i][0]}" class="tBox vertflex"></div>`);
      let parent = $(document).find(".tBox").filter(":last");
      parent.append(`<span class="slTeamname">${teamNames[i][0]}</span>`)
        .append(`<div class="slScoreBox vertflex"></div>`);
      parent.find(".slScoreBox").append(`<span class="slPrevScore">---P</span>`)
        .append(`<div class="slArrow vertflex"><div class="slTriangle"></div></div>`)
        .append(`<input class="slCurtScore" type="text" name="" value="---P">`);
    }
    // csv読み出し
    socket.emit("referCsv");
  });

  // 集計中表示へ遷移
  socket.on("showable", function() {
    $("#showAnswer").attr("disabled", false);
    $("#forceTerminate").attr("disabled", true);
    $("#killGame").attr("disabled", true);
  });

  // 結果表示へ遷移
  $("#showAnswer").on("click", function() {
    $("#showAnswer").attr("disabled", true);
    socket.emit("reqResultView");
    //
    $("#startGame").attr("disabled", false);
    // 順位更新
    socket.emit("refreshPod");
  });
  
  // 強制終了時にデータ破棄
  socket.on("gameTerminated", function() {
    $("#startGame").attr("disabled", false);
    $("#forceTerminate").attr("disabled", true);
    $("#killGame").attr("disabled", true);
  });

  // 解答設定
  $(document).on("click", ".setAns", function() {
    let parent = $(this).parent();
    parent.parent().find("*").removeClass("answer");
    parent.addClass("answer");
    parent.parent().find(".delOpt").attr("disabled", false);
    parent.find(".delOpt").attr("disabled", true);
  });

  // 選択肢追加
  $(document).on("click", ".addOpt", function() {
    let parent = $(this).parent();
    parent.find(".obBox").append(oBox);
    parent.find(".obBox").find(".oBox").filter(":last").append(`<button class="delOpt vertflex" type="button" name="button"><span>×</span></button>`)
      .append(`<input class="qOption" type="text" value="${"できたてほやほやの選択肢"}">`)
      .append(`<button class="setAns" type="button" name="button"></button>`)
      .append(`<span>x</span><input class="qMagnif" type="number" value="${1}">`);
  });

  // 選択肢削除
  $(document).on("click", ".delOpt", function() {
    let parent = $(this).parent();
    parent.remove();
  });

  // 問題使用
  $(document).on("click", ".useQuest", function() {
    let parent = $(this).parent();
    $(".qBox").removeClass("using");
    parent.addClass("using");
    quse = $(".qBox").index(parent) + 1;
    $("#startGame").attr("disabled", false);
  });

  // 問題追加
  $(document).on("click", ".addQuest", function() {
    $(".qoBox").append(qBox);
    $(".qBox").filter(":last").append(`<div class="qtBox"><input class="qTitle" type="text" value="ご注文は新しい問題ですか？"><button class="delQuest vertflex" type="button" name="button"><span>×</span></button></div>`)
      .append(obBox)
      .append(`<button class="addOpt" type="button" name="button">選択肢を追加</button>`)
      .append(`<button class="useQuest" type="button" name="button">この問題を使用</button>`);
    $(".qBox").filter(":last").find(".obBox").append(oBox)
      .find(".oBox").filter(":last").addClass("answer")
      .append(`<button class="delOpt vertflex" type="button" name="button" disabled><span>×</span></button>`)
      .append(`<input class="qOption" type="text" value="${"できたてほやほやの選択肢"}">`)
      .append(`<button class="setAns" type="button" name="button"></button>`)
      .append(`<span>x</span><input class="qMagnif" type="number" value="${1}">`);
  });

  // 問題削除
  $(document).on("click", ".delQuest", function() {
    console.log("aoreugh");
    let parent = $(this).parent().parent();
    parent.remove();
  });

  // 空白対策
  $(document).on("change", ".qMagnif", function() {
    if (!$(this).val()) {
      $(this).val(1);
    }
  });
  $(document).on("change", ".qTimer", function() {
    if (!$(this).val()) {
      $(this).val(30);
    }
  });

  // 問題文の変更内容保存
  $(".saveQchanges").on("click", function() {
    let newData = {};
    let qNum = $(".qBox").length;
    let idxOffset = 0;
    for (var i = 0; i < qNum; i++) {
      let qBox = $(".qBox").eq(i);
      newData[`q${i+1}`] = {
        "title" : qBox.find(".qTitle").val(),
        "answer" : qBox.find(".answer").find(".qOption").index(".qOption") - idxOffset,
        "options" : []
      };
      for (var j = 0; j < qBox.find(".qOption").length; j++) {
        let oObj = {
          "id" : j,
          "name" : qBox.find(".qOption").eq(j).val(),
          "magnification" : qBox.find(".qMagnif").eq(j).val()
        }
        newData[`q${i+1}`].options.push(oObj);
      }
      idxOffset += qBox.find(".qOption").length;
    }
    //
    socket.emit("saveQuestJson", newData);
  });

  // ゲーム開始
  $("#startGame").on("click", function() {
    socket.emit("startReq", quse);
  });

  // ゲーム強制終了
  $("#forceTerminate").on("click", function() {
    socket.emit("terminateReq", quse);
  });
  
  // ゲームデータ破棄
  $("#killGame").on("click", function() {
    socket.emit("terminateReqDiscard", quse);
  });

  // 重複起動防止
  socket.on("unrestartable", function() {
    $("#startGame").attr("disabled", true);
    $("#forceTerminate").attr("disabled", false);
    $("#killGame").attr("disabled", false);
  });

  // 一覧リセット
  socket.on("resetList", function(data) {
    console.log("reset");
    $(`.tBox`).find(".slPrevScore").html(`---P`);
    $(`.tBox`).find(".slCurtScore").val(`---P`);
  });

  // 一覧取得
  socket.on("refreshList", function(data) {
    console.log("set");
    $(`#tBox${data[0]}`).find(".slPrevScore").html(`${data[1]}P`);
    $(`#tBox${data[0]}`).find(".slCurtScore").val(`${data[2]}P`);
  });

  // タイマーの変更内容保存
  $(".saveTchanges").on("click", function() {
    let newData = {};
    let value = $(".qTimer").val();
    newData.default = value;
    //
    socket.emit("saveTimerJson", newData);
  });

  // 保存成功
  socket.on("savescc", function() {
    alert("変更を保存しました。リロードして更新します。");
  });

  // cvsをインポート
  $("#importCsv").on("change", function(e) {
    let url = e.target.files[0];;
    let reader = new FileReader();
    reader.onload = function() {
      let file = atob(reader.result.split(",")[1]);
      socket.emit("refreshCsv", file);
    }
    reader.readAsDataURL(url);
  });
  
  // チームスコアをリセット
  $("#resetTeamScore").on("click", function() {
    // 角煮
    if (confirm('本当にチームスコアをリセットしてもよろしいですか？')) {
      socket.emit("resetCsv");
    }
  });

  // csvを取得
  socket.on("referCsv", function(csv) {
    let dispcsv = csv;
    $(".cvsViewer").html(dispcsv);
    // csvをダウンロード
    let bom = new Uint8Array([0xEF, 0xBB, 0xBF])
    let blob = new Blob([bom, dispcsv], {type: "text/csv"});
    let url = (window.URL || window.webkitURL).createObjectURL(blob);
    let a = document.getElementById("downloadCsv");
    a.download = "teamdata.csv";
    a.href = url;
    //
    socket.emit("refreshPod");
    // ログイン状況管理
    $(".adLogin").empty();
    let teamlist = dispcsv.replace(/\r/g, "").split("\n");
    for (var i = 0; i < teamlist.length; i++) {
      let tname = teamlist[i].split(",")[0];
      $(".adLogin").append(`<span id="ls${tname}" class="loginname">${tname}</span>`);
    }
    //
    socket.emit("getLoginStatus");
  });

  // ログイン状況更新
  socket.on("resLoginStatus", function(status) {
    $(".alreadyl").removeClass("alreadyl");
    for (var i = 0; i < status.length; i++) {
      $(`#ls${status[i]}`).addClass("alreadyl");
    }
  });

  // 最終結果表示
  socket.on("failedLaunch", function() {
    alert("ゲームの起動に失敗しました。最低でも1人のプレイヤーがログインしている必要があります。");
  });

  // 最終結果表示
  $("#forcePodium").on("click", function() {
    socket.emit("finrView");
  });

  // 暫定順位更新
  $(".refreshPodium").on("click", function() {
    socket.emit("refreshPod");
  });
  socket.on("refreshPod", function(data) {
    $(".adPodi").empty();
    //
    for (var i = 0; i < data.rank.length; i++) {
      let thisname = data.rank[i][0];
      let thisscore = data.rank[i][1];
      //
      $(".adPodi").append(`<div class="adPodiums vertflex"></div>`);
      $(".adPodiums").filter(":last").append(`<span class="adpPlace">#${i+1}</span>`)
        .append(`<div class="adPodiCont vertflex"><span class="adpName">${thisname}</span><span class="adpScore">${thisscore}P</span></div>`);
    }
  });
});
