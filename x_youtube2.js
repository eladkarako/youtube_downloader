(function(video_streams, tmp){
  video_streams.split('&')
}(
  ytplayer.config.args.url_encoded_fmt_stream_map.split(',')
, null
));


ytplayer.config.args.url_encoded_fmt_stream_map.split(',')[0].split('&')


Array.prototype.map.call(ytplayer.config.args.url_encoded_fmt_stream_map.split(',')[0].split('&'), function(element,index){
  return decodeURIComponent(element);
});