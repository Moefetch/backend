import Utility from "../../Utility";
import { ILogicCategory, ILogicCategorySpecialParamsDictionary, IModelDictionary, INewPicture, IPicFormStockOverrides, ISettings } from "types";

export class CategoryLogic implements ILogicCategory {
    public logicCategory: string = "Plain image";
    public processDictionary: IModelDictionary = {};
    private utility = new Utility()
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
                if (resultantData && resultantData.urlsArray?.length) {
                    
                    const res = await this.utility.downloadAndGetFilePaths(resultantData, album, this.settings.downloadFolder, {providedFileName:stockOptionalOverrides.useProvidedFileName.stringValue?.value})
                    if ( res ) resultantData.imagesDataArray = res
                    if (resultantData.thumbnailFile) {
                        resultantData.thumbnailFile = await this.utility.downloadFromUrl(resultantData.thumbnailFile, this.settings.downloadFolder, `/saved_pictures_thumbnails/${album}`,{providedFileName: `thumbnailFile - ${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`})
                    } else resultantData.thumbnailFile = resultantData.imagesDataArray[resultantData.indexer].thumbnail_file
                }
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
                height: imageProps?.imageSize.height || 0, 
                width: imageProps?.imageSize.width || 0 
            }],

          };
        return resultantData

    }

    constructor(settings: ISettings){
        this.settings = settings;
        this.ProcessInput = this.ProcessInput.bind(this);
    }
}