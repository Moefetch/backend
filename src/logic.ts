import http from "http";
import https,{RequestOptions} from "https";

import url from "url";

import fs from "fs";

import settings from "../settings"

import SauceNao from "../saucenao";
const sauceNao = new SauceNao(settings.saucenao_api_key);

import imageSize from "image-size";

import { ISaucenaoResult, ISizeCalculationResult, IImageProps, OutgoingHttpHeaders,IPixivResponse, IDanbooruResponse } from "../types";
import axios from "axios";
import cheerio from "cheerio";

// const shit = fs.readdirSync("../anime test/importedPics");
// console.log(`../anime test/importedPics/${shit[2]}`);

export default class logic {
  public sauceNao: SauceNao;
  constructor(sauceNaoApiKey: string) {
    this.sauceNao = new SauceNao(sauceNaoApiKey)
  }

  
public async compareImgSizes(img1: string, img2: string) {
  const img1Res = this.getImageResolution(img1);
  const img2Res = this.getImageResolution(img2);
  
  const res = ((await img1Res) > (await img2Res))
  return res? (img1) : (img2);
}


/**
* gets image link protocol and image dimensions and type aswell
* @input string of file path or url to images
* @param image path string to file / could take in a url aswell but idk
*/

public getImageResolution(image: string) {
let imageProps: IImageProps;
const resPromise: Promise<IImageProps> = new Promise((resolve, reject) => {
  if (~image.search(/^https?:\/\//)) {
    const urlParsed = url.parse(image);
    
    const requestHeaders: OutgoingHttpHeaders = {
      "Accept": "image/avif,image/webp",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": 1,
      "Connection": "keep-alive",
      "Referer": `${urlParsed.protocol}//${urlParsed.hostname}/`,
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
      "Sec-GPC": "1",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache",
      TE: "trailers"
    }

    const options: RequestOptions = {...urlParsed, headers: requestHeaders }

    switch (options.protocol) {
      case "https:":
        https.get(options, function (response) {
          const chunks: any[] = [];
          const req = response.once("data", function (chunk) {
            chunks.push(chunk);
            req.destroy();
            const buffer = Buffer.concat(chunks);
            imageProps = {
              imageSize: imageSize(buffer),
              protocol: "https:",
            };
            return resolve(imageProps)
          });
        });
        break;
      case "http:":
        const req = http.get(options, function (response) {
          const chunks: any[] = [];
          response.on("data", function (chunk) {
            chunks.push(chunk);
            req.destroy();
            const buffer = Buffer.concat(chunks);
            imageProps = {
              imageSize: imageSize(buffer),
              protocol: "http:",
            };
            return resolve(imageProps)
          });
        });
        break;

      default:
        break;
    }
  } else {
      imageProps = {
          imageSize: imageSize(image),
          protocol: "local File",
      };
      return resolve(imageProps)
  }
});
return resPromise;
}


/**
* gets danbooru original image tags
* @param postUrl  url of danbooru post get data of 
*/

public async getdanbooruImageData (postUrl: string) {

  console.log(postUrl.substring(0, postUrl.indexOf('?q=')) + '.json')
  const response = await this.request(postUrl.substring(0, postUrl.indexOf('?q=')) + '.json', "GET")
  //console.log(response.data)
  /* const $ = cheerio.load(response.data);
  const firstquery = $('section[id="post-options"] ul li[id="post-option-download"] a').attr("href") || "";
  const secondquery = $('section[id="post-options"] ul li[id="post-option-download"] a')   || ""; */

  //const json = JSON.parse(firstquery)

  console.log(response.data)


   return {
    URLs: response.data
  } 
}


/**
* gets pixiv original image url and image tags
* @param id pixiv post id to get data of
*/

public async getPixivImageData (id: number, downloadAll?: boolean) {
  const response = await this.request(`https://www.pixiv.net/en/artworks/${id}`, 'GET');   
  // console.log(response.data)
  const $ = cheerio.load(response.data);
  const firstquery = $('meta[id="meta-preload-data"]').attr('content') || "";
  const json = JSON.parse(firstquery).illust[id]
  let urlsArray: string[] | undefined = undefined;
  if (downloadAll) {
    const response2 = await this.request(`https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`, 'GET');   
    
    /* console.log(response2.data.body.map( (a: any) => (
      a.urls.original
    ))) */

    urlsArray = response2.data.body.map( (a: any) => (
      a.urls.original
    ));
  }

  return {
    originalImageUrl: json.urls.original,
    previewImageUrl:  json.urls.small,
    tags: json.tags.tags.map( (a: any) => 
      ({
        tag: a.tag,
        romaji: a.romaji || "" ,
        enTranslation:  a.translation?.en || ""
        })),
    illustId: json.illustId,
    urlsArray: urlsArray,
    illustTitle: json.illustTitle,
    createDate: json.createDate,
    uploadDate: json.uploadDate,
    authorId: json.userId,
    authorName: json.userName,
    illustType: json.illustType,
  } as IPixivResponse
}

public request (element: string, requestMethod: ("GET" | "POST"), options?: {referrer?: string, altUsed?: string}) {
  let headersObj: {

    "User-Agent": string;
    "Accept": string;
    "Accept-Language": string;
    "Upgrade-Insecure-Requests": string;
    "Sec-Fetch-Dest": string;
    "Sec-Fetch-Mode": string;
    "Sec-Fetch-Site": string;
    "Sec-Fetch-User": string;
    "Pragma": string;
    "Cache-Control": string;
    "referrer"?: string;
    "Alt-Used"?: string;
  } = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
  }
  if (options && options.referrer) headersObj["referrer"] = options.referrer;
  if (options && options.altUsed) headersObj["Alt-Used"] = options.altUsed;
return axios({
    url: element,
    headers: headersObj,
    
    method: requestMethod,
    responseType: "json"
});


}

static async checkSauceNaoApi  (sauceNaoApi: string) {
  const testUrl = "https://i.imgur.com/6qNnzQg.jpeg";
  const sauceNaoTest = new SauceNao(sauceNaoApi);
  const response = await sauceNaoTest.getSauce(testUrl);
  return (response.resultArray ? true : false);
}

}
/* 
async function sexx() {
  const { inputType, resultArray } = await sauceNao.getSauce(
    `../anime test/importedPics/${shit[2]}`
  );

  //console.log( await (await res));
  const sexx = resultArray.map((a: ISaucenaoResult) => {
    if (a.header.index_id == 5) return a;
  });
  console.log(sexx);
}
//sexx()
 */