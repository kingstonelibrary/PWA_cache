if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('serviceWorker.js')
   .then( function (registration) {
     console.log('serviceWorker.registerメソッド実行 in main js');
    registration.onupdatefound = function() {
      alert('SWスクリプト内にアップデート発見!！SWにmessageをpost！ in main js');
      if (typeof registration.update == 'function') {
        registration.update();
        navigator.serviceWorker.controller.postMessage('updateDesu!!', [channel.port1]);
        setTimeout(location.reload(),1000);
      }
    }
   })
   .catch(function (error) {
     console.log("Error Log: " + error);
   });
 }

 const channel = new MessageChannel();
 window.onload = function() {
  var updateBtn = document.getElementById('updateBtn')
  updateBtn.addEventListener("click", function(){
   navigator.serviceWorker.controller.postMessage('update', [channel.port2]);
   setTimeout(location.reload(),1000);
  }, false);
};