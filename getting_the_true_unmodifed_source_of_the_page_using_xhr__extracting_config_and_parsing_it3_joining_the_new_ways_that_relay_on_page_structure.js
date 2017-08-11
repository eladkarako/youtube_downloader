NodeList.prototype.filter = Array.prototype.filter;


function parse(s){  //parse escaped line of stream-map into a workable object.
 return s.split(",")
         .map(function(formats){
                return formats.split("&")
                              .reduce(function(obj, keyvalue){
                                        keyvalue = keyvalue.split("=").map(function(escaped){return decodeURIComponent(escaped);});
                                        obj[ keyvalue[0] ] = keyvalue[1];
                                        return obj;
                              },{});
         });
}


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


function get_text_of_config(url, callback){ //XHR and extract text of 'ytplayer.config' from RAW HTML. Walkaround for actual page hiding it.
  get(url, function(xhr){
    var doc  = xhr.response
       ,text = undefined
       ;
    
    try{
      text = doc.querySelectorAll("script:not([src])")
                .filter(function(element){
                  return /ytplayer\.config\s*\=\s*\{/m.test(element.innerText)
                })
                .shift()
                .innerText                      //---- might break here since the shift() result may be undefine.
                .replace(/[\r\n]+/g, " ")
                .replace(/ytplayer\.[^c].+$/gm, "")    //cleans-up non-obj code.
                ;
    }catch(err){}
    
    callback(text);
  });
}


function get_resources(url, callback){
  get_text_of_config(url, function(text){
    var script, resources = {};
    
    text = text.replace(/ytplayer/gm, "mockplayer");    //embedding in the main document for cheap parsing. mockplayer is just to be different.
    
    script = document.createElement("script");
    script.innerHTML = text;
    ( document.querySelector("body") ||
      document.documentElement          ).appendChild(script);

    resources = {};
    resources.standard = parse(self.mockplayer.config.args.url_encoded_fmt_stream_map);   //on a perfect world it would have been:  ytplayer.config.args.url_encoded_fmt_stream_map
    resources.adaptive = parse(self.mockplayer.config.args.adaptive_fmts);                //ytplayer.config.args.adaptive_fmts

    
    callback(resources);

//  script.parentElement.removeChild(script);     //cleanup. script element.
//  delete self.mockplayer;                       //cleanup. config object.
  });
}


get_resources(self.location.href, function(resources){
  console.log(resources);
});