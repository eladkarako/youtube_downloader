ITAG = {
 "248":  {video:{is_available:true, size:"1920x1080", fps:30}, audio:{is_available:true, channels:2, sampling_rate_hz:44100}, ext:"mp4"}

//Video+Audio
  "22":  {ext:"mp4", video:{is_available:true, size:{w:1280,h:720}, fps:25, encoder:{name:"H.264",standard:"AVC1"}, audio:{is_available:true, channels:2, sampling_rate_hz:44100}, itag:248}

 "248":  {ext:"mp4", video:{is_available:true, size:"1920x1080", fps:30}, audio:{is_available:true, channels:2, sampling_rate_hz:44100}, itag:248}



 "248":  {ext:"mp4", video:{is_available:true, size:"1920x1080", fps:30}, audio:{is_available:true, channels:2, sampling_rate_hz:44100}, itag:248}



 "248":  {video:{is_available:true, size:"1920x1080", fps:30}, audio:{is_available:true, channels:2, sampling_rate_hz:44100}}
,"136":  1280x720
,"247":  1280x720
,"135":  854x480
,"244":  854x480
,"134":  640x360
,"243":  640x360
,"133":  426x240
,"242":  426x240
,"160":  256x144
,"278":  256x144
//---------------------audio only
,"140":  0x0
,"171":  0x0
,"249":  0x0
,"250":  0x0
,"251":  0x0
}













ISOAVC_MAP = {
 "avc1": "H.264"
,"avc2": "H.264"
,"svc1": "Scalable Video Coding"
,"mvc1": "Multiview Video Coding"
,"mvc2": "Multiview Video Coding"
};


PROFILE = {                                       //https://en.wikipedia.org/wiki/H.264/MPEG-4_AVC#Profiles
   "0":  "No"                   //  0             - *** when profile=RCDO and level=0 - "RCDO"  - RCDO bitstream MUST obey to all the constraints of the Baseline profile
 ,"42":  "Baseline"             // 66 in-decimal
 ,"4d":  "Main"                 // 77 in-decimal
 ,"58":  "Extended"             // 88 in-decimal
 ,"64":  "High"                 //100 in-decimal
 ,"6e":  "High 10"              //110 in-decimal
 ,"7a":  "High 4:2:2"           //122 in-decimal
 ,"f4":  "High 4:4:4"           //244 in-decimal
 ,"2c":  "CAVLC 4:4:4"          // 44 in-decimal
 
 //profiles for SVC - Scalable Video Coding extension to H.264
 ,"53":  "Scalable Baseline"    // 83 in-decimal
 ,"56":  "Scalable High"        // 86 in-decimal

 //profiles for MVC - Multiview Video Coding extension to H.264
 ,"80":  "Stereo High"          // 128 in-decimal
 ,"76":  "Multiview High"       // 118 in-decimal
 ,"8a":  "Multiview Depth High" // 138 in-decimal
};


function avcoti_to_str(s){
  var REGEX = /([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i
     ,matches
     ,profile_idc
     ,constraint_set_flags
     ,level_idc
     ;

  if(false === REGEX.test(s)) throw new Error("error: please provide a 3-bytes hex-sequence for example: 42001e");
  matches = s.match(REGEX);
  matches.shift();            //kills first one (regex matchs entire string)
  
  profile_idc           = matches[0];
  profile_idc           = PROFILE[profile_idc];
  profile_idc           = "string" === typeof profile_idc ? profile_idc : "Unknown";  //explicit fix.

//constraint_set_flags  = matches[1]; //maybe some other time..

  level_idc             = matches[2];
  level_idc             = Number.parseInt(level_idc, 16);        //will give something like 30  (integer thirty)
  level_idc             = String(level_idc).split("").join(".")  //will give something like "3.0"

  return "\"" + profile_idc + "\" Profile, Level " + level_idc;
}


function h264avc_to_string(s){
  var REGEX = /(avc1|avc2|svc1|mvc1|mvc2)\.([0-9a-f]{6})/i
     ,matches
     ,avc_codec
     ;
  if(false === REGEX.test("avc1.42001e")) throw new Error("Codec string is not formatted according to H.264/AVC standards for example avc1.42001e (maybe an iOS friendly version...)");
  matches = s.match(REGEX);
  matches.shift();    //first one is the entire-string.
  
  avc_codec = ISOAVC_MAP[ matches[0] ];
  avc_codec = "string" === typeof avc_codec ? avc_codec : "Unknown";  //explicit fix
  
  return avc_codec + " Video ("  + avcoti_to_str( matches[1] )  + ")";
}


//Try It...
//more examples in  https://tools.ietf.org/id/draft-gellens-mime-bucket-bis-02.html#sec-5

console.log(
  h264avc_to_string("avc1.42001e")
 ,h264avc_to_string("avc1.640029")
)


/************************************
 * H.264-Codec Profile/Level Parser *
 *        /Elad Karako. August 2017 *
 ************************************/


                        //"avcoti" hexadecimal representation of the following three bytes in the (subset) sequence parameter set Network Abstraction Layer (NAL) unit specified in AVC:  1.profile_idc, 2.the byte containing the constraint_set flags (currently constraint_set0_flag through constraint_set5_flag, and the reserved_zero_2bits), 3.level_idc.
AVC1_CODEC_MAP = {                  
 ,"avc1.66.30":   {profile:"Baseline", level:3.0, max_bit_rate:10000}   //iOS friendly variation (iOS 3.0-3.1.2)
  "avc1.42001e":  {profile:"Baseline", level:3.0, max_bit_rate:10000}
 ,"avc1.42001f":  {profile:"Baseline", level:3.1, max_bit_rate:14000}

//other variations
 ,"avc1.77.30":   {profile:"Main",     level:3.0, max_bit_rate:10000}   //iOS friendly variation (iOS 3.0-3.1.2)
 ,"avc1.4d001e":  {profile:"Main",     level:3.0, max_bit_rate:10000}
 ,"avc1.4d001f":  {profile:"Main",     level:3.1, max_bit_rate:14000}
 ,"avc1.4d0028":  {profile:"Main",     level:4.0, max_bit_rate:20000}

 ,"avc1.64001f":  {profile:"High",     level:3.1, max_bit_rate:17500}
 ,"avc1.640028":  {profile:"High",     level:4.0, max_bit_rate:25000}
 ,"avc1.640029":  {profile:"High",     level:4.1, max_bit_rate:62500}
}

// ,"avc1.58a01e":  {profile:"main",     level:3.0, max_bit_rate:10000}
// ,"avc1.42e01e":  {profile:"extended", level:3.0, max_bit_rate:10000}
// ,"avc1.4d401e":  {profile:"high",     level:3.0, max_bit_rate:12500}



https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/StreamingMediaGuide/FrequentlyAskedQuestions/FrequentlyAskedQuestions.html
https://tools.ietf.org/html/draft-pantos-http-live-streaming-23
https://tools.ietf.org/html/rfc6381
https://tools.ietf.org/html/rfc6381#section-3.6
https://en.wikipedia.org/wiki/H.264/MPEG-4_AVC
https://en.wikipedia.org/wiki/H.264#Levels
https://tools.ietf.org/html/draft-ietf-avt-rtp-h264-rcdo-08
http://h264bitstream.sourceforge.net/doxygen/0.1.5/structsps__t.html
https://www.iana.org/assignments/media-types/video/H264-SVC
https://tools.ietf.org/html/rfc6381#ref-AVC-Formats
https://gist.github.com/eladkarako/119e91525d34db9f61cca23b18fd62a0