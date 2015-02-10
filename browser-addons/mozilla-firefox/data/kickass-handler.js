var $$ = function(selector, el) {
  if (!el) {
    el = document;
  }
  // return el.querySelectorAll(selector);
  // Note: the returned object is a NodeList.
  // If you'd like to convert it to a Array for convenience, use this instead:
  return Array.prototype.slice.call(el.querySelectorAll(selector));
}

var $ = function(selector, el) {
  if (!el) {
    el = document;
  }
  var result = $$(selector, el);
  return result;
}

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 * 
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
 * 
 * @see http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
var getTextWidth = function(text, font) {
  // re-use canvas object for better performance
  var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  var context = canvas.getContext('2d');
  context.font = font || '12px arial';
  var metrics = context.measureText(text);
  return metrics.width;
};

var createNotice = function(pos) {
  var div = document.createElement('div');
  div.style.font = '12px arial';
  div.style.height = '2em';
  div.style.lineHeight = '2em';
  div.style.borderRadius = '2px';
  div.style.width = (getTextWidth('Magnet link added.') + 4) + 'px';
  div.innerHTML = 'Magnet link added.';
  div.style.position = 'absolute';
  div.style.top = pos.y  + 'px';
  div.style.left = pos.x  + 'px';
  div.style.background = '#2491FF';
  div.style.border = '1px solid #4DC0E8';
  div.style.padding = '2px';
  return div;
};

//http://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
var getSize = function() {
  return {x: window.innerWidth, y: window.innerHeight};
}

//The magnet link has been added and we can show taht to the user.
self.port.on('magnetAdded', function() {
  var size = getSize();
  size.x = 10;
  size.y -= 40; 
  console.log(size);
  var div = createNotice(size);
  document.body.appendChild(div);
  
  setTimeout(function() {
    div.style.visibility = 'hidden';
    div.style.display = 'none';
  }, 3000);
});

var elems = $('a[href^="magnet:"]');
elems.forEach(function(elem) {
  elem.addEventListener('click', function(event) {
    event.preventDefault();
    self.port.emit('addMagnet', event.currentTarget.getAttribute('href'));
  });
});
