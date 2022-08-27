import http from "http";
import https, { RequestOptions } from "https";

import url from "url";

import fs from "fs";

import SauceNao from "../saucenao";

import imageSize from "image-size";

import probeImageSize from "probe-image-size";

import needle from "needle";


import type {
  IAnimePic,
  IRequestOptions,
  INewAnimePic,
  IPostLinks,
  IPostIds,
  ISettings,
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
  public sauceNao?: SauceNao;
  public settings: ISettings;
  constructor(settings: ISettings) {
    this.settings = settings;
    if (settings.saucenao_api_key) this.sauceNao = new SauceNao(settings.saucenao_api_key);
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

  public async getImageResolution(image: string | NodeJS.ReadableStream) {
    let imageProps: IImageProps;
    if (typeof image == 'string') {
      if ((await this.checkImageUrlValid(image)) != "OK") return undefined;
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
    else {
      imageProps = {
        imageSize: await probeImageSize(image),
        protocol: "local File",
      };
      (imageProps);
    }
}

/**
 * processInput
 */
public async processInput(input: string | File, album: string) {
  let resultantData: INewAnimePic = {
    data: {}
  };
  if (typeof input == "string"){
    resultantData = await this.processUrl(input);
    if (resultantData.foundUrl && ( (await this.checkImageUrlValid(resultantData.foundUrl)) == "OK")) {
      {
        const filePath = await 
        this.downloadFromUrl(resultantData.foundUrl,
            `/saved_pictures/${album}`, 
            {providedFileName: `${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`
          })
        if (filePath) resultantData.file = filePath;
        
      }
      if (resultantData.thumbnail_file){
        const fileThumbnailPath = await 
          this.downloadFromUrl(resultantData.thumbnail_file,
            `/saved_pictures_thumbnails/${album}`, 
            {providedFileName: `thumbnail - ${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`
          })
        if (fileThumbnailPath) resultantData.thumbnail_file = fileThumbnailPath;
        }
    }
  }
  else {
    resultantData = (await this.getImageDataFromRandomUrl(input)) ?? {data: {}}
  }
  return resultantData;
}

/**
 * processPixivId
 * @param id post id
 */
public async processPixivId(id: string) {
  let resultantData: INewAnimePic = {
    data: {}
  };
  const pixivPostData = await this.getPixivImageData(id, (this.settings.pixiv_download_first_image_only));
    if (pixivPostData){
      resultantData.data.pixiv = pixivPostData;
      resultantData.links = {'pixiv': `https://www.pixiv.net/en/artworks/${id}`};
      resultantData.thumbnail_file = pixivPostData.previewImageUrl;
      resultantData.imageSize = {
        width: pixivPostData.width,
        height: pixivPostData.height }
      resultantData.storedResult ="pixiv"
      resultantData.ids = {pixiv: pixivPostData.illustId}
      resultantData.foundUrl = pixivPostData?.originalImageUrl ? pixivPostData?.originalImageUrl : undefined;
      return resultantData;
    }
}

/**
 * processBooru
 * @param inputUrl post url
 * 
 */
public async processBooru(inputUrl: string, type: "danbooru" | "yande") {
  let resultantData: INewAnimePic = {
    data: {}
  };
  let IPostLinksObj: IPostLinks = {};
  let idsObj:IPostIds = {};
    resultantData.data[type] = 
    (type == "yande") ? (await this.getYandeReImageData(inputUrl)) : (await this.getdanbooruImageData(inputUrl));
    if (resultantData.data[type]) {
      resultantData.storedResult = type;
      resultantData.foundUrl = resultantData.data[type]?.imageUrl;
      IPostLinksObj[type] = inputUrl;
      resultantData.links = IPostLinksObj;
      resultantData.thumbnail_file = resultantData.data[type]?.previewImageUrl;
      resultantData.imageSize = {
        width: resultantData.data[type]?.image_width,
        height: resultantData.data[type]?.image_height 
      }
      idsObj[type] = resultantData.data[type]?.id;
      resultantData.ids = idsObj;

      return resultantData;
    }
}
  /**
   * get Anime Pic object from a url or file path
   * @param inputUrl url to picture or path to file 
   */
  public async processUrl(inputUrl: string) {
    const settings = this.settings;
    let resultantData: INewAnimePic = {
      data: {}
    };

      const link = new URL(inputUrl);
      

      let pixivPostId: string;

      //let danbooruPostData: 


      switch (link.hostname) {
        case "i.pximg.net":
          pixivPostId = inputUrl.substring(
            inputUrl.lastIndexOf('/') + 1);
          pixivPostId = pixivPostId.replace(/[^0-9]/, '')
          const isValid = ((await this.checkImageUrlValid(inputUrl)) == "OK");
          if (isValid)
            resultantData = (await this.processPixivId(pixivPostId)) ?? {
              data: {},
              foundUrl: inputUrl,
              links: {other: [inputUrl]},
              thumbnail_file: inputUrl,
          };
          break;
        case "www.pixiv.net": 
          pixivPostId = inputUrl.substring(
            inputUrl.lastIndexOf(
              inputUrl.includes('illust_id=') ? '=' : '/'
            ) + 1);
            resultantData = (await this.processPixivId(pixivPostId)) ?? { data: {}};
          break;
        case "yande.re": 
        case "danbooru.donmai.us": // note add pools example https://danbooru.donmai.us/pools/01
          if (link.pathname.startsWith('/post')) {
            resultantData = (await this.processBooru(inputUrl, 
              link.hostname.substring(0 , link.hostname.indexOf('.')) as 'danbooru' | 'yande')) ?? { data: {}};
            } else
          if (link.pathname.startsWith('/pools')) {
            
          }

          break;
        default:
          if (inputUrl.match(/[\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/))
          if ((await this.checkImageUrlValid(inputUrl)) == "OK") 
          {
            if (settings.saucenao_api_key) {
              const sauceParseRes = await this.getImageDataFromRandomUrl(inputUrl)
              if (sauceParseRes) resultantData = sauceParseRes;
              else resultantData = {
                ...resultantData,
                foundUrl: inputUrl,
                links: {other: [inputUrl]}
              } as INewAnimePic;
            }
          }
          break;
      }
    return resultantData
  }
  /**
   * returns a new animepic object 
   * @param url url of picture or path string
   * 
   */

  public async getImageDataFromRandomUrl(url: string | File) {

    if (this.sauceNao) {
      const { inputType, resultArray } = await this.sauceNao.getSauce(url);
      let filteredResults: IFilteredSaucenaoResult = {};

      let tagsCollective: ITagsObject = {};

      let originalPostResult: IFilteredSaucenaoResult = {};
      let originalPostAlternative: IFilteredSaucenaoResult = {};

      for (let index = 0; index < resultArray.length; index++) {
        const item = resultArray[index]
        if (Number.parseInt(item.header.similarity) > 80) {
          const urlsToParse = item.data.ext_urls.filter(a => a.includes('pixiv') || a.includes('danbooru') || a.includes('yande'))
          let animePicPerExtURL: INewAnimePic[] = [];
          let bestPic: INewAnimePic | undefined;

          for (let urlsindex = 0; urlsindex < urlsToParse.length; urlsindex++) {
            const element = urlsToParse[urlsindex];
            let animePic = await this.processUrl(element);
            if(animePic.storedResult) { //ik this seems stupid, because it is , blame ts compiler and checker not me, it doesn't realize the type of the right side and left side will be the same since it will use same indexer and so i have to seperate the indexing that collides
              if (animePic.storedResult == "pixiv")
                tagsCollective[animePic.storedResult] = animePic.data[animePic.storedResult]?.tags 
              else tagsCollective[animePic.storedResult] = animePic.data[animePic.storedResult]?.tags
            }
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

          if (item.data.material) { 
            originalPostResult = {
              reqItem: item,
              animePic: bestPic,
              imageSize: bestPic ? bestPic.imageSize : undefined,
            }
          }
      
          else if (item.data.material == "") originalPostAlternative = {
            reqItem: item,
            animePic: bestPic,
            imageSize: bestPic ? bestPic.imageSize : undefined
          }
          else if (filteredResults.animePic && bestPic && bestPic.imageSize && bestPic.imageSize.height && bestPic.imageSize.width && filteredResults.animePic.imageSize?.height && filteredResults.animePic.imageSize?.width ) {
            filteredResults =
            (bestPic?.imageSize?.height * bestPic?.imageSize?.width) > (filteredResults.animePic.imageSize.height * filteredResults.animePic.imageSize?.width)?
            {
              reqItem: item,
              animePic: bestPic,
              imageSize: bestPic ? bestPic.imageSize : undefined
            } : filteredResults
          }
        }
        
      }
      if (originalPostResult.animePic) {
        originalPostResult.animePic.tags = tagsCollective;
        return originalPostResult.animePic
      }
      else if (originalPostAlternative.animePic) {
        originalPostAlternative.animePic.tags = tagsCollective;
        return originalPostAlternative.animePic
      }
      else if (filteredResults.animePic) {
        filteredResults.animePic.tags = tagsCollective;
        return filteredResults.animePic
      }
    }
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
      id: json.id,
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
    let headersObj: RequestInit = {
      credentials: "omit",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0",
        Accept: "image/avif,image/webp,*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-site",
        "Sec-GPC": "1",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
      },
      referrer: "https://yande.re/",
      method: "GET",
      mode: "cors",
    };
    
    const response = await this.request(
      postUrl,
      "GET"
    );
    const responseText = await response.text()
    const $ = cheerio.load(responseText);
    try {
      const firstquery = $('div[id="content"] div[id="post-view"]').children('script').html() || "";
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
      requestOptions: headersObj,
      } as IDanbooruResponse;

    } catch (error) {
      console.log("error parsing yande.re link : ", postUrl);
      console.log('error : ', error)
      
    }
  }

 public async getPixivCookies(url: string) {
  const response = (await this.request(
    'https://www.pixiv.net/',
    "GET"
  ))
  const COOKIES_REGEX = new RegExp(String.raw `first\_visit\_datetime\_pc\=(?<first_visit_datetime_pc>.*?)\; expires\=(?<expires>.*?)\; Max\-Age=(?<MaxAge>.*?)\; (path\=\/)\; (secure\,) PHPSESSID=(?<PHPSESSID>.*?); expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(.*?)\; (secure\;) (HttpOnly\,) p\_ab\_id\=(?<p_ab_id>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(?<domain>.*?)\; (secure\,) p\_ab\_id\_2\=(?<p_ab_id_2>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(.*?)\; (secure\,) p\_ab\_d\_id\=(?<p_ab_d_id>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; domain\=(.*?)\; (secure\,) yuid\_b\=(?<yuid_b>.*?)\; expires\=(.*?)\; Max\-Age=(.*?)\; (path\=\/)\; (secure\,) \_\_cf\_bm\=(?<__cf_bm>.*?)\; (path\=\/)\; expires\=(.*?)\; domain\=(.*?)\; (?<HttpOnly>.*?)\; (Secure)\; SameSite\=(?<SameSite>.*)`)
  const cookiesStr = response.headers.get('set-cookie')
  if (cookiesStr) {
    const cookiesObj = cookiesStr.match(COOKIES_REGEX)?.groups;
    const cookies = `first_visit_datetime_pc=${cookiesObj?.first_visit_datetime_pc}; PHPSESSID=${cookiesObj?.PHPSESSID}; p_ab_id=${cookiesObj?.p_ab_id}; p_ab_id_2=${cookiesObj?.p_ab_id_2}; p_ab_d_id=${cookiesObj?.p_ab_d_id}; yuid_b=${cookiesObj?.yuid_b}; __cf_bm=${cookiesObj?.__cf_bm}`;
    return cookies;
  }
  return ''
 }
 
  /**
   * gets pixiv original image url and image tags
   * @param id pixiv post id to get data of
   */

  public async getPixivImageData(id: number | string, downloadAll?: boolean) {

    const cookies = (await this.getPixivCookies(`https://www.pixiv.net/en/artworks/${id}`))
    
    let headersObj: RequestInit = {
      credentials: "include",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Sec-GPC": "1",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        cookie: cookies,
      },
      referrer: `https://www.pixiv.net/en/artworks/${id}`,
      method: "GET",
      mode: "cors",
    };
    const providedDownloadHeaders: IRequestOptions = {providedHeaders: headersObj = {
      "credentials": "omit",
      "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0",
          "Accept": "image/avif,image/webp,*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site",
          "Sec-GPC": "1",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
      },
      "referrer": "https://www.pixiv.net/",
      "method": "GET",
      "mode": "cors"
    }}
    const response = await this.request(
      `https://www.pixiv.net/ajax/illust/${id}?lang=en`,
      "GET",
      {providedHeaders: headersObj}  
    );
    const responseJson = await response.json()
    try {
      const json = responseJson.body;
      let urlsArray: string[] | undefined = undefined;
      console.log("json.pageCount: ", json.pageCount, 'json.pageCount: ', json.pageCount, 'downloadAll: ', downloadAll );
      
      if (json.pageCount && (json.pageCount > 1) && downloadAll ) {
    headersObj.referrer = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`;
        const response2 = await this.request(
          `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`,
          "GET",
          {providedHeaders: headersObj}
        );
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
        requestOptions: providedDownloadHeaders ?? undefined,
      } as IPixivResponse;

      
  } catch (error) {
      return undefined;
  }
  }

  public request(
    element: string,
    requestMethod: "GET" | "POST",
    options?: { referrer?: string; altUsed?: string; providedHeaders?: RequestInit }
  ) {
    let headersObj: RequestInit = options?.providedHeaders ?? {
      credentials: "omit",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Sec-GPC": "1",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        referer: options?.referrer ? options.referrer : '',
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
    options? : {
      referrer?: string,
      providedFileName?: string
  }
  ) {
    let returnPath: string | undefined = '';
    if (!fs.existsSync(downloadPath))
      fs.mkdirSync(downloadPath, { recursive: true });

    const fileExtension = url.substring(url.lastIndexOf('.'))
    const fileName = options?.providedFileName ?? url.substring(url.lastIndexOf("/"), url.lastIndexOf('.'));
    console.log('json of the options: ', JSON.stringify({ referrer: options?.referrer || url }))
    returnPath = `${downloadPath + "/" + fileName + fileExtension}`

    await this.request(url, "GET", { referrer: options?.referrer || url })
      .then((res) => res.blob())
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer))
      .then((buffer) => {
        this.checkDirectory(this.settings.downloadFolder + downloadPath );
        fs.promises.writeFile(this.settings.downloadFolder + downloadPath + "/" + fileName + fileExtension, buffer)
          .catch((error) => {
            console.log(error);
            returnPath = undefined
          })
        });
      return returnPath;
    }
    /* 
    * checks if a directory exists and returns true if it does else false;
    */
     public checkDirectory(path: string) {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {
          recursive: true,
        });
        return false;
      } else return true;
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
