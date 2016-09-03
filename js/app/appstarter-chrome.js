chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('appstarter-chrome.html', {
    'bounds': {
      'width': 800,
      'height': 600
    }
  });
});