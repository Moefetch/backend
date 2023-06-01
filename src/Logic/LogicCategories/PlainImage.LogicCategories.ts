import Utility from "../../Utility";
import { ILogicCategory, ILogicCategorySpecialParamsDictionary, IModelDictionary, INewPicture, IPicFormStockOverrides, ISettings } from "types";

export class CategoryLogic implements ILogicCategory {
    public logicCategory: string = "Plain image";
    public processDictionary: IModelDictionary = {};
    private utility: Utility;
    public settings: ISettings;
    public async ProcessInput(input: string | File, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides:IPicFormStockOverrides){
        let resultantData: INewPicture | undefined = {
            data: {},
            indexer: 0,
            isNSFW: false,
            imagesDataArray: []
          };
          
          if (typeof input == "string"){
            if( await this.utility.checkImageUrlValid(input)) {
                resultantData = await this.processUrl(input, album, optionalOverrideParams, stockOptionalOverrides);
            } else return undefined
          }
          else {
            resultantData = {data: {}, indexer: 0, imagesDataArray: []} // i need to make it download and add as is cus no processing
          }
        return resultantData;
    }

    private async processUrl(url: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides)  {
        const imageProps = await this.utility.getImageResolution(url)
        let resultantData: INewPicture | undefined = {
            data: {},
            storedResult: "plain",
            indexer: 0,
            isNSFW: false,
            imagesDataArray: [],
            urlsArray: [{
                imageUrl:url, 
                thumbnailUrl: url,
                isVideo: false, //needs to be changed
                height: imageProps?.imageSize.height || 0, 
                width: imageProps?.imageSize.width || 0 
            }],
          };
          const parse_regex = new RegExp(String.raw `\/.*\/(?<fileName>.*)\.(?<fileExtension>.*)`)
          const parseResult = url.match(parse_regex)?.groups
          const providedFileName = (parseResult?.fileName ?? url.substring(url.lastIndexOf('/') + 1, url.indexOf('.'))) + `- ${Date.now()}`
          const providedFileExtension = parseResult?.fileExtension ?? url.substring(url.indexOf('.') + 1)
          const path = await this.utility.downloadFromUrl(url, this.settings.downloadFolder, `/saved_pictures/${album}`, {
            providedFileName: providedFileName, providedFileExtension: providedFileExtension
          })
          resultantData.imagesDataArray = [{
            file: path, 
            isVideo: false, 
            imageSize: {
              height: imageProps?.imageSize.height || 0, 
              width: imageProps?.imageSize.width || 0
            },
            thumbnail_file: path,
          }]
          resultantData.thumbnailFile = path;
        return resultantData

    }

    constructor(settings: ISettings, utility: Utility){
        this.settings = settings;
        this.utility = utility;
        this.ProcessInput = this.ProcessInput.bind(this);
    }
}