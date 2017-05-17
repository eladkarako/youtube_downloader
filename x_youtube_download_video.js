(function(window,document, info){
  "use strict";

    window.setTimeout(function(){     //execute a non-blocker

      info.link.href = info.vid_href;
      info.link.download = info.vid_downloadfilename;
      info.link.title = info.link.title
                          .replace("##TITLE_FULL##", info.vid_title_full)
                          .replace("##VID_TYPE##", info.vid_type)
                          .replace("##VID_DURATION##", (~~info.vid_duration))
                        ;

      info.placement.insertBefore(info.link, info.placement.firstElementChild);

    }, 200);

  }(window,document, {"_":""
    ,'placement':             document.querySelector("#video-player-object-wrapper")
    ,'placement_first':       document.querySelector("#video-player-object-wrapper").firstElementChild
    ,'link':                  (function(){
                                 var a       = document.createElement('a');
                                 a.target    = "_self";
                                 a.rel       = "nofollow";
                                 a.className = "download_button";
                                 a.title     = "Click To Download \"##TITLE_FULL##\" (##VID_TYPE##: ##VID_DURATION## Seconds)";
                                 a.appendChild(document.createTextNode("&dArr; Download"));
                                 return a;
                              }())
    ,'style':                  (function(){
                                 var s  = document.createElement('style');
                                 s.type = "text/css";
                                 s.appendChild(document.createTextNode(
                                 '.download_button{background-color:rgba(255,183,57,.8);border:3px solid rgba(255,183,57,.3);border-radius:10px;box-shadow:2px 2px 2px rgba(255,255,255,.3);cursor:pointer;display:block;height:30px;height:100% !important;margin:0px 0px 10px 0px;max-width:100px;outline:1px rgba(255,255,255,.3);text-align:center;transition:all .3s ease-in-out;-webkit-font-smoothing:subpixel-antialiased;}'
                               + '.download_button:hover{background-color:rgba(255,237,142,.8);border:3px solid rgba(255,237,142,.3);}'
                                 ));
                                 document.getElementsByTagName("body")[0].appendChild(s); //already add this to the document (parsed into stylesheet)
                                 return s; //unneeded..
                              }())
    ,'vid_href':              bootstrappedData.slugged_video.segments[0].assets[0].url
    ,'vid_downloadfilename':  encodeURI((bootstrappedData.slugged_video.collection_title + " - " + bootstrappedData.slugged_video.title + " - " + bootstrappedData.slugged_video.description).replace("\n","").replace("\r","").replace(".","")) + ".flv"
    ,'vid_title_full':        (bootstrappedData.slugged_video.collection_title + " - " + bootstrappedData.slugged_video.title + " - " + bootstrappedData.slugged_video.description).replace("\n","").replace("\r","").replace(".","")
    ,'vid_duration':          bootstrappedData.slugged_video.segments[0].assets[0].duration
    ,'vid_type':              bootstrappedData.slugged_video.segments[0].assets[0].mime_type
 })
);