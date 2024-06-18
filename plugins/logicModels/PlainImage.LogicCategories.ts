import fs, { ReadStream } from "fs";
import Utility from "src/Utility";
import { ILogicModels, ILogicCategorySpecialParamsDictionary, IModelDictionary, INewPicture, IPicFormStockOverrides, ISettings, IProcessDictionary, IModelSpecialParam } from "types";

export default class LogicModel implements ILogicModels {
    public processDictionary: IProcessDictionary;
    private utility: Utility;
    public settings: ISettings;
    constructor(settings: ISettings, utility: Utility){
      this.settings = settings;
      this.utility = utility;
      this.ProcessInput = this.ProcessInput.bind(this);
      this.processDictionary = {
        "Plain image": {
          undefined: this.ProcessInput
        }
      }
    }
    public async ProcessInput(input: string | Express.Multer.File, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides:IPicFormStockOverrides){
        let resultantData: INewPicture | undefined = {
            data: {},
            indexer: 0,
            isNSFW: false,
            imagesDataArray: []
          };
          
          if (typeof input == "string" && ~input.search(/^https?:\/\//)){
            const type = await this.utility.getTypeFromUrl(input);
            if(type) {
                resultantData = await this.processUrl(input, album, optionalOverrideParams, stockOptionalOverrides, type);
            } else return undefined
          }
          else if (!(typeof input == "string")) { //process as a file not a link
            let newPath = `${this.settings.downloadFolder}/saved_pictures/${album}/${input.path.substring(input.path.lastIndexOf("/") + 1)}`;
            this.utility.moveFile(input.path, newPath);
            console.log(newPath);
            newPath = newPath.substring(newPath.indexOf('/saved_pictures/'));
            const isVideo = input.mimetype.includes("video");
            const thumbnail_file = isVideo ? "album_thumbnail_files/video.svg" : newPath
            resultantData = {
              data: {}, indexer: 0, imagesDataArray: [{file: newPath, isVideo: isVideo, thumbnail_file: thumbnail_file}], hasVideo: isVideo, thumbnailFile: thumbnail_file 
            }
          }
        return resultantData;
    }

    private async processUrl(url: string, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides: IPicFormStockOverrides, type: string)  {
        //i need to do something about thumbnails
      const imageProps = type == 'image' ? await this.utility.getImageResolution(url) : undefined; // i need to fix this to support video      
        let resultantData: INewPicture | undefined = {
          data: {},
          storedResult: "plain",
          indexer: 0,
          isNSFW: false,
          imagesDataArray: [],
          urlsArray: [{
              imageUrl:url, 
              thumbnailUrl: type !== 'image' ? url : '',
              isVideo: type !== 'image',
              height: imageProps?.imageSize.height || 0, 
              width: imageProps?.imageSize.width || 0 
          }],
        };
        const parsedTrueURL = url.includes("?") ? url.substring(0, url.indexOf('?')) : url;

        
        const providedFileName = (parsedTrueURL.substring(parsedTrueURL.lastIndexOf('/') + 1, parsedTrueURL.lastIndexOf('.'))) + `- ${Date.now()}`
        const providedFileExtension = parsedTrueURL.substring(parsedTrueURL.lastIndexOf('.') + 1)
        
        const path = await this.utility.downloadFromUrl(url, this.settings.downloadFolder, `/saved_pictures/${album}`, {
          providedFileName: providedFileName, providedFileExtension: providedFileExtension
        })
        resultantData.imagesDataArray = [{
          file: path, 
          isVideo: type !== 'image', 
          imageSize: {
            height: imageProps?.imageSize.height || 0, 
            width: imageProps?.imageSize.width || 0
          },
          thumbnail_file: type == 'image' ? path : 'album_thumbnail_files/video.svg',
        }]
        resultantData.thumbnailFile = type == 'image' ? path : 'album_thumbnail_files/video.svg';
        resultantData.links = {};
        resultantData.links[(new URL(url)).hostname] = url
      return resultantData;
    }
}