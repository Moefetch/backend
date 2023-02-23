import fs from "fs";
import probeImageSize from "probe-image-size";
import { IImageProps, INewPicture, OutgoingHttpHeaders } from '../types'
import needle from "needle";

export default class Utility {
    constructor() {
        
    }
    
  public request(
    element: string,
    requestMethod: "GET" | "POST",
    options?: { referrer?: string; altUsed?: string; providedHeaders?: RequestInit }
  ) {
    let headersObj: RequestInit = options?.providedHeaders ?? {
      credentials: "omit",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
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


  /**
   * checkImageUrlValid
   */
  public async checkImageUrlValid(imageUrl: string, options?: { referrer?: string; altUsed?: string; providedHeaders?: RequestInit }) {
    return (await this.request(imageUrl, "GET", options)).statusText
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
public async downloadAndGetFilePaths(
    resultantData: INewPicture,
    album: string,
    downloadFolder: string,
    ) {
  let result: INewPicture['imagesDataArray'] = [];
  let providedHeadersObj: RequestInit | undefined = undefined
  const urlsArray = resultantData.urlsArray;
  if (resultantData.storedResult) {
    providedHeadersObj = resultantData.data[resultantData?.storedResult]?.requestOptions?.providedHeaders
  }
  if (urlsArray?.length){
  for (let index = 0; index < urlsArray.length; index++) {
    const element = urlsArray[index];
  
    
    const filePath = await 
    this.downloadFromUrl(
        element.imageUrl,
        downloadFolder,
        `/saved_pictures/${album}`, 
        {providedFileName: `${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]} - ${index} - ${Date.now()}`,
        providedHeaders: providedHeadersObj
      })


    let fileThumbnailPath: string;
    if (element.thumbnailUrl) {
      fileThumbnailPath = await 
            this.downloadFromUrl(
                element.thumbnailUrl,
                downloadFolder,
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
   * 
   * @param url url to the file to download
   * @param downloadFolder path to the default download folder
   * @param downloadPath path inside the default download folder
   * @param options optional object to pass in either a referrer for the requests and/or a filename, not that the filename doesnt need to contain file extension
   * you can also pass in a header object in options.providedHeaders
   * @returns path to the downloaded file
   */
  public async downloadFromUrl(
    url: string,
    downloadFolder: string,
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
        this.checkDirectoryAndCreate(downloadFolder + downloadPath );
        fs.promises.writeFile(downloadFolder + downloadPath + "/" + fileName + fileExtension, buffer)
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