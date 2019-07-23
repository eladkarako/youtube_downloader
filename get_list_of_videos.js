NodeList.prototype.map      = Array.prototype.map;
Object.prototype.getKeys    = function(){ return Object.keys(this);                                                 };
String.prototype.toBase64   = function(){ return btoa(unescape(encodeURIComponent(this)));                          };
String.prototype.fromBase64 = function(){ return decodeURIComponent(escape(atob(this)));                            };
String.prototype.reverse    = function(){ return this.split("").reverse().join("");                                 };
Number.prototype.reverse    = function(){ return (Math.abs(this)/this) * Number(String(Math.abs(this)).reverse());  };

var TEMPLATE  = '<a id="##ID##"  href="data:text/plain;charset:UTF-8;base64,##BASE64##" title="videos" download="videos.txt" charset="UTF-8">videos.txt</a>'
   ,container = document.createElement("div")
   ,list
   ,target    = document.querySelector('[id^="browse-items-primary"]')
   ;

list = document.querySelectorAll('a[href*="/watch"]')
               .map(function(element){return element.href;})
               .reduce(function(carry, item){
                  carry[item] = 1;
                  return carry;
                },{}).getKeys()
               .join("\n")
               ;

container.innerHTML = TEMPLATE.replace(/##ID##/,     "button_videos_" + Number(new Date()).reverse().toString(32))
                              .replace(/##BASE64##/, list.toBase64())
                              ;

container = container.querySelector("a");

target.insertBefore(container, target.firstElementChild);
