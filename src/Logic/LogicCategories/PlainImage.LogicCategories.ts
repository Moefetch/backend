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
                resultantData = await this.processUrl(input, optionalOverrideParams);
            } else return undefined
          }
          else {
            resultantData = {data: {}, indexer: 0, imagesDataArray: []} // i need to make it download and add as is cus no processing
          }
        return resultantData;
    }

    private async processUrl(url: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary)  {
        const imageProps = await this.utility.getImageResolution(url)
        let resultantData: INewPicture | undefined = {
            data: {},
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
        return resultantData

    }

    constructor(settings: ISettings, utility: Utility){
        this.settings = settings;
        this.utility = utility;
        this.ProcessInput = this.ProcessInput.bind(this);
    }
}