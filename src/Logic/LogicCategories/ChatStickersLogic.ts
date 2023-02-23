import fs from 'fs'
import { ILogicModel, IModelDictionary, ISettings, ILogicCategory, ILogicModelConstructor, INewPicture, ILogicCategorySpecialSettingsDictionary, ILogicCategorySpecialParamsDictionary } from 'types';
import Utility from '../../Utility';

export class CategoryLogic implements ILogicCategory {
  public specialSettingsDictionary?: ILogicCategorySpecialSettingsDictionary;
  public specialParamsDictionary?: ILogicCategorySpecialParamsDictionary;

    public logicCategory: string = "Chat Stickers"
    public processDictionary:IModelDictionary;
    private utility = new Utility()
    public settings: ISettings;
    constructor(settings: ISettings) {
        this.settings = settings;

        this.processDictionary = this.loadModels(settings);
        
    }

    /**
     * ProcessInput
     */
    public async ProcessInput(input: string | File, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary) {
        let resultantData: INewPicture|undefined = {
            data: {},
            indexer: 0,
            isNSFW: false,
            imagesDataArray: []
          };
          
          if (typeof input == "string"){
            resultantData = await this.processUrl(input, optionalOverrideParams);
            if (resultantData && resultantData.urlsArray?.length) {
              const res = await this.utility.downloadAndGetFilePaths(resultantData, album, this.settings.downloadFolder)
              if ( res ) resultantData.imagesDataArray = res
              if (resultantData.thumbnailFile) {
                resultantData.thumbnailFile = await this.utility.downloadFromUrl(resultantData.thumbnailFile, this.settings.downloadFolder, `/saved_pictures_thumbnails/${album}`,{providedFileName: `thumbnailFile - ${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`})
              } else resultantData.thumbnailFile = resultantData.imagesDataArray[resultantData.indexer].thumbnail_file
            }
          }
          else {
            resultantData = {data: {}, indexer: 0, imagesDataArray: []} //no reverese image searvh for stickers no?
          }
        return resultantData;
    }

    private async processUrl(url: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary)  {
        const link = new URL(url);
        const processPromise = this.processDictionary[link.hostname]
        
        
        return processPromise ? processPromise(url, optionalOverrideParams) : undefined;

    }

    private loadModels(settings: ISettings) {
        const processDictionary:IModelDictionary = {};
        const animePicModels = fs.readdirSync('./src/Logic/LogicCategories/ChatStickersLogicModels/').filter(file => file.endsWith('.ts'))
        
        animePicModels.forEach(model => {
            const Model:ILogicModelConstructor = require(`./ChatStickersLogicModels/${model.substring(0, model.lastIndexOf('.'))}`);
            const modelInstence:ILogicModel = new Model.default(settings)
            processDictionary[modelInstence.supportedHostName] = modelInstence.process;
        })
    
        return processDictionary;
    }
    


}
