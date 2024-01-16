import fs from "fs";
import probeImageSize from "probe-image-size";

import { IImageProps, INewPicture, OutgoingHttpHeaders, ISettings, ILogicCategorySpecialSettingsDictionary, ILogicModel,  ILogicCategorySpecialParamsDictionary, IModelDictionary, ILogicCategory, ILogicModelConstructor, IParamValidityCheck, IModelSpecialParam } from "../types";
import needle from "needle";

export default class Utility {
  constructor() {
  }


  
  /**
   * getTypeFromUrl
   */
  public async getTypeFromUrl(
    url: string,
    options?: {
      referrer?: string;
      providedFileName?: string;
      providedFileExtension?: string;
      providedHeaders?: RequestInit;
    }
    ) {
    
      const res = await this.request(url, "GET", {
        providedHeaders: options?.providedHeaders,
        referrer: options?.referrer,
      })
      if (res.statusText == "OK") return res.blob().then((blob) => blob.type).then(type => type.substring(0, type.indexOf('/')))
    }

    /**
     * DEPRICATED??
     * @param settings 
     * @param categoryFolder 
     * @returns 
     */
  public loadModels(settings: ISettings, categoryFolder: string) {
    let specialSettingValidityCheckArray: IParamValidityCheck[] = [];
    let specialSettingsDictionary: IModelSpecialParam = {}
    let specialParamsDictionary: IModelSpecialParam = {}
      const animePicModels = fs.readdirSync(`./src/Logic/LogicCategories/${categoryFolder}/`).filter(file => file.endsWith(process.env.EXTENSION ?? "js"))
      const processDictionary:IModelDictionary = {};
      /* 
      const ass:IModelDictionary = animePicModels.map(model=>{
          const Model:ILogicModelConstructor = require(`./AnimePictureLogicModels/${model.substring(0, model.lastIndexOf('.'))}`);
          const modelInstence:ILogicModel = new Model.default(settings)
          return {[modelInstence.supportedHostName]: modelInstence.process}
      }) */
      animePicModels.forEach(model => {
        const Model:ILogicModelConstructor = require(`./Logic/LogicCategories/${categoryFolder}/${model.substring(0, model.lastIndexOf('.'))}`);
        const modelInstence:ILogicModel = new Model.default(settings)
        processDictionary[modelInstence.supportedHostName] = modelInstence.process;
        //loading special parameters
        modelInstence.newEntryParams 
        ? Object.assign(specialParamsDictionary, modelInstence.newEntryParams) 
        : ({})
        ;
        //loading special 
        modelInstence.specialSettings 
        ? (Object.assign(specialSettingsDictionary, modelInstence.specialSettings)) 
        : ({})
        ;
        //
        modelInstence.specialSettingValidityCheckArray 
        ? (specialSettingValidityCheckArray = [...specialSettingValidityCheckArray, ...modelInstence.specialSettingValidityCheckArray])
        : ({})
      })

      let returnSpecialSettingsDictionary: IModelSpecialParam = {
      }; 
      
      Object.getOwnPropertyNames(specialSettingsDictionary).length ? returnSpecialSettingsDictionary = specialSettingsDictionary : undefined;

      let returnSpecialParamsDictionary: IModelSpecialParam = {
      }

      Object.getOwnPropertyNames(specialParamsDictionary).length ? returnSpecialParamsDictionary = specialParamsDictionary : undefined

      return {
        processDictionary: processDictionary, 
        specialSettingsDictionary: returnSpecialSettingsDictionary, 
        specialParamsDictionary: returnSpecialParamsDictionary,
        specialSettingValidityCheckArray: specialSettingValidityCheckArray,
      };
  }

  /**
   * saveBlankThumbnail
   */
  public saveBlankThumbnail(icoPath: string) {
    const thumbnailSVGContent = '<svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g id="image"><path d="M18,4.25H6A2.75,2.75,0,0,0,3.25,7V17A2.75,2.75,0,0,0,6,19.75H18A2.75,2.75,0,0,0,20.75,17V7A2.75,2.75,0,0,0,18,4.25ZM6,5.75H18A1.25,1.25,0,0,1,19.25,7v8.19l-2.72-2.72a.7.7,0,0,0-.56-.22.79.79,0,0,0-.55.27l-1.29,1.55-4.6-4.6A.7.7,0,0,0,9,9.25a.79.79,0,0,0-.55.27L4.75,13.93V7A1.25,1.25,0,0,1,6,5.75ZM4.75,17v-.73l4.3-5.16,4.12,4.12-2.52,3H6A1.25,1.25,0,0,1,4.75,17ZM18,18.25H12.6l3.45-4.14,3.15,3.15A1.23,1.23,0,0,1,18,18.25Z"/></g></svg>'
    const videoThumnailSVG = '<svg class="svg-icon" fill="#ffffff" style="width: 1em; height: 1em;vertical-align: middle;;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M590.3 532.7l-118 88.5c-9.8 7.3-23.6 5.3-31-4.4-2.9-3.8-4.4-8.5-4.4-13.3v-177c0-12.2 9.9-22.1 22.1-22.1 4.8 0 9.4 1.6 13.3 4.4l118 88.5c9.8 7.3 11.8 21.2 4.4 31-1.2 1.6-2.7 3.1-4.4 4.4zM247.5 205.3h530.9c48.9 0 88.5 39.6 88.5 88.5v442.4c0 48.9-39.6 88.5-88.5 88.5H247.5c-48.9 0-88.5-39.6-88.5-88.5V293.8c0-48.9 39.7-88.5 88.5-88.5z m442.4 44.3H336v530.9h353.9V249.6zM203.3 382.3h88.5V249.6h-44.2c-24.4 0-44.2 19.8-44.2 44.2v88.5z m619.3 0v-88.5c0-24.4-19.8-44.2-44.2-44.2h-44.2v132.7h88.4zM203.3 647.7v88.5c0 24.4 19.8 44.2 44.2 44.2h44.2V647.7h-88.4z m0-44.2h88.5v-177h-88.5v177z m619.3 44.2h-88.5v132.7h44.2c24.4 0 44.2-19.8 44.2-44.2v-88.5z m0-44.2v-177h-88.5v177h88.5z"  /></svg>'
    fs.writeFileSync(icoPath + 'image.svg', thumbnailSVGContent)
    fs.writeFileSync(icoPath + 'video.svg', videoThumnailSVG)
  }

  public defaultHeaders: Headers = new Headers({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    'accept-encoding': 'gzip, deflate, br',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "DNT": "1",
    "Sec-GPC": "1",
    "Cache-Control": "no-cache",

  })

  /**
   * randomString
   */
  public randomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  public request(
    element: string,
    requestMethod: "GET" | "POST",
    options?: {
      referrer?: string;
      altUsed?: string;
      providedHeaders?: RequestInit;
    }
  ):Promise<Response> {
    let headers  = new Headers(this.defaultHeaders);
    
    options?.referrer ? headers.set("referrer", options?.referrer ) : {};

    let headersObj: RequestInit = options?.providedHeaders ?? {
      credentials: "omit",
      headers: headers,
      method: requestMethod,
      mode: "cors",
    };
    
    if (options && options.referrer) headersObj["referrer"] = options.referrer;

    /* let axiosInstance =axios.create({
      url:element, headers: headersObj
    })
    axios.request({url: element, headers: headersObj}) */
    return fetch(element, headersObj).catch(async (err) => {
      console.log("first fetch request error while downloading ", element, 'err', err);
      //wait 500 ms
      await (new Promise(async (resolve, reject) => {setTimeout(() => {
        resolve(undefined);
      }, 500);}))
      //retry uncomment when you are ready to handle errors
      return fetch(element, headersObj)/* .catch((err) => {
        console.log("second attempt failed while downloading ", element, 'err', err);
        return undefined
      }) */
    });
  }
  
  /**
   * i wanna impliment this but for now im just making the structure
   * i should add checks in case undefined
   * @param settings an instance of settings to get values from 
   * @param specialtype main setting category either "special_settings" or "special_params"
   * @param category category name
   * @param typeOfSetting type of setting is it hostname specific or a category specific setting 
   * @param settingName the name of the setting
   * @returns 
   */
  /* 
  public getSpecialSettingValue(settings: ISettings, specialtype: "special_settings" | "special_params", category: string, typeOfSetting: "Hostname Specific" | "category", settingName: string) {
    let element:typeof settings["special_params" | 'special_settings'][string] | undefined = undefined;
    let categorySettings: typeof settings["special_params"][string]["specialCategoryParams" | "specialHostnameSpecificParams" ] | undefined = undefined;
    switch (specialtype) {
      case "special_params":
      element = settings["special_params"][category]  
      categorySettings = (typeOfSetting == "category") ? element['specialCategoryParams'] : element['specialHostnameSpecificParams']
        break;
      case "special_settings":
      element = settings["special_settings"][category]
      categorySettings = (typeOfSetting == "category") ? element['specialCategorySettings'] : element['specialHostnameSpecificSettings']
        break;
    
      default:
        break;
    }
    
    return categorySettings ? categorySettings[settingName] : undefined
  }
 */
  /**
   * checkImageUrlValid
   */
  public async checkImageUrlValid(
    imageUrl: string,
    options?: {
      referrer?: string;
      altUsed?: string;
      providedHeaders?: RequestInit;
    }
  ) {
    return (await this.request(imageUrl, "GET", options)).statusText == "OK";
  }

  /**
   * moveFile
   */
  public moveFile(filePath: string, newPath: string) {
    fs.access(filePath, () => {
      fs.access(newPath, () => {
        fs.copyFile(filePath, newPath, (err) => {
          if (err) {
            console.log(err);
          } else {
            fs.unlink(filePath, () => {})
          }
        })
      })
    })
  }

/**
 * deleteFile
 */
public deleteFile(path: string) {
  fs.access(path, () => {
    fs.unlink(path, () => {})
  })
}
  public async compareImgSizes(img1: string, img2: string) {
    const img1Res = await this.getImageResolution(img1);
    const img2Res = await this.getImageResolution(img2);
    if (img1Res && img2Res) {
      const res = img1Res > img2Res;
      return res ? img1 : img2;
    }
  }

  /**
   * gets image link protocol and image dimensions and type aswell
   * @input string of file path or url to images
   * @param image path string to file / could take in a url aswell but idk
   */

  public async getImageResolution(image: string | NodeJS.ReadableStream, optional?: {
    useOwnUrlReferer: boolean,
  }) {
    
    let imageProps: IImageProps;
    if (typeof image == "string") {
      if (!(await this.checkImageUrlValid(image))) return undefined;
      const resPromise: Promise<IImageProps> = new Promise(
        async (resolve, reject) => {
          if (~image.search(/^https?:\/\//)) {
            const urlParsed = new URL(image);
            const requestHeaders: any = {
              Accept: "image/avif,image/webp",
              "Accept-Language": "en-US,en;q=0.5",
              "Accept-Encoding": "gzip, deflate, br",
              "DNT": '1',
              "Connection": "keep-alive",
              "Sec-Fetch-Dest": "image",
              "Sec-Fetch-Mode": "no-cors",
              "Sec-Fetch-Site": "cross-site",
              "Sec-GPC": "1",
              "Pragma": "no-cache",
              "Cache-Control": "no-cache",
              "TE": "trailers",
            };
            optional?.useOwnUrlReferer && (requestHeaders.Referer =  `${urlParsed.protocol}//${urlParsed.hostname}/`)
            const options: needle.NeedleOptions = {
              'accept': "image/avif,image/webp",
              headers: requestHeaders,
            };
            
            imageProps = {
              imageSize: await probeImageSize(image, options),
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
        }
      );
      return resPromise;
    } else {
      imageProps = {
        imageSize: await probeImageSize(image),
        protocol: "local File",
      };
      imageProps;
    }
  }
  /**
   * downloadAndGetFilePaths
   */
  public async downloadAndGetFilePaths(
    resultantData: INewPicture,
    album: string,
    downloadFolder: string,
    optional?: {
      providedFileNames?: string[];
      providedFileExtensions?: string[];
      providedThumbnailFileExtensions?: string[]
    }
  ) {    
    let result: INewPicture["imagesDataArray"] = [];
    let providedRequestObj: RequestInit | undefined = undefined;
    const urlsArray = resultantData.urlsArray;
    if (resultantData.storedResult) {
      providedRequestObj =
        resultantData.data[resultantData?.storedResult]?.requestOptions
          ?.providedHeaders 
          ?? this.defaultHeaders;
    }
    if (urlsArray?.length) {
      let filePath: string = "";
      for (let index = 0; index < urlsArray.length; index++) {
        const element = urlsArray[index];
        try {
          filePath = await this.downloadFromUrl(
            element.imageUrl,
            downloadFolder,
            `/saved_pictures/${album}`,
            {
              providedFileName: (optional?.providedFileNames && optional?.providedFileNames[index])
                ? optional?.providedFileNames[index]
                : `${resultantData.storedResult ?? ""} - ${
                    (resultantData.storedResult &&
                      resultantData.ids &&
                      resultantData.ids[resultantData.storedResult] &&
                      resultantData.ids[resultantData.storedResult]) ||
                    ""
                  } - ${index} - ${Date.now()}`,
              providedHeaders: providedRequestObj,
              providedFileExtension: optional?.providedFileExtensions ? optional?.providedFileExtensions[index] : undefined
            }
          );
        } catch (error) {
          console.log('error downloading ',  element.imageUrl, 'error is ', error);
        }
        if (filePath) {
          let fileThumbnailPath: string;
          if (element.thumbnailUrl) {
            const thumbnailFileExtensionFromProvided = (optional?.providedThumbnailFileExtensions && optional?.providedThumbnailFileExtensions[index])
            const thumbnailFileNameFromProvided = (optional?.providedFileNames && optional?.providedFileNames[index])
            ? `thumbnail - ${optional?.providedFileNames[index]}`
            : `thumbnail - ${resultantData.storedResult ?? ""} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]} - ${index} - ${Date.now()}`
            
            fileThumbnailPath = await this.downloadFromUrl(
              element.thumbnailUrl,
              downloadFolder,
              `/saved_pictures_thumbnails/${album}`,
              {
                providedFileName: thumbnailFileNameFromProvided,
                providedFileExtension: thumbnailFileExtensionFromProvided,
                providedHeaders: providedRequestObj,
              }
              );
              
          } else {
            fileThumbnailPath = filePath;
          }

          let imageHeight: number = 0;
          let imagewidth: number = 0;

          if (!element.height && !element.width) {
            const imageDimensions = await this.getImageResolution(
              element.imageUrl
            );
            imageHeight = imageDimensions?.imageSize.height
              ? imageDimensions.imageSize.height
              : 0;
            imagewidth = imageDimensions?.imageSize.width
              ? imageDimensions.imageSize.width
              : 0;
          }

          result.push({
            file: filePath,
            thumbnail_file: fileThumbnailPath,
            isVideo: resultantData.urlsArray ? !!resultantData.urlsArray[index].isVideo : false,
            imageSize: {
              height: element.height || imageHeight,
              width: element.width || imagewidth,
            },
          });
        }
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
    options?: {
      referrer?: string;
      providedFileName?: string;
      providedFileExtension?: string;
      providedHeaders?: RequestInit;
    }
  ) {
    let returnPath: string | undefined = "";

    const fileExtension = options?.providedFileExtension ?? url.substring(url.lastIndexOf(".") + 1);
    const fileName =
      (!!options?.providedFileName)
        ? options?.providedFileName
        : url.substring(url.lastIndexOf("/") + 1 , url.lastIndexOf("."));

    returnPath = `${downloadPath + "/" + fileName + '.' + fileExtension}`;

    await this.request(url, "GET", {
      providedHeaders: options?.providedHeaders,
      referrer: options?.referrer,
    })
      .then(async (res) => await res.blob())
      .then(async (blob) => await blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer))
      .then((buffer) => {
        this.checkDirectoryAndCreate(downloadFolder + downloadPath);
        fs.promises
          .writeFile(
            downloadFolder + downloadPath + "/" + fileName + "." + fileExtension,
            buffer
          )
          .catch((error) => {
            console.log(error);
            returnPath = undefined;
          });
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
