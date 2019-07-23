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

/****************************************
 * H.264-Codec Profile/Level Dictionary *
 *            /Elad Karako. August 2017 *
 ****************************************/


/*
References:
https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/StreamingMediaGuide/FrequentlyAskedQuestions/FrequentlyAskedQuestions.html
https://en.wikipedia.org/wiki/H.264#Levels

Ps.
this was the first "thing"..
before I've figured it is probably better to actually know
what it means...
Since I'm working a lot with H.264 and FFMPEG
I know about the ISO format so it was easy to figure it out next.
see 'h264_codec_string_parser.js'.
*/
