import fs from "fs";
import probeImageSize from "probe-image-size";
import { IImageProps, INewPicture, OutgoingHttpHeaders, ISettings, ILogicCategorySpecialSettingsDictionary, ILogicModel,  ILogicCategorySpecialParamsDictionary, IModelDictionary, ILogicCategory, ILogicModelConstructor, IParamValidityCheck } from "../types";
import needle from "needle";

export default class Utility {
  constructor() {
  }
  
  public loadModels(settings: ISettings, categoryFolder: string) {
    let specialSettingValidityCheckArray: IParamValidityCheck[] = [];
    let specialSettingsDictionary = {specialCategorySettings: {}, specialHostnameSpecificSettings: {}};
    let specialParamsDictionary: Required<ILogicCategorySpecialParamsDictionary> = {specialCategoryParams: {}, specialHostnameSpecificParams: {}};
    specialParamsDictionary.specialHostnameSpecificParams = {}
      const animePicModels = fs.readdirSync(`./src/Logic/LogicCategories/${categoryFolder}/`).filter(file => file.endsWith('.ts') || file.endsWith('.js'))
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
        modelInstence.specialNewEntryParam 
        ? (specialParamsDictionary.specialHostnameSpecificParams[modelInstence.supportedHostName] = modelInstence.specialNewEntryParam) 
        : ({})
        ;

        modelInstence.specialSettingsParam 
        ? (Object.assign(specialSettingsDictionary.specialCategorySettings, modelInstence.specialSettingsParam)) 
        : ({})
        ;
        modelInstence.specialSettingValidityCheckArray 
        ? (specialSettingValidityCheckArray = [...specialSettingValidityCheckArray, ...modelInstence.specialSettingValidityCheckArray])
        : ({})
      })

      const returnSpecialSettingsDictionary: ILogicCategorySpecialSettingsDictionary = {
      }; 
      
      Object.getOwnPropertyNames(specialSettingsDictionary.specialCategorySettings).length ? returnSpecialSettingsDictionary.specialCategorySettings = specialSettingsDictionary.specialCategorySettings : undefined;
      Object.getOwnPropertyNames(specialSettingsDictionary.specialHostnameSpecificSettings).length ? returnSpecialSettingsDictionary.specialHostnameSpecificSettings = specialSettingsDictionary.specialHostnameSpecificSettings : undefined;

      const returnSpecialParamsDictionary: ILogicCategorySpecialParamsDictionary = {
      }

      Object.getOwnPropertyNames(specialParamsDictionary.specialCategoryParams).length ? returnSpecialParamsDictionary.specialCategoryParams = specialParamsDictionary.specialCategoryParams : undefined
      Object.getOwnPropertyNames(specialParamsDictionary.specialHostnameSpecificParams).length ? returnSpecialParamsDictionary.specialHostnameSpecificParams = specialParamsDictionary.specialHostnameSpecificParams : undefined

      return {
        processDictionary: processDictionary, 
        specialSettingsDictionary: returnSpecialSettingsDictionary, 
        specialParamsDictionary: returnSpecialParamsDictionary,
        specialSettingValidityCheckArray: specialSettingValidityCheckArray,
      };
  }

  public defaultHeaders: Headers = new Headers({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    'accept-encoding': 'gzip, deflate, br',
    "connection": 'keep-alive',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "DNT": "1",
    "Sec-GPC": "1",
    "Cache-Control": "no-cache",

  })
  public request(
    element: string,
    requestMethod: "GET" | "POST",
    options?: {
      referrer?: string;
      altUsed?: string;
      providedHeaders?: RequestInit;
    }
  ) {
    let headers  = new Headers(this.defaultHeaders);
    
    options?.referrer ? headers.set("referrer", options?.referrer ) : {};

    let headersObj: RequestInit = options?.providedHeaders ?? {
      credentials: "omit",
      headers: headers,
      method: requestMethod,
      mode: "cors",
    };
    
    if (options && options.referrer) headersObj["referrer"] = options.referrer;

    return fetch(element, headersObj).catch((err) => {
      console.log("fetch request error while downloading ", element, 'err', err);

      //literally just retry 
      return fetch(element, headersObj);
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

  public async getImageResolution(image: string | NodeJS.ReadableStream) {
    let imageProps: IImageProps;
    if (typeof image == "string") {
      if (!(await this.checkImageUrlValid(image))) return undefined;
      const resPromise: Promise<IImageProps> = new Promise(
        async (resolve, reject) => {
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
            const thumbnailFileNameFromProvided = (optional?.providedFileNames && optional?.providedFileNames[index])
            ? `thumbnail - ${optional?.providedFileNames[index]}`
            : `thumbnail - ${resultantData.storedResult ?? ""} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]} - ${index} - ${Date.now()}`
            
            fileThumbnailPath = await this.downloadFromUrl(
              element.thumbnailUrl,
              downloadFolder,
              `/saved_pictures_thumbnails/${album}`,
              {
                providedFileName: thumbnailFileNameFromProvided,
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

    const fileExtension = options?.providedFileExtension ?? url.substring(url.lastIndexOf("."));
    const fileName =
      options?.providedFileName && options?.providedFileName != ""
        ? options?.providedFileName
        : url.substring(url.lastIndexOf("/"), url.lastIndexOf("."));

    returnPath = `${downloadPath + "/" + fileName + fileExtension}`;

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
            downloadFolder + downloadPath + "/" + fileName + fileExtension,
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
