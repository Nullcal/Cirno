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

  // 暫定順位更新
  socket.emit("refreshPod");
  //
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
