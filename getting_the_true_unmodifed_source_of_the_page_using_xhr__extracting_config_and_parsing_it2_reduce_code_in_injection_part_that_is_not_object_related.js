NodeList.prototype.filter = Array.prototype.filter;

function get(url, done_callback){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if(XMLHttpRequest.DONE !== xhr.readyState)            return;
    if(null === xhr.response)                             return;
    if("function" !== typeof xhr.response.querySelector)  return;
    done_callback(xhr);
  };
  xhr.withCredentials = false;
  xhr.responseType    = "document";
  xhr.overrideMimeType("text/html;charset=UTF-8");
  xhr.open('GET', url, true);
  xhr.send();  
}


var REGEX = /ytplayer\.config\s*\=\s*\{/m;


get(top.location.href, function(xhr){
  var doc, ytplayerconfig_src;

  doc = xhr.response;

  ytplayerconfig_src = doc.querySelectorAll("script:not([src])")
                          .filter(function(element){
                            return REGEX.test(element.innerText)
                          })
                          .shift()
                          ;
  if("undefined" === typeof ytplayerconfig_src) return;
  
  //generate an alternative object
  ytplayerconfig_src = ytplayerconfig_src.innerText
                                         .replace(/[\r\n]+/g, " ")
                                         .replace(/ytplayer/gm, "mockplayer")
                                         .replace(/mockplayer\.[^c].+$/gm, "")  //cleans-up non-obj code.
                                         ;

  var script = document.createElement("script");  //main document.
  script.innerHTML = ytplayerconfig_src;
  (document.querySelector("body") || document.documentElement).appendChild(script);

  if("undefined" === typeof mockplayer.config) return;

  console.log(
    self.mockplayer.config
  )
});

