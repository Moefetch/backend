
import settings from './settings';

import Logic from "./src/logic"
const logic = new Logic(settings)
let headersObj: RequestInit = {
  credentials: "omit",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0",
   
  },
  referrer: undefined,
  method: "GET",
  mode: "cors",
};

//const response = logic.getPixivImageData(97882826, true);

//https://danbooru.donmai.us/posts/5564823?q=hakurei_reimu
//https://cdn.donmai.us/sample/f9/04/__hakurei_reimu_touhou_drawn_by_e_o__sample-f904e1ff4d2d6f9996276ecc6ce0a443.jpg

//https://i.pximg.net/img-master/img/2022/04/26/00/00/12/97882826_p0_master1200.jpg
async function ass() {
    console.log('test ', (await logic.getImageDataFromRandomUrl('https://cdn.donmai.us/original/68/53/685394a0296040e7e971e4ea1f9b66e8.png')))
    
}
ass()