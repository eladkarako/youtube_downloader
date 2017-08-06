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

//option #1 fmt_stream_map (limited but have better support)
console.log(parse(
  ytplayer.config.args.url_encoded_fmt_stream_map
));

//option #2 adaptive_fmts (more variations)
console.log(parse(
  ytplayer.config.args.adaptive_fmts
));