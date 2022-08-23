
import settings from './settings';

import Logic from "./src/logic"
const logic = new Logic(settings)
//const response = logic.getPixivImageData(97882826, true);

//https://danbooru.donmai.us/posts/5564823?q=hakurei_reimu
//https://cdn.donmai.us/sample/f9/04/__hakurei_reimu_touhou_drawn_by_e_o__sample-f904e1ff4d2d6f9996276ecc6ce0a443.jpg

//https://i.pximg.net/img-master/img/2022/04/26/00/00/12/97882826_p0_master1200.jpg
async function ass() {
    console.log('test ', await logic.getImageDataFromRandomUrl('./90097168_p0.png'))
    
}
ass()