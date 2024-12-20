import fs, { ReadStream } from "fs";
import Utility from "src/Utility";
import { requestStatusTracker, ILogicModels, ILogicCategorySpecialParamsDictionary, IModelDictionary, INewMediaItem, IMediaSubmitFormStockOverrides, ISettings, IProcessDictionary, IModelSpecialParam } from "types";

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
    public async ProcessInput(input: string | Express.Multer.File, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides:IMediaSubmitFormStockOverrides, requestTracker: requestStatusTracker){
        let resultantData: INewMediaItem | undefined = {
            data: {},
            indexer: 0,
            isNSFW: false,
            media: []
          };
          
          if (typeof input == "string" && ~input.search(/^https?:\/\//)){
            const inputType = await this.utility.getTypeFromUrl(input);
            
            if(inputType) {
              resultantData = await this.processUrl(input, album, optionalOverrideParams, stockOptionalOverrides, inputType, requestTracker);
            } else return undefined
          }
          else if (!(typeof input == "string")) { //process as a file not a link
            
            let newPath = `${this.settings.downloadFolder}/saved_pictures/${album}/${Date.now() + stockOptionalOverrides?.useProvidedFileName?.textField?.value ?? (input.path.substring(input.path.lastIndexOf("/") + 1))}`;
            this.utility.moveFile(input.path, newPath);
            newPath = newPath.substring(newPath.indexOf('/saved_pictures/'));
            const isVideo = input.mimetype.includes("video");
            const thumbnailFile = isVideo ? "album_thumbnail_files/video.svg" : newPath
            resultantData = {
              data: {}, indexer: 0, media: [{file: newPath, isVideo: isVideo, thumbnailFile: thumbnailFile}], hasVideo: isVideo, thumbnailFile: thumbnailFile 
            }
          }
        return resultantData;
    }

    private async processUrl(url: string, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides: IMediaSubmitFormStockOverrides, type: string, requestTracker: requestStatusTracker)  {
        //i need to do something about thumbnails
      const imageProps = type == 'image' ? await this.utility.getImageResolution(url) : undefined; // i need to fix this to support video      
        let resultantData: INewMediaItem | undefined = {
          data: {},
          storedResult: "plain",
          indexer: 0,
          isNSFW: false,
          media: [],
          urlsArray: [{
              imageUrl:url, 
              thumbnailUrl: type !== 'image' ? url : '',
              isVideo: type !== 'image',
              height: imageProps?.imageSize.height || 0, 
              width: imageProps?.imageSize.width || 0 
          }],
        };
        const parsedTrueURL = url.includes("?") ? url.substring(0, url.indexOf('?')) : url;

        
        let providedFileName = stockOptionalOverrides?.useProvidedFileName?.textField?.value;

        providedFileName = providedFileName ? providedFileName : (parsedTrueURL.substring(parsedTrueURL.lastIndexOf('/') + 1, parsedTrueURL.lastIndexOf('.'))) + ` - ${Date.now()}`;
        const providedFileExtension = parsedTrueURL.substring(parsedTrueURL.lastIndexOf('.') + 1)
        const path = await this.utility.downloadFromUrl(url, this.settings.downloadFolder, `/saved_pictures/${album}`, 
        requestTracker,
        {
          providedFileName: providedFileName, providedFileExtension: providedFileExtension,
        })
        resultantData.media = [{
          file: path, 
          isVideo: type !== 'image', 
          imageSize: {
            height: imageProps?.imageSize.height || 0, 
            width: imageProps?.imageSize.width || 0
          },
          thumbnailFile: type == 'image' ? path : 'album_thumbnail_files/video.svg',
        }]
        resultantData.thumbnailFile = type == 'image' ? path : 'album_thumbnail_files/video.svg';
        resultantData.links = {};
        resultantData.links[(new URL(url)).hostname] = url
      return resultantData;
    }
}