import Utility from "src/Utility";
import { ILogicModels, ILogicCategorySpecialParamsDictionary, IModelDictionary, INewPicture, IPicFormStockOverrides, ISettings, IProcessDictionary } from "types";

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
    public async ProcessInput(input: string | File, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides:IPicFormStockOverrides){
        let resultantData: INewPicture | undefined = {
            data: {},
            indexer: 0,
            isNSFW: false,
            imagesDataArray: []
          };
          
          if (typeof input == "string"){
            const type = await this.utility.getTypeFromUrl(input);
            if(type) {
                resultantData = await this.processUrl(input, album, optionalOverrideParams, stockOptionalOverrides, type);
            } else return undefined
          }
          else { //process as a file not a link
            resultantData = {data: {}, indexer: 0, imagesDataArray: []} // i need to make it download and add as is cus no processing
          }
        return resultantData;
    }

    private async processUrl(url: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides, type: string)  {
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
        const parsedTrueURL = url.substring(0, url.indexOf('?'));
        
        const parse_regex = new RegExp(String.raw `\/.*\/(?<fileName>.*)\.(?<fileExtension>.*)`)
        const parseResult = parsedTrueURL.match(parse_regex)?.groups
        const providedFileName = (parseResult?.fileName ?? parsedTrueURL.substring(parsedTrueURL.lastIndexOf('/') + 1, parsedTrueURL.indexOf('.'))) + `- ${Date.now()}`
        const providedFileExtension = parseResult?.fileExtension ?? parsedTrueURL.substring(parsedTrueURL.indexOf('.') + 1)
        const path = await this.utility.downloadFromUrl(parsedTrueURL, this.settings.downloadFolder, `/saved_pictures/${album}`, {
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
      return resultantData;
    }
}