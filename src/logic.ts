import http from "http";
import https, { RequestOptions } from "https";

import url from "url";

import fs from "fs";

import SauceNao from "../saucenao";

import imageSize from "image-size";

import probeImageSize from "probe-image-size";

import needle from "needle";


import type {
  IMongoDBEntry,
  IRequestOptions,
  INewAnimePic,
  IPostLinks,
  IPostIds,
  ISettings,
  IFilteredSaucenaoResult,
  ITagsObject,
  IImageProps,
  OutgoingHttpHeaders,
  IPixivResponse,
  IDanbooruResponse,
  IPixivTag,
  IUrlsArray,
  ILinePageResponse,
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
 * downloadAndGetFilePaths
 */
public async downloadAndGetFilePaths(resultantData: INewAnimePic, album: string, ) {
  let result: INewAnimePic['imagesDataArray'] = [];
  let providedHeadersObj: RequestInit | undefined = undefined
  const urlsArray = resultantData.urlsArray;
  if (resultantData.storedResult) {
    providedHeadersObj = resultantData.data[resultantData?.storedResult]?.requestOptions?.providedHeaders
  }
  if (urlsArray?.length){
  for (let index = 0; index < urlsArray.length; index++) {
    const element = urlsArray[index];
  
    
    const filePath = await 
    this.downloadFromUrl(element.imageUrl,
        `/saved_pictures/${album}`, 
        {providedFileName: `${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]} - ${index} - ${Date.now()}`,
        providedHeaders: providedHeadersObj
      })


    let fileThumbnailPath: string;
    if (element.thumbnailUrl) {
      fileThumbnailPath = await 
            this.downloadFromUrl(element.thumbnailUrl,
              `/saved_pictures_thumbnails/${album}`, 
              {providedFileName: `thumbnail - ${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]} - ${index} - ${Date.now()}`,
              providedHeaders: providedHeadersObj
            })
    } else {
      fileThumbnailPath = filePath
    }

    let imageHeight: number = 0;
    let imagewidth: number = 0;

    if ( !element.height && !element.width) {
      const imageDimensions = await this.getImageResolution(element.imageUrl)
      imageHeight = imageDimensions?.imageSize.height ? imageDimensions.imageSize.height : 0;
      imagewidth = imageDimensions?.imageSize.width ? imageDimensions.imageSize.width : 0;
    }
        result.push({
          file: filePath,
          thumbnail_file: fileThumbnailPath,
          imageSize: {
            height: element.height || imageHeight,
            width: element.width || imagewidth
          }
        })
    }
    return result;
  }
}


/**
 * processInput
 */
public async processInput(input: string | File, album: string) {
  let resultantData: INewAnimePic = {
    data: {},
    indexer: 0,
    isNSFW: false,
    imagesDataArray: []
  };
  let providedHeadersObj: RequestInit | undefined = undefined
  if (typeof input == "string"){
    resultantData = await this.processUrl(input);
    console.log(resultantData);
    if (resultantData.imagesDataArray.length) {
      const res = await this.downloadAndGetFilePaths(resultantData, album)
      if ( res ) resultantData.imagesDataArray = res
      if (resultantData.thumbnailFile) {
        resultantData.thumbnailFile = await this.downloadFromUrl(resultantData.thumbnailFile, `/saved_pictures_thumbnails/${album}`,{providedFileName: `thumbnailFile - ${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`})
      } else resultantData.thumbnailFile = resultantData.imagesDataArray[resultantData.indexer].thumbnail_file
    }
  }
  else {
    resultantData = (await this.getImageDataFromRandomUrl(input)) ?? {data: {}, indexer: 0, imagesDataArray: []}
  }
  return resultantData;
}
/**
 * processLineStickerPage
 */
public async processLineStickerPage(inputUrl: string) {
  const linePageData = await this.getLineStickerPageData(inputUrl);
  if (linePageData) {
    let resultantData: INewAnimePic = {
    data: {},
    isNSFW: false,
    indexer: 0,
    tags: [],
    imagesDataArray: []
  };
  resultantData.urlsArray = linePageData.urlsArray.map(uE => ({
    imageUrl: uE,
    thumbnailUrl: '',
    width: 0,
    height: 0,
  }))
  resultantData.data.line = linePageData
  resultantData.links = {line: inputUrl}
  resultantData.storedResult = 'line'
  resultantData.artists = [linePageData.authorName]
  resultantData.ids = {line: Number.parseInt(inputUrl.substring(inputUrl.indexOf('product/') + 8, inputUrl.indexOf('/en')))}
  resultantData.thumbnailFile = linePageData.previewImageUrl;
  return resultantData
  }
}
/**
 * processPixivId
 * @param id post id
 */
public async processPixivId(id: string, arrayIndexer?: number) {
  const dlFirstOnly = this.settings.pixiv_download_first_image_only;
  let resultantData: INewAnimePic = {
    data: {},
    isNSFW: false,
    indexer: arrayIndexer ?? 0,
    tags: [],
    imagesDataArray: []
  };
  const pixivPostData = await this.getPixivImageData(id, arrayIndexer);
  
    if (pixivPostData){
      
      resultantData.urlsArray =  pixivPostData.urlsArrayBody.map(a => ({
        imageUrl: a.urls.original,
        thumbnailUrl: a.urls.small,
        height: a.height,
        width: a.width,
      }))
      resultantData.urlsArray = dlFirstOnly ? [resultantData.urlsArray[arrayIndexer ?? 0]] : resultantData.urlsArray;
      resultantData.data.pixiv = pixivPostData;
      resultantData.links = {pixiv: `https://www.pixiv.net/en/artworks/${id}`};
      resultantData.imageSize = {
        width: pixivPostData.width,
        height: pixivPostData.height }
      resultantData.storedResult ="pixiv"
      resultantData.artists = [pixivPostData.authorName]
      resultantData.ids = {pixiv: pixivPostData.illustId}
      resultantData.tags = pixivPostData.tags?.map((a: IPixivTag) => (a.enTranslation || a.romaji || a.tag))
      if (resultantData.tags && resultantData.tags[0] == 'manga') resultantData.tags.splice(0, 1)
      if (pixivPostData.tags && pixivPostData.tags[0].tag == "R-18") resultantData.isNSFW = true;
      return resultantData;
    }
}

public booruDictionary = {
  "yande": 'getYandeReImageData' as 'getYandeReImageData',
  "danbooru": 'getdanbooruImageData' as 'getdanbooruImageData',
}

/**
 * processLineStickerPage
 */
public async getLineStickerPageData(inputUrl: string) {
  let resultantData: INewAnimePic = {
    data: {},
    indexer: 0,
    tags: [],
    imagesDataArray: []
  };

  let headersObj: RequestInit = {
    credentials: "include",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Sec-GPC": "1",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
    },
    method: "GET",
    mode: "cors",
  };
  
  const response = await this.request(
    inputUrl,
    "GET"
  );
  const responseText = await response.text()
  const $ = cheerio.load(responseText);
  try {

    const packName = $('ul[class="mdCMN38Item01"] div[class="mdCMN38Item0lHead"] p').text();
    const packCover = $('div[ref="mainImage"] img').attr('src');
    const packDiscription = $('ul[class="mdCMN38Item01"] p[class="mdCMN38Item01Txt"]').text(); //impiment this please
    const packAuthorName = $('ul[class="mdCMN38Item01"] a[class="mdCMN38Item01Author"]').text();
    const packAuthorIDText = $('ul[class="mdCMN38Item01"] a[class="mdCMN38Item01Author"]').attr('href')
    const packAuthorID = packAuthorIDText?.substring(packAuthorIDText.indexOf('author') + 7, packAuthorIDText.indexOf('/en'));
    const packImagesObject = $('div[data-widget="StickerPreview"] div[class="mdCMN09ImgListWarp"] ul[class="mdCMN09Ul FnStickerList"]').children()
    let packImages: string[] = []
    for (let index = 0; index < packImagesObject.length; index++) {
      const element = packImagesObject[index];
      packImages.push(JSON.parse(element.attribs['data-preview']).staticUrl)
    }
    
    let providedDownloadHeaders: IRequestOptions = {providedHeaders: headersObj = {
      "credentials": "omit",
      "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0",
        "Accept": "image/avif,image/webp,*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
        "Sec-GPC": "1",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
        },
      "referrer": "https://store.line.me/",
      "method": "GET",
      "mode": "cors"
    }}
    return {
      previewImageUrl: packCover,
      postTitle: packName,
      
      authorId: packAuthorID || '',
      authorName: packAuthorName,
      urlsArray: packImages,
      requestOptions: providedDownloadHeaders,
    } as ILinePageResponse
  } catch (error) {
    console.log("error parsing LINE.me sticker page link : ", inputUrl);
    console.log('error : ', error)
    
  }


}

/**
 * processBooru
 * @param inputUrl post url
 * 
 */
public async processBooru(inputUrl: string, type: "danbooru" | "yande") {
  let resultantData: INewAnimePic = {
    data: {},
    indexer: 0,
    tags: [],
    imagesDataArray: []
  };
  let IPostLinksObj: IPostLinks = {};
  let idsObj:IPostIds = {};
  let tagsObj: ITagsObject = {};
  const res = await this[this.booruDictionary[type]](inputUrl);
    resultantData.data[type] = res;
    if (res && res.imageUrl && res.previewImageUrl) {
      resultantData.storedResult = type;
      resultantData.urlsArray = [{ 
        imageUrl: res.imageUrl, 
        thumbnailUrl: res.previewImageUrl,
        width: res.image_width,
        height: res.image_height 
      }]
      IPostLinksObj[type] = inputUrl;
      resultantData.links = IPostLinksObj;
      resultantData.date_created = res.createDate;
      resultantData.imageSize = {
        width: res.image_width,
        height: res.image_height 
      }

      let tags: string[] = res.tags?.general ?? []
      tags = res.tags?.copyrights ? tags.concat(res.tags?.copyrights) : tags;
      tags = res.tags?.characters ? tags.concat(res.tags?.characters) : tags;

      resultantData.tags = tags;
    
      resultantData.artists = res.tags?.artists
      resultantData.isNSFW = res.isNsfw;
      idsObj[type] = res.id;
      resultantData.ids = idsObj;
      return resultantData;
    }
}

public  checkPixivImageUrlValid(inputUrl: string) {
  const headersObj: RequestInit = {

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

      return this.checkImageUrlValid(inputUrl, {providedHeaders: headersObj})
}
  /**
   * get Anime Pic object from a url or file path
   * @param inputUrl url to picture or path to file 
   */
  public async processUrl(inputUrl: string) {
    const settings = this.settings;
    let resultantData: INewAnimePic = {
      data: {},
      isNSFW: false,
      indexer: 0,
      imagesDataArray: []
    };

      const link = new URL(inputUrl);
      

      let pixivPostId: string;

      //let danbooruPostData: 


      switch (link.hostname) {
        case "i.pximg.net":
          pixivPostId = inputUrl.substring(
            inputUrl.lastIndexOf('/') + 1);
          const arrayIndexer = Number.parseInt(pixivPostId.substring(pixivPostId.search(/[^0-9]/) + 2, pixivPostId.indexOf('.')))
          pixivPostId = pixivPostId.substring(0, pixivPostId.search(/[^0-9]/));
          const isValid = ((await this.checkPixivImageUrlValid(inputUrl)) == "OK");
          if (isValid) {
            const imgRes = await this.getImageResolution(inputUrl)
            resultantData = (await this.processPixivId(pixivPostId, arrayIndexer)) ?? {
              data: {},
              imagesDataArray: [],
              urlsArray: [{
                imageUrl: inputUrl,
                thumbnailUrl: inputUrl,
                height: imgRes?.imageSize.height ?? 0,
                width: imgRes?.imageSize.height ?? 0,

              }],
              links: {pixiv: inputUrl},
              isNSFW: false,
              indexer: 0,
            }
/*             if(resultantData.data.pixiv?.urlsArrayBody.length){
              const orgImgString = resultantData.data.pixiv.urlsArrayBody[arrayIndexer]
              resultantData.foundUrl = orgImgString;
            } */
          };
          break;
        case "www.pixiv.net": 
          pixivPostId = inputUrl.substring(
            inputUrl.lastIndexOf(
              inputUrl.includes('illust_id=') ? '=' : '/'
            ) + 1);
            resultantData = (await this.processPixivId(pixivPostId)) ?? { data: {}, indexer: 0, imagesDataArray: []};
          break;
        case "yande.re": 
        case "danbooru.donmai.us": // note add pools example https://danbooru.donmai.us/pools/01
          if (link.pathname.startsWith('/post')) {
            resultantData = (await this.processBooru(inputUrl, 
              link.hostname.substring(0 , link.hostname.indexOf('.')) as 'danbooru' | 'yande')) ?? { data: {}, indexer: 0, imagesDataArray: []};
            } else
          if (link.pathname.startsWith('/pools')) {
            
          }

          break;
        case "store.line.me": //probably need checks here considering different types of line posts
          return (await this.processLineStickerPage(inputUrl)) || {
            ...resultantData,
            foundUrl: inputUrl,
            urlsArray: [{
              imageUrl: inputUrl,
              thumbnailUrl: inputUrl,
              height: 0,
              width: 0
            }],
            links: {other: [inputUrl]}
          } as INewAnimePic;
          break;
        default:
          if (inputUrl.match(/[\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/))
          if ((await this.checkImageUrlValid(inputUrl)) == "OK") 
          {
            if (settings.saucenao_api_key) {
              const sauceParseRes = await this.getImageDataFromRandomUrl(inputUrl)
              const imageDimensions = await this.getImageResolution(inputUrl);
              
              if (sauceParseRes) resultantData = sauceParseRes;
              else resultantData = {
                ...resultantData,
                foundUrl: inputUrl,
                urlsArray: [{
                  imageUrl: inputUrl,
                  thumbnailUrl: inputUrl,
                  height: imageDimensions?.imageSize?.height || 0,
                  width: imageDimensions?.imageSize?.width || 0
                }],
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
      const { resultArray } = await this.sauceNao.getSauce(url);
      if (resultArray) {
        
      
      let filteredResults: IFilteredSaucenaoResult = {};

      let tagsCollective: Set<string> = new Set<string>();

      let originalPostResult: IFilteredSaucenaoResult = {};
      let originalPostAlternative: IFilteredSaucenaoResult = {};


      for (let index = 0; index < resultArray.length; index++) {
        const item = resultArray[index]  
        if (Number.parseInt(item.header.similarity) > 80 && item.data.ext_urls) {
          const urlsToParse = item.data.ext_urls.filter(a => a.includes('pixiv') || a.includes('danbooru') || a.includes('yande'))
          let animePicPerExtURL: INewAnimePic[] = [];
          let bestPic: INewAnimePic | undefined;

          for (let urlsindex = 0; urlsindex < urlsToParse.length; urlsindex++) {
            const element = urlsToParse[urlsindex];
            let animePic = await this.processUrl(element);
            
            
            if(animePic.storedResult) { //ik this seems stupid, because it is , blame ts compiler and checker not me, it doesn't realize the type of the right side and left side will be the same since it will use same indexer and so i have to seperate the indexing that collides
              if (animePic.tags)
                animePic.tags.forEach(tagsCollective.add, tagsCollective)
              
            }
            if (animePic.urlsArray && !animePic.imageSize ) {
              await this.getImageResolution(animePic.urlsArray[animePic.indexer].imageUrl).then(a => {
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
          
          
          else if (filteredResults.animePic?.urlsArray?.length && bestPic?.urlsArray?.length && bestPic.imageSize && bestPic.imageSize.height && bestPic.imageSize.width && filteredResults.animePic.imageSize?.height && filteredResults.animePic.imageSize?.width ) {
            filteredResults =
            (bestPic?.imageSize?.height * bestPic?.imageSize?.width) > (filteredResults.animePic.imageSize.height * filteredResults.animePic.imageSize?.width)?
            {
              reqItem: item,
              animePic: bestPic,
              imageSize: bestPic ? bestPic.imageSize : undefined
            } : filteredResults
          }
          else {
            filteredResults.animePic = bestPic
          }
        }
        
      }
      const tagsCollectiveString = Array.from(tagsCollective)
      if (originalPostResult.animePic?.urlsArray?.length) {
        originalPostResult.animePic.tags = tagsCollectiveString;
        return originalPostResult.animePic
      }
      else if (originalPostAlternative.animePic?.urlsArray?.length) {
        originalPostAlternative.animePic.tags = tagsCollectiveString;
        return originalPostAlternative.animePic
      }
      else if (filteredResults.animePic?.urlsArray?.length) {
        filteredResults.animePic.tags = tagsCollectiveString;
        return filteredResults.animePic
      }
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
      createDate: (new Date(json.created_at)).getTime(),
      updateDate: (new Date(json.updated_at)).getTime(),
      previewImageUrl: json.preview_file_url,
      rating: json.rating,
      isNsfw: json.rating != 'g',
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
      id: json.posts[0].id,
      imageUrl: json.posts[0].file_url,
      createDate: json.posts[0].created_at * 1000,
      updateDate: json.posts[0].updated_at * 1000,
      previewImageUrl: json.posts[0].preview_url,
      rating: json.posts[0].rating,
      isNsfw: json.posts[0].rating != 's',
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

  public async getPixivImageData(id: number | string, arrayIndexer?: number) {

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
        "referer" : "https://www.pixiv.net/",
      },
      referrer: `https://www.pixiv.net/en/artworks/${id}`,
      method: "GET",
      mode: "cors",
    };
    let providedDownloadHeaders: IRequestOptions = {providedHeaders: headersObj = {
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
          "Cache-Control": "no-cache",
          "referer" : "https://www.pixiv.net/"
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
    if (responseJson.error) return undefined;
    try {
      const json = responseJson.body;
      // let urlsArray: string[] | undefined = undefined;
      let urlsArrayBody: [] | undefined = undefined;
      let altThumbnail: string | undefined = undefined;
            
      if (json.pageCount && (json.pageCount > 1)) {
    headersObj.referrer = `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`;
        const response2 = await this.request(
          `https://www.pixiv.net/ajax/illust/${id}/pages?lang=en`,
          "GET",
          {providedHeaders: headersObj}
        );
        const json2 = await response2.json()
        /* urlsArray = json2.body.map(
          (a: any) => a.urls.original
        ); */
        urlsArrayBody = json2.body
        
        if (arrayIndexer) altThumbnail = json2.body[arrayIndexer].urls.small
      }
      providedDownloadHeaders = {providedHeaders: {

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
      
      }}
      
      if (!json.urls.original) {
        throw new Error("pixiv post is marked as sensitive and therefore cant get data for because of recent api changes, please wait for fix"); 
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
        // urlsArray: urlsArray,
        illustTitle: json.illustTitle,
        createDate: json.createDate,
        uploadDate: json.uploadDate,
        authorId: json.userId,
        authorName: json.userName,
        illustType: json.illustType,
        width: json.width,
        height: json.height,
        arrayIndexer: arrayIndexer,
        urlsArrayBody: urlsArrayBody ?? [{
          urls: {
            original: json.urls.original,
            small: json.urls.small,
          },
          height: json.height,
          width: json.width,
        }],
        requestOptions: providedDownloadHeaders ?? undefined,
      } as IPixivResponse;

      
  } catch (error) {
    console.log('caught error at getting pixiv data: ', error);
    
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
  public async checkImageUrlValid(imageUrl: string, options?: { referrer?: string; altUsed?: string; providedHeaders?: RequestInit }) {
    return (await this.request(imageUrl, "GET", options)).statusText
  }



  /**
   * 
   * @param url url to the file to download
   * @param downloadPath path inside the default download folder
   * @param options optional object to pass in either a referrer for the requests and/or a filename, not that the filename doesnt need to contain file extension
   * you can also passin a header object in options.providedHeaders
   * @returns path to the downloaded file
   */
  public async downloadFromUrl(
    url: string,
    downloadPath: string,
    options? : {
      referrer?: string,
      providedFileName?: string,
      providedHeaders?: RequestInit
  }
  ) {
    
    let returnPath: string | undefined = '';

    const fileExtension = url.substring(url.lastIndexOf('.'))
    const fileName = options?.providedFileName ?? url.substring(url.lastIndexOf("/"), url.lastIndexOf('.'));
    
    returnPath = `${downloadPath + "/" + fileName + fileExtension}`
    
    await this.request(url, "GET", {providedHeaders: options?.providedHeaders, referrer: options?.referrer || ''} )
      .then(async (res) => (await res.blob()))
      .then(async (blob) => await blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer))
      .then((buffer) => {
        this.checkDirectoryAndCreate(this.settings.downloadFolder + downloadPath );
        fs.promises.writeFile(this.settings.downloadFolder + downloadPath + "/" + fileName + fileExtension, buffer)
          .catch((error) => {
            console.log(error);
            returnPath = undefined
          })
        });
      return returnPath;
    }
    /**
    * checks if a directory exists and returns true if it does else false;
    */
    public checkDirectory(path: string) {
      if (!fs.existsSync(path)) {
        return false;
      } else return true;
    }

    /**
    * checks path and creates it if it doesnt exist
    */
    public checkDirectoryAndCreate(path: string) {
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
