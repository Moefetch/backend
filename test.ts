
import settings from './settings';

import Logic from "./src/logic"
const logic = new Logic('0e9205838f5e690d780b38d8bcc2b41bd181073d')
//const response = logic.getPixivImageData(97882826, true);

//https://danbooru.donmai.us/posts/5564823?q=hakurei_reimu
//https://cdn.donmai.us/sample/f9/04/__hakurei_reimu_touhou_drawn_by_e_o__sample-f904e1ff4d2d6f9996276ecc6ce0a443.jpg

//https://i.pximg.net/img-master/img/2022/04/26/00/00/12/97882826_p0_master1200.jpg
async function ass() {
    console.log('test ', await logic.getImageDataFromRandomUrl('https://files.yande.re/sample/290a329d65abbdc9d7e9b32afdc60562/yande.re%2014142%20sample%20angel%20anus%20ass%20blood%20bondage%20censored%20cleavage%20cum%20devil%20djibril%20dress%20garter%20loli%20luvriel%20maid%20megane%20nopan%20pantsu%20penis%20pussy%20seifuku%20wet%20wings.jpg', settings))
    
}
ass()