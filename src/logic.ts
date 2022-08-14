import http from "http";
import https, { RequestOptions } from "https";

import url from "url";

import fs from "fs";

import type { IAnimePic, INewAnimePic, ISettings } from "../types";

import SauceNao from "../saucenao";

import imageSize from "image-size";

import probeImageSize from "probe-image-size";

import needle from "needle";


import {
  IFilteredSaucenaoResult,
  ITagsObject,
  ISaucenaoResult,
  ISizeCalculationResult,
  IImageProps,
  OutgoingHttpHeaders,
  IPixivResponse,
  IDanbooruResponse,
} from "../types";
import cheerio from "cheerio";
import core from "file-type/core";
import { stringify } from "querystring";

// const shit = fs.readdirSync("../anime test/importedPics");
// console.log(`../anime test/importedPics/${shit[2]}`);

export default class logic {
  public sauceNao: SauceNao;
  
  constructor(sauceNaoApiKey: string) {
    this.sauceNao = new SauceNao(sauceNaoApiKey);
  }

  public async compareImgSizes(img1: string, img2: string) {
    const img1Res = await this.getImageResolution(img1);
    const img2Res = await this.getImageResolution(img2);
    if (img1Res && img2Res) {
    const res = (img1Res) > (img2Res);
    return res ? img1 : img2;
    }
  }

  /**
   * gets image link protocol and image dimensions and type aswell
   * @input string of file path or url to images
   * @param image path string to file / could take in a url aswell but idk
   */

  public async getImageResolution(image: string) {
    if ((await this.checkImageUrlValid(image)) != "OK") return undefined;
    let imageProps: IImageProps;
    const resPromise: Promise<IImageProps> = new Promise(async (resolve, reject) => {
      if (~image.search(/^https?:\/\//)) {
        const urlParsed = new URL(image);

        const requestHeaders: OutgoingHttpHeaders = {
          Accept: "image/avif,image/webp",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: 1,
          Connection: "keep-alive",
          Referer: `${urlParsed.protocol}//${urlParsed.hostname}/`,
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site",
          "Sec-GPC": "1",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
          TE: "trailers",
        };

        const options: needle.NeedleOptions = {
          headers: requestHeaders,
        };

        imageProps = {
          imageSize: (await probeImageSize(image, options)),
          protocol: "https:",
        };
        return resolve(imageProps);
        
      } else {
        imageProps = {
          imageSize: await probeImageSize(image),
          protocol: "local File",
        };
        return resolve(imageProps);
      }
    });
    return resPromise;
  }

  /**
   * processInput
   */
  public async processInput(inputUrl: string, settings: ISettings) {
    
    const link = new URL(inputUrl);
    let resultantData: INewAnimePic = {
      data: {}
    };

    let pixivPostId: string;
    let pixivPostData: IPixivResponse | undefined;

    //let danbooruPostData: 


    switch (link.hostname) {
      case "i.pximg.net":
        pixivPostId = inputUrl.substring(
          inputUrl.lastIndexOf('/') + 1);
        pixivPostData = await this.getPixivImageData(
          Number.parseInt(pixivPostId), (settings.pixiv_download_first_image_only));
        resultantData.data.pixiv = pixivPostData;
        resultantData.imageSize = {
          width: pixivPostData?.width,
          height: pixivPostData?.height }
        resultantData.storedResult = pixivPostData ? "pixiv" : undefined;
        resultantData.foundUrl = pixivPostData?.originalImageUrl ? pixivPostData?.originalImageUrl : undefined;
        break;
      case "www.pixiv.net": 
        pixivPostId = inputUrl.substring(
          inputUrl.lastIndexOf(
            inputUrl.includes('illust_id=') ? '=' : '/'
          ) + 1);
        pixivPostData = await this.getPixivImageData(
          Number.parseInt(pixivPostId), (settings.pixiv_download_first_image_only));
        resultantData.data.pixiv = pixivPostData;
        resultantData.imageSize = {
          width: pixivPostData?.width,
          height: pixivPostData?.height }
        resultantData.storedResult = pixivPostData ? "pixiv" : undefined;
        resultantData.foundUrl = pixivPostData?.originalImageUrl ? pixivPostData?.originalImageUrl : undefined;
        break;
      case "danbooru.donmai.us": // note add pools example https://danbooru.donmai.us/pools/01
        if (link.pathname.startsWith('/post')) {
          resultantData.data.danbooru = await this.getdanbooruImageData(inputUrl);
          if (resultantData.data.danbooru) {
            resultantData.storedResult = "danbooru";
            resultantData.foundUrl = resultantData.data.danbooru.imageUrl ;
            resultantData.imageSize = {
              width: resultantData.data.danbooru.image_width,
              height: resultantData.data.danbooru.image_height }
        }}
        if (link.pathname.startsWith('/pools')) {
          
        }

        break;
      case "yande.re": 
        if (link.pathname.startsWith('/post')) {
          resultantData.data.yande = await this.getYandeReImageData(inputUrl);
          if (resultantData.data.yande) {
            resultantData.storedResult = "yande";
            resultantData.foundUrl = resultantData.data.yande?.imageUrl ;
            resultantData.imageSize = {
              width: resultantData.data.yande.image_width,
              height: resultantData.data.yande.image_height }
        }}
        if (link.pathname.startsWith('/pools')) {
          
        }

        break;
      default:
        if (inputUrl.match(/[\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/))
        if ((await this.checkImageUrlValid(inputUrl))) 
        {
          resultantData = 
          settings.saucenao_api_key ? (await this.getImageDataFromRandomUrl(inputUrl, settings)) 
          : {

          } as INewAnimePic;
        }
        break;
    }
    return resultantData
  }

  public async getImageDataFromRandomUrl(url: string | File, settings: ISettings) {
    const { inputType, resultArray } = await this.sauceNao.getSauce(url);
    let filteredResults: IFilteredSaucenaoResult[] = [];

    let tagsCollective: ITagsObject;

    let originalPostResult: IFilteredSaucenaoResult = {};
    let originalPostAlternative: IFilteredSaucenaoResult = {};

    let highestResPixivPost: IFilteredSaucenaoResult = {};
    let highestResDanbooruPost: IFilteredSaucenaoResult = {};

    console.log(JSON.stringify(resultArray));

    for (let index = 0; index < resultArray.length; index++) {
      const item = resultArray[index]
      if (Number.parseInt(item.header.similarity) > 80) {
        const urlsToParse = item.data.ext_urls.filter(a => a.includes('pixiv') || a.includes('danbooru') || a.includes('yande'))
        let animePicPerExtURL: INewAnimePic[] = [];
        let bestPic: INewAnimePic | undefined;

        for (let urlsindex = 0; urlsindex < urlsToParse.length; urlsindex++) {
          const element = urlsToParse[urlsindex];
          let animePic = await this.processInput(element, settings);
          if (animePic.foundUrl && !animePic.imageSize) {
            await this.getImageResolution(animePic.foundUrl).then(a => {
              if (a) {
                animePic.imageSize = a.imageSize;                
              }
            })
          }
          if (bestPic && bestPic.imageSize && bestPic.imageSize.height && bestPic.imageSize.width) {
            bestPic = ((bestPic.imageSize.height * bestPic.imageSize.width) < ((animePic.imageSize?.height || 0) * (animePic.imageSize?.width || 0))) ? animePic : bestPic;
          } else bestPic = animePic;
        }

        //console.log(index + " : ", animePicPerExtURL)

        if (item.data.material) originalPostResult = {
          reqItem: item,
          animePic: bestPic,
          imageSize: bestPic ? bestPic.imageSize : undefined,
        }
    
        else if (item.data.material == "") originalPostAlternative = {
          reqItem: item,
          animePic: bestPic,
          imageSize: bestPic ? bestPic.imageSize : undefined
        }
        console.log("original post : ", originalPostAlternative)

      
      }
    }


    //console.log(filteredResults)
    /* filteredResults = resultArray.map((item: ISaucenaoResult) => {
      if (item.data.material == "original" || item.data.material == "") return item
      else 
    }).filter(a => a != null ) */

    /* console.log("--------------------------------------------",
     '\n \n \n', "resultArray",
      JSON.stringify(filteredResults) ) */
    return {

    } as INewAnimePic;
  }


  /**
   * gets danbooru original image tags
   * @param postUrl  url of danbooru post get data of
   */

  public async getdanbooruImageData(postUrl: string) {
    const processedUrl = (
      postUrl.includes('?q=') ? (postUrl.substring(0, postUrl.indexOf("?q=")) + ".json") 
      : (postUrl + ".json")
      ).replace('post/show/', "posts/");
    const response = await this.request(processedUrl, "GET");
    const json = await response.json()
    return {
      imageUrl: json.file_url,
      createDate: json.created_at,
      updateDate: json.updated_at,
      previewImageUrl: json.preview_file_url,
      tags: {
        artists: json.tag_string_artist.split(' '),
        copyrights: json.tag_string_copyright.split(' '),
        characters: json.tag_string_character.split(' '),
        general: json.tag_string_general.split(' '),
      },
      image_height: json.image_height,
      image_width: json.image_width,

    } as IDanbooruResponse;
  }

 /**
  * get yande.re post data from url
  * returns undefined on fail
  * do yande.re pools exist 
  * should i be worried
  * @param postUrl url of post e.g. https://yande.re/post/show/24436
  */
  public async getYandeReImageData(postUrl: string) {
    const response = await this.request(
      postUrl,
      "GET"
    );
    const responseText = await response.text()
    const $ = cheerio.load(responseText);
    try {
      const firstquery = $('div[id="content"] div[id="post-view"]').children('script').html() || "";
      console.log(firstquery.substring(firstquery.indexOf('(') +1 , firstquery.lastIndexOf(')')))
      const json = JSON.parse(firstquery.substring(firstquery.indexOf('(') +1 , firstquery.lastIndexOf(')')))
      
      const allTagStringArray = json.posts[0].tags.split(' ');
      let tags: any = {
        artist: [],
        copyright: [],
        character: [],
        general: [],
        circle: [],
        faults: [],
      }
      allTagStringArray.forEach( (t: string ) => {
        tags[ json.tags[t] ].push(t);
      });
      
      return {
        
      imageUrl: json.posts[0].file_url,
      createDate: (new Date(json.posts[0].created_at * 1000).toISOString()),
      updateDate: (new Date(json.posts[0].updated_at * 1000).toISOString()),
      previewImageUrl: json.posts[0].preview_url,
      tags: {
        artists: tags.artist,
        copyrights: tags.copyright,
        characters: tags.character,
        general: tags.general
      },
      image_height: json.posts[0].height,
      image_width: json.posts[0].width,

      } as IDanbooruResponse;

    } catch (error) {
      console.log("error parsing yande.re link : ", postUrl);
      console.log('error : ', error)
      
    }
  }
 
  /**
   * gets pixiv original image url and image tags
   * @param id pixiv post id to get data of
   */

  public async getPixivImageData(id: number, downloadAll?: boolean) {
    const response = await this.request(
      `https://www.pixiv.net/en/artworks/${id}`,
      "GET"
    );
    const responseText = await response.text()
    const $ = cheerio.load(responseText);
    try {
        
      const firstquery = $('meta[id="meta-preload-data"]').attr("content") || "";
      const json = JSON.parse(firstquery).illust[id];
      let urlsArray: string[] | undefined = undefined;
      if (downloadAll) {
        const response2 = await this.request(
          `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`,
          "GET"
        );

        /* console.log(response2.data.body.map( (a: any) => (
        a.urls.original
      ))) */

        urlsArray = (await response2.json()).body.map(
          (a: any) => a.urls.original
        );
      }

      return {
        originalImageUrl: json.urls.original,
        previewImageUrl: json.urls.small,
        tags: json.tags.tags.map((a: any) => ({
          tag: a.tag,
          romaji: a.romaji || "",
          enTranslation: a.translation?.en || "",
        })),
        illustId: json.illustId,
        urlsArray: urlsArray,
        illustTitle: json.illustTitle,
        createDate: json.createDate,
        uploadDate: json.uploadDate,
        authorId: json.userId,
        authorName: json.userName,
        illustType: json.illustType,
        width: json.width,
        height: json.height,
      } as IPixivResponse;

      
  } catch (error) {
      return undefined;
  }
  }

  public request(
    element: string,
    requestMethod: "GET" | "POST",
    options?: { referrer?: string; altUsed?: string }
  ) {
    let headersObj: RequestInit = {
      credentials: "omit",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0",
        Accept: "image/avif,image/webp,*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
        "Sec-GPC": "1",
        Pragma: "no-cache",
        referer: options?.referrer ? options.referrer : element,
        "Cache-Control": "no-cache",
      },
      method: requestMethod,
      mode: "cors",
    };

    if (options && options.referrer) headersObj["referrer"] = options.referrer;

    return fetch(element, headersObj);
  }

  static async checkSauceNaoApi(sauceNaoApi: string) {
    const testUrl = "https://i.imgur.com/6qNnzQg.jpeg";
    const sauceNaoTest = new SauceNao(sauceNaoApi);
    const response = await sauceNaoTest.getSauce(testUrl);
    return response.resultArray ? true : false;
  }

  /**
   * checkImageUrlValid
   */
  public async checkImageUrlValid(imageUrl: string) {
    return (await this.request(imageUrl, "GET")).statusText
  }

  public async downloadFromUrl(
    url: string,
    downloadPath: string,
    referrer?: string
  ) {
    if (!fs.existsSync(downloadPath))
      fs.mkdirSync(downloadPath, { recursive: true });
    const fileName = url.substring(url.lastIndexOf("/"));
    await this.request("url", "GET", { referrer: referrer || url })
      .then((res) => res.blob())
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer))
      .then((buffer) =>
        fs.promises.writeFile(downloadPath + "/" + fileName, buffer)
      );
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
