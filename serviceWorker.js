var CACHE_NAME  = "fb-cache-v8-59";

var urlsToCache = [
    "index.html",
    "favicon.ico",
    "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
    "css/bootstrap.css",
    "js/bootstrap.js",
    "logo/logo192.png",
    "offline.html",
    "img/fireflower.jpg"
];

// 残したいキャッシュのバージョンをこの配列に入れる
// 基本的に現行の1つだけでよい。他は削除される。
const CACHE_KEYS = [
  CACHE_NAME
];

// インストール時、登録リソースのキャッシュ
self.addEventListener('install', function(event) {
  return install(event);
});

// message時、登録リソースのキャッシュ
self.addEventListener('message', function(event) {
  console.log('gotten message & deleted cache! data:' + event.data)
  caches.delete(CACHE_NAME);
  // return install(event);       //キャッシュ消去後、すぐに再キャッシュしたい時
  return (null);                  // キャッシュ消すだけで、次のページロード時に再キャッシュする時
});

// インストール（登録リソースのキャッシュ）
const install = (event) => {
  return event.waitUntil(
    caches.open(CACHE_NAME)                 // 上記で指定しているキャッシュ名（まだなければ生成）
      .then(
      function(cache){
          return cache.addAll(urlsToCache); // 指定したリソースをキャッシュへ追加
      })                                    // 1つでも失敗したらService Workerのインストールはスキップされる
      .catch(function(err) {
        console.log(err);
      })
  );
}

//現行バージョンのServiceWorkerが有効化されたとき古いキャッシュがあれば削除する
self.addEventListener('activate', event => {
  console.log('enter activate handler');
  event.waitUntil(self.clients.claim());    // activate ですぐに新しいSWによるコントロールを開始する
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => {
          return !CACHE_KEYS.includes(key);
        }).map(key => {
          // 不要なキャッシュを削除 'activate'イベントなので次にサイトアクセスした時、削除が実行される
          console.log(key + 'を削除しました')
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim()   // active 状態になったらすぐにコントロールさせたい
});


self.addEventListener('fetch', function(event) {
  var online = navigator.onLine;
  console.log('getting in fetch');
  
  // ファイルパス ~/test.htmlにアクセスすると、このファイル自体は無いがServiceWorkerがResponseを作成して表示してくれる
  if (event.request.url.indexOf('test.html') != -1) {
    return event.respondWith(new Response('そのURLに対するメッセージをここで自由に返却できる'));
  }

  if(online){
    console.log("ONLINE");
    //このパターンの処理では、Responseだけクローンすれば問題ない
    //cloneEventRequest = event.request.clone();
    event.respondWith(
      caches.match(event.request)
        .then(
        function (response) {
          if (response) {
            //オンラインでもローカルにキャッシュでリソースがあればそれを返す
            //この return を無効にすればオンラインのときは常にオンラインリソースを取りに行き、
            //その最新版をキャッシュにPUTする
            return response;
          }
          //request streem 1
          return fetch(event.request)
            .then(function(response){
              //ローカルキャッシュになかった OR キャッシュ探索を無効にしてたらネットワークから落とす
              //ネットワークから落とせてればここでリソースが返される
              // Responseはストリームなのでキャッシュで使用してしまうと、ブラウザの表示で不具合が起こる(っぽい)ので、複製したものを使う
              cloneResponse = response.clone();
              if(response){
                if(response || response.status == 200){
                  console.log("正常にリソースを取得 in fetch");
                  caches.open(CACHE_NAME)
                    .then(function(cache)
                    {
                      console.log("キャッシュへ保存 in fetch");
                      //初回表示でエラー起きているが致命的でないので保留
                      cache.put(event.request, cloneResponse)
                      .then(function(){
                        console.log("保存完了 in fetch");
                      });
                    });
                }else{
                  return event.respondWith(new Response('200以外のエラーをハンドリングしたりできる'));
                }
                return response;
              }
            }).catch(function(error) {
              return console.log(error);
            });
        })
    );
  }else{
    console.log("OFFLINE");
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          // キャッシュがあったのでそのレスポンスを返す
          if (response) {
            return response;
          }
          //オフラインでキャッシュもなかったパターン＝オフライン時専用ページを返す
          return caches.match("offline.html")
              .then(function(responseNodata)
              {
                return responseNodata;
              });
        }
      )
    );
  }
});
