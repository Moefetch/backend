import http from "http";
import https,{RequestOptions} from "https";

import url from "url";

import fs from "fs";
import SauceNao from "../saucenao";
const sauceNao = new SauceNao("08a33cf1ac33403eabdfe6d103ea4f1e55f7d70d");

import imageSize from "image-size";

import { ISaucenaoResult, ISizeCalculationResult, IImageProps, OutgoingHttpHeaders } from "../types";
import axios from "axios";
import cheerio from "cheerio";

const shit = fs.readdirSync("../anime test/importedPics");
console.log(`../anime test/importedPics/${shit[2]}`);


async function compareImgSizes(img1: string, img2: string) {
    const img1Res = getImageResolution(img1);
    const img2Res = getImageResolution(img2);
    
    const res = ((await img1Res) > (await img2Res))
    return res? (img1) : (img2);
}


/**
 * gets image link protocol and image dimensions and type aswell
 * @input string of file path or url to images
 * @param image path string to file / could take in a url aswell but idk
 */

function getImageResolution(image: string) {
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
 * gets pixiv original image url and image tags
 * @param id pixiv post id to get data of
 */

async function getPixivImageData (id: number) {
  const response = await request(`https://www.pixiv.net/en/artworks/${id}`);   
  // console.log(response.data)
  const $ = cheerio.load(response.data);
  const firstquery = $('meta[id="meta-preload-data"]').attr('content') || "";
  // console.log(firstquery)
  const json = JSON.parse(firstquery).illust[id]
  return {
    URLs: json.urls,
    tags: json.tags
  }
}

function request (element: string) {
  return axios({
      url: element,
      headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,/;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
      },
      method: "GET",
      responseType: "json"
  });


}

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
