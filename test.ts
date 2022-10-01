import nedbDatabase from './src/nedbDatabaseLogic'
import settings from './settings';

import Logic from "./src/logic"
const logic = new Logic(settings)
let headersObj: RequestInit =  {

  "credentials" : "omit",
  "headers" :
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0",
    "Accept": "image/avif,image/webp,*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
    "Sec-GPC": "1",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "referer" : "https://www.pixiv.net/"
},
  "referrer" : "https://www.pixiv.net/",
  "method" : "GET",
  "mode" : "cors"

}
//const response = logic.getPixivImageData(97882826, true);

//https://danbooru.donmai.us/posts/5564823?q=hakurei_reimu
//https://cdn.donmai.us/sample/f9/04/__hakurei_reimu_touhou_drawn_by_e_o__sample-f904e1ff4d2d6f9996276ecc6ce0a443.jpg

//https://i.pximg.net/img-master/img/2022/04/26/00/00/12/97882826_p0_master1200.jpg
//https://i.pximg.net/img-original/img/2022/07/19/19/55/54/99843431_p0.png
//const nedb = new nedbDatabase()
async function ass() {
    console.log('test ', ( (await logic.getImageDataFromRandomUrl('https://cdn.discordapp.com/attachments/874159310962319360/1020426615097921576/unknown.png'))))
    console.log(
    
    )
}
ass()
