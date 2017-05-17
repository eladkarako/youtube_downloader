    if(Page_v!=='' || document.URL.indexOf("/user/") >= 0){
        if (document.querySelector("#movie_player")) {
          SA_block(document.querySelector("#movie_player"));
        } 
        else {
          document.addEventListener("DOMNodeInserted", function(e) {
            if (e.target.id != "movie_player")
              return;
            SA_block(e.target);
            this.removeEventListener('DOMNodeInserted', arguments.callee, false);
          }, false);
        }
    }	



  function SA_block(videoplayer) {
    var flashVars = videoplayer.getAttribute('flashvars');
    var inParam = false;
    if(!flashVars) {
        flashVars = videoplayer.querySelector('param[name="flashvars"]');
  
        if(!flashVars)
            return;
        inParam = true;
        flashVars = flashVars.getAttribute("value");
    }
    var adRegex = /(^|\&)((ad_.+?|prerolls|interstitial)\=.+?|invideo\=true)(\&|$)/gi;
    if(!adRegex.test(flashVars))
        return;
  
    var adReplaceRegex = /\&((ad_\w+?|prerolls|interstitial|watermark|infringe)\=[^\&]*)+/gi;
    flashVars = flashVars.replace(adReplaceRegex, '');
    flashVars = flashVars.replace(/\&invideo\=True/i, '&invideo=False');
    flashVars = flashVars.replace(/\&ad3_module\=[^\&]*/i, '&ad3_module=about:blank');
    var replacement = videoplayer.cloneNode(true);
    if (inParam) {
        newParam = replacement.querySelector('param[name="flashvars"]');
        newParam.setAttribute("value", flashVars);
    } 
    else {
        replacement.setAttribute("flashvars", flashVars);
    }
    videoplayer.parentNode.replaceChild(replacement, videoplayer);
  }
  